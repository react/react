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

const {createOracle} = require('./fuzz/FlightReaderOracle');
const {createFixture} = require('./fuzz/FlightReaderFuzzFixture');
const {
  startFlightResponse,
  tick,
  runInIOCallback,
} = require('./fuzz/FlightReaderFuzzTransport');
const {
  createRandom,
  generateGraph,
  generateScaleGraph,
} = require('./fuzz/FlightReaderFuzzGraph');

const SEED = process.env.FUZZ_TEST_SEED || 'default';
const caseCount = +(process.env.FLIGHT_FUZZ_CASES ?? 4);
if (!Number.isSafeInteger(caseCount) || caseCount < 1) {
  throw new Error('FLIGHT_FUZZ_CASES must be a positive integer.');
}
// Generated graph checks can exceed Jest's default timeout on CI.
jest.setTimeout(15000);
// Keep the first seed unchanged so the printed command replays that case.
const seeds = Array.from({length: caseCount}, (_, i) =>
  i === 0 ? SEED : SEED + ':' + i,
);

const readTimings = ['early', 'late', 'after-events', 'after-eof'];
const NativeAbortController = global.AbortController;
class FuzzAbortController extends NativeAbortController {
  constructor() {
    super();
    require('node:events').setMaxListeners(Infinity, this.signal);
  }
}

