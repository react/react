/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * Thin wrappers around localStorage/sessionStorage used by DevTools.
 *
 * Accessing Web Storage can throw in some environments, such as private browsing,
 * restrictive browser extensions, or cross-origin iframes.
 *
 * These wrappers preserve the previous behavior:
 *  - getItem returns null on failure
 *  - setItem and removeItem no-op on failure
 *
 * In development, storage failures now log a warning to make debugging easier.
 */

function shouldLogStorageWarnings(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env != null &&
    process.env.NODE_ENV !== 'production'
  );
}

function warnStorageError(operation: string, key: string, error: mixed): void {
  if (shouldLogStorageWarnings()) {
    // eslint-disable-next-line no-console
    console.warn(
      `DevTools: ${operation} failed for key "${String(key)}".`,
      error,
    );
  }
}

export function localStorageGetItem(key: string): any {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    warnStorageError('localStorage.getItem', key, error);
    return null;
  }
}

export function localStorageRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    warnStorageError('localStorage.removeItem', key, error);
  }
}

export function localStorageSetItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    warnStorageError('localStorage.setItem', key, error);
  }
}

export function sessionStorageGetItem(key: string): any {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    warnStorageError('sessionStorage.getItem', key, error);
    return null;
  }
}

export function sessionStorageRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    warnStorageError('sessionStorage.removeItem', key, error);
  }
}

export function sessionStorageSetItem(key: string, value: any): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    warnStorageError('sessionStorage.setItem', key, error);
  }
}