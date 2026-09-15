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
import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// The Edge server entry finds its async context through a global
// AsyncLocalStorage; the browser server entry has none, whatever globals
// exist, so this is what separates an Edge runtime with async context from
// the browser server below.
global.AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;

let React;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let serverAct;
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

describe('ReactFlightTurbopackLedgersHosts (edge)', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      jest.requireActual('react-server-dom-turbopack/server.edge'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    turbopackMap = require('./utils/TurbopackMock').turbopackMap;

    jest.resetModules();
    __unmockReact();
    React = require('react');
    jest.unmock('react-server-dom-turbopack/server');
    ReactServerDOMClient = require('react-server-dom-turbopack/client.edge');
  });

  // @gate enableFlightLedgers
  it('serves captureLedgers on the Edge server entry with no setup', async () => {
    const Tags = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Tags, 'page');
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(result.page).toBe('page');
    expect(Array.from(await result.tags)).toEqual(['page']);
  });
});

describe('ReactFlightTurbopackLedgersHosts (browser)', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    // The browser stream config opens a MessageChannel at module scope, which
    // would otherwise keep the test process alive after the run.
    patchMessageChannel();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      jest.requireActual('react-server-dom-turbopack/server.browser'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    turbopackMap = require('./utils/TurbopackMock').turbopackMap;

    jest.resetModules();
    __unmockReact();
    React = require('react');
    jest.unmock('react-server-dom-turbopack/server');
    ReactServerDOMClient = require('react-server-dom-turbopack/client.edge');
  });

  // Not gated: an ordinary render is unaffected in every release channel,
  // including one where the feature is compiled out.
  it('renders normally on an unsupported host', async () => {
    function App() {
      return 'page';
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(result).toBe('page');
  });

  // Nothing can take delivery of a write on a host without an async
  // context, so a write there is a silent no-op and the render is ordinary.
  // @gate enableFlightLedgers
  it('treats addToLedger as a silent no-op on an unsupported host', async () => {
    const Tags = ReactServer.createSetLedger();

    function App() {
      ReactServer.addToLedger(Tags, 'dropped');
      return 'page';
    }

    const errors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap, {
        onError(error) {
          errors.push(error.message);
        },
      }),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
    expect(errors).toEqual([]);
    expect(result).toBe('page');
  });

  // A capture cannot exist without the async context, so `captureLedgers`
  // names the fix instead of returning ledger totals that could never
  // resolve.
  // @gate enableFlightLedgers
  it('throws from captureLedgers during a render on an unsupported host', async () => {
    const Tags = ReactServer.createSetLedger();

    function Page() {
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return captured.data;
    }

    const errors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap, {
        onError(error) {
          errors.push(error.message);
        },
      }),
    );
    await expect(
      ReactServerDOMClient.createFromReadableStream(stream, {
        serverConsumerManifest,
      }),
    ).rejects.toThrow();
    expect(errors).toEqual([
      'Cannot capture ledgers in captureLedgers() because this ' +
        'Flight renderer has no async context. Render with a Node or ' +
        'Edge Server Components entry point.',
    ]);
  });
});
