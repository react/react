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
    binaryToComparableString = require('shared/binaryToComparableString')
      .default;
  });

  it('returns an empty string for an empty view', () => {
    expect(binaryToComparableString(new Uint8Array(0))).toBe('');
  });

  it('preserves every byte in the resulting string', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i;
    }
    const result = binaryToComparableString(bytes);
    expect(result.length).toBe(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      expect(result.charCodeAt(i)).toBe(bytes[i]);
    }
  });

  it('produces equal strings for equal bytes and different strings otherwise', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    expect(binaryToComparableString(a)).toBe(binaryToComparableString(b));
    expect(binaryToComparableString(a)).not.toBe(binaryToComparableString(c));
  });

  it('respects byteOffset and byteLength of the view', () => {
    const buffer = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
    const view = new Uint8Array(buffer, 2, 3);
    const result = binaryToComparableString(view);
    expect(result).toBe(String.fromCharCode(2, 3, 4));
  });

  it('does not throw for large buffers that exceed the argument limit', () => {
    // A single String.fromCharCode.apply call with this many arguments throws a
    // RangeError in most engines. The chunked implementation must not.
    const bytes = new Uint8Array(300000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 256;
    }
    let result;
    expect(() => {
      result = binaryToComparableString(bytes);
    }).not.toThrow();
    expect(result.length).toBe(bytes.length);
    expect(result.charCodeAt(0)).toBe(0);
    expect(result.charCodeAt(bytes.length - 1)).toBe((bytes.length - 1) % 256);
  });
});
