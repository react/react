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

// let serverExports;
let assertConsoleErrorDev;
let turbopackServerMap;
let ReactServerDOMServer;
let ReactServerDOMClient;
let ReactServerScheduler;

describe('ReactFlightTurbopackDOMReply', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactServerScheduler = require('scheduler');
    patchMessageChannel(ReactServerScheduler);

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.browser'),
    );
    const TurbopackMock = require('./utils/TurbopackMock');
    // serverExports = TurbopackMock.serverExports;
    turbopackServerMap = TurbopackMock.turbopackServerMap;
    ReactServerDOMServer = require('react-server-dom-turbopack/server.browser');
    jest.resetModules();
    ReactServerDOMClient = require('react-server-dom-turbopack/client');

    const InternalTestUtils = require('internal-test-utils');
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  it('can encode a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply({some: 'object'});
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );

    expect(decoded).toEqual({some: 'object'});
  });

  it('warns with a tailored message if eval is not available in dev', async () => {
    // eslint-disable-next-line no-eval
    const previousEval = globalThis.eval.bind(globalThis);
    // eslint-disable-next-line no-eval
    globalThis.eval = () => {
      throw new Error('eval is disabled');
    };

    try {
      const body = await ReactServerDOMClient.encodeReply({some: 'object'});
      assertConsoleErrorDev([
        'eval() is not supported in this environment. ' +
          'If this page was served with a `Content-Security-Policy` header, ' +
          'make sure that `unsafe-eval` is included. ' +
          'React requires eval() in development mode for various debugging features ' +
          'like reconstructing callstacks from a different environment.\n' +
          'React will never use eval() in production mode',
      ]);

      await ReactServerDOMServer.decodeReply(body, turbopackServerMap);

      assertConsoleErrorDev([]);
    } finally {
      // eslint-disable-next-line no-eval
      globalThis.eval = previousEval;
    }
  });
});
