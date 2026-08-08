/**
 * @jest-environment node
 */
'use strict';

// The async debug info tracking retains the history behind every tracked
// operation only for as long as some request could still emit it. History
// expires after enough newer operations have been tracked, so these tests
// churn through awaits to age it.

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let React;
let ReactServer;
let cache;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let getDebugInfo;

const streamOptions = {
  objectMode: true,
};

function filterStackFrame(filename, functionName) {
  return (
    !filename.startsWith('node:') &&
    !filename.includes('node_modules') &&
    // Filter out our own internal source code since it'll typically be in node_modules
    (!filename.includes('/packages/') || filename.includes('/__tests__/')) &&
    !filename.includes('/build/') &&
    !functionName.includes('internal_')
  );
}

describe('ReactFlightAsyncDebugInfoExpiration', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();
    global.console = require('console');

    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      jest.requireActual('react-server-dom-webpack/server.node'),
    );
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server');
    cache = ReactServer.cache;

    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();

    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );

    React = require('react');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');

    getDebugInfo = require('internal-test-utils').getDebugInfo.bind(null, {
      ignoreProps: true,
      useFixedTime: true,
    });
  });

  function delay(timeout) {
    return new Promise(resolve => {
      setTimeout(resolve, timeout);
    });
  }

  function finishLoadingStream(readable) {
    return new Promise(resolve => {
      if (readable.readableEnded) {
        resolve();
      } else {
        readable.on('end', () => resolve());
      }
    });
  }

  // Enough tracked operations to age everything created before them past the
  // retention budget. Every Promise is tracked at creation and the expiration
  // sweeps run every 128 tracked operations, so nothing needs to be awaited.
  function churnPastRetention() {
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 1500; j++) {
        Promise.resolve(j);
      }
    }
  }

  it('expires history that resolved long before a backdated request', async () => {
    // A request initializes the tracking; after the stream closes, nothing
    // pins history anymore.
    async function Init() {
      await delay(1);
      return 'ok';
    }
    const initStream = ReactServerDOMServer.renderToPipeableStream(
      <Init />,
      {},
      {filterStackFrame},
    );
    const initReadable = new Stream.PassThrough(streamOptions);
    const initResult = ReactServerDOMClient.createFromNodeStream(initReadable, {
      moduleMap: {},
      moduleLoading: {},
    });
    initStream.pipe(initReadable);
    expect(await initResult).toBe('ok');
    await finishLoadingStream(initReadable);

    // Data fetched outside any request and kept alive, like a module-level
    // cache. A request backdated to before the fetch may still consume its
    // history for as long as the retention window allows.
    async function fetchCachedData() {
      await delay(5);
      return 'hello';
    }
    const cachedStartTime =
      // $FlowFixMe[prop-missing]
      performance.timeOrigin + performance.now();
    const cachedData = fetchCachedData();
    await cachedData;

    churnPastRetention();

    // This request claims it started before the fetch, but arrived long
    // after it, so the fetch's history must be gone.
    async function Component() {
      return 'data:' + (await cachedData);
    }
    const stream = ReactServerDOMServer.renderToPipeableStream(
      <Component />,
      {},
      {
        filterStackFrame,
        startTime: cachedStartTime,
      },
    );
    const readable = new Stream.PassThrough(streamOptions);
    const result = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: {},
    });
    stream.pipe(readable);
    expect(await result).toBe('data:hello');
    await finishLoadingStream(readable);

    if (
      __DEV__ &&
      gate(
        flags =>
          flags.enableComponentPerformanceTrack && flags.enableAsyncDebugInfo,
      )
    ) {
      expect(getDebugInfo(result).filter(entry => entry.awaited)).toEqual([]);
    }
  });

  it('keeps history alive while a debug channel is still open', async () => {
    // A bidirectional debug channel lets the client ask for more debug info
    // after the response is done. The main stream closes but this request can
    // still walk the graph, so its history has to stay put.
    const debugChannel = new Stream.Duplex({
      ...streamOptions,
      read() {},
      write(chunk, encoding, callback) {
        callback();
      },
    });
    async function Init() {
      await delay(1);
      return 'ok';
    }
    const initStream = ReactServerDOMServer.renderToPipeableStream(
      <Init />,
      {},
      {filterStackFrame, debugChannel},
    );
    const initReadable = new Stream.PassThrough(streamOptions);
    const initResult = ReactServerDOMClient.createFromNodeStream(initReadable, {
      moduleMap: {},
      moduleLoading: {},
    });
    initStream.pipe(initReadable);
    expect(await initResult).toBe('ok');
    await finishLoadingStream(initReadable);

    async function fetchCachedData() {
      await delay(5);
      return 'hello';
    }
    const cachedStartTime =
      // $FlowFixMe[prop-missing]
      performance.timeOrigin + performance.now();
    const cachedData = fetchCachedData();
    await cachedData;

    churnPastRetention();

    async function Component() {
      return 'data:' + (await cachedData);
    }
    const stream = ReactServerDOMServer.renderToPipeableStream(
      <Component />,
      {},
      {
        filterStackFrame,
        startTime: cachedStartTime,
      },
    );
    const readable = new Stream.PassThrough(streamOptions);
    const result = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: {},
    });
    stream.pipe(readable);
    expect(await result).toBe('data:hello');
    await finishLoadingStream(readable);

    if (
      __DEV__ &&
      gate(
        flags =>
          flags.enableComponentPerformanceTrack && flags.enableAsyncDebugInfo,
      )
    ) {
      // The fetch resolved after the first request started, so that request
      // pinned it through the sweeps and it's still here.
      const awaitedNames = getDebugInfo(result)
        .filter(entry => entry.awaited)
        .map(entry => entry.awaited.name);
      expect(awaitedNames).toContain('setTimeout');
    }
  });

  it('keeps debug info intact when history expires during the render', async () => {
    const getData = cache(async function getData(text) {
      await delay(1);
      return text.toUpperCase();
    });

    // History expires while this render is still running. Anything the
    // render itself can still emit must survive the sweeps.
    async function Child() {
      const greeting = await getData('hi');
      return greeting + ', Seb';
    }

    async function Component() {
      await getData('hi');
      churnPastRetention();
      return <Child />;
    }

    const stream = ReactServerDOMServer.renderToPipeableStream(
      <Component />,
      {},
      {
        filterStackFrame,
      },
    );
    const readable = new Stream.PassThrough(streamOptions);
    const result = ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: {},
      moduleLoading: {},
    });
    stream.pipe(readable);
    expect(await result).toBe('HI, Seb');
    await finishLoadingStream(readable);

    if (
      __DEV__ &&
      gate(
        flags =>
          flags.enableComponentPerformanceTrack && flags.enableAsyncDebugInfo,
      )
    ) {
      // The cached entry resolved after this request started, so its awaited
      // I/O info must survive the sweeps.
      const awaitedNames = getDebugInfo(result)
        .filter(entry => entry.awaited)
        .map(entry => entry.awaited.name);
      expect(awaitedNames).toContain('delay');
    }
  });
});
