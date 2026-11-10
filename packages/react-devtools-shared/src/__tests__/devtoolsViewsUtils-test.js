/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('devtools/views/utils', () => {
  let alphaSortEntries;

  beforeEach(() => {
    alphaSortEntries =
      require('react-devtools-shared/src/devtools/views/utils').alphaSortEntries;
  });

  describe('alphaSortEntries', () => {
    it('should sort numeric keys numerically and before non-numeric keys', () => {
      const entries: Array<[string, mixed]> = [
        ['2', null],
        ['foo', null],
        ['10', null],
        ['1', null],
      ];
      entries.sort(alphaSortEntries);
      expect(entries.map(entry => entry[0])).toEqual(['1', '2', '10', 'foo']);
    });

    it('should sort numeric keys before non-numeric keys that start with punctuation', () => {
      // '$' (char code 36) and '#' (35) are less than '0' (48), so comparing a
      // punctuation-prefixed key against a numeric key must not fall back to a
      // plain string comparison; numeric keys always sort first.
      const entries: Array<[string, mixed]> = [
        ['$ref', null],
        ['0', null],
        ['#id', null],
      ];
      entries.sort(alphaSortEntries);
      expect(entries.map(entry => entry[0])).toEqual(['0', '#id', '$ref']);
    });

    it('should be antisymmetric for numeric and non-numeric keys', () => {
      const numeric: [string, mixed] = ['5', null];
      const nonNumeric: [string, mixed] = ['$ref', null];
      expect(alphaSortEntries(numeric, nonNumeric)).toBe(
        -alphaSortEntries(nonNumeric, numeric),
      );
    });
  });
});
