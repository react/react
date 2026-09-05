/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Set_intersect} from '../Utils/utils';

describe('Set_intersect', () => {
  test('checks the smallest set first while preserving input order', () => {
    const first = new Set([
      2,
      1,
      ...Array.from({length: 100}, (_, i) => i + 3),
    ]);
    const large = new Set(first);
    const small = new Set([1, 2]);
    const largeHas = jest.spyOn(large, 'has');
    const smallHas = jest.spyOn(small, 'has');

    expect(Set_intersect([first, large, small])).toEqual(new Set([2, 1]));
    expect(smallHas).toHaveBeenCalledTimes(first.size);
    expect(largeHas).toHaveBeenCalledTimes(small.size);
  });
});
