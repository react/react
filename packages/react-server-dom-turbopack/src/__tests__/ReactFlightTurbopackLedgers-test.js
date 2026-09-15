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

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let React;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let serverAct;
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

describe('ReactFlightTurbopackLedgers', () => {
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

  async function render(model) {
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, turbopackMap),
    );
    return await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
  }

  // @gate enableFlightLedgers
  it('throws when captureLedgers is called outside a Flight render', () => {
    expect(() =>
      ReactServer.captureLedgers('value', [ReactServer.createMaskLedger()]),
    ).toThrow(
      'captureLedgers() can only be called in a Server Components environment.',
    );
  });

  // @gate enableFlightLedgers
  it('throws when a ledger total is read on the server', async () => {
    const Dynamic = ReactServer.createMaskLedger();
    const attempts = [];

    function Page() {
      return 'page';
    }

    async function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Dynamic]);
      const dynamic = captured.ledgers[0];
      try {
        dynamic.then(() => {});
        attempts.push('no-throw');
      } catch (error) {
        attempts.push(error.message);
      }
      try {
        await dynamic;
        attempts.push('no-throw');
      } catch (error) {
        attempts.push(error.message);
      }
      return captured.data;
    }

    expect(await render(<App />)).toBe('page');
    expect(attempts).toEqual([
      'A ledger total cannot be read in a Server Components environment. ' +
        'Pass it to the client, where it resolves after the response has ' +
        'finished streaming.',
      'A ledger total cannot be read in a Server Components environment. ' +
        'Pass it to the client, where it resolves after the response has ' +
        'finished streaming.',
    ]);
  });
});
