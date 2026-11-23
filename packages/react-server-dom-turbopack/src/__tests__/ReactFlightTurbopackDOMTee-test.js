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
let ReactServer;
let FlightReactDOM;
let ReactServerDOMServer;
let ReactServerDOMStaticServer;
let Stream;
let serverAct;
let assertConsoleErrorDev;
// Called with each Flight request that a tee is attached to.
let mockOnAttachTee = null;

describe('ReactFlightTurbopackDOMTee', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

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

    Stream = require('stream');
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
