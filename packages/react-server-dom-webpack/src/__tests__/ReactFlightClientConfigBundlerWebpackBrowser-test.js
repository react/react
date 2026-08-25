/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactFlightClientConfigBundlerWebpackBrowser', () => {
  let addChunkDebugInfo;

  beforeEach(() => {
    jest.resetModules();
    const webpackRequire = function (id) {
      throw new Error('Unexpectedly required module ' + id);
    };
    webpackRequire.u = function (chunkId) {
      return 'https://example.com/chunks/' + chunkId + '.js';
    };
    global.__webpack_require__ = webpackRequire;
  });

  afterEach(() => {
    delete global.__webpack_require__;
    delete global.__webpack_get_script_filename__;
  });

  function requireModule() {
    ({
      addChunkDebugInfo,
    } = require('../client/ReactFlightClientConfigBundlerWebpackBrowser'));
  }

  // @gate __DEV__
  it('falls back to __webpack_require__.u when __webpack_get_script_filename__ is not defined (e.g. Metro)', () => {
    // Real Webpack compiles calls to __webpack_get_script_filename__ into a
    // reference to __webpack_require__.u. Bundlers that only emulate the
    // classic Webpack runtime (e.g. Metro) implement __webpack_require__.u
    // but don't define this newer global at all, so referencing it must not
    // throw a ReferenceError.
    delete global.__webpack_get_script_filename__;
    requireModule();

    const debugInfo = [];
    expect(() => {
      addChunkDebugInfo(debugInfo, 'chunk-1', 'chunk-1.js');
    }).not.toThrow();

    expect(debugInfo.length).toBe(1);
    expect(debugInfo[0].awaited.value.value).toEqual({
      chunkId: 'chunk-1',
      href: 'https://example.com/chunks/chunk-1.js',
    });
  });

  // @gate __DEV__
  it('still uses __webpack_get_script_filename__ when a real Webpack runtime provides it', () => {
    global.__webpack_get_script_filename__ = function (chunkId) {
      return 'https://cdn.example.com/' + chunkId + '.js';
    };
    requireModule();

    const debugInfo = [];
    addChunkDebugInfo(debugInfo, 'chunk-1', 'chunk-1.js');

    expect(debugInfo[0].awaited.value.value).toEqual({
      chunkId: 'chunk-1',
      href: 'https://cdn.example.com/chunk-1.js',
    });
  });
});
