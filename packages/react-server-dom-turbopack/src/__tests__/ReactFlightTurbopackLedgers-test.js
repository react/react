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
      ReactServer.captureLedgers('value', [ReactServer.createBitLedger()]),
    ).toThrow(
      'captureLedgers() can only be called in a Server Components environment.',
    );
  });

  // @gate enableFlightLedgers
  it('throws when a ledger total is read on the server', async () => {
    const Dynamic = ReactServer.createBitLedger();
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
  it('throws when a set entry is not a primitive', async () => {
    const Tags = ReactServer.createSetLedger();
    expect(() => ReactServer.addToLedger(Tags, {foo: 'bar'})).toThrow(
      'Only a primitive can be added to a set ledger.',
    );
    expect(() => ReactServer.addToLedger(Tags, ['tag'])).toThrow(
      'Only a primitive can be added to a set ledger.',
    );
    expect(() => ReactServer.addToLedger(Tags, () => 'tag')).toThrow(
      'Only a primitive can be added to a set ledger.',
    );

    const Dynamic = ReactServer.createBitLedger();
    let dynamic;
    function App() {
      const captured = ReactServer.captureLedgers('page', [Dynamic]);
      dynamic = captured.ledgers[0];
      return captured.data;
    }
    expect(await render(<App />)).toBe('page');
    expect(() => ReactServer.addToLedger(Tags, dynamic)).toThrow(
      'Only a primitive can be added to a set ledger.',
    );
  });

  // @gate enableFlightLedgers
  it('throws when a set entry is a symbol that is not registered', () => {
    const Tags = ReactServer.createSetLedger();
    expect(() => ReactServer.addToLedger(Tags, Symbol('local'))).toThrow(
      'Only a global symbol received from Symbol.for(...) can be added to ' +
        'a set ledger.',
    );
  });

  // @gate enableFlightLedgers
  it('resolves several declared ledgers positionally and independently', async () => {
    const Tags = ReactServer.createSetLedger();
    const Dynamic = ReactServer.createBitLedger();
    const Expiry = ReactServer.createMinLedger();
    const Priority = ReactServer.createMaxLedger();
    const Locales = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Tags, 'a');
      ReactServer.addToLedger(Dynamic);
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [
        Tags,
        Dynamic,
        Expiry,
        Priority,
        Locales,
      ]);
      const [tags, dynamic, expiry, priority, locales] = captured.ledgers;
      return {page: captured.data, tags, dynamic, expiry, priority, locales};
    }

    const result = await render(<App />);
    expect(result.page).toBe('page');
    expect(Array.from(await result.tags)).toEqual(['a']);
    expect(await result.dynamic).toBe(true);
    // Nothing wrote to these three.
    expect(await result.expiry).toBe(undefined);
    expect(await result.priority).toBe(undefined);
    expect(Array.from(await result.locales)).toEqual([]);
  });

  // @gate enableFlightLedgers
  it('round-trips every kind', async () => {
    const Dynamic = ReactServer.createBitLedger();
    const Mask = ReactServer.createMaskLedger();
    const Expiry = ReactServer.createMinLedger();
    const Priority = ReactServer.createMaxLedger();
    const Tags = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Dynamic);
      ReactServer.addToLedger(Mask, 0x80000001);
      ReactServer.addToLedger(Expiry, 10);
      ReactServer.addToLedger(Expiry, 5);
      ReactServer.addToLedger(Priority, -10);
      ReactServer.addToLedger(Priority, 2);
      ReactServer.addToLedger(Tags, undefined);
      ReactServer.addToLedger(Tags, NaN);
      ReactServer.addToLedger(Tags, -0);
      ReactServer.addToLedger(Tags, 0);
      ReactServer.addToLedger(Tags, 12n);
      ReactServer.addToLedger(Tags, Symbol.for('global'));
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [
        Dynamic,
        Mask,
        Expiry,
        Priority,
        Tags,
      ]);
      return {page: captured.data, ledgers: captured.ledgers};
    }

    const result = await render(<App />);
    expect(result.page).toBe('page');
    const [dynamic, mask, expiry, priority, tags] = result.ledgers;
    expect(await dynamic).toBe(true);
    expect(await mask).toBe(0x80000001);
    expect(await expiry).toBe(5);
    expect(await priority).toBe(2);
    // Check membership because Set ledger iteration order is unspecified.
    // The writes of -0 and 0 must produce a single entry.
    const entries = Array.from(await tags);
    expect(entries.length).toBe(5);
    expect(entries).toContain(undefined);
    expect(
      entries.some(entry => typeof entry === 'number' && isNaN(entry)),
    ).toBe(true);
    expect(entries.some(entry => Object.is(entry, 0))).toBe(true);
    expect(entries.some(entry => entry === 12n)).toBe(true);
    expect(entries).toContain(Symbol.for('global'));
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
