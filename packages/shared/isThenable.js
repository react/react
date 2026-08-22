/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Getter-safe thenable check for arbitrary (user-controlled) values. A hostile
// `then` getter must not throw from inside React's own error handling.
export default function isThenable(value: mixed): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  let then;
  try {
    then = (value as any).then;
  } catch (x) {
    return false;
  }
  return typeof then === 'function';
}
