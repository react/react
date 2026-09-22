/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {empty, Stack} from '../Utils/Stack';

describe('Stack', () => {
  test('visits values from the top of the stack down', () => {
    const stack = empty<number>().push(1).push(2).push(3);
    const values: Array<number> = [];

    stack.each(value => values.push(value));

    expect(values).toEqual([3, 2, 1]);
    expect(stack.print(String)).toBe('321');
  });

  test('traverses deeply nested stacks without overflowing', () => {
    let stack: Stack<number> = empty();
    for (let i = 0; i < 20_000; i++) {
      stack = stack.push(i);
    }

    expect(stack.find(value => value === 0)).toBe(true);
    expect(stack.contains(0)).toBe(true);

    let count = 0;
    let first = null;
    let last = null;
    stack.each(value => {
      first ??= value;
      last = value;
      count++;
    });
    expect(count).toBe(20_000);
    expect(first).toBe(19_999);
    expect(last).toBe(0);
    expect(stack.print(() => '.')).toHaveLength(20_000);
  });
});
