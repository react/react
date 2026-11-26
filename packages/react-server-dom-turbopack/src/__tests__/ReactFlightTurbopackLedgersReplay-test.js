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
let ReactServerDOMConsumer;
let ReactServerDOMClient;
let serverAct;
let assertConsoleErrorDev;
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

describe('ReactFlightTurbopackLedgersReplay', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    // The producer and the consuming server share one React, like a server
    // that decodes a response it or another server rendered.
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      jest.requireActual('react-server-dom-turbopack/server.node'),
    );
    jest.mock('react-server-dom-turbopack/client', () =>
      jest.requireActual('react-server-dom-turbopack/client.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    ReactServerDOMConsumer = require('react-server-dom-turbopack/client');
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

  function renderToStream(model) {
    return serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, turbopackMap),
    );
  }

  function decodeOnServer(stream, options) {
    return ReactServerDOMConsumer.createFromReadableStream(stream, {
      serverConsumerManifest,
      ...options,
    });
  }

  function decodeInBrowser(stream, options) {
    return ReactServerDOMClient.createFromReadableStream(stream, {
      serverConsumerManifest,
      ...options,
    });
  }

  function streamFrom(bytes) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(bytes));
        controller.close();
      },
    });
  }

  function createCollector() {
    const chunks = [];
    const destination = new Stream.Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    const finished = new Promise((resolve, reject) => {
      destination.on('finish', resolve);
      destination.on('error', reject);
    });
    return {
      destination,
      finished,
      take() {
        const bytes = Buffer.concat(chunks);
        chunks.length = 0;
        return bytes;
      },
    };
  }

  async function renderInStages(model, openGate) {
    const collector = createCollector();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, turbopackMap),
    );
    await serverAct(() => pipe(collector.destination));
    const firstStage = collector.take();
    await serverAct(() => openGate());
    await collector.finished;
    const secondStage = collector.take();
    return {firstStage, secondStage};
  }

  // Split at an output flush boundary, then decode that prefix as a partial
  // response and the full output as a completed response.
  async function reencodeInStages(firstStage, secondStage) {
    let controller;
    const source = new ReadableStream({
      start(c) {
        controller = c;
      },
    });
    async function App() {
      return await decodeOnServer(source);
    }
    const collector = createCollector();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap),
    );
    await serverAct(() => pipe(collector.destination));
    await serverAct(() => controller.enqueue(firstStage));
    const prefix = collector.take();
    await serverAct(() => {
      controller.enqueue(secondStage);
      controller.close();
    });
    await collector.finished;
    return {
      prefix: await decodeInBrowser(streamFrom(prefix), {
        unstable_allowPartialStream: true,
      }),
      complete: await decodeInBrowser(
        streamFrom(Buffer.concat([prefix, collector.take()])),
      ),
    };
  }

  // @gate enableFlightLedgers
  it('forwards partial and final values of every kind through Node Web Streams', async () => {
    const ledgers = [
      ReactServer.createBitLedger(),
      ReactServer.createMaskLedger(),
      ReactServer.createMinLedger(),
      ReactServer.createMaxLedger(),
      ReactServer.createSetLedger(),
    ];
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    function Page() {
      ReactServer.addToLedger(ledgers[1], 1);
      ReactServer.addToLedger(ledgers[2], 60);
      ReactServer.addToLedger(ledgers[3], 10);
      ReactServer.addToLedger(ledgers[4], 'shell');
      return (
        <div>
          {gate.then(() => {
            ReactServer.addToLedger(ledgers[0]);
            ReactServer.addToLedger(ledgers[1], 2);
            ReactServer.addToLedger(ledgers[2], 10);
            ReactServer.addToLedger(ledgers[3], 40);
            ReactServer.addToLedger(ledgers[4], 'late');
            return 'done';
          })}
        </div>
      );
    }
    function App() {
      return {
        page: ReactServer.captureLedgers(<Page />, ledgers),
        empty: ReactServer.captureLedgers(null, ledgers),
      };
    }
    const source = ReactServerDOMConsumer.createFromReadableStream(
      await renderToStream(<App />),
      {
        serverConsumerManifest,
      },
    );
    async function Replay() {
      return await source;
    }
    const output = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Replay />, turbopackMap),
    );
    const reader = output.getReader();
    const chunks = [];
    async function collect() {
      while (true) {
        const {done, value} = await reader.read();
        if (done) return;
        chunks.push(Buffer.from(value));
      }
    }
    const finished = collect();
    await serverAct(() => {});
    const prefix = Buffer.concat(chunks);
    await serverAct(() => openGate());
    await finished;
    const shell = await decodeInBrowser(streamFrom(prefix), {
      unstable_allowPartialStream: true,
    });
    const complete = await decodeInBrowser(streamFrom(Buffer.concat(chunks)));
    expect(await Promise.all(shell.page.ledgers)).toEqual([
      false,
      1,
      60,
      10,
      new Set(['shell']),
    ]);
    const expected = [true, 3, 10, 40, new Set(['shell', 'late'])];
    expect(await Promise.all(complete.page.ledgers)).toEqual(expected);
    expect(await Promise.all((await source).page.ledgers)).toEqual(expected);
    expect(await Promise.all(complete.empty.ledgers)).toEqual([
      false,
      0,
      undefined,
      undefined,
      new Set(),
    ]);
    expect(await complete.page.data.props.children).toBe('done');
  });

  // @gate enableFlightLedgers
  it('preserves shadowing when a nested capture arrives after the first poll', async () => {
    const Tags = ReactServer.createSetLedger();
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    function Nested() {
      ReactServer.addToLedger(Tags, 'nested');
      return 'nested';
    }
    function Page() {
      ReactServer.addToLedger(Tags, 'shell');
      return {
        rest: gate.then(() => {
          ReactServer.addToLedger(Tags, 'rest');
          return ReactServer.captureLedgers(<Nested />, [Tags]);
        }),
      };
    }
    function App() {
      return ReactServer.captureLedgers(<Page />, [Tags]);
    }
    const {firstStage, secondStage} = await renderInStages(<App />, openGate);
    const {prefix, complete} = await reencodeInStages(firstStage, secondStage);
    expect(await prefix.ledgers[0]).toEqual(new Set(['shell']));
    expect(await complete.ledgers[0]).toEqual(new Set(['shell', 'rest']));
    const nested = await complete.data.rest;
    expect(await nested.ledgers[0]).toEqual(new Set(['nested']));
    expect(nested.data).toBe('nested');
  });

  // @gate enableFlightLedgers
  it('preserves finalized tokens and their values across later flushes', async () => {
    const Tags = ReactServer.createSetLedger();
    function Page() {
      ReactServer.addToLedger(Tags, 'page');
      return 'page';
    }
    function App() {
      return ReactServer.captureLedgers(<Page />, [Tags]);
    }
    const source = await decodeOnServer(await renderToStream(<App />));
    const exposed = await source.ledgers[0];
    exposed.clear();
    exposed.add('consumer');
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    function Tokens() {
      return {first: source.ledgers[0], second: source.ledgers[0]};
    }
    // Forward only the tokens. The source data is deliberately omitted.
    const {firstStage, secondStage} = await renderInStages(
      {
        tokens: <Tokens />,
        later: gate.then(() => ({token: source.ledgers[0]})),
      },
      openGate,
    );
    const result = await decodeInBrowser(
      streamFrom(Buffer.concat([firstStage, secondStage])),
    );
    expect(await result.tokens.first).toEqual(new Set(['page']));
    expect(result.tokens.second).toBe(result.tokens.first);
    expect((await result.later).token).toBe(result.tokens.first);
    expect(await source.ledgers[0]).toEqual(new Set(['consumer']));
  });

  // @gate enableFlightLedgers
  it('keeps forwarded totals separate from a new capture using the same Ledger', async () => {
    const StaleTime = ReactServer.createMinLedger();
    function Page() {
      ReactServer.addToLedger(StaleTime, 10);
      return 'page';
    }
    function App() {
      return ReactServer.captureLedgers(<Page />, [StaleTime]);
    }
    function Native() {
      ReactServer.addToLedger(StaleTime, 20);
      return 'native';
    }
    const input = await renderToStream(<App />);
    async function Replay() {
      const source = await decodeOnServer(input);
      return ReactServer.captureLedgers({source, native: <Native />}, [
        StaleTime,
      ]);
    }
    const result = await decodeInBrowser(await renderToStream(<Replay />));
    expect(await result.ledgers[0]).toBe(20);
    expect(await result.data.source.ledgers[0]).toBe(10);
    expect(result.data.source.data).toBe('page');
  });

  // @gate enableFlightLedgers
  it('discovers a capture occurrence after forwarding an empty total', async () => {
    const Tags = ReactServer.createSetLedger();
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    function Page() {
      ReactServer.addToLedger(Tags, 'late');
      return 'page';
    }
    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {tags: captured.ledgers[0], data: gate.then(() => captured.data)};
    }
    const {firstStage, secondStage} = await renderInStages(<App />, openGate);
    const {prefix, complete} = await reencodeInStages(firstStage, secondStage);
    expect(await prefix.tags).toEqual(new Set());
    expect(await complete.tags).toEqual(new Set(['late']));
  });

  // @gate enableFlightLedgers
  it('updates both captures when a referenced cache entry is declared later', async () => {
    const Tags = ReactServer.createSetLedger();
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    const getShared = ReactServer.cache(async () => {
      await gate;
      ReactServer.addToLedger(Tags, 'shared');
      return 'shared';
    });
    function Section({tag}) {
      ReactServer.addToLedger(Tags, tag);
      return <div>{getShared()}</div>;
    }
    function App() {
      return {
        a: ReactServer.captureLedgers(<Section tag="a" />, [Tags]),
        b: ReactServer.captureLedgers(<Section tag="b" />, [Tags]),
      };
    }
    const {firstStage, secondStage} = await renderInStages(<App />, openGate);
    const {prefix, complete} = await reencodeInStages(firstStage, secondStage);
    if (!ArrayBuffer.prototype.hasOwnProperty('detached')) {
      // The re-encoded debug info includes a payload chunk large enough to be
      // copied in environments that can't check for detached buffers later.
      assertConsoleErrorDev([
        'React copied a partial view into a fresh buffer as a safety precaution ' +
          'because the environment does not implement ArrayBuffer.prototype.detached. ' +
          'This negatively impacts performance. ' +
          'Please upgrade to a modern Node.js version.',
      ]);
    }
    expect(await prefix.a.ledgers[0]).toEqual(new Set(['a']));
    expect(await prefix.b.ledgers[0]).toEqual(new Set(['b']));
    expect(await complete.a.ledgers[0]).toEqual(new Set(['a', 'shared']));
    expect(await complete.b.ledgers[0]).toEqual(new Set(['b', 'shared']));
  });

  // @gate enableFlightLedgers
  it('discovers completed cache work through a later reference', async () => {
    const Tags = ReactServer.createSetLedger();
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    const getShared = ReactServer.cache(() => {
      ReactServer.addToLedger(Tags, 'shared');
      return {value: 'shared'};
    });
    function Early() {
      return getShared();
    }
    async function Late() {
      ReactServer.addToLedger(Tags, 'shell');
      await gate;
      return getShared();
    }
    function App() {
      return {
        early: <Early />,
        late: ReactServer.captureLedgers(<Late />, [Tags]),
      };
    }
    const {firstStage, secondStage} = await renderInStages(<App />, openGate);
    const {prefix, complete} = await reencodeInStages(firstStage, secondStage);
    expect(await prefix.late.ledgers[0]).toEqual(new Set(['shell']));
    expect(await complete.late.ledgers[0]).toEqual(
      new Set(['shell', 'shared']),
    );
  });

  // @gate enableFlightLedgers
  it('lets destinations skip intermediate updates and read the same final total', async () => {
    const StaleTime = ReactServer.createMinLedger();
    let openFirst;
    let openSecond;
    const first = new Promise(resolve => {
      openFirst = resolve;
    });
    const second = new Promise(resolve => {
      openSecond = resolve;
    });
    function Page() {
      ReactServer.addToLedger(StaleTime, 60);
      return first.then(() => {
        ReactServer.addToLedger(StaleTime, 30);
        return second.then(() => {
          ReactServer.addToLedger(StaleTime, 10);
          return 'done';
        });
      });
    }
    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [StaleTime]);
      return {total: captured.ledgers[0], data: captured.data, first, second};
    }
    const source = await decodeOnServer(await renderToStream(<App />));
    let advanceFast;
    let finishFast;
    let finishSlow;
    const tick = new Promise(resolve => {
      advanceFast = resolve;
    });
    const fastDone = new Promise(resolve => {
      finishFast = resolve;
    });
    const slowDone = new Promise(resolve => {
      finishSlow = resolve;
    });
    const fast = createCollector();
    const slow = createCollector();
    const fastRender = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {total: source.total, tick, done: fastDone},
        turbopackMap,
      ),
    );
    const slowRender = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {total: source.total, done: slowDone},
        turbopackMap,
      ),
    );
    await serverAct(() => {
      fastRender.pipe(fast.destination);
      slowRender.pipe(slow.destination);
    });
    const fastShell = fast.take();
    const slowShell = slow.take();
    await serverAct(() => openFirst('first'));
    await serverAct(() => advanceFast('tick'));
    const fastMiddle = fast.take();
    const middle = await decodeInBrowser(
      streamFrom(Buffer.concat([fastShell, fastMiddle])),
      {
        unstable_allowPartialStream: true,
      },
    );
    expect(await middle.total).toBe(30);
    await serverAct(() => openSecond('second'));
    await serverAct(() => finishFast('done'));
    await fast.finished;
    await serverAct(() => finishSlow('done'));
    await slow.finished;
    const fastResult = await decodeInBrowser(
      streamFrom(Buffer.concat([fastShell, fastMiddle, fast.take()])),
    );
    const slowResult = await decodeInBrowser(
      streamFrom(Buffer.concat([slowShell, slow.take()])),
    );
    expect(await fastResult.total).toBe(10);
    expect(await slowResult.total).toBe(10);
    expect(await source.total).toBe(10);
  });

  // @gate enableFlightLedgers
  it('does not resample a completed batch when its destination starts flowing', async () => {
    const StaleTime = ReactServer.createMinLedger();
    let finishSource;
    let finishDestination;
    const sourceGate = new Promise(resolve => {
      finishSource = resolve;
    });
    const destinationGate = new Promise(resolve => {
      finishDestination = resolve;
    });
    function Page() {
      ReactServer.addToLedger(StaleTime, 60);
      return sourceGate.then(() => {
        ReactServer.addToLedger(StaleTime, 10);
        return 'page';
      });
    }
    function App() {
      return ReactServer.captureLedgers(<Page />, [StaleTime]);
    }
    const source = await decodeOnServer(await renderToStream(<App />));
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {
          total: source.ledgers[0],
          done: destinationGate,
        },
        turbopackMap,
      ),
    );
    // The output batch is ready, but delivery waits until the source advances.
    await serverAct(() => finishSource());
    expect(await source.ledgers[0]).toBe(10);
    const collector = createCollector();
    await serverAct(() => pipe(collector.destination));
    const prefix = collector.take();
    const shell = await decodeInBrowser(streamFrom(prefix), {
      unstable_allowPartialStream: true,
    });
    expect(await shell.total).toBe(60);

    // New work prepares a new batch using the latest source total.
    await serverAct(() => finishDestination('done'));
    await collector.finished;
    const complete = await decodeInBrowser(
      streamFrom(Buffer.concat([prefix, collector.take()])),
    );
    expect(await complete.total).toBe(10);
  });

  // @gate enableFlightLedgers && enableTaint
  it('errors when a tainted decoded total is forwarded', async () => {
    const Tags = ReactServer.createSetLedger();
    function App() {
      const captured = ReactServer.captureLedgers('page', [Tags]);
      return {page: captured.data, total: captured.ledgers[0]};
    }
    const source = await decodeOnServer(await renderToStream(<App />));
    ReactServer.experimental_taintObjectReference(
      'Cannot forward this total',
      source.total,
    );
    const errors = [];
    const collector = createCollector();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {total: source.total},
        turbopackMap,
        {
          onError(error) {
            errors.push(error.message);
          },
        },
      ),
    );
    await serverAct(() => pipe(collector.destination));
    await collector.finished;
    expect(errors).toEqual(['Cannot forward this total']);
  });

  // @gate enableFlightLedgers && enableTaint
  it('fails the request when a forwarded set entry is tainted', async () => {
    const Tags = ReactServer.createSetLedger();
    const lifetime = {};
    const secret = 'secret-token';
    function Page() {
      ReactServer.addToLedger(Tags, 'public');
      ReactServer.addToLedger(Tags, secret);
      return 'page';
    }
    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {page: captured.data, total: captured.ledgers[0]};
    }
    const source = await decodeOnServer(await renderToStream(<App />));
    // Tainted where the entry is decoded, after the source wrote it.
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      lifetime,
      secret,
    );
    const errors = [];
    const collector = createCollector();
    const failure = collector.finished.then(
      () => null,
      error => error,
    );
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {total: source.total},
        turbopackMap,
        {
          onError(error) {
            errors.push(error.message);
          },
        },
      ),
    );
    await serverAct(() => pipe(collector.destination));
    expect((await failure).message).toBe(
      'Cannot pass a secret token to the client',
    );
    expect(errors).toEqual(['Cannot pass a secret token to the client']);
    expect(collector.take().toString()).not.toContain(secret);
    expect(lifetime).not.toBe(null);
  });

  // A Set total that grows by one entry per batch must not be rescanned in
  // full on every batch, or forwarding it takes quadratic time.
  // @gate enableFlightLedgers
  it('forwards a growing set total without rescanning it on every batch', async () => {
    const count = 200;
    const Tags = ReactServer.createSetLedger();
    let openGate;
    const gate = new Promise(resolve => {
      openGate = resolve;
    });
    function Page() {
      // Each item writes one new entry in a timer after the one before it, so
      // each entry is emitted by its own work pass.
      const items = [];
      let previous = gate;
      for (let i = 0; i < count; i++) {
        previous = previous
          .then(() => new Promise(resolve => setTimeout(resolve, 0)))
          .then(() => {
            ReactServer.addToLedger(Tags, 'entry-' + i);
            return i;
          });
        items.push(previous);
      }
      return items;
    }
    function App() {
      const captured = ReactServer.captureLedgers(<Page />, [Tags]);
      return {total: captured.ledgers[0], items: captured.data};
    }
    const source = await decodeOnServer(await renderToStream(<App />));
    const collector = createCollector();
    const originalAdd = Set.prototype.add;
    const originalHas = Set.prototype.has;
    // Count every Set operation, since the totals are internal.
    let setOperations = 0;
    // eslint-disable-next-line no-extend-native
    Set.prototype.add = function (value) {
      setOperations++;
      return originalAdd.call(this, value);
    };
    // eslint-disable-next-line no-extend-native
    Set.prototype.has = function (value) {
      setOperations++;
      return originalHas.call(this, value);
    };
    try {
      const {pipe} = await serverAct(() =>
        ReactServerDOMServer.renderToPipeableStream(
          {total: source.total, items: source.items},
          turbopackMap,
        ),
      );
      await serverAct(() => pipe(collector.destination));
      // The source writes while the destination forwards its total.
      await serverAct(() => openGate());
      await collector.finished;
    } finally {
      // eslint-disable-next-line no-extend-native
      Set.prototype.add = originalAdd;
      // eslint-disable-next-line no-extend-native
      Set.prototype.has = originalHas;
    }
    // Decode in slices to stay under the test loop guard for a single chunk.
    const output = collector.take();
    const result = await decodeInBrowser(
      new ReadableStream({
        start(controller) {
          for (let i = 0; i < output.length; i += 1024) {
            controller.enqueue(new Uint8Array(output.subarray(i, i + 1024)));
          }
          controller.close();
        },
      }),
    );
    expect((await result.total).size).toBe(count);
    // Rescanning the total on each batch would take about count * count / 2
    // operations. Other Set use during the render is also counted.
    expect(setOperations).toBeLessThan(count * 20);
  });
});
