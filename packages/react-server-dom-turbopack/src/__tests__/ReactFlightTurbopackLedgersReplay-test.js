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
let turbopackMap;

const serverConsumerManifest = {moduleMap: null, moduleLoading: null};

describe('ReactFlightTurbopackLedgersReplay', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

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
});
