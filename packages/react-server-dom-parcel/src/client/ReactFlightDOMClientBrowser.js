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
  Response as FlightResponse,
} from 'react-client/src/ReactFlightClient';
import type {ReactServerValue} from 'react-client/src/ReactFlightReplyClient';
import type {ServerReferenceId} from '../client/ReactFlightClientConfigBundlerParcel';

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

import {
  processReply,
  createServerReference as createServerReferenceImpl,
} from 'react-client/src/ReactFlightReplyClient';

export {registerServerReference} from 'react-client/src/ReactFlightReplyClient';

import type {TemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';

export {createTemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';
export type {TemporaryReferenceSet};

function findSourceMapURL(filename: string, environmentName: string) {
  const devServer = parcelRequire.meta.devServer;
  if (devServer != null) {
    const qs = new URLSearchParams();
    qs.set('filename', filename);
    qs.set('env', environmentName);
    return devServer + '/__parcel_source_map?' + qs.toString();
  }
  return null;
}

type CallServerCallback = <A, T>(id: string, args: A) => Promise<T>;

let callServer: CallServerCallback | null = null;
export function setServerCallback(fn: CallServerCallback) {
  callServer = fn;
}

function callCurrentServerCallback<A, T>(
  id: ServerReferenceId,
  args: A,
): Promise<T> {
  if (!callServer) {
    throw new Error(
      'No server callback has been registered. Call setServerCallback to register one.',
    );
  }
  return callServer(id, args);
}

export function createServerReference<A: Iterable<any>, T>(
  id: string,
  exportName: string,
): (...A) => Promise<T> {
  return createServerReferenceImpl(
    id + '#' + exportName,
    callCurrentServerCallback,
    undefined,
    findSourceMapURL,
    exportName,
  );
}

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
    null, // bundlerConfig
    null, // serverReferenceConfig
    null, // moduleLoading
    callCurrentServerCallback,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ ? findSourceMapURL : undefined,
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

export type Options = {
  debugChannel?: {writable?: WritableStream, readable?: ReadableStream, ...},
  temporaryReferences?: TemporaryReferenceSet,
  unstable_allowPartialStream?: boolean,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  startTime?: number,
  endTime?: number,
};

export function createFromReadableStream<T>(
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

export function createFromFetch<T>(
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

export function encodeReply(
  value: ReactServerValue,
  options?: {temporaryReferences?: TemporaryReferenceSet, signal?: AbortSignal},
): Promise<
  string | URLSearchParams | FormData,
> /* We don't use URLSearchParams yet but maybe */ {
  return new Promise((resolve, reject) => {
    const abort = processReply(
      value,
      '', // formFieldPrefix
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

if (__DEV__) {
  injectIntoDevTools();
}
