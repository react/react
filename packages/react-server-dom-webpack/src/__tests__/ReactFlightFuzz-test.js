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
// Check the results against the source values.

const {createOracle} = require('./fuzz/FlightFuzzOracle');
const {createFixture} = require('./fuzz/FlightFuzzFixture');
const {startFlightResponse} = require('./fuzz/FlightFuzzTransport');

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
  function expectMismatch(source, received, message) {
    expect(() => createOracle().observeValue(source, received)).toThrow(
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
      'two distinct source objects',
    );
  });

  it('rejects a changed Date', () => {
    expectMismatch(new Date(1000), new Date(2000));
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
});

describe.each(['node', 'edge'])('ReactFlightFuzz (%s)', host => {
  let ReactServerDOMServer;
  let ReactServerDOMClient;
  let WebpackMock;

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

  async function withResponse(model, read) {
    const transport = startFlightResponse({
      ReactServerDOMServer,
      ReactServerDOMClient,
      WebpackMock,
      host,
      model,
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

  function runGraph(graph) {
    return withFlightModules(async () => {
      const fixture = createFixture(graph);
      const received = await roundTrip(fixture.model);
      const oracle = createOracle();
      oracle.observeValue(fixture.model, received);
      await oracle.checkForMutations();
    });
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
});
