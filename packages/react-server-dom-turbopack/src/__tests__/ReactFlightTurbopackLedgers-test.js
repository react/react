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

  // @gate enableFlightLedgers
  it('nets several writes into one total', async () => {
    const Mask = ReactServer.createMaskLedger();
    const FIRST = 0b1;
    const SECOND = 0b10;

    function Page() {
      ReactServer.addToLedger(Mask, FIRST);
      ReactServer.addToLedger(Mask, SECOND);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Mask]);
      return {page: captured.data, mask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(await result.mask).toBe(FIRST | SECOND);
  });

  // @gate enableFlightLedgers
  it("keeps a nested capture's writes out of the enclosing one", async () => {
    const Mask = ReactServer.createMaskLedger();
    const SEGMENT = 0b1;
    const LAYOUT = 0b10;

    function Segment() {
      ReactServer.addToLedger(Mask, SEGMENT);
      return 'segment';
    }

    function Layout() {
      ReactServer.addToLedger(Mask, LAYOUT);
      const captured = ReactServer.captureLedgers(<Segment />, [Mask]);
      return {segment: captured.data, segmentMask: captured.ledgers[0]};
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Layout />, [Mask]);
      return {layout: captured.data, layoutMask: captured.ledgers[0]};
    }

    const result = await render(<App />);
    expect(await result.layout.segmentMask).toBe(SEGMENT);
    expect(await result.layoutMask).toBe(LAYOUT);
  });
});
