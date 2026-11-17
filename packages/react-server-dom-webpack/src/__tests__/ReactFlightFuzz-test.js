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

// Send JavaScript values through the Flight server and client.
// Vary when Promises resolve and modules load.
// Check the results against the source values after each event.

const {createOracle} = require('./fuzz/FlightFuzzOracle');
const {createFixture} = require('./fuzz/FlightFuzzFixture');
const {
  startFlightResponse,
  tick,
  runInIOCallback,
} = require('./fuzz/FlightFuzzTransport');

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
    jest.resetModules();
    __unmockReact();
    ReactServerDOMClient = require('react-server-dom-webpack/client.' + host);
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

  // Run a graph at every read timing unless one was specified.
  async function runGraph({readTiming, ...graph}) {
    const timings = readTiming === undefined ? readTimings : [readTiming];
    for (let i = 0; i < timings.length; i++) {
      await runCase({readTiming: timings[i], graph});
    }
  }

  async function runCase({readTiming, graph}) {
    await withFlightModules(async () => {
      const fixture = await createFixture(graph, {WebpackMock});
      const oracle = createOracle(fixture);
      const schedule = createSchedule(fixture, graph);
      await checkResponse(fixture, oracle, {...schedule, readTiming});
    });
  }

  function createSchedule(fixture, graph) {
    const events = fixture.events.slice();
    const labels = new Set();
    events.forEach(event => {
      if (labels.has(event.label)) {
        throw new Error('Two events are labeled "' + event.label + '"');
      }
      labels.add(event.label);
    });
    // Release the events a graph lists first, in that order.
    if (graph.events !== undefined) {
      const position = label => {
        const index = graph.events.indexOf(label);
        return index === -1 ? graph.events.length : index;
      };
      events.sort((a, b) => position(a.label) - position(b.label));
    }
    // Other results must finish before this independent Promise resolves.
    events.splice(events.indexOf(fixture.unrelatedEvent), 1);
    events.push(fixture.unrelatedEvent);
    return {
      events,
      afterEof: graph.afterEof === true,
      packetSizes: graph.packetSizes || [1, 21, 4096],
      yieldBetweenPackets: graph.yieldBetweenPackets !== false,
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
        () => 'every outcome',
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
});

function releaseEvent(event) {
  event.released = true;
  event.run();
}
