/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable, ReactCustomFormAction} from 'shared/ReactTypes.js';

import type {
  DebugChannel,
  Response as FlightResponse,
} from 'react-client/src/ReactFlightClient';
import type {ReactServerValue} from 'react-client/src/ReactFlightReplyClient';

import {
  createResponse,
  createStreamState,
  getRoot,
  reportGlobalError,
  processBinaryChunk,
  close,
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

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

export function createServerReference<A: Iterable<any>, T>(
  id: string,
  exportName: string,
): (...A) => Promise<T> {
  return createServerReferenceImpl(
    id + '#' + exportName,
    noServerCall,
    undefined,
    findSourceMapURL,
    exportName,
  );
}

type EncodeFormActionCallback = <A>(
  id: any,
  args: Promise<A>,
  encodeDefault: () => ReactCustomFormAction,
) => ReactCustomFormAction;

export type Options = {
  nonce?: string,
  encodeFormAction?: EncodeFormActionCallback,
  temporaryReferences?: TemporaryReferenceSet,
  unstable_allowPartialStream?: boolean,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  startTime?: number,
  endTime?: number,
  // For the Edge client we only support a single-direction debug channel.
  debugChannel?: {readable?: ReadableStream, ...},
};

function createResponseFromOptions(options?: Options) {
  const debugChannel: void | DebugChannel =
    __DEV__ && options && options.debugChannel !== undefined
      ? {
          hasReadable: options.debugChannel.readable !== undefined,
          callback: null,
        }
      : undefined;

  return createResponse(
    null, // bundlerConfig
    null, // serverReferenceConfig
    null, // moduleLoading
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ ? findSourceMapURL : undefined,
    __DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false
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
    startReadingFromStream(response, options.debugChannel.readable, handleDone);
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
        startReadingFromStream(
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
