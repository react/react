/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

describe('ReactFlight with a non-writable Promise.prototype.then', () => {
  let originalThen;

  beforeEach(() => {
    jest.resetModules();
    originalThen = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    // eslint-disable-next-line no-extend-native
    Object.defineProperty(Promise.prototype, 'then', {
      ...originalThen,
      writable: false,
    });
  });

  afterEach(() => {
    // eslint-disable-next-line no-extend-native
    Object.defineProperty(Promise.prototype, 'then', originalThen);
  });

  it('can require Server and Client entrypoints', () => {
    patchMessageChannel(require('scheduler'));
    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.browser'),
    );
    require('./utils/WebpackMock');
    const ReactServerDOMServer = require('react-server-dom-webpack/server');
    expect(typeof ReactServerDOMServer.decodeReply).toBe('function');

    __unmockReact();
    jest.resetModules();
    const ReactServerDOMClient = require('react-server-dom-webpack/client');
    expect(typeof ReactServerDOMClient.createFromReadableStream).toBe(
      'function',
    );
  });
});
