/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getProvider} from './providers';
import {getValidCodexAuth} from './codexAuth';

import type {AIProviderConfig, ResolvedRequest} from './types';

// The auth loader: turns stored config into everything a wire adapter needs
// to issue requests (base URL, headers, wire dialect, model). This is the
// extension point for auth methods — api-key, none, and subscription (Codex
// token import + refresh + ChatGPT-Account-Id header) all resolve here.
//
// Async because subscription auth may refresh tokens over the network.
// Returns a user-facing error string when the config is unusable, so the
// chat surfaces a clear message instead of a raw network failure.
export async function resolveRequest(
  config: AIProviderConfig,
): Promise<ResolvedRequest | {error: string}> {
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
  } else if (provider.auth === 'subscription') {
    let auth;
    try {
      auth = await getValidCodexAuth();
    } catch (error) {
      return {error: error.message};
    }
    headers.Authorization = `Bearer ${auth.accessToken}`;
    headers['ChatGPT-Account-Id'] = auth.accountId;
  }

  return {
    wire: provider.wire,
    baseUrl,
    model: config.model,
    headers,
  };
}
