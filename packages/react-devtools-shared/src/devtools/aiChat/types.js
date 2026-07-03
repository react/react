/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type AIProviderPreset = {
  id: string,
  label: string,
  baseUrl: string,
  requiresApiKey: boolean,
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

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole,
  content: string,
};

export type StreamChatOptions = {
  config: AIProviderConfig,
  messages: Array<ChatMessage>,
  signal: AbortSignal,
  onTextDelta: (text: string) => void,
};
