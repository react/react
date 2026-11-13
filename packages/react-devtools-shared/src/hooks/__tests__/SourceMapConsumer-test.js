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

describe('SourceMapConsumer', () => {
  function createConsumer(mappings) {
    return SourceMapConsumer({
      version: 3,
      sources: ['vendor.js', 'App.js'],
      sourcesContent: ['vendor source', 'app source'],
      names: [],
      ignoreList: [0],
      mappings: encode([mappings]),
    });
  }

  it.each([11, 12, 100])(
    'resolves the last mapping on a line at column %s',
    columnNumber => {
      const consumer = createConsumer([
        [0, 0, 0, 0],
        [10, 1, 4, 2],
      ]);
      expect(
        consumer.originalPositionFor({lineNumber: 1, columnNumber}),
      ).toEqual({
        sourceURL: 'App.js',
        sourceContent: 'app source',
        line: 5,
        column: 2,
        ignored: false,
      });
    },
  );

  it('uses the preceding mapping between generated columns', () => {
    const consumer = createConsumer([
      [0, 0, 0, 0],
      [10, 1, 4, 2],
      [20, 0, 8, 0],
    ]);
    expect(
      consumer.originalPositionFor({lineNumber: 1, columnNumber: 16}),
    ).toMatchObject({sourceURL: 'App.js', line: 5, column: 2});
  });

  it('uses the first mapping when generated columns are repeated', () => {
    const consumer = createConsumer([
      [0, 0, 0, 0],
      [10, 1, 4, 2],
      [10, 0, 5, 0],
      [10, 0, 6, 0],
      [20, 0, 8, 0],
    ]);
    expect(
      consumer.originalPositionFor({lineNumber: 1, columnNumber: 11}),
    ).toMatchObject({sourceURL: 'App.js', line: 5, column: 2, ignored: false});
  });
});
