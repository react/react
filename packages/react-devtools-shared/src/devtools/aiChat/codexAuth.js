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
// ~/.codex/auth.json. The panel never copies or refreshes those tokens:
// the user selects that file once and we re-read it on every request via a
// persisted File System Access handle, so tokens the CLI rotates are picked
// up automatically. When the access token in the file has expired, the fix
// is on the CLI side (re-run `codex login`), not here.

export type CodexTokens = {
  accessToken: string,
  refreshToken: string,
  accountId: string,
};

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

// --- Persisted file handle ---
// FileSystemFileHandle is structured-cloneable, so it survives in IndexedDB
// (localStorage cannot hold it).

const DB_NAME = 'React::DevTools::AI';
const STORE_NAME = 'fileHandles';
const HANDLE_KEY = 'codexAuthJson';

function promisifyRequest<T>(request: any): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function openHandleStore(): Promise<any> {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE_NAME);
  };
  return promisifyRequest(request);
}

async function getStoredHandle(): Promise<any> {
  try {
    const db = await openHandleStore();
    try {
      return await promisifyRequest(
        db.transaction(STORE_NAME).objectStore(STORE_NAME).get(HANDLE_KEY),
      );
    } finally {
      db.close();
    }
  } catch (error) {
    return null;
  }
}

async function setStoredHandle(handle: any): Promise<void> {
  const db = await openHandleStore();
  try {
    await promisifyRequest(
      db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put(handle, HANDLE_KEY),
    );
  } finally {
    db.close();
  }
}

// Fallback when the File System Access picker is unavailable (e.g. blocked
// inside the DevTools panel frame): a plain <input type="file"> File. Plain
// Files can't be persisted, so this lives for the current session only.
let fallbackFile: any = null;

export function supportsCodexFilePicker(): boolean {
  return typeof (window: any).showOpenFilePicker === 'function';
}

// Opens the picker and persists the handle. Throws AbortError if the user
// cancels the dialog.
export async function pickCodexAuthFile(): Promise<void> {
  const showOpenFilePicker = (window: any).showOpenFilePicker;
  if (typeof showOpenFilePicker !== 'function') {
    throw new Error('The file picker is not available in this browser.');
  }
  const handles = await showOpenFilePicker({
    types: [
      {description: 'Codex auth.json', accept: {'application/json': ['.json']}},
    ],
  });
  await setStoredHandle(handles[0]);
  fallbackFile = null;
}

export function setCodexAuthFallbackFile(file: any): void {
  fallbackFile = file;
}

export async function hasCodexAuthFile(): Promise<boolean> {
  if (fallbackFile != null) {
    return true;
  }
  return (await getStoredHandle()) != null;
}

async function readCodexAuthText(): Promise<string> {
  const handle = await getStoredHandle();
  if (handle != null) {
    let permission = 'granted';
    if (typeof handle.queryPermission === 'function') {
      permission = await handle.queryPermission({mode: 'read'});
      if (
        permission === 'prompt' &&
        typeof handle.requestPermission === 'function'
      ) {
        // Works when called on the way into a send — the click's transient
        // user activation is what allows the re-grant prompt.
        permission = await handle.requestPermission({mode: 'read'});
      }
    }
    if (permission !== 'granted') {
      throw new Error(
        'Access to auth.json was not re-granted. Select the file again in ' +
          'Settings > Chat.',
      );
    }
    const file = await handle.getFile();
    return file.text();
  }
  if (fallbackFile != null) {
    return fallbackFile.text();
  }
  throw new Error(
    'Codex is not connected. Run `codex login` in a terminal, then select ' +
      '~/.codex/auth.json in Settings > Chat.',
  );
}

// Returns the access token + account id currently in auth.json. No refresh
// happens here by design: the Codex CLI owns the tokens.
export async function getValidCodexAuth(): Promise<{
  accessToken: string,
  accountId: string,
}> {
  const text = await readCodexAuthText();
  const tokens = parseCodexAuthInput(text);
  if (tokens == null) {
    throw new Error(
      'The selected file is not a Codex auth.json. Run `codex login`, then ' +
        'select ~/.codex/auth.json in Settings > Chat.',
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
