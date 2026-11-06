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
const {createObjectCheck} = require('./fuzz/FlightReaderOracle');

describe('ReactFlightReaderFuzz (node)', () => {
  let ReactServerDOMServer;
  let ReactServerDOMClient;

  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    jest.mock('react', () => require('react/react.react-server'));
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
    const check = createObjectCheck(source, received);
    check();
    expect(received.first).not.toBe(received.distinct);
    expect(received.second).not.toBe(received.distinct);

    await roundTrip('another value');
    check();
  });

  it('checks values along object and array cycles', async () => {
    const source = {value: 'cycle', items: []};
    source.items.push(source, source.items);
    const received = await roundTrip(source);
    const check = createObjectCheck(source, received);
    check();
    expect(received.value).toBe('cycle');
    expect(received.items[0].value).toBe('cycle');
    expect(Array.isArray(received.items[1])).toBe(true);

    await roundTrip('another value');
    check();
  });

  async function roundTrip(model) {
    const stream = new PassThrough();
    const response = ReactServerDOMClient.createFromNodeStream(stream, {
      moduleMap: null,
      serverModuleMap: null,
      moduleLoading: null,
    });
    const writer = ReactServerDOMServer.renderToPipeableStream(model, {});
    try {
      writer.pipe(stream);
      const [value] = await Promise.all([
        response,
        finished(stream, {cleanup: true}),
      ]);
      return value;
    } finally {
      writer.abort();
      stream.destroy();
    }
  }
});
