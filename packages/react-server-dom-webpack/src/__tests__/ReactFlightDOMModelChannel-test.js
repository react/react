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
    const {channelResponse, byteResponse} = await renderThroughBothTransports(
      'just a string',
    );
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
