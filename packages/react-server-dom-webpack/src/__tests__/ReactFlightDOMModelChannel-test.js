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

// Patch for Edge environments for global scope
global.AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;

let clientExports;
let webpackMap;
let webpackModules;
let webpackModuleLoading;
let React;
let ReactDOMServer;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let use;
let serverAct;

describe('ReactFlightDOMModelChannel', () => {
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

  // Renders a model once and consumes it through both the byte stream and a
  // model channel, so that tests can assert that the two transports resolve
  // to equivalent results.
  async function renderThroughBothTransports(model, options) {
    const channel = ReactServerDOMClient.createModelChannel();
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {serverConsumerManifest: {moduleMap: null, moduleLoading: null}},
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, webpackMap, {
        ...options,
        modelChannel: channel,
      }),
    );
    const readable = new Stream.PassThrough();
    const byteResponse = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: null,
      moduleLoading: null,
    });
    stream.pipe(readable);
    return {channelResponse, byteResponse};
  }

  async function renderToHTML(root, fizzOptions) {
    const response = root;
    function Root() {
      return use(response);
    }
    const htmlStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        React.createElement(Root),
        fizzOptions,
      ),
    );
    return readResult(htmlStream);
  }

  it('resolves the same model over the channel as over the byte stream', async () => {
    const model = {
      text: 'hello',
      dollars: '$prefixed',
      num: 42,
      float: 1.5,
      bool: true,
      nothing: null,
      undef: undefined,
      date: new Date(1234567890000),
      bigint: 90071992547409910000n,
      map: new Map([['a', 1]]),
      set: new Set(['b']),
      list: [1, 'two', {three: 3}],
    };
    const {channelResponse, byteResponse} =
      await renderThroughBothTransports(model);
    const fromChannel = await channelResponse;
    const fromBytes = await byteResponse;
    expect(fromChannel).toEqual(fromBytes);
    expect(fromChannel.text).toBe('hello');
    expect(fromChannel.dollars).toBe('$prefixed');
    expect(fromChannel.date.getTime()).toBe(1234567890000);
    expect(fromChannel.bigint).toBe(90071992547409910000n);
    expect(fromChannel.map.get('a')).toBe(1);
    expect(fromChannel.set.has('b')).toBe(true);
  });

  it('resolves a string root model', async () => {
    const {channelResponse, byteResponse} =
      await renderThroughBothTransports('just a string');
    expect(await channelResponse).toBe('just a string');
    expect(await byteResponse).toBe('just a string');
  });

  it('resolves large strings without wire framing', async () => {
    const largeString = 'oh what a large string this is '.repeat(100);
    const {channelResponse} = await renderThroughBothTransports({
      large: largeString,
    });
    expect((await channelResponse).large).toBe(largeString);
  });

  it('preserves deduped references', async () => {
    const shared = {shared: true};
    const {channelResponse} = await renderThroughBothTransports({
      a: shared,
      b: shared,
      list: [shared],
    });
    const result = await channelResponse;
    expect(result.a).toBe(result.b);
    expect(result.list[0]).toBe(result.a);
  });

  it('resolves typed arrays and ArrayBuffers', async () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const {channelResponse, byteResponse} = await renderThroughBothTransports({
      buffer,
      u8: new Uint8Array([5, 4, 3]),
      f32: new Float32Array([1.5, 2.5]),
      i32: new Int32Array([-1, 2 ** 30]),
      view: new DataView(new Uint8Array([9, 8, 7]).buffer),
    });
    const fromChannel = await channelResponse;
    const fromBytes = await byteResponse;
    expect(fromChannel.u8).toEqual(fromBytes.u8);
    expect(Array.from(fromChannel.u8)).toEqual([5, 4, 3]);
    expect(Array.from(fromChannel.f32)).toEqual([1.5, 2.5]);
    expect(Array.from(fromChannel.i32)).toEqual([-1, 2 ** 30]);
    expect(fromChannel.view.getUint8(0)).toBe(9);
    expect(Array.from(new Uint8Array(fromChannel.buffer))).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('resolves promises as they complete', async () => {
    let resolvePromise;
    const promise = new Promise(resolve => (resolvePromise = resolve));
    const {channelResponse} = await renderThroughBothTransports({
      eager: Promise.resolve('now'),
      lazy: promise,
    });
    const result = await channelResponse;
    await expect(result.eager).resolves.toBe('now');
    await serverAct(() => resolvePromise('later'));
    await expect(result.lazy).resolves.toBe('later');
  });

  it('renders server components and elements to the same HTML as the byte stream', async () => {
    function Greeting({name}) {
      return ReactServer.createElement('span', null, 'hello, ', name);
    }
    async function App() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Greeting, {name: 'Seb'}),
        ReactServer.createElement(Greeting, {name: 'Sathya'}),
      );
    }
    const {channelResponse, byteResponse} = await renderThroughBothTransports(
      ReactServer.createElement(App),
    );
    const channelHTML = await renderToHTML(channelResponse);
    const byteHTML = await renderToHTML(byteResponse);
    expect(channelHTML).toBe(byteHTML);
    expect(channelHTML).toContain('hello, <!-- -->Seb');
  });

  it('renders client references', async () => {
    function ClientComponent({label}) {
      return React.createElement('b', null, label);
    }
    // The Client build may not have the same IDs as the Server bundles for the
    // same component.
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      123,
      'path/to/chunk.js',
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);

    // In the SSR bundle this module won't exist. We simulate this by deleting it.
    const clientId = webpackMap[ClientComponentOnTheClient.$$id].id;
    delete webpackModules[clientId];

    // Instead, we have to provide a translation from the client meta data to
    // the SSR meta data.
    const ssrMetadata = webpackMap[ClientComponentOnTheServer.$$id];
    const translationMap = {
      [clientId]: {
        '*': ssrMetadata,
      },
    };

    const model = ReactServer.createElement(
      'div',
      null,
      ReactServer.createElement(ClientComponentOnTheClient, {label: 'client!'}),
    );

    const channel = ReactServerDOMClient.createModelChannel();
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {
        serverConsumerManifest: {
          moduleMap: translationMap,
          moduleLoading: webpackModuleLoading,
        },
      },
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, webpackMap, {
        modelChannel: channel,
      }),
    );
    // Drain the byte stream.
    stream.pipe(new Stream.PassThrough());

    const html = await renderToHTML(channelResponse);
    expect(html).toContain('<b>client!</b>');
  });

  it('resolves async iterables', async () => {
    const {channelResponse, byteResponse} = await renderThroughBothTransports({
      iterable: (async function* () {
        yield 'multi';
        yield 'shot';
      })(),
    });
    const fromChannel = await channelResponse;
    const fromBytes = await byteResponse;

    async function collect(iterable) {
      const out = [];
      const it = iterable[Symbol.asyncIterator]();
      while (true) {
        const {done, value} = await it.next();
        if (done) {
          break;
        }
        out.push(value);
      }
      return out;
    }
    expect(await collect(fromChannel.iterable)).toEqual(['multi', 'shot']);
    expect(await collect(fromBytes.iterable)).toEqual(['multi', 'shot']);
  });

  it('resolves ReadableStreams', async () => {
    const {channelResponse} = await renderThroughBothTransports({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue('hello');
          controller.enqueue({deep: ['model']});
          controller.close();
        },
      }),
    });
    const result = await channelResponse;
    const reader = result.stream.getReader();
    expect(await reader.read()).toEqual({done: false, value: 'hello'});
    expect(await reader.read()).toEqual({
      done: false,
      value: {deep: ['model']},
    });
    expect(await reader.read()).toEqual({done: true, value: undefined});
  });

  it('rejects with the same digest as the byte stream when the server errors', async () => {
    function Bad() {
      throw new Error('kaputt');
    }
    const {channelResponse, byteResponse} = await renderThroughBothTransports(
      ReactServer.createElement(Bad),
      {
        onError(error) {
          return 'a-digest';
        },
      },
    );
    let channelError = null;
    let byteError = null;
    const silenceRecoverableError = {onError(error) {}};
    try {
      await renderToHTML(channelResponse, silenceRecoverableError);
    } catch (x) {
      channelError = x;
    }
    try {
      await renderToHTML(byteResponse, silenceRecoverableError);
    } catch (x) {
      byteError = x;
    }
    expect(channelError).not.toBe(null);
    expect(channelError.digest).toBe('a-digest');
    expect(byteError.digest).toBe('a-digest');
    if (__DEV__) {
      expect(channelError.message).toBe(byteError.message);
    }
  });

  it('errors pending chunks when the render is aborted', async () => {
    const never = new Promise(() => {});
    const channel = ReactServerDOMClient.createModelChannel();
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {serverConsumerManifest: {moduleMap: null, moduleLoading: null}},
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {sync: 'here', pending: never},
        webpackMap,
        {
          modelChannel: channel,
          onError() {
            return 'aborted-digest';
          },
        },
      ),
    );
    stream.pipe(new Stream.PassThrough());
    const result = await channelResponse;
    expect(result.sync).toBe('here');
    await serverAct(() => stream.abort(new Error('goodbye')));
    let error = null;
    try {
      await result.pending;
    } catch (x) {
      error = x;
    }
    expect(error).not.toBe(null);
    expect(error.digest).toBe('aborted-digest');
  });

  it('handles a consumer that starts the byte stream from a resolve callback', async () => {
    // Resolving a chunk over the channel runs consumer code synchronously in
    // the middle of the server's flush. A natural consumer pattern is to wait
    // for the root before piping the byte stream for hydration data. This
    // must not reenter the flush and double-deliver rows.
    let resolveData;
    const dataPromise = new Promise(resolve => (resolveData = resolve));
    const channel = ReactServerDOMClient.createModelChannel();
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {serverConsumerManifest: {moduleMap: null, moduleLoading: null}},
    );
    const readable = new Stream.PassThrough();
    const byteResult = readResult(readable);
    let piped = false;
    let pipeable = null;
    // Subscribe before the render starts so the callback fires synchronously
    // (in production builds) while the server is delivering rows.
    channelResponse.then(() => {
      piped = true;
      pipeable.pipe(readable);
    });
    await serverAct(() => {
      pipeable = ReactServerDOMServer.renderToPipeableStream(
        {greeting: 'reentrant', lazy: dataPromise},
        webpackMap,
        {modelChannel: channel},
      );
    });
    await serverAct(() => resolveData('later'));
    expect(piped).toBe(true);
    const result = await channelResponse;
    expect(result.greeting).toBe('reentrant');
    await expect(result.lazy).resolves.toBe('later');
    // The byte stream must contain each row exactly once: a duplicated row
    // would mean the reentrant flush serialized the same queue twice.
    const byteText = await byteResult;
    const rows = byteText.split('\n').filter(Boolean);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it('detaches the channel when the consumer throws without corrupting the render', async () => {
    const channel = ReactServerDOMClient.createModelChannel();
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {serverConsumerManifest: {moduleMap: null, moduleLoading: null}},
    );
    // Simulate a buggy consumer whose row handling throws synchronously while
    // the server delivers rows during its flush.
    const consumerError = new Error('consumer kaputt');
    const originalPush = channel.push;
    let threw = false;
    channel.push = function (id, tag, payload) {
      if (!threw && tag === '') {
        threw = true;
        throw consumerError;
      }
      return originalPush.apply(this, arguments);
    };
    let resolveData;
    const dataPromise = new Promise(resolve => (resolveData = resolve));
    const readable = new Stream.PassThrough();
    const byteResponse = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: null,
      moduleLoading: null,
    });
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {greeting: 'resilient', lazy: dataPromise},
        webpackMap,
        {modelChannel: channel},
      ),
    );
    stream.pipe(readable);
    await serverAct(() => resolveData('later'));
    // The byte stream consumer is unaffected by the throwing channel consumer.
    const fromBytes = await byteResponse;
    expect(fromBytes.greeting).toBe('resilient');
    await expect(fromBytes.lazy).resolves.toBe('later');
    // The channel was detached and errored, so its root never resolves and
    // rejects with the consumer's error instead.
    let error = null;
    try {
      await channelResponse;
    } catch (x) {
      error = x;
    }
    expect(error).toBe(consumerError);
  });

  // @gate __DEV__
  it('reads debug rows from a debug channel next to the model channel', async () => {
    function Greeting({name}) {
      return ReactServer.createElement('span', null, 'hi ', name);
    }
    function App() {
      return ReactServer.createElement(Greeting, {name: 'Seb'});
    }

    // The server writes debug rows to the debug channel's writable side.
    const debugReadable = new Stream.PassThrough();
    const debugWritable = new Stream.Writable({
      write(chunk, encoding, callback) {
        debugReadable.write(chunk, encoding);
        callback();
      },
      final() {
        debugReadable.end();
      },
    });

    const channel = ReactServerDOMClient.createModelChannel();
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {
        serverConsumerManifest: {moduleMap: null, moduleLoading: null},
        debugChannel: {readable: Stream.Readable.toWeb(debugReadable)},
      },
    );

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(App),
        webpackMap,
        {modelChannel: channel, debugChannel: debugWritable},
      ),
    );
    stream.pipe(new Stream.PassThrough());

    const html = await renderToHTML(channelResponse);
    expect(html).toContain('hi <!-- -->Seb');

    const root = await channelResponse;
    const names = root._debugInfo.map(info => info.name).filter(Boolean);
    expect(names).toContain('App');
  });

  // @gate __DEV__
  it('forwards the same debug info as the byte stream', async () => {
    function Greeting({name}) {
      return ReactServer.createElement('span', null, 'hi ', name);
    }
    function App() {
      return ReactServer.createElement(Greeting, {name: 'Seb'});
    }
    const {channelResponse, byteResponse} = await renderThroughBothTransports(
      ReactServer.createElement(App),
    );
    const fromChannel = await channelResponse;
    const fromBytes = await byteResponse;
    expect(fromChannel._debugInfo).not.toBe(undefined);
    const channelNames = fromChannel._debugInfo
      .map(info => info.name)
      .filter(Boolean);
    const byteNames = fromBytes._debugInfo
      .map(info => info.name)
      .filter(Boolean);
    expect(channelNames).toEqual(byteNames);
    expect(channelNames).toContain('App');
  });

  it('buffers rows pushed before the consumer connects', async () => {
    const channel = ReactServerDOMClient.createModelChannel();
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        {greeting: 'buffered'},
        webpackMap,
        {modelChannel: channel},
      ),
    );
    const drained = readResult(stream);
    await drained;
    // Connect only after the server has fully rendered and closed.
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {serverConsumerManifest: {moduleMap: null, moduleLoading: null}},
    );
    expect((await channelResponse).greeting).toBe('buffered');
  });
});

