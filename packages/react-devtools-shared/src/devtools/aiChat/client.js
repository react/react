/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {StreamChatOptions} from './types';

// Streams a chat completion from any OpenAI-compatible endpoint
// (Ollama Cloud, local Ollama, OpenRouter, etc.).
// Resolves with the full assistant message text once the stream ends.
export async function streamChatCompletion(
  options: StreamChatOptions,
): Promise<string> {
  const {config, messages, signal, onTextDelta} = options;

  if (config.baseUrl === '') {
    throw new Error(
      'No API base URL configured. Open Settings > AI to configure a provider.',
    );
  }
  if (config.model === '') {
    throw new Error(
      'No model configured. Open Settings > AI and enter a model name (e.g. "glm-4.6").',
    );
  }

  const headers: {[string]: string} = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey !== '') {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
      }),
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
      throw new Error(
        'Authentication failed. Check the API key in Settings > AI.',
      );
    }
    throw new Error(
      `Request failed with status ${response.status}: ${detail.slice(0, 500)}`,
    );
  }

  const body = response.body;
  if (body == null) {
    throw new Error('Response has no body; streaming is not supported.');
  }

  // $FlowFixMe[incompatible-use]: ReadableStream.getReader is not in Flow's dom lib.
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let fullText = '';
  let buffered = '';

  while (true) {
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
      const trimmed = lines[i].trim();
      if (trimmed === '' || !trimmed.startsWith('data:')) {
        continue;
      }
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        return fullText;
      }

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (_) {
        continue;
      }

      const choice =
        parsed.choices != null && parsed.choices.length > 0
          ? parsed.choices[0]
          : null;
      const delta =
        choice != null && choice.delta != null ? choice.delta.content : null;
      if (typeof delta === 'string' && delta !== '') {
        fullText += delta;
        onTextDelta(delta);
      }
    }
  }

  return fullText;
}
