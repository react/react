/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {resolveRequest} from './providerRuntime';
import {streamOpenAIChat} from './wire/openaiChat';
import {streamOpenAIResponses} from './wire/openaiResponses';

import type {StreamChatOptions, CompletionResult} from './types';

// Entry point for the agent loop: resolves the stored config into a request
// (auth loader) and dispatches to the adapter for the provider's wire
// dialect. Adding a wire dialect (e.g. openai-responses for Codex) is adding
// a case here plus its adapter under wire/.
export async function streamChatCompletion(
  options: StreamChatOptions,
): Promise<CompletionResult> {
  const {config, messages, tools, signal, onTextDelta} = options;

  const resolved = await resolveRequest(config);
  if (resolved.error != null) {
    throw new Error(resolved.error);
  }

  switch (resolved.wire) {
    case 'openai-chat':
      return streamOpenAIChat({
        request: resolved,
        messages,
        tools,
        signal,
        onTextDelta,
      });
    case 'openai-responses':
      return streamOpenAIResponses({
        request: resolved,
        messages,
        tools,
        signal,
        onTextDelta,
      });
    default:
      throw new Error(`Unsupported wire protocol "${resolved.wire}".`);
  }
}
