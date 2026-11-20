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
  beforeEach(() => {
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
  });

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
  it('does not show an AsyncLocalStorage store set in RSC to Client Components during SSR', async () => {
    const storage = new AsyncLocalStorage();
    const seen = [];
    function ReadStore({label}) {
      seen.push(label + ':' + String(storage.getStore()));
      return React.createElement('i', null, label);
    }
    const ReadStoreReference = clientExports(ReadStore);
    async function AsyncChild() {
      await Promise.resolve();
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
  it('throws when the tee is from another version', async () => {
    const tee = ReactServerDOMClient.createTee(manifest());
    tee._version = '0.0.0-other';
    // Another version's dispatcher can have different methods, so the server
    // checks the version before it reads the dispatcher.
    tee._dispatcher = null;
    expect(() =>
      ReactServerDOMServer.renderToPipeableStream({a: 1}, turbopackMap, {tee}),
    ).toThrow(
      'The tee was created by a different version of React than the one ' +
        'rendering. The Flight Client and Server must be the same version.',
    );
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
    async function read(useTee) {
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
      queueReads = 0;
      const controller = new AbortController();
      const tee = useTee
        ? ReactServerDOMClient.createTee(manifest())
        : undefined;
      let preludePromise;
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
        preludePromise = ReactServerDOMStaticServer.prerenderToNodeStream(
          {items, rest: never},
          turbopackMap,
          {signal: controller.signal, tee},
        );
      });
      await serverAct(() => controller.abort());
      const {prelude} = await preludePromise;
      // The tee's prelude is never read, so every row is still queued.
      const root = useTee
        ? ReactServerDOMClient.createFromTee(tee)
        : ReactServerDOMClient.createFromNodeStream(prelude, manifest());
      const value = await root;
      const resolved = await serverAct(() => Promise.all(value.items));
      let reason = null;
      await serverAct(async () => {
        try {
          await value.rest;
        } catch (error) {
          reason = error.message;
        }
      });
      return {resolved, reason};
    }
    const fromBytes = await read(false);
    const fromTee = await read(true);
    expect(fromBytes).toEqual({
      resolved: Array.from({length: count}, (_, i) => i),
      reason: 'Connection closed.',
    });
    expect(fromTee).toEqual(fromBytes);
    expect(queueReads).toBeLessThan(count);
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
    const html = await renderAfterFlight(createModel, true);
    expect(html).toBe(await renderAfterFlight(createModel, false));
    expect(html).toContain('<pre>1250</pre>');
  });
});
