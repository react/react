/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {streamChatCompletion} from './client';

import type ToolRegistry from './toolRegistry';
import type {AIProviderConfig, ChatMessage} from './types';

// Enough for summary -> drill-down -> synthesize workflows while still
// bounding runaway loops.
const MAX_ITERATIONS = 8;

export type AgentLoopCallbacks = {
  // Streaming text for the assistant message of the current iteration.
  onTextDelta: (text: string) => void,
  // A new assistant message begins (after tool results, the model responds
  // again as a fresh transcript entry).
  onAssistantMessage: (message: ChatMessage) => void,
  // A tool finished (or failed); the result message is final.
  onToolMessage: (message: ChatMessage) => void,
};

// Runs the model with tools until it stops requesting them.
// The transcript passed in is not mutated; new messages flow through the
// callbacks and are also used to build subsequent requests.
export async function runAgentLoop(
  config: AIProviderConfig,
  transcript: Array<ChatMessage>,
  registry: ToolRegistry,
  signal: AbortSignal,
  callbacks: AgentLoopCallbacks,
): Promise<void> {
  const providerTools =
    registry.size > 0 ? registry.toProviderTools() : undefined;
  const messages = transcript.slice();

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const result = await streamChatCompletion({
      config,
      messages,
      tools: providerTools,
      signal,
      onTextDelta: callbacks.onTextDelta,
    });

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: result.content,
      toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
    };
    messages.push(assistantMessage);
    callbacks.onAssistantMessage(assistantMessage);

    if (result.toolCalls.length === 0) {
      return;
    }

    for (let i = 0; i < result.toolCalls.length; i++) {
      const toolCall = result.toolCalls[i];
      if (signal.aborted) {
        return;
      }

      const content = await registry.execute(
        toolCall.name,
        toolCall.argumentsJSON,
      );

      const toolMessage: ChatMessage = {
        role: 'tool',
        content,
        toolCallId: toolCall.id,
        name: toolCall.name,
      };
      messages.push(toolMessage);
      callbacks.onToolMessage(toolMessage);
    }
  }

  const limitMessage: ChatMessage = {
    role: 'assistant',
    content:
      '[Stopped: reached the tool-call limit for a single question. ' +
      'Ask a follow-up to continue.]',
  };
  callbacks.onAssistantMessage(limitMessage);
}
