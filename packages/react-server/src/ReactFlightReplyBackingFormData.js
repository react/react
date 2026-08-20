/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * Backing FormData is a wrapper around FormData that allows iterating over the
 * keys while allowing to evict values from the FormData without affecting the iteration.
 * Native FormData.keys() will skip keys if entries with Blob are deleted e.g.
 * ```js
 * const formData = new FormData();
 * formData.append('a', new Blob());
 * formData.append('b', 2);
 * const keys = formData.keys();
 * keys.next().value; // 'a'
 * formData.delete('a');
 * keys.next().value; // undefined, but we expect 'b'
 * ```
 */
export opaque type BackingFormData = {
  data: FormData,
  keyPointer: number,
  // Lazily initialized array of keys. We only need this at the moment
  // for referenced FormData.
  keys: null | Array<string>,
};

export function peekBackingEntry(backingStore: BackingFormData): string | void {
  let keys = backingStore.keys;
  if (keys === null) {
    keys = backingStore.keys = Array.from(backingStore.data.keys());
    backingStore.keyPointer = 0;
  }

  return keys[backingStore.keyPointer];
}

export function advanceBackingEntryIterator(
  backingStore: BackingFormData,
): void {
  backingStore.keyPointer++;
}

export function consumeBackingEntry(
  backingStore: BackingFormData,
  key: string,
): void {
  backingStore.data.delete(key);
  backingStore.keyPointer++;
}

export function appendBackingEntry(
  backingStore: BackingFormData,
  key: string,
  value: FormDataEntryValue,
): void {
  backingStore.data.append(key, value);
  let keys = backingStore.keys;
  if (keys === null) {
    keys = backingStore.keys = Array.from(backingStore.data.keys());
    backingStore.keyPointer = 0;
  } else {
    keys.push(key);
  }
}

export function appendBackingFile(
  backingStore: BackingFormData,
  key: string,
  value: Blob,
  filename: string,
): void {
  backingStore.data.append(key, value, filename);
  let keys = backingStore.keys;
  if (keys === null) {
    keys = backingStore.keys = Array.from(backingStore.data.keys());
    backingStore.keyPointer = 0;
  } else {
    keys.push(key);
  }
}

export function getBackingEntry(
  backingStore: BackingFormData,
  key: string,
): ?FormDataEntryValue {
  return backingStore.data.get(key);
}

export function getAllBackingEntries(
  backingStore: BackingFormData,
  key: string,
): Array<FormDataEntryValue> {
  return backingStore.data.getAll(key);
}

export function createBackingFormData(formData: FormData): BackingFormData {
  return {
    data: formData,
    keyPointer: -1,
    keys: null,
  };
}
