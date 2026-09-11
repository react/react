/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as Stack from '../Utils/Stack';

describe('Stack', () => {
  it('.find/.contains/.each/.print work for a small stack', () => {
    let stack = Stack.create(0);
    for (let i = 1; i < 5; i++) {
      stack = stack.push(i);
    }

    expect(stack.find(value => value === 0)).toBe(true);
    expect(stack.find(value => value === -1)).toBe(false);
    expect(stack.contains(3)).toBe(true);
    expect(stack.contains(100)).toBe(false);

    const visited: Array<number> = [];
    stack.each(value => visited.push(value));
    // top-to-bottom order: most recently pushed value first
    expect(visited).toEqual([4, 3, 2, 1, 0]);

    expect(stack.print(value => `${value}`)).toBe('43210');
  });

  /**
   * Regression test for a Stack overflow bug: `find`, `contains`, `each`,
   * and `print` used to recurse one call-stack frame per linked-list node,
   * which overflowed the JS call stack for deeply nested compiler inputs.
   * These traversals should be O(1) in call-stack depth regardless of how
   * many entries are on the Stack.
   */
  it('.find/.contains/.each/.print do not overflow the call stack for a very deep stack', () => {
    const DEPTH = 50_000;
    let stack = Stack.create(0);
    for (let i = 1; i < DEPTH; i++) {
      stack = stack.push(i);
    }

    // The bottom-most (first pushed) value is the value with the deepest
    // recursion depth in the old recursive implementation.
    expect(() => stack.find(value => value === 0)).not.toThrow();
    expect(stack.find(value => value === 0)).toBe(true);
    expect(stack.find(value => value === -1)).toBe(false);

    expect(() => stack.contains(0)).not.toThrow();
    expect(stack.contains(0)).toBe(true);
    expect(stack.contains(-1)).toBe(false);

    let count = 0;
    expect(() => stack.each(() => count++)).not.toThrow();
    expect(count).toBe(DEPTH);

    let printed: string = '';
    expect(() => {
      printed = stack.print(value => `${value},`);
    }).not.toThrow();
    expect(printed.split(',').filter(Boolean).length).toBe(DEPTH);
  });
});
