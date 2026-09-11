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
let ReactServerDOMStaticServer;
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
    jest.mock('react-server-dom-turbopack/static', () =>
      jest.requireActual('react-server-dom-turbopack/static.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    ReactServerDOMStaticServer = require('react-server-dom-turbopack/static');
    turbopackMap = require('./utils/TurbopackMock').turbopackMap;

    jest.resetModules();
    __unmockReact();
    React = require('react');
    jest.unmock('react-server-dom-turbopack/server');
    jest.unmock('react-server-dom-turbopack/static');
    jest.mock('react-server-dom-turbopack/client', () =>
      jest.requireActual('react-server-dom-turbopack/client.node'),
    );
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
  });

  function decode(stream) {
    return ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
    });
  }

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

  // An abort ends the response with what was written before the cut, and
  // every ledger total resolves to just those writes.
  // @gate enableFlightLedgers
  it('keeps partial values readable after an abort', async () => {
    const Tags = ReactServer.createSetLedger();
    const Dynamic = ReactServer.createBitLedger();
    const Expiry = ReactServer.createMinLedger();

    async function Pending() {
      ReactServer.addToLedger(Tags, 'from-pending');
      ReactServer.addToLedger(Dynamic);
      ReactServer.addToLedger(Expiry, 60);
      await new Promise(() => {});
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Pending />, [
        Tags,
        Dynamic,
        Expiry,
      ]);
      const [tags, dynamic, expiry] = captured.ledgers;
      return {page: captured.data, tags, dynamic, expiry};
    }

    const controller = new AbortController();
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap, {
        signal: controller.signal,
        onError() {},
      }),
    );
    await serverAct(() => controller.abort(new Error('stop')));

    const result = await decode(stream);
    expect(Array.from(await result.tags)).toEqual(['from-pending']);
    expect(await result.dynamic).toBe(true);
    expect(await result.expiry).toBe(60);
  });

  // A capture created after the request began aborting is an ordinary
  // capture: its data ships and its ledger total resolves to the total
  // its subtree produced.
  // @gate enableFlightLedgers
  it('resolves a capture created after the abort began to its total', async () => {
    const Tags = ReactServer.createSetLedger();
    const controller = new AbortController();

    function App() {
      // Captured before the abort.
      const early = ReactServer.captureLedgers('early', [Tags]);
      let late = null;
      return {
        early: early.data,
        earlyTags: early.ledgers[0],
        // Aborted from inside the model, so the capture below is created
        // while the model is still being written.
        get page() {
          controller.abort(new Error('stop'));
          return 'page';
        },
        get late() {
          if (late === null) {
            late = ReactServer.captureLedgers(
              {
                get value() {
                  ReactServer.addToLedger(Tags, 'late');
                  return 'late';
                },
              },
              [Tags],
            );
          }
          return late.data;
        },
        get lateTags() {
          return late.ledgers[0];
        },
      };
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap, {
        signal: controller.signal,
        onError() {},
      }),
    );

    const result = await decode(stream);
    expect(result.page).toBe('page');
    expect((await result.late).value).toBe('late');
    expect(Array.from(await result.earlyTags)).toEqual([]);
    expect(Array.from(await result.lateTags)).toEqual(['late']);
  });

  // A capture created before the abort, rendered inside one created after
  // it: the inner data ships, the inner ledger total is credited its
  // write, and the outer one is shadowed away from it.
  // @gate enableFlightLedgers
  it('attributes a write to a capture created before the abort when it is rendered inside one created after it', async () => {
    const Tags = ReactServer.createSetLedger();
    const controller = new AbortController();
    let inner = null;
    let outer = null;

    const model = {
      get earlyTags() {
        if (inner === null) {
          inner = ReactServer.captureLedgers(
            {
              get value() {
                ReactServer.addToLedger(Tags, 'inside');
                return 'inside';
              },
            },
            [Tags],
          );
        }
        return inner.ledgers[0];
      },
      get page() {
        controller.abort(new Error('stop'));
        return 'page';
      },
      get late() {
        if (outer === null) {
          outer = ReactServer.captureLedgers({nested: inner.data}, [Tags]);
        }
        return outer.data;
      },
      get lateTags() {
        return outer.ledgers[0];
      },
    };

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, turbopackMap, {
        signal: controller.signal,
        onError() {},
      }),
    );

    const result = await decode(stream);
    expect(result.page).toBe('page');
    expect((await result.late).nested.value).toBe('inside');
    expect(Array.from(await result.earlyTags)).toEqual(['inside']);
    expect(Array.from(await result.lateTags)).toEqual([]);
  });

  // A fatal error ends the response by erroring the destination. Whoever
  // holds what arrived decodes it, and a ledger total resolves to the
  // total of the writes that shipped before the failure.
  // @gate enableFlightLedgers
  it('keeps the writes that shipped before a fatal error readable', async () => {
    const Tags = ReactServer.createSetLedger();
    let failNow;
    const failure = new Promise(resolve => {
      failNow = resolve;
    });

    async function Failing() {
      ReactServer.addToLedger(Tags, 'before-fatal');
      await failure;
      throw new Error('boom');
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Failing />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap, {
        onError(error) {
          // A non-string digest turns a task error into a fatal one.
          return error.message === 'boom' ? 42 : 'digest';
        },
      }),
    );

    const readable = new Stream.PassThrough();
    let destroyed = null;
    readable.on('error', error => {
      destroyed = error;
    });
    await serverAct(() => pipe(readable));
    const result = await ReactServerDOMClient.createFromNodeStream(
      readable,
      serverConsumerManifest,
    );
    await serverAct(() => failNow());
    expect(destroyed).not.toBe(null);
    expect(Array.from(await result.tags)).toEqual(['before-fatal']);
  });

  // Losing the connection ends the response for the client. A captured
  // ledger resolves — never rejects — to the total of what arrived.
  // @gate enableFlightLedgers
  it('resolves to the writes received when the connection is lost', async () => {
    const Tags = ReactServer.createSetLedger();

    async function Pending() {
      ReactServer.addToLedger(Tags, 'received');
      await new Promise(() => {});
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Pending />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );

    // Forward what the server has written, then lose the connection without
    // a clean end.
    const reader = stream.getReader();
    let loseConnection;
    const connection = new ReadableStream({
      async start(controller) {
        const {done, value} = await reader.read();
        if (!done) {
          controller.enqueue(value);
        }
        loseConnection = () => {
          controller.error(new Error('connection lost'));
        };
      },
    });

    const result = await decode(connection);
    const tags = result.tags;
    loseConnection();
    expect(Array.from(await tags)).toEqual(['received']);
  });

  // A prerender abort behaves like a render abort: the prelude carries what
  // was written before the cut, and a ledger total resolves to it.
  // @gate enableFlightLedgers
  it('treats a prerender abort like a render abort', async () => {
    const Tags = ReactServer.createSetLedger();

    async function Pending() {
      ReactServer.addToLedger(Tags, 'prerendered');
      await new Promise(() => {});
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Pending />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const controller = new AbortController();
    const pending = serverAct(() =>
      ReactServerDOMStaticServer.prerender(<App />, turbopackMap, {
        signal: controller.signal,
        onError() {},
      }),
    );
    await serverAct(() => controller.abort(new Error('stop prerender')));
    const {prelude} = await pending;

    const result = await decode(prelude);
    expect(Array.from(await result.tags)).toEqual(['prerendered']);
  });

  // Next.js closes a prerender early on purpose and reads the prelude with
  // unstable_allowPartialStream: the ledger totals must settle to what
  // shipped, and the unfinished parts must stay pending rather than error.
  // @gate enableFlightLedgers
  it('resolves ledger totals to the writes received when a partial prelude is decoded with unstable_allowPartialStream', async () => {
    const Tags = ReactServer.createSetLedger();
    const errors = [];

    function Header() {
      ReactServer.addToLedger(Tags, 'header');
      return 'Ada';
    }

    // Writes, then hands out a body that never arrives: the write ships, the
    // body does not.
    function Pending() {
      ReactServer.addToLedger(Tags, 'segment');
      return {body: new Promise(() => {})};
    }

    function Segment() {
      const captured = ReactServer.captureLedgers(<Pending />, [Tags]);
      return {content: captured.data, tags: captured.ledgers[0]};
    }

    function Layout() {
      const captured = ReactServer.captureLedgers(
        {header: <Header />, segment: <Segment />},
        [Tags],
      );
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const controller = new AbortController();
    const pending = serverAct(() =>
      ReactServerDOMStaticServer.prerender(<Layout />, turbopackMap, {
        signal: controller.signal,
        onError(error) {
          errors.push(error);
        },
      }),
    );
    await serverAct(() => controller.abort(new Error('stop prerender')));
    const {prelude} = await pending;

    const result = await ReactServerDOMClient.createFromReadableStream(
      prelude,
      {serverConsumerManifest, unstable_allowPartialStream: true},
    );
    const {header, segment} = result.page;
    expect(header).toBe('Ada');
    let body = null;
    segment.content.body.then(
      value => {
        body = {value};
      },
      reason => {
        body = {reason};
      },
    );

    // A ledger total resolves when the response closes, so awaiting one
    // is waiting for the close. The segment's capture keeps its write out of
    // the layout's.
    expect(Array.from(await result.tags)).toEqual(['header']);
    expect(Array.from(await segment.tags)).toEqual(['segment']);
    // The unfinished body stays pending rather than erroring.
    await serverAct(() => {});
    expect(body).toBe(null);
    // The abort is not reported as an error.
    expect(errors).toEqual([]);
  });

  // Work that outlives the response — a continuation that writes and
  // captures, and a cached fetch still pending — runs without crashing after
  // the close, and nothing it does can change what the response already
  // said.
  // @gate enableFlightLedgers
  it('ignores a write and a capture made after the response closed', async () => {
    const Tags = ReactServer.createSetLedger();
    let release;
    const released = new Promise(resolve => {
      release = resolve;
    });
    let continuation = null;
    let lateCapture = null;
    let pendingFetch = null;

    const getRecommendations = ReactServer.cache(async () => {
      ReactServer.addToLedger(Tags, 'begun');
      await released;
      ReactServer.addToLedger(Tags, 'late');
      return ['a', 'b'];
    });

    function Page() {
      ReactServer.addToLedger(Tags, 'served');
      // Nothing rendered waits for this fetch.
      pendingFetch = getRecommendations();
      // A continuation that lands after the response closed.
      continuation = released.then(() => {
        ReactServer.addToLedger(Tags, 'stale');
        lateCapture = ReactServer.captureLedgers('stale', [Tags]);
      });
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const result = await decode(
      await serverAct(() =>
        ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
      ),
    );
    expect(result.page).toBe('page');
    // The response closed with the fetch still pending.
    expect(Array.from(await result.tags).sort()).toEqual(['begun', 'served']);

    await serverAct(() => release());
    await continuation;
    expect(await pendingFetch).toEqual(['a', 'b']);
    expect(lateCapture.ledgers.length).toBe(1);
    expect(Array.from(await result.tags).sort()).toEqual(['begun', 'served']);
  });

  // A request that writes and reuses values but never captures ships the
  // stock wire: no ledger rows at all, and a model that decodes exactly as an
  // untouched request's would.
  // @gate enableFlightLedgers
  it('ships the stock wire for a request that writes and reuses but never captures', async () => {
    const Tags = ReactServer.createSetLedger();
    const Dynamic = ReactServer.createBitLedger();
    const getUser = ReactServer.cache(() => ({name: 'Ada'}));

    function Header() {
      ReactServer.addToLedger(Tags, 'header');
      return getUser().name;
    }

    const header = <Header />;
    const settings = {theme: 'dark'};

    function App() {
      ReactServer.addToLedger(Tags, 'root');
      ReactServer.addToLedger(Dynamic);
      getUser();
      return {header, again: header, settings, same: settings};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    const reader = stream.getReader();
    let payload = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      payload += Buffer.from(value).toString('utf8');
    }
    // The only place a payload is read as text: no ledger rows shipped.
    expect(payload).not.toMatch(/^[0-9a-f]+:[FKQYZ]/m);

    const result = await decode(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        },
      }),
    );
    expect(result.header).toBe('Ada');
    expect(result.again).toBe(result.header);
    expect(result.settings).toEqual({theme: 'dark'});
    expect(result.same).toBe(result.settings);
  });

  // @gate enableFlightLedgers
  it('preserves ledger totals in a model prefix after repeated backpressure', async () => {
    const Tags = ReactServer.createSetLedger();
    const Categories = ReactServer.createSetLedger();
    const Dynamic = ReactServer.createBitLedger();
    // Each delta exceeds the stream encoder's buffer and forces a write to
    // the destination. A third ledger remains queued after both pauses.
    const tag = 't'.repeat(5000);
    const category = 'c'.repeat(5000);

    let captured;
    const model = {
      get captured() {
        return (captured ??= ReactServer.captureLedgers(
          {
            get page() {
              ReactServer.addToLedger(Tags, tag);
              ReactServer.addToLedger(Categories, category);
              ReactServer.addToLedger(Dynamic);
              return 'page';
            },
          },
          [Tags, Categories, Dynamic],
        ));
      },
    };

    const chunks = [];
    const callbacks = [];
    const destination = new Stream.Writable({
      highWaterMark: 1,
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callbacks.push(callback);
      },
    });
    const finished = new Promise((resolve, reject) => {
      destination.on('finish', resolve);
      destination.on('error', reject);
    });
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, turbopackMap),
    );
    await serverAct(() => pipe(destination));
    while (callbacks.length > 0) {
      await serverAct(() => callbacks.shift()());
    }
    await finished;

    // Stop decoding as soon as the root model is available. Its ledger
    // totals must include all of the writes that produced that model.
    let controller;
    const response = decode(
      new ReadableStream({
        start(c) {
          controller = c;
        },
      }),
    );
    let result = null;
    response.then(value => {
      result = value;
    });
    const lines = Buffer.concat(chunks).toString('utf8').split('\n');
    const encoder = new TextEncoder();
    for (let i = 0; i < lines.length && result === null; i++) {
      controller.enqueue(encoder.encode(lines[i] + '\n'));
      await null;
      await null;
    }
    expect(result).not.toBe(null);
    expect(result.captured.data.page).toBe('page');
    controller.close();
    expect(await result.captured.ledgers[0]).toEqual(new Set([tag]));
    expect(await result.captured.ledgers[1]).toEqual(new Set([category]));
    expect(await result.captured.ledgers[2]).toBe(true);
  });

  // The writes made before a ledger total is rendered precede it in the
  // stream: a prefix that decodes the root already carries them, so the
  // ledger total resolves with them even if nothing else ever arrives.
  // @gate enableFlightLedgers
  it('resolves a ledger total decoded from a prefix with the writes that preceded it', async () => {
    const Tags = ReactServer.createSetLedger();

    function Page() {
      ReactServer.addToLedger(Tags, 'before');
      return 'page';
    }

    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, tags: captured.ledgers[0]};
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, turbopackMap),
    );
    const reader = stream.getReader();
    let payload = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      payload += Buffer.from(value).toString('utf8');
    }
    const lines = payload.split('\n');

    // Feed one line at a time and stop at the first prefix that decodes the
    // root, so nothing after that line can have contributed.
    let controller;
    const decoded = decode(
      new ReadableStream({
        start(c) {
          controller = c;
        },
      }),
    );
    let result = null;
    decoded.then(value => {
      result = value;
    });
    const encoder = new TextEncoder();
    for (let i = 0; i < lines.length && result === null; i++) {
      controller.enqueue(encoder.encode(lines[i] + '\n'));
      await null;
      await null;
    }
    expect(result).not.toBe(null);
    expect(result.page).toBe('page');
    // End the response here: nothing past the line that decoded the root is
    // ever fed.
    controller.close();
    expect(Array.from(await result.tags)).toEqual(['before']);
  });
});
