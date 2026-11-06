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

let assertConsoleErrorDev;
let serverAct;
let serverExports;
let webpackServerMap;
let ReactServerDOMServer;
let ReactServerDOMClient;

// `decodeReply` returns a thenable whose own `.then` resolves to undefined, so
// the decoded value is observed through `Promise.resolve`. A rogue payload
// must settle once all its input has arrived; race the result against a
// bounded number of `setImmediate` turns and report a hang as 'pending'
// instead of letting the test time out.
function settleReply(thenable, turns = 10) {
  return new Promise(resolve => {
    let settled = false;
    Promise.resolve(thenable).then(
      value => {
        settled = true;
        resolve({status: 'resolved', value});
      },
      reason => {
        settled = true;
        resolve({status: 'rejected', reason});
      },
    );
    let remaining = turns;
    (function spin() {
      if (settled) {
        return;
      }
      if (remaining-- <= 0) {
        resolve({status: 'pending'});
        return;
      }
      setImmediate(spin);
    })();
  });
}

// Builds the FormData for one guard payload in a chosen path mode. `row.make`
// receives a `ref` helper that returns a reference body for a chunk id. In the
// 'waiting' and 'cycle' modes the reference points at a fresh wrapper chunk
// that stays BLOCKED while the target is referenced (on a Blob read, or on a
// cycle back to the root) and exposes the target's own value through `:v`, so
// the reference resolves through the resumed path with the same observable
// value. Reference bodies encode chunk ids in hex; the backing store keys each
// chunk in decimal, so row ids (< 16, identical in both) are written as-is and
// wrapper ids are converted.
function buildGuardPayload(mode, row) {
  const chunks = {};
  let nextId = 100;
  const hex = n => n.toString(16);
  const blob = () => new Blob([new Uint8Array([1, 2, 3, 4])]);
  function ref(id, path) {
    let body;
    if (mode === 'immediate' || row.block !== id) {
      body = hex(id);
    } else if (mode === 'cycle') {
      const w = nextId++;
      chunks[w] = JSON.stringify({v: '$' + hex(id), back: '$0'});
      body = hex(w) + ':v';
    } else {
      const w = nextId++;
      const b = nextId++;
      chunks[w] = JSON.stringify({v: '$' + hex(id), pad: '$o' + hex(b)});
      chunks[b] = blob();
      body = hex(w) + ':v';
    }
    return path === undefined ? body : body + ':' + path;
  }
  const spec = row.make(ref);
  Object.assign(chunks, spec.chunks);
  const body = new FormData();
  Object.keys(chunks).forEach(k => body.set(k, chunks[k]));
  return {body, spec};
}

