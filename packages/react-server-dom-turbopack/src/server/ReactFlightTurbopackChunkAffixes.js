/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ClientManifest} from './ReactFlightServerConfigTurbopackBundler';

export type ChunkLoadingOptions = {
  prefix?: string,
  suffix?: string,
};

// Turbopack chunk filenames share a common URL layout: a directory prefix and,
// on deployed apps, a version marker suffix (e.g. ?dpl=...). Both repeat in
// every chunk entry of every client reference in the RSC payload. When the
// caller declares them, they are stripped from the manifest entries before
// serialization, and the runtime that loads chunks restores them, so the
// payload only carries the variable part of each filename.
export function stripChunkAffixesFromManifest(
  manifest: ClientManifest,
  chunkLoading: ChunkLoadingOptions,
): ClientManifest {
  const prefix = chunkLoading.prefix || '';
  const suffix = chunkLoading.suffix || '';
  if (prefix === '' && suffix === '') {
    return manifest;
  }
  const stripped: Map<string, mixed> = new Map();
  // Manifests can be large and most entries are never referenced by a given
  // request, so entries are transformed lazily and memoized.
  return new Proxy(manifest, {
    get(target, key: string) {
      const entry = target[key];
      if (entry == null || typeof entry !== 'object') {
        return entry;
      }
      let strippedEntry = stripped.get(key);
      if (strippedEntry === undefined) {
        const chunks = entry.chunks;
        const strippedChunks: Array<string> = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (
            chunk.length > prefix.length + suffix.length &&
            chunk.startsWith(prefix) &&
            chunk.endsWith(suffix)
          ) {
            strippedChunks.push(
              chunk.slice(prefix.length, chunk.length - suffix.length),
            );
          } else {
            // The chunk doesn't live under the declared layout. Leaving it
            // intact would make the client reassemble a wrong URL, so this is
            // a configuration error rather than something to paper over.
            if (__DEV__) {
              console.error(
                'A chunk filename "%s" does not match the declared chunkLoading ' +
                  'prefix "%s" and suffix "%s". Every chunk must match, or the ' +
                  'client would reconstruct a wrong URL for it.',
                chunk,
                prefix,
                suffix,
              );
            }
            strippedChunks.push(chunk);
          }
        }
        strippedEntry = {...entry, chunks: strippedChunks};
        stripped.set(key, strippedEntry);
      }
      return strippedEntry;
    },
  });
}
