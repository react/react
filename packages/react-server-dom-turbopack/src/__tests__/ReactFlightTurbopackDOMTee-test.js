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
    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        React.createElement(createClientRoot(flight)),
      ),
    );
    return readResult(ssrStream);
  }

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
    // The SSR manifest doesn't have the module, so the tee fails to resolve
    // its import row. That errors the tee's response.
    const missing = {
      moduleMap: {},
      moduleLoading: turbopackModuleLoading,
    };
    const createModel = () => ({client: ClientReference});
    const render = await renderBytes(createModel(), missing);
    expect(render.bytes).toBe((await renderBytes(createModel())).bytes);
    await expect(render.root).rejects.toThrow(
      'in the React Server Consumer Manifest',
    );

    if (!__DEV__) {
      // Even if a listener on the response throws while it errors. In DEV
      // listeners run in a native Promise, so they can't throw here.
      const throwingListener = await renderBytes(createModel(), missing, () => {
        throw new Error('listener error');
      });
      expect(throwingListener.bytes).toBe(render.bytes);
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
