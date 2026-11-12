/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// A chunk is either a plain chunk filename, or a merged chunk that bundles
// several component chunks together, emitted as
// `[mergedChunkFilename, componentChunkFilenames, componentChunkSizes]`.
export type Chunk =
  | string
  | [
      /* merged chunk filename */ string,
      /* component chunk filenames */ Array<string>,
      /* component chunk sizes */ Array<number>,
    ];

export type ImportManifestEntry = {
  id: string,
  chunks: Array<Chunk>,
  name: string,
  async?: boolean,
};

// This is the parsed shape of the wire format which is why it is
// condensed to only the essentialy information
export type ImportMetadata =
  | [
      /* id */ string,
      /* chunks */ Array<Chunk>,
      /* name */ string,
      /* async */ 1,
    ]
  | [/* id */ string, /* chunks */ Array<Chunk>, /* name */ string];

export const ID = 0;
export const CHUNKS = 1;
export const NAME = 2;
// export const ASYNC = 3;

// This logic is correct because currently only include the 4th tuple member
// when the module is async. If that changes we will need to actually assert
// the value is true. We don't index into the 4th slot because flow does not
// like the potential out of bounds access
export function isAsyncImport(metadata: ImportMetadata): boolean {
  return metadata.length === 4;
}
