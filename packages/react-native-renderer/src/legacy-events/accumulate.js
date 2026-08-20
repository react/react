/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import isArray from 'shared/isArray';

/**
 * Accumulates items that must not be null or undefined.
 *
 * This is used to conserve memory by avoiding array allocations.
 *
 * @return {*|array<*>} An accumulation of items.
 */
function accumulate<T>(
  current: ?(T | Array<T>),
  next: T | Array<T>,
): T | Array<T> {
  if (next == null) {
    throw new Error('Accumulated items must not be null or undefined.');
  }

  if (current == null) {
    return next;
  }

  // Both are not empty. Warning: Never call x.concat(y) when you are not
  // certain that x is an Array (x could be a string with concat method).
  if (isArray(current)) {
    // $FlowFixMe[incompatible-use] `isArray` does not ensure array is mutable
    return current.concat(next);
  }

  if (isArray(next)) {
    /* $FlowFixMe[incompatible-return] unsound if `next` is `T` and `T` an array,
     * `isArray` might refine to the array element type of `T` */
    return [current].concat(next);
  }

  return [current, next];
}

export default accumulate;
