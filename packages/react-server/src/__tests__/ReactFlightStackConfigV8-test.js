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

let parseStackTrace;

describe('ReactFlightStackConfigV8', () => {
  beforeEach(() => {
    jest.resetModules();
    parseStackTrace =
      require('react-server/src/ReactFlightStackConfigV8').parseStackTrace;
  });

  // @gate __DEV__
  it('strips the async prefix from a frame name in an already formatted stack', () => {
    const error = new Error();
    // Assigning the stack means V8 never calls prepareStackTrace, so the
    // parser has to fall back to reading the formatted string.
    error.stack =
      'Error: boom\n' +
      '    at inner (/tmp/app.js:1:44)\n' +
      '    at async outerName (/tmp/app.js:2:30)';

    expect(parseStackTrace(error, 1)).toEqual([
      ['inner', '/tmp/app.js', 1, 44, 0, 0, false],
      ['outerName', '/tmp/app.js', 2, 30, 0, 0, true],
    ]);
  });
});
