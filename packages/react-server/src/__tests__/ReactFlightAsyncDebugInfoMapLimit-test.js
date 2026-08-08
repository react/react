/**
 * @jest-environment node
 */
'use strict';

// V8 Maps throw once they reach 2^24 entries. Tracking Promises in a
// module-level Map keyed by asyncId crashes long-lived processes inside the
// async_hooks init hook, where nothing can catch it, once dead-but-uncollected
// Promises accumulate past the limit (vercel/next.js#96140). Every request
// then works until the one that crosses the limit kills the server.
//
// Creating 2^24 Promises is too slow for a test, so this simulates the limit
// instead: Maps created while the server modules initialize throw at a small
// cap, and the server then serves a stream of ordinary requests whose
// combined Promises exceed it.

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let ReactServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;

const MAP_SIZE_CAP = 50000;
const REQUESTS = 50;
const PROMISES_PER_REQUEST = 2000;

describe('ReactFlightAsyncDebugInfoMapLimit', () => {
  jest.setTimeout(30000);

  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();
    global.console = require('console');

    const RealMap = global.Map;
    global.Map = class CappedMap extends RealMap {
      set(key, value) {
        if (this.size >= MAP_SIZE_CAP && !this.has(key)) {
          throw new RangeError('Map maximum size exceeded');
        }
        return RealMap.prototype.set.call(this, key, value);
      }
    };
    try {
      jest.mock('react', () => require('react/react.react-server'));
      jest.mock('react-server-dom-webpack/server', () =>
        jest.requireActual('react-server-dom-webpack/server.node'),
      );
      ReactServer = require('react');
      ReactServerDOMServer = require('react-server-dom-webpack/server');
    } finally {
      global.Map = RealMap;
    }

    jest.resetModules();
    jest.useRealTimers();
    patchSetImmediate();

    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');
  });

  it('keeps serving requests past the size of a Map', async () => {
    async function Component() {
      await new Promise(resolve => setTimeout(resolve, 1));
      const batch = [];
      for (let j = 0; j < PROMISES_PER_REQUEST; j++) {
        batch.push(Promise.resolve(j));
      }
      return 'served:' + (await Promise.all(batch)).length;
    }

    for (let i = 0; i < REQUESTS; i++) {
      const stream = ReactServerDOMServer.renderToPipeableStream(
        ReactServer.createElement(Component),
      );
      const readable = new Stream.PassThrough({objectMode: true});
      const result = ReactServerDOMClient.createFromNodeStream(readable, {
        moduleMap: {},
        moduleLoading: {},
      });
      stream.pipe(readable);
      expect(await result).toBe('served:' + PROMISES_PER_REQUEST);
    }
  });
});
