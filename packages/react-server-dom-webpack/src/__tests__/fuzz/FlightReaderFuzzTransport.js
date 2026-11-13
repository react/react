/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// How many flush-and-wait turns a drain makes before declaring no progress.
// Each turn flushes output and waits one timer tick, so this bounds how long a
// genuinely stuck value waits before the case fails as a liveness bug.
const MAX_FLUSH_ATTEMPTS = 30;

const tick = () => new Promise(resolve => setImmediate(resolve));

// Run source events in a native callback for React's async tracing.
// Microtasks and setImmediate are treated as continuations of existing I/O.
function runInIOCallback(fn) {
  return new Promise((resolve, reject) => {
    const {MessageChannel} = require('node:worker_threads');
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      try {
        resolve(fn());
      } catch (error) {
        reject(error);
      }
    };
    channel.port2.postMessage(undefined);
  });
}

function startFlightResponse({
  ReactServerDOMServer,
  ReactServerDOMClient,
  WebpackMock,
  host,
  model,
  body,
  bufferedReply,
  packetSizes,
  yieldBetweenPackets,
  onError,
}) {
  const manifest = {
    moduleMap: null,
    serverModuleMap: WebpackMock.webpackServerMap,
    moduleLoading: null,
  };
  const errors = [];
  let queued = [];
  let serverDone = false;
  let closed = false;
  let disposed = false;
  let packet = 0;
  let send;
  let end;
  let abort;
  let root;
  let serverCompletion;
  const options = {
    onError(error) {
      if (disposed) {
        return 'cleanup';
      }
      try {
        return onError(error);
      } catch (unexpected) {
        errors.push(unexpected);
        return 'unexpected';
      }
    },
  };
  if (host === 'reply') {
    serverDone = true;
    serverCompletion = Promise.resolve();
    abort = () => {};
    // The graph size is bounded by the generator. Test decoding independently
    // of the application's configurable limit on nested arrays.
    const replyOptions = {arraySizeLimit: Infinity};
    if (bufferedReply) {
      root = ReactServerDOMServer.decodeReply(
        body,
        WebpackMock.webpackServerMap,
        replyOptions,
      );
      send = () => {};
      end = () => {};
    } else {
      // Packet sizes count FormData entries, since the public decoder reads
      // entries from an async iterable rather than bytes from a stream.
      queued =
        typeof body === 'string' ? [['0', body]] : Array.from(body.entries());
      const waiting = [];
      const arrived = [];
      let ended = false;
      const deliver = () => {
        while (waiting.length && (arrived.length || ended)) {
          waiting.shift()(
            arrived.length
              ? {done: false, value: arrived.shift()}
              : {done: true, value: undefined},
          );
        }
      };
      const entries = {
        [Symbol.asyncIterator]() {
          return {
            next() {
              return new Promise(resolve => {
                waiting.push(resolve);
                deliver();
              });
            },
          };
        },
      };
      root = ReactServerDOMServer.decodeReplyFromAsyncIterable(
        entries,
        WebpackMock.webpackServerMap,
        replyOptions,
      );
      send = entry => {
        arrived.push(entry);
        deliver();
      };
      end = () => {
        ended = true;
        deliver();
      };
    }
  } else if (host === 'node') {
    const {PassThrough, Writable} = require('stream');
    const {finished} = require('stream/promises');
    const input = new PassThrough();
    root = ReactServerDOMClient.createFromNodeStream(input, manifest);
    send = bytes => input.write(bytes);
    end = () => input.end();
    const output = new Writable({
      write(bytes, encoding, done) {
        queued.push(Buffer.from(bytes));
        done();
      },
      final(done) {
        serverDone = true;
        done();
      },
    });
    serverCompletion = finished(output, {cleanup: true}).catch(error => {
      if (!disposed) {
        errors.push(error);
      }
    });
    const writer = ReactServerDOMServer.renderToPipeableStream(
      model,
      WebpackMock.webpackMap,
      options,
    );
    abort = reason => writer.abort(reason);
    writer.pipe(output);
  } else {
    let controller;
    const input = new ReadableStream({start: value => (controller = value)});
    root = ReactServerDOMClient.createFromReadableStream(input, {
      serverConsumerManifest: manifest,
    });
    send = bytes => controller.enqueue(bytes);
    end = () => controller.close();
    const control = new AbortController();
    const output = ReactServerDOMServer.renderToReadableStream(
      model,
      WebpackMock.webpackMap,
      {
        ...options,
        signal: control.signal,
      },
    );
    abort = reason => control.abort(reason);
    const reader = output.getReader();
    serverCompletion = (async () => {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) {
          serverDone = true;
          return;
        }
        queued.push(Buffer.from(value));
      }
    })().catch(error => {
      if (!disposed) {
        errors.push(error);
      }
    });
  }

  // Split output into uneven packets to exercise partial reads.
  async function flush() {
    await tick();
    if (host === 'reply') {
      while (queued.length) {
        const count = packetSizes[packet++ % packetSizes.length];
        queued.splice(0, count).forEach(send);
        if (yieldBetweenPackets) {
          await tick();
        }
      }
    } else {
      // A broken byte-stream reader may transfer the packet's buffer. Give
      // the transport its own buffer so this can fail the case without also
      // detaching Node's shared Buffer pool and breaking Jest's file reads.
      const bytes = new Uint8Array(Buffer.concat(queued));
      queued = [];
      for (let offset = 0; offset < bytes.length; ) {
        const size = packetSizes[packet++ % packetSizes.length];
        send(bytes.subarray(offset, offset + size));
        offset += size;
        if (yieldBetweenPackets) {
          await tick();
        }
      }
    }

    await tick();
    if (errors.length) {
      throw errors[0];
    }
  }

  async function drain(predicate, describe) {
    for (let turn = 0; turn < MAX_FLUSH_ATTEMPTS; turn++) {
      await flush();
      if (predicate()) {
        return;
      }
      // Blob reads and Edge streams may need a timer or I/O callback.
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    const error = new Error('No progress: ' + describe());
    error.fuzzFailure = 'liveness';
    throw error;
  }

  return {
    root,
    get isClosed() {
      return closed;
    },
    get isServerDone() {
      return serverDone;
    },
    flush,
    drain,
    // Flush all server output without closing the client stream. Pending
    // values must complete without relying on EOF.
    finish: () =>
      drain(
        () => serverDone && queued.length === 0,
        () => 'writer completion',
      ),
    close() {
      if (!closed) {
        closed = true;
        end();
      }
    },
    async dispose() {
      disposed = true;
      try {
        if (!serverDone) {
          abort();
        }
        // Aborting can schedule more writer work. Wait for the output and its
        // read pump to finish before resetting modules for the next case.
        await serverCompletion;
      } finally {
        if (!closed) {
          closed = true;
          end();
        }
      }
      queued = [];
      await tick();
    },
  };
}

module.exports = {startFlightResponse, tick, runInIOCallback};
