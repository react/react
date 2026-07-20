/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes.js';

import type {
  DebugChannel,
  DebugChannelCallback,
  FindSourceMapURLCallback,
  Response as FlightResponse,
} from 'react-client/src/ReactFlightClient';

import type {ReactServerValue} from 'react-client/src/ReactFlightReplyClient';

import {
  createResponse,
  createStreamState,
  getRoot,
  reportGlobalError,
  processBinaryChunk,
  processStringChunk,
  close,
  injectIntoDevTools,
} from 'react-client/src/ReactFlightClient';

import {processReply} from 'react-client/src/ReactFlightReplyClient';

export {
  createServerReference,
  registerServerReference,
} from 'react-client/src/ReactFlightReplyClient';

import type {TemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';

export {createTemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';

export type {TemporaryReferenceSet};

type CallServerCallback = <A, T>(string, args: A) => Promise<T>;

export type Options = {
  callServer?: CallServerCallback,
  debugChannel?: {writable?: WritableStream, readable?: ReadableStream, ...},
  temporaryReferences?: TemporaryReferenceSet,
  unstable_allowPartialStream?: boolean,
  findSourceMapURL?: FindSourceMapURLCallback,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  startTime?: number,
  endTime?: number,
};

function createDebugCallbackFromWritableStream(
  debugWritable: WritableStream,
): DebugChannelCallback {
  const textEncoder = new TextEncoder();
  const writer = debugWritable.getWriter();
  return message => {
    if (message === '') {
      writer.close();
    } else {
      // Note: It's important that this function doesn't close over the Response object or it can't be GC:ed.
      // Therefore, we can't report errors from this write back to the Response object.
      if (__DEV__) {
        writer.write(textEncoder.encode(message + '\n')).catch(console.error);
      }
    }
  };
}

function createResponseFromOptions(options: void | Options) {
  const debugChannel: void | DebugChannel =
    __DEV__ && options && options.debugChannel !== undefined
      ? {
          hasReadable: options.debugChannel.readable !== undefined,
          callback:
            options.debugChannel.writable !== undefined
              ? createDebugCallbackFromWritableStream(
                  options.debugChannel.writable,
                )
              : null,
        }
      : undefined;

  return createResponse(
    null,
    null,
    null,
    options && options.callServer ? options.callServer : undefined,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
    __DEV__ ? (options ? options.replayConsoleLogs !== false : true) : false, // defaults to true
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
    __DEV__ && options && options.startTime != null
      ? options.startTime
      : undefined,
    __DEV__ && options && options.endTime != null ? options.endTime : undefined,
    debugChannel,
  );
}

function startReadingFromUniversalStream(
  response: FlightResponse,
  stream: ReadableStream,
  onDone: () => void,
): void {
  // This is the same as startReadingFromStream except this allows WebSocketStreams which
  // return ArrayBuffer and string chunks instead of Uint8Array chunks. We could potentially
  // always allow streams with variable chunk types.
  const streamState = createStreamState(response, stream);
  const reader = stream.getReader();
  function progress({
    done,
    value,
  }: {
    done: boolean,
    value: any,
    ...
  }): void | Promise<void> {
    if (done) {
      return onDone();
    }
    if (value instanceof ArrayBuffer) {
      // WebSockets can produce ArrayBuffer values in ReadableStreams.
      processBinaryChunk(response, streamState, new Uint8Array(value));
    } else if (typeof value === 'string') {
      // WebSockets can produce string values in ReadableStreams.
      processStringChunk(response, streamState, value);
    } else {
      processBinaryChunk(response, streamState, value);
    }
    return reader.read().then(progress).catch(error);
  }
  function error(e: any) {
    reportGlobalError(response, e);
  }
  reader.read().then(progress).catch(error);
}

function startReadingFromStream(
  response: FlightResponse,
  stream: ReadableStream,
  onDone: () => void,
  debugValue: mixed,
): void {
  const streamState = createStreamState(response, debugValue);
  const reader = stream.getReader();
  function progress({
    done,
    value,
  }: {
    done: boolean,
    value: ?any,
    ...
  }): void | Promise<void> {
    if (done) {
      return onDone();
    }
    const buffer: Uint8Array = value as any;
    processBinaryChunk(response, streamState, buffer);
    return reader.read().then(progress).catch(error);
  }
  function error(e: any) {
    reportGlobalError(response, e);
  }
  reader.read().then(progress).catch(error);
}

function createFromReadableStream<T>(
  stream: ReadableStream,
  options?: Options,
): Thenable<T> {
  const response: FlightResponse = createResponseFromOptions(options);
  if (
    __DEV__ &&
    options &&
    options.debugChannel &&
    options.debugChannel.readable
  ) {
    let streamDoneCount = 0;
    const handleDone = () => {
      if (++streamDoneCount === 2) {
        close(response);
      }
    };
    startReadingFromUniversalStream(
      response,
      options.debugChannel.readable,
      handleDone,
    );
    startReadingFromStream(response, stream, handleDone, stream);
  } else {
    startReadingFromStream(
      response,
      stream,
      close.bind(null, response),
      stream,
    );
  }
  return getRoot(response);
}

function createFromFetch<T>(
  promiseForResponse: Promise<Response>,
  options?: Options,
): Thenable<T> {
  const response: FlightResponse = createResponseFromOptions(options);
  promiseForResponse.then(
    function (r) {
      if (
        __DEV__ &&
        options &&
        options.debugChannel &&
        options.debugChannel.readable
      ) {
        let streamDoneCount = 0;
        const handleDone = () => {
          if (++streamDoneCount === 2) {
            close(response);
          }
        };
        startReadingFromUniversalStream(
          response,
          options.debugChannel.readable,
          handleDone,
        );
        startReadingFromStream(response, r.body as any, handleDone, r);
      } else {
        startReadingFromStream(
          response,
          r.body as any,
          close.bind(null, response),
          r,
        );
      }
    },
    function (e) {
      reportGlobalError(response, e);
    },
  );
  return getRoot(response);
}

function encodeReply(
  value: ReactServerValue,
  options?: {temporaryReferences?: TemporaryReferenceSet, signal?: AbortSignal},
): Promise<
  string | URLSearchParams | FormData,
> /* We don't use URLSearchParams yet but maybe */ {
  return new Promise((resolve, reject) => {
    const abort = processReply(
      value,
      '',
      options && options.temporaryReferences
        ? options.temporaryReferences
        : undefined,
      resolve,
      reject,
    );
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        abort((signal as any).reason);
      } else {
        const listener = () => {
          abort((signal as any).reason);
          signal.removeEventListener('abort', listener);
        };
        signal.addEventListener('abort', listener);
      }
    }
  });
}

