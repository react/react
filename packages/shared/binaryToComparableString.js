/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Turns a TypedArray or ArrayBuffer into a string that can be used for comparison
// in a Map to see if the bytes are the same.
//
// String.fromCharCode.apply has an engine-dependent limit on the number of
// arguments it accepts. Passing a large view in one call throws a RangeError,
// so we convert the bytes in chunks and concatenate the results.
const CHUNK_SIZE = 8192;

export default function binaryToComparableString(
  view: $ArrayBufferView,
): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  let string = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    string += String.fromCharCode.apply(
      String,
      bytes.subarray(i, i + CHUNK_SIZE),
    );
  }
  return string;
}
