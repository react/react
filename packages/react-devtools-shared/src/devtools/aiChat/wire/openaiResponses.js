/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ChatMessage, CompletionResult, ToolCall} from '../types';
import type {WireStreamOptions} from './openaiChat';

// Adapter for the OpenAI Responses API dialect (Codex / ChatGPT backend).
// Unlike chat-completions: system prompt goes in `instructions`, messages
// are typed "input" items, the request is stateless (store:false — full
// history each turn), and tool declarations are flat.

function toResponsesTool(tool: Object): Object {
  const fn = tool.function != null ? tool.function : tool;
  return {
    type: 'function',
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters,
    strict: false,
  };
}

function buildInput(messages: Array<ChatMessage>): {
  instructions: string,
  input: Array<Object>,
} {
  const systemParts = [];
  const input = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    switch (message.role) {
      case 'system':
        systemParts.push(message.content);
        break;
      case 'user':
        input.push({
          type: 'message',
          role: 'user',
          content: [{type: 'input_text', text: message.content}],
        });
        break;
      case 'assistant': {
        if (message.content !== '') {
          input.push({
            type: 'message',
            role: 'assistant',
            content: [{type: 'output_text', text: message.content}],
          });
        }
        if (message.toolCalls != null) {
          for (let j = 0; j < message.toolCalls.length; j++) {
            const toolCall = message.toolCalls[j];
            input.push({
              type: 'function_call',
              call_id: toolCall.id,
              name: toolCall.name,
              arguments: toolCall.argumentsJSON,
            });
          }
        }
        break;
      }
      case 'tool':
        input.push({
          type: 'function_call_output',
          call_id: message.toolCallId,
          output: message.content,
        });
        break;
      default:
        break;
    }
  }
  return {instructions: systemParts.join('\n'), input};
}

export async function streamOpenAIResponses(
  options: WireStreamOptions,
): Promise<CompletionResult> {
  const {request, messages, tools, signal, onTextDelta} = options;
  const url = `${request.baseUrl.replace(/\/+$/, '')}/responses`;

  const {instructions, input} = buildInput(messages);
  const body: Object = {
    model: request.model,
    store: false,
    stream: true,
    instructions,
    input,
  };
  if (tools != null && tools.length > 0) {
    body.tools = tools.map(toResponsesTool);
  }

  const headers = {...request.headers, Accept: 'text/event-stream'};

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`Could not reach ${url}: ${error.message}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (_) {}
    if (response.status === 401) {
      throw new Error(
        'Codex authentication failed (401). Re-run `codex login` and paste ' +
          'the new tokens in Settings > Chat.',
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
  // Function calls arrive as complete items on response.output_item.done.
  const toolCalls: Array<ToolCall> = [];

  const processEvent = (raw: string): boolean => {
    const line = raw.trim();
    if (line === '' || !line.startsWith('data:')) {
      return false;
    }
    const data = line.slice(5).trim();
    if (data === '[DONE]') {
      return true;
    }

    let event;
    try {
      event = JSON.parse(data);
    } catch (_) {
      return false;
    }

    switch (event.type) {
      case 'response.output_text.delta': {
        if (typeof event.delta === 'string' && event.delta !== '') {
          fullText += event.delta;
          onTextDelta(event.delta);
        }
        break;
      }
      case 'response.output_item.done': {
        const item = event.item;
        if (item != null && item.type === 'function_call') {
          toolCalls.push({
            id: typeof item.call_id === 'string' ? item.call_id : item.id,
            name: item.name,
            argumentsJSON:
              typeof item.arguments === 'string' ? item.arguments : '',
          });
        }
        break;
      }
      case 'response.failed':
      case 'error': {
        const message =
          event.response != null && event.response.error != null
            ? event.response.error.message
            : event.message;
        throw new Error(
          `Codex responded with an error: ${message || 'unknown'}`,
        );
      }
      default:
        break;
    }
    return false;
  };

  outer: while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    buffered += decoder.decode(value, {stream: true});
    const lines = buffered.split('\n');
    buffered = lines.pop() || '';
    for (let i = 0; i < lines.length; i++) {
      if (processEvent(lines[i])) {
        break outer;
      }
    }
  }

  return {
    content: fullText,
    toolCalls: toolCalls.filter(toolCall => toolCall.name !== ''),
  };
}
