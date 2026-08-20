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
 * Accumulates items that must not be null or undefined into the first one. This
 * is used to conserve memory by avoiding array allocations, and thus sacrifices
 * API cleanness. Since `current` can be null before being passed in and not
 * null after this function, make sure to assign it back to `current`:
 *
 * `a = accumulateInto(a, b);`
 *
 * This API should be sparingly used. Try `accumulate` for something cleaner.
 *
 * @return {*|array<*>} An accumulation of items.
 */

function accumulateInto<T>(
  current: ?(Array<T> | T),
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
    if (isArray(next)) {
      // $FlowFixMe[incompatible-use] `isArray` does not ensure array is mutable
      // $FlowFixMe[method-unbinding]
      current.push.apply(current, next);
      return current;
    }
    // $FlowFixMe[incompatible-use] `isArray` does not ensure array is mutable
    current.push(next);
    return current;
  }

  if (isArray(next)) {
    // A bit too dangerous to mutate `next`.
    /* $FlowFixMe[incompatible-return] unsound if `next` is `T` and `T` an array,
     * `isArray` might refine to the array element type of `T` */
    return [current].concat(next);
  }

  return [current, next];
}

export default accumulateInto;
