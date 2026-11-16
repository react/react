/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * Backing FormData indexes the entries of a reply payload so that no lookup
 * ever scans a live FormData instance. FormData.get/getAll/delete are linear
 * in the number of entries in every major runtime, which could make decoding
 * quadratic in the payload size. Every structure here is either an append-only
 * array with a cursor or a map, so no operation is proportional to the total
 * number of stored entries.
 *
 * Keys are classified by the character following the response prefix:
 * - '_' starts the namespace of referenced FormData entries. These are only
 *   ever consumed in insertion order by the "$K" scan, so they go into a
 *   plain array with a cursor.
 * - 'S' starts the namespace of stream/async-iterable chunks. These are the
 *   only fields that can repeat, so they accumulate in an array per key.
 * - Everything else is a one-shot chunk or an outlined Blob, looked up by
 *   exact field name.
 */
export opaque type BackingFormData = {
  prefix: string,
  // Entries whose key is in the `prefix + '_' + ...` namespace, in insertion
  // order. The only structure the "$K" scan reads.
  referencedEntries: null | Array<[string, FormDataEntryValue]>,
  // Cursor for the "$K" scan; advances monotonically.
  keyPointer: number,
  // Field name -> string, for one-shot `prefix + <decimal id>` chunk fields.
  stringChunks: null | Map<string, string>,
  // Field name (`prefix + 'S' + <decimal id>`) -> buffered chunk strings, in
  // arrival order. Only actual streams/async iterables allocate an array.
  streamChunks: null | Map<string, Array<string>>,
  // Field name -> outlined Blob/File. The client outlines each Blob under a
  // fresh id, so keys don't repeat.
  blobs: null | Map<string, Blob>,
};

export function appendBackingEntry(
  backingStore: BackingFormData,
  value: FormDataEntryValue,
  key: string,
): void {
  const prefix = backingStore.prefix;
  if (!key.startsWith(prefix)) {
    // Not owned by this reply (e.g. $ACTION_ fields). Never looked up through
    // the backing store, so don't index it.
    return;
  }
  const namespace = key[prefix.length];
  switch (namespace) {
    case '_': {
      let referencedEntries = backingStore.referencedEntries;
      if (referencedEntries === null) {
        referencedEntries = backingStore.referencedEntries = [];
      }
      referencedEntries.push([key, value]);
      return;
    }
    case 'S': {
      if (typeof value === 'string') {
        let streamChunks = backingStore.streamChunks;
        if (streamChunks === null) {
          streamChunks = backingStore.streamChunks = new Map();
        }
        const existing = streamChunks.get(key);
        if (existing === undefined) {
          streamChunks.set(key, [value]);
        } else {
          existing.push(value);
        }
      }
      // Files in the stream namespace are ignored, matching the filter in
      // resolveStream.
      return;
    }
  }

  if (typeof value === 'string') {
    let stringChunks = backingStore.stringChunks;
    if (stringChunks === null) {
      stringChunks = backingStore.stringChunks = new Map();
    }
    stringChunks.set(key, value);
  } else {
    let blobs = backingStore.blobs;
    if (blobs === null) {
      blobs = backingStore.blobs = new Map();
    }
    blobs.set(key, value);
  }
}

export function createBackingFormData(
  formData: FormData,
  prefix: string,
): BackingFormData {
  const backingStore: BackingFormData = {
    prefix,
    referencedEntries: null,
    keyPointer: 0,
    stringChunks: null,
    streamChunks: null,
    blobs: null,
  };
  // $FlowFixMe[prop-missing]
  formData.forEach(appendBackingEntry.bind(null, backingStore));
  return backingStore;
}

export function consumeBackingEntries(
  backingStore: BackingFormData,
  formPrefix: string,
): FormData {
  // Consumes the consecutive run of entries at the cursor whose keys start
  // with `formPrefix` into a new FormData, stripping the prefix from the
  // keys. The values of a referenced FormData are serialized as one
  // continuous block before its reference, so once a key doesn't match we
  // are past the values for this reference.
  const data = new FormData();
  const entries = backingStore.referencedEntries;
  if (entries === null) {
    return data;
  }
  let i = backingStore.keyPointer;
  while (i < entries.length) {
    const entry = entries[i];
    const key = entry[0];
    if (!key.startsWith(formPrefix)) {
      break;
    }
    // $FlowFixMe[incompatible-type]
    data.append(key.slice(formPrefix.length), entry[1]);
    i++;
  }
  backingStore.keyPointer = i;
  return data;
}

export function getBackingString(
  backingStore: BackingFormData,
  key: string,
): string | void {
  const stringChunks = backingStore.stringChunks;
  return stringChunks === null ? undefined : stringChunks.get(key);
}

export function getStreamChunks(
  backingStore: BackingFormData,
  key: string,
): Array<string> | void {
  const streamChunks = backingStore.streamChunks;
  return streamChunks === null ? undefined : streamChunks.get(key);
}

export function getBackingBlob(
  backingStore: BackingFormData,
  key: string,
): Blob | void {
  const blobs = backingStore.blobs;
  return blobs === null ? undefined : blobs.get(key);
}
