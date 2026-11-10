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
let serverExports;
let webpackServerMap;
let ReactServerDOMServer;
let ReactServerDOMClient;

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
  });

  it('can encode a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply({some: 'object'});
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(decoded).toEqual({some: 'object'});
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
});