describe.each(['node', 'edge'])('ReactFlightReaderFuzz (%s)', host => {
  let React;
  let ReactServer;
  let ReactDOMServer;
  let ReactServerDOMServer;
  let ReactServerDOMClient;
  let WebpackMock;
  let assertConsoleErrorDev;
  let assertConsoleLogsCleared;

  // Restore console methods between cases to avoid retaining old server modules.
  const consoleMethods = Object.fromEntries(
    Object.entries(Object.getOwnPropertyDescriptors(console)).filter(
      ([, descriptor]) => typeof descriptor.value === 'function',
    ),
  );

  // Reset caches so each case starts with unloaded client modules.
  function loadModules() {
    Object.defineProperties(console, consoleMethods);
    jest.resetModules();
    jest.useRealTimers();
    jest.mock('react', () => require('react/react.react-server'));
    jest.doMock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.' + host),
    );
    WebpackMock = require('./utils/WebpackMock');
    ReactServerDOMServer = require('react-server-dom-webpack/server.' + host);
    ReactServer = require('react');
    jest.resetModules();
    __unmockReact();
    React = require('react');
    ReactServerDOMClient = require('react-server-dom-webpack/client.' + host);
    ReactDOMServer = require('react-dom/server.edge');
    ({assertConsoleErrorDev} = require('internal-test-utils'));
    ({assertConsoleLogsCleared} = require('internal-test-utils/consoleMock'));
  }

  // Ordinary source values establish the contract before references and
  // readiness vary: preserve contents and collection insertion order.
  it.each([null, true, false, 0, 42, 'hello'])(
    'round-trips the ordinary value %p',
    value =>
      withFlightModules(async () => {
        expect(await roundTrip(value)).toBe(value);
      }),
  );

  it('round-trips an array containing an object', () =>
    withFlightModules(async () => {
      const received = await roundTrip([1, 'two', {active: true}]);
      expect(received).toStrictEqual([1, 'two', {active: true}]);
    }));

  it('round-trips an object containing arrays and objects', () =>
    withFlightModules(async () => {
      const received = await roundTrip({
        count: 3,
        items: [true, null],
        nested: {label: 'ready'},
      });
      expect(received).toStrictEqual({
        count: 3,
        items: [true, null],
        nested: {label: 'ready'},
      });
    }));

  it('round-trips Set entries in insertion order', () =>
    withFlightModules(async () => {
      const received = await roundTrip(
        new Set([1, 'two', {items: [true, null]}]),
      );
      expect(received).toBeInstanceOf(Set);
      expect(Array.from(received)).toStrictEqual([
        1,
        'two',
        {items: [true, null]},
      ]);
    }));

  it('round-trips Map keys and values in insertion order', () =>
    withFlightModules(async () => {
      const received = await roundTrip(
        new Map([
          ['first', {value: 1}],
          [{key: 'second'}, [2, 3]],
        ]),
      );
      expect(received).toBeInstanceOf(Map);
      expect(Array.from(received)).toStrictEqual([
        ['first', {value: 1}],
        [{key: 'second'}, [2, 3]],
      ]);
    }));

  it('round-trips a Date', () =>
    withFlightModules(async () => {
      const received = await roundTrip(new Date(1700000000000));
      expect(received).toBeInstanceOf(Date);
      expect(received.getTime()).toBe(1700000000000);
    }));

  it('preserves negative zero and NaN', () =>
    withFlightModules(async () => {
      const received = await roundTrip({zero: -0, notANumber: NaN});
      expect(received.zero).toBe(-0);
      expect(received.notANumber).toBeNaN();
    }));

  it('round-trips the bytes of a typed array view', () =>
    withFlightModules(async () => {
      const received = await roundTrip(
        new Uint8Array([0, 1, 2, 3]).subarray(1, 3),
      );
      expect(received).toBeInstanceOf(Uint8Array);
      expect(Array.from(received)).toEqual([1, 2]);
    }));

  it('checks shared values without merging distinct source objects', () =>
    withFlightModules(async () => {
      const shared = {value: 'shared'};
      const source = {
        first: shared,
        second: shared,
        distinct: {value: 'shared'},
      };
      const received = await roundTrip(source);
      const oracle = createOracle();
      oracle.observeValue(source, received);
      expect(received.first).not.toBe(received.distinct);
      expect(received.second).not.toBe(received.distinct);

      await roundTrip('another value');
      await oracle.checkForMutations();
    }));

  it('checks values along object and array cycles', () =>
    withFlightModules(async () => {
      const source = {value: 'cycle', items: []};
      source.items.push(source, source.items);
      const received = await roundTrip(source);
      const oracle = createOracle();
      oracle.observeValue(source, received);
      expect(received.value).toBe('cycle');
      expect(received.items[0].value).toBe('cycle');
      expect(Array.isArray(received.items[1])).toBe(true);

      await roundTrip('another value');
      await oracle.checkForMutations();
    }));

  it('delivers a Promise result before an independent pending Promise or EOF', () =>
    withFlightModules(async () => {
      let resolveValue;
      const value = new Promise(resolve => {
        resolveValue = resolve;
      });
      const source = {
        label: 'containing object',
        value,
        independent: new Promise(() => {}),
      };

      await withResponse(source, async ({response, transport}) => {
        const received = await readRoot(transport);
        expect(received.label).toBe('containing object');
        expect(Object.keys(received)).toEqual([
          'label',
          'value',
          'independent',
        ]);
        const results = [];
        received.value.then(
          result => results.push(result),
          error => results.push({error}),
        );
        const independentResults = [];
        received.independent.then(
          result => independentResults.push(result),
          error => independentResults.push({error}),
        );
        await flushAction(transport, () => {});
        expect(results).toEqual([]);
        expect(independentResults).toEqual([]);
        expect(transport.isClosed).toBe(false);
        expect(transport.isServerDone).toBe(false);

        await flushAction(transport, () => resolveValue({message: 'ready'}));
        await transport.drain(
          () => results.length === 1,
          () => 'literal Promise result',
        );
        expect(results).toStrictEqual([{message: 'ready'}]);
        expect(await received.value).toStrictEqual({message: 'ready'});
        expect(independentResults).toEqual([]);
        expect(transport.isClosed).toBe(false);
        expect(transport.isServerDone).toBe(false);
      });
    }));

  it('waits for a held client module before delivering its containing model', () =>
    withFlightModules(async () => {
      let resolveModule;
      const load = new Promise(resolve => {
        resolveModule = resolve;
      });
      const {value} = WebpackMock.clientExports(
        {value: 'ready'},
        'basic',
        'basic.js',
        load,
      );

      await withResponse(
        {label: 'containing object', value},
        async ({response, transport}) => {
          const models = [];
          response.then(
            model => models.push(model),
            error => models.push({error}),
          );
          // All bytes have arrived, but the containing model still needs its
          // client export. Transport completion must not deliver a placeholder.
          await transport.finish();
          transport.close();
          await flushAction(transport, () => {});
          expect(models).toEqual([]);

          await flushAction(transport, () => resolveModule());
          expect(models).toStrictEqual([
            {label: 'containing object', value: 'ready'},
          ]);
          expect(await response).toStrictEqual({
            label: 'containing object',
            value: 'ready',
          });
        },
      );
    }));

  async function flushAction(transport, action) {
    await runInIOCallback(action);
    await transport.flush();
  }

  async function readRoot(transport, thenable = transport.root) {
    let result;
    const settled = Promise.resolve(thenable).then(
      value => (result = {value}),
      error => (result = {error}),
    );
    await transport.drain(
      () => result !== undefined,
      () => 'literal root delivery',
    );
    await settled;
    if ('error' in result) {
      throw result.error;
    }
    return result.value;
  }

  function render(element) {
    return ReactDOMServer.renderToReadableStream(element, {
      onError() {},
    }).then(stream => new Response(stream).text());
  }

  async function withResponse(model, read, {onError: handleError} = {}) {
    const transport = startFlightResponse({
      ReactServerDOMServer,
      ReactServerDOMClient,
      WebpackMock,
      host,
      model,
      packetSizes: [1, 21, 4096],
      yieldBetweenPackets: true,
      onError:
        handleError === undefined
          ? error => {
              throw error;
            }
          : handleError,
    });
    try {
      await transport.flush();
      const value = await read({response: transport.root, transport});
      await transport.flush();
      return value;
    } finally {
      await transport.dispose();
    }
  }

  function roundTrip(model) {
    return withResponse(model, async ({response, transport}) => {
      await transport.finish();
      const value = await response;
      transport.close();
      await transport.flush();
      return value;
    });
  }

  // Reset the consuming module context before building each graph's proxies.
  async function runGraph({
    readTiming,
    seed = SEED,
    scheduleIndex = 0,
    ...graph
  }) {
    const timings = readTiming === undefined ? readTimings : [readTiming];
    for (let i = 0; i < timings.length; i++) {
      await withFlightModules(async () => {
        const fixture = await createFixture(graph, {
          React,
          ReactServer,
          WebpackMock,
          observeProps(element, props) {
            oracle.observeProps(element, props);
          },
        });
        const oracle = createOracle(fixture, {render});
        const schedule = createSchedule(fixture, graph, seed, scheduleIndex);
        await checkResponse(fixture, oracle, {
          ...schedule,
          readTiming: timings[i],
        });
      });
    }
  }

  function createSchedule(fixture, graph, seed, scheduleIndex) {
    const events = fixture.events.slice();
    const labels = new Set();
    events.forEach(event => {
      if (labels.has(event.label)) {
        throw new Error('Two events are labeled "' + event.label + '"');
      }
      labels.add(event.label);
    });
    // Change event order without changing the generated values.
    const order = createRandom(seed + '/order/' + scheduleIndex);
    if (graph.events !== undefined) {
      const position = label => {
        const index = graph.events.indexOf(label);
        return index === -1 ? graph.events.length : index;
      };
      events.sort((a, b) => position(a.label) - position(b.label));
    } else {
      shuffle(events, order);
    }
    // Other results must finish before this independent Promise resolves.
    events.splice(events.indexOf(fixture.unrelatedEvent), 1);
    events.push(fixture.unrelatedEvent);
    // Cycle through three packet sizes so a value can straddle any boundary: a
    // tiny one (1-8 bytes) to split almost every field, a small one, and a large
    // one that usually holds the rest in one write.
    const packetSizes = [1 + order(8), 17 + order(100), 1024 + order(4096)];
    const yieldBetweenPackets = order(2) === 0;
    return {
      events,
      afterEof: graph.afterEof === true,
      packetSizes: graph.packetSizes || packetSizes,
      yieldBetweenPackets:
        graph.yieldBetweenPackets !== undefined
          ? graph.yieldBetweenPackets
          : yieldBetweenPackets,
    };
  }

  // Check progress after each event. Otherwise, a later event could hide
  // a missing wakeup.
  async function checkResponse(
    fixture,
    oracle,
    {readTiming, events, packetSizes, yieldBetweenPackets, afterEof = false},
    model = fixture.model,
  ) {
    const reported = [];
    if (readTiming === 'after-eof') {
      // Start rendering with all server events already released.
      for (let i = 0; i < events.length; i++) {
        if (!events[i].isClient) {
          releaseEvent(events[i]);
        }
      }
      events = events.filter(event => event.isClient);
    }

    const transport = startFlightResponse({
      ReactServerDOMServer,
      ReactServerDOMClient,
      WebpackMock,
      host,
      model,
      packetSizes,
      yieldBetweenPackets,
      onError(error) {
        const digest = fixture.expectedErrors.has(error)
          ? fixture.valueMetadata.get(error).digest
          : undefined;
        if (digest === undefined) {
          throw error;
        }
        reported.push(error);
        return digest;
      },
    });
    try {
      const expectedModel =
        fixture.rootPromise === null ? fixture.model : fixture.resolvedModel;
      const root =
        fixture.rootPromise === null
          ? transport.root
          : Promise.resolve(transport.root);
      const checkProgress = async stage => {
        let pendingChecks = [];
        try {
          await transport.drain(
            () => {
              pendingChecks = oracle.getMissingResults();
              return pendingChecks.length === 0;
            },
            () =>
              stage +
              ': still waiting for ' +
              pendingChecks.map(entry => entry.path).join(', ') +
              '; not yet released: ' +
              fixture.events
                .filter(event => !event.released)
                .map(event => event.label)
                .join(', '),
          );
          await oracle.checkForMutations();
        } catch (error) {
          if (!error.message.startsWith('No progress')) {
            error.message = stage + ': ' + error.message;
          }
          throw error;
        }
      };
      if (readTiming === 'early') {
        oracle.subscribeToRoot(root, expectedModel, {subscribeAgain: true});
      }
      await transport.flush();
      if (readTiming === 'late') {
        oracle.subscribeToRoot(root, expectedModel, {subscribeAgain: true});
      }
      await checkProgress('after the first packets');
      const release = async event => {
        await runInIOCallback(() => releaseEvent(event));
        await checkProgress('after ' + event.label);
      };
      if (afterEof) {
        // Module loading can finish after EOF. Closing the transport must not
        // cancel those pending results.
        for (let i = 0; i < events.length; i++) {
          if (!events[i].isClient) {
            await release(events[i]);
          }
        }
        await transport.finish();
        transport.close();
        await transport.flush();
        await checkProgress('after EOF');
        events = events.filter(event => event.isClient);
      }
      for (let i = 0; i < events.length; i++) {
        await release(events[i]);
      }
      await transport.finish();
      if (readTiming === 'after-eof') {
        transport.close();
        await tick();
      }
      if (readTiming === 'after-events' || readTiming === 'after-eof') {
        oracle.subscribeToRoot(root, expectedModel, {subscribeAgain: true});
      }
      await checkProgress('after all events');
      await transport.drain(
        () => oracle.isComplete(),
        () => 'every outcome, render and stream item',
      );
      fixture.expectedErrors.forEach((thrower, error) => {
        if (!reported.includes(error)) {
          throw new Error(
            'The writer never reported "' +
              error.message +
              '", ' +
              thrower +
              '. Was it sent?',
          );
        }
      });
      await oracle.checkForMutations();
      // Read the completed response again to catch results that changed.
      oracle.subscribeToRoot(root, expectedModel);
      await transport.drain(
        () => oracle.isComplete(),
        () => 'reading the root again',
      );
      await oracle.checkForMutations();
    } finally {
      await transport.dispose();
    }
  }

  async function withFlightModules(run) {
    let failure = null;
    let loaded = false;
    const previousAbortController = global.AbortController;
    global.AbortController = FuzzAbortController;
    try {
      loadModules();
      loaded = true;
      await run();
    } catch (error) {
      failure = error;
    } finally {
      try {
        if (loaded) {
          // Check and clear console output before the next replay in both modes.
          const checks = [
            // Allow the warning on runtimes without ArrayBuffer.prototype.detached.
            () =>
              assertConsoleErrorDev(
                global.__loggedErrors
                  .map(entry => entry[0])
                  .filter(
                    message =>
                      typeof message === 'string' &&
                      message.includes('ArrayBuffer.prototype.detached'),
                  ),
                {withoutStack: true},
              ),
            assertConsoleLogsCleared,
          ];
          for (let i = 0; i < checks.length; i++) {
            try {
              checks[i]();
            } catch (error) {
              if (failure === null) {
                failure = error;
              }
            }
          }
        }
      } finally {
        Object.defineProperties(console, consoleMethods);
        global.AbortController = previousAbortController;
      }
    }
    if (failure !== null) {
      throw failure;
    }
  }

  describe('Promise and client-module graphs', () => {
    it('rejects a containing model when its module fails before another module loads', () =>
      runGraph({
        nodes: {
          failed: {module: 'failed', fail: 'load'},
          ready: {module: 'ready'},
          object: {object: {failed: 'failed', ready: 'ready'}},
        },
        roots: {entry: 'object', other: 'object'},
        events: ['reject failed', 'load ready'],
      }));

    it('shared object in two Promise results whose modules load and fail separately', () =>
      runGraph({
        nodes: {
          ready: {module: 'loaded'},
          failed: {module: 'failed', fail: 'load'},
          shared: {object: {}},
          loading: {array: ['shared', 'ready']},
          failing: {array: ['shared', 'failed']},
          first: {promise: 'loading'},
          second: {promise: 'failing'},
          last: {promise: 'shared'},
          roots: {array: ['first', 'second', 'last']},
        },
        roots: {entry: 'roots', other: 'roots'},
        events: [
          'resolve first to loading',
          'resolve second to failing',
          'resolve last to shared',
          'reject failed',
          'load ready',
        ],
      }));

    it.each(['', ':', '%3A', '%25:', ':%3A:', 'constructor', '01', '0', '🙂'])(
      'references through the property name %j',
      key =>
        runGraph({
          nodes: {
            ready: {module: 'export-0'},
            shared: {object: {ready: 'ready'}},
            object: {object: {[key]: 'shared', repeat: 'shared'}},
            later: {promise: 'shared'},
          },
          roots: {entry: 'object', other: 'later'},
        }),
    );

    it('server error through a rejected Promise', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'expected failure'},
          failing: {promise: 'error', reject: true},
          fine: {object: {field0: 'ready'}},
        },
        roots: {entry: 'failing', other: 'fine'},
      }));

    it('waits for the root source Promise before accepting its model error', () =>
      runGraph({
        nodes: {
          failed: {module: 'failed', fail: 'load'},
          object: {object: {value: 'failed'}},
        },
        roots: {entry: 'object', other: 'object'},
        rootPromise: true,
        events: ['reject failed', 'resolve the root Promise'],
      }));

    it('async module failing to evaluate after loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0', async: true, fail: 'evaluate'},
          other: {module: 'export-1'},
          broken: {object: {field0: 'ready'}},
          fine: {object: {field0: 'other'}},
        },
        roots: {entry: 'broken', other: 'fine'},
      }));
  });

  describe('collection graphs', () => {
    it('cycle first exposed through two Promises', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          member: {object: {field0: 'ready', field1: 'set'}},
          set: {set: ['member']},
          first: {promise: 'member'},
          second: {promise: 'set'},
        },
        roots: {entry: 'first', other: 'second'},
      }));

    it('Map keys and values wait for their client modules', () =>
      runGraph({
        nodes: {
          key: {module: 'key'},
          ready: {module: 'ready'},
          literal: {value: 'literal'},
          object: {object: {value: 'ready'}},
          map: {
            map: [
              ['key', 'object'],
              ['literal', 'ready'],
            ],
          },
          later: {promise: 'map'},
        },
        roots: {entry: 'map', other: 'later'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Set containing itself', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          set: {set: ['set', 'ready']},
        },
        roots: {entry: 'set', other: 'set'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Map containing itself', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          key: {value: 'value'},
          map: {
            map: [
              ['map', 'map'],
              ['key', 'ready'],
            ],
          },
        },
        roots: {entry: 'map', other: 'map'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('two collections containing each other', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          key: {value: 'a'},
          a: {set: ['b', 'ready']},
          b: {map: [['key', 'a']]},
        },
        roots: {entry: 'a', other: 'b'},
      }));
  });

  describe('native graph values', () => {
    it('native contents share a cycle while a client module is loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'loaded'},
          bigint: {special: 'bigint'},
          nan: {special: 'nan'},
          negativeZero: {special: 'negative zero'},
          infinity: {special: 'infinity'},
          symbol: {special: 'symbol'},
          escaped: {special: 'escaped'},
          text: {text: 'text'},
          date: {date: 1700000000000},
          buffer: {special: 'buffer'},
          binary: {binary: 3},
          typed: {special: 'typed array'},
          view: {special: 'data view'},
          bigints: {special: 'bigint array'},
          blob: {blob: 'blob'},
          form: {special: 'form data'},
          atoms: {
            array: [
              'bigint',
              'nan',
              'negativeZero',
              'infinity',
              'symbol',
              'escaped',
              'text',
              'date',
              'buffer',
              'binary',
              'typed',
              'view',
              'bigints',
              'blob',
              'form',
              'ready',
              'cycle',
            ],
          },
          cycle: {object: {values: 'atoms', self: 'cycle'}},
          later: {promise: 'atoms'},
        },
        roots: {entry: 'cycle', other: 'later'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('keeps undefined object properties', () =>
      runGraph({
        nodes: {
          missing: {special: 'undefined'},
          object: {object: {present: 'missing'}},
        },
        roots: {entry: 'object', other: 'object'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('a large binary value written in two places', () =>
      runGraph({
        nodes: {
          binary: {special: 'large binary'},
          first: {array: ['binary']},
          second: {object: {again: 'binary'}},
          stream: {stream: ['first', 'second']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Blob beside a cycle', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          blob: {blob: 'blob'},
          array: {array: ['blob', 'ready', 'array']},
        },
        roots: {entry: 'array', other: 'blob'},
      }));
  });

  describe('synchronous iterator graphs', () => {
    it('round-trips a synchronous iterator in order', () =>
      withFlightModules(async () => {
        const received = await roundTrip(['first', {value: 'second'}].values());
        expect(received.next()).toStrictEqual({done: false, value: 'first'});
        expect(received.next()).toStrictEqual({
          done: false,
          value: {value: 'second'},
        });
        expect(received.next()).toStrictEqual({done: true, value: undefined});
      }));

    it('iterator over values still loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: {field0: 'ready'}},
          iterator: {iterator: ['shared', 'ready']},
          object: {object: {field0: 'shared', field1: 'iterator'}},
        },
        roots: {entry: 'object', other: 'object'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('iterator resolved by a Promise', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: {field0: 'ready'}},
          iterator: {iterator: ['shared', 'ready']},
          later: {promise: 'iterator'},
        },
        roots: {entry: 'later', other: 'shared'},
      }));
  });

  describe('data streams and shared sequences', () => {
    it('delivers ordered data stream reads before source close and EOF', () =>
      withFlightModules(async () => {
        let controller;
        const data = new ReadableStream({start: c => (controller = c)});
        await withResponse(
          {data, independent: new Promise(() => {})},
          async ({response, transport}) => {
            const received = await readRoot(transport);
            const reader = received.data.getReader();
            const results = [];
            reader.read().then(
              result => results.push(result),
              error => results.push({error}),
            );
            await flushAction(transport, () => {});
            expect(results).toEqual([]);
            await flushAction(transport, () => controller.enqueue('first'));
            await transport.drain(
              () => results.length === 1,
              () => 'first literal stream read',
            );
            expect(results).toStrictEqual([{done: false, value: 'first'}]);
            reader.read().then(
              result => results.push(result),
              error => results.push({error}),
            );
            await flushAction(transport, () =>
              controller.enqueue({value: 'second'}),
            );
            await transport.drain(
              () => results.length === 2,
              () => 'second literal stream read',
            );
            expect(results).toStrictEqual([
              {done: false, value: 'first'},
              {done: false, value: {value: 'second'}},
            ]);
            expect(transport.isClosed).toBe(false);
            expect(transport.isServerDone).toBe(false);
            reader.read().then(
              result => results.push(result),
              error => results.push({error}),
            );
            await flushAction(transport, () => controller.close());
            await transport.drain(
              () => results.length === 3,
              () => 'literal stream end',
            );
            expect(results[2]).toStrictEqual({done: true, value: undefined});
            expect(transport.isClosed).toBe(false);
            expect(transport.isServerDone).toBe(false);
          },
        );
      }));

    it('keeps a Promise fulfilled when its delivered stream later fails', () =>
      withFlightModules(async () => {
        let controller;
        const data = new ReadableStream({start: c => (controller = c)});
        const error = new Error('source stream failed');
        const reported = [];
        await withResponse(
          {data: Promise.resolve(data), unrelated: new Promise(() => {})},
          async ({response, transport}) => {
            const model = await readRoot(transport);
            const received = await readRoot(transport, model.data);
            let result;
            const failedRead = received
              .getReader()
              .read()
              .then(
                value => (result = {value}),
                reason => (result = {error: reason}),
              );
            await flushAction(transport, () => controller.error(error));
            await transport.drain(
              () => result !== undefined,
              () => 'literal stream failure',
            );
            await failedRead;
            expect(result.error).toEqual(
              expect.objectContaining({digest: 'stream failure'}),
            );
            expect(await model.data).toBe(received);
            expect(reported).toEqual([error]);
            expect(transport.isClosed).toBe(false);
            expect(transport.isServerDone).toBe(false);
          },
          {
            onError(reason) {
              expect(reason).toBe(error);
              reported.push(reason);
              return 'stream failure';
            },
          },
        );
      }));

    it.each(['stream', 'iterable'])('%s shared between two collections', type =>
      runGraph({
        nodes: {
          inner: {[type]: []},
          first: {set: ['inner']},
          second: {set: ['inner']},
        },
        roots: {entry: 'first', other: 'second'},
      }),
    );

    it.each(['stream', 'iterable'])('%s in repeated stream items', type =>
      runGraph({
        nodes: {
          inner: {[type]: type === 'bytes' ? 2 : []},
          item: {array: ['inner']},
          outer: {stream: ['item', 'item']},
        },
        roots: {entry: 'outer', other: 'outer'},
      }),
    );

    it.each(['stream', 'iterable'])(
      '%s shared between different stream items',
      type =>
        runGraph({
          nodes: {
            inner:
              type === 'bytes'
                ? {bytes: 2}
                : type === 'iterable'
                  ? {iterable: [], single: true}
                  : {stream: []},
            first: {array: ['inner']},
            second: {object: {again: 'inner'}},
            outer: {stream: ['first', 'second']},
          },
          roots: {entry: 'outer', other: 'outer'},
        }),
    );

    it('source stream failure while another value is still loading', () =>
      runGraph({
        nodes: {
          error: {error: 'stream failed'},
          stream: {stream: [], fail: 'error'},
          ready: {module: 'loaded'},
          object: {object: {ready: 'ready'}},
          later: {promise: 'object'},
        },
        roots: {entry: 'stream', other: 'later'},
        events: ['resolve later to object', 'fail stream', 'load ready'],
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('an iterator reused in later stream items', () =>
      runGraph({
        nodes: {
          value: {value: 'first'},
          iterator: {iterator: ['value']},
          first: {object: {iterator: 'iterator'}},
          second: {object: {iterator: 'iterator'}},
          stream: {stream: ['first', 'second']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('streamed array containing itself', () =>
      runGraph({
        nodes: {
          item: {array: ['item']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('stream item with a failing module', () =>
      runGraph({
        nodes: {
          broken: {module: 'export-0', fail: 'load'},
          item: {array: ['broken']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('two stream items each waiting on a module', () =>
      runGraph({
        nodes: {
          first: {module: 'export-0'},
          second: {module: 'export-1'},
          item0: {set: ['first']},
          item1: {set: ['second']},
          stream: {stream: ['item0', 'item1']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));
  });

  describe('async iterable graphs', () => {
    it.each([false, true])(
      'round-trips an async iterable with single use %s',
      single =>
        withFlightModules(async () => {
          const source = {
            async *[Symbol.asyncIterator]() {
              yield 'first';
              yield {value: 'second'};
              return 'end';
            },
          };
          const received = await roundTrip(
            single ? source[Symbol.asyncIterator]() : source,
          );
          const iterator = received[Symbol.asyncIterator]();
          expect(iterator === received).toBe(single);
          expect(await iterator.next()).toStrictEqual({
            done: false,
            value: 'first',
          });
          expect(await iterator.next()).toStrictEqual({
            done: false,
            value: {value: 'second'},
          });
          expect(await iterator.next()).toStrictEqual({
            done: true,
            value: 'end',
          });
          expect(await iterator.next()).toStrictEqual({
            done: true,
            value: undefined,
          });
        }),
    );

    it('an async iterable produces independent results while its first module is loading', () =>
      runGraph({
        nodes: {
          held: {module: 'loaded'},
          first: {object: {value: 'held'}},
          ready: {value: 'ready'},
          end: {value: 'end'},
          sequence: {
            iterable: ['first', 'ready'],
            returns: 'end',
            single: true,
          },
        },
        roots: {entry: 'sequence', other: 'sequence'},
        events: [
          'start sequence',
          'sequence item 1',
          'return sequence',
          'load held',
        ],
      }));

    it('an async iterable returns a cycle that was already sent', () =>
      runGraph({
        nodes: {
          array: {array: ['object']},
          object: {object: {field0: 'array', field1: 'iterable'}},
          iterable: {iterable: [], returns: 'array'},
        },
        roots: {entry: 'array', other: 'array'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('async iterator with cyclic items and a return value', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          item: {array: ['item', 'ready', 'iterator']},
          iterator: {iterable: ['item', 'item'], returns: 'item', single: true},
        },
        roots: {entry: 'iterator', other: 'iterator'},
      }));
  });

  describe('byte streams', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('byte stream read with a BYOB reader', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          bytes: {bytes: 2},
          data: {object: {field0: 'ready'}},
        },
        roots: {entry: 'bytes', other: 'data'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('byte stream closed while a read is waiting', () =>
      runGraph({
        nodes: {array: {array: ['bytes']}, bytes: {bytes: 3}},
        roots: {entry: 'array', other: 'array'},
        packetSizes: [21, 100000],
        yieldBetweenPackets: true,
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip.each(['bytes'])('%s shared between two collections', type =>
      runGraph({
        nodes: {
          inner: {[type]: type === 'bytes' ? 2 : []},
          first: {set: ['inner']},
          second: {set: ['inner']},
        },
        roots: {entry: 'first', other: 'second'},
      }),
    );

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip.each(['bytes'])('%s in repeated stream items', type =>
      runGraph({
        nodes: {
          inner: {[type]: type === 'bytes' ? 2 : []},
          item: {array: ['inner']},
          outer: {stream: ['item', 'item']},
        },
        roots: {entry: 'outer', other: 'outer'},
      }),
    );

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip.each(['bytes'])('%s shared between different stream items', type =>
      runGraph({
        nodes: {
          inner:
            type === 'bytes'
              ? {bytes: 2}
              : type === 'iterable'
                ? {iterable: [], single: true}
                : {stream: []},
          first: {array: ['inner']},
          second: {object: {again: 'inner'}},
          outer: {stream: ['first', 'second']},
        },
        roots: {entry: 'outer', other: 'outer'},
      }),
    );
  });

  describe('stream cancellation', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('stream canceled while the writer is still producing', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: {field0: 'ready'}},
          stream: {stream: ['shared'], cancel: true},
        },
        roots: {entry: 'stream', other: 'shared'},
      }));
  });

  describe('bound Server Functions', () => {
    it('calls a delivered Server Function with bound and supplied arguments', () =>
      withFlightModules(async () => {
        const {fn} = WebpackMock.serverExports({fn: (...args) => args});
        const received = await roundTrip(fn.bind(null, 'bound'));
        const first = received('argument');
        expect(first).toEqual(['bound', 'argument']);
        expect(received('argument')).toEqual(['bound', 'argument']);
        expect(received('argument')).not.toBe(first);
      }));

    it('a bound object finishes loading before the function is delivered', () =>
      runGraph({
        nodes: {
          ready: {module: 'loaded'},
          argument: {object: {value: 'ready'}},
          fn: {bound: ['argument']},
        },
        roots: {entry: 'fn', other: 'fn'},
        events: ['load fn', 'load ready'],
      }));

    it('a bound argument first written inside a loading stream item', () =>
      runGraph({
        nodes: {
          ready: {module: 'loaded'},
          shared: {iterable: []},
          item: {object: {shared: 'shared', ready: 'ready'}},
          stream: {stream: ['item']},
          fn: {bound: ['shared']},
          root: {array: ['stream', 'fn']},
        },
        roots: {entry: 'root', other: 'root'},
        events: [
          'load fn',
          'stream item 0',
          'close stream',
          'start shared',
          'load ready',
        ],
        packetSizes: [1, 20, 4288],
        yieldBetweenPackets: false,
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('function bound to its array', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['container']},
          container: {array: ['fn', 'container', 'ready']},
        },
        roots: {entry: 'container', other: 'container'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('function bound to its Map', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['container']},
          container: {
            map: [
              ['fn', 'ready'],
              ['container', 'container'],
            ],
          },
        },
        roots: {entry: 'container', other: 'container'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('cycle first exposed through a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {set: ['fn', 'region', 'ready']},
        },
        roots: {entry: 'fn', other: 'fn'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('cycle first exposed through a Promise of a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {object: {field0: 'fn', field1: 'region', field2: 'ready'}},
          exposure: {promise: 'fn'},
        },
        roots: {entry: 'exposure', other: 'exposure'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('cycle first exposed through a stream item with a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {array: ['fn', 'region', 'ready']},
          item: {array: ['fn']},
          exposure: {stream: ['item']},
        },
        roots: {entry: 'exposure', other: 'exposure'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('FormData bound to a function in a larger graph', () =>
      runGraph({
        nodes: {
          form: {special: 'form data'},
          set: {set: ['bytes', 'map', 'fn']},
          outerMap: {map: [['set', 'iterable']]},
          bytes: {bytes: 3},
          map: {map: []},
          fn: {bound: ['form']},
          iterable: {iterable: []},
        },
        roots: {entry: 'map', other: 'outerMap'},
        rootPromise: true,
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('a repeated Server Function bound to its loading container', () =>
      runGraph({
        nodes: {
          ready: {module: 'loaded'},
          argument: {object: {value: 'ready', fn: 'fn'}},
          fn: {bound: ['argument']},
          first: {promise: 'argument'},
          result: {promise: 'fn'},
        },
        roots: {entry: 'first', other: 'result'},
        events: [
          'load fn',
          'resolve first to argument',
          'resolve result to fn',
          'load ready',
        ],
        packetSizes: [1, 25, 2091],
        yieldBetweenPackets: true,
      }));
  });
  describe('elements and observed props', () => {
    it('delivers an element before its client props finish loading', () =>
      withFlightModules(async () => {
        let load;
        const ready = new Promise(resolve => (load = resolve));
        const {value} = WebpackMock.clientExports(
          {value: 'ready'},
          'held prop',
          'held-prop.js',
          ready,
        );
        const seen = [];
        const {Client} = WebpackMock.clientExports({
          Client(props) {
            seen.push(props.value);
            return React.createElement('span', null, props.value);
          },
        });
        const element = ReactServer.createElement(Client, {value});
        await withResponse(
          {element, unrelated: new Promise(() => {})},
          async ({response, transport}) => {
            const received = await readRoot(transport);
            await flushAction(transport, () => {});
            expect(received).toBeDefined();
            let html;
            const rendered = render(received.element).then(
              result => (html = result),
            );
            rendered.catch(() => {});
            await flushAction(transport, () => {});
            expect(seen).toEqual([]);
            expect(html).toBe(undefined);
            await flushAction(transport, load);
            expect(await rendered).toBe('<span>ready</span>');
            expect(seen).toEqual(['ready']);
            expect(transport.isClosed).toBe(false);
            expect(transport.isServerDone).toBe(false);
          },
        );
      }));

    it('an element first written inside another loading value', () =>
      runGraph({
        nodes: {
          element: {host: 'atom'},
          ready: {module: 'loaded'},
          array: {array: ['element', 'ready']},
          first: {promise: 'array'},
          second: {promise: 'element'},
          root: {array: ['first', 'second']},
        },
        roots: {entry: 'root', other: 'root'},
        events: [
          'resolve first to array',
          'resolve second to element',
          'load ready',
        ],
      }));

    it('a Fragment first received inside a stream item', () =>
      runGraph({
        nodes: {
          fragment: {fragment: []},
          item: {array: ['fragment']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('props object referenced again while a prop is loading', () =>
      runGraph({
        nodes: {
          payload: {module: 'export-0'},
          data: {object: {field0: 'props'}},
          value: {array: ['payload', 'data']},
          element: {element: 'value'},
          props: {props: 'element'},
        },
        roots: {entry: 'element', other: 'props'},
      }));

    it('props sub-object referenced while a sibling prop is loading', () =>
      runGraph({
        nodes: {
          payload: {module: 'export-0'},
          sibling: {module: 'export-1'},
          selected: {object: {field0: 'payload'}},
          value: {array: ['selected', 'sibling']},
          element: {element: 'value'},
        },
        roots: {entry: 'element', other: 'selected'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('element reaching itself through its props', () =>
      runGraph({
        nodes: {
          payload: {module: 'export-0'},
          data: {object: {field0: 'element'}},
          value: {array: ['payload', 'data']},
          element: {element: 'value'},
        },
        roots: {entry: 'element', other: 'data'},
      }));
  });
  describe('Server Component output', () => {
    it('a rendered component can fail through an owner while another prop is loading', () =>
      runGraph({
        nodes: {
          shared: {object: {}},
          broken: {module: 'failed', fail: 'load'},
          pending: {module: 'pending'},
          owner: {object: {shared: 'shared', broken: 'broken'}},
          result: {promise: 'owner'},
          output: {object: {shared: 'shared', pending: 'pending'}},
          component: {component: 'output'},
        },
        roots: {entry: 'component', other: 'result'},
        events: [
          'load component body',
          'resolve result to owner',
          'reject broken',
          'render component',
          'load pending',
        ],
      }));

    it('server component rendering after the rest of the response', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          body: {value: 'body'},
          component: {component: 'body'},
          data: {object: {field0: 'ready'}},
        },
        roots: {entry: 'component', other: 'data'},
      }));

    it('failing server component', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'component failed'},
          component: {component: 'error', throw: true},
          data: {object: {field0: 'ready'}},
        },
        roots: {entry: 'component', other: 'data'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('suspended server component element used twice', () =>
      runGraph({
        nodes: {
          body: {value: 'shared'},
          component: {component: 'body'},
          pair: {array: ['component', 'component']},
        },
        roots: {entry: 'pair', other: 'pair'},
      }));
  });
  describe('Error properties and mixed graph values', () => {
    it('exposes Error causes and AggregateError members in DEV', () =>
      withFlightModules(async () => {
        const cause = {detail: 'source'};
        const received = await roundTrip({
          error: new Error('single', {cause}),
          aggregate: new AggregateError([cause], 'several', {cause}),
        });
        expect(received.error).toBeInstanceOf(Error);
        expect(received.aggregate).toBeInstanceOf(Error);
        if (__DEV__) {
          expect(received.error.message).toBe('single');
          expect(received.error.cause).toEqual({detail: 'source'});
          expect(received.aggregate).toBeInstanceOf(AggregateError);
          expect(received.aggregate.message).toBe('several');
          expect(received.aggregate.cause).toEqual({detail: 'source'});
          expect(received.aggregate.errors).toEqual([{detail: 'source'}]);
        } else {
          expect('cause' in received.error).toBe(false);
          expect('cause' in received.aggregate).toBe(false);
          expect('errors' in received.aggregate).toBe(false);
        }
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('an Error that is its own cause', () =>
      runGraph({
        nodes: {error: {error: 'self cause', cause: 'error'}},
        roots: {entry: 'error', other: 'error'},
      }));

    it.each(['cause', 'errors'])(
      'failing stream reachable only through Error.%s',
      property =>
        runGraph({
          nodes: {
            failure: {error: 'stream failed'},
            stream: {stream: [], fail: 'failure'},
            error: {
              error: 'outer',
              [property]: property === 'cause' ? 'stream' : ['stream'],
            },
          },
          roots: {entry: 'error', other: 'error'},
        }),
    );

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Error whose cause is still loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'cause loading', cause: 'ready'},
          set: {set: ['error']},
        },
        roots: {entry: 'set', other: 'set'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Error with cyclic cause', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          cell: {object: {field0: 'ready', field1: 'error'}},
          error: {error: 'cyclic cause', cause: 'cell'},
        },
        roots: {entry: 'error', other: 'cell'},
      }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('a cyclic Map with values that load independently', () =>
      runGraph({
        nodes: {
          value1: {value: 'other value'},
          value2: {value: ''},
          value3: {value: 42},
          text0: {text: 'text-898'},
          blob0: {blob: 'blob-116'},
          host0: {host: 'atom'},
          module1: {module: 'export-1', async: true},
          array0: {array: ['array0']},
          set0: {set: ['map1']},
          map0: {
            map: [
              ['blob0', 'bytes0'],
              ['value3', 'props0'],
              ['module1', 'iterable0'],
              ['set0', 'value2'],
              ['array0', 'value1'],
            ],
          },
          map1: {
            map: [
              ['host0', 'host0'],
              ['element0', 'host0'],
              ['array0', 'host0'],
              ['blob0', 'text0'],
            ],
          },
          bytes0: {bytes: 2},
          element0: {element: 'host0'},
          props0: {props: 'element0'},
          iterable0: {iterable: []},
        },
        roots: {entry: 'map0', other: 'array0'},
        afterEof: true,
        rootPromise: true,
        events: [
          'bytes0 chunk 1',
          'load module1',
          'bytes0 chunk 0',
          'return iterable0',
          'load element0',
          'evaluate module1',
          'resolve the root Promise',
          'resolve an unrelated Promise',
        ],
        packetSizes: [3, 89, 2624],
        yieldBetweenPackets: false,
        readTiming: 'early',
      }));

    it('built-in values with a cycle and a loading module', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          nothing: {value: null},
          flag: {value: true},
          bigint: {special: 'bigint'},
          nan: {special: 'nan'},
          negativeZero: {special: 'negative zero'},
          infinity: {special: 'infinity'},
          symbol: {special: 'symbol'},
          escaped: {special: 'escaped'},
          text: {text: 'text'},
          date: {date: 1700000000000},
          buffer: {special: 'buffer'},
          binary: {binary: 3},
          typed: {special: 'typed array'},
          view: {special: 'data view'},
          bigints: {special: 'bigint array'},
          blob: {blob: 'blob'},
          form: {special: 'form data'},
          host: {host: 'atom'},
          atoms: {
            array: [
              'nothing',
              'flag',
              'bigint',
              'nan',
              'negativeZero',
              'infinity',
              'symbol',
              'escaped',
              'text',
              'date',
              'buffer',
              'binary',
              'typed',
              'view',
              'bigints',
              'blob',
              'form',
              'host',
              'ready',
              'cycle',
            ],
          },
          cycle: {object: {field0: 'atoms', field1: 'cycle'}},
        },
        roots: {entry: 'cycle', other: 'cycle'},
      }));
  });
  describe('source timing and response context', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip.each([':', '%3A:', ':%25:'])(
      'a cycle through the property name %j',
      key =>
        runGraph({
          nodes: {
            ready: {module: 'export-0'},
            cycle: {object: {[key]: 'cycle', value: 'ready'}},
            object: {object: {[key]: 'cycle'}},
          },
          roots: {entry: 'object', other: 'object'},
        }),
    );

    it('module failing to load after eof', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0', fail: 'load'},
          other: {module: 'export-1'},
          broken: {object: {field0: 'ready'}},
          fine: {object: {field0: 'other'}},
        },
        roots: {entry: 'broken', other: 'fine'},
        afterEof: true,
      }));

    it('module loading after eof', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0', async: true},
          region: {object: {field0: 'ready', field1: 'region'}},
        },
        roots: {entry: 'region', other: 'region'},
        afterEof: true,
      }));

    (__DEV__ && host === 'node' ? it.skip : it)(
      'a Promise resolves before another value containing it finishes loading',
      () =>
        runGraph({
          nodes: {
            value: {value: null},
            data: {promise: 'value'},
            ready: {module: 'loaded'},
            section: {object: {data: 'data', ready: 'ready'}},
            later: {promise: 'section'},
            root: {object: {data: 'data', section: 'later'}},
          },
          roots: {entry: 'root', other: 'root'},
          events: [
            'resolve later to section',
            'resolve data to value',
            'load ready',
          ],
        }),
    );

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip.each([
      ['stream', null],
      ['stream', 'keyed'],
      ['iterable', null],
    ])(
      'a shared %s first returned through element context with key %s',
      async (type, key) => {
        await withFlightModules(async () => {
          const fixture = await createFixture(
            {
              nodes: {
                a: {value: 'a'},
                b: {value: 'b'},
                shared:
                  type === 'stream'
                    ? {stream: ['a', 'b']}
                    : {iterable: ['a', 'b'], single: true},
              },
              roots: {entry: 'shared', other: 'shared'},
            },
            {React, ReactServer, WebpackMock},
          );
          const shared = fixture.model.entry;
          function Body() {
            return shared;
          }
          // Return the stream through an element first, then as an object property.
          const first =
            type === 'stream'
              ? ReactServer.createElement(Body, {key})
              : ReactServer.createElement(ReactServer.Fragment, null, shared);
          const oracle = createOracle(fixture, {render});
          await checkResponse(
            fixture,
            oracle,
            {
              readTiming: 'early',
              events: fixture.events,
              packetSizes: [1, 21, 4096],
              yieldBetweenPackets: true,
            },
            {...fixture.model, entry: first},
          );
        });
      },
    );
  });

  const formatCaseName = (label, seed, readTiming, scheduleIndex) =>
    label +
    ' seed=' +
    seed +
    ' readTiming=' +
    readTiming +
    ' schedule=' +
    scheduleIndex;

  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('generated graphs', () => {
    seeds.forEach(seed => {
      for (let scheduleIndex = 0; scheduleIndex < 2; scheduleIndex++) {
        readTimings.forEach(readTiming => {
          // eslint-disable-next-line jest/valid-title
          it(formatCaseName('graph', seed, readTiming, scheduleIndex), () =>
            runGraph({
              ...generateGraph(seed, {
                without: ['undefined', 'colon'],
              }),
              seed,
              readTiming,
              scheduleIndex,
            }),
          );
        });
      }
      const scaled = generateScaleGraph(seed);
      const readTiming =
        readTimings[createRandom(seed + '/scale-demand')(readTimings.length)];
      it(
        // eslint-disable-next-line jest/valid-title
        formatCaseName(
          scaled.shape + ' size=' + scaled.size,
          seed,
          readTiming,
          0,
        ),
        () => runGraph({...scaled.graph, seed, readTiming}),
      );
    });
  });

  // Paste a failing graph's test here.
});

function shuffle(array, pick) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function releaseEvent(event) {
  event.released = true;
  event.run();
}
