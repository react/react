/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AIProviderPreset} from './types';

export const PROVIDER_PRESETS: Array<AIProviderPreset> = [
  {
    id: 'ollama-cloud',
    label: 'Ollama Cloud',
    baseUrl: 'https://ollama.com/v1',
    requiresApiKey: true,
    models: ['kimi-k2.7', 'glm-4.6', 'kimi-k2'],
  },
  {
    id: 'ollama-local',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    requiresApiKey: false,
    models: [],
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    requiresApiKey: false,
    models: [],
  },
];

export const DEFAULT_PROVIDER_ID = 'ollama-cloud';

export function getProviderPreset(providerId: string): AIProviderPreset {
  const preset = PROVIDER_PRESETS.find(({id}) => id === providerId);
  return preset != null ? preset : PROVIDER_PRESETS[0];
}
