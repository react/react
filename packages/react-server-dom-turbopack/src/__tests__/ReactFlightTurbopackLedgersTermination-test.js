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

import Stream from 'stream';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let React;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let serverAct;
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

describe('ReactFlightTurbopackLedgersTermination', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Load the server entry point for the producer and the client entry point
    // for the consumer.
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      jest.requireActual('react-server-dom-turbopack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    turbopackMap = require('./utils/TurbopackMock').turbopackMap;

    jest.resetModules();
    __unmockReact();
    React = require('react');
    jest.unmock('react-server-dom-turbopack/server');
    jest.mock('react-server-dom-turbopack/client', () =>
      jest.requireActual('react-server-dom-turbopack/client.node'),
    );
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
  });

  // @gate enableFlightLedgers
  it('reads full values on a clean close', async () => {
    const Mask = ReactServer.createMaskLedger();
    const PAGE = 0b1;
    const ROOT = 0b10;

    function Page() {
      ReactServer.addToLedger(Mask, PAGE);
      return 'page';
    }

    function App() {
      ReactServer.addToLedger(Mask, ROOT);
      const captured = ReactServer.captureLedgers(<Page />, [Mask]);
      return {page: captured.data, mask: captured.ledgers[0]};
    }

    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap),
    );
    const readable = new Stream.PassThrough();
    pipe(readable);
    const result = await ReactServerDOMClient.createFromNodeStream(
      readable,
      serverConsumerManifest,
    );
    expect(result.page).toBe('page');
    expect(await result.mask).toBe(PAGE);
  });
});
