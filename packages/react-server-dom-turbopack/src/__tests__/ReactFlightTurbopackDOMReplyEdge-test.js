/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

let turbopackServerMap;
let ReactServerDOMServer;
let ReactServerDOMClient;

describe('ReactFlightDOMTurbopackReply', () => {
  beforeEach(() => {
    jest.resetModules();
    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.edge'),
    );
    const TurbopackMock = require('./utils/TurbopackMock');
    turbopackServerMap = TurbopackMock.turbopackServerMap;
    ReactServerDOMServer = require('react-server-dom-turbopack/server.edge');
    jest.resetModules();
    ReactServerDOMClient = require('react-server-dom-turbopack/client.edge');
  });

  it('can encode a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply({some: 'object'});
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );

    expect(decoded).toEqual({some: 'object'});
  });
});
