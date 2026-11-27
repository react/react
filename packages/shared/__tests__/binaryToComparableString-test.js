/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const binaryToComparableString =
  require('shared/binaryToComparableString').default;

describe('binaryToComparableString', () => {
  it('supports binary data larger than the argument count limit', () => {
    const bytes = new Uint8Array(200000);
    bytes.fill(65, 0, 100000);
    bytes.fill(66, 100000);
    const expected = 'A'.repeat(100000) + 'B'.repeat(100000);
    expect(binaryToComparableString(bytes)).toBe(expected);
  });
});
