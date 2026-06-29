/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let byteLengthOfChunk;

describe('ReactServerStreamConfigNode', () => {
  beforeEach(() => {
    jest.resetModules();
    byteLengthOfChunk = require('../ReactServerStreamConfigNode')
      .byteLengthOfChunk;
  });

  // byteSize is used for heuristic decisions (outlining threshold, progressive
  // chunk sizing), so it must report true UTF-8 byte length. A `.length` fast
  // path is unsound: it undercounts multi-byte content and can push a boundary
  // that is really >500 bytes under the outlining threshold.
  it('reports UTF-8 byte length, not code unit count, for multi-byte chunks', () => {
    const multiByte = '日本語'; // 3 chars, 9 UTF-8 bytes
    expect(multiByte.length).toBe(3);
    expect(byteLengthOfChunk(multiByte)).toBe(9);
    expect(byteLengthOfChunk(multiByte)).toBe(Buffer.byteLength(multiByte));
  });

  it('matches byte length for ASCII chunks', () => {
    const ascii = 'class="x" id="y"';
    expect(byteLengthOfChunk(ascii)).toBe(ascii.length);
    expect(byteLengthOfChunk(ascii)).toBe(Buffer.byteLength(ascii));
  });

  it('counts surrogate pairs as their UTF-8 byte length', () => {
    const emoji = '😀'; // length 2, 4 UTF-8 bytes
    expect(emoji.length).toBe(2);
    expect(byteLengthOfChunk(emoji)).toBe(4);
  });
});
