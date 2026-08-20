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
  return String.fromCharCode.apply(
    String,
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
  );
}