function base64ToBinary(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Calls made after the channel closed have nowhere to go; accepting them
// silently (without retaining anything) matches a closed stream. A later
// reader attempt must still see that the channel was consumed.
function receiveAfterClose() {}
(receiveAfterClose as any).claimed = true;

// Reads the inline data channel that a Fizz render with inlineData writes
// into the document: inline scripts deliver wire chunks by calling the $RF
// receiver defined with the shell, which queues them on itself until a
// reader takes over. Text chunks arrive as strings, binary chunks as
// single-element arrays of base64, and null marks the end of the data.
// Chunks queued before we got here are drained; future calls stream in as
// the document parses. Closing swaps in a receiver that holds no
// references, so the response can be collected when the app lets go of it.
function createFromInlineData<T>(options?: Options): Thenable<T> {
  const receiver = (globalThis as any).$RF;
  if (typeof receiver !== 'function') {
    throw new Error(
      'This document does not have an inline data channel. ' +
        'createFromInlineData requires a document rendered with inlineData.',
    );
  }
  if (receiver.claimed) {
    throw new Error(
      'The inline data channel already has a reader. ' +
        'createFromInlineData can only be called once per document.',
    );
  }
  const response: FlightResponse = createResponseFromOptions(options);
  const streamState = createStreamState(response, receiver);
  let closed = false;
  function receive(chunk: string | [string] | null): void {
    if (closed) {
      return;
    }
    if (chunk === null) {
      closed = true;
      (globalThis as any).$RF = receiveAfterClose;
      close(response);
    } else if (typeof chunk === 'string') {
      processStringChunk(response, streamState, chunk);
    } else {
      processBinaryChunk(response, streamState, base64ToBinary(chunk[0]));
    }
  }
  (receive as any).claimed = true;
  // Take over before draining: if the close marker is already queued, the
  // drain itself swaps in the closed receiver.
  (globalThis as any).$RF = receive;
  const queue: void | Array<string | [string] | null> = receiver.q;
  // The drained chunks would otherwise be retained by the document forever.
  receiver.q = null;
  if (queue != null) {
    for (let i = 0; i < queue.length; i++) {
      receive(queue[i]);
    }
  }
  return getRoot(response);
}

export {
  createFromFetch,
  createFromReadableStream,
  createFromInlineData,
  encodeReply,
};

if (__DEV__) {
  injectIntoDevTools();
}