describe('ReactFlightDOMModelChannelEdge', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.edge'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server');

    const WebpackMock = require('./utils/WebpackMock');
    webpackMap = WebpackMock.webpackMap;

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      require('react-server-dom-webpack/client.edge'),
    );

    React = require('react');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
  });

  // @gate __DEV__
  it('does not duplicate debug rows when the debug channel starts flowing late', async () => {
    function Greeting({name}) {
      return ReactServer.createElement('span', null, 'hi ', name);
    }
    function App() {
      return ReactServer.createElement(Greeting, {name: 'Seb'});
    }

    // The Edge binding only attaches the debug destination when the debug
    // stream it pipes into the debug channel's writable is first pulled. In a
    // spec-compliant pipe the first read waits for the writable to be ready,
    // so a slow consumer can delay it past the render's flushes. Node's
    // pipeTo reads eagerly, so simulate a late-pulled pipe by deferring the
    // pipeTo the binding sets up until we release it. Debug rows must not be
    // delivered over the model channel in the meantime: they'd arrive a
    // second time as bytes once the debug stream starts flowing.
    let debugController = null;
    const clientDebugReadable = new ReadableStream({
      start(controller) {
        debugController = controller;
      },
    });
    let debugText = '';
    const textDecoder = new TextDecoder();
    const serverDebugWritable = new WritableStream({
      write(chunk) {
        debugText += textDecoder.decode(chunk, {stream: true});
        debugController.enqueue(chunk);
      },
      close() {
        debugController.close();
      },
      abort(reason) {
        debugController.error(reason);
      },
    });

    const channel = ReactServerDOMClient.createModelChannel();
    // Record every row the server delivers over the model channel so we can
    // assert that none of the debug rows flow through it.
    const channelPayloads = [];
    const originalPush = channel.push;
    channel.push = function (id, tag, payload) {
      channelPayloads.push(payload);
      return originalPush.apply(this, arguments);
    };
    const channelResponse = ReactServerDOMClient.createFromModelChannel(
      channel,
      {
        serverConsumerManifest: {moduleMap: null, moduleLoading: null},
        debugChannel: {readable: clientDebugReadable},
      },
    );

    const originalPipeTo = ReadableStream.prototype.pipeTo;
    const deferredPipes = [];
    ReadableStream.prototype.pipeTo = function (destination, options) {
      const source = this;
      return new Promise((resolve, reject) => {
        deferredPipes.push(() =>
          originalPipeTo
            .call(source, destination, options)
            .then(resolve, reject),
        );
      });
    };
    try {
      await serverAct(() =>
        ReactServerDOMServer.renderToReadableStream(
          ReactServer.createElement(App),
          webpackMap,
          {
            modelChannel: channel,
            debugChannel: {writable: serverDebugWritable},
          },
        ),
      );
    } finally {
      ReadableStream.prototype.pipeTo = originalPipeTo;
    }

    // The render has fully flushed through the model channel while the debug
    // stream was never pulled. Now let the debug channel start flowing.
    await serverAct(() => {
      deferredPipes.forEach(startPiping => startPiping());
    });

    const root = await channelResponse;
    expect(root.type).toBe('span');
    const names = root._debugInfo.map(info => info.name).filter(Boolean);
    expect(names).toContain('App');
    // Each debug info entry must appear exactly once. A duplicate means a
    // debug row was delivered both over the model channel and as bytes.
    expect(names).toEqual(Array.from(new Set(names)));
    // The debug rows must have arrived through the debug channel's byte
    // stream and must not also have been delivered over the model channel.
    expect(debugText).toContain('"name":"App"');
    const debugRowsOnModelChannel = channelPayloads.filter(
      payload =>
        typeof payload === 'string' && payload.includes('"name":"App"'),
    );
    expect(debugRowsOnModelChannel).toEqual([]);
  });
});
