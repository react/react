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
  FindSourceMapURLCallback,
  Response,
} from 'react-client/src/ReactFlightClient';

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

import type {Readable} from 'stream';
import type {FlightTee} from 'shared/ReactFlightTee';

import {AsyncLocalStorage, AsyncResource} from 'async_hooks';

import {
  createResponse,
  createStreamState,
  getRoot,
  reportGlobalError,
  processStringChunk,
  processBinaryChunk,
  close,
  resolveLedgerTotals,
} from 'react-client/src/ReactFlightClient';

import {
  createTee as createTeeImpl,
  createFromTee as createFromTeeImpl,
} from 'react-client/src/ReactFlightClientTee';

export * from './ReactFlightDOMClientEdge';

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

type EncodeFormActionCallback = <A>(
  id: any,
  args: Promise<A>,
) => ReactCustomFormAction;

export type Options = {
  nonce?: string,
  encodeFormAction?: EncodeFormActionCallback,
  unstable_allowPartialStream?: boolean,
  findSourceMapURL?: FindSourceMapURLCallback,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  unstable_requestId?: string,
  startTime?: number,
  endTime?: number,
  // For the Node.js client we only support a single-direction debug channel.
  debugChannel?: Readable,
};

function startReadingFromStream(
  response: Response,
  stream: Readable,
  onEnd: () => void,
): void {
  const streamState = createStreamState(response, stream);

  stream.on('data', chunk => {
    if (typeof chunk === 'string') {
      processStringChunk(response, streamState, chunk);
    } else {
      processBinaryChunk(response, streamState, chunk);
    }
  });

  stream.on('error', error => {
    reportGlobalError(response, error);
  });

  stream.on('end', onEnd);
}

function createFromNodeStream<T>(
  stream: Readable,
  serverConsumerManifest: ServerConsumerManifest,
  options?: Options,
): Thenable<T> {
  const debugChannel: void | DebugChannel =
    __DEV__ && options && options.debugChannel !== undefined
      ? {hasReadable: true, callback: null}
      : undefined;

  const response: Response = createResponse(
    serverConsumerManifest.moduleMap,
    serverConsumerManifest.serverModuleMap,
    serverConsumerManifest.moduleLoading,
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    undefined, // TODO: If encodeReply is supported, this should support temporaryReferences
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
    __DEV__ && options ? options.unstable_requestId : undefined,
  );

  if (__DEV__ && options && options.debugChannel) {
    let streamEndedCount = 0;
    const handleEnd = () => {
      if (++streamEndedCount === 2) {
        close(response);
      }
    };
    const handleMainEnd = () => {
      resolveLedgerTotals(response);
      handleEnd();
    };
    startReadingFromStream(response, options.debugChannel, handleEnd);
    startReadingFromStream(response, stream, handleMainEnd);
  } else {
    startReadingFromStream(response, stream, close.bind(null, response));
  }

  return getRoot(response);
}

export type TeeOptions = {
  nonce?: string,
  encodeFormAction?: EncodeFormActionCallback,
  unstable_allowPartialStream?: boolean,
  findSourceMapURL?: FindSourceMapURLCallback,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  unstable_requestId?: string,
  startTime?: number,
  endTime?: number,
};

// Creates a tee for a Flight render in the same process. Pass it to the
// server's `tee` option before the render starts, then read it with
// `createFromTee`. The render still writes its bytes to its destination.
function createTee(
  serverConsumerManifest: ServerConsumerManifest,
  options?: TeeOptions,
): FlightTee {
  const response: Response = createResponse(
    serverConsumerManifest.moduleMap,
    serverConsumerManifest.serverModuleMap,
    serverConsumerManifest.moduleLoading,
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    undefined, // TODO: If encodeReply is supported, this should support temporaryReferences
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
    // The tee gets the debug rows in the same order as the others, even if the
    // server writes them to a separate debug channel.
    undefined,
    __DEV__ && options ? options.unstable_requestId : undefined,
  );
  return createTeeImpl(response);
}

// Reads the root of a tee. Call it after the render has started, from the
// context that reads it (for SSR, inside the Fizz render), because hints and
// module preinits are dispatched there. A tee can be read once; any other
// reader reads the bytes.
function createFromTee<T>(tee: FlightTee): Thenable<T> {
  if (typeof AsyncLocalStorage.snapshot === 'function') {
    const snapshot = AsyncLocalStorage.snapshot();
    return createFromTeeImpl(tee, task => snapshot(task));
  }
  // Where snapshot() isn't available, a bound resource captures the context.
  const runInReaderContext = AsyncResource.bind((task: () => void) => task());
  return createFromTeeImpl(tee, runInReaderContext);
}

export {createFromNodeStream, createTee, createFromTee};
