/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';
import {Readable} from 'stream';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const finalizationRegistries = [];
function FinalizationRegistryMock(callback) {
  this._heldValues = [];
  this._callback = callback;
  finalizationRegistries.push(this);
}
FinalizationRegistryMock.prototype.register = function (target, heldValue) {
  this._heldValues.push(heldValue);
};
global.FinalizationRegistry = FinalizationRegistryMock;

function gc() {
  for (let i = 0; i < finalizationRegistries.length; i++) {
    const registry = finalizationRegistries[i];
    const callback = registry._callback;
    const heldValues = registry._heldValues;
    for (let j = 0; j < heldValues.length; j++) {
      callback(heldValues[j]);
    }
    heldValues.length = 0;
  }
}

let ReactNoop;
let ReactNoopFlightClient;
let ReactServer;
let act;
let serverAct;
let use;
let startTransition;
let serverExports;
let webpackServerMap;
let clientExports;
let clientExportsESM;
let clientModuleError;
let webpackMap;
let webpackModules;
let webpackModuleLoading;
let ReactDOMServer;
let Stream;
let FlightReact;
let React;
let FlightReactDOM;
let ReactDOMClient;
let ReactServerDOMServer;
let ReactServerDOMStaticServer;
let ReactServerDOMClient;
let ReactServerDOMClientNode;
let ReactDOMFizzServer;
let Suspense;
let ErrorBoundary;
let JSDOM;
let assertConsoleErrorDev;

