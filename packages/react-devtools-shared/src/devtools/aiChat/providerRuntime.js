/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getProvider} from './providers';

import type {AIProviderConfig, ResolvedRequest} from './types';

// The auth loader: turns stored config into everything a wire adapter needs
// to issue requests (base URL, headers, wire dialect, model). This is the
// extension point for new auth methods — the 'subscription' branch (Codex
// token import + refresh + ChatGPT-Account-Id header) lands here in P1.
//
// Returns a user-facing error string when the config is unusable, so the
// chat surfaces a clear message instead of a raw network failure.
export function resolveRequest(
  config: AIProviderConfig,
): ResolvedRequest | {error: string} {
  const provider = getProvider(config.providerId);
  const baseUrl = config.baseUrl !== '' ? config.baseUrl : provider.baseUrl;

  if (baseUrl === '') {
    return {
      error:
        'No API base URL configured. Open Settings > Chat to configure a provider.',
    };
  }
  if (config.model === '') {
    return {
      error:
        'No model configured. Open Settings > Chat and enter a model name.',
    };
  }

  const headers: {[string]: string} = {'Content-Type': 'application/json'};
  if (provider.auth === 'api-key') {
    if (config.apiKey === '') {
      return {
        error: `${provider.label} requires an API key. Add one in Settings > Chat.`,
      };
    }
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  return {
    wire: provider.wire,
    baseUrl,
    model: config.model,
    headers,
  };
}
