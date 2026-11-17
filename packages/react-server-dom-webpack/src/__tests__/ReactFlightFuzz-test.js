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

// Send generated JavaScript values through the Flight server and client.
// Vary when Promises resolve and modules load.
// Check the results against the source values after each event.
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
        const {
          assertConsoleLogsCleared,
        } = require('internal-test-utils/consoleMock');
        try {
          assertConsoleLogsCleared();
        } catch (error) {
          if (failure === null) {
            failure = error;
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
});

describe.each(['node', 'edge'])('ReactFlightFuzz (%s)', host => {
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
  }

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

  async function withResponse(model, read) {
    const transport = startFlightResponse({
      ReactServerDOMServer,
      ReactServerDOMClient,
      WebpackMock,
      host,
      model,
      packetSizes: [1, 21, 4096],
      yieldBetweenPackets: true,
      onError(error) {
        throw error;
      },
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
          observeProps(element, props) {
            oracle.observeProps(element, props);
          },
        });
        const oracle = createOracle(fixture, {render});
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
  ) {
    const reported = [];
    if (readTiming === 'after-eof') {
      // The last read timing starts the Flight renderer with its events
      // already released.
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
      model: fixture.model,
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
        () => 'every outcome and render',
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
    await withCleanConsole(loadModules, run);
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

    // @gate FIXME
    it('Set containing itself', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          set: {set: ['set', 'ready']},
        },
        roots: {entry: 'set', other: 'set'},
      }));

    // @gate FIXME
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

    // @gate FIXME
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
    // @gate FIXME
    it('keeps undefined object properties', () =>
      runGraph({
        nodes: {
          missing: {special: 'undefined'},
          object: {object: {present: 'missing'}},
        },
        roots: {entry: 'object', other: 'object'},
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

    // @gate FIXME
    it('function bound to its array', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['container']},
          container: {array: ['fn', 'container', 'ready']},
        },
        roots: {entry: 'container', other: 'container'},
      }));

    // @gate FIXME
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

    // @gate FIXME
    it('cycle first exposed through a bound function', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          fn: {bound: ['region']},
          region: {set: ['fn', 'region', 'ready']},
        },
        roots: {entry: 'fn', other: 'fn'},
      }));

    // @gate FIXME
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

    // @gate FIXME
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

    // @gate FIXME
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

    // This fails on most runs until references are fulfilled early.
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

    // @gate FIXME || !__DEV__
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

    // This hangs in DEV until an Error's cause refers to the row it was
    // written to.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('an Error that is its own cause', () =>
      runGraph({
        nodes: {error: {error: 'self cause', cause: 'error'}},
        roots: {entry: 'error', other: 'error'},
      }));

    // @gate FIXME || !__DEV__
    it('Error whose cause is still loading', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          error: {error: 'cause loading', cause: 'ready'},
          set: {set: ['error']},
        },
        roots: {entry: 'set', other: 'set'},
      }));

    // @gate FIXME || !__DEV__
    it('Error with cyclic cause', () =>
      runGraph({
        nodes: {
          ready: {module: 'export-0'},
          cell: {object: {field0: 'ready', field1: 'error'}},
          error: {error: 'cyclic cause', cause: 'cell'},
        },
        roots: {entry: 'error', other: 'cell'},
      }));
  });

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

    // Node fails this in DEV until debug info reuses a value's reference.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('a Promise resolves before another value containing it finishes loading', () =>
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
  });

  const formatCaseName = (label, seed, readTiming, scheduleIndex) =>
    label +
    ' seed=' +
    seed +
    ' readTiming=' +
    readTiming +
    ' schedule=' +
    scheduleIndex;

  describe('generated graphs', () => {
    seeds.forEach(seed => {
      for (let scheduleIndex = 0; scheduleIndex < 2; scheduleIndex++) {
        readTimings.forEach(readTiming => {
          // eslint-disable-next-line jest/valid-title
          it(formatCaseName('graph', seed, readTiming, scheduleIndex), () =>
            runGraph({
              ...generateGraph(seed, {
                without: [
                  // These produce cases that fail for now.
                  'link',
                  'self',
                  'mutual',
                  'duplicate',
                  'map key',
                  'promise',
                  'element',
                  'props',
                  'component',
                  'failing component',
                  'bound function',
                  'error',
                  'aggregate error',
                  'fragment',
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
