/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// The on-the-wire request/response dialect a provider speaks. Each maps to
// one adapter under aiChat/wire/.
export type WireProtocol = 'openai-chat' | 'openai-responses';

// How a provider is authenticated. 'subscription' = imported OAuth tokens
// (Codex "Sign in with ChatGPT"), resolved + refreshed by the auth loader.
export type AuthMethod = 'none' | 'api-key' | 'subscription';

// A provider is data, not code: the catalog (providers.js) is a list of
// these, and adding a provider is adding an entry.
export type AIProviderDefinition = {
  id: string,
  label: string,
  baseUrl: string,
  wire: WireProtocol,
  auth: AuthMethod,
  // Suggested models for this provider; the model field is free-form.
  models: Array<string>,
};

// Resolved configuration used to issue requests.
// Persisted across sessions via localStorage (see constants.js keys).
export type AIProviderConfig = {
  providerId: string,
  baseUrl: string,
  apiKey: string,
  model: string,
};

// What the auth loader resolves a config into: everything a wire adapter
// needs to make requests, independent of how the credentials were obtained.
export type ResolvedRequest = {
  wire: WireProtocol,
  baseUrl: string,
  model: string,
  headers: {[string]: string},
};

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

// A tool invocation requested by the model (OpenAI-compatible shape).
export type ToolCall = {
  id: string,
  name: string,
  // Raw JSON string as streamed from the provider.
  argumentsJSON: string,
};

export type ChatMessage = {
  role: ChatRole,
  content: string,
  // assistant messages only: tool invocations requested by the model.
  toolCalls?: Array<ToolCall>,
  // tool messages only: which call this message is the result of.
  toolCallId?: string,
  // tool messages only: the tool name, for display.
  name?: string,
  // UI-only: text is still being streamed into this message. Lets state
  // updaters decide replace-vs-append purely from previous state.
  streaming?: boolean,
};

// A tool the model can call: built-in profiler tools and the skill loader.
export type ToolDefinition = {
  name: string,
  description: string,
  // JSON Schema for the arguments object.
  inputSchema: Object,
  // Executes the tool; the resolved string is fed back to the model.
  // Rejections are surfaced to the model as tool errors.
  execute: (args: Object) => Promise<string>,
};

export type StreamChatOptions = {
  config: AIProviderConfig,
  messages: Array<ChatMessage>,
  // OpenAI-compatible tool declarations; omit to disable tool calling.
  tools?: Array<Object>,
  signal: AbortSignal,
  onTextDelta: (text: string) => void,
};

// The outcome of a single streamed completion.
export type CompletionResult = {
  content: string,
  toolCalls: Array<ToolCall>,
};

// A parsed SKILL.md instruction pack that extends what the model knows.
export type Skill = {
  name: string,
  description: string,
  body: string,
  builtIn: boolean,
  enabled: boolean,
};
