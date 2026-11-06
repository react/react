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

const {PassThrough} = require('stream');
const {finished} = require('stream/promises');
const {createOracle} = require('./fuzz/FlightReaderOracle');
const {createFixture} = require('./fuzz/FlightReaderFuzzFixture');
const {
  patchSetImmediate,
} = require('../../../../scripts/jest/patchSetImmediate');

describe('ReactFlightReaderFuzz (node)', () => {
  let ReactServerDOMServer;
  let ReactServerDOMClient;
  let WebpackMock;
  let serverAct;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.node'),
    );
    WebpackMock = require('./utils/WebpackMock');
    ReactServerDOMServer = require('react-server-dom-webpack/server.node');

    jest.resetModules();
    __unmockReact();
    ReactServerDOMClient = require('react-server-dom-webpack/client.node');
  });

  // Ordinary source values establish the contract before references and
  // readiness vary: preserve contents and collection insertion order.
  it.each([null, true, false, 0, 42, 'hello'])(
    'round-trips the ordinary value %p',
    async value => {
      expect(await roundTrip(value)).toBe(value);
    },
  );

  it('round-trips an array containing an object', async () => {
    const received = await roundTrip([1, 'two', {active: true}]);
    expect(received).toStrictEqual([1, 'two', {active: true}]);
  });

  it('round-trips an object containing arrays and objects', async () => {
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
  });

  it('round-trips Set entries in insertion order', async () => {
    const received = await roundTrip(
      new Set([1, 'two', {items: [true, null]}]),
    );
    expect(received).toBeInstanceOf(Set);
    expect(Array.from(received)).toStrictEqual([
      1,
      'two',
      {items: [true, null]},
    ]);
  });

  it('round-trips Map keys and values in insertion order', async () => {
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
  });

  it('round-trips a Date', async () => {
    const received = await roundTrip(new Date(1700000000000));
    expect(received).toBeInstanceOf(Date);
    expect(received.getTime()).toBe(1700000000000);
  });

  it('preserves negative zero and NaN', async () => {
    const received = await roundTrip({zero: -0, notANumber: NaN});
    expect(received.zero).toBe(-0);
    expect(received.notANumber).toBeNaN();
  });

  it('round-trips the bytes of a typed array view', async () => {
    const received = await roundTrip(
      new Uint8Array([0, 1, 2, 3]).subarray(1, 3),
    );
    expect(received).toBeInstanceOf(Uint8Array);
    expect(Array.from(received)).toEqual([1, 2]);
  });

  it('checks shared values without merging distinct source objects', async () => {
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
  });

  it('checks values along object and array cycles', async () => {
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
  });

  it('delivers a Promise result before an independent pending Promise or EOF', async () => {
    let resolveValue;
    const value = new Promise(resolve => {
      resolveValue = resolve;
    });
    const source = {
      label: 'containing object',
      value,
      independent: new Promise(() => {}),
    };

    await withResponse(source, async ({response, stream}) => {
      const received = await response;
      expect(received.label).toBe('containing object');
      expect(Object.keys(received)).toEqual(['label', 'value', 'independent']);
      const results = [];
      received.value.then(result => results.push(result));
      const independentResults = [];
      received.independent.then(result => independentResults.push(result));
      await actOnStream(() => {});
      expect(results).toEqual([]);
      expect(independentResults).toEqual([]);
      expect(stream.readableEnded).toBe(false);

      await actOnStream(() => resolveValue({message: 'ready'}));
      expect(results).toStrictEqual([{message: 'ready'}]);
      expect(await received.value).toStrictEqual({message: 'ready'});
      expect(independentResults).toEqual([]);
      expect(stream.readableEnded).toBe(false);
    });
  });

  it('waits for a held client module before delivering its containing model', async () => {
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
      async ({response, completion}) => {
        const models = [];
        response.then(model => models.push(model));
        // All bytes have arrived, but the containing model still needs its
        // client export. Transport completion must not deliver a placeholder.
        await completion;
        await actOnStream(() => {});
        expect(models).toEqual([]);

        await actOnStream(() => resolveModule());
        expect(models).toStrictEqual([
          {label: 'containing object', value: 'ready'},
        ]);
        expect(await response).toStrictEqual({
          label: 'containing object',
          value: 'ready',
        });
      },
    );
  });

  // Node streams deliver data through nextTick. Flush those deliveries in
  // the act scope so pending observations include the work they trigger.
  function actOnStream(action) {
    return serverAct(() => {
      action();
      jest.runAllTicks();
    });
  }

  async function withResponse(model, read) {
    const stream = new PassThrough();
    const response = ReactServerDOMClient.createFromNodeStream(stream, {
      moduleMap: null,
      serverModuleMap: null,
      moduleLoading: null,
    });
    let disposed = false;
    const errors = [];
    // Observe rejection immediately, including when read finishes before EOF.
    const completion = finished(stream, {cleanup: true}).catch(error => {
      if (!disposed) {
        errors.push(error);
      }
    });
    const writer = ReactServerDOMServer.renderToPipeableStream(
      model,
      WebpackMock.webpackMap,
      {
        onError(error) {
          if (!disposed) {
            errors.push(error);
          }
        },
      },
    );
    try {
      await actOnStream(() => writer.pipe(stream));
      const value = await read({response, stream, completion});
      if (errors.length > 0) {
        throw errors[0];
      }
      return value;
    } finally {
      disposed = true;
      await actOnStream(() => {
        writer.abort();
        stream.destroy();
      });
      await completion;
    }
  }

  function roundTrip(model) {
    return withResponse(model, async ({response, completion}) => {
      const [value] = await Promise.all([response, completion]);
      return value;
    });
  }

  // Check progress before EOF after each source or client-load event. By
  // default, resolve source Promises before loading their client modules.
  async function runGraph(graph) {
    const fixture = createFixture(graph, {WebpackMock});
    const oracle = createOracle(fixture);
    const events = fixture.events.filter(
      event => event !== fixture.unrelatedEvent,
    );
    if (graph.events === undefined) {
      events.sort((a, b) => +a.isClient - +b.isClient);
    } else {
      graph.events.forEach(label => {
        expect(events.some(event => event.label === label)).toBe(true);
      });
      const position = label => {
        const index = graph.events.indexOf(label);
        return index === -1 ? graph.events.length : index;
      };
      events.sort((a, b) => position(a.label) - position(b.label));
    }
    events.push(fixture.unrelatedEvent);

    await withResponse(fixture.model, async ({response, stream}) => {
      oracle.subscribeToRoot(response, fixture.model, {subscribeAgain: true});
      async function checkProgress() {
        await actOnStream(() => {});
        oracle.throwIfFailed();
        expect(oracle.getMissingResults().map(check => check.path)).toEqual([]);
        await oracle.checkForMutations();
      }
      await checkProgress();
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        await actOnStream(() => {
          event.released = true;
          event.run();
        });
        await checkProgress();
        if (event !== fixture.unrelatedEvent) {
          expect(stream.readableEnded).toBe(false);
        }
      }
      expect(oracle.isComplete()).toBe(true);
    });
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
  });
});
