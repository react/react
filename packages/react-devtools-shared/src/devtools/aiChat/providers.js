/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AIProviderDefinition} from './types';

// The provider catalog. Adding a provider is adding an entry here; the auth
// loader (providerRuntime.js) and wire adapters (wire/) are keyed off the
// `auth` and `wire` fields. Free-form baseUrl/model overrides are still
// stored per user, so an OpenAI-compatible endpoint not listed here can be
// reached by picking the closest provider and editing its base URL.
export const PROVIDERS: Array<AIProviderDefinition> = [
  {
    id: 'ollama-cloud',
    label: 'Ollama Cloud',
    baseUrl: 'https://ollama.com/v1',
    wire: 'openai-chat',
    auth: 'api-key',
    models: ['kimi-k2.7', 'glm-4.6', 'kimi-k2'],
  },
  {
    id: 'ollama-local',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    wire: 'openai-chat',
    auth: 'none',
    models: [],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    wire: 'openai-chat',
    auth: 'api-key',
    models: ['gpt-5.1', 'gpt-5.1-mini', 'gpt-4.1'],
  },
];

export const DEFAULT_PROVIDER_ID = 'ollama-cloud';

export function getProvider(providerId: string): AIProviderDefinition {
  const provider = PROVIDERS.find(({id}) => id === providerId);
  return provider != null ? provider : PROVIDERS[0];
}
