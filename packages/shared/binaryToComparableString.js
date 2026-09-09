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
export default function binaryToComparableString(
  view: $ArrayBufferView,
): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  // We build the string in chunks. Passing every byte as a separate argument to
  // String.fromCharCode.apply exceeds the engine's maximum argument count for
  // large buffers and throws a RangeError, so we cap how many bytes we spread
  // per call.
  const chunkSize = 0x8000;
  let result = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode.apply(
      String,
      bytes.subarray(i, i + chunkSize),
    );
  }
  return result;
}
