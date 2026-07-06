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
  // String.fromCharCode.apply(String, largeArray) throws a RangeError when the
  // array exceeds the JavaScript engine's call-argument limit (~65535 in most
  // engines). Process the bytes in chunks to avoid this.
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const chunkSize = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode.apply(
      String,
      bytes.subarray(i, i + chunkSize),
    );
  }
  return result;
}
