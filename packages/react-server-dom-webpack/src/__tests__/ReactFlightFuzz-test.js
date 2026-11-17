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

import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Send generated JavaScript values through the Flight server and client.
// Vary when Promises resolve, modules load, and stream items are produced.
// Check the results against the source values after each event.
// The reply host encodes on the client and decodes on the server instead.
// The reply-temporary host sends the decoded reply back to the client with
// temporary reference sets on both sides.
//
// FUZZ_TEST_SEED picks the seed. FLIGHT_FUZZ_CASES is how many cases are
// generated from it.
// FLIGHT_FUZZ_SHRINK is how many times a failed case may be run again to find
// a smaller one.

const {createOracle} = require('./fuzz/FlightFuzzOracle');
const {createFixture} = require('./fuzz/FlightFuzzFixture');
const {
  startFlightResponse,
  tick,
  runInIOCallback,
} = require('./fuzz/FlightFuzzTransport');
const {
  createRandom,
  generateGraph,
  generateScaleGraph,
  shrinkGraph,
  formatGraphTest,
  formatReplayCommand,
} = require('./fuzz/FlightFuzzGraph');
const {
  roundTripTemporaryReferences,
  compareTemporaryReferences,
} = require('./fuzz/FlightFuzzTemporaryReferences');

// TODO: Remove the CI check once the remaining fixes have landed. Until then,
// a random seed can generate cases that still fail, and the scheduled CI job
// passes a random seed. So in CI we always use the default one.
const SEED = (!process.env.CI && process.env.FUZZ_TEST_SEED) || 'default';
const caseCount = +(process.env.FLIGHT_FUZZ_CASES ?? 4);
const shrinkBudget = +(process.env.FLIGHT_FUZZ_SHRINK ?? 0);
if (!Number.isSafeInteger(caseCount) || caseCount < 1) {
  throw new Error('FLIGHT_FUZZ_CASES must be a positive integer.');
}
if (!Number.isSafeInteger(shrinkBudget) || shrinkBudget < 0) {
  throw new Error('FLIGHT_FUZZ_SHRINK must be a nonnegative replay budget.');
}
// The largest generated cases, a chain of 2048 bound functions, take longer
// than the default timeout on a slow machine. The client reads such a response
// in about 20ms. The rest is this test rendering it and checking it after
// every event. Finding a smaller case runs the failed case many times, so that
// needs much longer.
jest.setTimeout(shrinkBudget > 0 ? 600000 : 15000);
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

// Restore console methods between cases to avoid retaining old server modules.
const consoleMethods = Object.fromEntries(
  Object.entries(Object.getOwnPropertyDescriptors(console)).filter(
    ([, descriptor]) => typeof descriptor.value === 'function',
  ),
);

