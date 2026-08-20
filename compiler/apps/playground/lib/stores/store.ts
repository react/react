/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import invariant from 'invariant';
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import {defaultStore, defaultConfig} from '../defaultStore';

/**
 * Global Store for Playground
 */
export interface Store {
  source: string;
  config: string;
  showInternals: boolean;
}
export function encodeStore(store: Store): string {
  return compressToEncodedURIComponent(JSON.stringify(store));
}
export function decodeStore(hash: string): any {
  return JSON.parse(decompressFromEncodedURIComponent(hash));
}

/**
 * Serialize, encode, and save @param store to localStorage and update URL.
 */
export function saveStore(store: Store): void {
  const hash = encodeStore(store);
  localStorage.setItem('playgroundStore', hash);
  history.replaceState({}, '', `#${hash}`);
}

/**
 * Check if @param raw is a valid Store by if
 * - it has a `source` property and is a string
 */
function isValidStore(raw: unknown): raw is Store {
  return (
    raw != null &&
    typeof raw == 'object' &&
    'source' in raw &&
    typeof raw['source'] === 'string'
  );
}

/**
 * Deserialize, decode, and initialize @param store from URL and then
 * localStorage. Throw an error if Store is malformed.
 */
export function initStoreFromUrlOrLocalStorage(): Store {
  const encodedSourceFromUrl = location.hash.slice(1);
  const encodedSourceFromLocal = localStorage.getItem('playgroundStore');
  const encodedSource = encodedSourceFromUrl || encodedSourceFromLocal;

  /**
   * No data in the URL and no data in the localStorage to fallback to.
   * Initialize with the default store.
   */
  if (!encodedSource) return defaultStore;

  const raw: any = decodeStore(encodedSource);

  invariant(isValidStore(raw), 'Invalid Store');

  // Make sure all properties are populated
  return {
    source: raw.source,
    config: 'config' in raw && raw['config'] ? raw.config : defaultConfig,
    showInternals: 'showInternals' in raw ? raw.showInternals : false,
  };
}
