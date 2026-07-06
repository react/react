/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ChatMessage,
  CompletionResult,
  ResolvedRequest,
  ToolCall,
} from '../types';

export type WireStreamOptions = {
  request: ResolvedRequest,
  messages: Array<ChatMessage>,
  // OpenAI-compatible tool declarations; omit to disable tool calling.
  tools?: Array<Object>,
  signal: AbortSignal,
  onTextDelta: (text: string) => void,
};

function toWireMessage(message: ChatMessage): Object {
  switch (message.role) {
    case 'assistant': {
      const wire: Object = {role: 'assistant', content: message.content};
      if (message.toolCalls != null && message.toolCalls.length > 0) {
        wire.tool_calls = message.toolCalls.map(toolCall => ({
          id: toolCall.id,
          type: 'function',
          function: {name: toolCall.name, arguments: toolCall.argumentsJSON},
        }));
      }
      return wire;
    }
    case 'tool':
      return {
        role: 'tool',
        content: message.content,
        tool_call_id: message.toolCallId,
      };
    default:
      return {role: message.role, content: message.content};
  }
}

// Adapter for the OpenAI-compatible chat-completions dialect (Ollama Cloud,
// local Ollama, OpenAI, OpenRouter, etc.). Streams and resolves with the
// full assistant text plus any tool calls the model made.
export async function streamOpenAIChat(
  options: WireStreamOptions,
): Promise<CompletionResult> {
  const {request, messages, tools, signal, onTextDelta} = options;
  const url = `${request.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const body: Object = {
    model: request.model,
    messages: messages.map(toWireMessage),
    stream: true,
  };
  if (tools != null && tools.length > 0) {
    body.tools = tools;
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: request.headers,
      signal,
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      throw new Error(
        `Could not reach ${url}. If you are using local Ollama, make sure it is running ` +
          'and allows requests from this origin, e.g. OLLAMA_ORIGINS="*" ollama serve.',
      );
    }
    throw new Error(`Could not reach ${url}: ${error.message}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (_) {}
    if (response.status === 401 || response.status === 403) {
      // Local Ollama enforces an origin allowlist server-side and answers
      // 403 for origins outside it (e.g. chrome-extension:// when DevTools
      // runs as a browser extension) — not an API key problem.
      if (
        response.status === 403 &&
        (url.includes('localhost') || url.includes('127.0.0.1'))
      ) {
        throw new Error(
          'The local server rejected this origin (HTTP 403). If you are ' +
            'using local Ollama, allow this origin and restart it, e.g. ' +
            'OLLAMA_ORIGINS="chrome-extension://*" ollama serve — or on the ' +
            'macOS Ollama app: launchctl setenv OLLAMA_ORIGINS ' +
            '"chrome-extension://*" then quit and reopen Ollama.',
        );
      }
      throw new Error(
        'Authentication failed. Check the API key in Settings > Chat.',
      );
    }
    throw new Error(
      `Request failed with status ${response.status}: ${detail.slice(0, 500)}`,
    );
  }

  const responseBody = response.body;
  if (responseBody == null) {
    throw new Error('Response has no body; streaming is not supported.');
  }

  // $FlowFixMe[incompatible-use]: ReadableStream.getReader is not in Flow's dom lib.
  const reader = responseBody.getReader();
  const decoder = new TextDecoder();

  let fullText = '';
  let buffered = '';
  // Accumulates streamed tool_calls deltas by index; the id/name arrive on
  // the first delta and the arguments string builds up across deltas.
  const toolCallsByIndex: Map<
    number,
    {id: string, name: string, argumentsJSON: string},
  > = new Map();

  const processLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (trimmed === '' || !trimmed.startsWith('data:')) {
      return false;
    }
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') {
      return true;
    }

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (_) {
      return false;
    }

    const choice =
      parsed.choices != null && parsed.choices.length > 0
        ? parsed.choices[0]
        : null;
    if (choice == null || choice.delta == null) {
      return false;
    }

    const textDelta = choice.delta.content;
    if (typeof textDelta === 'string' && textDelta !== '') {
      fullText += textDelta;
      onTextDelta(textDelta);
    }

    const toolCallDeltas = choice.delta.tool_calls;
    if (Array.isArray(toolCallDeltas)) {
      for (let i = 0; i < toolCallDeltas.length; i++) {
        const delta = toolCallDeltas[i];
        const index = typeof delta.index === 'number' ? delta.index : 0;
        let accumulated = toolCallsByIndex.get(index);
        if (accumulated == null) {
          accumulated = {id: '', name: '', argumentsJSON: ''};
          toolCallsByIndex.set(index, accumulated);
        }
        if (typeof delta.id === 'string' && delta.id !== '') {
          accumulated.id = delta.id;
        }
        if (delta.function != null) {
          if (
            typeof delta.function.name === 'string' &&
            delta.function.name !== ''
          ) {
            accumulated.name += delta.function.name;
          }
          if (typeof delta.function.arguments === 'string') {
            accumulated.argumentsJSON += delta.function.arguments;
          }
        }
      }
    }
    return false;
  };

  outer: while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }

    buffered += decoder.decode(value, {stream: true});

    // Server-sent events are newline-delimited; a trailing partial line
    // stays in the buffer until the next chunk completes it.
    const lines = buffered.split('\n');
    buffered = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      if (processLine(lines[i])) {
        break outer;
      }
    }
  }

  const toolCalls: Array<ToolCall> = Array.from(toolCallsByIndex.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, accumulated]) => ({
      id: accumulated.id !== '' ? accumulated.id : `call_${index}`,
      name: accumulated.name,
      argumentsJSON: accumulated.argumentsJSON,
    }))
    .filter(toolCall => toolCall.name !== '');

  return {content: fullText, toolCalls};
}
