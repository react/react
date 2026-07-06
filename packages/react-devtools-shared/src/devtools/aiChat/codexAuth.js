/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  localStorageGetItem,
  localStorageRemoveItem,
  localStorageSetItem,
} from 'react-devtools-shared/src/storage';
import {LOCAL_STORAGE_AI_CODEX_AUTH_KEY} from 'react-devtools-shared/src/constants';

// OpenAI Codex subscription ("Sign in with ChatGPT") auth: the user runs
// `codex login` and pastes ~/.codex/auth.json into settings — a browser
// extension cannot read the disk. The panel never refreshes tokens; an
// expired access token means re-running `codex login` and pasting again.

export type CodexTokens = {
  accessToken: string,
  refreshToken: string,
  accountId: string,
};

// Accepts the full auth.json or just its `tokens` object.
export function parseCodexAuthInput(text: string): CodexTokens | null {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return null;
  }
  if (parsed == null || typeof parsed !== 'object') {
    return null;
  }
  const tokens =
    parsed.tokens != null && typeof parsed.tokens === 'object'
      ? parsed.tokens
      : parsed;
  if (
    typeof tokens.access_token === 'string' &&
    typeof tokens.refresh_token === 'string' &&
    typeof tokens.account_id === 'string'
  ) {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accountId: tokens.account_id,
    };
  }
  return null;
}

// Reads the JWT `exp` claim in ms, or null if not decodable.
export function getAccessTokenExpiryMs(accessToken: string): number | null {
  const parts = accessToken.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    if (typeof decoded.exp === 'number') {
      return decoded.exp * 1000;
    }
  } catch (error) {}
  return null;
}

export function getStoredCodexAuthText(): string {
  const raw = localStorageGetItem(LOCAL_STORAGE_AI_CODEX_AUTH_KEY);
  return raw != null ? raw : '';
}

export function setStoredCodexAuthText(text: string): void {
  if (text.trim() === '') {
    localStorageRemoveItem(LOCAL_STORAGE_AI_CODEX_AUTH_KEY);
  } else {
    localStorageSetItem(LOCAL_STORAGE_AI_CODEX_AUTH_KEY, text);
  }
}

export async function getValidCodexAuth(): Promise<{
  accessToken: string,
  accountId: string,
}> {
  const text = getStoredCodexAuthText();
  if (text.trim() === '') {
    throw new Error(
      'Codex is not connected. Run `codex login` in a terminal, then paste ' +
        'the contents of ~/.codex/auth.json in Settings > Chat.',
    );
  }
  const tokens = parseCodexAuthInput(text);
  if (tokens == null) {
    throw new Error(
      'The pasted content is not a Codex auth.json. Paste the full ' +
        'contents of ~/.codex/auth.json (run `codex login` first).',
    );
  }
  const expiryMs = getAccessTokenExpiryMs(tokens.accessToken);
  if (expiryMs != null && expiryMs <= Date.now()) {
    throw new Error(
      'The Codex access token has expired. Run `codex login` in a ' +
        'terminal, then paste the new ~/.codex/auth.json in Settings > Chat.',
    );
  }
  return {accessToken: tokens.accessToken, accountId: tokens.accountId};
}
