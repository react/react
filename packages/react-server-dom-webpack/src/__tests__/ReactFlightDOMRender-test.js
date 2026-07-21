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

// Every test in this suite renders the same model twice: once through the
// byte stream (renderToPipeableStream -> createFromNodeStream) and once
// in-process (render -> createFromRender), and asserts that the two are
// observably identical. The byte stream is the long-standing behavior, so
// it acts as the executable specification for the in-process path.

let clientExports;
let webpackMap;
let webpackModules;
let webpackModuleLoading;
let React;
let ReactDOMServer;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let FlightReactDOM;
let Stream;
let use;
let serverAct;
let assertConsoleErrorDev;

describe('ReactFlightDOMRender', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      jest.requireActual('react-server-dom-webpack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server');
    FlightReactDOM = require('react-dom');

    const WebpackMock = require('./utils/WebpackMock');
    clientExports = WebpackMock.clientExports;
    webpackMap = WebpackMock.webpackMap;
    webpackModules = WebpackMock.webpackModules;
    webpackModuleLoading = WebpackMock.moduleLoading;

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );

    React = require('react');
    ReactDOMServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');
    use = React.use;

    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
  });

  function getTranslationMap() {
    // For the SSR pass, act as if the client references resolve to the
    // same modules (identity translation), like a real server consumer
    // manifest would.
    const translationMap = {};
    for (const $$id in webpackMap) {
      const metadata = webpackMap[$$id];
      const forModule =
        translationMap[metadata.id] || (translationMap[metadata.id] = {});
      forModule[metadata.name] = metadata;
      forModule['*'] = metadata;
    }
    return translationMap;
  }

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

  const ssrManifest = {
    moduleMap: null,
    moduleLoading: null,
  };

  // Renders the model through the byte stream and returns the Response.
  async function renderThroughWire(model, serverOptions, manifest) {
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        model,
        webpackMap,
        serverOptions,
      ),
    );
    const readable = new Stream.PassThrough();
    const response = ReactServerDOMClient.createFromNodeStream(
      readable,
      manifest || ssrManifest,
    );
    stream.pipe(readable);
    // Boxed so that awaiting this async helper can't unwrap the thenable
    // Response into its root model.
    return {response};
  }

  // Renders the model in-process and returns the Response.
  async function renderInProcess(model, serverOptions, manifest) {
    let response;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(
        model,
        webpackMap,
        serverOptions,
      );
      response = ReactServerDOMClient.createFromRender(
        result,
        manifest || ssrManifest,
      );
    });
    return {response};
  }

  async function renderToHTML(response) {
    function Root() {
      return use(response);
    }
    const htmlStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(React.createElement(Root)),
    );
    return readResult(htmlStream);
  }

  // The core parity assertion: the same model must produce the same HTML
  // whether it went through the wire or not.
  async function expectSameHTML(makeModel, serverOptions, manifest) {
    const {response: wireResponse} = await renderThroughWire(
      makeModel(),
      serverOptions,
      manifest,
    );
    const wireHTML = await renderToHTML(wireResponse);
    const {response: renderResponse} = await renderInProcess(
      makeModel(),
      serverOptions,
      manifest,
    );
    const renderHTML = await renderToHTML(renderResponse);
    expect(renderHTML).toBe(wireHTML);
    return renderHTML;
  }

  it('renders host elements, keys and fragments identically', async () => {
    function makeModel() {
      function Item({index}) {
        return ReactServer.createElement('li', null, 'Item ', String(index));
      }
      function App() {
        const items = [];
        for (let i = 0; i < 10; i++) {
          items.push(ReactServer.createElement(Item, {key: i, index: i}));
        }
        return ReactServer.createElement(
          'div',
          {className: 'root'},
          ReactServer.createElement(
            ReactServer.Fragment,
            null,
            ReactServer.createElement('h1', null, 'Hello'),
            ReactServer.createElement('ul', null, items),
          ),
        );
      }
      return ReactServer.createElement(App);
    }
    const html = await expectSameHTML(makeModel);
    expect(html).toContain('Item <!-- -->9');
  });

  it('renders client component references identically', async () => {
    function Client({label, items}) {
      return React.createElement(
        'b',
        {'data-count': String(items.length)},
        label,
        ': ',
        items.join(','),
      );
    }
    const ClientRef = clientExports(Client);
    const manifest = {
      moduleMap: getTranslationMap(),
      moduleLoading: webpackModuleLoading,
    };
    function makeModel() {
      function App() {
        return ReactServer.createElement('section', null, [
          ReactServer.createElement(ClientRef, {
            key: 'a',
            label: 'first',
            items: [1, 2, 3],
          }),
          ReactServer.createElement(ClientRef, {
            key: 'b',
            label: 'second',
            items: ['x'],
          }),
        ]);
      }
      return ReactServer.createElement(App);
    }
    const html = await expectSameHTML(makeModel, undefined, manifest);
    expect(html).toContain('first');
    expect(html).toContain('data-count="3"');
  });

  it('renders async server components identically', async () => {
    function makeModel() {
      async function Inner({id}) {
        const data = await Promise.resolve('data-' + id);
        return ReactServer.createElement('i', null, data);
      }
      async function App() {
        await Promise.resolve();
        return ReactServer.createElement(
          'main',
          null,
          ReactServer.createElement(Inner, {id: 1}),
          ReactServer.createElement(Inner, {id: 2}),
        );
      }
      return ReactServer.createElement(App);
    }
    const html = await expectSameHTML(makeModel);
    expect(html).toContain('data-1');
    expect(html).toContain('data-2');
  });

  it('resolves promises and lazy values in the model identically', async () => {
    function makeModel() {
      function Inner() {
        return ReactServer.createElement('span', null, 'lazy inner');
      }
      return {
        promised: Promise.resolve('promised value'),
        element: ReactServer.createElement(
          'p',
          null,
          Promise.resolve(ReactServer.createElement(Inner)),
        ),
      };
    }
    const wire = await renderThroughWire(makeModel());
    const inProcess = await renderInProcess(makeModel());
    const wireRoot = await wire.response;
    const renderRoot = await inProcess.response;
    expect(await renderRoot.promised).toBe(await wireRoot.promised);
    const wireHTML = await renderToHTML(
      Promise.resolve(wireRoot.element) as any,
    );
    const renderHTML = await renderToHTML(
      Promise.resolve(renderRoot.element) as any,
    );
    expect(renderHTML).toBe(wireHTML);
  });

  it('decodes special value types identically', async () => {
    function makeModel() {
      return {
        date: new Date(12345),
        map: new Map([['key', {nested: true}]]),
        set: new Set(['a', 'b']),
        bigint: 42n,
        nan: NaN,
        inf: Infinity,
        neginf: -Infinity,
        negzero: -0,
        undef: undefined,
        dollar: '$looks like a ref',
        emptyString: '',
      };
    }
    const a = await (await renderThroughWire(makeModel())).response;
    const b = await (await renderInProcess(makeModel())).response;
    expect(b.date).toEqual(a.date);
    expect(b.date instanceof Date).toBe(true);
    expect(Array.from(b.map)).toEqual(Array.from(a.map));
    expect(Array.from(b.set)).toEqual(Array.from(a.set));
    expect(b.bigint).toBe(a.bigint);
    expect(b.nan).toBeNaN();
    expect(a.nan).toBeNaN();
    expect(b.inf).toBe(a.inf);
    expect(b.neginf).toBe(a.neginf);
    expect(Object.is(b.negzero, -0)).toBe(Object.is(a.negzero, -0));
    expect(b.undef).toBe(a.undef);
    expect('undef' in b).toBe('undef' in a);
    expect(b.dollar).toBe(a.dollar);
    expect(b.emptyString).toBe(a.emptyString);
  });

  it('decodes binary data identically', async () => {
    function makeModel() {
      const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
      return {
        arrayBuffer: buffer,
        uint8: new Uint8Array([9, 8, 7]),
        int32: new Int32Array([100000, -100000]),
        float64: new Float64Array([0.5, -2.25]),
        dataView: new DataView(new Uint8Array([1, 2, 3, 4]).buffer),
      };
    }
    const a = await (await renderThroughWire(makeModel())).response;
    const b = await (await renderInProcess(makeModel())).response;
    expect(new Uint8Array(b.arrayBuffer)).toEqual(
      new Uint8Array(a.arrayBuffer),
    );
    expect(b.uint8).toEqual(a.uint8);
    expect(b.int32).toEqual(a.int32);
    expect(b.float64).toEqual(a.float64);
    expect(b.dataView.getInt8(3)).toBe(a.dataView.getInt8(3));
    expect(b.dataView.byteLength).toBe(a.dataView.byteLength);
  });

  it('decodes large strings (text rows) identically', async () => {
    const big = 'ab'.repeat(2048) + 'end';
    function makeModel() {
      return {big, nested: {alsoBig: big + '!'}};
    }
    const a = await (await renderThroughWire(makeModel())).response;
    const b = await (await renderInProcess(makeModel())).response;
    expect(b.big).toBe(a.big);
    expect(b.nested.alsoBig).toBe(a.nested.alsoBig);
  });

  it('streams ReadableStream values identically', async () => {
    function makeModel() {
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue('first');
            controller.enqueue({second: 2});
            controller.close();
          },
        }),
      };
    }
    async function readAll(boxed) {
      const reader = (await boxed.response).stream.getReader();
      const out = [];
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          break;
        }
        out.push(value);
      }
      return out;
    }
    const a = await serverAct(async () =>
      readAll(await renderThroughWire(makeModel())),
    );
    const b = await serverAct(async () =>
      readAll(await renderInProcess(makeModel())),
    );
    expect(b).toEqual(a);
  });

  it('streams async iterables identically, including the return value', async () => {
    function makeModel() {
      return {
        iterable: (async function* () {
          yield 'one';
          yield 'two';
          return 'done value';
        })(),
      };
    }
    async function readAll(boxed) {
      const iterator = (await boxed.response).iterable[Symbol.asyncIterator]();
      const out = [];
      while (true) {
        const {done, value} = await iterator.next();
        out.push({done, value});
        if (done) {
          break;
        }
      }
      return out;
    }
    const a = await serverAct(async () =>
      readAll(await renderThroughWire(makeModel())),
    );
    const b = await serverAct(async () =>
      readAll(await renderInProcess(makeModel())),
    );
    expect(b).toEqual(a);
  });

  it('handles suspended subtrees that resolve later identically', async () => {
    async function run(renderPath) {
      let resolveData;
      const dataPromise = new Promise(resolve => (resolveData = resolve));
      async function Slow() {
        const text = await dataPromise;
        return ReactServer.createElement('b', null, text);
      }
      function App() {
        return ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement('span', null, 'ready'),
          ReactServer.createElement(Slow),
        );
      }
      const {response} = await renderPath(ReactServer.createElement(App));
      const htmlPromise = renderToHTML(response);
      await serverAct(() => resolveData('slow data'));
      return htmlPromise;
    }
    const wireHTML = await run(model => renderThroughWire(model));
    const renderHTML = await run(model => renderInProcess(model));
    expect(renderHTML).toBe(wireHTML);
    expect(renderHTML).toContain('slow data');
  });

  it('propagates errors with digests identically', async () => {
    function makeOptions(errors) {
      return {
        onError(x) {
          errors.push(x.message);
          return 'digest("' + x.message + '")';
        },
      };
    }
    function makeModel() {
      function Bad() {
        throw new Error('kaboom');
      }
      function App() {
        return ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement(Bad),
        );
      }
      return ReactServer.createElement(App);
    }
    async function getError(response) {
      try {
        await renderToHTML(response);
      } catch (x) {
        return x;
      }
      throw new Error('expected the render to fail');
    }
    const wireErrors = [];
    const wireError = await getError(
      (await renderThroughWire(makeModel(), makeOptions(wireErrors))).response,
    );
    if (__DEV__) {
      assertConsoleErrorDev(['[Server] Error: kaboom\n    in <stack>']);
    }
    const renderErrors = [];
    const renderError = await getError(
      (await renderInProcess(makeModel(), makeOptions(renderErrors))).response,
    );
    if (__DEV__) {
      assertConsoleErrorDev(['[Server] Error: kaboom\n    in <stack>']);
    }
    expect(renderErrors).toEqual(wireErrors);
    expect(renderError.digest).toBe(wireError.digest);
    expect(renderError.message).toBe(wireError.message);
  });

  it('errors every pending task identically when the render is aborted', async () => {
    const never = new Promise(() => {});
    function makeModel() {
      async function Hanging() {
        await never;
        return null;
      }
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement('span', null, 'sync part'),
        ReactServer.createElement(Hanging),
      );
    }
    // Wire path.
    const wireErrors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(makeModel(), webpackMap, {
        onError(x) {
          wireErrors.push(x.message);
          return 'aborted-digest';
        },
      }),
    );
    const readable = new Stream.PassThrough();
    const wireResponse = ReactServerDOMClient.createFromNodeStream(
      readable,
      ssrManifest,
    );
    stream.pipe(readable);
    await serverAct(() => stream.abort(new Error('goodbye')));
    let wireError = null;
    try {
      await renderToHTML(wireResponse);
    } catch (x) {
      wireError = x;
    }
    if (__DEV__) {
      assertConsoleErrorDev(['[Server] Error: goodbye\n    in <stack>']);
    }

    // In-process path, aborted through the AbortSignal option.
    const renderErrors = [];
    const controller = new AbortController();
    let renderResponse;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap, {
        signal: controller.signal,
        onError(x) {
          renderErrors.push(x.message);
          return 'aborted-digest';
        },
      });
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        ssrManifest,
      );
    });
    await serverAct(() => controller.abort(new Error('goodbye')));
    let renderError = null;
    try {
      await renderToHTML(renderResponse);
    } catch (x) {
      renderError = x;
    }
    if (__DEV__) {
      assertConsoleErrorDev(['[Server] Error: goodbye\n    in <stack>']);
    }
    expect(renderErrors).toEqual(wireErrors);
    expect(renderError).not.toBe(null);
    expect(renderError.digest).toBe(wireError.digest);
  });

  it('dedupes shared objects identically', async () => {
    function makeModel() {
      const shared = {shared: 'value', list: [1, 2, 3]};
      return {a: shared, b: shared, c: {deep: shared}};
    }
    const a = await (await renderThroughWire(makeModel())).response;
    const b = await (await renderInProcess(makeModel())).response;
    expect(a.a).toBe(a.b);
    expect(b.a).toBe(b.b);
    expect(b.c.deep).toBe(b.a);
    expect(b.a).toEqual(a.a);
  });

  it('dispatches hints identically', async () => {
    function makeModel() {
      async function App() {
        FlightReactDOM.prefetchDNS('example.com');
        FlightReactDOM.preload('style.css', {as: 'style'});
        await 1;
        FlightReactDOM.preconnect('later.example.com');
        return ReactServer.createElement('div', null, 'with hints');
      }
      return ReactServer.createElement(App);
    }
    function captureHints() {
      // Capture what the Flight client dispatches through the react-dom
      // dispatcher on the consuming side. Read the dispatcher from the same
      // module the client does: in source runs that is the shared internals
      // module (the www entry points re-export a different object); built
      // bundles read the public react-dom export.
      let ReactDOMSharedInternals;
      try {
        ReactDOMSharedInternals =
          require('shared/ReactDOMSharedInternals').default;
      } catch (x) {
        ReactDOMSharedInternals =
          require('react-dom').__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      }
      const previousDispatcher = ReactDOMSharedInternals.d;
      const hints = [];
      ReactDOMSharedInternals.d = {
        f: previousDispatcher.f,
        r: previousDispatcher.r,
        D: href => hints.push(['D', href]),
        C: (href, crossOrigin) => hints.push(['C', href, crossOrigin]),
        L: (href, as, options) => hints.push(['L', href, as, options]),
        m: (href, options) => hints.push(['m', href, options]),
        X: (src, options) => hints.push(['X', src, options]),
        S: (href, precedence, options) =>
          hints.push(['S', href, precedence, options]),
        M: (src, options) => hints.push(['M', src, options]),
      };
      return {
        hints,
        restore() {
          ReactDOMSharedInternals.d = previousDispatcher;
        },
      };
    }
    const wireCapture = captureHints();
    let wireHTML;
    try {
      const {response: wireResponse} = await renderThroughWire(makeModel());
      wireHTML = await renderToHTML(wireResponse);
    } finally {
      wireCapture.restore();
    }
    const renderCapture = captureHints();
    let renderHTML;
    try {
      const {response: renderResponse} = await renderInProcess(makeModel());
      renderHTML = await renderToHTML(renderResponse);
    } finally {
      renderCapture.restore();
    }
    expect(wireCapture.hints.length).toBeGreaterThan(0);
    expect(renderCapture.hints).toEqual(wireCapture.hints);
    expect(renderHTML).toBe(wireHTML);
  });

  // @gate __DEV__
  it('forwards debug info identically', async () => {
    function makeModel() {
      function Greeting({name}) {
        return ReactServer.createElement('span', null, 'hi ', name);
      }
      function App() {
        return ReactServer.createElement(Greeting, {name: 'Seb'});
      }
      return ReactServer.createElement(App);
    }
    function getDebugNames(root) {
      const names = [];
      const debugInfo = root._debugInfo;
      if (debugInfo) {
        for (let i = 0; i < debugInfo.length; i++) {
          if (debugInfo[i].name) {
            names.push(debugInfo[i].name);
          }
        }
      }
      return names;
    }
    const wireRoot = await (await renderThroughWire(makeModel())).response;
    const renderRoot = await (await renderInProcess(makeModel())).response;
    const wireNames = getDebugNames(wireRoot);
    const renderNames = getDebugNames(renderRoot);
    expect(renderNames).toEqual(wireNames);
    expect(renderNames).toContain('App');
  });

  it('shares unchanged plain data with the consumer by reference', async () => {
    // Unlike the byte stream — which necessarily copies — the in-process
    // consumer receives the caller's own objects for plain-data subtrees
    // that serialize to themselves, including frozen ones. Revive must not
    // write into them.
    const data = Object.freeze({
      items: Object.freeze([1, 2, 3]),
      config: {nested: {deep: true}},
    });
    function makeModel() {
      return {data, label: 'zero copy'};
    }
    const a = await (await renderThroughWire(makeModel())).response;
    const b = await (await renderInProcess(makeModel())).response;
    // The wire copies by construction.
    expect(a.data).not.toBe(data);
    expect(a.data).toEqual(data);
    // The in-process path shares by identity.
    expect(b.data).toBe(data);
    expect(b.data.items).toBe(data.items);
    expect(b.label).toBe('zero copy');
  });

  it('serves the object consumer and the byte stream from one render', async () => {
    // The framework case: a single render() feeds SSR through
    // createFromRender while its byte stream is piped out for hydration.
    // All three views must agree.
    function makeModel() {
      function App() {
        return ReactServer.createElement(
          'main',
          null,
          ReactServer.createElement('h1', null, 'dual'),
          ReactServer.createElement('p', null, 'consumption'),
        );
      }
      return ReactServer.createElement(App);
    }
    // Reference HTML through the classic wire path.
    const {response: wireResponse} = await renderThroughWire(makeModel());
    const wireHTML = await renderToHTML(wireResponse);

    // One render, two doors.
    let renderResponse;
    let pipedResponse;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap);
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        ssrManifest,
      );
      const readable = new Stream.PassThrough();
      pipedResponse = ReactServerDOMClient.createFromNodeStream(
        readable,
        ssrManifest,
      );
      result.pipe(readable);
    });
    const renderHTML = await renderToHTML(renderResponse);
    const pipedHTML = await renderToHTML(pipedResponse);
    expect(renderHTML).toBe(wireHTML);
    expect(pipedHTML).toBe(wireHTML);
  });

  it('supports piping from inside the consumer', async () => {
    // A consumer that reacts to its first row by starting the byte stream
    // runs inside the server's emit; this must not corrupt either output.
    function makeModel() {
      function App() {
        return ReactServer.createElement('div', null, 'reentrant pipe');
      }
      return ReactServer.createElement(App);
    }
    const {response: wireResponse} = await renderThroughWire(makeModel());
    const wireHTML = await renderToHTML(wireResponse);

    let renderResponse;
    let pipedResponse;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap);
      const readable = new Stream.PassThrough();
      pipedResponse = ReactServerDOMClient.createFromNodeStream(
        readable,
        ssrManifest,
      );
      let piped = false;
      const inner = ReactServerDOMClient.createFromRender(
        {
          _attach(consumer) {
            result._attach({
              row(id, tag, payload) {
                if (!piped) {
                  piped = true;
                  result.pipe(readable);
                }
                consumer.row(id, tag, payload);
              },
              close: consumer.close,
              error: consumer.error,
            });
          },
        },
        ssrManifest,
      );
      renderResponse = inner;
    });
    const renderHTML = await renderToHTML(renderResponse);
    const pipedHTML = await renderToHTML(pipedResponse);
    expect(renderHTML).toBe(wireHTML);
    expect(pipedHTML).toBe(wireHTML);
  });

  it('aborts through the result', async () => {
    const never = new Promise(() => {});
    async function Hanging() {
      await never;
      return null;
    }
    const errors = [];
    let response;
    let result;
    await serverAct(() => {
      result = ReactServerDOMServer.render(
        ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement(Hanging),
        ),
        webpackMap,
        {
          onError(x) {
            errors.push(x.message);
            return 'digest';
          },
        },
      );
      response = ReactServerDOMClient.createFromRender(result, ssrManifest);
    });
    await serverAct(() => result.abort(new Error('goodbye')));
    let error = null;
    try {
      await renderToHTML(response);
    } catch (x) {
      error = x;
    }
    if (__DEV__) {
      assertConsoleErrorDev(['[Server] Error: goodbye\n    in <stack>']);
    }
    expect(error).not.toBe(null);
    expect(error.digest).toBe('digest');
    expect(errors).toEqual(['goodbye']);
  });

  it('routes debug rows to a debug channel identically', async () => {
    // When a debug channel is configured, debug rows leave on its byte
    // stream in both modes, and neither the SSR byte stream nor the
    // in-process consumer sees them.
    function makeModel() {
      function Greeting({name}) {
        return ReactServer.createElement('span', null, 'hi ', name);
      }
      function App() {
        return ReactServer.createElement(Greeting, {name: 'Seb'});
      }
      return ReactServer.createElement(App);
    }
    function makeDebugChannel() {
      const readable = new Stream.PassThrough();
      const forBytes = new Stream.PassThrough();
      const forClient = new Stream.PassThrough();
      readable.pipe(forBytes);
      readable.pipe(forClient);
      const writable = new Stream.Writable({
        write(chunk, encoding, callback) {
          readable.write(chunk, encoding);
          callback();
        },
        final() {
          readable.end();
        },
      });
      return {writable, forClient, bytes: readResult(forBytes)};
    }

    // Wire path with a debug channel: the SSR client reads the debug rows
    // from the channel alongside the main stream, or its debug references
    // would dangle.
    const wireDebug = makeDebugChannel();
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(makeModel(), webpackMap, {
        debugChannel: wireDebug.writable,
      }),
    );
    const readable = new Stream.PassThrough();
    const wireResponse = ReactServerDOMClient.createFromNodeStream(
      readable,
      ssrManifest,
      {debugChannel: wireDebug.forClient},
    );
    stream.pipe(readable);
    const wireHTML = await renderToHTML(wireResponse);

    // In-process path with a debug channel: the consumer receives every
    // debug row inline, so nothing extra needs to be read back.
    const renderDebug = makeDebugChannel();
    renderDebug.forClient.resume(); // Unused; drain.
    let renderResponse;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap, {
        debugChannel: renderDebug.writable,
      });
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        ssrManifest,
      );
      // Drain the byte stream so the debug channel closes.
      result.pipe(new Stream.PassThrough());
    });
    const renderHTML = await renderToHTML(renderResponse);

    expect(renderHTML).toBe(wireHTML);
    // The rows are identical up to timestamps and the line numbers of the
    // two call sites in this test file.
    const normalize = payload =>
      payload
        .replace(/:N[\d.]+/g, ':N<time>')
        .replace(/"time":[\d.]+/g, '"time":<time>')
        .replace(/,\d+,\d+,\d+,\d+,(false|true)\]/g, ',<pos>,$1]');
    if (__DEV__) {
      const wireDebugRows = await wireDebug.bytes;
      const renderDebugRows = await renderDebug.bytes;
      expect(wireDebugRows.length).toBeGreaterThan(0);
      expect(normalize(renderDebugRows)).toBe(normalize(wireDebugRows));
    } else {
      // The debugChannel option is DEV-only: in production nothing is ever
      // written to it, on either path.
      wireDebug.writable.end();
      renderDebug.writable.end();
      expect(await wireDebug.bytes).toBe('');
      expect(await renderDebug.bytes).toBe('');
    }
  });

  it('preinitializes client module chunks in the consuming render', async () => {
    // The dispatch that preloads a client component's chunks has to land in
    // the Fizz request that consumes the response, or the emitted script
    // tags lose their attributes (or are dropped). The reference shape is
    // the byte stream consumed lazily inside Fizz, which is how frameworks
    // wire it.
    function ClientComponent() {
      return React.createElement('span', null, 'Client Component');
    }
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      123,
      'path/to/chunk.js',
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);
    // In the SSR bundle this module won't exist; provide a translation from
    // the client metadata to the SSR metadata.
    const clientId = webpackMap[ClientComponentOnTheClient.$$id].id;
    delete webpackModules[clientId];
    const ssrMetadata = webpackMap[ClientComponentOnTheServer.$$id];
    const serverConsumerManifest = {
      moduleMap: {[clientId]: {'*': ssrMetadata}},
      moduleLoading: webpackModuleLoading,
    };
    function makeModel() {
      function App() {
        return ReactServer.createElement(ClientComponentOnTheClient);
      }
      return ReactServer.createElement(App);
    }

    // Wire path, consumed lazily inside the Fizz render.
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(makeModel(), webpackMap),
    );
    const readable = new Stream.PassThrough();
    stream.pipe(readable);
    let lazyWireResponse;
    function LazyWireRoot() {
      if (!lazyWireResponse) {
        lazyWireResponse = ReactServerDOMClient.createFromNodeStream(
          readable,
          serverConsumerManifest,
        );
      }
      return use(lazyWireResponse);
    }
    const wireHTMLStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(React.createElement(LazyWireRoot)),
    );
    const wireHTML = await readResult(wireHTMLStream);

    // In-process path.
    let renderResponse;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap);
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        serverConsumerManifest,
      );
    });
    const renderHTML = await renderToHTML(renderResponse);

    expect(wireHTML).toContain(
      '<script src="/path/to/chunk.js" async=""></script>',
    );
    expect(renderHTML).toBe(wireHTML);
  });

  it('keeps module preinit attributes when DEV debug rows arrive first', async () => {
    // Regression test: DEV-only debug machinery (console replay, IO info)
    // initializes chunks eagerly while rows are still being delivered inside
    // the producer's scope. That must not flush the deferred dispatches, or
    // module preinits lose the manifest's crossOrigin (and nonce).
    function ClientComponent() {
      return React.createElement('span', null, 'Client Component');
    }
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      821,
      'path/to/dev-chunk.js',
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);
    const clientId = webpackMap[ClientComponentOnTheClient.$$id].id;
    delete webpackModules[clientId];
    const ssrMetadata = webpackMap[ClientComponentOnTheServer.$$id];
    const serverConsumerManifest = {
      moduleMap: {[clientId]: {'*': ssrMetadata}},
      moduleLoading: {prefix: '/', crossOrigin: 'use-credentials'},
    };
    function makeModel() {
      // The await produces DEV-only IO debug rows ahead of the model rows.
      async function App() {
        await new Promise(resolve => setTimeout(resolve, 1));
        return ReactServer.createElement(ClientComponentOnTheClient);
      }
      return ReactServer.createElement(App);
    }

    // Wire path, consumed lazily inside the Fizz render.
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(makeModel(), webpackMap),
    );
    const readable = new Stream.PassThrough();
    stream.pipe(readable);
    let lazyWireResponse;
    function LazyWireRoot() {
      if (!lazyWireResponse) {
        lazyWireResponse = ReactServerDOMClient.createFromNodeStream(
          readable,
          serverConsumerManifest,
        );
      }
      return use(lazyWireResponse);
    }
    const wireHTMLStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(React.createElement(LazyWireRoot)),
    );
    const wireHTML = await readResult(wireHTMLStream);

    // In-process path: the replayed console row is processed while the
    // server is still delivering rows.
    let renderResponse;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap);
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        serverConsumerManifest,
      );
    });
    const renderHTML = await renderToHTML(renderResponse);

    const preinitTag =
      '<script src="/path/to/dev-chunk.js" async="" crossorigin="use-credentials"></script>';
    expect(wireHTML).toContain(preinitTag);
    expect(renderHTML).toContain(preinitTag);
    expect(renderHTML).toBe(wireHTML);
  });

  it('releases the byte stream when only the consumer reads the render', async () => {
    // A consumer-only render would otherwise buffer the full wire payload
    // until the result is dropped. Once the consumer has received
    // everything with the stream unclaimed, the buffered chunks are
    // released and a late claim fails loudly.
    let response;
    let result;
    await serverAct(() => {
      result = ReactServerDOMServer.render({greeting: 'hello'}, webpackMap);
      response = ReactServerDOMClient.createFromRender(result, ssrManifest);
    });
    expect((await response).greeting).toBe('hello');
    const errors = [];
    const destination = new Stream.PassThrough();
    destination.on('error', x => errors.push(x.message));
    await serverAct(() => {
      result.pipe(destination);
    });
    expect(errors).toEqual([
      'The byte stream of this render was released because an in-process ' +
        'consumer received the full render before anything claimed the ' +
        'stream. To also read the byte stream, claim it before the render ' +
        'finishes.',
    ]);
  });

  it('rejects the response without corrupting the render when the consumer throws', async () => {
    // A buggy consumer must not corrupt the server render: the response it
    // was attached to errors, but the byte stream is unaffected.
    const consumerError = new Error('consumer kaputt');
    let renderResponse;
    let stream;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(
        {greeting: 'hello'},
        webpackMap,
      );
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        ssrManifest,
      );
      // Sabotage the response's internal chunk map so processing the first
      // row throws inside the server's emit.
      // (Simulates any throwing consumer.)
      stream = null;
      const badResult = ReactServerDOMServer.render(
        {greeting: 'hello'},
        webpackMap,
      );
      badResult._attach({
        row() {
          throw consumerError;
        },
        close() {},
        error(x) {
          stream = x;
        },
      });
    });
    // The well-behaved response resolved fine.
    expect((await renderResponse).greeting).toBe('hello');
    // The broken consumer was detached and notified with its own error.
    expect(stream).toBe(consumerError);
  });

  it('enforces that consumers attach before the render starts emitting', async () => {
    let result;
    await serverAct(() => {
      result = ReactServerDOMServer.render({model: true}, webpackMap);
      // Attaching synchronously is fine.
    });
    // The render has already emitted by now.
    expect(() => {
      ReactServerDOMClient.createFromRender(result, ssrManifest);
    }).toThrow(
      'Cannot attach a consumer to a render result that has already ' +
        'started emitting. Attach the consumer synchronously after render().',
    );
  });

  it('enforces a single consumer', async () => {
    await serverAct(async () => {
      const result = ReactServerDOMServer.render({model: true}, webpackMap);
      const response = ReactServerDOMClient.createFromRender(
        result,
        ssrManifest,
      );
      expect(() => {
        ReactServerDOMClient.createFromRender(result, ssrManifest);
      }).toThrow('A render result can only have a single consumer.');
      expect((await response).model).toBe(true);
    });
  });

  // Subscribes to a render's rows and resolves with the reassembled wire
  // text once the render closes. Binary rows are decoded so the result is
  // comparable to a byte stream read as UTF-8 text.
  function readRows(result) {
    return new Promise((resolve, reject) => {
      let text = '';
      const decoder = new TextDecoder();
      result._subscribeRows({
        string(chunk) {
          text += chunk;
        },
        bytes(chunk) {
          text += decoder.decode(chunk, {stream: true});
        },
        close() {
          resolve(text);
        },
        error(reason) {
          reject(reason);
        },
      });
    });
  }

  it('delivers rows whose text is exactly the byte stream', async () => {
    const ClientRef = clientExports(function Client({label}) {
      return React.createElement('b', null, label);
    });
    function App() {
      const items = [];
      for (let i = 0; i < 40; i++) {
        items.push(
          ReactServer.createElement(
            'p',
            {key: i},
            'row text with some weight to cross a flush or two ✓ ',
            String(i),
          ),
        );
      }
      items.push(
        ReactServer.createElement(ClientRef, {key: 'c', label: 'client'}),
      );
      return ReactServer.createElement('main', null, items);
    }
    // The same element tree renders twice so DEV module ids and stacks
    // match; the timeOrigin and timing debug rows are request-specific and
    // normalized away.
    const model = ReactServer.createElement(App);
    function normalize(text) {
      return text
        .split('\n')
        .filter(row => !/^:N/.test(row) && !/^[0-9a-f]+:D\{"time":/.test(row))
        .join('\n');
    }
    // The byte stream text of one render...
    const byteStream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, webpackMap),
    );
    const readable = new Stream.PassThrough();
    const byteTextPromise = readResult(readable);
    byteStream.pipe(readable);
    const byteText = await byteTextPromise;
    // ...must equal the reassembled rows of another.
    let rowsTextPromise;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(model, webpackMap);
      rowsTextPromise = readRows(result);
    });
    expect(normalize(await rowsTextPromise)).toBe(normalize(byteText));
  });

  it('serves a rows subscriber and an in-process consumer from one render', async () => {
    function makeModel() {
      function App() {
        return ReactServer.createElement('section', null, 'both doors');
      }
      return ReactServer.createElement(App);
    }
    const {response: wireResponse} = await renderThroughWire(makeModel());
    const wireHTML = await renderToHTML(wireResponse);
    let renderResponse;
    let rowsTextPromise;
    await serverAct(() => {
      const result = ReactServerDOMServer.render(makeModel(), webpackMap);
      renderResponse = ReactServerDOMClient.createFromRender(
        result,
        ssrManifest,
      );
      rowsTextPromise = readRows(result);
    });
    expect(await renderToHTML(renderResponse)).toBe(wireHTML);
    expect(await rowsTextPromise).toContain('both doors');
  });

  it('enforces that the rows and the byte stream are exclusive', async () => {
    await serverAct(async () => {
      const result = ReactServerDOMServer.render({model: true}, webpackMap);
      const rowsTextPromise = readRows(result);
      expect(() => {
        result.pipe(new Stream.PassThrough());
      }).toThrow(
        'Cannot read the byte stream of a render result whose rows are ' +
          'already subscribed. Use one or the other.',
      );
      const otherResult = ReactServerDOMServer.render(
        {model: true},
        webpackMap,
      );
      otherResult.pipe(new Stream.PassThrough());
      expect(() => {
        otherResult._subscribeRows({
          string() {},
          bytes() {},
          close() {},
          error() {},
        });
      }).toThrow(
        'Cannot subscribe to the rows of a render result whose byte ' +
          'stream is already claimed. Use one or the other.',
      );
      expect(await rowsTextPromise).toContain('"model":true');
    });
  });

  it('errors the rows subscriber when the render is aborted', async () => {
    const never = new Promise(() => {});
    async function Hanging() {
      await never;
      return null;
    }
    let result;
    let rowsTextPromise;
    await serverAct(() => {
      result = ReactServerDOMServer.render(
        ReactServer.createElement(Hanging),
        webpackMap,
        {
          onError() {
            return 'digest';
          },
        },
      );
      rowsTextPromise = readRows(result);
    });
    await serverAct(() => result.abort(new Error('goodbye')));
    // The abort emits error rows and then closes: the subscriber sees the
    // full wire output including the error row, like a byte stream would.
    // No client consumes this render, so nothing replays the error to the
    // console.
    const text = await rowsTextPromise;
    expect(text).toContain(':E');
  });
});
