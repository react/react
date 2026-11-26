/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let binaryToComparableString;

describe('binaryToComparableString', () => {
  beforeEach(() => {
    binaryToComparableString =
      require('shared/binaryToComparableString').default;
  });

  it('converts the bytes of a view', () => {
    const view = new Uint8Array([0, 65, 255]);
    expect(binaryToComparableString(view)).toBe('\u0000Aÿ');
  });

  it('respects the byteOffset and byteLength of a view', () => {
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
    expect(binaryToComparableString(new Uint8Array(buffer, 1, 2))).toBe(
      '\u0002\u0003',
    );
  });

  it('converts views larger than the engine argument limit', () => {
    const view = new Uint8Array(256 * 1024);
    view.fill(65);
    view[0] = 0;
    // Mark positions around chunk boundaries so seams can't drop bytes.
    view[8191] = 1;
    view[8192] = 2;
    view[16383] = 3;
    view[16384] = 4;
    view[view.length - 1] = 255;

    const result = binaryToComparableString(view);

    expect(result.length).toBe(view.length);
    expect(result.charCodeAt(0)).toBe(0);
    expect(result.charCodeAt(1)).toBe(65);
    expect(result.charCodeAt(8191)).toBe(1);
    expect(result.charCodeAt(8192)).toBe(2);
    expect(result.charCodeAt(16383)).toBe(3);
    expect(result.charCodeAt(16384)).toBe(4);
    expect(result.charCodeAt(view.length - 1)).toBe(255);
    // Chunking must not change the resulting string.
    expect(result).toBe(binaryToComparableString(view.slice()));
  });
});
