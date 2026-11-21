/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const {encode} = require('@jridgewell/sourcemap-codec');
const SourceMapConsumer = require('../SourceMapConsumer').default;

describe('IndexedSourceMapConsumer', () => {
  it.each([
    [3, 16, 11],
    [4, 11, 12],
    [5, 11, 13],
  ])(
    'resolves line %s, column %s within a section with a column offset',
    (lineNumber, columnNumber, originalLine) => {
      const consumer = SourceMapConsumer({
        version: 3,
        sections: [
          {
            offset: {line: 2, column: 5},
            map: {
              version: 3,
              sources: ['vendor.js', 'App.js'],
              sourcesContent: ['vendor source', 'app source'],
              names: [],
              ignoreList: [0],
              mappings: encode([
                [
                  [0, 0, 0, 0],
                  [10, 1, 10, 2],
                  [20, 0, 20, 0],
                ],
                [
                  [0, 0, 1, 0],
                  [10, 1, 11, 2],
                  [20, 0, 21, 0],
                ],
                [
                  [0, 0, 2, 0],
                  [10, 1, 12, 2],
                  [20, 0, 22, 0],
                ],
              ]),
            },
          },
        ],
      });

      expect(consumer.originalPositionFor({lineNumber, columnNumber})).toEqual({
        sourceURL: 'App.js',
        sourceContent: 'app source',
        line: originalLine,
        column: 2,
        ignored: false,
      });
    },
  );
});