describe('ReactFlightResultDOM', () => {
  beforeEach(() => {
    // For this first reset we are going to load the dom-node version of react-server-dom-webpack/server
    // This can be thought of as essentially being the React Server Components scope with react-server
    // condition
    jest.resetModules();

    // Some of the tests pollute the head.
    document.head.innerHTML = '';

    JSDOM = require('jsdom').JSDOM;

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    FlightReact = require('react');
    FlightReactDOM = require('react-dom');

    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.node'),
    );
    jest.mock('react-server-dom-webpack/static', () =>
      require('react-server-dom-webpack/static.node'),
    );
    const WebpackMock = require('./utils/WebpackMock');
    serverExports = WebpackMock.serverExports;
    webpackServerMap = WebpackMock.webpackServerMap;
    clientExports = WebpackMock.clientExports;
    clientExportsESM = WebpackMock.clientExportsESM;
    clientModuleError = WebpackMock.clientModuleError;
    webpackMap = WebpackMock.webpackMap;
    webpackModules = WebpackMock.webpackModules;
    webpackModuleLoading = WebpackMock.moduleLoading;

    ReactServerDOMServer = require('react-server-dom-webpack/server');
    ReactServerDOMStaticServer = require('react-server-dom-webpack/static');

    // This reset is to load modules for the SSR/Browser scope.
    jest.unmock('react-server-dom-webpack/server');
    __unmockReact();
    jest.resetModules();
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    Stream = require('stream');
    React = require('react');
    use = React.use;
    Suspense = React.Suspense;
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzServer = require('react-dom/server.node');
    ReactDOMServer = ReactDOMFizzServer;
    jest.mock('react-server-dom-webpack/client', () =>
      require('react-server-dom-webpack/client.browser'),
    );
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    ReactServerDOMClientNode = jest.requireActual(
      'react-server-dom-webpack/client.node',
    );

    ErrorBoundary = class extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      render() {
        if (this.state.hasError) {
          return this.props.fallback(this.state.error);
        }
        return this.props.children;
      }
    };
  });

  async function readByteLength(stream) {
    const reader = stream.getReader();
    let length = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return length;
      }
      length += value.byteLength;
    }
  }

  async function readResult(stream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return result;
      }
      result += Buffer.from(value).toString('utf8');
    }
  }

  async function readInto(
    container: Document | HTMLElement,
    stream: ReadableStream,
  ) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let content = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        content += decoder.decode();
        break;
      }
      content += decoder.decode(value, {stream: true});
    }
    if (container.nodeType === 9 /* DOCUMENT */) {
      const doc = new JSDOM(content).window.document;
      container.documentElement.innerHTML = doc.documentElement.innerHTML;
      while (container.documentElement.attributes.length > 0) {
        container.documentElement.removeAttribute(
          container.documentElement.attributes[0].name,
        );
      }
      const attrs = doc.documentElement.attributes;
      for (let i = 0; i < attrs.length; i++) {
        container.documentElement.setAttribute(attrs[i].name, attrs[i].value);
      }
    } else {
      container.innerHTML = content;
    }
  }

  function renderResultToPipeableStream(model, manifest, options) {
    const result = ReactServerDOMServer.renderToResult(model, options);
    const stream = ReactServerDOMServer.renderResultToPipeableStream(
      result,
      manifest,
      options,
    );
    return {
      pipe(destination) {
        destination.on('error', () =>
          result.abort(
            new Error('The destination stream errored while writing data.'),
          ),
        );
        destination.on('close', () =>
          result.abort(new Error('The destination stream closed early.')),
        );
        return stream.pipe(destination);
      },
      abort(reason) {
        result.abort(reason);
      },
    };
  }

  async function prerenderResultToNodeStream(model, manifest, options) {
    const result = await ReactServerDOMStaticServer.prerenderToResult(
      model,
      options,
    );
    const prelude = new Stream.PassThrough();
    ReactServerDOMServer.renderResultToPipeableStream(
      result,
      manifest,
      options ? {onError: options.onError} : undefined,
    ).pipe(prelude);
    return {prelude};
  }

  function getTestStream() {
    const writable = new Stream.PassThrough();
    const readable = new ReadableStream({
      start(controller) {
        writable.on('data', chunk => {
          controller.enqueue(chunk);
        });
        writable.on('end', () => {
          controller.close();
        });
      },
    });
    return {
      readable,
      writable,
    };
  }

  function renderResultToReadableStream(model, manifest, options) {
    const result = ReactServerDOMServer.renderToResult(model, options);
    return ReactServerDOMServer.renderResultToReadableStream(
      result,
      manifest,
      options,
    );
  }

  function renderFizzToReadableStream(model) {
    const {writable, readable} = getTestStream();
    ReactDOMFizzServer.renderToPipeableStream(model).pipe(writable);
    return readable;
  }

  function createResponse(result, options) {
    return ReactServerDOMClientNode.createFromResult(result, {
      clientManifest: webpackMap,
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
        serverModuleMap: null,
      },
      onError: options === undefined ? undefined : options.onError,
    });
  }

  function createUnclosingStream(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    const reader = stream.getReader();

    const s = new ReadableStream({
      async pull(controller) {
        const {done, value} = await reader.read();
        if (!done) {
          controller.enqueue(value);
        }
      },
    });

    return s;
  }

  const theInfinitePromise = new Promise(() => {});
  function InfiniteSuspend() {
    throw theInfinitePromise;
  }

  function getMeaningfulChildren(element) {
    const children = [];
    let node = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          // some tags are ambiguous and might be hidden because they look like non-meaningful children
          // so we have a global override where if this data attribute is included we also include the node
          node.hasAttribute('data-meaningful') ||
          (node.tagName === 'SCRIPT' &&
            node.hasAttribute('src') &&
            node.hasAttribute('async')) ||
          (node.tagName !== 'SCRIPT' &&
            node.tagName !== 'TEMPLATE' &&
            node.tagName !== 'template' &&
            !node.hasAttribute('hidden') &&
            !node.hasAttribute('aria-hidden') &&
            // Ignore the render blocking expect
            (node.getAttribute('rel') !== 'expect' ||
              node.getAttribute('blocking') !== 'render'))
        ) {
          const props = {};
          const attributes = node.attributes;
          for (let i = 0; i < attributes.length; i++) {
            if (
              attributes[i].name === 'id' &&
              attributes[i].value.includes(':')
            ) {
              // We assume this is a React added ID that's a non-visual implementation detail.
              continue;
            }
            props[attributes[i].name] = attributes[i].value;
          }
          props.children = getMeaningfulChildren(node);
          children.push(React.createElement(node.tagName.toLowerCase(), props));
        }
      } else if (node.nodeType === 3) {
        children.push(node.data);
      }
      node = node.nextSibling;
    }
    return children.length === 0
      ? undefined
      : children.length === 1
        ? children[0]
        : children;
  }

  function passThrough(stream) {
    // Simulate more realistic network by splitting up and rejoining some chunks.
    // This lets us test that we don't accidentally rely on particular bounds of the chunks.
    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        let prevChunk = new Uint8Array(0);
        function push() {
          reader.read().then(({done, value}) => {
            if (done) {
              controller.enqueue(prevChunk);
              prevChunk = new Uint8Array(0);
              controller.close();
              return;
            }
            const chunk = new Uint8Array(prevChunk.length + value.length);
            chunk.set(prevChunk, 0);
            chunk.set(value, prevChunk.length);
            if (chunk.length > 50) {
              // Copy the part we're keeping (prevChunk) to avoid buffer
              // transfer. When we enqueue the partial chunk below, downstream
              // consumers (like byte streams in the Flight Client) may detach
              // the underlying buffer. Since prevChunk would share the same
              // buffer, we copy it first so it has its own independent buffer.
              // TODO: Should we just use {type: 'bytes'} for this stream to
              // always transfer ownership, and not only "accidentally" when we
              // enqueue in the Flight Client?
              prevChunk = chunk.slice(chunk.length - 50);
              controller.enqueue(chunk.subarray(0, chunk.length - 50));
            } else {
              // Wait to see if we get some more bytes to join in.
              prevChunk = chunk;
              // Flush if we don't get any more.
              (async function flushAfterAFewTasks() {
                for (let i = 0; i < 10; i++) {
                  await i;
                }
                if (prevChunk.byteLength > 0) {
                  controller.enqueue(prevChunk);
                }
                prevChunk = new Uint8Array(0);
              })();
            }
            push();
          });
        }
        push();
      },
    });
  }

  it('should be able to load a server reference on a consuming server if a mapping exists', async () => {
    function greet(name) {
      return 'hi, ' + name;
    }
    const ServerModule = serverExports({
      greet,
    });

    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult({
        method: ServerModule.greet,
        boundMethod: ServerModule.greet.bind(null, 'there'),
      }),
    );
    const response = ReactServerDOMClientNode.createFromResult(flightResult, {
      clientManifest: webpackMap,
      serverConsumerManifest: {
        moduleMap: webpackMap,
        serverModuleMap: webpackServerMap,
        moduleLoading: webpackModuleLoading,
      },
    });

    const result = await response;

    expect(result.method).toBe(greet);
    expect(result.boundMethod()).toBe('hi, there');
  });

  it('should be able to load a server reference on a consuming server if a mapping exists (async)', async () => {
    let resolve;
    const chunkPromise = new Promise(r => (resolve = r));

    function greet(name) {
      return 'hi, ' + name;
    }
    const ServerModule = serverExports(
      {
        greet,
      },
      chunkPromise,
    );

    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult({
        method: ServerModule.greet,
        boundMethod: ServerModule.greet.bind(null, 'there'),
      }),
    );
    const response = ReactServerDOMClientNode.createFromResult(flightResult, {
      clientManifest: webpackMap,
      serverConsumerManifest: {
        moduleMap: webpackMap,
        serverModuleMap: webpackServerMap,
        moduleLoading: webpackModuleLoading,
      },
    });

    await resolve();

    const result = await response;

    expect(result.method).toBe(greet);
    expect(result.boundMethod()).toBe('hi, there');
  });

  it('should load a server reference on a consuming server and pass it back', async () => {
    function greet(name) {
      return 'hi, ' + name;
    }
    const ServerModule = serverExports({
      greet,
    });

    // Registering the server reference also with the client must not break
    // subsequent `.bind` calls.
    ReactServerDOMClient.registerServerReference(
      ServerModule.greet,
      ServerModule.greet.$$id,
    );

    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult({
        method: ServerModule.greet,
        boundMethod: ServerModule.greet.bind(null, 'there'),
      }),
    );
    const response = ReactServerDOMClientNode.createFromResult(flightResult, {
      clientManifest: webpackMap,
      serverConsumerManifest: {
        moduleMap: webpackMap,
        serverModuleMap: webpackServerMap,
        moduleLoading: webpackModuleLoading,
      },
    });

    const result = await response;

    expect(result.method).toBe(greet);
    expect(result.boundMethod()).toBe('hi, there');

    const body = await ReactServerDOMClientNode.encodeReply({
      method: result.method,
      boundMethod: result.boundMethod,
    });
    const replyResult = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    expect(replyResult.method).toBe(greet);
    expect(replyResult.boundMethod()).toBe('hi, there');
  });

  it('can pass JSX through a round trip using temporary references', async () => {
    function Component() {
      return <div />;
    }

    const children = <Component />;

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(
      {children},
      {
        temporaryReferences,
      },
    );

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult(serverPayload, {
        temporaryReferences: temporaryReferencesServer,
      }),
    );
    const response = await ReactServerDOMClientNode.createFromResult(
      flightResult,
      {
        clientManifest: webpackMap,
        serverConsumerManifest: {
          moduleMap: webpackMap,
          serverModuleMap: webpackServerMap,
          moduleLoading: webpackModuleLoading,
        },
        temporaryReferences,
      },
    );

    // This should've been the same reference that we already saw.
    expect(response.children).toBe(children);
  });

  it('can pass JSX as root model through a round trip using temporary references', async () => {
    const jsx = <div />;

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(jsx, {
      temporaryReferences,
    });

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult(serverPayload, {
        temporaryReferences: temporaryReferencesServer,
      }),
    );
    const response = await ReactServerDOMClientNode.createFromResult(
      flightResult,
      {
        clientManifest: webpackMap,
        serverConsumerManifest: {
          moduleMap: webpackMap,
          serverModuleMap: webpackServerMap,
          moduleLoading: webpackModuleLoading,
        },
        temporaryReferences,
      },
    );

    // This should be the same reference that we already saw.
    await expect(response).toBe(jsx);
  });

  it('can pass a promise that resolves to JSX through a round trip using temporary references', async () => {
    const jsx = <div />;
    const promise = Promise.resolve(jsx);

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(
      {promise},
      {
        temporaryReferences,
      },
    );

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult(serverPayload, {
        temporaryReferences: temporaryReferencesServer,
      }),
    );
    const response = await ReactServerDOMClientNode.createFromResult(
      flightResult,
      {
        clientManifest: webpackMap,
        serverConsumerManifest: {
          moduleMap: webpackMap,
          serverModuleMap: webpackServerMap,
          moduleLoading: webpackModuleLoading,
        },
        temporaryReferences,
      },
    );

    // This should resolve to the same reference that we already saw.
    await expect(response.promise).resolves.toBe(jsx);
  });

  it('can return the same object using temporary references', async () => {
    const obj = {
      this: {is: 'a large object'},
      with: {many: 'properties in it'},
    };

    const root = {obj};

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(root, {
      temporaryReferences,
    });

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        {
          root: serverPayload,
          obj: serverPayload.obj,
        },
        {temporaryReferences: temporaryReferencesServer},
      ),
    );
    const response = await ReactServerDOMClientNode.createFromResult(
      flightResult,
      {
        clientManifest: webpackMap,
        serverConsumerManifest: {
          moduleMap: webpackMap,
          serverModuleMap: webpackServerMap,
          moduleLoading: webpackModuleLoading,
        },
        temporaryReferences,
      },
    );

    // This should've been the same reference that we already saw because
    // we returned it by reference.
    expect(response.root).toBe(root);
    expect(response.obj).toBe(obj);
  });

  it('should supports ReadableStreams with typed arrays', async () => {
    const buffer = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]).buffer;
    const buffers = [
      buffer,
      new Int8Array(buffer, 1),
      new Uint8Array(buffer, 2),
      new Uint8ClampedArray(buffer, 2),
      new Int16Array(buffer, 2),
      new Uint16Array(buffer, 2),
      new Int32Array(buffer, 4),
      new Uint32Array(buffer, 4),
      new Float32Array(buffer, 4),
      new Float64Array(buffer, 0),
      new BigInt64Array(buffer, 0),
      new BigUint64Array(buffer, 0),
      new DataView(buffer, 3),
    ];

    // This is not a binary stream, it's a stream that contain binary chunks.
    const s = new ReadableStream({
      start(c) {
        for (let i = 0; i < buffers.length; i++) {
          c.enqueue(buffers[i]);
        }
        c.close();
      },
    });

    const stream = await serverAct(() => {
      const {writable, readable} = getTestStream();
      renderResultToPipeableStream(s, {}).pipe(writable);
      return readable;
    });

    const [stream1, stream2] = passThrough(stream).tee();

    const result = await ReactServerDOMClient.createFromReadableStream(
      stream1,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    expect(await readByteLength(stream2)).toBeLessThan(300);

    const streamedBuffers = [];
    const reader = result.getReader();
    let entry;
    while (!(entry = await reader.read()).done) {
      streamedBuffers.push(entry.value);
    }

    expect(streamedBuffers).toEqual(buffers);
  });

  it('should support binary ReadableStreams', async () => {
    const encoder = new TextEncoder();
    const words = ['Hello', 'streaming', 'world'];

    const stream = new ReadableStream({
      type: 'bytes',
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = encoder.encode(words[i] + ' ');
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const rscStream = await serverAct(() => {
      const {writable, readable} = getTestStream();
      renderResultToPipeableStream(stream, {}).pipe(writable);
      return readable;
    });

    const result = await ReactServerDOMClient.createFromReadableStream(
      rscStream,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    const reader = result.getReader();
    const decoder = new TextDecoder();

    let text = '';
    let entry;
    while (!(entry = await reader.read()).done) {
      text += decoder.decode(entry.value);
    }

    expect(text).toBe('Hello streaming world ');
  });

  it('should support large binary ReadableStreams', async () => {
    const chunkCount = 100;
    const chunkSize = 1024;
    const expectedBytes = [];

    const stream = new ReadableStream({
      type: 'bytes',
      start(controller) {
        for (let i = 0; i < chunkCount; i++) {
          const chunk = new Uint8Array(chunkSize);
          for (let j = 0; j < chunkSize; j++) {
            chunk[j] = (i + j) % 256;
          }
          expectedBytes.push(...Array.from(chunk));
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const rscStream = await serverAct(() => {
      const {writable, readable} = getTestStream();
      renderResultToPipeableStream(stream, {}).pipe(writable);
      return readable;
    });

    const result = await ReactServerDOMClient.createFromReadableStream(
      // Use passThrough to split and rejoin chunks at arbitrary boundaries.
      passThrough(rscStream),
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    const reader = result.getReader();
    const receivedBytes = [];
    let entry;
    while (!(entry = await reader.read()).done) {
      expect(entry.value instanceof Uint8Array).toBe(true);
      receivedBytes.push(...Array.from(entry.value));
    }

    expect(receivedBytes).toEqual(expectedBytes);
  });

  it('should support BYOB binary ReadableStreams', async () => {
    const sourceBytes = [
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ];

    // Create separate buffers for each typed array to avoid ArrayBuffer
    // transfer issues. Each view needs its own buffer because enqueue()
    // transfers ownership.
    const buffers = [
      new Int8Array(sourceBytes.slice(1)),
      new Uint8Array(sourceBytes.slice(2)),
      new Uint8ClampedArray(sourceBytes.slice(2)),
      new Int16Array(new Uint8Array(sourceBytes.slice(2)).buffer),
      new Uint16Array(new Uint8Array(sourceBytes.slice(2)).buffer),
      new Int32Array(new Uint8Array(sourceBytes.slice(4)).buffer),
      new Uint32Array(new Uint8Array(sourceBytes.slice(4)).buffer),
      new Float32Array(new Uint8Array(sourceBytes.slice(4)).buffer),
      new Float64Array(new Uint8Array(sourceBytes.slice(0)).buffer),
      new BigInt64Array(new Uint8Array(sourceBytes.slice(0)).buffer),
      new BigUint64Array(new Uint8Array(sourceBytes.slice(0)).buffer),
      new DataView(new Uint8Array(sourceBytes.slice(3)).buffer),
    ];

    // Save expected bytes before enqueueing (which will detach the buffers).
    const expectedBytes = buffers.flatMap(c =>
      Array.from(new Uint8Array(c.buffer, c.byteOffset, c.byteLength)),
    );

    // This a binary stream where each chunk ends up as Uint8Array.
    const s = new ReadableStream({
      type: 'bytes',
      start(c) {
        for (let i = 0; i < buffers.length; i++) {
          c.enqueue(buffers[i]);
        }
        c.close();
      },
    });

    const stream = await serverAct(() => {
      const {writable, readable} = getTestStream();
      renderResultToPipeableStream(s, {}).pipe(writable);
      return readable;
    });

    const [stream1, stream2] = passThrough(stream).tee();

    const result = await ReactServerDOMClient.createFromReadableStream(
      stream1,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    expect(await readByteLength(stream2)).toBeLessThan(300);

    const streamedBuffers = [];
    const reader = result.getReader({mode: 'byob'});
    let entry;
    while (!(entry = await reader.read(new Uint8Array(10))).done) {
      expect(entry.value instanceof Uint8Array).toBe(true);
      streamedBuffers.push(entry.value);
    }

    // The streamed buffers might be in different chunks and in Uint8Array form but
    // the concatenated bytes should be the same.
    expect(streamedBuffers.flatMap(t => Array.from(t))).toEqual(expectedBytes);
  });

  describe('synchronous iteration', () => {
    beforeEach(() => {
      jest.resetModules();
      __unmockReact();
      React = require('react');
      ReactNoop = require('react-noop-renderer');
      act = require('internal-test-utils').act;
    });

    it('can render an iterable as an array', async () => {
      function ItemListClient(props) {
        return <span>{props.items}</span>;
      }
      const ItemList = clientExports(ItemListClient);

      function Items() {
        const iterable = {
          [Symbol.iterator]: function* () {
            yield 'A';
            yield 'B';
            yield 'C';
          },
        };
        return <ItemList items={iterable} />;
      }

      const model = <Items />;

      const flightResult = await serverAct(() =>
        ReactServerDOMServer.renderToResult(model),
      );
      const response = createResponse(flightResult);

      await act(async () => {
        ReactNoop.render(await response);
      });

      expect(ReactNoop).toMatchRenderedOutput(<span>ABC</span>);
    });

    it('can render an iterator as a single shot iterator', async () => {
      const iterator = (function* () {
        yield 'A';
        yield 'B';
        yield 'C';
      })();

      const flightResult = await serverAct(() =>
        ReactServerDOMServer.renderToResult(iterator),
      );
      const response = createResponse(flightResult);
      const result = await response;

      // The iterator should be the same as itself.
      expect(result[Symbol.iterator]()).toBe(result);

      expect(Array.from(result)).toEqual(['A', 'B', 'C']);
      // We've already consumed this iterator.
      expect(Array.from(result)).toEqual([]);
    });

    it('can render a Generator Server Component as a fragment', async () => {
      function ItemListClient(props) {
        return <span>{props.children}</span>;
      }
      const ItemList = clientExports(ItemListClient);

      function* Items() {
        yield 'A';
        yield 'B';
        yield 'C';
      }

      const model = (
        <ItemList>
          <Items />
        </ItemList>
      );

      const flightResult = await serverAct(() =>
        ReactServerDOMServer.renderToResult(model),
      );
      const response = createResponse(flightResult);

      await act(async () => {
        ReactNoop.render(await response);
      });

      expect(ReactNoop).toMatchRenderedOutput(<span>ABC</span>);
    });
  });

  describe('taint', () => {
    // @gate enableTaint
    it('errors when a tainted object is serialized', async () => {
      function UserClient({user}) {
        return <span>{user.name}</span>;
      }
      const User = clientExports(UserClient);

      const user = {
        name: 'Seb',
        age: 'rather not say',
      };
      FlightReact.experimental_taintObjectReference(
        "Don't pass the raw user object to the client",
        user,
      );
      const errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(<User user={user} />, {
          onError(x) {
            errors.push(x.message);
          },
        }),
      );

      expect(errors).toEqual(["Don't pass the raw user object to the client"]);
    });

    // @gate enableTaint
    it('errors with a specific message when a tainted function is serialized', async () => {
      function UserClient({user}) {
        return <span>{user.name}</span>;
      }
      const User = clientExports(UserClient);

      function change() {}
      FlightReact.experimental_taintObjectReference(
        'A change handler cannot be passed to a client component',
        change,
      );
      const errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(<User onChange={change} />, {
          onError(x) {
            errors.push(x.message);
          },
        }),
      );

      expect(errors).toEqual([
        'A change handler cannot be passed to a client component',
      ]);
    });

    // @gate enableTaint
    it('errors when a tainted string is serialized', async () => {
      function UserClient({user}) {
        return <span>{user.name}</span>;
      }
      const User = clientExports(UserClient);

      const process = {
        env: {
          SECRET: '3e971ecc1485fe78625598bf9b6f85db',
        },
      };
      FlightReact.experimental_taintUniqueValue(
        'Cannot pass a secret token to the client',
        process,
        process.env.SECRET,
      );

      const errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          <User token={process.env.SECRET} />,
          {
            onError(x) {
              errors.push(x.message);
            },
          },
        ),
      );

      expect(errors).toEqual(['Cannot pass a secret token to the client']);

      // This just ensures the process object is kept alive for the life time of
      // the test since we're simulating a global as an example.
      expect(process.env.SECRET).toBe('3e971ecc1485fe78625598bf9b6f85db');
    });

    // @gate enableTaint
    it('errors when a tainted bigint is serialized', async () => {
      function UserClient({user}) {
        return <span>{user.name}</span>;
      }
      const User = clientExports(UserClient);

      const currentUser = {
        name: 'Seb',
        token: BigInt('0x3e971ecc1485fe78625598bf9b6f85dc'),
      };
      FlightReact.experimental_taintUniqueValue(
        'Cannot pass a secret token to the client',
        currentUser,
        currentUser.token,
      );

      function App({user}) {
        return <User token={user.token} />;
      }

      const errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(<App user={currentUser} />, {
          onError(x) {
            errors.push(x.message);
          },
        }),
      );

      expect(errors).toEqual(['Cannot pass a secret token to the client']);
    });

    // @gate enableTaint
    it('errors when a tainted binary value is serialized', async () => {
      function UserClient({user}) {
        return <span>{user.name}</span>;
      }
      const User = clientExports(UserClient);

      const currentUser = {
        name: 'Seb',
        token: new Uint32Array([
          0x3e971ecc, 0x1485fe78, 0x625598bf, 0x9b6f85dd,
        ]),
      };
      FlightReact.experimental_taintUniqueValue(
        'Cannot pass a secret token to the client',
        currentUser,
        currentUser.token,
      );

      function App({user}) {
        const clone = user.token.slice();
        return <User token={clone} />;
      }

      const errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(<App user={currentUser} />, {
          onError(x) {
            errors.push(x.message);
          },
        }),
      );

      expect(errors).toEqual(['Cannot pass a secret token to the client']);
    });

    // @gate enableTaint
    it('keep a tainted value tainted until the end of any pending requests', async () => {
      function UserClient({user}) {
        return <span>{user.name}</span>;
      }
      const User = clientExports(UserClient);

      function getUser() {
        const user = {
          name: 'Seb',
          token: '3e971ecc1485fe78625598bf9b6f85db',
        };
        FlightReact.experimental_taintUniqueValue(
          'Cannot pass a secret token to the client',
          user,
          user.token,
        );
        return user;
      }

      function App() {
        const user = getUser();
        const derivedValue = {...user};
        // A garbage collection can happen at any time. Even before the end of
        // this request. This would clean up the user object.
        gc();
        // We should still block the tainted value.
        return <User user={derivedValue} />;
      }

      let errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(<App />, {
          onError(x) {
            errors.push(x.message);
          },
        }),
      );

      expect(errors).toEqual(['Cannot pass a secret token to the client']);

      // After the previous requests finishes, the token can be rendered again.

      errors = [];
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          <User user={{token: '3e971ecc1485fe78625598bf9b6f85db'}} />,
          {
            onError(x) {
              errors.push(x.message);
            },
          },
        ),
      );

      expect(errors).toEqual([]);
    });
  });

  it('should be able to serialize any kind of typed array', async () => {
    const buffer = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]).buffer;
    const buffers = [
      buffer,
      new Int8Array(buffer, 1),
      new Uint8Array(buffer, 2),
      new Uint8ClampedArray(buffer, 2),
      new Int16Array(buffer, 2),
      new Uint16Array(buffer, 2),
      new Int32Array(buffer, 4),
      new Uint32Array(buffer, 4),
      new Float32Array(buffer, 4),
      new Float64Array(buffer, 0),
      new BigInt64Array(buffer, 0),
      new BigUint64Array(buffer, 0),
      new DataView(buffer, 3),
    ];
    const {writable, readable} = getTestStream();
    const stream = await serverAct(() => renderResultToPipeableStream(buffers));
    stream.pipe(writable);
    const result =
      await ReactServerDOMClient.createFromReadableStream(readable);
    expect(result).toEqual(buffers);
  });

  it('should be able to serialize a blob', async () => {
    const bytes = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]);
    const blob = new Blob([bytes, bytes], {
      type: 'application/x-test',
    });
    const {writable, readable} = getTestStream();
    const stream = await serverAct(() => renderResultToPipeableStream(blob));
    stream.pipe(writable);
    const result =
      await ReactServerDOMClient.createFromReadableStream(readable);
    expect(result instanceof Blob).toBe(true);
    expect(result.size).toBe(bytes.length * 2);
    expect(await result.arrayBuffer()).toEqual(await blob.arrayBuffer());
  });

  it('can transport FormData (blobs)', async () => {
    const bytes = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]);
    const blob = new Blob([bytes, bytes], {
      type: 'application/x-test',
    });

    const formData = new FormData();
    formData.append('hi', 'world');
    formData.append('file', blob, 'filename.test');

    expect(formData.get('file') instanceof File).toBe(true);
    expect(formData.get('file').name).toBe('filename.test');

    const {writable, readable} = getTestStream();
    const stream = await serverAct(() =>
      renderResultToPipeableStream(formData),
    );
    stream.pipe(writable);
    const result =
      await ReactServerDOMClient.createFromReadableStream(readable);

    expect(result instanceof FormData).toBe(true);
    expect(result.get('hi')).toBe('world');
    const resultBlob = result.get('file');
    expect(resultBlob instanceof Blob).toBe(true);
    expect(resultBlob.name).toBe('blob'); // We should not pass through the file name for security.
    expect(resultBlob.size).toBe(bytes.length * 2);
    expect(await resultBlob.arrayBuffer()).toEqual(await blob.arrayBuffer());
  });

  it('can pass an async import that resolves later to an outline object like a Map', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));

    const asyncClient = clientExports(promise);

    // We await the value on the servers so it's an async value that the client should wait for
    const awaitedValue = await asyncClient;

    const map = new Map();
    map.set('value', awaitedValue);

    const flightResult = await serverAct(() =>
      ReactServerDOMServer.renderToResult(map),
    );

    // Parsing the root blocks because the module hasn't loaded yet
    const resultPromise = createResponse(flightResult);

    // Afterwards we finally resolve the module value so it's available on the client
    resolve('hello');

    const result = await resultPromise;
    expect(result instanceof Map).toBe(true);
    expect(result.get('value')).toBe('hello');
  });

  it('can pass an async import to a ReadableStream while enqueuing in order', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));

    const asyncClient = clientExports(promise);

    // We await the value on the servers so it's an async value that the client should wait for
    const awaitedValue = await asyncClient;

    const s = new ReadableStream({
      start(c) {
        c.enqueue('hello');
        c.enqueue(awaitedValue);
        c.enqueue('!');
        c.close();
      },
    });

    const expanded = await serverAct(() =>
      ReactServerDOMServer.renderToResult(s),
    );
    const result = await serverAct(() => createResponse(expanded));

    const reader = result.getReader();

    expect(await reader.read()).toEqual({value: 'hello', done: false});

    const readPromise = reader.read();
    // We resolve this after we've already received the '!' row.
    await resolve('world');

    expect(await readPromise).toEqual({value: 'world', done: false});
    expect(await reader.read()).toEqual({value: '!', done: false});
    expect(await reader.read()).toEqual({value: undefined, done: true});
  });

  it('can pass an async import a AsyncIterable while allowing peaking at future values', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));

    const asyncClient = clientExports(promise);

    const multiShotIterable = {
      async *[Symbol.asyncIterator]() {
        yield 'hello';
        // We await the value on the servers so it's an async value that the client should wait for
        yield await asyncClient;
        yield '!';
      },
    };

    const expanded = await serverAct(() =>
      ReactServerDOMServer.renderToResult(multiShotIterable),
    );
    const result = await serverAct(() => createResponse(expanded));

    const iterator = result[Symbol.asyncIterator]();

    expect(await iterator.next()).toEqual({value: 'hello', done: false});

    const readPromise = iterator.next();

    // While the previous promise didn't resolve yet, we should be able to peak at the next value
    // by iterating past it.
    expect(await iterator.next()).toEqual({value: '!', done: false});

    // We resolve the previous row after we've already received the '!' row.
    await resolve('world');
    expect(await readPromise).toEqual({value: 'world', done: false});

    expect(await iterator.next()).toEqual({value: undefined, done: true});
  });

  it('should resolve HTML using Node streams', async () => {
    function Text({children}) {
      return <span>{children}</span>;
    }
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>world</Text>
        </div>
      );
    }

    function App() {
      const model = {
        html: <HTML />,
      };
      return model;
    }

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      renderResultToPipeableStream(<App />, webpackMap),
    );
    pipe(writable);
    const response = ReactServerDOMClient.createFromReadableStream(readable);
    const model = await response;
    expect(model).toEqual({
      html: (
        <div>
          <span>hello</span>
          <span>world</span>
        </div>
      ),
    });
  });

  it('should resolve the root', async () => {
    // Model
    function Text({children}) {
      return <span>{children}</span>;
    }
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>world</Text>
        </div>
      );
    }
    function RootModel() {
      return {
        html: <HTML />,
      };
    }

    // View
    function Message({response}) {
      return <section>{use(response).html}</section>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<RootModel />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe(
      '<section><div><span>hello</span><span>world</span></div></section>',
    );
  });

  it('should not get confused by $', async () => {
    // Model
    function RootModel() {
      return {text: '$1'};
    }

    // View
    function Message({response}) {
      return <p>{use(response).text}</p>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<RootModel />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>$1</p>');
  });

  it('should not get confused by @', async () => {
    // Model
    function RootModel() {
      return {text: '@div'};
    }

    // View
    function Message({response}) {
      return <p>{use(response).text}</p>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<RootModel />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>@div</p>');
  });

  it('should be able to esm compat test module references', async () => {
    const ESMCompatModule = {
      __esModule: true,
      default: function ({greeting}) {
        return greeting + ' World';
      },
      hi: 'Hello',
    };

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    function interopWebpack(obj) {
      // Basically what Webpack's ESM interop feature testing does.
      if (typeof obj === 'object' && obj.__esModule) {
        return obj;
      }
      return Object.assign({default: obj}, obj);
    }

    const {default: Component, hi} = interopWebpack(
      clientExports(ESMCompatModule),
    );

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<Component greeting={hi} />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Hello World</p>');
  });

  it('should be able to render a named component export', async () => {
    const Module = {
      Component: function ({greeting}) {
        return greeting + ' World';
      },
    };

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const {Component} = clientExports(Module);

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<Component greeting={'Hello'} />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Hello World</p>');
  });

  it('should be able to render a module split named component export', async () => {
    const Module = {
      // This gets split into a separate module from the original one.
      split: function ({greeting}) {
        return greeting + ' World';
      },
    };

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const {split: Component} = clientExports(Module);

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<Component greeting={'Hello'} />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Hello World</p>');
  });

  it('should unwrap async module references', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule({text}) {
      return 'Async: ' + text;
    });

    const AsyncModule2 = Promise.resolve({
      exportName: 'Module',
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const AsyncModuleRef = await clientExports(AsyncModule);
    const AsyncModuleRef2 = await clientExports(AsyncModule2);

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        <AsyncModuleRef text={AsyncModuleRef2.exportName} />,
      ),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Async: Module</p>');
  });

  it('should unwrap async module references using use', async () => {
    const AsyncModule = Promise.resolve('Async Text');

    function Print({response}) {
      return use(response);
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const AsyncModuleRef = clientExports(AsyncModule);

    function ServerComponent() {
      const text = FlightReact.use(AsyncModuleRef);
      return <p>{text}</p>;
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<ServerComponent />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Async Text</p>');
  });

  it('should unwrap async ESM module references', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule({text}) {
      return 'Async: ' + text;
    });

    const AsyncModule2 = Promise.resolve({
      exportName: 'Module',
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const AsyncModuleRef = await clientExportsESM(AsyncModule);
    const AsyncModuleRef2 = await clientExportsESM(AsyncModule2);

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        <AsyncModuleRef text={AsyncModuleRef2.exportName} />,
      ),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Async: Module</p>');
  });

  it('should error when a bundler uses async ESM modules with createClientModuleProxy', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule() {
      return 'This should not be rendered';
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <ErrorBoundary
          fallback={error => (
            <p>
              {__DEV__ ? error.message + ' + ' : null}
              {error.digest}
            </p>
          )}>
          <Suspense fallback={<h1>Loading...</h1>}>
            <Print response={response} />
          </Suspense>
        </ErrorBoundary>
      );
    }

    const AsyncModuleRef = await clientExportsESM(AsyncModule, {
      forceClientModuleProxy: true,
    });

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<AsyncModuleRef />),
    );
    const response = createResponse(result, {
      onError(error) {
        return __DEV__ ? 'a dev digest' : `digest(${error.message})`;
      },
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });

    const errorMessage = `The module "${Object.keys(webpackMap).at(0)}" is marked as an async ESM module but was loaded as a CJS proxy. This is probably a bug in the React Server Components bundler.`;

    expect(container.innerHTML).toBe(
      __DEV__
        ? `<p>${errorMessage} + a dev digest</p>`
        : `<p>digest(${errorMessage})</p>`,
    );
  });

  it('should be able to import a name called "then"', async () => {
    const thenExports = {
      then: function then() {
        return 'and then';
      },
    };

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const ThenRef = clientExports(thenExports).then;

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<ThenRef />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>and then</p>');
  });

  it('throws when accessing a member below the client exports', () => {
    const ClientModule = clientExports({
      Component: {deep: 'thing'},
    });
    function dotting() {
      return ClientModule.Component.deep;
    }
    expect(dotting).toThrow(
      'Cannot access Component.deep on the server. ' +
        'You cannot dot into a client module from a server component. ' +
        'You can only pass the imported name through.',
    );
  });

  it('throws when await a client module prop of client exports', async () => {
    const ClientModule = clientExports({
      Component: {deep: 'thing'},
    });
    async function awaitExport() {
      const mod = await ClientModule;
      return await Promise.resolve(mod.Component);
    }
    await expect(awaitExport()).rejects.toThrow(
      `Cannot await or return from a thenable. ` +
        `You cannot await a client module from a server component.`,
    );
  });

  it('throws when accessing a symbol prop from client exports', () => {
    const symbol = Symbol('test');
    const ClientModule = clientExports({
      Component: {deep: 'thing'},
    });
    function read() {
      return ClientModule[symbol];
    }
    expect(read).toThrow(
      'Cannot read Symbol exports. ' +
        'Only named exports are supported on a client module imported on the server.',
    );
  });

  it('does not throw when toString:ing client exports', () => {
    const ClientModule = clientExports({
      Component: {deep: 'thing'},
    });
    expect(Object.prototype.toString.call(ClientModule)).toBe(
      '[object Object]',
    );
    expect(Object.prototype.toString.call(ClientModule.Component)).toBe(
      '[object Function]',
    );
  });

  it('does not throw when React inspects any deep props', () => {
    const ClientModule = clientExports({
      Component: function () {},
    });
    <ClientModule.Component key="this adds instrumentation" />;
  });

  it('does not throw when accessing a Context.Provider from client exports', () => {
    const Context = React.createContext();
    const ClientModule = clientExports({
      Context,
    });
    function dotting() {
      return ClientModule.Context.Provider;
    }
    expect(dotting).not.toThrow();
  });

  it('can render a client Context.Provider from a server component', async () => {
    // Create a context in a client module
    const TestContext = React.createContext('default');
    const ClientModule = clientExports({
      TestContext,
    });

    // Client component that reads context
    function ClientConsumer() {
      const value = React.useContext(TestContext);
      return <span>{value}</span>;
    }
    const {ClientConsumer: ClientConsumerRef} = clientExports({ClientConsumer});

    function Print({response}) {
      return use(response);
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    // Server component that provides context
    function ServerApp() {
      return (
        <ClientModule.TestContext.Provider value="from-server">
          <div>
            <ClientConsumerRef />
          </div>
        </ClientModule.TestContext.Provider>
      );
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<ServerApp />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });

    expect(container.innerHTML).toBe('<div><span>from-server</span></div>');
  });

  it('should resolve cyclic references in client component props after two rounds of serialization and deserialization', async () => {
    const ClientComponent = clientExports(function ClientComponent({data}) {
      return (
        <div>{data.self === data ? 'Cycle resolved' : 'Cycle broken'}</div>
      );
    });
    const clientModuleMetadata = webpackMap[ClientComponent.$$id];
    const consumerModuleId = 'consumer-' + clientModuleMetadata.id;
    const clientReference = Object.defineProperties(ClientComponent, {
      $$typeof: {value: Symbol.for('react.client.reference')},
      $$id: {value: ClientComponent.$$id},
    });
    webpackModules[consumerModuleId] = clientReference;

    const cyclic = {self: null};
    cyclic.self = cyclic;

    const result1 = ReactServerDOMServer.renderToResult(
      <React.Fragment key="this-key-is-important-to-repro-a-prior-cycle-serialization-bug">
        <ClientComponent data={cyclic} />
      </React.Fragment>,
    );

    const promise = ReactServerDOMClientNode.createFromResult(result1, {
      clientManifest: webpackMap,
      serverConsumerManifest: {
        moduleMap: {
          [clientModuleMetadata.id]: {
            '*': {
              id: consumerModuleId,
              chunks: [],
              name: '*',
            },
          },
        },
        moduleLoading: webpackModuleLoading,
        serverModuleMap: null,
      },
    });

    const errors = [];
    const result2 = await serverAct(() =>
      ReactServerDOMServer.renderToResult(promise, {
        onError(error) {
          errors.push(error);
        },
      }),
    );

    expect(errors).toEqual([]);

    const element = await serverAct(() =>
      ReactServerDOMClientNode.createFromResult(result2, {
        clientManifest: webpackMap,
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
          serverModuleMap: null,
        },
      }),
    );

    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(element),
    );
    const result = await readResult(ssrStream);

    expect(result).toBe('<div>Cycle resolved</div>');
  });

  it('should progressively reveal server components', async () => {
    let reportedErrors = [];

    // Client Components

    function MyErrorBoundary({children}) {
      return (
        <ErrorBoundary
          fallback={e => (
            <p>
              {__DEV__ ? e.message + ' + ' : null}
              {e.digest}
            </p>
          )}>
          {children}
        </ErrorBoundary>
      );
    }

    // Model
    function Text({children}) {
      return children;
    }

    function makeDelayedText() {
      let _resolve, _reject;
      let promise = new Promise((resolve, reject) => {
        _resolve = () => {
          promise = null;
          resolve();
        };
        _reject = e => {
          promise = null;
          reject(e);
        };
      });
      async function DelayedText({children}) {
        await promise;
        return <Text>{children}</Text>;
      }
      return [DelayedText, _resolve, _reject];
    }

    const [Friends, resolveFriends] = makeDelayedText();
    const [Name, resolveName] = makeDelayedText();
    const [Posts, resolvePosts] = makeDelayedText();
    const [Photos, resolvePhotos] = makeDelayedText();
    const [Games, , rejectGames] = makeDelayedText();

    // View
    function ProfileDetails({avatar}) {
      return (
        <div>
          <Name>:name:</Name>
          {avatar}
        </div>
      );
    }
    function ProfileSidebar({friends}) {
      return (
        <div>
          <Photos>:photos:</Photos>
          {friends}
        </div>
      );
    }
    function ProfilePosts({posts}) {
      return <div>{posts}</div>;
    }
    function ProfileGames({games}) {
      return <div>{games}</div>;
    }

    const MyErrorBoundaryClient = clientExports(MyErrorBoundary);

    function ProfileContent() {
      return (
        <>
          <ProfileDetails avatar={<Text>:avatar:</Text>} />
          <Suspense fallback={<p>(loading sidebar)</p>}>
            <ProfileSidebar friends={<Friends>:friends:</Friends>} />
          </Suspense>
          <Suspense fallback={<p>(loading posts)</p>}>
            <ProfilePosts posts={<Posts>:posts:</Posts>} />
          </Suspense>
          <MyErrorBoundaryClient>
            <Suspense fallback={<p>(loading games)</p>}>
              <ProfileGames games={<Games>:games:</Games>} />
            </Suspense>
          </MyErrorBoundaryClient>
        </>
      );
    }

    const model = {
      rootContent: <ProfileContent />,
    };

    function ProfilePage({response}) {
      return use(response).rootContent;
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(model, {
        onError(x) {
          reportedErrors.push(x);
          return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
        },
      }),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <ProfilePage response={response} />
        </Suspense>,
      );
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    // This isn't enough to show anything.
    await serverAct(async () => {
      await act(() => {
        resolveFriends();
      });
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    // We can now show the details. Sidebar and posts are still loading.
    await serverAct(async () => {
      await act(() => {
        resolveName();
      });
    });
    // Advance time enough to trigger a nested fallback.
    await act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<p>(loading sidebar)</p>' +
        '<p>(loading posts)</p>' +
        '<p>(loading games)</p>',
    );

    expect(reportedErrors).toEqual([]);

    const theError = new Error('Game over');
    // Let's *fail* loading games.
    await serverAct(async () => {
      await act(async () => {
        await rejectGames(theError);
        await 'the inner async function';
      });
    });
    const expectedGamesValue = __DEV__
      ? '<p>Game over + a dev digest</p>'
      : '<p>digest("Game over")</p>';
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<p>(loading sidebar)</p>' +
        '<p>(loading posts)</p>' +
        expectedGamesValue,
    );

    expect(reportedErrors).toEqual([theError]);
    reportedErrors = [];

    // We can now show the sidebar.
    await serverAct(async () => {
      await act(async () => {
        await resolvePhotos();
        await 'the inner async function';
      });
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<div>:photos::friends:</div>' +
        '<p>(loading posts)</p>' +
        expectedGamesValue,
    );

    // Show everything.
    await serverAct(async () => {
      await act(async () => {
        await resolvePosts();
        await 'the inner async function';
      });
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<div>:photos::friends:</div>' +
        '<div>:posts:</div>' +
        expectedGamesValue,
    );

    expect(reportedErrors).toEqual([]);
  });

  it('should handle streaming async server components', async () => {
    const reportedErrors = [];

    const Row = async ({current, next}) => {
      const chunk = await next;

      if (chunk.done) {
        return chunk.value;
      }

      return (
        <Suspense fallback={chunk.value}>
          <Row current={chunk.value} next={chunk.next} />
        </Suspense>
      );
    };

    function createResolvablePromise() {
      let _resolve, _reject;

      const promise = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
      });

      return {promise, resolve: _resolve, reject: _reject};
    }

    function createSuspendedChunk(initialValue) {
      const {promise, resolve, reject} = createResolvablePromise();

      return {
        row: (
          <Suspense fallback={initialValue}>
            <Row current={initialValue} next={promise} />
          </Suspense>
        ),
        resolve,
        reject,
      };
    }

    function makeDelayedText() {
      const {promise, resolve, reject} = createResolvablePromise();
      async function DelayedText() {
        const data = await promise;
        return <div>{data}</div>;
      }
      return [DelayedText, resolve, reject];
    }

    const [Posts, resolvePostsData] = makeDelayedText();
    const [Photos, resolvePhotosData] = makeDelayedText();
    const suspendedChunk = createSuspendedChunk(<p>loading</p>);
    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(suspendedChunk.row, {
        onError(error) {
          reportedErrors.push(error);
        },
      }),
    );
    const response = createResponse(result);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function ClientRoot() {
      return use(response);
    }

    await act(() => {
      root.render(<ClientRoot />);
    });

    expect(container.innerHTML).toBe('<p>loading</p>');

    const donePromise = createResolvablePromise();

    const value = (
      <Suspense fallback={<p>loading posts and photos</p>}>
        <Posts />
        <Photos />
      </Suspense>
    );

    await serverAct(async () => {
      await act(async () => {
        suspendedChunk.resolve({value, done: false, next: donePromise.promise});
        donePromise.resolve({value, done: true});
      });
    });

    expect(container.innerHTML).toBe('<p>loading posts and photos</p>');

    await serverAct(async () => {
      await act(async () => {
        await resolvePostsData('posts');
        await resolvePhotosData('photos');
      });
    });

    expect(container.innerHTML).toBe('<div>posts</div><div>photos</div>');
    expect(reportedErrors).toEqual([]);
  });

  it('should preserve state of client components on refetch', async () => {
    // Client

    function Page({response}) {
      return use(response);
    }

    function Input() {
      return <input />;
    }

    const InputClient = clientExports(Input);

    // Server

    function App({color}) {
      // Verify both DOM and Client children.
      return (
        <div style={{color}}>
          <input />
          <InputClient />
        </div>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const result1 = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<App color="red" />),
    );
    const response1 = createResponse(result1);
    await act(() => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <Page response={response1} />
        </Suspense>,
      );
    });
    expect(container.children.length).toBe(1);
    expect(container.children[0].tagName).toBe('DIV');
    expect(container.children[0].style.color).toBe('red');

    // Change the DOM state for both inputs.
    const inputA = container.children[0].children[0];
    expect(inputA.tagName).toBe('INPUT');
    inputA.value = 'hello';
    const inputB = container.children[0].children[1];
    expect(inputB.tagName).toBe('INPUT');
    inputB.value = 'goodbye';

    const result2 = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<App color="blue" />),
    );
    const response2 = createResponse(result2);
    await act(() => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <Page response={response2} />
        </Suspense>,
      );
    });
    expect(container.children.length).toBe(1);
    expect(container.children[0].tagName).toBe('DIV');
    expect(container.children[0].style.color).toBe('blue');

    // Verify we didn't destroy the DOM for either input.
    expect(inputA === container.children[0].children[0]).toBe(true);
    expect(inputA.tagName).toBe('INPUT');
    expect(inputA.value).toBe('hello');
    expect(inputB === container.children[0].children[1]).toBe(true);
    expect(inputB.tagName).toBe('INPUT');
    expect(inputB.value).toBe('goodbye');
  });

  it('should be able to complete after aborting and throw the reason client-side', async () => {
    const reportedErrors = [];

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        <div>
          <InfiniteSuspend />
        </div>,
        {
          onError(x) {
            reportedErrors.push(x);
            const message = typeof x === 'string' ? x : x.message;
            return __DEV__ ? 'a dev digest' : `digest("${message}")`;
          },
        },
      ),
    );
    const {abort} = result;
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(() => {
      root.render(
        <ErrorBoundary
          fallback={e => (
            <p>
              {__DEV__ ? e.message + ' + ' : null}
              {e.digest}
            </p>
          )}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    await act(() => {
      abort('for reasons');
    });
    if (__DEV__) {
      expect(container.innerHTML).toBe('<p>for reasons + a dev digest</p>');
    } else {
      expect(container.innerHTML).toBe('<p>digest("for reasons")</p>');
    }

    expect(reportedErrors).toEqual(['for reasons']);
  });

  it('should be able to recover from a direct reference erroring client-side', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function ({prop}) {
      return 'This should never render';
    });

    const ClientReference = clientModuleError(new Error('module init error'));

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        <div>
          <ClientComponent prop={ClientReference} />
        </div>,
        {
          onError(x) {
            reportedErrors.push(x);
          },
        },
      ),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(() => {
      root.render(
        <ErrorBoundary fallback={e => <p>{e.message}</p>}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('<p>module init error</p>');

    expect(reportedErrors).toEqual([]);
  });

  it('should be able to recover from a direct reference erroring client-side async', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function ({prop}) {
      return 'This should never render';
    });

    let rejectPromise;
    const ClientReference = await clientExports(
      new Promise((resolve, reject) => {
        rejectPromise = reject;
      }),
    );

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        <div>
          <ClientComponent prop={ClientReference} />
        </div>,
        {
          onError(x) {
            reportedErrors.push(x);
          },
        },
      ),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(() => {
      root.render(
        <ErrorBoundary fallback={e => <p>{e.message}</p>}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });

    expect(container.innerHTML).toBe('<p>(loading)</p>');

    await act(() => {
      rejectPromise(new Error('async module init error'));
    });

    expect(container.innerHTML).toBe('<p>async module init error</p>');

    expect(reportedErrors).toEqual([]);
  });

  it('should not retain stale error reason after reentrant module chunk initialization', async () => {
    function MyComponent() {
      return <div>hello from client component</div>;
    }
    const ClientComponent = clientExports(MyComponent);

    let resolveAsyncComponent;
    async function AsyncComponent() {
      await new Promise(r => {
        resolveAsyncComponent = r;
      });
      return null;
    }

    function ServerComponent() {
      return (
        <>
          <ClientComponent />
          <Suspense>
            <AsyncComponent />
          </Suspense>
        </>
      );
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();
    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    const {pipe} = await serverAct(() =>
      renderResultToPipeableStream(<ServerComponent />, webpackMap),
    );
    pipe(flightWritable);

    let response = null;
    function getResponse() {
      if (response === null) {
        response =
          ReactServerDOMClient.createFromReadableStream(flightReadable);
      }
      return response;
    }

    // Simulate a module that calls captureOwnerStack() during evaluation.
    // In Fizz SSR, this causes a reentrant readChunk on the same module chunk.
    // The reentrant require throws a TDZ error.
    let evaluatingModuleId = null;
    const origRequire = global.__webpack_require__;
    global.__webpack_require__ = function (id) {
      if (id === evaluatingModuleId) {
        throw new ReferenceError(
          "Cannot access 'MyComponent' before initialization",
        );
      }
      const result = origRequire(id);
      if (result === MyComponent) {
        evaluatingModuleId = id;
        if (__DEV__) {
          React.captureOwnerStack();
        }
        evaluatingModuleId = null;
      }
      return result;
    };

    function App() {
      return use(getResponse());
    }

    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(<App />).pipe(fizzWritable);
    });

    global.__webpack_require__ = origRequire;

    // Resolve the async component so the Flight stream closes after the client
    // module chunk was initialized.
    await serverAct(async () => {
      resolveAsyncComponent();
    });

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(container.innerHTML).toContain('hello from client component');
  });

  it('should be able to recover from a direct reference erroring server-side', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function ({prop}) {
      return 'This should never render';
    });

    // We simulate a bug in the Webpack bundler which causes an error on the server.
    for (const id in webpackMap) {
      Object.defineProperty(webpackMap, id, {
        get: () => {
          throw new Error('bug in the bundler');
        },
      });
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(
        <div>
          <ClientComponent />
        </div>,
      ),
    );
    const response = createResponse(result, {
      onError(x) {
        reportedErrors.push(x.message);
        return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
      },
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(() => {
      root.render(
        <ErrorBoundary
          fallback={e => (
            <p>
              {__DEV__ ? e.message + ' + ' : null}
              {e.digest}
            </p>
          )}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    if (__DEV__) {
      expect(container.innerHTML).toBe(
        '<p>bug in the bundler + a dev digest</p>',
      );
    } else {
      expect(container.innerHTML).toBe('<p>digest("bug in the bundler")</p>');
    }

    expect(reportedErrors).toEqual(['bug in the bundler']);
  });

  it('should pass a Promise through props and be able use() it on the client', async () => {
    async function getData() {
      return 'async hello';
    }

    function Component({data}) {
      const text = use(data);
      return <p>{text}</p>;
    }

    const ClientComponent = clientExports(Component);

    function ServerComponent() {
      const data = getData(); // no await here
      return <ClientComponent data={data} />;
    }

    function Print({response}) {
      return use(response);
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<ServerComponent />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>async hello</p>');
  });

  it('should throw on the client if a passed promise eventually rejects', async () => {
    const reportedErrors = [];
    const theError = new Error('Server throw');

    async function getData() {
      throw theError;
    }

    function Component({data}) {
      const text = use(data);
      return <p>{text}</p>;
    }

    const ClientComponent = clientExports(Component);

    function ServerComponent() {
      const data = getData(); // no await here
      return <ClientComponent data={data} />;
    }

    function Await({response}) {
      return use(response);
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <ErrorBoundary
            fallback={e => (
              <p>
                {__DEV__ ? e.message + ' + ' : null}
                {e.digest}
              </p>
            )}>
            <Await response={response} />
          </ErrorBoundary>
        </Suspense>
      );
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<ServerComponent />, {
        onError(x) {
          reportedErrors.push(x);
          return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
        },
      }),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe(
      __DEV__
        ? '<p>Server throw + a dev digest</p>'
        : '<p>digest("Server throw")</p>',
    );
    expect(reportedErrors).toEqual([theError]);
  });

  it('should support float methods when rendering in Fiber', async () => {
    function Component() {
      return <p>hello world</p>;
    }

    const ClientComponent = clientExports(Component);

    async function ServerComponent() {
      FlightReactDOM.prefetchDNS('d before');
      FlightReactDOM.preconnect('c before');
      FlightReactDOM.preconnect('c2 before', {crossOrigin: 'anonymous'});
      FlightReactDOM.preload('l before', {as: 'style'});
      FlightReactDOM.preloadModule('lm before');
      FlightReactDOM.preloadModule('lm2 before', {
        crossOrigin: 'anonymous',
        fetchPriority: 'low',
      });
      FlightReactDOM.preinit('i before', {as: 'script'});
      FlightReactDOM.preinitModule('m before');
      FlightReactDOM.preinitModule('m2 before', {
        crossOrigin: 'anonymous',
        fetchPriority: 'high',
      });
      await 1;
      FlightReactDOM.prefetchDNS('d after');
      FlightReactDOM.preconnect('c after');
      FlightReactDOM.preconnect('c2 after', {crossOrigin: 'anonymous'});
      FlightReactDOM.preload('l after', {as: 'style'});
      FlightReactDOM.preloadModule('lm after');
      FlightReactDOM.preloadModule('lm2 after', {
        crossOrigin: 'anonymous',
        fetchPriority: 'low',
      });
      FlightReactDOM.preinit('i after', {as: 'script'});
      FlightReactDOM.preinitModule('m after');
      FlightReactDOM.preinitModule('m2 after', {
        crossOrigin: 'anonymous',
        fetchPriority: 'high',
      });
      return <ClientComponent />;
    }

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      renderResultToPipeableStream(<ServerComponent />, webpackMap),
    );
    pipe(writable);

    let response = null;
    function getResponse() {
      if (response === null) {
        response = ReactServerDOMClient.createFromReadableStream(readable);
      }
      return response;
    }

    function App() {
      return getResponse();
    }

    // We pause to allow the float call after the await point to process before the
    // HostDispatcher gets set for Fiber by createRoot. This is only needed in testing
    // because the module graphs are not different and the HostDispatcher is shared.
    // In a real environment the Fiber and Flight code would each have their own independent
    // dispatcher.
    // @TODO consider what happens when Server-Components-On-The-Client exist. we probably
    // want to use the Fiber HostDispatcher there too since it is more about the host than the runtime
    // but we need to make sure that actually makes sense
    await 1;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="dns-prefetch" href="d before" />
          <link rel="preconnect" href="c before" />
          <link rel="preconnect" href="c2 before" crossorigin="" />
          <link rel="preload" as="style" href="l before" />
          <link rel="modulepreload" href="lm before" />
          <link
            rel="modulepreload"
            href="lm2 before"
            crossorigin=""
            fetchpriority="low"
          />
          <script async="" src="i before" />
          <script type="module" async="" src="m before" />
          <script
            type="module"
            async=""
            src="m2 before"
            crossorigin=""
            fetchpriority="high"
          />
          <link rel="dns-prefetch" href="d after" />
          <link rel="preconnect" href="c after" />
          <link rel="preconnect" href="c2 after" crossorigin="" />
          <link rel="preload" as="style" href="l after" />
          <link rel="modulepreload" href="lm after" />
          <link
            rel="modulepreload"
            href="lm2 after"
            crossorigin=""
            fetchpriority="low"
          />
          <script async="" src="i after" />
          <script type="module" async="" src="m after" />
          <script
            type="module"
            async=""
            src="m2 after"
            crossorigin=""
            fetchpriority="high"
          />
        </head>
        <body />
      </html>,
    );
    expect(getMeaningfulChildren(container)).toEqual(<p>hello world</p>);
  });

  it('should support float methods when rendering in Fizz', async () => {
    function Component() {
      return <p>hello world</p>;
    }

    const ClientComponent = clientExports(Component);

    async function ServerComponent() {
      FlightReactDOM.prefetchDNS('d before');
      FlightReactDOM.preconnect('c before');
      FlightReactDOM.preconnect('c2 before', {crossOrigin: 'anonymous'});
      FlightReactDOM.preload('l before', {as: 'style'});
      FlightReactDOM.preloadModule('lm before');
      FlightReactDOM.preloadModule('lm2 before', {
        crossOrigin: 'anonymous',
        fetchPriority: 'low',
      });
      FlightReactDOM.preinit('i before', {as: 'script'});
      FlightReactDOM.preinitModule('m before');
      FlightReactDOM.preinitModule('m2 before', {
        crossOrigin: 'anonymous',
        fetchPriority: 'high',
      });
      await 1;
      FlightReactDOM.prefetchDNS('d after');
      FlightReactDOM.preconnect('c after');
      FlightReactDOM.preconnect('c2 after', {crossOrigin: 'anonymous'});
      FlightReactDOM.preload('l after', {as: 'style'});
      FlightReactDOM.preloadModule('lm after');
      FlightReactDOM.preloadModule('lm2 after', {
        crossOrigin: 'anonymous',
        fetchPriority: 'low',
      });
      FlightReactDOM.preinit('i after', {as: 'script'});
      FlightReactDOM.preinitModule('m after');
      FlightReactDOM.preinitModule('m2 after', {
        crossOrigin: 'anonymous',
        fetchPriority: 'high',
      });
      return <ClientComponent />;
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();
    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    // In a real environment you would want to call the render during the Fizz render.
    // The reason we cannot do this in our test is because we don't actually have two separate
    // module graphs and we are contriving the sequencing to work in a way where
    // the right HostDispatcher is in scope during the Flight Server Float calls and the
    // Flight Client hint dispatches
    const {pipe} = await serverAct(() =>
      renderResultToPipeableStream(<ServerComponent />, webpackMap),
    );
    pipe(flightWritable);

    let response = null;
    function getResponse() {
      if (response === null) {
        response =
          ReactServerDOMClient.createFromReadableStream(flightReadable);
      }
      return response;
    }

    function App() {
      return (
        <html>
          <body>{getResponse()}</body>
        </html>
      );
    }

    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(<App />).pipe(fizzWritable);
    });

    await readInto(document, fizzReadable);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="dns-prefetch" href="d before" />
          <link rel="preconnect" href="c before" />
          <link rel="preconnect" href="c2 before" crossorigin="" />
          <link rel="dns-prefetch" href="d after" />
          <link rel="preconnect" href="c after" />
          <link rel="preconnect" href="c2 after" crossorigin="" />
          <script async="" src="i before" />
          <script type="module" async="" src="m before" />
          <script
            type="module"
            async=""
            src="m2 before"
            crossorigin=""
            fetchpriority="high"
          />
          <script async="" src="i after" />
          <script type="module" async="" src="m after" />
          <script
            type="module"
            async=""
            src="m2 after"
            crossorigin=""
            fetchpriority="high"
          />
          <link rel="preload" as="style" href="l before" />
          <link rel="modulepreload" href="lm before" />
          <link
            rel="modulepreload"
            href="lm2 before"
            crossorigin=""
            fetchpriority="low"
          />
          <link rel="preload" as="style" href="l after" />
          <link rel="modulepreload" href="lm after" />
          <link
            rel="modulepreload"
            href="lm2 after"
            crossorigin=""
            fetchpriority="low"
          />
        </head>
        <body>
          <p>hello world</p>
        </body>
      </html>,
    );
  });

  it('supports Float hints from concurrent Flight -> Fizz renders', async () => {
    function Component() {
      return <p>hello world</p>;
    }

    const ClientComponent = clientExports(Component);

    async function ServerComponent1() {
      FlightReactDOM.preload('before1', {as: 'style'});
      await 1;
      FlightReactDOM.preload('after1', {as: 'style'});
      return <ClientComponent />;
    }

    async function ServerComponent2() {
      FlightReactDOM.preload('before2', {as: 'style'});
      await 1;
      FlightReactDOM.preload('after2', {as: 'style'});
      return <ClientComponent />;
    }

    const {writable: flightWritable1, readable: flightReadable1} =
      getTestStream();
    const {writable: flightWritable2, readable: flightReadable2} =
      getTestStream();

    renderResultToPipeableStream(<ServerComponent1 />, webpackMap).pipe(
      flightWritable1,
    );

    renderResultToPipeableStream(<ServerComponent2 />, webpackMap).pipe(
      flightWritable2,
    );

    const responses = new Map();
    function getResponse(stream) {
      let response = responses.get(stream);
      if (!response) {
        response = ReactServerDOMClient.createFromReadableStream(stream);
        responses.set(stream, response);
      }
      return response;
    }

    function App({stream}) {
      return (
        <html>
          <body>{getResponse(stream)}</body>
        </html>
      );
    }

    // pausing to let Flight runtime tick. This is a test only artifact of the fact that
    // we aren't operating separate module graphs for flight and fiber. In a real app
    // each would have their own dispatcher and there would be no cross dispatching.
    await serverAct(() => {});

    const {writable: fizzWritable1, readable: fizzReadable1} = getTestStream();
    const {writable: fizzWritable2, readable: fizzReadable2} = getTestStream();
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        <App stream={flightReadable1} />,
      ).pipe(fizzWritable1);
      ReactDOMFizzServer.renderToPipeableStream(
        <App stream={flightReadable2} />,
      ).pipe(fizzWritable2);
    });

    async function read(stream) {
      const decoder = new TextDecoder();
      const reader = stream.getReader();
      let buffer = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          buffer += decoder.decode();
          break;
        }
        buffer += decoder.decode(value, {stream: true});
      }
      return buffer;
    }

    const [content1, content2] = await Promise.all([
      read(fizzReadable1),
      read(fizzReadable2),
    ]);

    expect(content1).toEqual(
      '<!DOCTYPE html><html><head><link rel="preload" href="before1" as="style"/>' +
        '<link rel="preload" href="after1" as="style"/>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render"/>'
          : '') +
        '</head>' +
        '<body><p>hello world</p>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<template id="_R_"></template>'
          : '') +
        '</body></html>',
    );
    expect(content2).toEqual(
      '<!DOCTYPE html><html><head><link rel="preload" href="before2" as="style"/>' +
        '<link rel="preload" href="after2" as="style"/>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render"/>'
          : '') +
        '</head>' +
        '<body><p>hello world</p>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<template id="_R_"></template>'
          : '') +
        '</body></html>',
    );
  });

  it('supports deduping hints by Float key', async () => {
    function Component() {
      return <p>hello world</p>;
    }

    const ClientComponent = clientExports(Component);

    async function ServerComponent() {
      FlightReactDOM.prefetchDNS('dns');
      FlightReactDOM.preconnect('preconnect');
      FlightReactDOM.preload('load', {as: 'style'});
      FlightReactDOM.preinit('init', {as: 'script'});
      // again but vary preconnect to demonstrate crossOrigin participates in the key
      FlightReactDOM.prefetchDNS('dns');
      FlightReactDOM.preconnect('preconnect', {crossOrigin: 'anonymous'});
      FlightReactDOM.preload('load', {as: 'style'});
      FlightReactDOM.preinit('init', {as: 'script'});
      await 1;
      // after an async point
      FlightReactDOM.prefetchDNS('dns');
      FlightReactDOM.preconnect('preconnect', {crossOrigin: 'use-credentials'});
      FlightReactDOM.preload('load', {as: 'style'});
      FlightReactDOM.preinit('init', {as: 'script'});
      return <ClientComponent />;
    }

    const {writable, readable} = getTestStream();

    await serverAct(() =>
      renderResultToPipeableStream(<ServerComponent />, webpackMap).pipe(
        writable,
      ),
    );

    const hintRows = [];
    async function collectHints(stream) {
      const decoder = new TextDecoder();
      const reader = stream.getReader();
      let buffer = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          buffer += decoder.decode();
          if (buffer.includes(':H')) {
            hintRows.push(buffer);
          }
          break;
        }
        buffer += decoder.decode(value, {stream: true});
        let line;
        while ((line = buffer.indexOf('\n')) > -1) {
          const row = buffer.slice(0, line);
          buffer = buffer.slice(line + 1);
          if (row.includes(':H')) {
            hintRows.push(row);
          }
        }
      }
    }

    await collectHints(readable);
    expect(hintRows.length).toEqual(6);
  });

  it('preloads resources without needing to render them', async () => {
    function NoScriptComponent() {
      return (
        <p>
          <img src="image-do-not-load" />
          <link rel="stylesheet" href="css-do-not-load" />
        </p>
      );
    }

    function Component() {
      return (
        <div>
          <img src="image-resource" />
          <img
            src="image-do-not-load"
            srcSet="image-preload-src-set"
            sizes="image-sizes"
          />
          <img src="image-do-not-load" loading="lazy" />
          <link
            rel="preload"
            href="video-resource"
            as="video"
            media="(orientation: landscape)"
          />
          <link rel="modulepreload" href="module-resource" />
          <picture>
            <source
              srcSet="image-not-yet-preloaded"
              media="(orientation: portrait)"
            />
            <img src="image-do-not-load" />
          </picture>
          <noscript>
            <NoScriptComponent />
          </noscript>
          <link rel="stylesheet" href="css-resource" />
        </div>
      );
    }

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      renderResultToPipeableStream(<Component />, webpackMap),
    );
    pipe(writable);

    let response = null;
    function getResponse() {
      if (response === null) {
        response = ReactServerDOMClient.createFromReadableStream(readable);
      }
      return response;
    }

    function App() {
      // Not rendered but use for its side-effects.
      getResponse();
      return (
        <html>
          <body>
            <p>hello world</p>
          </body>
        </html>
      );
    }

    const root = ReactDOMClient.createRoot(document);
    await act(() => {
      root.render(<App />);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="image" href="image-resource" />
          <link
            rel="preload"
            as="image"
            imagesrcset="image-preload-src-set"
            imagesizes="image-sizes"
          />
          <link
            rel="preload"
            as="video"
            href="video-resource"
            media="(orientation: landscape)"
          />
          <link rel="modulepreload" href="module-resource" />
          <link rel="preload" as="style" href="css-resource" />
        </head>
        <body>
          <p>hello world</p>
        </body>
      </html>,
    );
  });

  it('should be able to include a client reference in printed errors', async () => {
    const reportedErrors = [];

    const ClientComponent = clientExports(function ({prop}) {
      return 'This should never render';
    });

    const ClientReference = clientExports({});

    class InvalidValue {}

    const {writable} = getTestStream();
    const {pipe} = await serverAct(() =>
      renderResultToPipeableStream(
        <div>
          <ClientComponent prop={ClientReference} invalid={InvalidValue} />
        </div>,
        webpackMap,
        {
          onError(x) {
            reportedErrors.push(x);
          },
        },
      ),
    );
    pipe(writable);

    expect(reportedErrors.length).toBe(1);
    if (__DEV__) {
      expect(reportedErrors[0].message).toEqual(
        'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <... prop={client} invalid={function InvalidValue}>\n' +
          '                             ^^^^^^^^^^^^^^^^^^^^^^^',
      );
    } else {
      expect(reportedErrors[0].message).toEqual(
        'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  {prop: client, invalid: function InvalidValue}\n' +
          '                          ^^^^^^^^^^^^^^^^^^^^^',
      );
    }
  });

  it('should be able to render a client reference as return value', async () => {
    const ClientModule = clientExports({
      text: 'Hello World',
    });

    function ServerComponent() {
      return ClientModule.text;
    }

    const result = await serverAct(() =>
      ReactServerDOMServer.renderToResult(<ServerComponent />),
    );
    const response = createResponse(result);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(response);
    });
    expect(container.innerHTML).toBe('Hello World');
  });

  it('can abort synchronously during render', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            <ComponentThatAborts />
            <Sibling />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    function ComponentThatAborts() {
      abortRef.current();
      return <p>hello world</p>;
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });
    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can abort during render in an async tick', async () => {
    async function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            <ComponentThatAborts />
            <Sibling />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    async function ComponentThatAborts() {
      await 1;
      abortRef.current();
      return <p>hello world</p>;
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });

    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can abort during render in a lazy initializer for a component', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            <LazyAbort />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const LazyAbort = React.lazy(() => {
      abortRef.current();
      return {
        then(cb) {
          cb({default: 'div'});
        },
      };
    });

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });
    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can abort during render in a lazy initializer for an element', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>{lazyAbort}</Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const lazyAbort = React.lazy(() => {
      abortRef.current();
      return {
        then(cb) {
          cb({default: 'hello world'});
        },
      };
    });

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });
    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can abort during a synchronous thenable resolution', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>{thenable}</Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const thenable = {
      then(cb) {
        abortRef.current();
        cb(thenable.value);
      },
    };

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('wont serialize thenables that were not already settled by the time an abort happens', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            <ComponentThatAborts />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>{thenable1}</Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>{thenable2}</Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const thenable1 = {
      then(cb) {
        cb('hello world');
      },
    };

    const thenable2 = {
      then(cb) {
        cb('hello world');
      },
      status: 'fulfilled',
      value: 'hello world',
    };

    function ComponentThatAborts() {
      abortRef.current();
      return thenable1;
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>hello world</div>
      </div>,
    );
  });

  it('can error synchronously after aborting without an unhandled rejection error', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading...</p>}>
            <ComponentThatAborts />
          </Suspense>
        </div>
      );
    }

    const abortRef = {current: null};

    async function ComponentThatAborts() {
      abortRef.current();
      throw new Error('boom');
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap);
      abortRef.current = abort;
      pipe(flightWritable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading...</p>
      </div>,
    );
  });

  it('can error synchronously after aborting in a synchronous Component', async () => {
    const rejectError = new Error('bam!');
    const rejectedPromise = Promise.reject(rejectError);
    rejectedPromise.catch(() => {});
    rejectedPromise.status = 'rejected';
    rejectedPromise.reason = rejectError;

    const resolvedValue = <p>hello world</p>;
    const resolvedPromise = Promise.resolve(resolvedValue);
    resolvedPromise.status = 'fulfilled';
    resolvedPromise.value = resolvedValue;

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading...</p>}>
            <ComponentThatAborts />
          </Suspense>
          <Suspense fallback={<p>loading too...</p>}>
            {rejectedPromise}
          </Suspense>
          <Suspense fallback={<p>loading three...</p>}>
            {resolvedPromise}
          </Suspense>
        </div>
      );
    }

    const abortRef = {current: null};

    // This test is specifically asserting that this works with Sync Server Component
    function ComponentThatAborts() {
      abortRef.current();
      throw new Error('boom');
    }

    const {writable: flightWritable, readable: flightReadable} =
      getTestStream();

    await serverAct(() => {
      const {pipe, abort} = renderResultToPipeableStream(<App />, webpackMap, {
        onError(e) {
          console.error(e);
        },
      });
      abortRef.current = abort;
      pipe(flightWritable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: bam!\n    in <stack>',
    ]);

    const response =
      ReactServerDOMClient.createFromReadableStream(flightReadable);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });
    assertConsoleErrorDev([
      '[Server] Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      '[Server] Error: bam!\n    in <stack>',
    ]);

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        <p>loading...</p>
        <p>loading too...</p>
        <p>hello world</p>
      </div>,
    );
  });

  it('can prerender', async () => {
    let resolveGreeting;
    const greetingPromise = new Promise(resolve => {
      resolveGreeting = resolve;
    });

    function App() {
      return (
        <div>
          <Greeting />
        </div>
      );
    }

    async function Greeting() {
      await greetingPromise;
      return 'hello world';
    }

    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: ReactServerDOMStaticServer.prerenderToResult(<App />),
      };
    });

    resolveGreeting();
    const result = await pendingResult;
    const response = createResponse(result);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    const shellErrors = [];
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onShellError(error) {
            shellErrors.push(error.message);
          },
        },
      ).pipe(fizzWritable);
    });

    expect(shellErrors).toEqual([]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(<div>hello world</div>);
  });

  it('does not propagate abort reasons errors when aborting a prerender', async () => {
    let resolveGreeting;
    const greetingPromise = new Promise(resolve => {
      resolveGreeting = resolve;
    });

    function App() {
      return (
        <div>
          <Suspense fallback="loading...">
            <Greeting />
          </Suspense>
        </div>
      );
    }

    async function Greeting() {
      await greetingPromise;
      return 'hello world';
    }

    const controller = new AbortController();
    const errors = [];
    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: prerenderResultToNodeStream(<App />, webpackMap, {
          signal: controller.signal,
          onError(err) {
            errors.push(err);
          },
        }),
      };
    });

    await serverAct(() => {
      controller.abort('boom');
    });
    resolveGreeting();
    const {prelude} = await pendingResult;

    expect(errors).toEqual([]);

    const preludeWeb = Readable.toWeb(prelude);
    const response = ReactServerDOMClient.createFromReadableStream(preludeWeb);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }

    errors.length = 0;
    let abortFizz;
    await serverAct(async () => {
      const {pipe, abort} = ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onError(error) {
            errors.push(error);
          },
        },
      );
      pipe(fizzWritable);
      abortFizz = abort;
    });

    await serverAct(() => {
      abortFizz('bam');
    });

    expect(errors).toEqual([new Error('Connection closed.')]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(<div>loading...</div>);
  });

  it('will leave async iterables in an incomplete state when halting', async () => {
    let resolve;
    const wait = new Promise(r => (resolve = r));
    const errors = [];

    const multiShotIterable = {
      async *[Symbol.asyncIterator]() {
        yield {hello: 'A'};
        await wait;
        yield {hi: 'B'};
        return 'C';
      },
    };

    const controller = new AbortController();
    const {pendingResult} = await serverAct(() => {
      return {
        pendingResult: prerenderResultToNodeStream(
          {
            multiShotIterable,
          },
          {},
          {
            onError(x) {
              errors.push(x);
            },
            signal: controller.signal,
          },
        ),
      };
    });

    controller.abort();
    await serverAct(() => resolve());

    const {prelude} = await pendingResult;

    const result = await ReactServerDOMClient.createFromReadableStream(
      createUnclosingStream(Readable.toWeb(prelude)),
    );

    const iterator = result.multiShotIterable[Symbol.asyncIterator]();

    expect(await iterator.next()).toEqual({
      value: {hello: 'A'},
      done: false,
    });

    const race = Promise.race([
      iterator.next(),
      new Promise(r => setTimeout(() => r('timeout'), 10)),
    ]);

    await 1;
    jest.advanceTimersByTime(100);
    expect(await race).toBe('timeout');
  });

  it('will halt unfinished chunks inside Suspense when aborting a prerender', async () => {
    const controller = new AbortController();
    function ComponentThatAborts() {
      controller.abort('boom');
      return null;
    }

    async function Greeting() {
      await 1;
      return 'hello world';
    }

    async function Farewell() {
      return 'goodbye world';
    }

    async function Wrapper() {
      return (
        <Suspense fallback="loading too...">
          <ComponentThatAborts />
        </Suspense>
      );
    }

    function App() {
      return (
        <div>
          <Suspense fallback="loading...">
            <Greeting />
          </Suspense>
          <Wrapper />
          <Suspense fallback="loading three...">
            <Farewell />
          </Suspense>
        </div>
      );
    }

    const errors = [];
    const {pendingResult} = await serverAct(() => {
      return {
        pendingResult: prerenderResultToNodeStream(
          <App />,
          {},
          {
            onError(x) {
              errors.push(x);
            },
            signal: controller.signal,
          },
        ),
      };
    });

    const {prelude} = await pendingResult;

    expect(errors).toEqual([]);

    const preludeWeb = Readable.toWeb(prelude);
    const response = ReactServerDOMClient.createFromReadableStream(preludeWeb);

    const {writable: fizzWritable, readable: fizzReadable} = getTestStream();

    function ClientApp() {
      return use(response);
    }
    errors.length = 0;
    let abortFizz;
    await serverAct(async () => {
      const {pipe, abort} = ReactDOMFizzServer.renderToPipeableStream(
        React.createElement(ClientApp),
        {
          onError(error, errorInfo) {
            errors.push(error);
          },
        },
      );
      pipe(fizzWritable);
      abortFizz = abort;
    });

    await serverAct(() => {
      abortFizz('boom');
    });

    // one error per boundary
    const err = new Error('Connection closed.');
    expect(errors).toEqual([err, err, err]);

    const container = document.createElement('div');
    await readInto(container, fizzReadable);
    expect(getMeaningfulChildren(container)).toEqual(
      <div>
        {'loading...'}
        {'loading too...'}
        {'loading three...'}
      </div>,
    );
  });

  it('rejecting a thenable after an abort before flush should not lead to a frozen readable', async () => {
    const ClientComponent = clientExports(function (props: {
      promise: Promise<void>,
    }) {
      return 'hello world';
    });

    let reject;
    const promise = new Promise((_, re) => {
      reject = re;
    });

    function App() {
      return (
        <div>
          <Suspense fallback="loading...">
            <ClientComponent promise={promise} />
          </Suspense>
        </div>
      );
    }

    const errors = [];
    const {writable, readable} = getTestStream();
    const {pipe, abort} = await serverAct(() =>
      renderResultToPipeableStream(<App />, webpackMap, {
        onError(x) {
          errors.push(x);
        },
      }),
    );
    await serverAct(() => {
      abort('STOP');
      reject('STOP');
    });
    pipe(writable);

    const reader = readable.getReader();
    while (true) {
      const {done} = await reader.read();
      if (done) {
        break;
      }
    }

    expect(errors).toEqual(['STOP']);

    // We expect it to get to the end here rather than hang on the reader.
  });
  // A thenable with status 'pending_weak' doesn't keep the Flight stream
  // open. If it settles before the stream closes for other reasons its value
  // is emitted like a normal pending thenable; otherwise its reference is
  // left unfulfilled and stays forever pending on the client.
  //
  // A framework-style tracker for whether a page accessed its search params
  // during a render. The params object is instrumented so that the first
  // access settles the usedSearchParams thenable. It settles synchronously
  // at the access point, so an access is guaranteed to be encoded before
  // the response closes.
  function createSearchParams(values) {
    const listeners = [];
    const usedSearchParams = {
      status: 'pending_weak',
      value: undefined,
      then(onFulfill) {
        if (usedSearchParams.status === 'fulfilled') {
          onFulfill(usedSearchParams.value);
        } else {
          listeners.push(onFulfill);
        }
      },
    };
    const searchParams = new Proxy(values, {
      get(target, key) {
        if (usedSearchParams.status === 'pending_weak') {
          usedSearchParams.status = 'fulfilled';
          usedSearchParams.value = true;
          for (let i = 0; i < listeners.length; i++) {
            listeners[i](true);
          }
          listeners.length = 0;
        }
        return target[key];
      },
    });
    return {searchParams, usedSearchParams};
  }

  it('emits the value of a weak-pending thenable that settles during the render', async () => {
    const {searchParams, usedSearchParams} = createSearchParams({q: 'react'});

    function Page() {
      return <div>{'Results for ' + searchParams.q}</div>;
    }

    let response;
    await serverAct(() => {
      const expanded = ReactServerDOMServer.renderToResult({
        usedSearchParams,
        root: <Page />,
      });
      // Start consuming immediately, like a server that pipes the response
      // while it renders.
      response = createResponse(expanded);
    });

    const result = await response;
    expect(await result.usedSearchParams).toBe(true);

    const ssrStream = await serverAct(() =>
      renderFizzToReadableStream(result.root),
    );
    expect(await readResult(ssrStream)).toBe('<div>Results for react</div>');
  });

  // @gate enableFlightWeakThenables
  it('completes the response without waiting for a weak-pending thenable that never settles', async () => {
    const {searchParams, usedSearchParams} = createSearchParams({q: 'react'});

    function Page() {
      return <div>Static content</div>;
    }

    const stream = await serverAct(() =>
      renderResultToReadableStream({
        usedSearchParams,
        root: <Page />,
      }),
    );
    const [stream1, stream2] = stream.tee();

    let content = null;
    const readPromise = readResult(stream1).then(c => (content = c));
    await serverAct(async () => {});
    // The response completed even though the weak thenable never settled.
    expect(content).not.toBe(null);
    await readPromise;

    const result = await ReactServerDOMClient.createFromReadableStream(
      stream2,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    // Accessing the params after the response already completed doesn't do
    // anything.
    expect(searchParams.q).toBe('react');

    // The reference is left forever pending, without erroring.
    const raced = await Promise.race([
      result.usedSearchParams,
      Promise.resolve('never accessed'),
    ]);
    expect(raced).toBe('never accessed');
  });

  it('emits the value of a weak-pending thenable that settles while the response is still streaming', async () => {
    const {searchParams, usedSearchParams} = createSearchParams({q: 'react'});

    let resolveData;
    const data = new Promise(res => (resolveData = res));
    async function Results() {
      const filter = await data;
      return <div>{'Results for ' + searchParams[filter]}</div>;
    }

    const stream = await serverAct(() =>
      renderResultToReadableStream({
        usedSearchParams,
        root: <Results />,
      }),
    );
    const [stream1, stream2] = stream.tee();

    let content = null;
    const readPromise = readResult(stream1).then(c => (content = c));

    // The response stays open while the data is loading — because of the
    // async component, not because of the unresolved weak thenable.
    await serverAct(async () => {});
    expect(content).toBe(null);

    // The data resolves, the component accesses the search params, and the
    // response completes.
    await serverAct(() => resolveData('q'));
    await serverAct(async () => {});
    expect(content).not.toBe(null);
    await readPromise;

    const result = await ReactServerDOMClient.createFromReadableStream(
      stream2,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    expect(await result.usedSearchParams).toBe(true);

    const ssrStream = await serverAct(() =>
      renderFizzToReadableStream(result.root),
    );
    expect(await readResult(ssrStream)).toBe('<div>Results for react</div>');
  });

  // @gate !enableFlightWeakThenables
  it('treats a weak-pending thenable like a normal pending thenable when the flag is off', async () => {
    const {searchParams, usedSearchParams} = createSearchParams({q: 'react'});

    function Page() {
      return <div>Static content</div>;
    }

    const stream = await serverAct(() =>
      renderResultToReadableStream({
        usedSearchParams,
        root: <Page />,
      }),
    );
    const [stream1, stream2] = stream.tee();

    let content = null;
    const readPromise = readResult(stream1).then(c => (content = c));

    // Without the flag, the unknown thenable status is treated as an
    // ordinary pending thenable, which keeps the response open.
    await serverAct(async () => {});
    expect(content).toBe(null);

    // Accessing the params settles the thenable and lets the response
    // complete.
    await serverAct(() => {
      expect(searchParams.q).toBe('react');
    });
    await serverAct(async () => {});
    expect(content).not.toBe(null);
    await readPromise;

    const result = await ReactServerDOMClient.createFromReadableStream(
      stream2,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    expect(await result.usedSearchParams).toBe(true);
  });

  // @gate enableFlightWeakThenables
  it('supports linked lists of weak-pending thenables', async () => {
    // Weak thenables compose recursively: the value that a weak-pending
    // thenable settles with can itself contain more weak-pending thenables.
    // A linked list of them forms an async sequence that never blocks the
    // response from completing. Modeled here as a framework tracking which
    // params a page accessed during a dynamic render, encoded into the
    // response itself as WeakThenable<{value: T, next: WeakThenable<...>}>.
    function instrumentParams(params) {
      function createWeakNode() {
        const listeners = [];
        const node = {
          status: 'pending_weak',
          value: undefined,
          then(onFulfill) {
            if (node.status === 'fulfilled') {
              onFulfill(node.value);
            } else {
              listeners.push(onFulfill);
            }
          },
        };
        return {node, listeners};
      }
      let tail = createWeakNode();
      const head = tail.node;
      const accessed = new Set();
      const instrumentedParams = new Proxy(params, {
        get(target, name) {
          if (
            typeof name === 'string' &&
            name in target &&
            !accessed.has(name)
          ) {
            accessed.add(name);
            const settledTail = tail;
            tail = createWeakNode();
            // Settle the tail of the list synchronously at the access point
            // so it's guaranteed to be encoded before the response closes.
            const result = {value: name, next: tail.node};
            settledTail.node.status = 'fulfilled';
            settledTail.node.value = result;
            for (let i = 0; i < settledTail.listeners.length; i++) {
              settledTail.listeners[i](result);
            }
            settledTail.listeners.length = 0;
          }
          return target[name];
        },
      });
      return {params: instrumentedParams, accessedParams: head};
    }

    const {params, accessedParams} = instrumentParams({
      a: 'value-of-a',
      b: 'value-of-b',
      c: 'value-of-c',
    });

    function Page() {
      // The page reads param a during the render.
      return 'Accessed: ' + params.a;
    }

    let resolveNormal;
    const pending = new Promise(res => {
      resolveNormal = res;
    });

    const stream = await serverAct(() =>
      renderResultToReadableStream({
        accessedParams,
        page: <Page />,
        pending,
      }),
    );
    const [stream1, stream2] = stream.tee();

    let content = null;
    const readPromise = readResult(stream1).then(c => (content = c));

    // While the normal pending promise holds the stream open, param c is
    // accessed, settling the next node of the list.
    await serverAct(() => {
      expect(params.c).toBe('value-of-c');
    });
    await serverAct(async () => {});
    expect(content).toBe(null);

    // Param b is never accessed, so the tail of the list stays unsettled.
    // It doesn't keep the response open: once the normal promise resolves,
    // the response completes.
    await serverAct(() => {
      resolveNormal('done');
    });
    await serverAct(async () => {});
    expect(content).not.toBe(null);
    await readPromise;

    const result = await ReactServerDOMClient.createFromReadableStream(
      stream2,
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );
    expect(result.page).toBe('Accessed: value-of-a');

    // Wait until the full response has been processed.
    await serverAct(async () => {});

    // Read the accessed params off the list, synchronously. A node that
    // was never settled by the server stays forever pending, without
    // erroring, which marks the end of the accessed params.
    function readNode(node) {
      // Attach a no-op listener to force Flight to synchronously unwrap a
      // node that was received but not yet initialized.
      node.then(() => {});
      if (node.status !== 'fulfilled') {
        return null;
      }
      return node.value;
    }

    const accessed = [];
    let node = result.accessedParams;
    while (node !== null) {
      const entry = readNode(node);
      if (entry === null) {
        break;
      }
      accessed.push(entry.value);
      node = entry.next;
    }
    expect(accessed).toEqual(['a', 'c']);
  });

  describe('validation and Error values', () => {
    let ExpectedMessageErrorBoundary;
    beforeEach(() => {
      jest.resetModules();
      React = require('react');
      ReactServer = FlightReact;
      use = React.use;
      ReactNoop = require('react-noop-renderer');
      act = require('internal-test-utils').act;
      ReactServerDOMClientNode = jest.requireActual(
        'react-server-dom-webpack/client.node',
      );
      startTransition = React.startTransition;
      ExpectedMessageErrorBoundary = class extends React.Component {
        state = {hasError: false, error: null};
        static getDerivedStateFromError(error) {
          return {
            hasError: true,
            error,
          };
        }
        componentDidCatch(error, errorInfo) {
          expect(error).toBe(this.state.error);
          if (this.props.expectedStack !== undefined) {
            expect(normalizeCodeLocInfo(errorInfo.componentStack)).toBe(
              this.props.expectedStack,
            );
          }
        }
        componentDidMount() {
          expect(this.state.hasError).toBe(true);
          expect(this.state.error).toBeTruthy();
          if (__DEV__) {
            expect(this.state.error.message).toContain(
              this.props.expectedMessage,
            );
            expect(this.state.error.digest).toBe('a dev digest');
            expect(this.state.error.environmentName).toBe(
              this.props.expectedEnviromentName || 'Server',
            );
            if (this.props.expectedErrorStack !== undefined) {
              expect(this.state.error.stack).toContain(
                this.props.expectedErrorStack,
              );
            }
          } else {
            expect(this.state.error.message).toBe(
              'An error occurred in the Server Components render. The specific message is omitted in production' +
                ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
                ' may provide additional details about the nature of the error.',
            );
            let expectedDigest = this.props.expectedMessage;
            if (
              expectedDigest.startsWith('{') ||
              expectedDigest.startsWith('<')
            ) {
              expectedDigest = '{}';
            } else if (expectedDigest.startsWith('[')) {
              expectedDigest = '[]';
            }
            expect(this.state.error.digest).toContain(expectedDigest);
            expect(this.state.error.environmentName).toBe(undefined);
            expect(this.state.error.stack).toBe(
              'Error: ' + this.state.error.message,
            );
          }
        }
        render() {
          if (this.state.hasError) {
            return this.state.error.message;
          }
          return this.props.children;
        }
      };
    });

    function clientReference(value) {
      return clientExports(value);
    }

    function normalizeCodeLocInfo(str) {
      return (
        str &&
        str.replace(/^ +(?:at|in) ([\S]+)[^\n]*/gm, function (m, name) {
          const dot = name.lastIndexOf('.');
          if (dot !== -1) {
            name = name.slice(dot + 1);
          }
          return '    in ' + name + (/\d/.test(m) ? ' (at **)' : '');
        })
      );
    }

    it('can transport Error objects as values', async () => {
      class CustomError extends Error {
        constructor(message) {
          super(message);
          this.name = 'Custom';
        }
      }

      function ComponentClient({prop}) {
        return `
        is error: ${prop instanceof Error}
        name: ${prop.name}
        message: ${prop.message}
        stack: ${normalizeCodeLocInfo(prop.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${prop.environmentName}
      `;
      }
      const Component = clientReference(ComponentClient);

      function ServerComponent() {
        const error = new CustomError('hello');
        return <Component prop={error} />;
      }

      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<ServerComponent />),
      );

      await act(async () => {
        ReactNoop.render(await createResponse(transport));
      });

      if (__DEV__) {
        expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Custom
        message: hello
        stack: Custom: hello
    in ServerComponent (at **)
        environmentName: Server
      `);
      } else {
        expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
      `);
      }
    });

    it('can transport Error.cause', async () => {
      function renderError(error) {
        if (!(error instanceof Error)) {
          return `${JSON.stringify(error)}`;
        }
        return `
        is error: ${error instanceof Error}
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
      }
      function ComponentClient({error}) {
        return renderError(error);
      }
      const Component = clientReference(ComponentClient);

      function ServerComponent() {
        const cause = new TypeError('root cause', {
          cause: {type: 'object cause'},
        });
        const error = new Error('hello', {cause});
        return <Component error={error} />;
      }

      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<ServerComponent />, {
          onError(x) {
            if (__DEV__) {
              return 'a dev digest';
            }
            return `digest("${x.message}")`;
          },
        }),
      );

      await act(async () => {
        ReactNoop.render(await createResponse(transport));
      });

      if (__DEV__) {
        expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Error
        message: hello
        stack: Error: hello
    in ServerComponent (at **)
        environmentName: Server
        cause: 
        is error: true
        name: TypeError
        message: root cause
        stack: TypeError: root cause
    in ServerComponent (at **)
        environmentName: Server
        cause: {"type":"object cause"}`);
      } else {
        expect(ReactNoop).toMatchRenderedOutput(`
        is error: true
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
      }
    });

    it('can transport AggregateError', async () => {
      function renderError(error) {
        if (!(error instanceof Error)) {
          return `${JSON.stringify(error)}`;
        }
        let result = `
        is error: ${error instanceof AggregateError ? 'AggregateError' : 'Error'}
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
        if ('errors' in error) {
          result += `
        errors: [${error.errors.map(e => renderError(e)).join(',\n')}]`;
        }
        return result;
      }
      function ComponentClient({error}) {
        return renderError(error);
      }
      const Component = clientReference(ComponentClient);

      function ServerComponent() {
        const error1 = new TypeError('first error');
        const error2 = new RangeError('second error');
        const error = new AggregateError([error1, error2], 'aggregate');
        return <Component error={error} />;
      }

      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<ServerComponent />, {
          onError(x) {
            if (__DEV__) {
              return 'a dev digest';
            }
            return `digest("${x.message}")`;
          },
        }),
      );

      await act(async () => {
        ReactNoop.render(await createResponse(transport));
      });

      if (__DEV__) {
        expect(ReactNoop).toMatchRenderedOutput(`
        is error: AggregateError
        name: AggregateError
        message: aggregate
        stack: AggregateError: aggregate
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause
        errors: [
        is error: Error
        name: TypeError
        message: first error
        stack: TypeError: first error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: RangeError
        message: second error
        stack: RangeError: second error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause]`);
      } else {
        expect(ReactNoop).toMatchRenderedOutput(`
        is error: Error
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
      }
    });

    it('includes Error.cause in thrown errors', async () => {
      function renderError(error) {
        if (!(error instanceof Error)) {
          return `${JSON.stringify(error)}`;
        }
        return `
        is error: true
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
      }

      function ServerComponent() {
        const cause = new TypeError('root cause', {
          cause: {type: 'object cause'},
        });
        const error = new Error('hello', {cause});
        throw error;
      }

      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<ServerComponent />, {
          onError(x) {
            if (__DEV__) {
              return 'a dev digest';
            }
            return `digest("${x.message}")`;
          },
        }),
      );

      let error;
      try {
        await act(async () => {
          ReactNoop.render(await createResponse(transport));
        });
      } catch (x) {
        error = x;
      }

      if (__DEV__) {
        expect(renderError(error)).toEqual(`
        is error: true
        name: Error
        message: hello
        stack: Error: hello
    in ServerComponent (at **)
        environmentName: Server
        cause: 
        is error: true
        name: TypeError
        message: root cause
        stack: TypeError: root cause
    in ServerComponent (at **)
        environmentName: Server
        cause: {"type":"object cause"}`);
      } else {
        expect(renderError(error)).toEqual(`
        is error: true
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
      }
    });

    it('includes AggregateError.errors in thrown errors', async () => {
      function renderError(error) {
        if (!(error instanceof Error)) {
          return `${JSON.stringify(error)}`;
        }
        let result = `
        is error: ${error instanceof AggregateError ? 'AggregateError' : 'Error'}
        name: ${error.name}
        message: ${error.message}
        stack: ${normalizeCodeLocInfo(error.stack).split('\n').slice(0, 2).join('\n')}
        environmentName: ${error.environmentName}
        cause: ${'cause' in error ? renderError(error.cause) : 'no cause'}`;
        if ('errors' in error) {
          result += `
        errors: [${error.errors.map(e => renderError(e)).join(',\n')}]`;
        }
        return result;
      }

      function ServerComponent() {
        const error1 = new TypeError('first error');
        const error2 = new RangeError('second error');
        const error3 = new Error('third error');
        const error4 = new Error('fourth error');
        const error5 = new Error('fifth error');
        const error6 = new Error('sixth error');
        const error = new AggregateError(
          [error1, error2, error3, error4, error5, error6],
          'aggregate',
        );
        throw error;
      }

      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<ServerComponent />, {
          onError(x) {
            if (__DEV__) {
              return 'a dev digest';
            }
            return `digest("${x.message}")`;
          },
        }),
      );

      let error;
      try {
        await act(async () => {
          ReactNoop.render(await createResponse(transport));
        });
      } catch (x) {
        error = x;
      }

      if (__DEV__) {
        expect(renderError(error)).toEqual(`
        is error: AggregateError
        name: AggregateError
        message: aggregate
        stack: AggregateError: aggregate
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause
        errors: [
        is error: Error
        name: TypeError
        message: first error
        stack: TypeError: first error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: RangeError
        message: second error
        stack: RangeError: second error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: third error
        stack: Error: third error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: fourth error
        stack: Error: fourth error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: fifth error
        stack: Error: fifth error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause,

        is error: Error
        name: Error
        message: sixth error
        stack: Error: sixth error
    in ServerComponent (at **)
        environmentName: Server
        cause: no cause]`);
      } else {
        expect(renderError(error)).toEqual(`
        is error: Error
        name: Error
        message: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        stack: Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
        environmentName: undefined
        cause: no cause`);
      }
    });

    async function encodeConsoleResult(result) {
      const stream = new Stream.PassThrough();
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      const done = new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      ReactServerDOMServer.renderResultToPipeableStream(result, {}).pipe(
        stream,
      );
      await done;
      jest.resetModules();
      __unmockReact();
      React = require('react');
      ReactNoopFlightClient = require('react-noop-renderer/flight-client');
      return chunks;
    }

    // @gate __DEV__
    it('replays logs, but not onError logs', async () => {
      function foo() {
        return 'hello';
      }

      class MyClass {
        constructor() {
          this.x = 1;
        }
        method() {}
        get y() {
          return this.x + 1;
        }
        get z() {
          return this.x + 5;
        }
      }
      Object.defineProperty(MyClass.prototype, 'y', {enumerable: true});

      Object.defineProperty(MyClass, 'name', {value: 'MyClassName'});

      function ServerComponent() {
        console.log('hi', {
          prop: 123,
          fn: foo,
          map: new Map([['foo', foo]]),
          promise: Promise.resolve('yo'),
          infinitePromise: new Promise(() => {}),
          Class: MyClass,
          instance: new MyClass(),
        });
        throw new Error('err');
      }

      function App() {
        return ReactServer.createElement(ServerComponent);
      }

      let ownerStacks = [];

      // These tests are specifically testing console.log.
      // Assign to `mockConsoleLog` so we can still inspect it when `console.log`
      // is overridden by the test modules. The original function will be restored
      // after this test finishes by `jest.restoreAllMocks()`.
      const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
        () => {
          // Uses server React.
          ownerStacks.push(
            normalizeCodeLocInfo(ReactServer.captureOwnerStack()),
          );
        },
      );

      // Reset the modules so that we get a new overridden console on top of the
      // one installed by expect. This ensures that we still emit console.error
      // calls.
      jest.resetModules();
      jest.mock('react', () => require('react/react.react-server'));
      ReactServer = require('react');
      ReactServerDOMServer = require('react-server-dom-webpack/server.node');
      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult({
          root: ReactServer.createElement(App),
        }),
      );
      assertConsoleErrorDev(['Error: err' + '\n    in <stack>']);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
      expect(mockConsoleLog.mock.calls[0][1].prop).toBe(123);
      expect(ownerStacks).toEqual(['\n    in App (at **)']);
      mockConsoleLog.mockClear();
      mockConsoleLog.mockImplementation(() => {
        // Switching to client React.
        ownerStacks.push(normalizeCodeLocInfo(React.captureOwnerStack()));
      });
      ownerStacks = [];

      // Let the Promises resolve.
      await 0;
      await 0;
      await 0;

      // The error should not actually get logged because we're not awaiting the root
      // so it's not thrown but the server log also shouldn't be replayed.
      const source = await encodeConsoleResult(transport);
      await ReactNoopFlightClient.read(source, {close: true});

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
      expect(mockConsoleLog.mock.calls[0][1].prop).toBe(123);
      const loggedFn = mockConsoleLog.mock.calls[0][1].fn;
      expect(typeof loggedFn).toBe('function');
      expect(loggedFn).not.toBe(foo);
      expect(loggedFn.toString()).toBe(foo.toString());

      const loggedMap = mockConsoleLog.mock.calls[0][1].map;
      expect(loggedMap instanceof Map).toBe(true);
      const loggedFn2 = loggedMap.get('foo');
      expect(typeof loggedFn2).toBe('function');
      expect(loggedFn2).not.toBe(foo);
      expect(loggedFn2.toString()).toBe(foo.toString());
      expect(loggedFn2).toBe(loggedFn);

      const promise = mockConsoleLog.mock.calls[0][1].promise;
      expect(promise).toBeInstanceOf(Promise);
      expect(await promise).toBe('yo');

      const infinitePromise = mockConsoleLog.mock.calls[0][1].infinitePromise;
      expect(infinitePromise).toBeInstanceOf(Promise);
      let resolved = false;
      infinitePromise.then(
        () => (resolved = true),
        x => {
          console.error(x);
          resolved = true;
        },
      );
      await 0;
      await 0;
      await 0;
      // This should not reject upon aborting the stream.
      expect(resolved).toBe(false);

      const Class = mockConsoleLog.mock.calls[0][1].Class;
      const instance = mockConsoleLog.mock.calls[0][1].instance;
      expect(typeof Class).toBe('function');
      expect(Class.prototype.constructor).toBe(Class);
      expect(Class.name).toBe('MyClassName');
      expect(instance instanceof Class).toBe(true);
      expect(Object.getPrototypeOf(instance)).toBe(Class.prototype);
      expect(instance.x).toBe(1);
      expect(instance.hasOwnProperty('y')).toBe(true);
      expect(instance.y).toBe(2); // Enumerable getter was reified
      expect(instance.hasOwnProperty('z')).toBe(false);
      expect(instance.z).toBe(6); // Not enumerable getter was transferred as part of the toString() of the class
      expect(typeof instance.method).toBe('function'); // Methods are included only if they're part of the toString()

      expect(ownerStacks).toEqual(['\n    in App (at **)']);
    });

    // @gate __DEV__
    it('replays logs with cyclic objects', async () => {
      const cyclic = {cycle: null};
      cyclic.cycle = cyclic;

      function ServerComponent() {
        console.log('hi', {cyclic});
        return null;
      }

      function App() {
        return ReactServer.createElement(ServerComponent);
      }

      // These tests are specifically testing console.log.
      // Assign to `mockConsoleLog` so we can still inspect it when `console.log`
      // is overridden by the test modules. The original function will be restored
      // after this test finishes by `jest.restoreAllMocks()`.
      const mockConsoleLog = spyOnDevAndProd(console, 'log').mockImplementation(
        () => {},
      );

      // Reset the modules so that we get a new overridden console on top of the
      // one installed by expect. This ensures that we still emit console.error
      // calls.
      jest.resetModules();
      jest.mock('react', () => require('react/react.react-server'));
      ReactServer = require('react');
      ReactServerDOMServer = require('react-server-dom-webpack/server.node');
      const transport = await serverAct(() =>
        ReactServerDOMServer.renderToResult({
          root: ReactServer.createElement(App),
        }),
      );

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
      expect(mockConsoleLog.mock.calls[0][1].cyclic).toBe(cyclic);
      mockConsoleLog.mockClear();
      mockConsoleLog.mockImplementation(() => {});

      // The error should not actually get logged because we're not awaiting the root
      // so it's not thrown but the server log also shouldn't be replayed.
      const source = await encodeConsoleResult(transport);
      await ReactNoopFlightClient.read(source);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog.mock.calls[0][0]).toBe('hi');
      const cyclic2 = mockConsoleLog.mock.calls[0][1].cyclic;
      expect(cyclic2).not.toBe(cyclic); // Was serialized and therefore cloned
      expect(cyclic2.cycle).toBe(cyclic2);
    });

    it('should error if a non-serializable value is passed to a host component', async () => {
      function ClientImpl({children}) {
        return children;
      }
      const Client = clientReference(ClientImpl);

      function EventHandlerProp() {
        return (
          <div className="foo" onClick={function () {}}>
            Test
          </div>
        );
      }
      function FunctionProp() {
        return <div>{function fn() {}}</div>;
      }
      function SymbolProp() {
        return <div foo={Symbol('foo')} />;
      }

      const ref = React.createRef();
      function RefProp() {
        return <div ref={ref} />;
      }

      function EventHandlerPropClient() {
        return (
          <Client className="foo" onClick={function () {}}>
            Test
          </Client>
        );
      }
      function FunctionChildrenClient() {
        return <Client>{function Component() {}}</Client>;
      }
      function FunctionPropClient() {
        return <Client foo={() => {}} />;
      }
      function SymbolPropClient() {
        return <Client foo={Symbol('foo')} />;
      }

      function RefPropClient() {
        return <Client ref={ref} />;
      }

      const options = {
        onError(x) {
          return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
        },
      };
      const event = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<EventHandlerProp />, options),
      );
      const fn = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<FunctionProp />, options),
      );
      const symbol = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<SymbolProp />, options),
      );
      const refs = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<RefProp />, options),
      );
      const eventClient = await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          <EventHandlerPropClient />,
          options,
        ),
      );
      const fnChildrenClient = await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          <FunctionChildrenClient />,
          options,
        ),
      );
      const fnClient = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<FunctionPropClient />, options),
      );
      const symbolClient = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<SymbolPropClient />, options),
      );
      const refsClient = await serverAct(() =>
        ReactServerDOMServer.renderToResult(<RefPropClient />, options),
      );

      function Render({promise}) {
        return use(promise);
      }

      await act(() => {
        startTransition(() => {
          ReactNoop.render(
            <>
              <ExpectedMessageErrorBoundary expectedMessage="Event handlers cannot be passed to Client Component props.">
                <Render promise={createResponse(event)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary
                expectedMessage={
                  __DEV__
                    ? 'Functions are not valid as a child of Client Components. This may happen if you return fn instead of <fn /> from render. Or maybe you meant to call this function rather than return it.'
                    : 'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".'
                }>
                <Render promise={createResponse(fn)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary expectedMessage="Only global symbols received from Symbol.for(...) can be passed to Client Components.">
                <Render promise={createResponse(symbol)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary expectedMessage="Refs cannot be used in Server Components, nor passed to Client Components.">
                <Render promise={createResponse(refs)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary expectedMessage="Event handlers cannot be passed to Client Component props.">
                <Render promise={createResponse(eventClient)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary
                expectedMessage={
                  __DEV__
                    ? 'Functions are not valid as a child of Client Components. This may happen if you return Component instead of <Component /> from render. Or maybe you meant to call this function rather than return it.'
                    : 'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".'
                }>
                <Render promise={createResponse(fnChildrenClient)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary
                expectedMessage={
                  'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".'
                }>
                <Render promise={createResponse(fnClient)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary expectedMessage="Only global symbols received from Symbol.for(...) can be passed to Client Components.">
                <Render promise={createResponse(symbolClient)} />
              </ExpectedMessageErrorBoundary>
              <ExpectedMessageErrorBoundary expectedMessage="Refs cannot be used in Server Components, nor passed to Client Components.">
                <Render promise={createResponse(refsClient)} />
              </ExpectedMessageErrorBoundary>
            </>,
          );
        });
      });
    });

    it('should error if a class instance is passed to a host component', async () => {
      class Foo {
        method() {}
      }
      const errors = [];
      await serverAct(() => {
        ReactServerDOMServer.renderToResult(<input value={new Foo()} />, {
          onError(x) {
            errors.push(x.message);
          },
        });
      });

      expect(errors).toEqual([
        'Only plain objects, and a few built-ins, can be passed to Client Components ' +
          'from Server Components. Classes or null prototypes are not supported.' +
          (__DEV__
            ? '\n' + '  <input value={{}}>\n' + '               ^^^^'
            : '\n' + '  {value: {}}\n' + '          ^^'),
      ]);
    });

    // @gate __DEV__
    it('can get the component owner stacks during rendering in dev', async () => {
      let stack;

      function Foo() {
        return ReactServer.createElement(Bar, null);
      }
      function Bar() {
        return ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement(Baz, null),
        );
      }

      function Baz() {
        stack = ReactServer.captureOwnerStack();
        return ReactServer.createElement('span', null, 'hi');
      }
      await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          ReactServer.createElement(
            'div',
            null,
            ReactServer.createElement(Foo, null),
          ),
        ),
      );

      expect(normalizeCodeLocInfo(stack)).toBe(
        '\n    in Bar (at **)' + '\n    in Foo (at **)',
      );
    });

    // @gate __DEV__
    it('can get the component owner stacks for onError in dev', async () => {
      const thrownError = new Error('hi');
      let caughtError;
      let ownerStack;

      function Foo() {
        return ReactServer.createElement(Bar, null);
      }
      function Bar() {
        return ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement(Baz, null),
        );
      }
      function Baz() {
        throw thrownError;
      }

      await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          ReactServer.createElement(
            'div',
            null,
            ReactServer.createElement(Foo, null),
          ),
          {
            onError(error, errorInfo) {
              caughtError = error;
              ownerStack = ReactServer.captureOwnerStack
                ? ReactServer.captureOwnerStack()
                : null;
            },
          },
        ),
      );

      expect(caughtError).toBe(thrownError);
      expect(normalizeCodeLocInfo(ownerStack)).toBe(
        '\n    in Bar (at **)' + '\n    in Foo (at **)',
      );
    });

    // @gate __DEV__
    it('can get the component owner stacks asynchronously', async () => {
      let stack;

      function Foo() {
        return ReactServer.createElement(Bar, null);
      }
      function Bar() {
        return ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement(Baz, null),
        );
      }

      const promise = Promise.resolve(0);

      async function Baz() {
        await promise;
        stack = ReactServer.captureOwnerStack();
        return ReactServer.createElement('span', null, 'hi');
      }

      const stream = await serverAct(() =>
        ReactServerDOMServer.renderToResult(
          ReactServer.createElement(
            'div',
            null,
            ReactServer.createElement(Foo, null),
          ),
        ),
      );
      await createResponse(stream);

      expect(normalizeCodeLocInfo(stack)).toBe(
        '\n    in Bar (at **)' + '\n    in Foo (at **)',
      );
    });
  });

  describe('built-in values', () => {
    beforeEach(() => {
      jest.resetModules();
      __unmockReact();
      React = require('react');
      ReactNoop = require('react-noop-renderer');
      act = require('internal-test-utils').act;
    });

    it('can transport BigInt', async () => {
      function ComponentClient({prop}) {
        return `prop: ${prop} (${typeof prop})`;
      }
      const Component = clientExports(ComponentClient);

      const model = <Component prop={90071992547409910000n} />;

      const result = await serverAct(() =>
        ReactServerDOMServer.renderToResult(model),
      );
      const response = createResponse(result);

      await act(async () => {
        ReactNoop.render(await response);
      });

      expect(ReactNoop).toMatchRenderedOutput(
        'prop: 90071992547409910000 (bigint)',
      );
    });

    it('can transport Date', async () => {
      function ComponentClient({prop}) {
        return `prop: ${prop.toISOString()}`;
      }
      const Component = clientExports(ComponentClient);

      const model = <Component prop={new Date(1234567890123)} />;

      const result = await serverAct(() =>
        ReactServerDOMServer.renderToResult(model),
      );
      const response = createResponse(result);

      await act(async () => {
        ReactNoop.render(await response);
      });

      expect(ReactNoop).toMatchRenderedOutput('prop: 2009-02-13T23:31:30.123Z');
    });

    it('can transport Date as a top-level value', async () => {
      const date = new Date(0);
      const result = await serverAct(() =>
        ReactServerDOMServer.renderToResult(date),
      );
      const response = createResponse(result);

      let readValue;
      await act(async () => {
        readValue = await response;
      });

      expect(readValue).toEqual(date);
    });
  });
});