// A case fails if it logs something that it does not assert on.
async function withCleanConsole(loadModules, run) {
  let failure = null;
  let loaded = false;
  try {
    loadModules();
    loaded = true;
    await run();
  } catch (error) {
    failure = error;
  } finally {
    try {
      if (loaded) {
        const {assertConsoleErrorDev} = require('internal-test-utils');
        const {
          assertConsoleLogsCleared,
        } = require('internal-test-utils/consoleMock');
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
    }
  }
  if (failure !== null) {
    throw failure;
  }
}

// Throws an error that says how to run the failed case again. If
// FLIGHT_FUZZ_SHRINK is set, it first looks for a smaller case that fails the
// same way.
async function reportFailure(original, {seed, readTiming, pastedName, replay}) {
  const testName = expect.getState().currentTestName;
  const replayOptions = {
    build: !!process.env.IS_BUILD,
    releaseChannel: process.env.RELEASE_CHANNEL || 'experimental',
  };
  const buildReport = (failure, reduction) =>
    'Replay the original with:\n' +
    formatReplayCommand(seed, testName, __DEV__, replayOptions) +
    '\n' +
    reduction +
    '\nPaste this case next to the generated graphs and run with:\n' +
    formatReplayCommand(seed, pastedName, __DEV__, replayOptions) +
    '\n\n' +
    formatGraphTest(failure.graph, readTiming);
  let failure = original;
  let reduction = '';
  if (shrinkBudget > 0) {
    // Looking for a smaller case can take longer than the test timeout, so
    // print the report for the original case first. It goes to stderr because
    // console output would fail the case.
    process.stderr.write('\n' + buildReport(original, '') + '\n');
    const signature = error => error.fuzzFailure || error.message;
    const reduced = await shrinkGraph(
      original.graph,
      async candidate => {
        let result;
        try {
          result = await replay(candidate);
        } catch (error) {
          // A smaller case can be invalid, for example when something still
          // refers to a node that was replaced.
          return false;
        }
        return result !== null &&
          signature(result.error) === signature(original.error)
          ? result
          : false;
      },
      shrinkBudget,
    );
    if (reduced.reproduction !== null) {
      failure = reduced.reproduction;
    }
    reduction =
      '\nReduced from ' +
      Object.keys(original.graph.nodes).length +
      ' to ' +
      Object.keys(failure.graph.nodes).length +
      ' nodes in ' +
      reduced.attempts +
      ' replays. Each accepted reduction failed twice.\n';
  }
  throw new Error(buildReport(failure, reduction), {cause: failure.error});
}

// Sanity checks for the comparison that the tests below rely on. Each one
// gives it a wrong result and expects it to throw.
describe('ReactFlightFuzz oracle', () => {
  function expectMismatch(source, received, fixture, message) {
    expect(() => createOracle(fixture).observeValue(source, received)).toThrow(
      message,
    );
  }

  it('rejects a missing property whose value is undefined', () => {
    expectMismatch({value: undefined}, {});
  });

  it('rejects an extra collection entry', () => {
    expectMismatch(new Set([1]), new Set([1, 2]));
  });

  it('rejects a different collection order', () => {
    expectMismatch(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
      new Map([
        ['b', 2],
        ['a', 1],
      ]),
    );
  });

  it('rejects two source objects merged into one received object', () => {
    const merged = {value: 1};
    expectMismatch(
      {a: {value: 1}, b: {value: 1}},
      {a: merged, b: merged},
      undefined,
      'two distinct source objects',
    );
  });

  it('rejects a changed Date', () => {
    expectMismatch(new Date(1000), new Date(2000));
  });

  // @gate __DEV__
  it('rejects a changed Error message', () => {
    const source = new Error('expected');
    expectMismatch(source, new Error('changed'), {
      valueMetadata: new Map([[source, {type: 'error'}]]),
    });
  });

  it('rejects different bytes', () => {
    const source = new Uint8Array([1, 2]);
    expectMismatch(source, new Uint8Array([1, 3]), {
      valueMetadata: new Map(),
      bytes: new Map([[source, [1, 2]]]),
    });
  });

  it('rejects a received object with a non-plain prototype', () => {
    expectMismatch({value: 1}, Object.assign(Object.create(null), {value: 1}));
  });

  it('rejects an element with a different key', () => {
    const type = Symbol.for('react.transitional.element');
    const source = {$$typeof: type, key: 'a'};
    expectMismatch(
      source,
      {$$typeof: type, key: 'b'},
      {valueMetadata: new Map([[source, {type: 'element'}]])},
    );
  });

  it('rejects a wrong value nested inside containers', () => {
    expectMismatch({list: [new Set([1])]}, {list: [new Set([2])]});
  });

  it('rejects a wrong value next to a cycle', () => {
    const source = {items: []};
    source.items.push(source, {value: 1});
    const received = {items: []};
    received.items.push(received, {value: 2});
    expectMismatch(source, received);
  });

  it('rejects a value that changed after delivery', async () => {
    const received = {value: 'delivered'};
    const oracle = createOracle();
    oracle.observeValue({value: 'delivered'}, received);
    received.value = 'changed';
    await expect(oracle.checkForMutations()).rejects.toThrow('value.value');
  });

  // Builds a model with one Promise. The test plays the client here: it gives
  // the oracle a result whose Promise it settles by hand.
  async function createTimingCase() {
    const fixture = await createFixture(
      {
        nodes: {value: {value: 'ready'}, promise: {promise: 'value'}},
        roots: {entry: 'promise', other: 'promise'},
      },
      {},
    );
    let settle;
    const received = new Promise((resolve, reject) => {
      settle = {resolve, reject};
    });
    received.catch(() => {});
    const oracle = createOracle(fixture);
    oracle.subscribeToRoot(
      Promise.resolve({
        entry: received,
        other: received,
        outcomes: [received],
        unrelated: new Promise(() => {}),
      }),
      fixture.model,
    );
    await tick();
    const resolveOnServer = async () => {
      releaseEvent(fixture.events[0]);
      await tick();
    };
    return {oracle, settle, resolveOnServer};
  }

  it('rejects a result that is delivered before its inputs', async () => {
    const {oracle, settle} = await createTimingCase();
    settle.resolve('ready');
    await tick();
    expect(() => oracle.getMissingResults()).toThrow(
      'Delivered before its inputs arrived',
    );
  });

  it('reports a result that is due and was not delivered', async () => {
    const {oracle, resolveOnServer} = await createTimingCase();
    expect(oracle.getMissingResults()).toEqual([]);
    await resolveOnServer();
    expect(oracle.getMissingResults().map(check => check.path)).toEqual([
      'root.entry.then',
    ]);
  });

  it('rejects a rejection where a value is due', async () => {
    const {oracle, settle, resolveOnServer} = await createTimingCase();
    await resolveOnServer();
    settle.reject(new Error('wrong'));
    await tick();
    expect(() => oracle.getMissingResults()).toThrow('unexpected rejection');
  });

  it('rejects an iterator that never completes', () => {
    const source = ['item'].values();
    const received = {next: () => ({done: false, value: 'item'})};
    expectMismatch(source, received, {
      valueMetadata: new Map([[source, {type: 'iterator', items: ['item']}]]),
    });
  });
});

describe.each(['node', 'edge', 'reply'])('ReactFlightFuzz (%s)', host => {
  let React;
  let ReactServer;
  let ReactDOMServer;
  let ReactServerDOMServer;
  let ReactServerDOMClient;
  let WebpackMock;

  // Reset caches so each case starts with unloaded client modules.
  function loadModules() {
    Object.defineProperties(console, consoleMethods);
    jest.resetModules();
    jest.useRealTimers();
    jest.mock('react', () => require('react/react.react-server'));
    const serverBuild = host === 'reply' ? 'node' : host;
    jest.doMock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.' + serverBuild),
    );
    WebpackMock = require('./utils/WebpackMock');
    ReactServerDOMServer = require(
      'react-server-dom-webpack/server.' + serverBuild,
    );
    ReactServer = require('react');
    jest.resetModules();
    __unmockReact();
    React = require('react');
    // The Edge client's Server Function references retain their metadata
    // when bound, so encodeReply can serialize them.
    ReactServerDOMClient = require(
      'react-server-dom-webpack/client.' + (host === 'reply' ? 'edge' : host),
    );
    ReactDOMServer = require('react-dom/server.edge');
  }

  if (host !== 'reply') {
    it.each([null, true, false, 0, 42, 'hello'])(
      'can pass the ordinary value %p',
      value =>
        withFlightModules(async () => {
          expect(await roundTrip(value)).toBe(value);
        }),
    );

    it('can pass an array containing an object', () =>
      withFlightModules(async () => {
        const received = await roundTrip([1, 'two', {active: true}]);
        expect(received).toStrictEqual([1, 'two', {active: true}]);
      }));

    it('can pass an object containing arrays and objects', () =>
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

    it('keeps Set entries in insertion order', () =>
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

    it('keeps Map keys and values in insertion order', () =>
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

    it('can pass a Date', () =>
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

    it('keeps the bytes of a typed array view', () =>
      withFlightModules(async () => {
        const received = await roundTrip(
          new Uint8Array([0, 1, 2, 3]).subarray(1, 3),
        );
        expect(received).toBeInstanceOf(Uint8Array);
        expect(Array.from(received)).toEqual([1, 2]);
      }));

    it('keeps distinct objects apart when one is shared', () =>
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

    it('can pass an object and an array that contain each other', () =>
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
            // All bytes have arrived, but the model still needs its client
            // export. The end of the response must not deliver the model
            // without it.
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
  }

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

  // Run a pasted case at every read timing unless one was specified.
  async function runGraph({
    readTiming,
    seed = SEED,
    scheduleIndex = 0,
    ...graph
  }) {
    const timings = readTiming === undefined ? readTimings : [readTiming];
    for (let i = 0; i < timings.length; i++) {
      await runCaseWithReproduction({
        seed,
        readTiming: timings[i],
        scheduleIndex,
        graph,
      });
    }
  }

  async function runCaseWithReproduction(args) {
    const failure = await runCase(args);
    if (failure !== null) {
      await reportFailure(failure, {
        seed: args.seed,
        readTiming: args.readTiming,
        pastedName: 'ReactFlightFuzz (' + host + ') pasted',
        replay: graph => runCase({...args, graph}),
      });
    }
  }

  // Returns null on success, or the error and the graph with its schedule.
  async function runCase({seed, readTiming, scheduleIndex, graph}) {
    let replayGraph;
    try {
      await withFlightModules(async () => {
        const fixture = await createFixture(graph, {
          React,
          ReactServer,
          WebpackMock,
          createServerReference:
            host === 'reply'
              ? ReactServerDOMClient.createServerReference
              : undefined,
          observeProps(element, props) {
            oracle.observeProps(element, props);
          },
        });
        const oracle = createOracle(fixture, {
          render,
          isReply: host === 'reply',
        });
        const schedule = createSchedule(fixture, graph, seed, scheduleIndex);
        replayGraph = {
          ...graph,
          events: schedule.events.map(event => event.label),
          packetSizes: schedule.packetSizes,
          yieldBetweenPackets: schedule.yieldBetweenPackets,
        };
        await checkResponse(fixture, oracle, {...schedule, readTiming});
      });
      return null;
    } catch (error) {
      // The case itself is invalid, so there is nothing to run again.
      if (replayGraph === undefined) {
        throw error;
      }
      return {error, graph: replayGraph};
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
    // The event order has its own random sequence, so that changing it does
    // not change the generated values.
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
    if (host === 'reply' || readTiming === 'after-eof') {
      // Replies buffer writer output before decoding. The last read timing
      // also starts the Flight renderer with its events already released.
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
      body:
        host === 'reply'
          ? await ReactServerDOMClient.encodeReply(model)
          : undefined,
      bufferedReply: host === 'reply' && readTiming === 'after-eof',
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
    const previousAbortController = global.AbortController;
    global.AbortController = FuzzAbortController;
    try {
      await withCleanConsole(loadModules, run);
    } finally {
      global.AbortController = previousAbortController;
    }
  }

  describe('plain graphs', () => {
    it('object shared between two properties', () =>
      runGraph({
        nodes: {
          shared: {object: {}},
          holder: {object: {first: 'shared', second: 'shared'}},
        },
        roots: {entry: 'holder', other: 'shared'},
      }));

    it('array and object that contain each other', () =>
      runGraph({
        nodes: {
          array: {array: ['object', 'array']},
          object: {object: {items: 'array'}},
        },
        roots: {entry: 'object', other: 'array'},
      }));

    it('Set and Map that share an object', () =>
      runGraph({
        nodes: {
          date: {date: 1700000000000},
          shared: {object: {when: 'date'}},
          set: {set: ['shared']},
          map: {map: [['shared', 'set']]},
        },
        roots: {entry: 'map', other: 'set'},
      }));
  });

  describe('Promise and client-module graphs', () => {
    if (host !== 'reply') {
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
    }

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

    if (host !== 'reply') {
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
    }

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

    if (host !== 'reply') {
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
    }

    it('Set containing itself', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          set: {set: ['set', 'ready']},
        },
        roots: {entry: 'set', other: 'set'},
      }));

    it('Map containing itself', () =>
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

    it('two collections containing each other', () =>
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
    if (host !== 'reply') {
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
    }

    // @gate FIXME
    it('keeps undefined object properties', () =>
      runGraph({
        nodes: {
          missing: {special: 'undefined'},
          object: {object: {present: 'missing'}},
        },
        roots: {entry: 'object', other: 'object'},
      }));

    it('a large binary value written in two places', () =>
      runGraph({
        nodes: {
          binary: {special: 'large binary'},
          first: {array: ['binary']},
          second: {object: {again: 'binary'}},
          stream: {stream: ['first', 'second']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('Blob beside a cycle', () =>
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
    if (host !== 'reply') {
      it('keeps the order of a synchronous iterator', () =>
        withFlightModules(async () => {
          const received = await roundTrip(
            ['first', {value: 'second'}].values(),
          );
          expect(received.next()).toStrictEqual({done: false, value: 'first'});
          expect(received.next()).toStrictEqual({
            done: false,
            value: {value: 'second'},
          });
          expect(received.next()).toStrictEqual({done: true, value: undefined});
        }));
    }

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

    it('iterator resolved by a Promise', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          shared: {object: {field0: 'ready'}},
          iterator: {iterator: ['shared', 'ready']},
          later: {promise: 'iterator'},
        },
        roots: {entry: 'later', other: 'shared'},
      }));

    it('a synchronous iterator that yields itself', () =>
      withFlightModules(async () => {
        let next = 0;
        const iterator = {
          [Symbol.iterator]() {
            return this;
          },
          next() {
            return next++ === 0
              ? {done: false, value: iterator}
              : {done: true, value: undefined};
          },
        };
        const model = iterator;
        const transport = startFlightResponse({
          ReactServerDOMServer,
          ReactServerDOMClient,
          WebpackMock,
          host,
          model,
          body:
            host === 'reply'
              ? await ReactServerDOMClient.encodeReply(model)
              : undefined,
          bufferedReply: false,
          packetSizes: [1, 21, 4096],
          yieldBetweenPackets: true,
          onError(error) {
            throw error;
          },
        });
        let result;
        let failure;
        transport.root.then(
          value => (result = value),
          error => (failure = error),
        );
        try {
          await transport.finish();
          await transport.drain(
            () => result !== undefined || failure !== undefined,
            () => 'the self-yielding iterator',
          );
          if (failure !== undefined) {
            throw failure;
          }
          expect(result[Symbol.iterator]()).toBe(result);
          expect(result.next()).toEqual({
            done: false,
            value: result,
          });
          expect(result.next()).toEqual({
            done: true,
            value: undefined,
          });
        } finally {
          await transport.dispose();
        }
      }));
  });

  describe('data streams and shared sequences', () => {
    if (host !== 'reply') {
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
    }

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
          inner: {[type]: []},
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
              type === 'iterable' ? {iterable: [], single: true} : {stream: []},
            first: {array: ['inner']},
            second: {object: {again: 'inner'}},
            outer: {stream: ['first', 'second']},
          },
          roots: {entry: 'outer', other: 'outer'},
        }),
    );

    if (host !== 'reply') {
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
    }

    it('an iterator reused in later stream items', () =>
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

    it('streamed array containing itself', () =>
      runGraph({
        nodes: {
          item: {array: ['item']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('stream item with a failing module', () =>
      runGraph({
        nodes: {
          broken: {module: 'export-0', fail: 'load'},
          item: {array: ['broken']},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('two stream items each waiting on a module', () =>
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
    if (host !== 'reply') {
      it.each([false, true])(
        'can pass an async iterable with single use %s',
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
    }

    it('an async iterable returns a cycle that was already sent', () =>
      runGraph({
        nodes: {
          array: {array: ['object']},
          object: {object: {field0: 'array', field1: 'iterable'}},
          iterable: {iterable: [], returns: 'array'},
        },
        roots: {entry: 'array', other: 'array'},
      }));

    it('async iterator with cyclic items and a return value', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          item: {array: ['item', 'ready', 'iterator']},
          iterator: {
            iterable: ['item', 'item'],
            returns: 'item',
            single: true,
          },
        },
        roots: {entry: 'iterator', other: 'iterator'},
      }));
  });

  describe('byte streams', () => {
    it('byte stream read with a BYOB reader', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          bytes: {bytes: 2},
          data: {object: {field0: 'ready'}},
        },
        roots: {entry: 'bytes', other: 'data'},
      }));

    it('byte stream closed while a read is waiting', () =>
      runGraph({
        nodes: {array: {array: ['bytes']}, bytes: {bytes: 3}},
        roots: {entry: 'array', other: 'array'},
        packetSizes: [21, 100000],
        yieldBetweenPackets: true,
      }));

    it('bytes shared between two collections', () =>
      runGraph({
        nodes: {
          inner: {bytes: 2},
          first: {set: ['inner']},
          second: {set: ['inner']},
        },
        roots: {entry: 'first', other: 'second'},
      }));

    it('bytes in repeated stream items', () =>
      runGraph({
        nodes: {
          inner: {bytes: 2},
          item: {array: ['inner']},
          outer: {stream: ['item', 'item']},
        },
        roots: {entry: 'outer', other: 'outer'},
      }));

    it('bytes shared between different stream items', () =>
      runGraph({
        nodes: {
          inner: {bytes: 2},
          first: {array: ['inner']},
          second: {object: {again: 'inner'}},
          outer: {stream: ['first', 'second']},
        },
        roots: {entry: 'outer', other: 'outer'},
      }));
  });

  describe('stream cancellation', () => {
    it('stream canceled while the writer is still producing', () =>
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
    if (host !== 'reply') {
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
    }

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

    it('function bound to its array', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['container']},
          container: {array: ['fn', 'container', 'ready']},
        },
        roots: {entry: 'container', other: 'container'},
      }));

    it('function bound to its Map', () =>
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

    it('cycle first exposed through a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {set: ['fn', 'region', 'ready']},
        },
        roots: {entry: 'fn', other: 'fn'},
      }));

    it('cycle first exposed through a Promise of a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {object: {field0: 'fn', field1: 'region', field2: 'ready'}},
          exposure: {promise: 'fn'},
        },
        roots: {entry: 'exposure', other: 'exposure'},
      }));

    it('cycle first exposed through a stream item with a bound function', () =>
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

    it('FormData bound to a function in a larger graph', () =>
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

    if (host !== 'reply') {
      it('a repeated Server Function bound to its loading container', () =>
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
    }
  });
  if (host !== 'reply') {
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

      it('props object referenced again while a prop is loading', () =>
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

      it('element reaching itself through its props', () =>
        runGraph({
          nodes: {
            payload: {module: 'export-0'},
            data: {object: {field0: 'element'}},
            value: {array: ['payload', 'data']},
            element: {element: 'value'},
          },
          roots: {entry: 'element', other: 'data'},
        }));

      it('a shared element stays stable when a cyclic model finishes loading', () =>
        runGraph({
          nodes: {
            value: {value: null},
            ready: {module: 'loaded'},
            shared: {array: []},
            data: {object: {shared: 'shared'}},
            entry: {array: ['ready', 'data']},
            nested: {array: ['shared']},
            map: {map: [['value', 'nested']]},
            element: {element: ['value', 'map']},
            holder: {object: {first: 'element', second: 'entry'}},
            iterator: {iterator: ['holder']},
            copy: {array: ['element']},
            set: {set: ['iterator', 'copy']},
          },
          roots: {entry: 'entry', other: 'set'},
          events: ['load element', 'load ready'],
          packetSizes: [4, 106, 2367],
          yieldBetweenPackets: false,
        }));
    });

    describe('Server Component output', () => {
      it('component output shares an object with a result whose module fails', () =>
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

      it('suspended server component element used twice', () =>
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

      it('an Error that is its own cause', () =>
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

      it('Error whose cause is still loading', () =>
        runGraph({
          nodes: {
            ready: {module: 'export-0'},
            error: {error: 'cause loading', cause: 'ready'},
            set: {set: ['error']},
          },
          roots: {entry: 'set', other: 'set'},
        }));

      it('Error with cyclic cause', () =>
        runGraph({
          nodes: {
            ready: {module: 'export-0'},
            cell: {object: {field0: 'ready', field1: 'error'}},
            error: {error: 'cyclic cause', cause: 'cell'},
          },
          roots: {entry: 'error', other: 'cell'},
        }));

      it('a cyclic Map with values that load independently', () =>
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

      it('a streamed Error that is its own cause', () =>
        runGraph({
          nodes: {
            error: {error: 'self cause', cause: 'error'},
            stream: {stream: ['error']},
          },
          roots: {entry: 'stream', other: 'stream'},
        }));

      it('a streamed object containing an Error whose cause is the object', () =>
        runGraph({
          nodes: {
            error: {error: 'item cause', cause: 'item'},
            item: {object: {error: 'error'}},
            stream: {stream: ['item']},
          },
          roots: {entry: 'stream', other: 'stream'},
        }));
    });
  }
  describe('other graphs', () => {
    // This hangs until colons in reference paths are escaped.
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

    it('a failed stream item behind an item that waits for another stream', () =>
      runGraph({
        nodes: {
          failing: {module: 'export-1', fail: 'load'},
          shared: {array: []},
          holder: {object: {shared: 'shared'}},
          first: {array: ['holder']},
          map: {map: [['failing', 'failing']]},
          second: {array: ['map']},
          waiting: {stream: ['first', 'second']},
          twice: {object: {}},
          inner: {array: ['twice']},
          // The item refers to itself through `twice`, so it gets its own row
          // and `first` refers into it.
          owner: {array: ['shared', 'inner', 'twice', 'action']},
          action: {bound: []},
          source: {stream: ['owner']},
        },
        roots: {entry: 'source', other: 'waiting'},
        events: [
          'source item 0',
          'close source',
          'waiting item 0',
          'waiting item 1',
          'close waiting',
          'reject failing',
          'load action',
        ],
      }));

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

    if (host !== 'reply') {
      it('an element that fails before its props have arrived', () =>
        runGraph({
          nodes: {
            text0: {value: null},
            blob0: {blob: 'blob-14'},
            module1: {module: 'export-1', fail: 'load'},
            array0: {array: ['element0', 'blob0']},
            set0: {set: ['promise0']},
            map0: {map: [['text0', 'item0']]},
            item0: {array: ['module1', 'set0']},
            element0: {element: 'map0'},
            promise0: {promise: 'element0'},
          },
          roots: {entry: 'array0', other: 'array0'},
          rootPromise: true,
          events: [
            'resolve promise0 to element0',
            'reject module1',
            'resolve the root Promise',
            'load element0',
            'resolve an unrelated Promise',
          ],
          packetSizes: [5, 29, 3263],
          yieldBetweenPackets: true,
          readTiming: 'early',
        }));
    }

    function checkSharedInElementContext(type, key) {
      return withFlightModules(async () => {
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
        const oracle = createOracle(fixture, {
          render,
          isReply: host === 'reply',
        });
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
    }

    if (host !== 'reply') {
      it('a Promise resolves before another value containing it finishes loading', () =>
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
        }));

      it('a shared stream first returned through element context with key null', () =>
        checkSharedInElementContext('stream', null));

      it('a shared stream first returned through element context with key keyed', () =>
        checkSharedInElementContext('stream', 'keyed'));

      it('a shared iterable first returned through element context with key null', () =>
        checkSharedInElementContext('iterable', null));
    }
  });

  const formatCaseName = (label, seed, readTiming, scheduleIndex) =>
    label +
    ' seed=' +
    seed +
    ' readTiming=' +
    readTiming +
    ' schedule=' +
    scheduleIndex;

  // A reply cannot carry client references, elements, server components,
  // Errors or symbols; its loading leaves are Server Functions.
  const unsupportedReplyOperations = [
    'aggregate error',
    'fragment',
    'host',
    'symbol',
    'element',
    'props',
    'component',
    'failing component',
    'error',
    'rejected promise',
    'failing stream',
  ];

  describe('generated graphs', () => {
    seeds.forEach(seed => {
      for (let scheduleIndex = 0; scheduleIndex < 2; scheduleIndex++) {
        readTimings.forEach(readTiming => {
          // eslint-disable-next-line jest/valid-title
          it(formatCaseName('graph', seed, readTiming, scheduleIndex), () =>
            runGraph({
              ...generateGraph(seed, {
                without:
                  host === 'reply'
                    ? [
                        ...unsupportedReplyOperations,
                        // These produce cases that fail for now.
                        'undefined',
                        'colon',
                      ]
                    : [
                        // These produce cases that fail for now.
                        'undefined',
                        'colon',
                      ],
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

// The reply-temporary host encodes the graph as a reply, decodes it, reads out
// its async values and renders the result back to the client. Every source
// event is released before encoding, so it does not use the event schedule or
// the oracle above. It adds values that can only be sent with a temporary
// reference set: opaque leaves and a synchronously settling thenable.
//
// It leaves out client modules, Server Functions, rendered elements, Errors,
// rejections, canceled and byte streams, and the response options. Symbols are
// generated as opaque leaves, and FormData is left out.
const REPLY_TEMPORARY_WITHOUT = [
  'module',
  'failing module',
  'bound function',
  'element',
  'props',
  'component',
  'failing component',
  'fragment',
  'host',
  'error',
  'aggregate error',
  'rejected promise',
  'failing stream',
  'canceled stream',
  'byte stream',
  'after eof',
  'root promise',
  'symbol',
  'form data',
];
const REPLY_TEMPORARY_EXTRA = [
  'opaque leaf',
  'opaque item',
  'shared item',
  'thenable item',
];

describe('ReactFlightFuzz (reply-temporary)', () => {
  let React;
  let ReactServer;
  let ReactServerDOMServer;
  let ReactServerDOMClient;
  let WebpackMock;
  let serverAct;

  function loadModules() {
    Object.defineProperties(console, consoleMethods);
    jest.resetModules();
    // serverAct flushes the server scheduler through Jest's timer mocks, so this
    // host uses them rather than the real timers the other hosts switch to.
    jest.useFakeTimers();
    patchMessageChannel(require('scheduler'));
    serverAct = require('internal-test-utils').serverAct;
    jest.mock('react', () => require('react/react.react-server'));
    jest.doMock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.edge'),
    );
    WebpackMock = require('./utils/WebpackMock');
    ReactServerDOMServer = require('react-server-dom-webpack/server.edge');
    ReactServer = require('react');
    jest.resetModules();
    __unmockReact();
    React = require('react');
    ReactServerDOMClient = require('react-server-dom-webpack/client.edge');
  }

  // Returns null on success, or the error and the graph.
  async function runCase(graph) {
    let ran = false;
    try {
      await withCleanConsole(loadModules, async () => {
        const fixture = await createFixture(graph, {
          React,
          ReactServer,
          WebpackMock,
          observeProps() {},
        });
        // encodeReply waits for the source Promises, streams and iterables, so
        // every writer event is released before encoding begins.
        fixture.events.forEach(releaseEvent);
        ran = true;
        const sourceRoot = {
          entry: fixture.model.entry,
          other: fixture.model.other,
        };
        const received = await roundTripTemporaryReferences(
          {ReactServerDOMServer, ReactServerDOMClient, WebpackMock, serverAct},
          sourceRoot,
        );
        await compareTemporaryReferences(fixture, sourceRoot, received);
      });
      return null;
    } catch (error) {
      // The case itself is invalid, so there is nothing to run again.
      if (!ran) {
        throw error;
      }
      return {error, graph};
    }
  }

  async function runGraph(graph, seed = SEED) {
    const failure = await runCase(graph);
    if (failure !== null) {
      await reportFailure(failure, {
        seed,
        readTiming: 'after-events',
        pastedName: 'ReactFlightFuzz (reply-temporary) pasted',
        replay: runCase,
      });
    }
  }

  describe('named regression cases', () => {
    // A stream item outlined because it holds a shared object must not come
    // back as undefined.
    it('outlined stream item with a shared sub-object', () =>
      runGraph({
        nodes: {
          value: {value: 'shared'},
          shared: {object: {value: 'value'}},
          item: {object: {a: 'shared', b: 'shared'}},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('outlined async iterable item with a shared sub-object', () =>
      runGraph({
        nodes: {
          value: {value: 'shared'},
          shared: {object: {value: 'value'}},
          item: {object: {a: 'shared', b: 'shared'}},
          iterable: {iterable: ['item'], single: true},
        },
        roots: {entry: 'iterable', other: 'iterable'},
      }));

    // An element, function or symbol inside a stream item must not leave a
    // reference the server cannot resolve.
    it('opaque leaves inside a stream item', () =>
      runGraph({
        nodes: {
          value: {value: 'plain'},
          plain: {object: {value: 'value'}},
          el: {opaqueElement: true},
          fn: {opaqueFunction: true},
          sym: {opaqueSymbol: true},
          item: {object: {el: 'el', fn: 'fn', sym: 'sym', plain: 'plain'}},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('opaque leaf inside an async iterable return value', () =>
      runGraph({
        nodes: {
          value: {value: 'first'},
          first: {object: {value: 'value'}},
          el: {opaqueElement: true},
          returned: {object: {el: 'el'}},
          iterable: {iterable: ['first'], returns: 'returned', single: true},
        },
        roots: {entry: 'iterable', other: 'iterable'},
      }));

    // A thenable that settles synchronously to another object of its stream
    // item must not leave a reference to a part that is never written.
    it('synchronous thenable resolving to an object of its stream item', () =>
      runGraph({
        nodes: {
          value: {value: 'shared'},
          shared: {object: {value: 'value'}},
          thenable: {syncThenable: 'shared'},
          item: {object: {x: 'shared', p: 'thenable'}},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('asynchronous thenable resolving to an object of its stream item', () =>
      runGraph({
        nodes: {
          value: {value: 'shared'},
          shared: {object: {value: 'value'}},
          thenable: {promise: 'shared'},
          item: {object: {x: 'shared', p: 'thenable'}},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));
  });

  describe('temporary reference graphs', () => {
    it('opaque leaves in ordinary containers', () =>
      runGraph({
        nodes: {
          el: {opaqueElement: true},
          fn: {opaqueFunction: true},
          sym: {opaqueSymbol: true},
          holder: {object: {el: 'el', fn: 'fn', sym: 'sym'}},
          repeat: {array: ['el', 'fn', 'sym']},
          root: {object: {holder: 'holder', repeat: 'repeat'}},
        },
        roots: {entry: 'root', other: 'holder'},
      }));

    it('a shared sub-object across a Map, a Set and the item', () =>
      runGraph({
        nodes: {
          value: {value: 'shared'},
          shared: {object: {value: 'value'}},
          key: {value: 'key'},
          map: {map: [['key', 'shared']]},
          set: {set: ['shared']},
          item: {object: {map: 'map', set: 'set', direct: 'shared'}},
          stream: {stream: ['item']},
        },
        roots: {entry: 'stream', other: 'stream'},
      }));

    it('a nested stream inside a stream item', () =>
      runGraph({
        nodes: {
          value: {value: 'leaf'},
          leaf: {object: {value: 'value'}},
          innerItem: {object: {leaf: 'leaf'}},
          inner: {stream: ['innerItem']},
          item: {object: {inner: 'inner'}},
          outer: {stream: ['item']},
        },
        roots: {entry: 'outer', other: 'outer'},
      }));

    it('a self cycle carried through a stream item', () =>
      runGraph({
        nodes: {
          value: {value: 'leaf'},
          leaf: {object: {value: 'value'}},
          item: {object: {leaf: 'leaf'}},
          stream: {stream: ['item']},
          root: {object: {stream: 'stream', self: 'root'}},
        },
        roots: {entry: 'root', other: 'root'},
      }));
  });

  describe('generated graphs', () => {
    seeds.forEach(seed => {
      it('graph seed=' + seed, () =>
        runGraph(
          generateGraph(seed, {
            without: [
              ...REPLY_TEMPORARY_WITHOUT,
              // These produce cases that fail for now.
              'undefined',
              'colon',
            ],
            extra: REPLY_TEMPORARY_EXTRA,
          }),
          seed,
        ),
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
