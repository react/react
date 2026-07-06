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
let latin1Decoder: TextDecoder | void;
export default function binaryToComparableString(
  view: $ArrayBufferView,
): string {
  // Lazily initialize to avoid ReferenceError in environments where TextDecoder
  // is not yet available at module load time (e.g. some Jest setups).
  if (latin1Decoder === undefined) {
    latin1Decoder = new TextDecoder('latin1');
  }
  return latin1Decoder.decode(view);
}
