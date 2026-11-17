/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// How many turns a drain makes before failing the case for lack of progress.
// Each turn flushes output and waits one timer tick.
const MAX_FLUSH_ATTEMPTS = 30;

const tick = () => new Promise(resolve => setImmediate(resolve));

function startFlightResponse({
  ReactServerDOMServer,
  ReactServerDOMClient,
  WebpackMock,
  host,
  model,
  onError,
}) {
  const manifest = {
    moduleMap: null,
    serverModuleMap: null,
    moduleLoading: null,
  };
  const errors = [];
  let queued = [];
  let serverDone = false;
  let closed = false;
  let disposed = false;
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
  if (host === 'node') {
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

  async function flush() {
    await tick();
    if (queued.length > 0) {
      send(Buffer.concat(queued));
    }
    queued = [];

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
      // Edge streams may need a timer or I/O callback.
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    const error = new Error('No progress: ' + describe());
    throw error;
  }

  return {
    root,
    flush,
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

module.exports = {startFlightResponse};
