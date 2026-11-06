/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

function createObjectCheck(source, received) {
  const expectedByReceived = new WeakMap();
  return function check() {
    const todo = [[source, received]];
    // One source object may have several received copies. Visit each copy,
    // including on a later check, rather than stopping at the source object.
    const visited = new Set();
    while (todo.length > 0) {
      const [expected, actual] = todo.pop();
      if (expected === null || typeof expected !== 'object') {
        expect(actual).toBe(expected);
        continue;
      }
      expect(actual).not.toBe(null);
      expect(typeof actual).toBe('object');
      const previous = expectedByReceived.get(actual);
      if (previous !== undefined && previous !== expected) {
        throw new Error(
          'A received object matches two distinct source objects',
        );
      }
      expectedByReceived.set(actual, expected);
      if (visited.has(actual)) {
        continue;
      }
      visited.add(actual);
      if (Array.isArray(expected)) {
        expect(Array.isArray(actual)).toBe(true);
        expect(actual.length).toBe(expected.length);
      } else {
        expect(Object.getPrototypeOf(expected)).toBe(Object.prototype);
        expect(Object.getPrototypeOf(actual)).toBe(Object.prototype);
      }
      const keys = Object.keys(expected);
      expect(Object.keys(actual)).toEqual(keys);
      keys.forEach(key => todo.push([expected[key], actual[key]]));
    }
  };
}

module.exports = {createObjectCheck};
