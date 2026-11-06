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

  async function withResponse(model, read, {onError: handleError} = {}) {
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
            try {
              if (handleError === undefined) {
                throw error;
              }
              return handleError(error);
            } catch (unexpected) {
              errors.push(unexpected);
            }
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
    const fixture = await createFixture(graph, {WebpackMock});
    const oracle = createOracle(fixture);
    const reported = [];
    const onError = error => {
      const digest = fixture.expectedErrors.has(error)
        ? fixture.valueMetadata.get(error).digest
        : undefined;
      if (digest === undefined) {
        throw error;
      }
      reported.push(error);
      return digest;
    };
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

    await withResponse(
      fixture.model,
      async ({response, stream}) => {
        const expectedModel =
          fixture.rootPromise === null ? fixture.model : fixture.resolvedModel;
        const root =
          fixture.rootPromise === null ? response : Promise.resolve(response);
        oracle.subscribeToRoot(root, expectedModel, {subscribeAgain: true});
        async function checkProgress() {
          await actOnStream(() => {});
          oracle.throwIfFailed();
          expect(oracle.getMissingResults().map(check => check.path)).toEqual(
            [],
          );
          await oracle.checkForMutations();
          Array.from(fixture.expectedErrors.keys()).forEach(error => {
            expect(reported).toContain(error);
          });
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
      },
      {onError},
    );
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

  describe('synchronous iterator graphs', () => {
    it('round-trips a synchronous iterator in order', async () => {
      const received = await roundTrip(['first', {value: 'second'}].values());
      expect(received.next()).toStrictEqual({done: false, value: 'first'});
      expect(received.next()).toStrictEqual({
        done: false,
        value: {value: 'second'},
      });
      expect(received.next()).toStrictEqual({done: true, value: undefined});
    });

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
    it('delivers ordered data stream reads before source close and EOF', async () => {
      let controller;
      const data = new ReadableStream({start: c => (controller = c)});
      await withResponse(
        {data, independent: new Promise(() => {})},
        async ({response, stream}) => {
          const received = await response;
          const reader = received.data.getReader();
          const results = [];
          reader.read().then(result => results.push(result));
          await actOnStream(() => {});
          expect(results).toEqual([]);
          await actOnStream(() => controller.enqueue('first'));
          expect(results).toStrictEqual([{done: false, value: 'first'}]);
          reader.read().then(result => results.push(result));
          await actOnStream(() => controller.enqueue({value: 'second'}));
          expect(results).toStrictEqual([
            {done: false, value: 'first'},
            {done: false, value: {value: 'second'}},
          ]);
          expect(stream.readableEnded).toBe(false);
          reader.read().then(result => results.push(result));
          await actOnStream(() => controller.close());
          expect(results[2]).toStrictEqual({done: true, value: undefined});
          expect(stream.readableEnded).toBe(false);
        },
      );
    });

    it('keeps a Promise fulfilled when its delivered stream later fails', async () => {
      let controller;
      const data = new ReadableStream({start: c => (controller = c)});
      const error = new Error('source stream failed');
      const reported = [];
      await withResponse(
        {data: Promise.resolve(data), unrelated: new Promise(() => {})},
        async ({response, stream}) => {
          const model = await response;
          const received = await model.data;
          const failedRead = received
            .getReader()
            .read()
            .catch(reason => reason);
          await actOnStream(() => controller.error(error));
          expect(await failedRead).toEqual(
            expect.objectContaining({digest: 'stream failure'}),
          );
          expect(await model.data).toBe(received);
          expect(reported).toEqual([error]);
          expect(stream.readableEnded).toBe(false);
        },
        {
          onError(reason) {
            expect(reason).toBe(error);
            reported.push(reason);
            return 'stream failure';
          },
        },
      );
    });

    it.each(['stream', 'iterable'])('%s shared between two collections', type =>
      runGraph({
        nodes: {
          inner: {[type]: type === 'bytes' ? 2 : []},
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
      async single => {
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
        expect(await iterator.next()).toStrictEqual({done: true, value: 'end'});
        expect(await iterator.next()).toStrictEqual({
          done: true,
          value: undefined,
        });
      },
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
});
