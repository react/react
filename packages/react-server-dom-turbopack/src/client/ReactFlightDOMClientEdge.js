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
  FindSourceMapURLCallback,
} from 'react-client/src/ReactFlightClient';

import type {ReactServerValue} from 'react-client/src/ReactFlightReplyClient';

import type {
  ServerConsumerModuleMap,
  ModuleLoading,
  ServerManifest,
} from 'react-client/src/ReactFlightClientConfig';

type ServerConsumerManifest = {
  moduleMap: ServerConsumerModuleMap,
  moduleLoading: ModuleLoading,
  serverModuleMap: null | ServerManifest,
};

import type {RenderResult} from 'react-client/src/ReactFlightClient';

import {
  createResponse,
  createStreamState,
  connectRenderResult,
  provideDispatchScope,
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

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

export function createServerReference<A: Iterable<any>, T>(
  id: any,
  callServer: any,
): (...A) => Promise<T> {
  return createServerReferenceImpl(id, noServerCall);
}

type EncodeFormActionCallback = <A>(
  id: any,
  args: Promise<A>,
) => ReactCustomFormAction;

export type Options = {
  serverConsumerManifest: ServerConsumerManifest,
  nonce?: string,
  encodeFormAction?: EncodeFormActionCallback,
  temporaryReferences?: TemporaryReferenceSet,
  unstable_allowPartialStream?: boolean,
  findSourceMapURL?: FindSourceMapURLCallback,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  startTime?: number,
  endTime?: number,
  // For the Edge client we only support a single-direction debug channel.
  debugChannel?: {readable?: ReadableStream, ...},
};

function createResponseFromOptions(options: Options) {
  const debugChannel: void | DebugChannel =
    __DEV__ && options && options.debugChannel !== undefined
      ? {
          hasReadable: options.debugChannel.readable !== undefined,
          callback: null,
        }
      : undefined;

  return createResponse(
    options.serverConsumerManifest.moduleMap,
    options.serverConsumerManifest.serverModuleMap,
    options.serverConsumerManifest.moduleLoading,
    noServerCall,
    options.encodeFormAction,
    typeof options.nonce === 'string' ? options.nonce : undefined,
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
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

function createFromReadableStream<T>(
  stream: ReadableStream,
  options: Options,
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

// Consumes an in-process render() result through the normal Response, so
// module resolution, dedupe, lazy chunks, hint dispatch and debug info all
// behave exactly as they do for byte streams — without the byte stream.
// The consumer has to attach before the render starts emitting, so this must
// be called synchronously after render().
function createFromRender<T>(
  result: RenderResult,
  options: Options,
): Thenable<T> {
  const response: FlightResponse = createResponseFromOptions(options);
  const streamState = createStreamState(response, result);
  connectRenderResult(response, result, streamState);
  const root = getRoot<T>(response);
  let scopeCaptured = false;
  return {
    then(resolve: any, reject: any) {
      if (!scopeCaptured) {
        scopeCaptured = true;
        // Module preinits and hints must land in whatever request consumes
        // this response. A byte stream gets this implicitly: its
        // subscription callbacks inherit the consumer's async scope. For an
        // in-process render, capture the scope of the first read — the
        // consuming renderer's — and route every dispatch through it.
        // $FlowFixMe[cannot-resolve-name]: feature detected at runtime
        const snapshot =
          typeof AsyncLocalStorage === 'function' &&
          // $FlowFixMe[cannot-resolve-name]
          typeof AsyncLocalStorage.snapshot === 'function'
            ? // $FlowFixMe[cannot-resolve-name]
              AsyncLocalStorage.snapshot()
            : (dispatch: () => void) => dispatch();
        provideDispatchScope(response, snapshot);
      }
      return (root as any).then(resolve, reject);
    },
  } as any;
}

function createFromFetch<T>(
  promiseForResponse: Promise<Response>,
  options: Options,
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

export {
  createFromFetch,
  createFromReadableStream,
  createFromRender,
  encodeReply,
};
