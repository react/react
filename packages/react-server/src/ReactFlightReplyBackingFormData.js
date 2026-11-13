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
 * - '_' starts the namespace of referenced FormData entries. The entries of one
 *   referenced FormData share a `prefix + '_' + <id> + '_'` block prefix, so
 *   they are grouped under it and a "$K" lookup reads only its own group. A
 *   reference can be reached in any order relative to the body, including a
 *   reference inside a stream item that resolves before an earlier one, so the
 *   lookup is by prefix and never depends on the position of the block.
 * - 'S' starts the namespace of stream/async-iterable chunks. These are the
 *   only fields that can repeat, so they accumulate in an array per key.
 * - Everything else is a one-shot chunk or an outlined Blob, looked up by
 *   exact field name.
 */
export opaque type BackingFormData = {
  prefix: string,
  // Referenced FormData entries grouped by their `prefix + '_' + <id> + '_'`
  // block prefix, each group an entry list with that block prefix removed from
  // the key. A "$K" lookup reads the group for its own id.
  referencedGroups: null | Map<string, Array<[string, FormDataEntryValue]>>,
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
      // Group the entry under its reference's block prefix, keeping the key the
      // referenced FormData carries once the block prefix is stripped.
      const separator = key.indexOf('_', prefix.length + 1);
      if (separator === -1) {
        return;
      }
      const blockPrefix = key.slice(0, separator + 1);
      const entryKey = key.slice(separator + 1);
      let referencedGroups = backingStore.referencedGroups;
      if (referencedGroups === null) {
        referencedGroups = backingStore.referencedGroups = new Map();
      }
      const group = referencedGroups.get(blockPrefix);
      if (group === undefined) {
        referencedGroups.set(blockPrefix, [[entryKey, value]]);
      } else {
        group.push([entryKey, value]);
      }
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
    referencedGroups: null,
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
  // Builds the FormData for a "$K" reference from the entries grouped under its
  // block prefix. The reference may be reached in any order relative to the
  // body, so the group is found by prefix, not by position.
  const data = new FormData();
  const referencedGroups = backingStore.referencedGroups;
  if (referencedGroups === null) {
    return data;
  }
  const group = referencedGroups.get(formPrefix);
  if (group === undefined) {
    return data;
  }
  // The writer refers to a FormData by path after its first occurrence, so a
  // group is read once. A repeated reference gets an empty FormData rather
  // than another copy of the entries.
  referencedGroups.delete(formPrefix);
  for (let i = 0; i < group.length; i++) {
    const entry = group[i];
    // $FlowFixMe[incompatible-type]
    data.append(entry[0], entry[1]);
  }
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
