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

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let clientExports;
let serverExports;
let turbopackMap;
let turbopackModuleLoading;
let React;
let ReactDOMServer;
let ReactDOMFizzStatic;
let ReactServer;
let FlightReactDOM;
let ReactServerDOMServer;
let ReactServerDOMStaticServer;
let ReactServerDOMClient;
let Stream;
let AsyncLocalStorage;
let serverAct;
let assertConsoleErrorDev;
// Called with each Flight request that a tee is attached to.
let mockOnAttachTee = null;

// A tee reads one Flight render in the same process. Each test reads the same
// model through the tee and through the bytes, and compares what Fizz renders.
describe('ReactFlightTurbopackDOMTee', () => {
  function loadModules() {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;

    mockOnAttachTee = null;
    jest.mock('react-server/src/ReactFlightServer', () => {
      const actual = jest.requireActual('react-server/src/ReactFlightServer');
      return {
        ...actual,
        __esModule: true,
        attachTee(request, tee) {
          actual.attachTee(request, tee);
          if (mockOnAttachTee !== null) {
            mockOnAttachTee(request);
          }
        },
      };
    });

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.node'),
    );
    jest.mock('react-server-dom-turbopack/static', () =>
      require('react-server-dom-turbopack/static.node'),
    );
    ReactServer = require('react');
    FlightReactDOM = require('react-dom');
    ReactServerDOMServer = require('react-server-dom-turbopack/server');
    ReactServerDOMStaticServer = require('react-server-dom-turbopack/static');

    const TurbopackMock = require('./utils/TurbopackMock');
    clientExports = TurbopackMock.clientExports;
    serverExports = TurbopackMock.serverExports;
    turbopackMap = TurbopackMock.turbopackMap;
    turbopackModuleLoading = TurbopackMock.moduleLoading;

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-turbopack/server');
    jest.unmock('react-server-dom-turbopack/static');
    jest.mock('react-server-dom-turbopack/client', () =>
      jest.requireActual('react-server-dom-turbopack/client.node'),
    );

    React = require('react');
    ReactDOMServer = require('react-dom/server.node');
    ReactDOMFizzStatic = require('react-dom/static.node');
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
    Stream = require('stream');
  }

  beforeEach(loadModules);

  const manifest = () => ({
    moduleMap: null,
    moduleLoading: turbopackModuleLoading,
  });

  function readResult(stream) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const writable = new Stream.PassThrough();
      writable.setEncoding('utf8');
      writable.on('data', chunk => {
        buffer += chunk;
      });
      writable.on('error', error => {
        reject(error);
      });
      writable.on('end', () => {
        resolve(buffer);
      });
      stream.pipe(writable);
    });
  }

  // Starts a Flight render of `model`. With `useTee`, the render also writes
  // to a tee, which the returned `read` reads from. Otherwise `read` reads the
  // bytes. `read` has to be called from the reader's context.
  function startFlight(model, useTee, options) {
    const tee = useTee
      ? ReactServerDOMClient.createTee(manifest(), options && options.tee)
      : undefined;
    const readable = new Stream.PassThrough();
    const flight = ReactServerDOMServer.renderToPipeableStream(
      model,
      turbopackMap,
      {
        ...(options && options.flight),
        tee,
      },
    );
    flight.pipe(readable);
    let response = null;
    return {
      tee,
      flight,
      read() {
        if (response === null) {
          response = useTee
            ? ReactServerDOMClient.createFromTee(tee)
            : ReactServerDOMClient.createFromNodeStream(
                readable,
                manifest(),
                options && options.tee,
              );
        }
        return response;
      },
    };
  }

  function createClientRoot(flight) {
    return function ClientRoot() {
      return React.use(flight.read());
    };
  }

  // Renders the Client Component that reads `flight` with Fizz.
  async function renderFizz(flight, options) {
    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        React.createElement(createClientRoot(flight)),
        options && options.fizz,
      ),
    );
    return readResult(ssrStream);
  }

  // The Flight render runs to completion before Fizz starts, so every row,
  // hint and preinit arrives before the reader exists.
  async function renderAfterFlight(createModel, useTee, options) {
    let flight;
    await serverAct(() => {
      flight = startFlight(createModel(), useTee, options);
    });
    if (options && options.afterFlight) {
      options.afterFlight();
    }
    return renderFizz(flight, options);
  }

  // Reads one render through the tee and, as the browser would, through its
  // bytes.
  async function readTeeAndBytes(model, onError) {
    const tee = ReactServerDOMClient.createTee(manifest());
    const readable = new Stream.PassThrough();
    let fromTee;
    let fromBytes;
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(model, turbopackMap, {
        tee,
        onError,
      }).pipe(readable);
      fromTee = ReactServerDOMClient.createFromTee(tee);
      fromBytes = ReactServerDOMClient.createFromNodeStream(
        readable,
        manifest(),
      );
    });
    return {fromTee: await fromTee, fromBytes: await fromBytes, tee};
  }

  // @gate enableFlightTee
  it('builds model rows by value, copying every object and array', async () => {
    const data = {a: 1, list: [1, 'two', null, true]};
    const model = {data, date: new Date(0), text: '$escaped'};
    const {fromTee, fromBytes, tee} = await readTeeAndBytes(model);
    expect(fromTee).toEqual(fromBytes);
    expect(tee._rowsByValue).toBeGreaterThan(0);
    // SSR never shares an object with the server, so it only sees what the
    // walk read.
    expect(fromTee).not.toBe(model);
    expect(fromTee.data).not.toBe(data);
    expect(fromTee.data.list).not.toBe(data.list);
  });

  // @gate enableFlightTee
  it('deletes undefined in objects and keeps it in arrays', async () => {
    const {fromTee, fromBytes} = await readTeeAndBytes({
      obj: {a: undefined, b: 1},
      arr: [undefined, 1],
    });
    expect(fromTee).toEqual(fromBytes);
    expect('a' in fromBytes.obj).toBe(false);
    expect('a' in fromTee.obj).toBe(false);
    expect(0 in fromTee.arr).toBe(true);
  });

  // @gate enableFlightTee
  it('decodes values that need it, like an invalid Date or a Map subclass', async () => {
    class MyMap extends Map {}
    class MySet extends Set {}
    const {fromTee, fromBytes} = await readTeeAndBytes({
      invalid: new Date(NaN),
      date: new Date(0),
      big: 10n,
      nan: NaN,
      map: new MyMap([['a', 1]]),
      set: new MySet([1]),
      text: '$escaped',
    });
    expect(fromTee).toEqual(fromBytes);
    expect(fromTee.invalid).toBe(null);
    expect(fromTee.date).toEqual(new Date(0));
    expect(Object.getPrototypeOf(fromTee.map)).toBe(Map.prototype);
    expect(Object.getPrototypeOf(fromTee.set)).toBe(Set.prototype);
    expect(fromTee.text).toBe('$escaped');
  });

  // @gate enableFlightTee
  it('fills in an element whose props were written earlier in the row', async () => {
    function readElement(node) {
      // An element that waited on a reference is wrapped in a lazy.
      return node._payload !== undefined ? node._payload.value : node;
    }
    const element = ReactServer.createElement('div', {a: 1});
    const {fromTee, fromBytes} = await readTeeAndBytes({
      props: element.props,
      element,
    });
    expect(readElement(fromBytes.element).props).toBe(fromBytes.props);
    expect(readElement(fromTee.element).props).toBe(fromTee.props);
    expect(fromTee.props).toEqual({a: 1});
  });

  // @gate enableFlightTee && enableFlightLedgers
  it('reads the same Ledger totals as the bytes', async () => {
    const ledgers = [
      ReactServer.createBitLedger(),
      ReactServer.createMaskLedger(),
      ReactServer.createMinLedger(),
      ReactServer.createMaxLedger(),
      ReactServer.createSetLedger(),
    ];
    function Page() {
      ReactServer.addToLedger(ledgers[1], 1);
      ReactServer.addToLedger(ledgers[2], 60);
      ReactServer.addToLedger(ledgers[4], 'shell');
      // Some entries are added after the shell, in a later row.
      return ReactServer.createElement(
        'div',
        null,
        Promise.resolve().then(() => {
          ReactServer.addToLedger(ledgers[0]);
          ReactServer.addToLedger(ledgers[1], 2);
          ReactServer.addToLedger(ledgers[3], 40);
          ReactServer.addToLedger(ledgers[4], 'late');
          return 'done';
        }),
      );
    }
    function App() {
      return {
        page: ReactServer.captureLedgers(
          ReactServer.createElement(Page),
          ledgers,
        ),
        empty: ReactServer.captureLedgers(null, ledgers),
      };
    }
    const {fromTee, fromBytes} = await readTeeAndBytes(
      ReactServer.createElement(App),
    );
    const expected = [true, 3, 60, 40, new Set(['shell', 'late'])];
    expect(await Promise.all(fromBytes.page.ledgers)).toEqual(expected);
    expect(await Promise.all(fromTee.page.ledgers)).toEqual(expected);
    expect(await Promise.all(fromTee.empty.ledgers)).toEqual(
      await Promise.all(fromBytes.empty.ledgers),
    );
  });

  // @gate enableFlightTee
  it('shares a Map referenced twice in one row, like the browser', async () => {
    const map = new Map([['a', {b: 1}]]);
    const {fromTee, fromBytes} = await readTeeAndBytes({x: map, y: [map]});
    expect(fromTee).toEqual(fromBytes);
    expect(fromBytes.y[0]).toBe(fromBytes.x);
    expect(fromTee.y[0]).toBe(fromTee.x);
  });

  // @gate enableFlightTee
  it('resolves a cycle through an element’s props', async () => {
    function Client({data}) {
      return React.createElement(
        'span',
        null,
        data.self === data ? data.self.label : 'not the same object',
      );
    }
    const ClientReference = clientExports(Client);
    function createModel() {
      const data = {label: 'cyclic'};
      data.self = data;
      return ReactServer.createElement(ClientReference, {data});
    }
    const html = await renderAfterFlight(createModel, true);
    expect(html).toBe(await renderAfterFlight(createModel, false));
    expect(html).toContain('cyclic');
  });

  // @gate enableFlightTee
  it('reads an iterator the server drained, and keyed Server Components', async () => {
    function* items() {
      yield ReactServer.createElement('li', {key: 'a'}, 'a');
      yield ReactServer.createElement('li', {key: 'b'}, 'b');
    }
    function Item({label}) {
      return ReactServer.createElement('span', null, label);
    }
    function createModel() {
      const keyed = ReactServer.createElement(Item, {key: 'k', label: 'one'});
      return ReactServer.createElement('div', null, keyed, [
        keyed,
        ReactServer.createElement(Item, {key: 'm', label: 'two'}),
      ]);
    }
    expect(await renderAfterFlight(createModel, true)).toBe(
      await renderAfterFlight(createModel, false),
    );
    const {fromTee, fromBytes} = await readTeeAndBytes({
      node: createModel(),
      drained: items(),
    });
    expect(Array.from(fromTee.drained)).toEqual(Array.from(fromBytes.drained));
    fromTee.drained = fromBytes.drained = null;
    expect(fromTee).toEqual(fromBytes);
  });

  // @gate enableFlightTee
  it('fills in references inside props that resolve later', async () => {
    function Client({value, children}) {
      return React.createElement('p', null, React.use(value), children);
    }
    let resolveChunk;
    const ClientReference = clientExports(
      Client,
      'path/to/async-chunk.js',
      new Promise(resolve => (resolveChunk = resolve)),
    );
    async function Later() {
      await Promise.resolve();
      return ReactServer.createElement('b', null, 'later');
    }
    function createModel() {
      return ReactServer.createElement(
        ClientReference,
        {value: Promise.resolve('resolved')},
        ReactServer.createElement(Later),
      );
    }
    // Both Flight renders finish before Fizz starts, and the chunk loads only
    // once both Fizz renders are waiting on it.
    let flights;
    await serverAct(() => {
      flights = {
        tee: startFlight(createModel(), true),
        bytes: startFlight(createModel(), false),
      };
    });
    const fromTee = renderFizz(flights.tee);
    const fromBytes = renderFizz(flights.bytes);
    await serverAct(() => resolveChunk());
    expect(await fromTee).toBe(await fromBytes);
    expect(await fromTee).toContain('later');
  });

  // @gate enableFlightTee
  it('makes the element around an errored row an errored lazy', async () => {
    function Client({children}) {
      return React.createElement('div', null, children);
    }
    const ClientReference = clientExports(Client);
    function Throws() {
      throw new Error('server error');
    }
    function createModel() {
      return ReactServer.createElement(
        'section',
        null,
        ReactServer.createElement(
          ReactServer.Suspense,
          {fallback: 'loading'},
          ReactServer.createElement(
            ClientReference,
            null,
            ReactServer.createElement(Throws),
          ),
        ),
      );
    }
    const options = {
      flight: {onError: () => 'digest'},
      fizz: {onError() {}},
    };
    let html;
    await serverAct(async () => {
      html = {
        tee: await renderAfterFlight(createModel, true, options),
        bytes: await renderAfterFlight(createModel, false, options),
      };
    });
    // DEV puts the error's stack in the HTML. It's created on a different
    // stack with a tee.
    const withoutStack = markup => markup.replace(/ data-stck="[^"]*"/g, '');
    expect(withoutStack(html.tee)).toBe(withoutStack(html.bytes));
    expect(html.tee).toContain('loading');
  });

  // @gate enableFlightTee
  it('moves debug info onto elements, without writing to the server’s arrays', async () => {
    const shared = ['a', 'b'];
    function Component() {
      return shared;
    }
    function createModel() {
      return {node: ReactServer.createElement(Component)};
    }
    const {fromTee, fromBytes} = await readTeeAndBytes(createModel());
    expect(fromTee).toEqual(fromBytes);
    expect(Object.getOwnPropertyNames(shared)).toEqual(['0', '1', 'length']);

    // A row whose value is a reference to an array another row wrote.
    const items = ['c', 'd'];
    const referenced = await readTeeAndBytes({
      items,
      later: Promise.resolve(items),
    });
    expect(await referenced.fromTee.later).toEqual(
      await referenced.fromBytes.later,
    );
    expect(Object.getOwnPropertyNames(items)).toEqual(['0', '1', 'length']);

    if (__DEV__) {
      const names = value =>
        (value._debugInfo || []).map(info => info.name).filter(Boolean);
      expect(names(fromTee.node)).toEqual(names(fromBytes.node));
      expect(names(fromTee.node)).toEqual(['Component']);
    }
  });

  // SSR has to see what parsing the bytes gives, so it doesn't see what the
  // wire doesn't carry, and a getter is read once.

  // @gate enableFlightTee
  it('copies an object with a getter, reading it once', async () => {
    let reads = 0;
    const data = {
      get value() {
        return ++reads;
      },
    };
    const {fromTee, fromBytes} = await readTeeAndBytes({data});
    expect(fromTee).toEqual(fromBytes);
    expect(fromTee.data).not.toBe(data);
    expect(fromTee.data.value).toBe(1);
    // DEV reads each value once more, only to warn about it.
    expect(reads).toBe(__DEV__ ? 2 : 1);
    expect(Object.getOwnPropertyDescriptor(fromTee.data, 'value').get).toBe(
      undefined,
    );
  });

  // Two readers of one render can agree with each other and still differ from
  // a render without a tee, so this compares the bytes with and without one.
  // @gate enableFlightTee
  it('reads the first item of an array once, as a render without a tee does', async () => {
    function createModel() {
      let reads = 0;
      const list = [];
      Object.defineProperty(list, '0', {
        get() {
          return ++reads;
        },
        enumerable: true,
      });
      return {list};
    }
    async function renderWire(useTee) {
      const tee = useTee
        ? ReactServerDOMClient.createTee(manifest())
        : undefined;
      const readable = new Stream.PassThrough();
      const result = readResult(readable);
      await serverAct(() => {
        ReactServerDOMServer.renderToPipeableStream(
          createModel(),
          turbopackMap,
          {tee},
        ).pipe(readable);
        if (useTee) {
          ReactServerDOMClient.createFromTee(tee);
        }
      });
      // Leave out the time origin, which DEV writes and differs per render.
      return (await result).replace(/^:N[\d.]+\n/m, '');
    }
    const withoutTee = await renderWire(false);
    const withTee = await renderWire(true);
    expect(withTee).toBe(withoutTee);
    const {fromTee, fromBytes} = await readTeeAndBytes(createModel());
    expect(fromTee).toEqual(fromBytes);
  });

  // @gate enableFlightTee
  it('leaves out symbol keys and non-enumerable properties', async () => {
    const withSymbol = {a: 1, [Symbol('hidden')]: 2};
    const withHidden = {a: 1};
    Object.defineProperty(withHidden, 'hidden', {value: 2, enumerable: false});
    const {fromTee, fromBytes} = await readTeeAndBytes({
      withSymbol,
      withHidden,
    });
    assertConsoleErrorDev([
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Objects with symbol properties like hidden are not supported.\n' +
        '  {withSymbol: {a: 1}, withHidden: {a: 1}}\n' +
        '               ^^^^^^',
      'Only plain objects can be passed to Client Components from Server Components. ' +
        'Classes or other objects with methods are not supported.\n' +
        '  {withSymbol: {a: 1}, withHidden: {a: 1}}\n' +
        '                                   ^^^^^^',
    ]);
    expect(fromTee).toEqual(fromBytes);
    expect(Object.getOwnPropertySymbols(fromTee.withSymbol)).toEqual([]);
    expect('hidden' in fromTee.withHidden).toBe(false);
  });

  // @gate enableFlightTee
  it('copies an object from another realm and an array with a hole', async () => {
    const vm = require('vm');
    // eslint-disable-next-line no-sparse-arrays
    const holey = [1, , 3];
    const otherRealm = vm.runInNewContext('({a: 1})');
    const withProto = JSON.parse('{"__proto__": {"x": 1}, "a": 1}');
    const {fromTee, fromBytes} = await readTeeAndBytes({
      holey,
      otherRealm,
      withProto,
    });
    assertConsoleErrorDev([
      'Expected not to serialize an object with own property `__proto__`. When parsed this property will be omitted.\n' +
        '  {__proto__: {x: 1}, a: 1}\n' +
        '              ^^^^^^',
    ]);
    expect(fromTee).toEqual(fromBytes);
    expect(1 in fromTee.holey).toBe(true);
    expect(Object.getPrototypeOf(fromTee.otherRealm)).toBe(Object.prototype);
    // So that a merge on SSR can't set a prototype.
    expect(
      Object.prototype.hasOwnProperty.call(fromTee.withProto, '__proto__'),
    ).toBe(false);
    expect({...fromTee.withProto}).toEqual({a: 1});
  });

  // Writes `createModel()` with and without a tee, and returns both byte
  // streams. `afterRender` runs after each render, e.g. to assert warnings.
  async function writeBytesWithAndWithoutTee(createModel, afterRender) {
    const results = [];
    for (let i = 0; i < 2; i++) {
      const useTee = i === 0;
      let bytes;
      await serverAct(() => {
        const tee = useTee
          ? ReactServerDOMClient.createTee(manifest())
          : undefined;
        bytes = readResult(
          ReactServerDOMServer.renderToPipeableStream(
            createModel(),
            turbopackMap,
            {tee},
          ),
        );
        if (useTee) {
          ReactServerDOMClient.createFromTee(tee);
        }
      });
      afterRender();
      results.push(await bytes);
    }
    return {withTee: results[0], withoutTee: results[1]};
  }

  // @gate enableFlightTee
  it('writes the same bytes with a tee for an own __proto__ key anywhere', async () => {
    function Client({value}) {
      return React.createElement('span', null, JSON.stringify(value));
    }
    const ClientReference = clientExports(Client);
    const withProto = () =>
      JSON.parse('{"a": "$x", "__proto__": {"x": 1}, "b": 1}');
    const createModel = () => ({
      top: withProto(),
      first: JSON.parse('{"__proto__": [1, 2], "date": "$d"}'),
      inArray: [withProto(), 2, withProto()],
      nested: {inner: withProto(), after: new Date(0)},
      beforeEncoded: {v: withProto(), big: 1n},
      inMap: new Map([['k', withProto()]]),
      inProps: ReactServer.createElement(ClientReference, {
        value: withProto(),
      }),
      later: Promise.resolve(withProto()),
    });
    const warning = (object, value) =>
      'Expected not to serialize an object with own property `__proto__`. ' +
      'When parsed this property will be omitted.\n' +
      '  ' +
      object +
      '\n' +
      ' '.repeat(2 + object.indexOf(value)) +
      '^'.repeat(value.length);
    const plain = warning('{a: "$x", __proto__: {x: 1}, b: 1}', '{x: 1}');
    const {withTee, withoutTee} = await writeBytesWithAndWithoutTee(
      createModel,
      () =>
        assertConsoleErrorDev([
          plain,
          warning('{__proto__: [1, 2], date: "$d"}', '[1, 2]'),
          plain,
          plain,
          plain,
          plain,
          plain,
          plain,
          plain,
        ]),
    );
    // DEV rows also carry timings and stacks, which differ between renders.
    const protoRows = bytes =>
      bytes.split('\n').filter(row => row.includes('"__proto__"'));
    expect(protoRows(withTee).length).toBeGreaterThan(1);
    expect(protoRows(withTee)).toEqual(protoRows(withoutTee));
    if (!__DEV__) {
      expect(withTee).toBe(withoutTee);
    }
  });

  // @gate enableFlightTee
  it('copies array subclasses, so later rows can reference into them', async () => {
    class MyArray extends Array {}
    const item = {x: 1};
    const sub = MyArray.from([item, 2]);
    const match = 'abc'.match(/b/);
    // A later row references `item` by its path inside `sub`.
    const {fromTee, fromBytes} = await readTeeAndBytes({
      sub,
      match,
      later: Promise.resolve(item),
    });
    expect(Object.getPrototypeOf(fromTee.sub)).toBe(Array.prototype);
    expect(fromTee.sub).toEqual(fromBytes.sub);
    expect(await fromTee.later).toBe(fromTee.sub[0]);
    expect(await fromBytes.later).toBe(fromBytes.sub[0]);
    // An array with extra properties gets only its items.
    expect(fromTee.match).toEqual(fromBytes.match);
    expect(fromTee.match.input).toBe(undefined);
  });

  // @gate enableFlightTee
  it('doesn’t render the input of a regex match during SSR', async () => {
    function Client({match}) {
      return React.createElement('span', null, String(match.input));
    }
    const ClientReference = clientExports(Client);
    function createModel() {
      const match = 'public secret-token-value'.match(/public/);
      return ReactServer.createElement(ClientReference, {match});
    }
    const html = await renderAfterFlight(createModel, true);
    expect(html).toBe(await renderAfterFlight(createModel, false));
    expect(html).not.toContain('secret-token-value');
  });

  // @gate enableTaint
  it('writes the value a getter returned when it was checked, without a tee', async () => {
    const secret = 'secret-token-value';
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      process,
      secret,
    );
    let reads = 0;
    const data = {
      get token() {
        return ++reads === 1 ? 'public' : secret;
      },
    };
    let bytes;
    await serverAct(() => {
      bytes = readResult(
        ReactServerDOMServer.renderToPipeableStream({data}, turbopackMap),
      );
    });
    const text = await bytes;
    expect(text).toContain('public');
    expect(text).not.toContain(secret);
  });

  // @gate enableFlightTee && enableTaint
  it('never shows SSR or the bytes a value a getter returns after it was read', async () => {
    const secret = 'secret-token-value';
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      process,
      secret,
    );
    let reads = 0;
    const data = {
      get token() {
        return ++reads === 1 ? 'public' : secret;
      },
    };
    const {fromTee, fromBytes} = await readTeeAndBytes({data});
    expect(fromTee.data.token).toBe('public');
    expect(fromBytes.data.token).toBe('public');
    expect(reads).toBe(__DEV__ ? 2 : 1);
  });

  // @gate enableFlightTee
  it('dispatches hints and module preinits that arrive before the reader', async () => {
    function Client() {
      return React.createElement('span', null, 'client');
    }
    const ClientReference = clientExports(
      Client,
      'path/to/chunk.js',
      Promise.resolve(),
    );
    function App() {
      FlightReactDOM.preload('style.css', {as: 'style'});
      FlightReactDOM.preinit('script.js', {as: 'script'});
      return ReactServer.createElement(ClientReference);
    }
    const createModel = () => ReactServer.createElement(App);

    const fromBytes = await renderAfterFlight(createModel, false);
    const fromTee = await renderAfterFlight(createModel, true);
    expect(fromBytes).toContain('<link rel="preload" href="style.css"');
    expect(fromBytes).toContain('<script src="script.js" async="">');
    expect(fromBytes).toContain('<script src="/prefix/path/to/chunk.js"');
    // The same resources, but not in the same order. A flush writes import
    // rows before hint rows, and the tee gets rows in the order the server
    // emits them, so the chunk's preinit comes after the hints.
    const resources = html => html.match(/<(script|link)[^>]*>/g).sort();
    expect(resources(fromTee)).toEqual(resources(fromBytes));
    expect(fromTee.replace(/<(script|link)[^>]*>(<\/script>)?/g, '')).toBe(
      fromBytes.replace(/<(script|link)[^>]*>(<\/script>)?/g, ''),
    );
  });

  // @gate enableFlightTee
  it('dispatches hints that arrive after the reader in its context', async () => {
    let resolveLate;
    let late;
    async function Late() {
      await late;
      FlightReactDOM.preinit('late.js', {as: 'script'});
      return ReactServer.createElement('b', null, 'late');
    }
    function App() {
      FlightReactDOM.preload('early.css', {as: 'style'});
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(
          ReactServer.Suspense,
          {fallback: 'loading'},
          ReactServer.createElement(Late),
        ),
      );
    }
    const createModel = () => ReactServer.createElement(App);

    async function render(useTee) {
      late = new Promise(resolve => {
        resolveLate = resolve;
      });
      let ssrStream;
      await serverAct(() => {
        const flight = startFlight(createModel(), useTee);
        ssrStream = ReactDOMServer.renderToPipeableStream(
          React.createElement(createClientRoot(flight)),
        );
      });
      const result = readResult(ssrStream);
      await serverAct(() => resolveLate());
      return result;
    }

    const fromBytes = await render(false);
    const fromTee = await render(true);
    expect(fromBytes).toContain('href="early.css"');
    // Reading the bytes in the same process, the late hint's row is parsed in
    // the stream's data event, which runs inside the Flight render's flush.
    // Fizz can't find its request there, so the hint is lost. The tee
    // dispatches it in the reader's context.
    expect(fromBytes).not.toContain('src="late.js"');
    if (gate(flags => flags.enableFlightTee)) {
      expect(fromTee).toBe(
        fromBytes.replace(
          '<div hidden id="S:0">',
          '<script src="late.js" async=""></script><div hidden id="S:0">',
        ),
      );
    } else {
      expect(fromTee).toBe(fromBytes);
    }
  });

  // @gate enableFlightTee
  it('dispatches hints that arrive after the reader in its context without AsyncLocalStorage.snapshot', async () => {
    let resolveLate;
    const late = new Promise(resolve => {
      resolveLate = resolve;
    });
    async function Late() {
      await late;
      FlightReactDOM.preinit('late.js', {as: 'script'});
      return ReactServer.createElement('b', null, 'late');
    }
    const model = ReactServer.createElement(
      ReactServer.Suspense,
      {fallback: 'loading'},
      ReactServer.createElement(Late),
    );
    const snapshot = AsyncLocalStorage.snapshot;
    AsyncLocalStorage.snapshot = undefined;
    try {
      let ssrStream;
      await serverAct(() => {
        const flight = startFlight(model, true);
        ssrStream = ReactDOMServer.renderToPipeableStream(
          React.createElement(createClientRoot(flight)),
        );
      });
      const result = readResult(ssrStream);
      await serverAct(() => resolveLate());
      const html = await result;
      expect(html).toContain('src="late.js"');
      expect(html).toContain('<b>late</b>');
    } finally {
      AsyncLocalStorage.snapshot = snapshot;
    }
  });

  // @gate enableFlightTee
  it('does not show an AsyncLocalStorage store set in RSC to Client Components during SSR', async () => {
    const storage = new AsyncLocalStorage();
    const seen = [];
    function ReadStore({label}) {
      seen.push(label + ':' + String(storage.getStore()));
      return React.createElement('i', null, label);
    }
    const ReadStoreReference = clientExports(ReadStore);
    let resolveData;
    async function AsyncChild() {
      // Resolves after Fizz has suspended on this row, so Fizz renders it in
      // a retry after a ping. Through the tee, the ping comes from inside the
      // RSC render, and the retry still runs in Fizz's own context.
      await new Promise(resolve => {
        resolveData = resolve;
      });
      return ReactServer.createElement(ReadStoreReference, {label: 'async'});
    }
    function App() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(ReadStoreReference, {label: 'sync'}),
        ReactServer.createElement(
          ReactServer.Suspense,
          {fallback: 'loading'},
          ReactServer.createElement(AsyncChild),
        ),
      );
    }
    const createModel = () => ReactServer.createElement(App);

    async function render(useTee) {
      seen.length = 0;
      let ssrStream;
      await serverAct(() => {
        const flight = storage.run('rsc', () =>
          startFlight(createModel(), useTee),
        );
        ssrStream = storage.run('ssr', () =>
          ReactDOMServer.renderToPipeableStream(
            React.createElement(createClientRoot(flight)),
          ),
        );
      });
      expect(seen).toEqual(['sync:ssr']);
      await serverAct(() => resolveData());
      const html = await readResult(ssrStream);
      return {html, seen: seen.slice().sort()};
    }

    const fromBytes = await render(false);
    const fromTee = await render(true);
    expect(fromBytes.seen).toEqual(['async:ssr', 'sync:ssr']);
    expect(fromTee).toEqual(fromBytes);
  });

  // @gate enableFlightTee
  it('errors pending rows when the render is aborted', async () => {
    async function Never() {
      await new Promise(() => {});
    }
    function App() {
      return ReactServer.createElement(
        'div',
        null,
        'ready',
        ReactServer.createElement(
          ReactServer.Suspense,
          {fallback: 'loading'},
          ReactServer.createElement(Never),
        ),
      );
    }

    async function render(useTee) {
      const errors = [];
      let flight;
      let ssrStream;
      await serverAct(() => {
        flight = startFlight(ReactServer.createElement(App), useTee, {
          flight: {
            onError(error) {
              return 'digest:' + error.message;
            },
          },
        });
        ssrStream = ReactDOMServer.renderToPipeableStream(
          React.createElement(createClientRoot(flight)),
          {
            onError(error, info) {
              errors.push(error.digest);
            },
          },
        );
      });
      const result = readResult(ssrStream);
      await serverAct(() => flight.flight.abort(new Error('stop')));
      // In DEV the message carries a stack that depends on where it was read.
      const html = (await result).replace(
        /\$RX\("B:0",.*<\/script>/,
        '$RX("B:0")</script>',
      );
      return {html, errors};
    }

    const fromBytes = await render(false);
    const fromTee = await render(true);
    expect(fromBytes.errors).toEqual(['digest:stop']);
    // The boundary errored after the shell, so a script marks it.
    expect(fromBytes.html).toContain('$RX("B:0"');
    expect(fromTee).toEqual(fromBytes);
  });

  // @gate enableFlightTee
  it('halts pending rows in an aborted prerender', async () => {
    async function Never() {
      await new Promise(() => {});
    }
    function App() {
      return ReactServer.createElement(
        'div',
        null,
        'ready',
        ReactServer.createElement(
          ReactServer.Suspense,
          {fallback: 'loading'},
          ReactServer.createElement(Never),
        ),
      );
    }

    async function prerender(useTee) {
      const flightController = new AbortController();
      const fizzController = new AbortController();
      const options = {unstable_allowPartialStream: true};
      let tee;
      let preludePromise;
      await serverAct(() => {
        tee = useTee
          ? ReactServerDOMClient.createTee(manifest(), options)
          : undefined;
        preludePromise = ReactServerDOMStaticServer.prerenderToNodeStream(
          ReactServer.createElement(App),
          turbopackMap,
          {signal: flightController.signal, tee, onError() {}},
        );
      });
      // Both renders are aborted at the same point, as in Next.js's staged
      // rendering.
      let response = null;
      let fizzPromise;
      function ClientRoot() {
        return React.use(response);
      }
      await serverAct(() => {
        if (useTee) {
          response = ReactServerDOMClient.createFromTee(tee);
          fizzPromise = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {signal: fizzController.signal, onError() {}},
          );
        }
      });
      await serverAct(() => {
        flightController.abort();
      });
      const {prelude: flightPrelude} = await preludePromise;
      if (!useTee) {
        response = ReactServerDOMClient.createFromNodeStream(
          flightPrelude,
          manifest(),
          options,
        );
        await serverAct(() => {
          fizzPromise = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {signal: fizzController.signal, onError() {}},
          );
        });
      }
      await serverAct(() => {
        fizzController.abort();
      });
      const {prelude} = await fizzPromise;
      return readResult(prelude);
    }

    const fromBytes = await prerender(false);
    const fromTee = await prerender(true);
    expect(fromBytes).toContain('ready');
    expect(fromBytes).toContain('loading');
    expect(fromBytes).not.toContain('<!--$!-->');
    expect(fromTee).toBe(fromBytes);
  });

  // A prerender's rows are written once its prelude is read, which here is
  // after the tee's reader has changed the typed arrays it read.
  // @gate enableFlightTee
  it('gives the reader its own copy of binary rows', async () => {
    const tee = ReactServerDOMClient.createTee(manifest());
    let preludePromise;
    await serverAct(() => {
      preludePromise = ReactServerDOMStaticServer.prerenderToNodeStream(
        {
          bytes: new Uint8Array([1, 2, 3]),
          buffer: new Uint8Array([4, 5, 6]).buffer,
        },
        turbopackMap,
        {tee},
      );
    });
    const fromTee = await ReactServerDOMClient.createFromTee(tee);
    fromTee.bytes[0] = 0;
    new Uint8Array(fromTee.buffer)[0] = 0;

    const {prelude} = await preludePromise;
    const fromBytes = await ReactServerDOMClient.createFromNodeStream(
      prelude,
      manifest(),
    );
    expect(Array.from(fromBytes.bytes)).toEqual([1, 2, 3]);
    expect(Array.from(new Uint8Array(fromBytes.buffer))).toEqual([4, 5, 6]);
  });

  // @gate enableFlightTee
  it('closes when a halted prerender has emitted every row, before its prelude is read', async () => {
    const never = new Promise(() => {});
    async function read(useTee) {
      const controller = new AbortController();
      const tee = useTee
        ? ReactServerDOMClient.createTee(manifest())
        : undefined;
      let preludePromise;
      await serverAct(() => {
        preludePromise = ReactServerDOMStaticServer.prerenderToNodeStream(
          {ready: 'yes', later: never},
          turbopackMap,
          {signal: controller.signal, tee},
        );
      });
      await serverAct(() => controller.abort());
      const {prelude} = await preludePromise;
      // The tee's prelude is never read.
      const root = useTee
        ? ReactServerDOMClient.createFromTee(tee)
        : ReactServerDOMClient.createFromNodeStream(prelude, manifest());
      const value = await root;
      let reason = null;
      await serverAct(async () => {
        try {
          await value.later;
        } catch (error) {
          reason = error.message;
        }
      });
      return {ready: value.ready, reason};
    }
    const fromBytes = await read(false);
    const fromTee = await read(true);
    expect(fromBytes).toEqual({ready: 'yes', reason: 'Connection closed.'});
    expect(fromTee).toEqual(fromBytes);
  });

  // The tee builds every row as soon as the server emits it, while the bytes
  // only reach the reader when the destination is written. So Fizz can
  // resolve more before its first flush. This records what lands in a
  // prerender's shell when Fizz is aborted right after the Flight render's
  // first pass.
  // @gate enableFlightTee
  it('records what lands in a prerender shell', async () => {
    async function Child() {
      await Promise.resolve();
      return ReactServer.createElement('b', null, 'child');
    }
    function App() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(
          ReactServer.Suspense,
          {fallback: 'loading'},
          ReactServer.createElement(Child),
        ),
      );
    }

    async function prerender(useTee) {
      const fizzController = new AbortController();
      let fizzPromise;
      await serverAct(() => {
        const flight = startFlight(ReactServer.createElement(App), useTee);
        fizzPromise = ReactDOMFizzStatic.prerenderToNodeStream(
          React.createElement(createClientRoot(flight)),
          {signal: fizzController.signal, onError() {}},
        );
        // Abort Fizz in the macrotask after the Flight render starts.
        setImmediate(() => fizzController.abort());
      });
      const {prelude} = await fizzPromise;
      return readResult(prelude);
    }

    const fromBytes = await prerender(false);
    const fromTee = await prerender(true);
    expect(fromBytes).toContain('child');
    expect(fromTee).toBe(fromBytes);
  });

  // @gate enableFlightTee
  it('replays a console log once', async () => {
    const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
      () => {},
    );
    // The server patches the console when it loads, so load it again on top
    // of the mock.
    loadModules();

    function App() {
      console.log('hello');
      return 'hi';
    }
    async function render(useTee) {
      mockConsoleLog.mockClear();
      let flight;
      await serverAct(() => {
        flight = startFlight(ReactServer.createElement(App), useTee, {
          tee: {replayConsoleLogs: true},
        });
        flight.read();
      });
      expect(await flight.read()).toBe('hi');
      // A replayed log has a badge in front of the message.
      return mockConsoleLog.mock.calls.filter(
        args => typeof args[0] === 'string' && args[0].endsWith('hello'),
      ).length;
    }
    const fromBytes = await render(false);
    // The Server Component's own log, and in DEV its replay.
    expect(fromBytes).toBe(__DEV__ ? 2 : 1);
    expect(await render(true)).toBe(fromBytes);
  });

  // @gate enableFlightTee
  it('records a log made while serializing another log', async () => {
    const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
      () => {},
    );
    loadModules();

    function App() {
      console.log({
        label: 'outer',
        get inner() {
          console.log('inner log');
          return 1;
        },
      });
      return 'hi';
    }
    async function render(useTee) {
      mockConsoleLog.mockClear();
      let flight;
      await serverAct(() => {
        flight = startFlight(ReactServer.createElement(App), useTee, {
          tee: {replayConsoleLogs: true},
        });
        flight.read();
      });
      expect(await flight.read()).toBe('hi');
      return mockConsoleLog.mock.calls.filter(
        args => typeof args[0] === 'string' && args[0].endsWith('inner log'),
      ).length;
    }
    const fromBytes = await render(false);
    if (__DEV__) {
      // Serializing the outer log reads the getter, which logs too.
      expect(fromBytes).toBeGreaterThan(0);
    }
    expect(await render(true)).toBe(fromBytes);
  });

  // While the tee's reader replays one request's log, a log from another
  // request is still recorded into that request's own stream.
  // @gate enableFlightTee
  it('records a log from another request made while a replay runs', async () => {
    const {AsyncResource} = require('async_hooks');
    let logFromOther = null;
    const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
      (...args) => {
        if (
          logFromOther !== null &&
          typeof args[0] === 'string' &&
          args[0].endsWith('hello') &&
          args[0] !== 'hello'
        ) {
          // This is the tee's replay. Log from the other request, in its
          // own async context.
          const log = logFromOther;
          logFromOther = null;
          log();
        }
      },
    );
    loadModules();

    let release;
    const released = new Promise(resolve => {
      release = resolve;
    });
    async function Other() {
      logFromOther = AsyncResource.bind(() => console.log('from other'));
      await released;
      return 'other';
    }
    async function App() {
      // Logged outside the render pass, so only the async context tells the
      // server which request it belongs to.
      await null;
      console.log('hello');
      return 'hi';
    }

    const otherReadable = new Stream.PassThrough();
    const otherBytes = readResult(otherReadable);
    let flight;
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(Other),
        turbopackMap,
      ).pipe(otherReadable);
    });
    expect(logFromOther).not.toBe(null);
    await serverAct(() => {
      flight = startFlight(ReactServer.createElement(App), true, {
        tee: {replayConsoleLogs: true},
      });
      flight.read();
    });
    expect(await flight.read()).toBe('hi');
    await serverAct(() => release());
    const bytes = await otherBytes;
    if (__DEV__) {
      expect(logFromOther).toBe(null);
      expect(bytes).toContain('from other');
    }
    expect(
      mockConsoleLog.mock.calls.filter(args => args[0] === 'from other'),
    ).toHaveLength(__DEV__ ? 1 : 0);
  });

  // Resolves to whether `ref` was collected.
  async function isCollected(ref) {
    // Get a handle on the garbage collector without running the test with --expose-gc.
    const v8 = require('v8');
    const vm = require('vm');
    v8.setFlagsFromString('--expose-gc');
    const gc = vm.runInNewContext('gc');
    v8.setFlagsFromString('--no-expose-gc');
    const {setImmediate: realSetImmediate} = require('timers');
    for (let i = 0; i < 10 && ref.deref() !== undefined; i++) {
      await new Promise(resolve => realSetImmediate(resolve));
      gc();
    }
    return ref.deref() === undefined;
  }

  // @gate enableFlightTee
  it("lets go of the reader's context once the render has closed", async () => {
    const storage = new AsyncLocalStorage();
    let store = {};
    const storeRef = new WeakRef(store);
    let tee = ReactServerDOMClient.createTee(manifest());
    let root;
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(
        // The promise is never read, so the result keeps the response alive.
        {value: 1, unread: Promise.resolve(2)},
        turbopackMap,
        {tee},
      ).pipe(new Stream.PassThrough());
      root = storage.run(store, () => ReactServerDOMClient.createFromTee(tee));
    });
    const result = await root;
    store = tee = root = null;
    expect(await isCollected(storeRef)).toBe(true);
    expect(result.value).toBe(1);
  });

  // @gate enableFlightTee
  it("does not keep the reader's context when it is read after the render has closed", async () => {
    const storage = new AsyncLocalStorage();
    let store = {};
    const storeRef = new WeakRef(store);
    let tee = ReactServerDOMClient.createTee(manifest());
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(
        {value: 1, unread: Promise.resolve(2)},
        turbopackMap,
        {tee},
      ).pipe(new Stream.PassThrough());
    });
    // Every row has been emitted, and the tee has closed.
    let root = storage.run(store, () =>
      ReactServerDOMClient.createFromTee(tee),
    );
    const result = await root;
    store = tee = root = null;
    expect(await isCollected(storeRef)).toBe(true);
    expect(result.value).toBe(1);
  });

  // @gate enableFlightTee
  it("lets go of the reader's context once the render has failed", async () => {
    const storage = new AsyncLocalStorage();
    let store = {};
    const storeRef = new WeakRef(store);
    const tee = ReactServerDOMClient.createTee(manifest());
    function App() {
      throw new Error('boom');
    }
    let calls = 0;
    let root;
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(App),
        turbopackMap,
        {
          tee,
          // Throwing from onError while handling a render error is a fatal
          // error. The fatal error is reported again, which passes.
          onError() {
            if (calls++ === 0) {
              throw new Error('fatal');
            }
          },
        },
      ).pipe(new Stream.PassThrough());
      root = storage.run(store, () => ReactServerDOMClient.createFromTee(tee));
    });
    await expect(root).rejects.toThrow('fatal');
    store = root = null;
    // The tee is still held, and it holds the response.
    expect(await isCollected(storeRef)).toBe(true);
    expect(tee).not.toBe(null);
  });

  // @gate enableFlightTee
  it('can only be read once', async () => {
    const flight = startFlight({hello: 'world'}, true);
    expect(flight.read()).not.toBe(null);
    expect(() => ReactServerDOMClient.createFromTee(flight.tee)).toThrow(
      'A Flight tee can only be read once. Read any later copies from the stream.',
    );
    await serverAct(() => {});
  });

  // @gate enableFlightTee
  it('throws when the tee is passed to a second render', async () => {
    const tee = ReactServerDOMClient.createTee(manifest());
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(
        {which: 'first'},
        turbopackMap,
        {
          tee,
        },
      ).pipe(new Stream.PassThrough());
    });
    expect(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {which: 'second'},
        turbopackMap,
        {
          tee,
        },
      ),
    ).toThrow(
      'The tee is already being written to by another render. A tee can ' +
        'only be passed to one render.',
    );
    expect(await ReactServerDOMClient.createFromTee(tee)).toEqual({
      which: 'first',
    });
  });

  // @gate enableFlightTee
  it('reads the rest of the render after writing a row throws', async () => {
    function createModel() {
      let reads = 0;
      const flaky = {};
      // DEV reads each value a second time to warn about it, and that read
      // throws.
      Object.defineProperty(flaky, 'value', {
        enumerable: true,
        get() {
          if (reads++ > 0) {
            throw new Error('second read');
          }
          return 'first read';
        },
      });
      return {
        flaky: Promise.resolve(flaky),
        after: new Promise(resolve => setTimeout(resolve, 0, {ok: true})),
      };
    }
    const settle = async thenable => {
      try {
        return await thenable;
      } catch (x) {
        return 'error';
      }
    };
    const results = [];
    for (let i = 0; i < 2; i++) {
      const flight = startFlight(createModel(), i === 0, {
        flight: {onError() {}},
      });
      await serverAct(async () => {
        const root = await flight.read();
        results.push({
          flaky: await settle(root.flaky),
          after: await settle(root.after),
        });
      });
    }
    expect(results[0]).toEqual(results[1]);
    expect(results[0].after).toEqual({ok: true});
  });

  // Renders `createModel(flight)` once through a tee and once through the
  // bytes, and settles each of the root's `keys`, or reports it as pending
  // if it's still waiting once the render is done.
  async function settleTeeAndBytes(createModel, keys, ssrManifest) {
    const results = {};
    for (let i = 0; i < 2; i++) {
      const useTee = i === 0;
      const tee = useTee
        ? ReactServerDOMClient.createTee(ssrManifest || manifest())
        : undefined;
      const readable = new Stream.PassThrough();
      let response;
      await serverAct(() => {
        const flight = {};
        const model = createModel(flight);
        Object.assign(
          flight,
          ReactServerDOMServer.renderToPipeableStream(model, turbopackMap, {
            tee,
            onError() {},
          }),
        );
        flight.pipe(readable);
        response = useTee
          ? ReactServerDOMClient.createFromTee(tee)
          : ReactServerDOMClient.createFromNodeStream(
              readable,
              ssrManifest || manifest(),
            );
      });
      const result = {};
      await serverAct(async () => {
        let root;
        try {
          root = await response;
        } catch (x) {
          result.root = 'rejected';
          return;
        }
        for (let j = 0; j < keys.length; j++) {
          result[keys[j]] = await Promise.race([
            Promise.resolve(root[keys[j]]).then(
              () => 'resolved',
              () => 'rejected',
            ),
            new Promise(resolve => setTimeout(resolve, 10, 'pending')),
          ]);
        }
      });
      results[useTee ? 'tee' : 'bytes'] = result;
    }
    return results;
  }

  // A Map's entries are their own row, built inside the row that holds the
  // Map. A later row can reference into it without going through the outer
  // row, so the outer row erroring has to reject the Map's reference to it.
  function createMapInErroredRow(makeRowFail) {
    return flight => {
      const shared = {x: 1};
      const inMap = {back: shared};
      const row = {shared, map: new Map([['key', inMap]])};
      makeRowFail(row, flight);
      return {
        row: Promise.resolve(row),
        later: new Promise(resolve => setTimeout(resolve, 0, inMap)),
      };
    };
  }

  // @gate enableFlightTee
  it('rejects rows built inside a row whose walk threw', async () => {
    const results = await settleTeeAndBytes(
      createMapInErroredRow(row => {
        Object.defineProperty(row, 'bad', {
          enumerable: true,
          get() {
            throw new Error('getter error');
          },
        });
      }),
      ['row', 'later'],
    );
    expect(results.bytes).toEqual({row: 'rejected', later: 'rejected'});
    expect(results.tee).toEqual(results.bytes);
  });

  // @gate enableFlightTee
  it('rejects rows built inside a row the tee failed to decode', async () => {
    const action = serverExports(async function action() {});
    const results = await settleTeeAndBytes(
      createMapInErroredRow(row => {
        // Decoded after the Map, and missing from the manifest below.
        row.action = action;
      }),
      ['row', 'later'],
      {
        moduleMap: null,
        serverModuleMap: {},
        moduleLoading: turbopackModuleLoading,
      },
    );
    expect(results.tee).toEqual({row: 'rejected', later: 'rejected'});
    // TODO: In production, parsing the bytes leaves `later` pending.
    if (__DEV__) {
      expect(results.bytes).toEqual(results.tee);
    }
  });

  // @gate enableFlightTee
  it('doesn’t decode what’s under an own __proto__ key', async () => {
    const action = serverExports(async function action() {});
    // The server reference is missing from this manifest, so decoding it
    // would error the row.
    const ssrManifest = {
      moduleMap: null,
      serverModuleMap: {},
      moduleLoading: turbopackModuleLoading,
    };
    const model = {a: 1};
    Object.defineProperty(model, '__proto__', {
      value: {action},
      enumerable: true,
      writable: true,
      configurable: true,
    });
    const tee = ReactServerDOMClient.createTee(ssrManifest);
    const readable = new Stream.PassThrough();
    let fromTee;
    let fromBytes;
    await serverAct(() => {
      ReactServerDOMServer.renderToPipeableStream(model, turbopackMap, {
        tee,
      }).pipe(readable);
      fromTee = ReactServerDOMClient.createFromTee(tee);
      fromBytes = ReactServerDOMClient.createFromNodeStream(
        readable,
        ssrManifest,
      );
    });
    assertConsoleErrorDev([
      'Expected not to serialize an object with own property `__proto__`. ' +
        'When parsed this property will be omitted.\n' +
        '  {a: 1, __proto__: {action: ...}}\n' +
        '                    ^^^^^^^^^^^^^',
    ]);
    const settle = thenable =>
      Promise.resolve(thenable).then(
        value => value,
        () => 'rejected',
      );
    expect(await settle(fromBytes)).toEqual({a: 1});
    expect(await settle(fromTee)).toEqual({a: 1});
  });

  // @gate enableFlightTee
  it('errors a row whose walk throws while the render aborts', async () => {
    const results = await settleTeeAndBytes(
      flight => {
        const row = {};
        Object.defineProperty(row, 'bad', {
          enumerable: true,
          get() {
            flight.abort(new Error('aborted'));
            throw new Error('getter error');
          },
        });
        return {
          row: Promise.resolve(row),
          other: new Promise(() => {}),
        };
      },
      ['row', 'other'],
    );
    expect(results.bytes).toEqual({row: 'rejected', other: 'rejected'});
    expect(results.tee).toEqual(results.bytes);
  });

  // @gate enableFlightTee
  it('errors a row whose toJSON throws, and reads the rest', async () => {
    const results = await settleTeeAndBytes(
      () => ({
        row: Promise.resolve({
          a: {
            toJSON() {
              throw new Error('toJSON error');
            },
          },
        }),
        after: new Promise(resolve => setTimeout(resolve, 0, {ok: true})),
      }),
      ['row', 'after'],
    );
    expect(results.bytes).toEqual({row: 'rejected', after: 'resolved'});
    expect(results.tee).toEqual(results.bytes);
  });

  // @gate enableFlightTee
  it('reads a ReadableStream and an async iterable', async () => {
    async function read(useTee) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({a: 1});
          controller.enqueue(ReactServer.createElement('b', null, 'two'));
          setTimeout(() => {
            controller.enqueue('$three');
            controller.close();
          }, 0);
        },
      });
      async function* iterate() {
        yield {c: [3]};
        await new Promise(resolve => setTimeout(resolve, 0));
        yield new Date(0);
      }
      const flight = startFlight({stream, iterable: iterate()}, useTee);
      let values;
      await serverAct(async () => {
        const root = await flight.read();
        const fromStream = [];
        const reader = root.stream.getReader();
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            break;
          }
          fromStream.push(value);
        }
        const fromIterable = [];
        const iterator = root.iterable[Symbol.asyncIterator]();
        while (true) {
          const {done, value} = await iterator.next();
          if (done) {
            break;
          }
          fromIterable.push(value);
        }
        values = {fromStream, fromIterable};
      });
      return values;
    }
    const fromTee = await read(true);
    const fromBytes = await read(false);
    expect(fromTee).toEqual(fromBytes);
    expect(fromTee.fromStream.length).toBe(3);
    expect(fromTee.fromIterable.length).toBe(2);
  });

  // Renders `model` to bytes, with or without a tee created from `ssrManifest`.
  async function renderBytes(model, ssrManifest, onRootError) {
    const tee =
      ssrManifest !== undefined
        ? ReactServerDOMClient.createTee(ssrManifest)
        : undefined;
    let bytes;
    let root;
    await serverAct(async () => {
      const readable = new Stream.PassThrough();
      const result = readResult(readable);
      ReactServerDOMServer.renderToPipeableStream(model, turbopackMap, {
        tee,
        onError() {},
      }).pipe(readable);
      if (tee !== undefined) {
        root = ReactServerDOMClient.createFromTee(tee);
        root.then(() => {}, onRootError || (() => {}));
      }
      // Without the time origin row, which DEV emits with the current time.
      bytes = (await result).replace(/^:N[^\n]*\n/m, '');
    });
    return {bytes, root};
  }

  // @gate enableFlightTee
  it('writes the same bytes when the tee fails to read a row', async () => {
    function Client() {
      return null;
    }
    const ClientReference = clientExports(Client);
    // The SSR manifest has neither module, so the tee fails to resolve them.
    const missing = {
      moduleMap: {},
      serverModuleMap: {},
      moduleLoading: turbopackModuleLoading,
    };

    // A client reference is an import row, which the tee reads from the wire.
    // Failing to read it errors the tee's response.
    const createImport = () => ({client: ClientReference});
    const importRender = await renderBytes(createImport(), missing);
    expect(importRender.bytes).toBe((await renderBytes(createImport())).bytes);
    await expect(importRender.root).rejects.toThrow(
      'in the React Server Consumer Manifest',
    );

    if (!__DEV__) {
      // Even if a listener on the response throws while it errors. In DEV
      // listeners run in a native Promise, so they can't throw here.
      const throwingListener = await renderBytes(
        createImport(),
        missing,
        () => {
          throw new Error('listener error');
        },
      );
      expect(throwingListener.bytes).toBe(importRender.bytes);
    }

    // A server reference is decoded while the tee builds the row that holds
    // it. Failing to decode it errors that row.
    const action = serverExports(async function action() {});
    const createAction = () => ({action});
    const actionRender = await renderBytes(createAction(), missing);
    expect(actionRender.bytes).toBe((await renderBytes(createAction())).bytes);
    await expect(actionRender.root).rejects.toThrow(
      'Could not find the module',
    );
  });

  // @gate enableFlightTee
  it('errors a row that aborts after the tee fails to read a row', async () => {
    function Client() {
      return null;
    }
    const ClientReference = clientExports(Client);
    const missing = {
      moduleMap: {},
      serverModuleMap: {},
      moduleLoading: turbopackModuleLoading,
    };
    // Failing to read the client reference's import row errors the tee's
    // response while the row that holds it is still being built. Then the
    // getter aborts that row. The server's error row for it comes after the
    // tee has stopped reading, so the row has to error when it aborts.
    const createRow = () => ({
      client: ClientReference,
      get bad() {
        throw new Error('Cannot serialize');
      },
    });

    const inPromise = await settleTeeAndBytes(
      () => ({row: Promise.resolve(createRow())}),
      ['row'],
      missing,
    );
    expect(inPromise.tee).toEqual(inPromise.bytes);
    expect(inPromise.tee).toEqual({row: 'rejected'});

    const asRoot = await settleTeeAndBytes(createRow, [], missing);
    expect(asRoot.tee).toEqual(asRoot.bytes);
    expect(asRoot.tee).toEqual({root: 'rejected'});

    if (!__DEV__) {
      // Even if a listener on the row throws while it errors. In DEV listeners
      // run in a native Promise, so they can't throw here.
      const errors = [];
      await serverAct(async () => {
        const tee = ReactServerDOMClient.createTee(missing);
        const readable = new Stream.PassThrough();
        const result = readResult(readable);
        ReactServerDOMServer.renderToPipeableStream(createRow(), turbopackMap, {
          tee,
          onError(x) {
            errors.push(x.message);
          },
        }).pipe(readable);
        ReactServerDOMClient.createFromTee(tee).then(
          () => {},
          () => {
            throw new Error('listener error');
          },
        );
        await result;
      });
      expect(errors).toEqual(['Cannot serialize']);
    }
  });

  // @gate enableFlightTee
  it('throws when the tee is read before it is passed to a render', () => {
    const tee = ReactServerDOMClient.createTee(manifest());
    expect(() => ReactServerDOMClient.createFromTee(tee)).toThrow(
      'The tee has not been passed to a render. Pass it as the `tee` option ' +
        'of a Flight render before reading it.',
    );
  });

  // @gate enableFlightTee
  it('rejects the root when the render fails fatally', async () => {
    function App() {
      throw new Error('boom');
    }
    async function read(useTee) {
      let flight;
      let calls = 0;
      await serverAct(() => {
        flight = startFlight(ReactServer.createElement(App), useTee, {
          flight: {
            // Throwing from onError while handling a render error is a
            // fatal error. The fatal error is reported again, which passes.
            onError(error) {
              if (calls++ === 0) {
                throw new Error('fatal');
              }
            },
          },
        });
        flight.read();
      });
      try {
        await flight.read();
        return null;
      } catch (error) {
        return error.message;
      }
    }
    const fromBytes = await read(false);
    const fromTee = await read(true);
    expect(fromBytes).toBe('fatal');
    expect(fromTee).toBe(fromBytes);
  });

  // @gate enableFlightTee
  it('keeps _owner and _debugStack without a debug channel', async () => {
    function Parent() {
      return ReactServer.createElement('span', null, 'hi');
    }
    async function read(useTee) {
      let flight;
      await serverAct(() => {
        flight = startFlight({node: ReactServer.createElement(Parent)}, useTee);
        flight.read();
      });
      const root = await flight.read();
      const node = root.node;
      return {
        type: node.type,
        owner: __DEV__ ? node._owner && node._owner.name : undefined,
        hasStack: __DEV__ ? node._debugStack instanceof Error : undefined,
      };
    }
    const fromBytes = await read(false);
    const fromTee = await read(true);
    expect(fromBytes).toEqual(
      __DEV__
        ? {type: 'span', owner: 'Parent', hasStack: true}
        : {type: 'span', owner: undefined, hasStack: undefined},
    );
    expect(fromTee).toEqual(fromBytes);
  });

  // @gate enableFlightTee
  it('reads binary and large text rows', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const text = 'x'.repeat(2000);
    async function read(useTee) {
      let flight;
      await serverAct(() => {
        flight = startFlight(
          {bytes, ints: new Int32Array([7, 8]), text},
          useTee,
        );
        flight.read();
      });
      return flight.read();
    }
    const fromBytes = await read(false);
    const fromTee = await read(true);
    expect(fromTee).toEqual(fromBytes);
    expect(fromTee.bytes).not.toBe(bytes);
    expect(fromTee.bytes.buffer).not.toBe(bytes.buffer);
    fromTee.bytes[0] = 9;
    expect(bytes[0]).toBe(1);
  });

  // @gate enableFlightTee && enableTaint
  it('checks, writes and tees the same bytes when a typed array’s buffer changes', async () => {
    const secret = new Uint32Array([0x5ec2e7, 0x70ce4, 0x5ec2e7, 0x70ce4]);
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret to the client',
      process,
      secret,
    );
    function Client({bytes}) {
      return React.createElement('pre', null, Array.from(bytes).join(','));
    }
    const ClientReference = clientExports(Client);
    function createModel() {
      const bytes = new Uint32Array([1, 2, 3, 4]);
      const publicBuffer = bytes.buffer;
      let reads = 0;
      // Answers with the public bytes on the first read only.
      Object.defineProperty(bytes, 'buffer', {
        get() {
          return reads++ === 0 ? publicBuffer : secret.buffer;
        },
      });
      return ReactServer.createElement(ClientReference, {bytes});
    }
    const html = await renderAfterFlight(createModel, true);
    expect(html).toBe(await renderAfterFlight(createModel, false));
    expect(html).toContain('<pre>1,2,3,4</pre>');
  });

  // @gate enableFlightTee && enableTaint
  it('writes and tees the bytes it checked when the buffer changes after the check', async () => {
    // Larger than a view, so writing it reads the buffer's `resizable`.
    const length = 1250;
    const secret = new Uint32Array(length).fill(0x5ec2e7);
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret to the client',
      process,
      secret,
    );
    function Client({bytes}) {
      return React.createElement(
        'pre',
        null,
        bytes[0] + ',' + bytes[length - 1],
      );
    }
    const ClientReference = clientExports(Client);
    function createModel() {
      const bytes = new Uint32Array(length).fill(1);
      const buffer = bytes.buffer;
      // Overwrites the bytes with the secret when it's read.
      Object.defineProperty(buffer, 'resizable', {
        get() {
          new Uint32Array(buffer).set(secret);
          return false;
        },
      });
      return ReactServer.createElement(ClientReference, {bytes});
    }
    let warned = false;
    const options = {
      afterFlight() {
        if (!warned && !ArrayBuffer.prototype.hasOwnProperty('detached')) {
          // Once per module instance.
          warned = true;
          assertConsoleErrorDev([
            'React copied a partial view into a fresh buffer as a safety precaution because the environment does not implement ArrayBuffer.prototype.detached. ' +
              'This negatively impacts performance. ' +
              'Please upgrade to a modern Node.js version.',
          ]);
        }
      },
    };
    const html = await renderAfterFlight(createModel, true, options);
    expect(html).toBe(await renderAfterFlight(createModel, false, options));
    expect(html).toContain('<pre>1,1</pre>');
  });

  // @gate enableFlightTee && enableTaint
  it('writes and tees the length it checked when a resizable buffer grows', async () => {
    const secret = new Uint32Array(1251).fill(0x5ec2e7);
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret to the client',
      process,
      secret,
    );
    function Client({bytes}) {
      return React.createElement('pre', null, bytes.length);
    }
    const ClientReference = clientExports(Client);
    function createModel() {
      const buffer = new ArrayBuffer(5000, {maxByteLength: 5004});
      const bytes = new Uint32Array(buffer).fill(1);
      // Without a length, a view of a resizable buffer tracks its length.
      Object.defineProperty(bytes, 'byteLength', {get: () => undefined});
      // Grows the buffer to the secret's length, and fills it with the
      // secret, when it's read.
      Object.defineProperty(buffer, 'byteLength', {
        get() {
          buffer.resize(5004);
          new Uint32Array(buffer).set(secret);
          return 5004;
        },
      });
      return ReactServer.createElement(ClientReference, {bytes});
    }
    let warned = false;
    const options = {
      afterFlight() {
        if (!warned && !ArrayBuffer.prototype.hasOwnProperty('detached')) {
          // Once per module instance.
          warned = true;
          assertConsoleErrorDev([
            'React copied a partial view into a fresh buffer as a safety precaution because the environment does not implement ArrayBuffer.prototype.detached. ' +
              'This negatively impacts performance. ' +
              'Please upgrade to a modern Node.js version.',
          ]);
        }
      },
    };
    const html = await renderAfterFlight(createModel, true, options);
    expect(html).toBe(await renderAfterFlight(createModel, false, options));
    expect(html).toContain('<pre>1250</pre>');
  });

  // The server side of a tee, read by a tee that records what it's handed
  // instead of a Flight Client.
  describe('with a recording tee', () => {
    function readBytes(stream) {
      return new Promise((resolve, reject) => {
        let buffer = '';
        const writable = new Stream.PassThrough();
        // One character per byte, like the binary rows in the log below.
        writable.setEncoding('latin1');
        writable.on('data', chunk => {
          buffer += chunk;
        });
        writable.on('error', error => {
          reject(error);
        });
        writable.on('end', () => {
          resolve(buffer);
        });
        stream.pipe(writable);
      });
    }

    // A tee that logs what the server hands it, with each row in the form the
    // destination gets it.
    function createRecordingTee() {
      const log = [];
      let connected = false;
      const tee = {
        _version: ReactServer.version,
        _dispatcher: {
          c() {
            if (connected) {
              return false;
            }
            connected = true;
            return true;
          },
          // Declines every model row, so the server sends it as a wire row.
          b() {
            return null;
          },
          w(t, row) {
            log.push(row);
          },
          t(t, id, text) {
            const length = Buffer.byteLength(text, 'utf8');
            log.push(id.toString(16) + ':T' + length.toString(16) + ',' + text);
          },
          y(t, id, tag, bytes) {
            log.push(
              id.toString(16) +
                ':' +
                String.fromCharCode(tag) +
                bytes.byteLength.toString(16) +
                ',' +
                // Copies the bytes, as a tee has to.
                Buffer.from(bytes).toString('latin1'),
            );
          },
          C() {
            log.push('close');
          },
          X(t, error) {
            log.push('error: ' + error.message);
          },
        },
      };
      return {tee, log};
    }

    // Removes each row the tee got from the bytes, and returns what's left.
    function removeRows(bytes, log) {
      let rest = bytes;
      for (let i = 0; i < log.length; i++) {
        const row = log[i];
        if (row === 'close') {
          continue;
        }
        const index = rest.indexOf(row);
        if (index === -1) {
          throw new Error('The bytes do not contain the row ' + row);
        }
        rest = rest.slice(0, index) + rest.slice(index + row.length);
      }
      return rest;
    }

    async function renderRecorded(model, tee, options) {
      let bytes;
      await serverAct(async () => {
        const readable = new Stream.PassThrough();
        const result = readBytes(readable);
        ReactServerDOMServer.renderToPipeableStream(model, turbopackMap, {
          ...options,
          tee,
        }).pipe(readable);
        bytes = await result;
      });
      return bytes;
    }

    it('hands the tee every row the destination gets, then closes it', async () => {
      function Client() {
        return null;
      }
      const ClientReference = clientExports(Client);
      async function Server() {
        FlightReactDOM.preload('/style.css', {as: 'style'});
        await null;
        return ReactServer.createElement(ClientReference, {
          shared,
          again: shared,
        });
      }
      const shared = {date: new Date(0)};
      const model = {
        node: ReactServer.createElement(Server),
        symbol: Symbol.for('tee'),
        later: Promise.resolve('later'),
        failed: Promise.reject(new Error('failed')),
        bytes: new Uint8Array([1, 2, 255]),
        ints: new Int32Array([7, -8]),
        text: 'x'.repeat(2000),
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue('a');
            controller.close();
          },
        }),
      };
      const {tee, log} = createRecordingTee();
      const bytes = await renderRecorded(model, tee, {onError() {}});
      if (gate(flags => flags.enableFlightTee)) {
        expect(removeRows(bytes, log)).toBe('');
        expect(log.indexOf('close')).toBe(log.length - 1);
      } else {
        expect(log).toEqual([]);
      }
    });

    // @gate enableFlightTee
    it('hands the tee the length the bytes get when a resizable buffer grows', async () => {
      const buffer = new ArrayBuffer(5000, {maxByteLength: 5004});
      const bytes = new Uint8Array(buffer).fill(1);
      // Without a length, a view of a resizable buffer tracks its length.
      Object.defineProperty(bytes, 'byteLength', {get: () => undefined});
      // Grows the buffer when it's read.
      Object.defineProperty(buffer, 'byteLength', {
        get() {
          buffer.resize(5004);
          return 5004;
        },
      });
      const {tee, log} = createRecordingTee();
      const written = await renderRecorded({bytes}, tee);
      if (!ArrayBuffer.prototype.hasOwnProperty('detached')) {
        assertConsoleErrorDev([
          'React copied a partial view into a fresh buffer as a safety precaution because the environment does not implement ArrayBuffer.prototype.detached. ' +
            'This negatively impacts performance. ' +
            'Please upgrade to a modern Node.js version.',
        ]);
      }
      expect(removeRows(written, log)).toBe('');
    });

    // @gate enableFlightTee
    it('hands the tee the bytes the destination gets when the render changes them later', async () => {
      const bytes = new Uint8Array([1, 2]);
      const model = {
        bytes,
        // Rendered after the bytes are emitted, but before they're flushed.
        get later() {
          bytes[0] = 3;
          return 0;
        },
      };
      const {tee, log} = createRecordingTee();
      const written = await renderRecorded(model, tee);
      expect(removeRows(written, log)).toBe('');
      expect(written).toContain(':o2,\x01\x02');
    });

    // @gate enableFlightTee
    it('closes the tee once a render without a destination completes', async () => {
      let controller;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
        },
      });
      const {tee, log} = createRecordingTee();
      let result;
      await serverAct(() => {
        result = ReactServerDOMServer.renderToPipeableStream(
          {stream},
          turbopackMap,
          {tee},
        );
      });
      expect(log).not.toContain('close');
      await serverAct(() => {
        controller.enqueue('a');
        controller.close();
      });
      expect(log.filter(row => row === 'close')).toEqual(['close']);
      expect(log[log.length - 1]).toBe('close');
      const written = await readBytes(result.pipe(new Stream.PassThrough()));
      expect(removeRows(written, log)).toBe('');
      expect(log.filter(row => row === 'close')).toEqual(['close']);
    });

    // @gate enableFlightTee
    it('closes a prerender’s tee once every row is emitted, before its prelude is read', async () => {
      const never = new Promise(() => {});
      const controller = new AbortController();
      const {tee, log} = createRecordingTee();
      let preludePromise;
      await serverAct(() => {
        preludePromise = ReactServerDOMStaticServer.prerenderToNodeStream(
          {ready: 'yes', later: never},
          turbopackMap,
          {signal: controller.signal, tee},
        );
      });
      await serverAct(() => controller.abort());
      expect(log[log.length - 1]).toBe('close');
      const {prelude} = await preludePromise;
      expect(removeRows(await readBytes(prelude), log)).toBe('');
    });

    // @gate enableFlightTee
    it('errors the tee when the render fails fatally', async () => {
      function App() {
        throw new Error('boom');
      }
      let calls = 0;
      const {tee, log} = createRecordingTee();
      await serverAct(() => {
        ReactServerDOMServer.renderToPipeableStream(
          ReactServer.createElement(App),
          turbopackMap,
          {
            tee,
            // Throwing from onError while handling a render error is a fatal
            // error. The fatal error is reported again, which passes.
            onError() {
              if (calls++ === 0) {
                throw new Error('fatal');
              }
            },
          },
        ).pipe(new Stream.PassThrough());
      });
      expect(log).toContain('error: fatal');
      expect(log).not.toContain('close');
    });

    // @gate enableFlightTee
    it('throws when the tee is from another version', async () => {
      const {tee} = createRecordingTee();
      tee._version = '0.0.0-other';
      // Another version's dispatcher can have different methods, so the server
      // checks the version before it reads the dispatcher.
      tee._dispatcher = null;
      expect(() =>
        ReactServerDOMServer.renderToPipeableStream({a: 1}, turbopackMap, {
          tee,
        }),
      ).toThrow(
        'The tee was created by a different version of React than the one ' +
          'rendering. The Flight Client and Server must be the same version.',
      );
    });

    // @gate enableFlightTee
    it('throws when the tee is passed to a second render', async () => {
      const {tee} = createRecordingTee();
      await renderRecorded({which: 'first'}, tee);
      expect(() =>
        ReactServerDOMServer.renderToPipeableStream(
          {which: 'second'},
          turbopackMap,
          {tee},
        ),
      ).toThrow(
        'The tee is already being written to by another render. A tee can ' +
          'only be passed to one render.',
      );
    });

    // With a debug channel that can be read from, the server holds large debug
    // objects and pending promises back until the channel asks for them. The
    // tee has no debug channel to ask through, so it can't wait for them.
    // @gate enableFlightTee
    it('closes the tee when the bytes end while a two-way debug channel is open', async () => {
      function Server({data, pending}) {
        return 'hi';
      }
      const data = [];
      for (let i = 0; i < 1000; i++) {
        data.push({i});
      }
      const model = {
        node: ReactServer.createElement(Server, {
          data,
          pending: new Promise(() => {}),
        }),
      };
      const debugChannel = new Stream.Duplex({
        read() {},
        write(chunk, encoding, callback) {
          callback();
        },
      });
      const {tee, log} = createRecordingTee();
      // Resolves once the destination has ended.
      await renderRecorded(model, tee, {debugChannel});
      if (__DEV__) {
        // The server held back an object and a promise for the debug channel.
        expect(log.some(row => /\$Y[0-9a-f]+/.test(row))).toBe(true);
        expect(log.some(row => /\$Y@[0-9a-f]+/.test(row))).toBe(true);
      }
      expect(log[log.length - 1]).toBe('close');

      // Closing the debug channel releases what was held back. The tee has
      // already closed and doesn't close again.
      await serverAct(() => {
        debugChannel.push(null);
      });
      expect(log.filter(row => row === 'close')).toEqual(['close']);
    });

    // @gate enableFlightTee
    it('closes the tee after a debug row with separate content is written', async () => {
      function Server({big, bytes}) {
        return 'hi';
      }
      let resolveLater;
      const later = new Promise(resolve => (resolveLater = resolve));
      const model = {
        node: ReactServer.createElement(Server, {
          big: 'x'.repeat(3000),
          bytes: new Uint8Array(3000).fill(65),
        }),
        later,
      };
      const {tee, log} = createRecordingTee();
      let bytes;
      await serverAct(async () => {
        const readable = new Stream.PassThrough();
        const result = readBytes(readable);
        ReactServerDOMServer.renderToPipeableStream(model, turbopackMap, {
          tee,
        }).pipe(readable);
        // Let the debug rows be written before the last row is emitted.
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(log).not.toContain('close');
        resolveLater('done');
        bytes = await result;
      });
      expect(removeRows(bytes, log)).toBe('');
      expect(log.filter(row => row === 'close')).toEqual(['close']);
      expect(log[log.length - 1]).toBe('close');
    });

    // The rows of a prerender stay queued until its prelude is read. Checking
    // whether the tee can close must not scan that queue on every pass, or a
    // render with many deferred rows takes quadratic time.
    // @gate enableFlightTee
    it('closes without rescanning queued rows on every pass', async () => {
      const count = 200;
      const never = new Promise(() => {});
      let queueReads = 0;
      function countReads(array) {
        return new Proxy(array, {
          get(target, key, receiver) {
            if (typeof key === 'string' && /^\d+$/.test(key)) {
              queueReads++;
            }
            return Reflect.get(target, key, receiver);
          },
        });
      }
      mockOnAttachTee = request => {
        request.completedRegularChunks = countReads(
          request.completedRegularChunks,
        );
        if (__DEV__) {
          request.completedDebugChunks = countReads(
            request.completedDebugChunks,
          );
        }
      };
      const controller = new AbortController();
      const {tee, log} = createRecordingTee();
      await serverAct(() => {
        // Each item resolves in a timer after the one before it, so each is
        // emitted by its own work pass.
        const items = [];
        let previous = Promise.resolve();
        for (let i = 0; i < count; i++) {
          previous = previous.then(
            () => new Promise(resolve => setTimeout(() => resolve(i), 0)),
          );
          items.push(previous);
        }
        ReactServerDOMStaticServer.prerenderToNodeStream(
          {items, rest: never},
          turbopackMap,
          {signal: controller.signal, tee},
        );
      });
      await serverAct(() => controller.abort());
      // The prelude is never read, so every row is still queued.
      expect(log[log.length - 1]).toBe('close');
      expect(queueReads).toBeLessThan(count);
    });
  });
});