describe('ReactFlightDOMReplyEdge', () => {
  beforeEach(() => {
    jest.resetModules();
    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.edge'),
    );
    const WebpackMock = require('./utils/WebpackMock');
    serverExports = WebpackMock.serverExports;
    webpackServerMap = WebpackMock.webpackServerMap;
    ReactServerDOMServer = require('react-server-dom-webpack/server.edge');
    jest.resetModules();
    ReactServerDOMClient = require('react-server-dom-webpack/client.edge');

    const InternalTestUtils = require('internal-test-utils');
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
    serverAct = InternalTestUtils.serverAct;
  });

  it('can encode a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply({some: 'object'});
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(decoded).toEqual({some: 'object'});
  });

  it.each(['Map', 'Set'])(
    'can share a %s while its contents load',
    async kind => {
      let loadModule;
      const loading = new Promise(resolve => (loadModule = resolve));
      const ServerModule = serverExports({value: () => 'loaded'}, loading);
      ReactServerDOMClient.registerServerReference(
        ServerModule.value,
        ServerModule.value.$$id,
      );
      const shared =
        kind === 'Map'
          ? new Map([['value', ServerModule.value]])
          : new Set([ServerModule.value]);
      const body = await ReactServerDOMClient.encodeReply(
        Array(64).fill(shared),
      );
      const values = [];
      const result = ReactServerDOMServer.decodeReply(body, webpackServerMap);
      await serverAct(() => {
        result.then(value => values.push(value));
      });
      expect(values).toEqual([]);

      await serverAct(() => loadModule());
      expect(values).toHaveLength(1);
      expect(values[0]).toHaveLength(64);
      for (let i = 0; i < values[0].length; i++) {
        const collection = values[0][i];
        expect(collection.size).toBe(1);
        expect(collection.values().next().value()).toBe('loaded');
      }
    },
  );

  it('rejects a Map with a primitive entry', async () => {
    const body = new FormData();
    body.set('0', '"$Q1"');
    body.set('1', '["ab"]');
    await expect(
      Promise.resolve(ReactServerDOMServer.decodeReply(body, webpackServerMap)),
    ).rejects.toThrow();
  });

  it('counts repeated binary values toward the array size limit', async () => {
    const bytes = new Uint8Array(16);
    const body = await ReactServerDOMClient.encodeReply([bytes, bytes]);
    await expect(
      Promise.resolve(
        ReactServerDOMServer.decodeReply(body, webpackServerMap, {
          arraySizeLimit: 20,
        }),
      ),
    ).rejects.toThrow('Maximum array nesting exceeded');
  });

  it('can reuse an iterator in later stream items', async () => {
    const iterator = ['first', 'second'].values();
    const source = new ReadableStream({
      start(controller) {
        controller.enqueue({iterator});
        controller.enqueue({iterator});
        controller.close();
      },
    });
    const body = await ReactServerDOMClient.encodeReply(source);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const reader = result.getReader();
    const first = await reader.read();
    const second = await reader.read();
    expect(first.done).toBe(false);
    expect(second.done).toBe(false);
    // Either occurrence can be a copy, but each iterator must have all its items.
    new Set([first.value.iterator, second.value.iterator]).forEach(received => {
      expect(Array.from(received)).toEqual(['first', 'second']);
    });
    expect((await reader.read()).done).toBe(true);
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

    const body = await ReactServerDOMClient.encodeReply(buffers);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(result).toEqual(buffers);
    // Array buffers can't use the toEqual helper.
    expect(new Uint8Array(result[0])).toEqual(new Uint8Array(buffers[0]));
  });

  it('should be able to serialize a typed array inside a Map', async () => {
    const array = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]);
    const map = new Map();
    map.set('array', array);

    const body = await ReactServerDOMClient.encodeReply(map);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(result.get('array')).toEqual(array);
  });

  it('should be able to serialize a blob', async () => {
    const bytes = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]);
    const blob = new Blob([bytes, bytes], {
      type: 'application/x-test',
    });
    const body = await ReactServerDOMClient.encodeReply(blob);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
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

    const body = await ReactServerDOMClient.encodeReply(formData);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(result instanceof FormData).toBe(true);
    expect(result.get('hi')).toBe('world');
    const resultBlob = result.get('file');
    expect(resultBlob instanceof Blob).toBe(true);
    expect(resultBlob.name).toBe('filename.test'); // In this direction we allow file name to pass through but not other direction.
    expect(resultBlob.size).toBe(bytes.length * 2);
    expect(await resultBlob.arrayBuffer()).toEqual(await blob.arrayBuffer());
  });

  it('should support ReadableStreams with typed arrays', async () => {
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

    const body = await ReactServerDOMClient.encodeReply(s);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    const streamedBuffers = [];
    const reader = result.getReader();
    let entry;
    while (!(entry = await reader.read()).done) {
      streamedBuffers.push(entry.value);
    }

    expect(streamedBuffers).toEqual(buffers);
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

    const body = await ReactServerDOMClient.encodeReply(s);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

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

  it('preserves a stream item while a nested iterator settles synchronously', async () => {
    const item = {};
    item.nested = {
      [Symbol.asyncIterator]() {
        let done = false;
        return {
          next() {
            const result = {value: done ? undefined : {parent: item}, done};
            done = true;
            return {then: resolve => resolve(result)};
          },
        };
      },
    };
    item.self = item;
    const source = new ReadableStream({
      start(controller) {
        controller.enqueue(item);
        controller.close();
      },
    });
    const body = await ReactServerDOMClient.encodeReply(source);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const reader = result.getReader();
    const received = (await reader.read()).value;
    expect(received.self).toBe(received);
    const iterator = received.nested[Symbol.asyncIterator]();
    const nested = await iterator.next();
    expect(nested.done).toBe(false);
    expect(nested.value.parent).toBe(received);
    expect(await iterator.next()).toEqual({value: undefined, done: true});
    expect((await reader.read()).done).toBe(true);
  });

  it('can pass a stream item that contains itself', async () => {
    const item = ['first'];
    item.push(item);
    item.push({back: item});
    const map = new Map();
    map.set('self', map);
    const inner = {};
    inner.self = inner;
    const s = new ReadableStream({
      start(c) {
        c.enqueue(item);
        c.enqueue(map);
        c.enqueue({inner});
        c.enqueue({again: item});
        c.close();
      },
    });

    const body = await ReactServerDOMClient.encodeReply(s);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    const reader = result.getReader();
    const first = (await reader.read()).value;
    expect(first[0]).toBe('first');
    expect(first[1]).toBe(first);
    expect(first[2].back).toBe(first);
    const second = (await reader.read()).value;
    expect(second.get('self')).toBe(second);
    const third = (await reader.read()).value;
    expect(third.inner.self).toBe(third.inner);
    const fourth = (await reader.read()).value;
    expect(fourth.again).toBe(first);
    expect((await reader.read()).done).toBe(true);
  });

  it('can refer to a stream inside an iterable item from a later Promise', async () => {
    const inner = new ReadableStream({
      start(c) {
        c.enqueue('inner');
        c.close();
      },
    });
    const holder = {inner};
    let resolveLater;
    const later = new Promise(resolve => (resolveLater = resolve));
    async function* items() {
      yield {holder};
      // The writer asks for another item only after serializing this one.
      // The Promise must refer to the stream through the item already sent.
      resolveLater(holder);
    }
    const body = await ReactServerDOMClient.encodeReply({s: items(), later});
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    const item = (await result.s.next()).value;
    const laterValue = await result.later;
    expect(laterValue).toBe(item.holder);
    const read = await laterValue.inner.getReader().read();
    expect(read.value).toBe('inner');
  });

  it('ends a BYOB read that is waiting when the byte stream closes', async () => {
    const s = new ReadableStream({
      type: 'bytes',
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.close();
      },
    });

    const body = await ReactServerDOMClient.encodeReply(s);

    let sendClose;
    const closeSent = new Promise(resolve => (sendClose = resolve));
    const iterable = {
      async *[Symbol.asyncIterator]() {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const entry of body) {
          if (entry[1] === 'C') {
            await closeSent;
          }
          yield entry;
        }
      },
    };

    const result = await ReactServerDOMServer.decodeReplyFromAsyncIterable(
      iterable,
      webpackServerMap,
    );

    const reader = result.getReader({mode: 'byob'});
    const first = await reader.read(new Uint8Array(3));
    expect(Array.from(first.value)).toEqual([1, 2, 3]);

    const waiting = reader.read(new Uint8Array(3));
    sendClose();
    expect((await waiting).done).toBe(true);
  });

  it('waits for a queued stream item to initialize before closing', async () => {
    let resolveModule;
    const ServerModule = serverExports(
      {
        greet() {
          return 'hi';
        },
      },
      new Promise(resolve => (resolveModule = resolve)),
    );
    ReactServerDOMClient.registerServerReference(
      ServerModule.greet,
      ServerModule.greet.$$id,
    );

    // The first item travels as a Blob, which the decoder reads
    // asynchronously; the second waits for its module to load.
    const s = new ReadableStream({
      start(c) {
        c.enqueue({bytes: new Uint8Array([1])});
        c.enqueue({greet: ServerModule.greet});
        c.close();
      },
    });

    const body = await ReactServerDOMClient.encodeReply(s);

    // Deliver the second item only after the first read has completed.
    let continueStream;
    const firstRead = new Promise(resolve => (continueStream = resolve));
    let finishSending;
    const sent = new Promise(resolve => (finishSending = resolve));
    const iterable = {
      async *[Symbol.asyncIterator]() {
        let items = 0;
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const entry of body) {
          yield entry;
          if (entry[0].startsWith('S') && items++ === 0) {
            await firstRead;
          }
        }
        finishSending();
      },
    };

    const result = await ReactServerDOMServer.decodeReplyFromAsyncIterable(
      iterable,
      webpackServerMap,
    );

    const reader = result.getReader();
    expect(Array.from((await reader.read()).value.bytes)).toEqual([1]);
    const secondRead = reader.read();
    continueStream();
    await sent;
    await serverAct(() => resolveModule());
    expect((await secondRead).value.greet()).toBe('hi');
    expect((await reader.read()).done).toBe(true);
  });

  it('should cancel the transported ReadableStream when we are cancelled', async () => {
    const s = new ReadableStream({
      start(controller) {
        controller.enqueue('hi');
        controller.close();
      },
    });

    const body = await ReactServerDOMClient.encodeReply(s);

    const iterable = {
      async *[Symbol.asyncIterator]() {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const entry of body) {
          if (entry[1] === 'C') {
            // Return before finishing the stream.
            return;
          }
          yield entry;
        }
      },
    };

    const result = await ReactServerDOMServer.decodeReplyFromAsyncIterable(
      iterable,
      webpackServerMap,
    );

    const reader = result.getReader();

    // We should be able to read the part we already emitted before the abort
    expect(await reader.read()).toEqual({
      value: 'hi',
      done: false,
    });

    let error = null;
    try {
      await reader.read();
    } catch (x) {
      error = x;
    }

    expect(error).not.toBe(null);
    expect(error.message).toBe('Connection closed.');
  });

  it('should abort when parsing an incomplete payload', async () => {
    const infinitePromise = new Promise(() => {});
    const controller = new AbortController();
    const promiseForResult = ReactServerDOMClient.encodeReply(
      {promise: infinitePromise},
      {
        signal: controller.signal,
      },
    );
    controller.abort();
    const body = await promiseForResult;

    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    let error = null;
    try {
      await decoded.promise;
    } catch (x) {
      error = x;
    }
    expect(error).not.toBe(null);
    expect(error.message).toBe('Connection closed.');
  });

  it('can stream the decoding using an async iterable', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));

    const buffer = new Uint8Array([
      123, 4, 10, 5, 100, 255, 244, 45, 56, 67, 43, 124, 67, 89, 100, 20,
    ]);

    const formData = await ReactServerDOMClient.encodeReply({
      a: Promise.resolve('hello'),
      b: Promise.resolve(buffer),
    });

    const iterable = {
      async *[Symbol.asyncIterator]() {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const entry of formData) {
          yield entry;
          await promise;
        }
      },
    };

    const decoded = await ReactServerDOMServer.decodeReplyFromAsyncIterable(
      iterable,
      webpackServerMap,
    );

    expect(Object.keys(decoded)).toEqual(['a', 'b']);

    await resolve();

    expect(await decoded.a).toBe('hello');
    expect(Array.from(await decoded.b)).toEqual(Array.from(buffer));
  });

  it('drops a stream entry that resolves after the stream has errored', async () => {
    // A bytes stream gets an invalid entry and errors, then a later entry (a
    // Blob-backed typed array) resolves and would enqueue onto the errored
    // controller. That throw must not escape as an unhandled rejection.
    const rejections = [];
    const onRejection = reason => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      const body = new FormData();
      body.set('0', '["$r1"]');
      body.append('S1', '"nope"');
      body.append('S1', '"$o5"');
      body.append('S1', 'C');
      body.set('5', new Blob([new Uint8Array([1, 2, 3, 4])]));
      const result = await ReactServerDOMServer.decodeReply(
        body,
        webpackServerMap,
      );
      const reader = result[0].getReader();
      let readError = null;
      await reader.read().then(null, error => (readError = error));
      // Let the Blob read resolve and attempt the late enqueue.
      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setImmediate(resolve));
      }
      expect(readError).not.toBe(null);
      expect(readError.message).toBe('Invalid data for bytes stream.');
    } finally {
      process.off('unhandledRejection', onRejection);
    }
    expect(
      rejections.filter(
        reason => reason && /already closed|Invalid state/.test(reason.message),
      ),
    ).toEqual([]);
  });

  it('drops stream entries that arrive after the consumer canceled the stream', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue('first');
        c.enqueue('second');
        c.close();
      },
    });
    const formData = await ReactServerDOMClient.encodeReply({
      stream,
      later: Promise.resolve('later'),
    });
    // Keep the independent Promise's value until after the canceled stream's
    // remaining entries, so observing it proves the decoder kept going.
    const laterEntry = Array.from(formData).find(
      entry => entry[1] === '"later"',
    );
    expect(laterEntry).toBeDefined();
    const entries = Array.from(formData).filter(
      entry => entry[0] !== laterEntry[0],
    );
    expect(entries.length).toBe(4);
    let continueStream;
    const canceled = new Promise(resolve => (continueStream = resolve));
    const iterable = {
      async *[Symbol.asyncIterator]() {
        yield entries[0];
        yield entries[1];
        await canceled;
        yield entries[2];
        yield entries[3];
        yield laterEntry;
      },
    };

    const decoded = await ReactServerDOMServer.decodeReplyFromAsyncIterable(
      iterable,
      webpackServerMap,
    );
    const reader = decoded.stream.getReader();
    expect(await reader.read()).toEqual({value: 'first', done: false});
    await reader.cancel('not interested');

    // The stream's second item and its close marker still arrive. They must
    // not throw into the decoder.
    continueStream();
    expect(await decoded.later).toBe('later');
  });

  it('supports streamed values whose entries are not contiguous in the body', async () => {
    // The chunks of a streamed value are matched to their stream by field
    // name, not by position, so the client may interleave the entries of
    // multiple streams in the body FormData.
    const flush = async () => {
      // The serializer appends each chunk from promise continuations, so
      // draining microtasks is enough to observe each step.
      await null;
    };

    let controller1;
    let controller2;
    const stream1 = new ReadableStream({
      start(c) {
        controller1 = c;
      },
    });
    const stream2 = new ReadableStream({
      start(c) {
        controller2 = c;
      },
    });
    let releaseChunk1;
    let releaseChunk2;
    let releaseEnd;
    const iterable = {
      async *[Symbol.asyncIterator]() {
        await new Promise(r => (releaseChunk1 = r));
        yield 'c1';
        await new Promise(r => (releaseChunk2 = r));
        yield 'c2';
        await new Promise(r => (releaseEnd = r));
      },
    };

    const bodyPromise = ReactServerDOMClient.encodeReply({
      stream1,
      stream2,
      iterable,
    });
    // Let the serializer start each stream and let the iterable reach its
    // first gate, then deliver one chunk per value at a time so that the
    // entries of the three values interleave in the body.
    await flush();
    controller1.enqueue('a1');
    await flush();
    releaseChunk1();
    await flush();
    controller2.enqueue('b1');
    await flush();
    controller1.enqueue('a2');
    await flush();
    releaseChunk2();
    await flush();
    controller2.enqueue('b2');
    await flush();
    releaseEnd();
    await flush();
    controller1.close();
    await flush();
    controller2.close();
    const body = await bodyPromise;

    const entries = Array.from(body.entries());

    // Decode progressively, feeding one entry at a time. Each pending read
    // must only unblock once the entry for its own stream arrives.
    const gates = entries.map(() => {
      let release;
      const promise = new Promise(r => (release = r));
      return {promise, release};
    });
    const entryIterable = {
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < entries.length; i++) {
          await gates[i].promise;
          yield entries[i];
        }
      },
    };
    const replyPromise = ReactServerDOMServer.decodeReplyFromAsyncIterable(
      entryIterable,
      webpackServerMap,
    );

    gates[0].release();
    const result = await replyPromise;
    const reader1 = result.stream1.getReader();
    const reader2 = result.stream2.getReader();
    const iterator = result.iterable[Symbol.asyncIterator]();

    const readA1 = reader1.read();
    gates[1].release();
    expect(await readA1).toEqual({value: 'a1', done: false});

    const readC1 = iterator.next();
    gates[2].release();
    expect(await readC1).toEqual({value: 'c1', done: false});

    const readB1 = reader2.read();
    gates[3].release();
    expect(await readB1).toEqual({value: 'b1', done: false});

    const readA2 = reader1.read();
    gates[4].release();
    expect(await readA2).toEqual({value: 'a2', done: false});

    const readC2 = iterator.next();
    gates[5].release();
    expect(await readC2).toEqual({value: 'c2', done: false});

    const readB2 = reader2.read();
    gates[6].release();
    expect(await readB2).toEqual({value: 'b2', done: false});

    const readCDone = iterator.next();
    gates[7].release();
    expect(await readCDone).toEqual({value: undefined, done: true});

    const readADone = reader1.read();
    gates[8].release();
    expect(await readADone).toEqual({value: undefined, done: true});

    const readBDone = reader2.read();
    gates[9].release();
    expect(await readBDone).toEqual({value: undefined, done: true});
  });

  it('can pass a registered server reference', async () => {
    function greet(name) {
      return 'hi, ' + name;
    }
    const ServerModule = serverExports({
      greet,
    });

    ReactServerDOMClient.registerServerReference(
      ServerModule.greet,
      ServerModule.greet.$$id,
    );

    const body = await ReactServerDOMClient.encodeReply({
      method: ServerModule.greet,
      boundMethod: ServerModule.greet.bind(null, 'there'),
    });
    const replyResult = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    expect(replyResult.method).toBe(greet);
    expect(replyResult.boundMethod()).toBe('hi, there');
  });

  it('does not install a function into a then slot through the waiting path', async () => {
    let called = false;
    const ServerModule = serverExports({action: () => (called = true)});
    const body = new FormData();
    body.set('0', JSON.stringify({then: '$1'}));
    body.set('1', '"$h2"');
    body.set('2', JSON.stringify({id: ServerModule.action.$$id, bound: '$@3'}));
    body.set('3', JSON.stringify(['ARG']));
    const result = await settleReply(
      ReactServerDOMServer.decodeReply(body, webpackServerMap),
    );
    expect(result.status).toBe('resolved');
    expect(result.value.then).toBe(null);
    expect(called).toBe(false);
  });

  it('does not install a function into a then slot reached through a cycle', async () => {
    let called = false;
    const ServerModule = serverExports({action: () => (called = true)});
    const body = new FormData();
    body.set('0', JSON.stringify({then: '$1:f', z: 1}));
    body.set('1', JSON.stringify({f: '$h2', g: '$0'}));
    body.set('2', JSON.stringify({id: ServerModule.action.$$id, bound: null}));
    const result = await settleReply(
      ReactServerDOMServer.decodeReply(body, webpackServerMap),
    );
    expect(result.status).toBe('resolved');
    expect(result.value.then).toBe(null);
    expect(result.value.z).toBe(1);
    expect(called).toBe(false);
  });

  it('nulls a function then slot nested in an array argument', async () => {
    let called = false;
    const ServerModule = serverExports({action: () => (called = true)});
    const body = new FormData();
    body.set('0', JSON.stringify([{then: '$1'}]));
    body.set('1', '"$h2"');
    body.set('2', JSON.stringify({id: ServerModule.action.$$id, bound: '$@3'}));
    body.set('3', JSON.stringify(['ARG']));
    const result = await settleReply(
      ReactServerDOMServer.decodeReply(body, webpackServerMap),
    );
    expect(result.status).toBe('resolved');
    expect(result.value[0].then).toBe(null);
    expect(called).toBe(false);
  });

  it('does not call a server function sitting in a then slot during decodeAction', async () => {
    let called = false;
    const ServerModule = serverExports({action: () => (called = true)});
    const id = ServerModule.action.$$id;
    const body = new FormData();
    body.set('$ACTION_REF_0', '');
    body.set('$ACTION_0:0', JSON.stringify({id, bound: '$@1'}));
    body.set('$ACTION_0:1', JSON.stringify({then: '$2:f'}));
    body.set('$ACTION_0:2', JSON.stringify({f: '$h3', g: '$1'}));
    body.set('$ACTION_0:3', JSON.stringify({id, bound: null}));
    const result = await settleReply(
      ReactServerDOMServer.decodeAction(body, webpackServerMap),
    );
    expect(result.status).toBe('resolved');
    expect(called).toBe(false);
  });

  it.each(['fulfill', 'reject'])(
    'a module can %s all the Promises of objects that depend on it',
    async outcome => {
      let resolveModule;
      let rejectModule;
      const {tail} = serverExports(
        {tail: () => 'done'},
        new Promise((resolve, reject) => {
          resolveModule = resolve;
          rejectModule = reject;
        }),
      );
      const reference = ReactServerDOMClient.createServerReference(
        tail.$$id,
        () => {},
      );
      // Each object holds the previous one. Loading or failing the module
      // must notify every subscriber, including those far down the chain.
      const size = 5000;
      const resolvers = [];
      const model = Array.from(
        {length: size},
        () => new Promise(resolve => resolvers.push(resolve)),
      );
      const encoding = ReactServerDOMClient.encodeReply(model);
      let previous = reference;
      for (let i = 0; i < size; i++) {
        previous = {previous};
        resolvers[i](previous);
        if (i % 250 === 249) {
          await serverAct(() => {});
        }
      }
      const body = await encoding;
      let finished;
      const consumed = new Promise(resolve => (finished = resolve));
      const response = ReactServerDOMServer.decodeReplyFromAsyncIterable(
        (async function* () {
          yield* body.entries();
          finished();
        })(),
        webpackServerMap,
      );
      const fulfilled = [];
      const rejected = [];
      const received = await response;
      received.forEach(promise => {
        promise.then(
          value => fulfilled.push(value),
          error => rejected.push(error),
        );
      });
      await consumed;
      await serverAct(() => {});
      expect(fulfilled).toEqual([]);
      expect(rejected).toEqual([]);

      const failure = new Error('module failed');
      await serverAct(() => {
        if (outcome === 'fulfill') {
          resolveModule();
        } else {
          rejectModule(failure);
        }
      });
      expect(fulfilled.length).toBe(outcome === 'fulfill' ? size : 0);
      expect(rejected.length).toBe(outcome === 'reject' ? size : 0);
      if (outcome === 'fulfill') {
        let last = fulfilled[size - 1];
        for (let i = 0; i < size; i++) {
          last = last.previous;
        }
        expect(last()).toBe('done');
      } else {
        rejected.forEach(error => expect(error).toBe(failure));
      }
    },
    15000,
  );

  it('round trips deeply nested bound Server Functions', async () => {
    const {identity} = serverExports({identity: value => value});
    const reference = ReactServerDOMClient.createServerReference(
      identity.$$id,
      () => {},
    );
    const size = 1800;
    let model = 'done';
    for (let i = 0; i < size; i++) {
      model = reference.bind(null, model);
    }
    const body = await ReactServerDOMClient.encodeReply(model);
    let value = await ReactServerDOMServer.decodeReply(body, webpackServerMap);
    for (let i = 0; i < size; i++) {
      value = value();
    }
    expect(value).toBe('done');
  });

  it('binds a server reference to its containing array once its module loads', async () => {
    let resolveModule;
    function read(array, other) {
      return [array.length, array[1].length, other];
    }
    const ServerModule = serverExports(
      {read},
      new Promise(resolve => (resolveModule = resolve)),
    );
    ReactServerDOMClient.registerServerReference(
      ServerModule.read,
      ServerModule.read.$$id,
    );
    const array = [];
    array.push(ServerModule.read.bind(null, array, null), array);

    const body = await ReactServerDOMClient.encodeReply({array});
    const observed = [];
    const pending = ReactServerDOMServer.decodeReply(body, webpackServerMap);
    await serverAct(() => {
      pending.then(
        value => observed.push(value.array[0]()),
        error => observed.push(error.message),
      );
    });
    expect(observed).toEqual([]);

    await serverAct(() => resolveModule());
    const decoded = await pending;
    expect(observed).toEqual([[2, 2, null]]);
    expect(decoded.array[1]).toBe(decoded.array);
  });

  it('warns with a tailored message if eval is not available in dev', async () => {
    // eslint-disable-next-line no-eval
    const previousEval = globalThis.eval.bind(globalThis);
    // eslint-disable-next-line no-eval
    globalThis.eval = () => {
      throw new Error('eval is disabled');
    };

    try {
      const body = await ReactServerDOMClient.encodeReply({some: 'object'});

      assertConsoleErrorDev([
        'eval() is not supported in this environment. ' +
          'React requires eval() in development mode for various debugging features ' +
          'like reconstructing callstacks from a different environment.\n' +
          'React will never use eval() in production mode',
      ]);

      await ReactServerDOMServer.decodeReply(body, webpackServerMap);

      assertConsoleErrorDev([]);
    } finally {
      // eslint-disable-next-line no-eval
      globalThis.eval = previousEval;
    }
  });

  describe('rejects reply collection shapes the writer never emits', () => {
    const decode = chunks => {
      const body = new FormData();
      Object.keys(chunks).forEach(k => body.set(k, chunks[k]));
      return settleReply(
        ReactServerDOMServer.decodeReply(body, webpackServerMap),
      );
    };

    it('rejects a Map whose entry pairs are supplied by reference', async () => {
      const r = await decode({
        0: '["$Q1","$2"]',
        1: '["$0:1"]',
        2: '["k","$0:0"]',
      });
      expect(r.status).toBe('rejected');
      expect(r.reason.message).toMatch(/Invalid Map initializer/);
    });

    it('rejects a Map whose entry pair value is still a placeholder', async () => {
      const body = new FormData();
      body.set('0', JSON.stringify({m: '$Q1', pair: ['k', '$o2']}));
      body.set('1', '["$0:pair"]');
      body.set('2', new Blob([new Uint8Array([1, 2, 3, 4])]));
      const r = await settleReply(
        ReactServerDOMServer.decodeReply(body, webpackServerMap),
      );
      expect(r.status).toBe('rejected');
      expect(r.reason.message).toMatch(/Invalid Map initializer/);
    });

    it('builds pathed collections from one chunk as two independent objects', async () => {
      // Each path selects a different value from the chunk, so they are two
      // separate Sets rather than one shared reservation.
      const r = await decode({0: '["$W1:0","$W1:1"]', 1: '[[1],[2],"$0"]'});
      expect(r.status).toBe('resolved');
      expect(r.value[0]).toBeInstanceOf(Set);
      expect(r.value[1]).toBeInstanceOf(Set);
      expect(r.value[0]).not.toBe(r.value[1]);
    });

    it('does not bind a server reference for a bound value the writer never emits', async () => {
      const ServerModule = serverExports({fn: (...args) => args.length});
      const r = await decode({
        0: '"$h1"',
        1: JSON.stringify({id: ServerModule.fn.$$id, bound: 'abc'}),
      });
      expect(r.status).toBe('resolved');
      expect(r.value).toBe(ServerModule.fn);
    });
  });

  describe('counts arrays reached through blocked chunks', () => {
    const decode = (chunks, arraySizeLimit) => {
      const body = new FormData();
      Object.keys(chunks).forEach(k => body.set(k, chunks[k]));
      return settleReply(
        ReactServerDOMServer.decodeReply(body, webpackServerMap, {
          arraySizeLimit,
        }),
      );
    };

    it('rejects a cyclic fan-in that exceeds the array size limit', async () => {
      // Every reference selects the same nested array out of a chunk that is
      // blocked by a cycle back to the root; each counts against the limit.
      const refs = [];
      for (let i = 0; i < 24; i++) {
        refs.push('$1:x');
      }
      const r = await decode(
        {
          0: JSON.stringify(refs),
          1: JSON.stringify({
            x: [
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9],
            ],
            self: '$0',
          }),
        },
        100,
      );
      expect(r.status).toBe('rejected');
      expect(r.reason.message).toMatch(/Maximum array nesting exceeded/);
    });

    it('rejects a billion-laughs expansion through blocked chunks', async () => {
      // Each level references the next twice; the deepest holds a nested array
      // and closes a cycle, so every level is counted on the resumed path.
      const r = await decode(
        {
          0: '["$1","$1"]',
          1: '["$2","$2"]',
          2: '["$3","$3"]',
          3: '[[1,2,3,4,5,6,7,8],"$0"]',
        },
        50,
      );
      expect(r.status).toBe('rejected');
      expect(r.reason.message).toMatch(/Maximum array nesting exceeded/);
    });
  });

  describe('leaves no decoder state behind for the next decode', () => {
    // A well-founded cycle whose resolution depends on the cycle machinery, so
    // it only settles if the module-level parse state is clean.
    const canary = () => {
      const body = new FormData();
      body.set('0', '"$W1"');
      body.set('1', '["$0","x"]');
      return settleReply(
        ReactServerDOMServer.decodeReply(body, webpackServerMap),
      );
    };

    it('a server reference whose module loads after its entry does not leak parse state', async () => {
      let loadModule;
      const loading = new Promise(resolve => (loadModule = resolve));
      const ServerModule = serverExports({fn: () => 'ok'}, loading);
      const body = new FormData();
      body.set('0', JSON.stringify({a: '$h1'}));
      body.set(
        '1',
        JSON.stringify({id: ServerModule.fn.$$id, bound: null, pad: '$o2'}),
      );
      body.set('2', new Blob([new Uint8Array([1, 2, 3, 4])]));
      const pending = ReactServerDOMServer.decodeReply(body, webpackServerMap);
      // Let the Blob read settle while the module is still loading, so the
      // server reference resolves outside any parse.
      Promise.resolve(pending).then(
        () => {},
        () => {},
      );
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setImmediate(resolve));
      }
      // An independent, well-founded decode must still settle afterward.
      const result = await canary();
      expect(result.status).toBe('resolved');
      expect(result.value).toBeInstanceOf(Set);
      expect(result.value.has('x')).toBe(true);
      await serverAct(() => loadModule());
    });

    it('two interleaved async-iterable decodes each resolve their own cycle', async () => {
      const feed = entries => {
        const iterable = {
          async *[Symbol.asyncIterator]() {
            // eslint-disable-next-line no-for-of-loops/no-for-of-loops
            for (const entry of entries) {
              yield entry;
              await null;
            }
          },
        };
        return ReactServerDOMServer.decodeReplyFromAsyncIterable(
          iterable,
          webpackServerMap,
        );
      };
      const first = feed([
        ['1', JSON.stringify({a: null, c: '$0'})],
        ['0', '"$1:a"'],
      ]);
      const second = feed([
        ['1', '["$0","y"]'],
        ['0', '"$W1"'],
      ]);
      const firstResult = await settleReply(first);
      const secondResult = await settleReply(second);
      expect(firstResult.status).toBe('resolved');
      expect(firstResult.value).toBe(null);
      expect(secondResult.status).toBe('resolved');
      expect(secondResult.value).toBeInstanceOf(Set);
      expect(secondResult.value.has('y')).toBe(true);
    });
  });

  // Each hardening guard enforced by the decoder, written as a hand-crafted
  // chunk graph with its expected outcome. A reference regression in the stack
  // was that a guard held on the immediate path (the referenced chunk had
  // already initialized) but not on the resumed path (the chunk was still
  // BLOCKED when referenced, its value installed later). Every reference row
  // runs the same payload in both modes, plus a cyclic mode where the target
  // is reached from inside a cycle back to the root; the outcome must match.
  // Parse-time guards that fire before any reference is resolved run once.
  describe('enforces guards on the immediate and resumed reference paths', () => {
    let fnId;
    let called;
    beforeEach(() => {
      called = false;
      const m = serverExports({action: () => (called = true)});
      fnId = m.action.$$id;
    });

    const metaField = () => JSON.stringify({id: fnId, bound: null});

    const rows = [
      // A function reaching a `then` slot must be dropped to null, never
      // installed, so the containing object is not an invokable thenable.
      {
        name: 'then slot filled by a function via $N',
        block: 1,
        cycle: true,
        make: ref => ({
          chunks: {
            0: JSON.stringify({then: '$' + ref(1)}),
            1: '"$h2"',
            2: metaField(),
          },
          resolves: v => expect(v.then).toBe(null),
          noCall: true,
        }),
      },
      {
        name: 'then slot filled by a function via $N:path',
        block: 1,
        cycle: true,
        make: ref => ({
          chunks: {
            0: JSON.stringify({then: '$' + ref(1, 'f')}),
            1: JSON.stringify({f: '$h2'}),
            2: metaField(),
          },
          resolves: v => expect(v.then).toBe(null),
          noCall: true,
        }),
      },
      {
        name: 'then slot nested in an array argument',
        block: 1,
        make: ref => ({
          chunks: {
            0: JSON.stringify([{then: '$' + ref(1)}]),
            1: '"$h2"',
            2: metaField(),
          },
          resolves: v => expect(v[0].then).toBe(null),
          noCall: true,
        }),
      },
      {
        name: 'then slot inside a Map entry value',
        block: 3,
        make: ref => ({
          chunks: {
            0: '"$Q1"',
            1: JSON.stringify([['k', '$2']]),
            2: JSON.stringify({then: '$' + ref(3)}),
            3: '"$h4"',
            4: metaField(),
          },
          resolves: v => expect(v.get('k').then).toBe(null),
          noCall: true,
        }),
      },
      // A reference path may only descend through plain own properties.
      {
        name: 'path walk into a Map',
        block: 1,
        cycle: true,
        make: ref => ({
          chunks: {
            0: JSON.stringify({a: '$' + ref(1, 'x')}),
            1: '"$Q2"',
            2: JSON.stringify([['k', 'v']]),
          },
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk into a Set',
        block: 1,
        make: ref => ({
          chunks: {
            0: JSON.stringify({a: '$' + ref(1, '0')}),
            1: '"$W2"',
            2: JSON.stringify(['x']),
          },
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk into a typed array',
        block: 1,
        make: ref => ({
          chunks: {
            0: JSON.stringify({a: '$' + ref(1, '0')}),
            1: '"$o2"',
            2: new Blob([new Uint8Array([9, 9])]),
          },
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk into a string',
        block: 1,
        make: ref => ({
          chunks: {
            0: JSON.stringify({a: '$' + ref(1, 'x')}),
            1: JSON.stringify('hi'),
          },
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk into null',
        block: 1,
        make: ref => ({
          chunks: {0: JSON.stringify({a: '$' + ref(1, 'x')}), 1: 'null'},
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk to a non-own property',
        block: 1,
        make: ref => ({
          chunks: {0: JSON.stringify({a: '$' + ref(1, 'toString')}), 1: '{}'},
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk to a __proto__ segment',
        block: 1,
        make: ref => ({
          chunks: {0: JSON.stringify({a: '$' + ref(1, '__proto__')}), 1: '{}'},
          rejects: /Invalid reference/,
        }),
      },
      {
        name: 'path walk to a constructor segment',
        block: 1,
        make: ref => ({
          chunks: {
            0: JSON.stringify({a: '$' + ref(1, 'constructor')}),
            1: '{}',
          },
          rejects: /Invalid reference/,
        }),
      },
      // A collection is only constructed from an inline array of valid entries.
      {
        name: 'Map with a primitive entry',
        block: 1,
        cycle: true,
        make: ref => ({
          chunks: {
            0: '"$Q' + ref(1) + '"',
            1: JSON.stringify([['k', 'v'], 'primitive']),
          },
          rejects: /Invalid Map initializer/,
        }),
      },
      {
        name: 'Map initializer that is not an array',
        block: 1,
        make: ref => ({
          chunks: {0: '"$Q' + ref(1) + '"', 1: JSON.stringify('nope')},
          rejects: /Invalid Map initializer/,
        }),
      },
      {
        name: 'Set initializer that is not an array',
        block: 1,
        make: ref => ({
          chunks: {0: '"$W' + ref(1) + '"', 1: '{}'},
          rejects: /Invalid Set initializer/,
        }),
      },
      // Guards that fire while the referenced row is parsed, before any
      // resumed path exists.
      {
        name: '__proto__ key is dropped at parse',
        parseTime: true,
        make: ref => ({
          chunks: {
            0: JSON.stringify({__proto__: '$1', keep: 1}),
            1: JSON.stringify({polluted: true}),
          },
          resolves: v => {
            expect(Object.prototype.hasOwnProperty.call(v, '__proto__')).toBe(
              false,
            );
            expect(v.keep).toBe(1);
            expect({}.polluted).toBe(undefined);
          },
        }),
      },
      {
        name: 'typed array id reused',
        parseTime: true,
        make: ref => ({
          chunks: {
            0: JSON.stringify(['$o1', '$o1']),
            1: new Blob([new Uint8Array([1])]),
          },
          rejects: /Already initialized typed array/,
        }),
      },
      {
        name: 'stream id reused',
        parseTime: true,
        make: ref => ({
          chunks: {0: JSON.stringify(['$R1', '$R1'])},
          rejects: /Already initialized stream/,
        }),
      },
      {
        name: 'Blob backed by a non-Blob',
        parseTime: true,
        make: ref => ({
          chunks: {0: '"$B1"', 1: 'not a blob'},
          rejects: /Referenced Blob is not a Blob/,
        }),
      },
      {
        name: 'BigInt over the digit limit',
        parseTime: true,
        make: ref => ({
          chunks: {0: JSON.stringify('$n' + '9'.repeat(301))},
          rejects: /BigInt is too large/,
        }),
      },
      {
        name: 'bound arguments over the limit',
        parseTime: true,
        make: ref => ({
          chunks: {
            0: '"$h1"',
            1: JSON.stringify({id: fnId, bound: '$@2'}),
            2: JSON.stringify(new Array(1001).fill(0)),
          },
          rejects: /too many bound arguments/,
        }),
      },
      {
        name: 'nested arrays over the size limit',
        parseTime: true,
        opts: {arraySizeLimit: 10},
        make: ref => ({
          chunks: {
            0: JSON.stringify([
              ['aaaaaa', 'bbbbbb'],
              ['cccccc', 'dddddd'],
            ]),
          },
          rejects: /Maximum array nesting exceeded/,
        }),
      },
      {
        name: 'reference to a missing chunk',
        parseTime: true,
        make: ref => ({
          chunks: {0: '"$9"'},
          rejects: /./,
        }),
      },
    ];

    const modesFor = row =>
      row.parseTime
        ? ['immediate']
        : row.cycle
          ? ['immediate', 'waiting', 'cycle']
          : ['immediate', 'waiting'];

    rows.forEach(row => {
      modesFor(row).forEach(mode => {
        it(`${row.name} (${mode})`, async () => {
          const {body, spec} = buildGuardPayload(mode, row);
          const result = await settleReply(
            ReactServerDOMServer.decodeReply(body, webpackServerMap, row.opts),
          );
          if (spec.rejects) {
            expect(result.status).toBe('rejected');
            expect(result.reason.message).toMatch(spec.rejects);
          } else {
            expect(result.status).toBe('resolved');
            spec.resolves(result.value);
          }
          if (spec.noCall) {
            expect(called).toBe(false);
          }
        });
      });
    });

    it('a well-founded decode still resolves after every guard payload', async () => {
      // A guard path that left module-level parse state behind would break the
      // next response. Run every payload, then a well-founded cycle that only
      // settles if that state is clean.
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const modes = modesFor(row);
        for (let j = 0; j < modes.length; j++) {
          const mode = modes[j];
          const {body} = buildGuardPayload(mode, row);
          await settleReply(
            ReactServerDOMServer.decodeReply(body, webpackServerMap, row.opts),
          );
          const canaryBody = new FormData();
          canaryBody.set('0', '"$W1"');
          canaryBody.set('1', '["$0","x"]');
          const canary = await settleReply(
            ReactServerDOMServer.decodeReply(canaryBody, webpackServerMap),
          );
          if (canary.status !== 'resolved') {
            throw new Error(
              `canary did not resolve after ${row.name} (${mode}): ${canary.status}`,
            );
          }
        }
      }
    });
  });

  it('keeps a stream item whose synchronous thenable resolves to one of its objects', async () => {
    const X = {x: 1};
    const item = {x: X, p: {then: resolve => resolve(X)}};
    const source = new ReadableStream({
      start(c) {
        c.enqueue(item);
        c.close();
      },
    });
    const body = await ReactServerDOMClient.encodeReply(source);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const received = (await result.getReader().read()).value;
    const resolved = await received.p;
    expect(resolved).toBe(received.x);
  });

  it('serializes a stream item whose asynchronous thenable resolves to one of its objects', async () => {
    const X = {x: 1};
    const item = {x: X, p: Promise.resolve().then(() => X)};
    const source = new ReadableStream({
      start(c) {
        c.enqueue(item);
        c.close();
      },
    });
    const body = await ReactServerDOMClient.encodeReply(source);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const received = (await result.getReader().read()).value;
    const resolved = await received.p;
    expect(resolved).toEqual({x: 1});
    expect(received.x).toEqual({x: 1});
  });

  it('keeps a stream item whose Map value is one of its objects', async () => {
    const X = {x: 1};
    const item = {x: X, m: new Map([['k', X]])};
    const source = new ReadableStream({
      start(c) {
        c.enqueue(item);
        c.close();
      },
    });
    const body = await ReactServerDOMClient.encodeReply(source);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const received = (await result.getReader().read()).value;
    expect(received.m.get('k')).toBe(received.x);
  });

  it('resolves a reference from a synchronously nested item up to an outer item', async () => {
    function syncIterable(items) {
      // An async iterable whose next() settles synchronously, so its items are
      // serialized while the containing item is still on the stack.
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            next() {
              const result =
                i < items.length
                  ? {value: items[i++], done: false}
                  : {value: undefined, done: true};
              return {then: resolve => resolve(result)};
            },
          };
        },
      };
    }
    const X = {level: 'outer'};
    const inner = {innerX: X};
    const middle = {mid: true, nested: syncIterable([inner])};
    const outer = {x: X, nested: syncIterable([middle])};
    const source = new ReadableStream({
      start(c) {
        c.enqueue(outer);
        c.close();
      },
    });
    const body = await ReactServerDOMClient.encodeReply(source);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const receivedOuter = (await result.getReader().read()).value;
    const receivedMiddle = (
      await receivedOuter.nested[Symbol.asyncIterator]().next()
    ).value;
    const receivedInner = (
      await receivedMiddle.nested[Symbol.asyncIterator]().next()
    ).value;
    expect(receivedInner.innerX).toBe(receivedOuter.x);
  });

  it('rejects a reply when a stream item throws partway through', async () => {
    const X = {x: 1};
    const S = new Set([X]);
    const item = {x: X, s: S};
    Object.defineProperty(item, 'boom', {
      enumerable: true,
      get() {
        throw new Error('getter boom');
      },
    });
    const source = new ReadableStream({
      start(c) {
        c.enqueue(item);
        c.close();
      },
    });
    await expect(ReactServerDOMClient.encodeReply(source)).rejects.toThrow(
      'getter boom',
    );

    // The encoder's state is per call, so the same objects encode cleanly in a
    // fresh call even though the previous one abandoned them partway through.
    const body = await ReactServerDOMClient.encodeReply({x: X, s: S});
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    expect(Array.from(result.s)[0]).toBe(result.x);
  });
});
