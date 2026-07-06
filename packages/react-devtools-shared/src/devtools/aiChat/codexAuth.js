/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// OpenAI Codex subscription ("Sign in with ChatGPT") auth.
//
// The user signs in with the Codex CLI (`codex login`), which writes
// ~/.codex/auth.json. Browser extensions cannot read the disk, so a tiny
// native messaging host (codex-auth-host/ in react-devtools-extensions,
// one-time install) reads that file on request. The panel never copies or
// refreshes tokens: every request re-reads the file, so tokens the CLI
// rotates are picked up automatically, and an expired token means "run
// `codex login` again" — refresh stays the CLI's job.

export type CodexTokens = {
  accessToken: string,
  refreshToken: string,
  accountId: string,
};

const NATIVE_HOST_NAME = 'com.react_devtools.codex_auth';

// Parses auth.json content: either the full file or just its `tokens`
// object. Returns null if it doesn't contain the required fields.
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

// Reads the `exp` claim (ms) from a JWT access token, or null if it's not a
// decodable JWT.
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

function getRuntime(): any | null {
  const chrome = (window: any).chrome;
  if (
    chrome != null &&
    chrome.runtime != null &&
    typeof chrome.runtime.sendNativeMessage === 'function'
  ) {
    return chrome.runtime;
  }
  return null;
}

// The one-time setup command shown to the user, with this install's actual
// extension ID filled in (unpacked extension IDs are path-derived).
export function getCodexSetupCommand(): string {
  const runtime = getRuntime();
  const extensionId =
    runtime != null && typeof runtime.id === 'string'
      ? runtime.id
      : '<extension-id from chrome://extensions>';
  return (
    'packages/react-devtools-extensions/codex-auth-host/install.sh ' +
    extensionId
  );
}

function readAuthViaNativeHost(): Promise<string> {
  return new Promise((resolve, reject) => {
    const runtime = getRuntime();
    if (runtime == null) {
      reject(
        new Error(
          'Codex sign-in needs the React DevTools browser extension ' +
            '(native messaging is not available here).',
        ),
      );
      return;
    }
    runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      {type: 'read-auth'},
      (response: any) => {
        if (runtime.lastError != null) {
          reject(
            new Error(
              'Codex helper is not set up. One-time setup: from the React ' +
                `repo, run \`${getCodexSetupCommand()}\`, then reload the ` +
                `extension. (Chrome said: ${runtime.lastError.message})`,
            ),
          );
          return;
        }
        if (response == null || response.ok !== true) {
          reject(
            new Error(
              response != null && typeof response.error === 'string'
                ? response.error
                : 'Could not read ~/.codex/auth.json.',
            ),
          );
          return;
        }
        resolve(response.content);
      },
    );
  });
}

// Returns the access token + account id currently in ~/.codex/auth.json.
// No refresh happens here by design: the Codex CLI owns the tokens.
export async function getValidCodexAuth(): Promise<{
  accessToken: string,
  accountId: string,
}> {
  const text = await readAuthViaNativeHost();
  const tokens = parseCodexAuthInput(text);
  if (tokens == null) {
    throw new Error(
      '~/.codex/auth.json does not contain ChatGPT tokens. Run ' +
        '`codex login` (choosing "Sign in with ChatGPT"), then try again.',
    );
  }
  const expiryMs = getAccessTokenExpiryMs(tokens.accessToken);
  if (expiryMs != null && expiryMs <= Date.now()) {
    throw new Error(
      'The Codex access token has expired. Run `codex login` in a terminal ' +
        'to refresh it, then send your message again.',
    );
  }
  return {accessToken: tokens.accessToken, accountId: tokens.accountId};
}
