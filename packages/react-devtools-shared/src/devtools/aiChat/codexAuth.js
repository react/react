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
  localStorageSetItem,
  localStorageRemoveItem,
} from 'react-devtools-shared/src/storage';
import {LOCAL_STORAGE_AI_CODEX_TOKENS_KEY} from 'react-devtools-shared/src/constants';

// OpenAI Codex subscription ("Sign in with ChatGPT") auth.
//
// A browser extension cannot run the OAuth flow itself — the Codex OAuth
// client only allows the http://localhost:1455 redirect. So the user logs
// in once with the Codex CLI (`codex login`) and pastes the resulting
// ~/.codex/auth.json here; we use the access token, refresh it via the
// token endpoint before it expires, and persist the rotated tokens.

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const TOKEN_ENDPOINT = 'https://auth.openai.com/oauth/token';
// Refresh when the access token has this little life left (or no exp known).
const REFRESH_BUFFER_MS = 10 * 60 * 1000;

export type CodexTokens = {
  accessToken: string,
  refreshToken: string,
  accountId: string,
};

// Parses pasted content: either a full ~/.codex/auth.json or just its
// `tokens` object. Returns null if it doesn't contain the required fields.
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

export function getStoredCodexTokens(): CodexTokens | null {
  const raw = localStorageGetItem(LOCAL_STORAGE_AI_CODEX_TOKENS_KEY);
  if (raw == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.accountId === 'string'
    ) {
      return parsed;
    }
  } catch (error) {}
  return null;
}

export function setStoredCodexTokens(tokens: CodexTokens): void {
  localStorageSetItem(
    LOCAL_STORAGE_AI_CODEX_TOKENS_KEY,
    JSON.stringify(tokens),
  );
}

export function clearStoredCodexTokens(): void {
  localStorageRemoveItem(LOCAL_STORAGE_AI_CODEX_TOKENS_KEY);
}

export function hasCodexTokens(): boolean {
  return getStoredCodexTokens() != null;
}

// Reads the `exp` claim (ms) from a JWT access token, or null if it's not a
// decodable JWT.
function getAccessTokenExpiryMs(accessToken: string): number | null {
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

async function refreshCodexTokens(refreshToken: string): Promise<CodexTokens> {
  let response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'openid profile email',
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the OpenAI token endpoint: ${error.message}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      'Codex token refresh failed. Re-run `codex login` and paste the new ' +
        'tokens in Settings > Chat.',
    );
  }
  const data = await response.json();
  const current = getStoredCodexTokens();
  const next: CodexTokens = {
    accessToken: data.access_token,
    // The refresh token may be rotated; keep the previous one if not.
    refreshToken:
      typeof data.refresh_token === 'string'
        ? data.refresh_token
        : refreshToken,
    accountId: current != null ? current.accountId : '',
  };
  setStoredCodexTokens(next);
  return next;
}

// Returns a valid access token + account id, refreshing first if the stored
// access token is missing an exp or expiring within the buffer window.
export async function getValidCodexAuth(): Promise<{
  accessToken: string,
  accountId: string,
}> {
  const tokens = getStoredCodexTokens();
  if (tokens == null) {
    throw new Error(
      'Not signed in to Codex. In Settings > Chat, paste the contents of ' +
        '~/.codex/auth.json (run `codex login` first).',
    );
  }

  const expiryMs = getAccessTokenExpiryMs(tokens.accessToken);
  const needsRefresh =
    expiryMs == null || expiryMs - Date.now() < REFRESH_BUFFER_MS;

  const usable = needsRefresh
    ? await refreshCodexTokens(tokens.refreshToken)
    : tokens;

  return {accessToken: usable.accessToken, accountId: usable.accountId};
}
