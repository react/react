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

import fs from 'fs';
import os from 'os';
import path from 'path';
import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let clientExports;
let webpackMap;
let webpackModules;
let webpackModuleLoading;
let React;
let ReactDOMServer;
let ReactDOMFizzStatic;
let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMStaticServer;
let ReactServerDOMClient;
let Stream;
let use;
let assertConsoleErrorDev;
let serverAct;

// We test pass-through without encoding strings but it should work without it too.
const streamOptions = {
  objectMode: true,
};

describe('ReactFlightDOMNode', () => {
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
    jest.mock('react-server-dom-webpack/static', () =>
      jest.requireActual('react-server-dom-webpack/static.node'),
    );
    ReactServerDOMStaticServer = require('react-server-dom-webpack/static');

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
    ReactDOMFizzStatic = require('react-dom/static');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');
    use = React.use;

    const InternalTestUtils = require('internal-test-utils');
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  function filterStackFrame(filename, functionName) {
    return (
      filename !== '' &&
      !filename.startsWith('node:') &&
      !filename.includes('node_modules') &&
      // Filter out our own internal source code since it'll typically be in node_modules
      (!filename.includes('/packages/') || filename.includes('/__tests__/')) &&
      !filename.includes('/build/')
    );
  }

  const relativeFilename = path.relative(__dirname, __filename);

  function normalizeCodeLocInfo(str, {preserveLocation = false} = {}) {
    return (
      str &&
      str.replace(
        /^ +(?:at|in) ([\S]+) ([^\n]*)/gm,
        function (m, name, location) {
          return (
            '    in ' +
            name +
            (/:\d+:\d+/.test(m)
              ? preserveLocation
                ? ' ' + location.replace(__filename, relativeFilename)
                : ' (at **)'
              : '')
          );
        },
      )
    );
  }

  /**
   * Removes all stackframes not pointing into this file
   */
  function ignoreListStack(str) {
    if (!str) {
      return str;
    }

    let ignoreListedStack = '';
    const lines = str.split('\n');

    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const line of lines) {
      if (line.indexOf(__filename) === -1) {
      } else {
        ignoreListedStack += '\n' + line.replace(__dirname, '.');
      }
    }

    return ignoreListedStack;
  }

  function readResult(stream) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const writable = new Stream.PassThrough(streamOptions);
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

  async function readWebResult(webStream: ReadableStream<Uint8Array>) {
    const reader = webStream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return result;
      }
      result += Buffer.from(value).toString('utf8');
    }
  }

  async function createBufferedUnclosingStream(
    stream: ReadableStream<Uint8Array>,
  ): Promise<ReadableStream<Uint8Array>> {
    const chunks: Array<Uint8Array> = [];
    const reader = stream.getReader();
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      } else {
        chunks.push(value);
      }
    }

    let i = 0;
    return new ReadableStream({
      async pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(chunks[i++]);
        }
      },
    });
  }

  function createDelayedStream() {
    let resolveDelayedStream;
    const promise = new Promise(resolve => (resolveDelayedStream = resolve));
    const delayedStream = new Stream.Transform({
      ...streamOptions,
      transform(chunk, encoding, callback) {
        // Artificially delay pushing the chunk.
        promise.then(() => {
          this.push(chunk);
          callback();
        });
      },
    });
    return {delayedStream, resolveDelayedStream};
  }

  it('should support web streams in node', async () => {
    function Text({children}) {
      return <span>{children}</span>;
    }
    // Large strings can get encoded differently so we need to test that.
    const largeString = 'world'.repeat(1000);
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>{largeString}</Text>
        </div>
      );
    }

    function App() {
      const model = {
        html: <HTML />,
      };
      return model;
    }

    const readable = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />, webpackMap),
    );
    const response = ReactServerDOMClient.createFromReadableStream(readable, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    const model = await response;
    expect(model).toEqual({
      html: (
        <div>
          <span>hello</span>
          <span>{largeString}</span>
        </div>
      ),
    });
  });

  it('should allow an alternative module mapping to be used for SSR', async () => {
    function ClientComponent() {
      return <span>Client Component</span>;
    }
    // The Client build may not have the same IDs as the Server bundles for the same
    // component.
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      123,
      'path/to/chunk.js',
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);

    // In the SSR bundle this module won't exist. We simulate this by deleting it.
    const clientId = webpackMap[ClientComponentOnTheClient.$$id].id;
    delete webpackModules[clientId];

    // Instead, we have to provide a translation from the client meta data to the SSR
    // meta data.
    const ssrMetadata = webpackMap[ClientComponentOnTheServer.$$id];
    const translationMap = {
      [clientId]: {
        '*': ssrMetadata,
      },
    };
    const serverConsumerManifest = {
      moduleMap: translationMap,
      moduleLoading: webpackModuleLoading,
    };

    function App() {
      return <ClientComponentOnTheClient />;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, webpackMap),
    );
    const readable = new Stream.PassThrough(streamOptions);
    let response;

    stream.pipe(readable);

    function ClientRoot() {
      if (response) return use(response);
      response = ReactServerDOMClient.createFromNodeStream(
        readable,
        serverConsumerManifest,
      );
      return use(response);
    }

    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(<ClientRoot />),
    );
    const result = await readResult(ssrStream);
    expect(result).toEqual(
      '<script src="/path/to/chunk.js" async=""></script><span>Client Component</span>',
    );
  });

  it('should encode long string in a compact format', async () => {
    const testString = '"\n\t'.repeat(500) + '🙃';

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream({
        text: testString,
      }),
    );

    const readable = new Stream.PassThrough(streamOptions);

    const stringResult = readResult(readable);
    const parsedResult = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: webpackModuleLoading,
    });

    stream.pipe(readable);

    const serializedContent = await stringResult;
    // The content should be compact an unescaped
    expect(serializedContent.length).toBeLessThan(2000);
    expect(serializedContent).not.toContain('\\n');
    expect(serializedContent).not.toContain('\\t');
    expect(serializedContent).not.toContain('\\"');
    expect(serializedContent).toContain('\t');

    const result = await parsedResult;
    // Should still match the result when parsed
    expect(result.text).toBe(testString);
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
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(buffers),
    );
    const readable = new Stream.PassThrough(streamOptions);
    const promise = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: webpackModuleLoading,
    });
    stream.pipe(readable);
    const result = await promise;
    expect(result).toEqual(buffers);
  });

  it('should allow accept a nonce option for Flight preinitialized scripts', async () => {
    function ClientComponent() {
      return <span>Client Component</span>;
    }
    // The Client build may not have the same IDs as the Server bundles for the same
    // component.
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      123,
      'path/to/chunk.js',
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);

    // In the SSR bundle this module won't exist. We simulate this by deleting it.
    const clientId = webpackMap[ClientComponentOnTheClient.$$id].id;
    delete webpackModules[clientId];

    // Instead, we have to provide a translation from the client meta data to the SSR
    // meta data.
    const ssrMetadata = webpackMap[ClientComponentOnTheServer.$$id];
    const translationMap = {
      [clientId]: {
        '*': ssrMetadata,
      },
    };
    const serverConsumerManifest = {
      moduleMap: translationMap,
      moduleLoading: webpackModuleLoading,
    };

    function App() {
      return <ClientComponentOnTheClient />;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, webpackMap),
    );
    const readable = new Stream.PassThrough(streamOptions);
    let response;

    stream.pipe(readable);

    function ClientRoot() {
      if (response) return use(response);
      response = ReactServerDOMClient.createFromNodeStream(
        readable,
        serverConsumerManifest,
        {
          nonce: 'r4nd0m',
        },
      );
      return use(response);
    }

    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(<ClientRoot />),
    );
    const result = await readResult(ssrStream);
    expect(result).toEqual(
      '<script src="/path/to/chunk.js" async="" nonce="r4nd0m"></script><span>Client Component</span>',
    );
  });

  it('should cancel the underlying and transported ReadableStreams when we are cancelled', async () => {
    let controller;
    let cancelReason;
    const s = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel(r) {
        cancelReason = r;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        s,
        {},
        {
          onError(error) {
            return error.message;
          },
        },
      ),
    );

    const readable = new Stream.PassThrough(streamOptions);
    rscStream.pipe(readable);

    const result = await ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: webpackModuleLoading,
    });
    const reader = result.getReader();

    controller.enqueue('hi');

    await serverAct(async () => {
      // We should be able to read the part we already emitted before the abort
      expect(await reader.read()).toEqual({
        value: 'hi',
        done: false,
      });
    });

    const reason = new Error('aborted');
    readable.destroy(reason);

    await new Promise(resolve => {
      readable.on('error', () => {
        resolve();
      });
    });

    expect(cancelReason.message).toBe(
      'The destination stream errored while writing data.',
    );

    let error = null;
    try {
      await reader.read();
    } catch (x) {
      error = x;
    }
    expect(error).toBe(reason);
  });

  it('should cancel the underlying and transported ReadableStreams when we abort', async () => {
    const errors = [];
    let controller;
    let cancelReason;
    const s = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel(r) {
        cancelReason = r;
      },
    });
    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        s,
        {},
        {
          onError(x) {
            errors.push(x);
            return x.message;
          },
        },
      ),
    );

    const readable = new Stream.PassThrough(streamOptions);
    rscStream.pipe(readable);

    const result = await ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: webpackModuleLoading,
    });
    const reader = result.getReader();
    controller.enqueue('hi');

    const reason = new Error('aborted');
    rscStream.abort(reason);

    expect(cancelReason).toBe(reason);

    let error = null;
    try {
      await reader.read();
    } catch (x) {
      error = x;
    }
    expect(error.digest).toBe('aborted');
    expect(errors).toEqual([reason]);
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
        pendingResult: ReactServerDOMStaticServer.prerenderToNodeStream(
          <App />,
          webpackMap,
        ),
      };
    });

    resolveGreeting();
    const {prelude} = await pendingResult;

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromNodeStream(prelude, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    // Use the SSR render to resolve any lazy elements
    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        React.createElement(ClientRoot, {response}),
      ),
    );
    // Should still match the result when parsed
    const result = await readResult(ssrStream);
    expect(result).toBe('<div>hello world</div>');
  });

  it('does not propagate abort reasons errors when aborting a prerender', async () => {
    let resolveGreeting;
    const greetingPromise = new Promise(resolve => {
      resolveGreeting = resolve;
    });

    function App() {
      return (
        <div>
          <ReactServer.Suspense fallback="loading...">
            <Greeting />
          </ReactServer.Suspense>
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
        pendingResult: ReactServerDOMStaticServer.prerenderToNodeStream(
          <App />,
          webpackMap,
          {
            signal: controller.signal,
            onError(err) {
              errors.push(err);
            },
          },
        ),
      };
    });

    controller.abort('boom');
    resolveGreeting();
    const {prelude} = await serverAct(() => pendingResult);
    expect(errors).toEqual([]);

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromNodeStream(prelude, {
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
      },
    });
    errors.length = 0;
    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        React.createElement(ClientRoot, {response}),
        {
          onError(error) {
            errors.push(error);
          },
        },
      ),
    );
    ssrStream.abort('bam');
    expect(errors).toEqual([new Error('Connection closed.')]);
    // Should still match the result when parsed
    const result = await readResult(ssrStream);
    expect(result).toContain('loading...');
  });

  it('includes source locations in component and owner stacks for halted components', async () => {
    async function Component() {
      await new Promise(() => {});
      return null;
    }

    function App() {
      return ReactServer.createElement(
        'html',
        null,
        ReactServer.createElement(
          'body',
          null,
          ReactServer.createElement(
            ReactServer.Suspense,
            {fallback: 'Loading...'},
            ReactServer.createElement(Component, null),
          ),
        ),
      );
    }

    const errors = [];
    const serverAbortController = new AbortController();
    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          ReactServer.createElement(App, null),
          webpackMap,
          {
            signal: serverAbortController.signal,
            onError(error) {
              errors.push(error);
            },
          },
        ),
      };
    });

    await await serverAct(
      async () =>
        new Promise(resolve => {
          setImmediate(() => {
            serverAbortController.abort();
            resolve();
          });
        }),
    );

    const {prelude} = await pendingResult;

    expect(errors).toEqual([]);

    function ClientRoot({response}) {
      return use(response);
    }

    const prerenderResponse = ReactServerDOMClient.createFromReadableStream(
      await createBufferedUnclosingStream(prelude),
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    let componentStack;
    let ownerStack;

    const clientAbortController = new AbortController();

    const fizzPrerenderStreamResult = ReactDOMFizzStatic.prerender(
      React.createElement(ClientRoot, {response: prerenderResponse}),
      {
        signal: clientAbortController.signal,
        onError(error, errorInfo) {
          componentStack = errorInfo.componentStack;
          ownerStack = React.captureOwnerStack
            ? React.captureOwnerStack()
            : null;
        },
      },
    );

    await await serverAct(
      async () =>
        new Promise(resolve => {
          setImmediate(() => {
            clientAbortController.abort();
            resolve();
          });
        }),
    );

    const fizzPrerenderStream = await fizzPrerenderStreamResult;
    const prerenderHTML = await readWebResult(fizzPrerenderStream.prelude);

    expect(prerenderHTML).toContain('Loading...');

    if (__DEV__) {
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n' +
          '    in Component' +
          (gate(flags => flags.enableAsyncDebugInfo) ? ' (at **)\n' : '\n') +
          '    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in App (at **)\n' +
          '    in ClientRoot (at **)',
      );
    } else {
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in ClientRoot (at **)',
      );
    }

    if (__DEV__) {
      if (gate(flags => flags.enableAsyncDebugInfo)) {
        expect(normalizeCodeLocInfo(ownerStack)).toBe(
          '\n    in Component (at **)\n    in App (at **)',
        );
      } else {
        expect(normalizeCodeLocInfo(ownerStack)).toBe('\n    in App (at **)');
      }
    } else {
      expect(ownerStack).toBeNull();
    }
  });

  it('includes source locations in component and owner stacks for halted Client components', async () => {
    function SharedComponent({p1, p2, p3}) {
      use(p1);
      use(p2);
      use(p3);
      return <div>Hello, Dave!</div>;
    }
    const ClientComponentOnTheServer = clientExports(SharedComponent);
    const ClientComponentOnTheClient = clientExports(
      SharedComponent,
      123,
      'path/to/chunk.js',
    );

    let resolvePendingPromise;
    function ServerComponent() {
      const p1 = Promise.resolve();
      const p2 = new Promise(resolve => {
        resolvePendingPromise = value => {
          p2.status = 'fulfilled';
          p2.value = value;
          resolve(value);
        };
      });
      const p3 = new Promise(() => {});
      return ReactServer.createElement(ClientComponentOnTheClient, {
        p1: p1,
        p2: p2,
        p3: p3,
      });
    }

    function App() {
      return ReactServer.createElement(
        'html',
        null,
        ReactServer.createElement(
          'body',
          null,
          ReactServer.createElement(
            ReactServer.Suspense,
            {fallback: 'Loading...'},
            ReactServer.createElement(ServerComponent, null),
          ),
        ),
      );
    }

    const errors = [];
    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(App, null),
        webpackMap,
      ),
    );

    const readable = new Stream.PassThrough(streamOptions);
    rscStream.pipe(readable);

    function ClientRoot({response}) {
      return use(response);
    }

    const serverConsumerManifest = {
      moduleMap: {
        [webpackMap[ClientComponentOnTheClient.$$id].id]: {
          '*': webpackMap[ClientComponentOnTheServer.$$id],
        },
      },
      moduleLoading: webpackModuleLoading,
    };

    expect(errors).toEqual([]);

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromNodeStream(
      readable,
      serverConsumerManifest,
    );

    let componentStack;
    let ownerStack;

    const clientAbortController = new AbortController();

    const fizzPrerenderStreamResult = ReactDOMFizzStatic.prerender(
      React.createElement(ClientRoot, {response}),
      {
        signal: clientAbortController.signal,
        onError(error, errorInfo) {
          componentStack = errorInfo.componentStack;
          ownerStack = React.captureOwnerStack
            ? React.captureOwnerStack()
            : null;
        },
      },
    );

    resolvePendingPromise('custom-instrum-resolve');
    await serverAct(
      async () =>
        new Promise(resolve => {
          setImmediate(() => {
            clientAbortController.abort();
            resolve();
          });
        }),
    );

    const fizzPrerenderStream = await fizzPrerenderStreamResult;
    const prerenderHTML = await readWebResult(fizzPrerenderStream.prelude);

    expect(prerenderHTML).toContain('Loading...');

    if (__DEV__) {
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n' +
          '    in SharedComponent (at **)\n' +
          '    in ServerComponent' +
          (gate(flags => flags.enableAsyncDebugInfo) ? ' (at **)' : '') +
          '\n' +
          '    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in App (at **)\n' +
          '    in ClientRoot (at **)',
      );
    } else {
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n' +
          '    in SharedComponent (at **)\n' +
          '    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in ClientRoot (at **)',
      );
    }

    if (__DEV__) {
      expect(ignoreListStack(ownerStack)).toBe(
        // eslint-disable-next-line react-internal/safe-string-coercion
        '' +
          // The concrete location may change as this test is updated.
          // Just make sure they still point at React.use(p2)
          (gate(flags => flags.enableAsyncDebugInfo)
            ? '\n    at SharedComponent (./ReactFlightDOMNode-test.js:813:7)'
            : '') +
          '\n    at ServerComponent (file://./ReactFlightDOMNode-test.js:835:26)' +
          '\n    at App (file://./ReactFlightDOMNode-test.js:852:25)',
      );
    } else {
      expect(ownerStack).toBeNull();
    }
  });

  it('includes deeper location for aborted stacks', async () => {
    async function getData() {
      const signal = ReactServer.cacheSignal();
      await new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      });
    }

    async function thisShouldNotBeInTheStack() {
      await new Promise((resolve, reject) => {
        resolve();
      });
    }

    async function Component() {
      try {
        await getData();
      } catch (x) {
        await thisShouldNotBeInTheStack(); // This is issued after the rejection so should not be included.
      }
      return null;
    }

    function App() {
      return ReactServer.createElement(
        'html',
        null,
        ReactServer.createElement(
          'body',
          null,
          ReactServer.createElement(
            ReactServer.Suspense,
            {fallback: 'Loading...'},
            ReactServer.createElement(Component, null),
          ),
        ),
      );
    }

    const errors = [];
    const serverAbortController = new AbortController();
    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          ReactServer.createElement(App, null),
          webpackMap,
          {
            signal: serverAbortController.signal,
            onError(error) {
              errors.push(error);
            },
            filterStackFrame,
          },
        ),
      };
    });

    await serverAct(
      () =>
        new Promise(resolve => {
          setImmediate(() => {
            serverAbortController.abort();
            resolve();
          });
        }),
    );

    const {prelude} = await pendingResult;

    expect(errors).toEqual([]);

    function ClientRoot({response}) {
      return use(response);
    }

    const prerenderResponse = ReactServerDOMClient.createFromReadableStream(
      await createBufferedUnclosingStream(prelude),
      {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      },
    );

    let componentStack;
    let ownerStack;

    const clientAbortController = new AbortController();

    const fizzPrerenderStreamResult = ReactDOMFizzStatic.prerender(
      React.createElement(ClientRoot, {response: prerenderResponse}),
      {
        signal: clientAbortController.signal,
        onError(error, errorInfo) {
          componentStack = errorInfo.componentStack;
          ownerStack = React.captureOwnerStack
            ? React.captureOwnerStack()
            : null;
        },
      },
    );

    await await serverAct(
      async () =>
        new Promise(resolve => {
          setImmediate(() => {
            clientAbortController.abort();
            resolve();
          });
        }),
    );

    const fizzPrerenderStream = await fizzPrerenderStreamResult;
    const prerenderHTML = await readWebResult(fizzPrerenderStream.prelude);

    expect(prerenderHTML).toContain('Loading...');

    if (__DEV__) {
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n' +
          '    in Component' +
          (gate(flags => flags.enableAsyncDebugInfo) ? ' (at **)\n' : '\n') +
          '    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in App (at **)\n' +
          '    in ClientRoot (at **)',
      );
    } else {
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in ClientRoot (at **)',
      );
    }

    if (__DEV__) {
      if (gate(flags => flags.enableAsyncDebugInfo)) {
        expect(normalizeCodeLocInfo(ownerStack)).toBe(
          '' +
            '\n    in getData (at **)' +
            '\n    in Component (at **)' +
            '\n    in App (at **)',
        );
      } else {
        expect(normalizeCodeLocInfo(ownerStack)).toBe(
          '' + '\n    in App (at **)',
        );
      }
    } else {
      expect(ownerStack).toBeNull();
    }
  });

  it('can handle an empty prelude when prerendering', async () => {
    function App() {
      return null;
    }

    const serverAbortController = new AbortController();
    serverAbortController.abort();
    const errors = [];
    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          ReactServer.createElement(App, null),
          webpackMap,
          {
            signal: serverAbortController.signal,
            onError(error) {
              errors.push(error);
            },
          },
        ),
      };
    });

    expect(errors).toEqual([]);

    const {prelude} = await pendingResult;

    const reader = prelude.getReader();
    while (true) {
      const {done} = await reader.read();
      if (done) {
        break;
      }
    }

    // We don't really have an assertion other than to make sure
    // the stream doesn't hang.
  });

  // @gate __DEV__
  it('can transport debug info through a separate debug channel', async () => {
    function Thrower() {
      throw new Error('ssr-throw');
    }

    const ClientComponentOnTheClient = clientExports(
      Thrower,
      123,
      'path/to/chunk.js',
    );

    const ClientComponentOnTheServer = clientExports(Thrower);

    function App() {
      return ReactServer.createElement(
        ReactServer.Suspense,
        null,
        ReactServer.createElement(ClientComponentOnTheClient, null),
      );
    }

    const debugReadable = new Stream.PassThrough(streamOptions);

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(App, null),
        webpackMap,
        {
          debugChannel: new Stream.Writable({
            write(chunk, encoding, callback) {
              debugReadable.write(chunk, encoding);
              callback();
            },
            final() {
              debugReadable.end();
            },
          }),
        },
      ),
    );

    // Create a delayed stream to simulate that the RSC stream might be
    // transported slower than the debug channel, which must not lead to a
    // `Connection closed` error in the Flight client.
    const {delayedStream, resolveDelayedStream} = createDelayedStream();

    rscStream.pipe(delayedStream);

    function ClientRoot({response}) {
      return use(response);
    }

    const serverConsumerManifest = {
      moduleMap: {
        [webpackMap[ClientComponentOnTheClient.$$id].id]: {
          '*': webpackMap[ClientComponentOnTheServer.$$id],
        },
      },
      moduleLoading: webpackModuleLoading,
    };

    const response = ReactServerDOMClient.createFromNodeStream(
      delayedStream,
      serverConsumerManifest,
      {debugChannel: debugReadable},
    );

    setTimeout(resolveDelayedStream);

    let ownerStack;

    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        <ClientRoot response={response} />,
        {
          onError(err, errorInfo) {
            ownerStack = React.captureOwnerStack
              ? React.captureOwnerStack()
              : null;
          },
        },
      ),
    );

    const result = await readResult(ssrStream);

    expect(normalizeCodeLocInfo(ownerStack)).toBe('\n    in App (at **)');

    expect(result).toContain(
      'Switched to client rendering because the server rendering errored:\n\nssr-throw',
    );
  });

  // @gate __DEV__
  it('can transport debug info through a slow debug channel', async () => {
    function Thrower() {
      throw new Error('ssr-throw');
    }

    const ClientComponentOnTheClient = clientExports(
      Thrower,
      123,
      'path/to/chunk.js',
    );

    const ClientComponentOnTheServer = clientExports(Thrower);

    function App() {
      return ReactServer.createElement(
        ReactServer.Suspense,
        null,
        ReactServer.createElement(ClientComponentOnTheClient, null),
      );
    }

    // Create a delayed stream to simulate that the debug stream might be
    // transported slower than the RSC stream, which must not lead to missing
    // debug info.
    const {delayedStream, resolveDelayedStream} = createDelayedStream();

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(App, null),
        webpackMap,
        {
          debugChannel: new Stream.Writable({
            write(chunk, encoding, callback) {
              delayedStream.write(chunk, encoding);
              callback();
            },
            final() {
              delayedStream.end();
            },
          }),
        },
      ),
    );

    const readable = new Stream.PassThrough(streamOptions);

    rscStream.pipe(readable);

    function ClientRoot({response}) {
      return use(response);
    }

    const serverConsumerManifest = {
      moduleMap: {
        [webpackMap[ClientComponentOnTheClient.$$id].id]: {
          '*': webpackMap[ClientComponentOnTheServer.$$id],
        },
      },
      moduleLoading: webpackModuleLoading,
    };

    const response = ReactServerDOMClient.createFromNodeStream(
      readable,
      serverConsumerManifest,
      {debugChannel: delayedStream},
    );

    setTimeout(resolveDelayedStream);

    let ownerStack;

    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(
        <ClientRoot response={response} />,
        {
          onError(err, errorInfo) {
            ownerStack = React.captureOwnerStack
              ? React.captureOwnerStack()
              : null;
          },
        },
      ),
    );

    const result = await readResult(ssrStream);

    expect(normalizeCodeLocInfo(ownerStack)).toBe('\n    in App (at **)');

    expect(result).toContain(
      'Switched to client rendering because the server rendering errored:\n\nssr-throw',
    );
  });

  // This is a regression test for a specific issue where byte Web Streams are
  // detaching ArrayBuffers, which caused downstream issues (e.g. "Cannot
  // perform Construct on a detached ArrayBuffer") for chunks that are using
  // Node's internal Buffer pool.
  it('should not corrupt the Node.js Buffer pool by detaching ArrayBuffers when using Web Streams', async () => {
    // Create a temp file smaller than 4KB to ensure it uses the Buffer pool.
    const file = path.join(os.tmpdir(), 'test.bin');
    fs.writeFileSync(file, Buffer.alloc(4095));
    const fileChunk = fs.readFileSync(file);
    fs.unlinkSync(file);

    // Verify this chunk uses the Buffer pool (8192 bytes for files < 4KB).
    expect(fileChunk.buffer.byteLength).toBe(8192);

    const readable = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(fileChunk, webpackMap),
    );

    // Create a Web Streams WritableStream that tries to use Buffer operations.
    const writable = new WritableStream({
      write(chunk) {
        // Only write one byte to ensure Node.js is not creating a new Buffer
        // pool. Typically, library code (e.g. a compression middleware) would
        // call Buffer.from(chunk) or similar, instead of allocating a new
        // Buffer directly. With that, the test file could only be ~2600 bytes.
        Buffer.allocUnsafe(1);
      },
    });

    // Must not throw an error.
    await readable.pipeTo(writable);
  });

  describe('with real timers', () => {
    // These tests schedule their rendering in a way that requires real timers
    // to be used to accurately represent how this interacts with React's
    // internal scheduling.

    beforeEach(() => {
      jest.useRealTimers();
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('should use late-arriving I/O debug info to enhance component and owner stacks when aborting a prerender', async () => {
      let resolveDynamicData1;
      let resolveDynamicData2;

      async function getDynamicData1() {
        return new Promise(resolve => {
          resolveDynamicData1 = resolve;
        });
      }

      async function getDynamicData2() {
        return new Promise(resolve => {
          resolveDynamicData2 = resolve;
        });
      }

      async function Dynamic() {
        const data1 = await getDynamicData1();
        const data2 = await getDynamicData2();

        return ReactServer.createElement('p', null, data1, ' ', data2);
      }

      function App() {
        return ReactServer.createElement(
          'html',
          null,
          ReactServer.createElement(
            'body',
            null,
            ReactServer.createElement(Dynamic),
          ),
        );
      }

      let staticEndTime = -1;
      const initialChunks = [];
      const dynamicChunks = [];

      await new Promise(resolve => {
        setTimeout(async () => {
          const stream = ReactServerDOMServer.renderToPipeableStream(
            ReactServer.createElement(App),
            webpackMap,
            {filterStackFrame},
          );

          const passThrough = new Stream.PassThrough(streamOptions);
          stream.pipe(passThrough);

          passThrough.on('data', chunk => {
            if (staticEndTime < 0) {
              initialChunks.push(chunk);
            } else {
              dynamicChunks.push(chunk);
            }
          });

          passThrough.on('end', resolve);
        });
        setTimeout(() => {
          staticEndTime = performance.now() + performance.timeOrigin;
          resolveDynamicData1('Hi');
          setTimeout(() => {
            resolveDynamicData2('Josh');
          });
        });
      });

      // Create a new Readable and push all initial chunks immediately.
      const readable = new Stream.Readable({...streamOptions, read() {}});
      for (let i = 0; i < initialChunks.length; i++) {
        readable.push(initialChunks[i]);
      }

      const abortController = new AbortController();

      // When prerendering is aborted, push all dynamic chunks. They won't be
      // considered for rendering, but they include debug info we want to use.
      abortController.signal.addEventListener(
        'abort',
        () => {
          for (let i = 0; i < dynamicChunks.length; i++) {
            readable.push(dynamicChunks[i]);
          }
        },
        {once: true},
      );

      const response = ReactServerDOMClient.createFromNodeStream(
        readable,
        {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        },
        {
          // Debug info arriving after this end time will be ignored, e.g. the
          // I/O info for the second dynamic data.
          endTime: staticEndTime,
        },
      );

      function ClientRoot() {
        return use(response);
      }

      let componentStack;
      let ownerStack;

      const {prelude} = await new Promise(resolve => {
        let result;

        setTimeout(() => {
          result = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {
              signal: abortController.signal,
              onError(error, errorInfo) {
                componentStack = errorInfo.componentStack;
                ownerStack = React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null;
              },
            },
          );
        });

        setTimeout(() => {
          abortController.abort();
          resolve(result);
        });
      });

      const prerenderHTML = await readResult(prelude);

      expect(prerenderHTML).toBe('');

      if (__DEV__) {
        expect(
          normalizeCodeLocInfo(componentStack, {preserveLocation: true}),
        ).toBe(
          '\n' +
            '    in Dynamic' +
            (gate(flags => flags.enableAsyncDebugInfo)
              ? ' (file://ReactFlightDOMNode-test.js:1416:27)\n'
              : '\n') +
            '    in body\n' +
            '    in html\n' +
            '    in App (file://ReactFlightDOMNode-test.js:1429:25)\n' +
            '    in ClientRoot (ReactFlightDOMNode-test.js:1504:16)',
        );
      } else {
        expect(
          normalizeCodeLocInfo(componentStack, {preserveLocation: true}),
        ).toBe(
          '\n' +
            '    in body\n' +
            '    in html\n' +
            '    in ClientRoot (ReactFlightDOMNode-test.js:1504:16)',
        );
      }

      if (__DEV__) {
        if (gate(flags => flags.enableAsyncDebugInfo)) {
          expect(
            normalizeCodeLocInfo(ownerStack, {preserveLocation: true}),
          ).toBe(
            '\n' +
              '    in Dynamic (file://ReactFlightDOMNode-test.js:1416:27)\n' +
              '    in App (file://ReactFlightDOMNode-test.js:1429:25)',
          );
        } else {
          expect(
            normalizeCodeLocInfo(ownerStack, {preserveLocation: true}),
          ).toBe(
            '' +
              '\n' +
              '    in App (file://ReactFlightDOMNode-test.js:1429:25)',
          );
        }
      } else {
        expect(ownerStack).toBeNull();
      }
    });

    it('should use late-arriving I/O debug info from rejected server promises to enhance component and owner stacks when aborting a prerender', async () => {
      let rejectHangingPromise;

      async function makeHangingPromise() {
        return new Promise((resolve, reject) => {
          rejectHangingPromise = reject;
        });
      }

      async function getRoot() {
        return {promise: makeHangingPromise()};
      }

      let staticEndTime = -1;
      const staticChunks = [];
      const dynamicChunks = [];

      const serverAbortController = new AbortController();
      await new Promise(resolve => {
        setTimeout(async () => {
          const stream = ReactServerDOMServer.renderToPipeableStream(
            getRoot(),
            webpackMap,
            {
              filterStackFrame,
              onError(err) {
                if (serverAbortController.signal.aborted) {
                  return;
                }
                console.error(err);
              },
            },
          );
          serverAbortController.signal.addEventListener(
            'abort',
            () => {
              stream.abort(serverAbortController.signal.reason);

              // Only reject the promise after the render is aborted
              // so that it's no longer observable
              rejectHangingPromise(
                new Error(
                  'Hanging promise was rejected after the prerender finished',
                ),
              );
            },
            {once: true},
          );

          const passThrough = new Stream.PassThrough(streamOptions);
          stream.pipe(passThrough);

          passThrough.on('data', chunk => {
            if (staticEndTime < 0) {
              staticChunks.push(chunk);
            } else {
              dynamicChunks.push(chunk);
            }
          });

          passThrough.on('end', resolve);
        });
        setTimeout(() => {
          staticEndTime = performance.now() + performance.timeOrigin;
          serverAbortController.abort();
        });
      });

      const clientAbortController = new AbortController();

      const serverStream = createReadableWithLateRelease(
        staticChunks,
        dynamicChunks,
        clientAbortController.signal,
      );

      const response = await ReactServerDOMClient.createFromNodeStream(
        serverStream,
        {
          serverConsumerManifest: {
            moduleMap: null,
            moduleLoading: null,
          },
        },
        {
          // Debug info arriving after this end time will be ignored, e.g. the
          // I/O info for the second dynamic data.
          endTime: staticEndTime,
        },
      );

      const resolvedPromise = Promise.resolve('hello');
      function ClientDynamic() {
        use(resolvedPromise);
        use(response.promise); // unresolved ReactPromise (becomes rejected when we abort)
      }

      function ClientRoot() {
        return React.createElement(
          'html',
          null,
          React.createElement(
            'body',
            null,
            React.createElement(
              React.Suspense,
              {fallback: 'Loading...'},
              React.createElement(ClientDynamic),
            ),
          ),
        );
      }

      let ownerStack;
      let componentStack;

      const {prelude} = await new Promise(resolve => {
        let result;

        setTimeout(() => {
          result = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {
              signal: clientAbortController.signal,
              onError(error, errorInfo) {
                componentStack = errorInfo.componentStack;
                ownerStack = React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null;
              },
            },
          );
        });

        setTimeout(() => {
          clientAbortController.abort();
          resolve(result);
        });
      });

      const prerenderHTML = await readResult(prelude);

      expect(prerenderHTML).toContain('Loading...');

      if (__DEV__) {
        expect(
          normalizeCodeLocInfo(componentStack, {preserveLocation: true}),
        ).toBe(
          '\n' +
            '    in ClientDynamic (ReactFlightDOMNode-test.js:1679:9)\n' +
            '    in Suspense\n' +
            '    in body\n' +
            '    in html\n' +
            '    in ClientRoot',
        );
      } else {
        expect(
          normalizeCodeLocInfo(componentStack, {preserveLocation: true}),
        ).toBe(
          '\n' +
            '    in ClientDynamic (ReactFlightDOMNode-test.js:1679:9)\n' +
            '    in Suspense\n' +
            '    in body\n' +
            '    in html\n' +
            '    in ClientRoot',
        );
      }

      if (__DEV__) {
        expect(ignoreListStack(ownerStack)).toBe(
          '\n' +
            gate(flags =>
              flags.enableAsyncDebugInfo
                ? '    at ClientDynamic (./ReactFlightDOMNode-test.js:1680:9)\n'
                : '',
            ) +
            '    at ClientRoot (./ReactFlightDOMNode-test.js:1693:21)',
        );
      } else {
        expect(ownerStack).toBeNull();
      }
    });

    // @gate __DEV__
    it('should preserve a Flight stream error and late debug info when aborting Fizz', async () => {
      let resolveDynamicData1;
      let resolveDynamicData2;
      let resolveDynamicData3;

      async function getDynamicData1() {
        return new Promise(resolve => {
          resolveDynamicData1 = resolve;
        });
      }

      async function getDynamicData2() {
        return new Promise(resolve => {
          resolveDynamicData2 = resolve;
        });
      }

      async function getDynamicData3() {
        return new Promise(resolve => {
          resolveDynamicData3 = resolve;
        });
      }

      async function loadDynamicData1() {
        return await getDynamicData1();
      }

      async function loadDynamicData2() {
        return await getDynamicData2();
      }

      async function loadDynamicData3() {
        return await getDynamicData3();
      }

      async function loadDynamicData() {
        const data1 = await loadDynamicData1();
        const data2 = await loadDynamicData2();
        const data3 = await loadDynamicData3();
        return [data1, data2, data3];
      }

      async function Dynamic() {
        const [data1, data2, data3] = await loadDynamicData();

        return ReactServer.createElement(
          'p',
          null,
          data1,
          ' ',
          data2,
          ' ',
          data3,
        );
      }

      function App() {
        return ReactServer.createElement(
          'html',
          null,
          ReactServer.createElement(
            'body',
            null,
            ReactServer.createElement(Dynamic),
          ),
        );
      }

      let staticEndTime = -1;
      const initialContentChunks = [];
      const initialDebugChunks = [];
      const dynamicDebugChunks = [];

      await new Promise(resolve => {
        setTimeout(() => {
          const debugPassThrough = new Stream.PassThrough(streamOptions);
          const stream = ReactServerDOMServer.renderToPipeableStream(
            ReactServer.createElement(App),
            webpackMap,
            {
              filterStackFrame,
              debugChannel: new Stream.Writable({
                write(chunk, encoding, callback) {
                  debugPassThrough.write(chunk, encoding);
                  callback();
                },
                final(callback) {
                  debugPassThrough.end();
                  callback();
                },
              }),
            },
          );

          const contentPassThrough = new Stream.PassThrough(streamOptions);
          stream.pipe(contentPassThrough);

          contentPassThrough.on('data', chunk => {
            if (staticEndTime < 0) {
              initialContentChunks.push(chunk);
            }
          });
          contentPassThrough.on('end', resolve);

          debugPassThrough.on('data', chunk => {
            if (staticEndTime < 0) {
              initialDebugChunks.push(chunk);
            } else {
              dynamicDebugChunks.push(chunk);
            }
          });
        });
        setTimeout(() => {
          resolveDynamicData1('Hi');
          setTimeout(() => {
            resolveDynamicData2('Josh');
            // Data 2 is included by endTime. Data 3 begins in a subsequent
            // microtask and should be filtered out.
            staticEndTime = performance.now() + performance.timeOrigin;
            setTimeout(() => {
              resolveDynamicData3('Story');
            });
          });
        });
      });

      const contentStream = new Stream.Readable({
        ...streamOptions,
        read() {},
      });
      const debugStream = new Stream.Readable({...streamOptions, read() {}});
      const flightResponse = ReactServerDOMClient.createFromNodeStream(
        contentStream,
        {
          moduleMap: null,
          moduleLoading: null,
          serverModuleMap: null,
        },
        {
          endTime: staticEndTime,
          debugChannel: debugStream,
        },
      );
      for (let i = 0; i < initialContentChunks.length; i++) {
        contentStream.push(initialContentChunks[i]);
      }
      for (let i = 0; i < initialDebugChunks.length; i++) {
        debugStream.push(initialDebugChunks[i]);
      }
      const decoded = await flightResponse;

      function ClientRoot() {
        return decoded;
      }

      const flightError = new Error('Flight stream errored');
      const fizzAbortReason = new Error('Fizz aborted');
      const fizzAbortController = new AbortController();
      const errors = [];
      let componentStack;
      let ownerStack;

      const {prelude} = await new Promise(resolve => {
        let result;

        setTimeout(() => {
          result = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {
              signal: fizzAbortController.signal,
              onError(error, errorInfo) {
                errors.push(error);
                componentStack = errorInfo.componentStack;
                ownerStack = React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null;
              },
            },
          );
        });

        setTimeout(() => {
          // Error the content transport, deliver the delayed debug rows, and
          // then synchronously begin the Fizz abort.
          contentStream.emit('error', flightError);
          for (let i = 0; i < dynamicDebugChunks.length; i++) {
            debugStream.push(dynamicDebugChunks[i]);
          }
          contentStream.push(null);
          debugStream.push(null);
          fizzAbortController.abort(fizzAbortReason);
          resolve(result);
        });
      });

      const prerenderHTML = await readResult(prelude);

      expect(prerenderHTML).toBe('');
      expect(errors).toEqual([flightError]);
      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n' +
          gate(flags =>
            flags.enableAsyncDebugInfo ? '    in Dynamic (at **)\n' : '',
          ) +
          '    in body\n' +
          '    in html\n' +
          '    in App (at **)\n' +
          '    in ClientRoot',
      );
      expect(normalizeCodeLocInfo(ownerStack)).toBe(
        '\n' +
          gate(flags =>
            flags.enableAsyncDebugInfo
              ? '    in loadDynamicData2 (at **)\n' +
                '    in loadDynamicData (at **)\n' +
                '    in Dynamic (at **)\n'
              : '',
          ) +
          '    in App (at **)',
      );
    });

    // @gate __DEV__
    it('filters debug info when a backup row resolves after the Flight stream errors', async () => {
      const clientModuleId = 'sync-client-module';
      const clientModuleListeners = [];
      const asyncClientModule = {
        status: 'pending',
        value: null,
        then(resolve) {
          if (this.status === 'fulfilled') {
            resolve(this.value);
          } else {
            clientModuleListeners.push(resolve);
          }
        },
      };
      function resolveClientModule() {
        asyncClientModule.status = 'fulfilled';
        asyncClientModule.value = {
          default: function ClientComponent() {
            return null;
          },
        };
        for (let i = 0; i < clientModuleListeners.length; i++) {
          clientModuleListeners[i](asyncClientModule.value);
        }
      }
      webpackMap[clientModuleId] = {
        id: clientModuleId,
        chunks: [],
        name: '*',
        async: true,
      };
      webpackModules[clientModuleId] = asyncClientModule;
      const ClientReference = ReactServerDOMServer.registerClientReference(
        function ClientComponent() {
          return null;
        },
        clientModuleId,
        '*',
      );

      let resolveDataBeforeCutoff;
      let resolveLaterData;

      async function getLaterData() {
        return new Promise(resolve => {
          resolveLaterData = resolve;
        });
      }

      async function getDataBeforeCutoff() {
        return new Promise(resolve => {
          resolveDataBeforeCutoff = resolve;
        });
      }

      async function loadLaterData() {
        return await getLaterData();
      }

      async function loadDataBeforeCutoff() {
        return await getDataBeforeCutoff();
      }

      async function Late({unusedClientReference}) {
        const dataBeforeCutoff = await loadDataBeforeCutoff();
        staticEndTime = performance.now() + performance.timeOrigin;
        const laterData = await loadLaterData();
        return ReactServer.createElement(
          'p',
          null,
          dataBeforeCutoff,
          laterData,
        );
      }

      function Dynamic() {
        return ReactServer.createElement(Late, {
          unusedClientReference: ClientReference,
        });
      }

      function App() {
        return ReactServer.createElement(
          'html',
          null,
          ReactServer.createElement(
            'body',
            null,
            ReactServer.createElement(Dynamic),
          ),
        );
      }

      let staticEndTime = -1;
      const initialContentChunks = [];
      const initialDebugChunks = [];
      const lateDebugChunks = [];

      await new Promise(resolve => {
        setTimeout(() => {
          const stream = ReactServerDOMServer.renderToPipeableStream(
            ReactServer.createElement(App),
            webpackMap,
            {
              filterStackFrame,
              debugChannel: new Stream.Writable({
                ...streamOptions,
                write(chunk, encoding, callback) {
                  const copy = Buffer.from(chunk);
                  if (staticEndTime < 0) {
                    initialDebugChunks.push(copy);
                  } else {
                    lateDebugChunks.push(copy);
                  }
                  callback();
                },
              }),
            },
          );

          const contentPassThrough = new Stream.PassThrough(streamOptions);
          stream.pipe(contentPassThrough);
          contentPassThrough.on('data', chunk => {
            if (staticEndTime < 0) {
              initialContentChunks.push(chunk);
            }
          });
          contentPassThrough.on('end', resolve);
        });

        setTimeout(() => {
          resolveDataBeforeCutoff('Hi');
          setTimeout(() => {
            resolveLaterData('Story');
          });
        });
      });

      const contentStream = new Stream.Readable({
        ...streamOptions,
        read() {},
      });
      const debugStream = new Stream.Readable({...streamOptions, read() {}});
      const flightResponse = ReactServerDOMClient.createFromNodeStream(
        contentStream,
        {
          moduleMap: null,
          moduleLoading: webpackModuleLoading,
          serverModuleMap: null,
        },
        {
          endTime: staticEndTime,
          debugChannel: debugStream,
        },
      );
      for (let i = 0; i < initialContentChunks.length; i++) {
        contentStream.push(initialContentChunks[i]);
      }
      for (let i = 0; i < initialDebugChunks.length; i++) {
        debugStream.push(initialDebugChunks[i]);
      }
      const decoded = await flightResponse;

      function ClientRoot() {
        return decoded;
      }

      const flightError = new Error('Flight stream errored');
      const fizzAbortController = new AbortController();
      const errors = [];
      let ownerStack;

      const {prelude} = await new Promise(resolve => {
        let result;

        setTimeout(() => {
          result = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {
              signal: fizzAbortController.signal,
              onError(error) {
                errors.push(error);
                ownerStack = React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null;
              },
            },
          );
        });

        setTimeout(() => {
          contentStream.emit('error', flightError);
          for (let i = 0; i < lateDebugChunks.length; i++) {
            debugStream.push(lateDebugChunks[i]);
          }
          resolveClientModule();
          contentStream.push(null);
          debugStream.push(null);
          fizzAbortController.abort(flightError);
          resolve(result);
        });
      });

      expect(await readResult(prelude)).toBe('');
      expect(errors).toEqual([flightError]);
      expect(normalizeCodeLocInfo(ownerStack)).toBe(
        '\n' +
          gate(flags =>
            flags.enableAsyncDebugInfo
              ? '    in loadDataBeforeCutoff (at **)\n' +
                '    in Late (at **)\n' +
                '    in Dynamic (at **)\n'
              : '',
          ) +
          '    in App (at **)',
      );
    });

    function createReadableWithLateRelease(initialChunks, lateChunks, signal) {
      // Create a new Readable and push all initial chunks immediately.
      const readable = new Stream.Readable({...streamOptions, read() {}});
      for (let i = 0; i < initialChunks.length; i++) {
        readable.push(initialChunks[i]);
      }

      // When prerendering is aborted, push all dynamic chunks. They won't be
      // considered for rendering, but they include debug info we want to use.
      signal.addEventListener(
        'abort',
        () => {
          for (let i = 0; i < lateChunks.length; i++) {
            readable.push(lateChunks[i]);
          }
          setImmediate(() => {
            readable.push(null);
          });
        },
        {once: true},
      );

      return readable;
    }

    async function reencodeFlightStream(
      staticChunks,
      dynamicChunks,
      startTime,
      serverConsumerManifest,
    ) {
      let staticEndTime = -1;
      const chunks = {
        static: [],
        dynamic: [],
      };
      await new Promise(async resolve => {
        const renderStageController = new AbortController();

        const serverStream = createReadableWithLateRelease(
          staticChunks,
          dynamicChunks,
          renderStageController.signal,
        );
        const decoded = await ReactServerDOMClient.createFromNodeStream(
          serverStream,
          serverConsumerManifest,
          {
            // We're re-encoding the whole stream, so we don't want to filter out any debug info.
            endTime: undefined,
          },
        );

        setTimeout(async () => {
          const stream = ReactServerDOMServer.renderToPipeableStream(
            decoded,
            webpackMap,
            {
              filterStackFrame,
              // Pass in the original render's startTime to avoid omitting its IO info.
              startTime,
            },
          );

          const passThrough = new Stream.PassThrough(streamOptions);

          passThrough.on('data', chunk => {
            if (!renderStageController.signal.aborted) {
              chunks.static.push(chunk);
            } else {
              chunks.dynamic.push(chunk);
            }
          });
          passThrough.on('end', resolve);

          stream.pipe(passThrough);
        });

        setTimeout(() => {
          staticEndTime = performance.now() + performance.timeOrigin;
          renderStageController.abort();
        });
      });

      return {chunks, staticEndTime};
    }

    // @gate __DEV__
    it('can preserve old IO info when decoding and re-encoding a stream with options.startTime', async () => {
      let resolveDynamicData;

      function getDynamicData() {
        return new Promise(resolve => {
          resolveDynamicData = resolve;
        });
      }

      async function Dynamic() {
        const data = await getDynamicData();
        return ReactServer.createElement('p', null, data);
      }

      function App() {
        return ReactServer.createElement(
          'html',
          null,
          ReactServer.createElement(
            'body',
            null,
            ReactServer.createElement(
              ReactServer.Suspense,
              {fallback: 'Loading...'},
              // TODO: having a wrapper <section> here seems load-bearing.
              // ReactServer.createElement(ReactServer.createElement(Dynamic)),
              ReactServer.createElement(
                'section',
                null,
                ReactServer.createElement(Dynamic),
              ),
            ),
          ),
        );
      }

      const resolveDynamic = () => {
        resolveDynamicData('Hi Janka');
      };

      // 1. Render <App />, dividing the output into static and dynamic content.

      let startTime = -1;

      let isStatic = true;
      const chunks1 = {
        static: [],
        dynamic: [],
      };

      await new Promise(resolve => {
        setTimeout(async () => {
          startTime = performance.now() + performance.timeOrigin;

          const stream = ReactServerDOMServer.renderToPipeableStream(
            ReactServer.createElement(App),
            webpackMap,
            {
              filterStackFrame,
              startTime,
              environmentName() {
                return isStatic ? 'Prerender' : 'Server';
              },
            },
          );

          const passThrough = new Stream.PassThrough(streamOptions);

          passThrough.on('data', chunk => {
            if (isStatic) {
              chunks1.static.push(chunk);
            } else {
              chunks1.dynamic.push(chunk);
            }
          });
          passThrough.on('end', resolve);

          stream.pipe(passThrough);
        });
        setTimeout(() => {
          isStatic = false;
          resolveDynamic();
        });
      });

      //===============================================
      // 2. Decode the stream from the previous step and render it again.
      // This should preserve existing debug info.

      const serverConsumerManifest = {
        moduleMap: null,
        moduleLoading: null,
      };

      const {chunks: chunks2, staticEndTime: reencodeStaticEndTime} =
        await reencodeFlightStream(
          chunks1.static,
          chunks1.dynamic,
          // This is load-bearing. If we don't pass a startTime, IO info
          // from the initial render will be skipped (because it finished in the past)
          // and we won't get the precise location of the blocking await in the owner stack.
          startTime,
          serverConsumerManifest,
        );

      //===============================================
      // 3. SSR the stream from the previous step and abort it after the static stage
      // (which should trigger `onError` for each "hole" that hasn't resolved yet)

      function ClientRoot({response}) {
        return use(response);
      }

      let ssrStream;
      let ownerStack;
      let componentStack;

      await new Promise(async (resolve, reject) => {
        const renderController = new AbortController();

        const serverStream = createReadableWithLateRelease(
          chunks2.static,
          chunks2.dynamic,
          renderController.signal,
        );

        const decodedPromise = ReactServerDOMClient.createFromNodeStream(
          serverStream,
          serverConsumerManifest,
          {
            endTime: reencodeStaticEndTime,
          },
        );

        setTimeout(() => {
          ssrStream = ReactDOMServer.renderToPipeableStream(
            React.createElement(ClientRoot, {
              response: decodedPromise,
            }),
            {
              onError(err, errorInfo) {
                componentStack = errorInfo.componentStack;
                ownerStack = React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null;
                return null;
              },
            },
          );

          renderController.signal.addEventListener(
            'abort',
            () => {
              const {reason} = renderController.signal;
              ssrStream.abort(reason);
            },
            {
              once: true,
            },
          );
        });

        setTimeout(() => {
          renderController.abort(new Error('ssr-abort'));
          resolve();
        });
      });

      const result = await readResult(ssrStream);

      expect(normalizeCodeLocInfo(componentStack)).toBe(
        '\n' +
          // TODO:
          // when we reencode a stream, the component stack doesn't have server frames for the dynamic content
          // (which is what causes the dynamic hole here)
          // because Flight delays forwarding debug info for lazies until they resolve.
          // (the owner stack is filled in `pushHaltedAwaitOnComponentStack`, so it works fine)
          //
          // '    in Dynamic (at **)\n'
          '    in section\n' +
          '    in Suspense\n' +
          '    in body\n' +
          '    in html\n' +
          '    in App (at **)\n' +
          '    in ClientRoot (at **)',
      );
      expect(normalizeCodeLocInfo(ownerStack)).toBe(
        '\n' +
          gate(flags =>
            flags.enableAsyncDebugInfo
              ? '    in Dynamic (at **)\n'
              : '    in section\n',
          ) +
          '    in App (at **)',
      );

      expect(result).toContain(
        'Switched to client rendering because the server rendering aborted due to:\\n\\n' +
          'ssr-abort',
      );
    });

    // @gate __DEV__
    it('filters parsed debug info when the Flight stream errors', async () => {
      let resolveInitialData;
      const laterDataResolvers = [];

      async function getInitialData() {
        return new Promise(resolve => {
          resolveInitialData = resolve;
        });
      }

      async function loadInitialData() {
        return await getInitialData();
      }

      async function loadLaterData() {
        for (let i = 0; i < 40; i++) {
          await new Promise(resolve => {
            laterDataResolvers[i] = resolve;
          });
        }
      }

      async function Dynamic() {
        await loadInitialData();
        await loadLaterData();
        return ReactServer.createElement('p', null, 'Done');
      }

      function App() {
        return ReactServer.createElement(
          'html',
          null,
          ReactServer.createElement(
            'body',
            null,
            ReactServer.createElement(Dynamic),
          ),
        );
      }

      let staticEndTime = -1;
      const chunks = [];

      await new Promise(resolve => {
        setTimeout(() => {
          const flightStream = ReactServerDOMServer.renderToPipeableStream(
            ReactServer.createElement(App),
            webpackMap,
            {
              filterStackFrame,
            },
          );

          const passThrough = new Stream.PassThrough(streamOptions);
          flightStream.pipe(passThrough);
          passThrough.on('data', chunk => {
            chunks.push(chunk);
          });
          passThrough.on('end', resolve);
        });

        setTimeout(() => {
          staticEndTime = performance.now() + performance.timeOrigin;
          resolveInitialData();

          let index = 0;
          function resolveNext() {
            setTimeout(() => {
              laterDataResolvers[index++]();
              if (index < 40) {
                resolveNext();
              }
            });
          }
          setTimeout(resolveNext);
        });
      });

      const contentStream = new Stream.Readable({
        ...streamOptions,
        read() {},
      });
      const response = ReactServerDOMClient.createFromNodeStream(
        contentStream,
        {
          moduleMap: null,
          moduleLoading: null,
          serverModuleMap: null,
        },
        {
          endTime: staticEndTime,
        },
      );
      // The final write contains the completed model. The preceding writes
      // contain the debug rows produced while rendering it.
      for (let i = 0; i < chunks.length - 1; i++) {
        contentStream.push(chunks[i]);
      }

      const decoded = await response;

      function ClientRoot() {
        return decoded;
      }

      const flightError = new Error('Flight stream errored');
      const fizzAbortController = new AbortController();
      let caughtError;
      let ownerStack;
      const {prelude} = await new Promise(resolve => {
        let result;

        setTimeout(() => {
          result = ReactDOMFizzStatic.prerenderToNodeStream(
            React.createElement(ClientRoot),
            {
              signal: fizzAbortController.signal,
              onError(error) {
                caughtError = error;
                ownerStack = React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null;
              },
            },
          );
        });

        setTimeout(() => {
          contentStream.emit('error', flightError);
          contentStream.push(null);
          fizzAbortController.abort(new Error('Fizz aborted'));
          resolve(result);
        });
      });

      expect(await readResult(prelude)).toBe('');
      expect(caughtError).toBe(flightError);
      expect(normalizeCodeLocInfo(ownerStack)).toBe(
        '\n' +
          gate(flags =>
            flags.enableAsyncDebugInfo
              ? '    in loadInitialData (at **)\n' + '    in Dynamic (at **)\n'
              : '',
          ) +
          '    in App (at **)',
      );
    });
  });

  it('warns with a tailored message if eval is not available in dev', async () => {
    // eslint-disable-next-line no-eval
    const previousEval = globalThis.eval.bind(globalThis);
    // eslint-disable-next-line no-eval
    globalThis.eval = () => {
      throw new Error('eval is disabled');
    };

    try {
      const readable = await serverAct(() =>
        ReactServerDOMServer.renderToReadableStream({}, webpackMap),
      );

      assertConsoleErrorDev([]);

      await ReactServerDOMClient.createFromReadableStream(readable, {
        serverConsumerManifest: {
          moduleMap: null,
          moduleLoading: null,
        },
      });

      assertConsoleErrorDev([
        'eval() is not supported in this environment. ' +
          'This can happen if you started the Node.js process with --disallow-code-generation-from-strings, ' +
          'or if `eval` was patched by other means. ' +
          'React requires eval() in development mode for various debugging features ' +
          'like reconstructing callstacks from a different environment.\n' +
          'React will never use eval() in production mode',
      ]);
    } finally {
      // eslint-disable-next-line no-eval
      globalThis.eval = previousEval;
    }
  });

  // Shared scenario for the two regression tests below. Both guard against
  // the same destination-backpressure bug — emitTextChunk and
  // emitTypedArrayChunk each push a [headerChunk, contentChunk] pair into
  // completedRegularChunks. Before the fix, a flush that broke between the
  // two writes left the content chunk stranded at the head of the queue,
  // and the next flush emitted any newly-arrived Import rows ahead of it —
  // splicing Import bytes into the position the Flight Client expects to
  // read as the row's content.
  //
  // The scenario embeds `payload` in the model under the key `payload` and
  // returns the deserialized model. Each test asserts that result.payload
  // round-trips identically to what the Flight Server emitted.
  async function runScenarioWithBackpressureBetweenHeaderAndContent(payload) {
    function Client1() {
      return <span>client1</span>;
    }
    // Client1's Import row must exceed VIEW_SIZE (4096) so writeStringChunk
    // takes its BIG path and calls destination.write directly. That write
    // returning false is what triggers the backpressure we want to test.
    const Client1Reference = clientExports(
      Client1,
      1,
      '/' + 'a'.repeat(5000),
      Promise.resolve(),
    );

    function Client2() {
      return <span>client2</span>;
    }
    const Client2Reference = clientExports(
      Client2,
      2,
      '/client2.js',
      Promise.resolve(),
    );

    let resolveAsync;
    const asyncPromise = new Promise(resolve => {
      resolveAsync = resolve;
    });

    async function AsyncWrapper() {
      await asyncPromise;
      return <Client2Reference />;
    }

    const model = {
      client: <Client1Reference />,
      payload,
      async: <AsyncWrapper />,
    };

    const heldCallbacks = [];
    const collectedChunks = [];

    // A destination that returns false from every write (highWaterMark: 1 in
    // byte mode) and never completes any of them until the test releases the
    // stored callback. This gives us deterministic control over when each write
    // finishes and when 'drain' fires.
    const destination = new Stream.Writable({
      highWaterMark: 1,
      write(chunk, encoding, callback) {
        collectedChunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
        );
        heldCallbacks.push(callback);
      },
    });

    const finished = new Promise((resolve, reject) => {
      destination.on('finish', resolve);
      destination.on('error', reject);
    });

    // First flush: Client1's huge Import row hits backpressure, so the flush
    // loop reaches the payload row's [headerChunk, contentChunk] pair while
    // destinationHasCapacity is already false. Before the fix, this would
    // have encoded just the header into currentView, broken the loop, and
    // let completeWriting flush the header as its own write — stranding
    // the content chunk at the front of completedRegularChunks.
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(model, webpackMap),
    );
    await serverAct(() => {
      pipe(destination);
    });

    // While the destination is still paused, push Client2's Import row into
    // completedImportChunks. No flush runs (request.destination is null after
    // the first flush's backpressure break).
    await serverAct(() => {
      resolveAsync();
    });

    // Release callbacks one at a time. The drain that empties the writable
    // buffer triggers flushCompletedChunks; before the fix, this is where
    // Client2's newly-queued Import row would have been emitted ahead of
    // the still-orphaned payload content chunk.
    while (heldCallbacks.length > 0) {
      await serverAct(() => {
        const cb = heldCallbacks.shift();
        cb();
      });
    }

    await finished;

    const readable = new Stream.Readable({read() {}});
    for (let i = 0; i < collectedChunks.length; i++) {
      readable.push(collectedChunks[i]);
    }
    readable.push(null);

    const response = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: null,
      moduleLoading: null,
    });
    return await response;
  }

  it("keeps a Text row's header and content chunks adjacent when a flush hits backpressure between them", async () => {
    // length >= 1024 makes the Flight Server outline this as a Text row via
    // serializeLargeTextString, which is where emitTextChunk pushes its
    // [headerChunk, textChunk] pair.
    const largeText = 'x'.repeat(2048);

    const result =
      await runScenarioWithBackpressureBetweenHeaderAndContent(largeText);

    // Before the fix, the Flight Client would have framed Client2's Import
    // row bytes as text-row content, making result.payload `<id>:I[...]...`
    // garbage rather than the x's the Flight Server emitted.
    expect(result.payload).toBe(largeText);
  });

  it("keeps a TypedArray row's header and content chunks adjacent when a flush hits backpressure between them", async () => {
    // emitTypedArrayChunk pushes the same [headerChunk, contentChunk] pair as
    // emitTextChunk. Before the fix, a flush break after the header would have
    // stranded the content chunk in exactly the same way.
    const binaryData = new Uint8Array(1024);
    for (let i = 0; i < binaryData.length; i++) {
      binaryData[i] = i % 256;
    }

    const result =
      await runScenarioWithBackpressureBetweenHeaderAndContent(binaryData);

    // Before the fix, the typed array's bytes would have been replaced by
    // Client2's Import row bytes followed by whatever happened to land in
    // the next 1024-byte window.
    expect(result.payload).toEqual(binaryData);
  });

  // @gate __DEV__
  it('replays buffered debug info for every errored Flight chunk', async () => {
    let resolveDynamicDataA1;
    let resolveDynamicDataA2;
    let resolveDynamicDataB;

    async function getDynamicDataA1() {
      return new Promise(resolve => {
        resolveDynamicDataA1 = resolve;
      });
    }

    async function getDynamicDataA2() {
      return new Promise(resolve => {
        resolveDynamicDataA2 = resolve;
      });
    }

    async function getDynamicDataB() {
      return new Promise(resolve => {
        resolveDynamicDataB = resolve;
      });
    }

    async function loadDynamicDataA1() {
      return await getDynamicDataA1();
    }

    async function loadDynamicDataA2() {
      return await getDynamicDataA2();
    }

    async function loadDynamicDataB() {
      return await getDynamicDataB();
    }

    async function DynamicA() {
      const data1 = await loadDynamicDataA1();
      const data2 = await loadDynamicDataA2();
      return ReactServer.createElement('p', null, data1, ' ', data2);
    }

    async function DynamicB() {
      const data = await loadDynamicDataB();
      return ReactServer.createElement('p', null, data);
    }

    function App() {
      return ReactServer.createElement(
        'html',
        null,
        ReactServer.createElement(
          'body',
          null,
          ReactServer.createElement(DynamicA),
          ReactServer.createElement(DynamicB),
        ),
      );
    }

    let isInitialRender = true;
    const initialContentChunks = [];
    const initialDebugChunks = [];
    const lateDebugChunks = [];

    const debugDestination = new Stream.Writable({
      ...streamOptions,
      write(chunk, encoding, callback) {
        const copy = Buffer.from(chunk);
        if (isInitialRender) {
          initialDebugChunks.push(copy);
        } else {
          lateDebugChunks.push(copy);
        }
        callback();
      },
    });
    const contentDestination = new Stream.PassThrough(streamOptions);
    contentDestination.on('data', chunk => {
      if (isInitialRender) {
        initialContentChunks.push(Buffer.from(chunk));
      }
    });

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(App),
        webpackMap,
        {
          filterStackFrame,
          debugChannel: debugDestination,
        },
      ),
    );
    stream.pipe(contentDestination);

    await serverAct(async () => {});
    isInitialRender = false;

    resolveDynamicDataA1('Hi');
    await serverAct(async () => {});
    resolveDynamicDataB('B');
    await serverAct(async () => {});
    resolveDynamicDataA2('A');
    await serverAct(async () => {});

    const contentStream = new Stream.Readable({
      ...streamOptions,
      read() {},
    });
    const debugStream = new Stream.Readable({...streamOptions, read() {}});
    const flightResponse = ReactServerDOMClient.createFromNodeStream(
      contentStream,
      {
        moduleMap: null,
        moduleLoading: null,
        serverModuleMap: null,
      },
      {
        debugChannel: debugStream,
      },
    );

    // Let backup rows arrive first so the matching regular rows consume them.
    for (let i = 0; i < initialDebugChunks.length; i++) {
      debugStream.push(initialDebugChunks[i]);
    }
    for (let i = 0; i < initialContentChunks.length; i++) {
      contentStream.push(initialContentChunks[i]);
    }
    const decoded = await flightResponse;

    // These backups have no matching content rows. They should remain buffered
    // until the content stream errors.
    for (let i = 0; i < lateDebugChunks.length; i++) {
      debugStream.push(lateDebugChunks[i]);
    }

    function ClientRoot() {
      return decoded;
    }

    const flightError = new Error('Flight stream errored');
    const fizzAbortController = new AbortController();
    const errors = [];
    const ownerStacks = [];

    const pendingResult = ReactDOMFizzStatic.prerenderToNodeStream(
      React.createElement(ClientRoot),
      {
        signal: fizzAbortController.signal,
        onError(error) {
          errors.push(error);
          ownerStacks.push(
            React.captureOwnerStack ? React.captureOwnerStack() : null,
          );
        },
      },
    );

    await serverAct(
      async () =>
        new Promise(resolve => {
          setImmediate(() => {
            contentStream.emit('error', flightError);
            contentStream.push(null);
            debugStream.push(null);
            fizzAbortController.abort(new Error('Fizz aborted'));
            resolve();
          });
        }),
    );

    const {prelude} = await pendingResult;
    expect(await readResult(prelude)).toBe('');
    expect(errors).toEqual([flightError, flightError]);
    expect(
      ownerStacks.map(stack =>
        normalizeCodeLocInfo(stack, {preserveLocation: true}),
      ),
    ).toEqual([
      '\n' +
        gate(flags =>
          flags.enableAsyncDebugInfo
            ? '    in loadDynamicDataA2 (file://ReactFlightDOMNode-test.js:2869:20)\n' +
              '    in DynamicA (file://ReactFlightDOMNode-test.js:2878:25)\n'
            : '',
        ) +
        '    in App (file://ReactFlightDOMNode-test.js:2894:23)',
      '\n' +
        gate(flags =>
          flags.enableAsyncDebugInfo
            ? '    in loadDynamicDataB (file://ReactFlightDOMNode-test.js:2873:20)\n' +
              '    in DynamicB (file://ReactFlightDOMNode-test.js:2883:24)\n'
            : '',
        ) +
        '    in App (file://ReactFlightDOMNode-test.js:2895:23)',
    ]);
  });
});
