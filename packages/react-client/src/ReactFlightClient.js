/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  JSONValue,
  Thenable,
  ReactDebugInfo,
  ReactDebugInfoEntry,
  ReactComponentInfo,
  ReactAsyncInfo,
  ReactIOInfo,
  ReactStackTrace,
  ReactFunctionLocation,
  ReactErrorInfoDev,
} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';

import type {
  ClientReference,
  ClientReferenceMetadata,
  ServerConsumerModuleMap,
  ServerManifest,
  StringDecoder,
  ModuleLoading,
} from './ReactFlightClientConfig';

import type {
  HintCode,
  HintModel,
} from 'react-server/src/ReactFlightServerConfig';

import type {
  CallServerCallback,
  EncodeFormActionCallback,
} from './ReactFlightReplyClient';

import type {TemporaryReferenceSet} from './ReactFlightTemporaryReferences';

import type {RenderResult} from 'shared/ReactFlightRenderResult';

export type {
  RenderConsumer,
  RenderResult,
} from 'shared/ReactFlightRenderResult';

import {
  enableProfilerTimer,
  enableComponentPerformanceTrack,
  enableAsyncDebugInfo,
} from 'shared/ReactFeatureFlags';

import {
  resolveClientReference,
  resolveServerReference,
  preloadModule,
  requireModule,
  getModuleDebugInfo,
  dispatchHint,
  readPartialStringChunk,
  readFinalStringChunk,
  createStringDecoder,
  prepareDestinationForModule,
  bindToConsole,
  rendererVersion,
  rendererPackageName,
  checkEvalAvailabilityOnceDev,
} from './ReactFlightClientConfig';

import {
  createBoundServerReference,
  registerBoundServerReference,
} from './ReactFlightReplyClient';

import {readTemporaryReference} from './ReactFlightTemporaryReferences';

import {
  markAllTracksInOrder,
  logComponentRender,
  logDedupedComponentRender,
  logComponentAborted,
  logComponentErrored,
  logIOInfo,
  logIOInfoErrored,
  logComponentAwait,
  logComponentAwaitAborted,
  logComponentAwaitErrored,
} from './ReactFlightPerformanceTrack';

import {
  REACT_LAZY_TYPE,
  REACT_ELEMENT_TYPE,
  ASYNC_ITERATOR,
  REACT_FRAGMENT_TYPE,
} from 'shared/ReactSymbols';

import getComponentNameFromType from 'shared/getComponentNameFromType';

import {getOwnerStackByComponentInfoInDev} from 'shared/ReactComponentInfoStack';

import hasOwnProperty from 'shared/hasOwnProperty';

import {injectInternals} from './ReactFlightClientDevToolsHook';

import {OMITTED_PROP_ERROR} from 'shared/ReactFlightPropertyAccess';

import ReactVersion from 'shared/ReactVersion';

import isArray from 'shared/isArray';

import * as React from 'react';

import type {SharedStateServer} from 'react/src/ReactSharedInternalsServer';
import type {SharedStateClient} from 'react/src/ReactSharedInternalsClient';

// TODO: This is an unfortunate hack. We shouldn't feature detect the internals
// like this. It's just that for now we support the same build of the Flight
// client both in the RSC environment, in the SSR environments as well as the
// browser client. We should probably have a separate RSC build. This is DEV
// only though.
const ReactSharedInteralsServer: void | SharedStateServer = (React as any)
  .__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const ReactSharedInternals: SharedStateServer | SharedStateClient =
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ||
  ReactSharedInteralsServer;

export type {CallServerCallback, EncodeFormActionCallback};

interface FlightStreamController {
  enqueueValue(value: any): void;
  enqueueModel(
    json: UninitializedModel | Object,
    status: 'resolved_model' | 'resolved_object',
  ): void;
  close(json: UninitializedModel): void;
  error(error: Error): void;
}

type UninitializedModel = string;

type ProfilingResult = {
  track: number,
  endTime: number,
  component: null | ReactComponentInfo,
};

const ROW_ID = 0;
const ROW_TAG = 1;
const ROW_LENGTH = 2;
const ROW_CHUNK_BY_NEWLINE = 3;
const ROW_CHUNK_BY_LENGTH = 4;

type RowParserState = 0 | 1 | 2 | 3 | 4;

const PENDING = 'pending';
const BLOCKED = 'blocked';
const RESOLVED_MODEL = 'resolved_model';
// Like RESOLVED_MODEL, but the value is the row's already parsed (not yet
// revived) model rather than its JSON text. Rows received in object form
// from an in-process render resolve to this state, so the two forms never
// have to be told apart by inspecting the value.
const RESOLVED_OBJECT = 'resolved_object';
const RESOLVED_MODULE = 'resolved_module';
const INITIALIZED = 'fulfilled';
const ERRORED = 'rejected';
const HALTED = 'halted'; // DEV-only. Means it never resolves even if connection closes.

const __PROTO__ = '__proto__';

type PendingChunk<T> = {
  status: 'pending',
  value: null | Array<InitializationReference | (T => mixed)>,
  reason: null | Array<InitializationReference | (mixed => mixed)>,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null | SomeChunk<ReactDebugInfoEntry>, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type BlockedChunk<T> = {
  status: 'blocked',
  value: null | Array<InitializationReference | (T => mixed)>,
  reason: null | Array<InitializationReference | (mixed => mixed)>,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type ResolvedModelChunk<T> = {
  status: 'resolved_model',
  value: UninitializedModel,
  reason: Response,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null | SomeChunk<ReactDebugInfoEntry>, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type ResolvedObjectChunk<T> = {
  status: 'resolved_object',
  value: Object,
  reason: Response,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null | SomeChunk<ReactDebugInfoEntry>, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type ResolvedModuleChunk<T> = {
  status: 'resolved_module',
  value: ClientReference<T>,
  reason: null,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type InitializedChunk<T> = {
  status: 'fulfilled',
  value: T,
  reason: null | FlightStreamController,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type InitializedStreamChunk<
  T: ReadableStream | $AsyncIterable<any, any, void>,
> = {
  status: 'fulfilled',
  value: T,
  reason: FlightStreamController,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (ReadableStream) => mixed, reject?: (mixed) => mixed): void,
};
type ErroredChunk<T> = {
  status: 'rejected',
  value: null,
  reason: mixed,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type HaltedChunk<T> = {
  status: 'halted',
  value: null,
  reason: null,
  _children: Array<SomeChunk<any>> | ProfilingResult, // Profiling-only
  _debugChunk: null, // DEV-only
  _debugInfo: ReactDebugInfo, // DEV-only
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type SomeChunk<T> =
  | PendingChunk<T>
  | BlockedChunk<T>
  | ResolvedModelChunk<T>
  | ResolvedObjectChunk<T>
  | ResolvedModuleChunk<T>
  | InitializedChunk<T>
  | ErroredChunk<T>
  | HaltedChunk<T>;

// $FlowFixMe[missing-this-annot]
function ReactPromise(status: any, value: any, reason: any) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    this._children = [];
  }
  if (__DEV__) {
    this._debugChunk = null;
    this._debugInfo = [];
  }
}
// We subclass Promise.prototype so that we get other methods like .catch
ReactPromise.prototype = Object.create(Promise.prototype) as any;
// TODO: This doesn't return a new Promise chain unlike the real .then
ReactPromise.prototype.then = function <T>(
  this: SomeChunk<T>,
  resolve: (value: T) => mixed,
  reject?: (reason: mixed) => mixed,
) {
  const chunk: SomeChunk<T> = this;
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODEL:
    case RESOLVED_OBJECT:
      initializeModelChunk(chunk);
      break;
    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  }
  if (__DEV__ && enableAsyncDebugInfo) {
    // Because only native Promises get picked up when we're awaiting we need to wrap
    // this in a native Promise in DEV. This means that these callbacks are no longer sync
    // but the lazy initialization is still sync and the .value can be inspected after,
    // allowing it to be read synchronously anyway.
    const resolveCallback = resolve;
    const rejectCallback = reject;
    const wrapperPromise: Promise<T> = new Promise((res, rej) => {
      resolve = value => {
        // $FlowFixMe[prop-missing]
        wrapperPromise._debugInfo = this._debugInfo;
        res(value);
      };
      reject = reason => {
        // $FlowFixMe[prop-missing]
        wrapperPromise._debugInfo = this._debugInfo;
        rej(reason);
      };
    });
    wrapperPromise.then(resolveCallback, rejectCallback);
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      if (typeof resolve === 'function') {
        resolve(chunk.value);
      }
      break;
    case PENDING:
    case BLOCKED:
      if (typeof resolve === 'function') {
        if (chunk.value === null) {
          chunk.value = [] as Array<InitializationReference | (T => mixed)>;
        }
        chunk.value.push(resolve);
      }
      if (typeof reject === 'function') {
        if (chunk.reason === null) {
          chunk.reason = [] as Array<
            InitializationReference | (mixed => mixed),
          >;
        }
        chunk.reason.push(reject);
      }
      break;
    case HALTED: {
      break;
    }
    default:
      if (typeof reject === 'function') {
        reject(chunk.reason);
      }
      break;
  }
};

export type FindSourceMapURLCallback = (
  fileName: string,
  environmentName: string,
) => null | string;

export type DebugChannelCallback = (message: string) => void;

export type DebugChannel = {
  hasReadable: boolean,
  callback: DebugChannelCallback | null,
};

type Response = {
  _bundlerConfig: ServerConsumerModuleMap,
  _serverReferenceConfig: null | ServerManifest,
  _moduleLoading: ModuleLoading,
  _callServer: CallServerCallback,
  _encodeFormAction: void | EncodeFormActionCallback,
  _nonce: ?string,
  // Only used when this response consumes an in-process render. Rows are
  // delivered inside the producing renderer's async scope, where the
  // consuming renderer (and its request storage) isn't reachable, so hint
  // and module-destination dispatches can't run at row-receipt time the way
  // they do for a byte stream, whose subscription callbacks inherit the
  // consumer's scope. Until the consumer's scope is captured (at its first
  // read), dispatches buffer here; afterwards they run through it.
  _deferredDispatches: null | Array<() => void>,
  _dispatchScope: null | ((dispatch: () => void) => void),
  _chunks: Map<number, SomeChunk<any>>,
  _stringDecoder: StringDecoder,
  _closed: boolean,
  _closedReason: mixed,
  _allowPartialStream: boolean,
  _tempRefs: void | TemporaryReferenceSet, // the set temporary references can be resolved from
  _timeOrigin: number, // Profiling-only
  _pendingInitialRender: null | TimeoutID, // Profiling-only,
  _pendingChunks: number, // DEV-only
  _weakResponse: WeakResponse, // DEV-only
  _debugRootOwner?: null | ReactComponentInfo, // DEV-only
  _debugRootStack?: null | Error, // DEV-only
  _debugRootTask?: null | ConsoleTask, // DEV-only
  _debugStartTime: number, // DEV-only
  _debugEndTime: null | number, // DEV-only
  _debugIOStarted: boolean, // DEV-only
  _debugFindSourceMapURL?: void | FindSourceMapURLCallback, // DEV-only
  _debugChannel?: void | DebugChannel, // DEV-only
  _blockedConsole?: null | SomeChunk<ConsoleEntry>, // DEV-only
  _replayConsole: boolean, // DEV-only
  _rootEnvironmentName: string, // DEV-only, the requested environment name.
};

// This indirection exists only to clean up DebugChannel when all Lazy References are GC:ed.
// Therefore we only use the indirection in DEV.
type WeakResponse = {
  weak: WeakRef<Response>,
  response: null | Response, // This is null when there are no pending chunks.
};

export type {WeakResponse as Response};

function hasGCedResponse(weakResponse: WeakResponse): boolean {
  return __DEV__ && weakResponse.weak.deref() === undefined;
}

function unwrapWeakResponse(weakResponse: WeakResponse): Response {
  if (__DEV__) {
    const response = weakResponse.weak.deref();
    if (response === undefined) {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error(
        'We did not expect to receive new data after GC:ing the response.',
      );
    }
    return response;
  } else {
    return weakResponse as any; // In prod we just use the real Response directly.
  }
}

function getWeakResponse(response: Response): WeakResponse {
  if (__DEV__) {
    return response._weakResponse;
  } else {
    return response as any; // In prod we just use the real Response directly.
  }
}

function closeDebugChannel(debugChannel: DebugChannel): void {
  if (debugChannel.callback) {
    debugChannel.callback('');
  }
}

// If FinalizationRegistry doesn't exist, we cannot use the debugChannel.
const debugChannelRegistry =
  __DEV__ && typeof FinalizationRegistry === 'function'
    ? new FinalizationRegistry(closeDebugChannel)
    : null;

function readChunk<T>(chunk: SomeChunk<T>): T {
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODEL:
    case RESOLVED_OBJECT:
      initializeModelChunk(chunk);
      break;
    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      return chunk.value;
    case PENDING:
    case BLOCKED:
    case HALTED:
      // eslint-disable-next-line no-throw-literal
      throw chunk as any as Thenable<T>;
    default:
      throw chunk.reason;
  }
}

export function getRoot<T>(weakResponse: WeakResponse): Thenable<T> {
  const response = unwrapWeakResponse(weakResponse);
  const chunk = getChunk(response, 0);
  return chunk as any;
}

function createPendingChunk<T>(response: Response): PendingChunk<T> {
  if (__DEV__) {
    // Retain a strong reference to the Response while we wait for the result.
    if (response._pendingChunks++ === 0) {
      response._weakResponse.response = response;
      if (response._pendingInitialRender !== null) {
        clearTimeout(response._pendingInitialRender);
        response._pendingInitialRender = null;
      }
    }
  }
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(PENDING, null, null);
}

function releasePendingChunk(response: Response, chunk: SomeChunk<any>): void {
  if (__DEV__ && chunk.status === PENDING) {
    if (--response._pendingChunks === 0) {
      // We're no longer waiting for any more chunks. We can release the strong reference
      // to the response. We'll regain it if we ask for any more data later on.
      response._weakResponse.response = null;
      // Wait a short period to see if any more chunks get asked for. E.g. by a React render.
      // These chunks might discover more pending chunks.
      // If we don't ask for more then we assume that those chunks weren't blocking initial
      // render and are excluded from the performance track.
      response._pendingInitialRender = setTimeout(
        flushInitialRenderPerformance.bind(null, response),
        100,
      );
    }
  }
}

function createBlockedChunk<T>(response: Response): BlockedChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(BLOCKED, null, null);
}

function createErrorChunk<T>(
  response: Response,
  error: mixed,
): ErroredChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, error);
}

function filterDebugInfo(
  response: Response,
  value: {_debugInfo: ReactDebugInfo, ...},
) {
  if (response._debugEndTime === null) {
    // No end time was defined, so we keep all debug info entries.
    return;
  }

  // Remove any debug info entries after the defined end time. For async info
  // that means we're including anything that was awaited before the end time,
  // but it doesn't need to be resolved before the end time.
  const relativeEndTime =
    response._debugEndTime -
    // $FlowFixMe[prop-missing]
    performance.timeOrigin;
  const debugInfo = [];
  for (let i = 0; i < value._debugInfo.length; i++) {
    const info = value._debugInfo[i];
    if (typeof info.time === 'number' && info.time > relativeEndTime) {
      break;
    }
    debugInfo.push(info);
  }
  value._debugInfo = debugInfo;
}

function pruneDebugInfoAfterError(
  response: Response,
  chunk: ErroredChunk<any>,
): void {
  if (response._debugEndTime === null) {
    return;
  }

  const relativeEndTime =
    response._debugEndTime -
    // $FlowFixMe[prop-missing]
    performance.timeOrigin;
  const debugInfo = chunk._debugInfo;
  for (let i = 0; i < debugInfo.length; i++) {
    const info = debugInfo[i];
    if (typeof info.time === 'number' && info.time > relativeEndTime) {
      // This array may already be attached to the Lazy suspended in Fizz.
      debugInfo.length = i;
      return;
    }
  }
}

function moveDebugInfoFromChunkToInnerValue<T>(
  chunk: InitializedChunk<T> | InitializedStreamChunk<any>,
  value: T,
): void {
  // Remove the debug info from the initialized chunk, and add it to the inner
  // value instead. This can be a React element, an array, or an uninitialized
  // Lazy.
  const resolvedValue = resolveLazy(value);
  if (
    typeof resolvedValue === 'object' &&
    resolvedValue !== null &&
    (isArray(resolvedValue) ||
      typeof resolvedValue[ASYNC_ITERATOR] === 'function' ||
      resolvedValue.$$typeof === REACT_ELEMENT_TYPE ||
      resolvedValue.$$typeof === REACT_LAZY_TYPE)
  ) {
    const debugInfo = chunk._debugInfo.splice(0);
    if (isArray(resolvedValue._debugInfo)) {
      // $FlowFixMe[method-unbinding]
      resolvedValue._debugInfo.unshift.apply(
        resolvedValue._debugInfo,
        debugInfo,
      );
    } else if (!Object.isFrozen(resolvedValue)) {
      Object.defineProperty(resolvedValue as any, '_debugInfo', {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugInfo,
      });
    }
    // TODO: If the resolved value is a frozen element (e.g. a client-created
    // element from a temporary reference, or a JSX element exported as a client
    // reference), server debug info is currently dropped because the element
    // can't be mutated. We should probably clone the element so each rendering
    // context gets its own mutable copy with the correct debug info.
  }
}

function processChunkDebugInfo<T>(
  response: Response,
  chunk: InitializedChunk<T> | InitializedStreamChunk<any>,
  value: T,
): void {
  filterDebugInfo(response, chunk);
  moveDebugInfoFromChunkToInnerValue(chunk, value);
}

function wakeChunk<T>(
  response: Response,
  listeners: Array<InitializationReference | (T => mixed)>,
  value: T,
  chunk: InitializedChunk<T>,
): void {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener === 'function') {
      listener(value);
    } else {
      fulfillReference(response, listener, value, chunk);
    }
  }

  if (__DEV__) {
    processChunkDebugInfo(response, chunk, value);
  }
}

function rejectChunk(
  response: Response,
  listeners: Array<InitializationReference | (mixed => mixed)>,
  error: mixed,
): void {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener === 'function') {
      listener(error);
    } else {
      rejectReference(response, listener.handler, error);
    }
  }
}

function resolveBlockedCycle<T>(
  resolvedChunk: SomeChunk<T>,
  reference: InitializationReference,
): null | InitializationHandler {
  const referencedChunk = reference.handler.chunk;
  if (referencedChunk === null) {
    return null;
  }
  if (referencedChunk === resolvedChunk) {
    // We found the cycle. We can resolve the blocked cycle now.
    return reference.handler;
  }
  const resolveListeners = referencedChunk.value;
  if (resolveListeners !== null) {
    for (let i = 0; i < resolveListeners.length; i++) {
      const listener = resolveListeners[i];
      if (typeof listener !== 'function') {
        const foundHandler = resolveBlockedCycle(resolvedChunk, listener);
        if (foundHandler !== null) {
          return foundHandler;
        }
      }
    }
  }
  return null;
}

function wakeChunkIfInitialized<T>(
  response: Response,
  chunk: SomeChunk<T>,
  resolveListeners: Array<InitializationReference | (T => mixed)>,
  rejectListeners: null | Array<InitializationReference | (mixed => mixed)>,
): void {
  switch (chunk.status) {
    case INITIALIZED:
      wakeChunk(response, resolveListeners, chunk.value, chunk);
      break;
    case BLOCKED:
      // It is possible that we're blocked on our own chunk if it's a cycle.
      // Before adding back the listeners to the chunk, let's check if it would
      // result in a cycle.
      for (let i = 0; i < resolveListeners.length; i++) {
        const listener = resolveListeners[i];
        if (typeof listener !== 'function') {
          const reference: InitializationReference = listener;
          const cyclicHandler = resolveBlockedCycle(chunk, reference);
          if (cyclicHandler !== null) {
            // This reference points back to this chunk. We can resolve the cycle by
            // using the value from that handler.
            fulfillReference(response, reference, cyclicHandler.value, chunk);
            resolveListeners.splice(i, 1);
            i--;
            if (rejectListeners !== null) {
              const rejectionIdx = rejectListeners.indexOf(reference);
              if (rejectionIdx !== -1) {
                rejectListeners.splice(rejectionIdx, 1);
              }
            }
            // The status might have changed after fulfilling the reference.
            switch ((chunk as SomeChunk<T>).status) {
              case INITIALIZED:
                const initializedChunk: InitializedChunk<T> = chunk as any;
                wakeChunk(
                  response,
                  resolveListeners,
                  initializedChunk.value,
                  initializedChunk,
                );
                return;
              case ERRORED:
                if (rejectListeners !== null) {
                  rejectChunk(response, rejectListeners, chunk.reason);
                }
                return;
            }
          }
        }
      }
    // Fallthrough
    case PENDING:
      if (chunk.value) {
        for (let i = 0; i < resolveListeners.length; i++) {
          chunk.value.push(resolveListeners[i]);
        }
      } else {
        chunk.value = resolveListeners;
      }

      if (chunk.reason) {
        if (rejectListeners) {
          for (let i = 0; i < rejectListeners.length; i++) {
            chunk.reason.push(rejectListeners[i]);
          }
        }
      } else {
        chunk.reason = rejectListeners;
      }

      break;
    case ERRORED:
      if (rejectListeners) {
        rejectChunk(response, rejectListeners, chunk.reason);
      }
      break;
  }
}

function triggerErrorOnChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  error: mixed,
): void {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    // $FlowFixMe[incompatible-type]: The error method should accept mixed.
    controller.error(error);
    return;
  }
  releasePendingChunk(response, chunk);
  const listeners = chunk.reason;

  if (__DEV__ && chunk.status === PENDING) {
    // Lazily initialize any debug info and block the initializing chunk on any unresolved entries.
    if (chunk._debugChunk != null) {
      const prevHandler = initializingHandler;
      const prevChunk = initializingChunk;
      initializingHandler = null;
      const cyclicChunk: BlockedChunk<T> = chunk as any;
      cyclicChunk.status = BLOCKED;
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      if ((enableProfilerTimer && enableComponentPerformanceTrack) || __DEV__) {
        initializingChunk = cyclicChunk;
      }
      try {
        initializeDebugChunk(response, chunk);
        if (initializingHandler !== null) {
          if (initializingHandler.errored) {
            // Ignore error parsing debug info, we'll report the original error instead.
          } else if (initializingHandler.deps > 0) {
            // TODO: Block the resolution of the error until all the debug info has loaded.
            // We currently don't have a way to throw an error after all dependencies have
            // loaded because we currently treat errors as immediately cancelling the handler.
          }
        }
      } finally {
        initializingHandler = prevHandler;
        initializingChunk = prevChunk;
      }
    }
  }

  const erroredChunk: ErroredChunk<T> = chunk as any;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;
  if (__DEV__) {
    pruneDebugInfoAfterError(response, erroredChunk);
  }
  if (listeners !== null) {
    rejectChunk(response, listeners, error);
  }
}

function createResolvedModelChunk<T>(
  response: Response,
  value: UninitializedModel,
): ResolvedModelChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, value, response);
}

function createResolvedObjectChunk<T>(
  response: Response,
  value: Object,
): ResolvedObjectChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_OBJECT, value, response);
}

function createResolvedModuleChunk<T>(
  response: Response,
  value: ClientReference<T>,
): ResolvedModuleChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODULE, value, null);
}

function createInitializedTextChunk(
  response: Response,
  value: string,
): InitializedChunk<string> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, null);
}

function createInitializedBufferChunk(
  response: Response,
  value: $ArrayBufferView | ArrayBuffer,
): InitializedChunk<Uint8Array> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, null);
}

function createInitializedIteratorResultChunk<T>(
  response: Response,
  value: T,
  done: boolean,
): InitializedChunk<IteratorResult<T, T>> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, {done: done, value: value}, null);
}

function createInitializedStreamChunk<
  T: ReadableStream | $AsyncIterable<any, any, void>,
>(
  response: Response,
  value: T,
  controller: FlightStreamController,
): InitializedChunk<T> {
  if (__DEV__) {
    // Retain a strong reference to the Response while we wait for chunks.
    if (response._pendingChunks++ === 0) {
      response._weakResponse.response = response;
    }
  }
  // We use the reason field to stash the controller since we already have that
  // field. It's a bit of a hack but efficient.
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, controller);
}

function wrapIteratorResultModel(
  value: UninitializedModel | Object,
  done: boolean,
  status: 'resolved_model' | 'resolved_object',
): UninitializedModel | Object {
  // To reuse as much code as possible we add the wrapper element as part of
  // the model. For JSON text we concatenate it into the JSON. For an already
  // parsed model we wrap it in an equivalent parsed object.
  if (status === RESOLVED_MODEL) {
    return (
      (done ? '{"done":true,"value":' : '{"done":false,"value":') +
      (value as any) +
      '}'
    );
  }
  return {done: done, value: value};
}

function createResolvedIteratorResultChunk<T>(
  response: Response,
  value: UninitializedModel | Object,
  done: boolean,
  status: 'resolved_model' | 'resolved_object',
): ResolvedModelChunk<IteratorResult<T, T>> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(
    status,
    wrapIteratorResultModel(value, done, status),
    response,
  );
}

function resolveIteratorResultChunk<T>(
  response: Response,
  chunk: SomeChunk<IteratorResult<T, T>>,
  value: UninitializedModel | Object,
  done: boolean,
  status: 'resolved_model' | 'resolved_object',
): void {
  resolveModelChunk(
    response,
    chunk,
    wrapIteratorResultModel(value, done, status),
    status,
  );
}

function resolveModelChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  value: UninitializedModel | Object,
  status: 'resolved_model' | 'resolved_object',
): void {
  if (chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    controller.enqueueModel(value, status);
    return;
  }
  releasePendingChunk(response, chunk);
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk = chunk as any;
  resolvedChunk.status = status;
  resolvedChunk.value = value;
  resolvedChunk.reason = response;
  if (resolveListeners !== null) {
    // This is unfortunate that we're reading this eagerly if
    // we already have listeners attached since they might no
    // longer be rendered or might not be the highest pri.
    initializeModelChunk(resolvedChunk);
    // The status might have changed after initialization.
    wakeChunkIfInitialized(response, chunk, resolveListeners, rejectListeners);
  }
}

function resolveModuleChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  value: ClientReference<T>,
): void {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // We already resolved. We didn't expect to see this.
    return;
  }
  releasePendingChunk(response, chunk);
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk: ResolvedModuleChunk<T> = chunk as any;
  resolvedChunk.status = RESOLVED_MODULE;
  resolvedChunk.value = value;
  resolvedChunk.reason = null;
  if (__DEV__) {
    const debugInfo = getModuleDebugInfo(value);
    if (debugInfo !== null) {
      // Add to the live set if it was already initialized.
      // $FlowFixMe[method-unbinding]
      resolvedChunk._debugInfo.push.apply(resolvedChunk._debugInfo, debugInfo);
    }
  }
  if (resolveListeners !== null) {
    initializeModuleChunk(resolvedChunk);
    wakeChunkIfInitialized(response, chunk, resolveListeners, rejectListeners);
  }
}

type InitializationReference = {
  handler: InitializationHandler,
  parentObject: Object,
  key: string,
  map: (
    response: Response,
    model: any,
    parentObject: Object,
    key: string,
  ) => any,
  path: Array<string>,
  isDebug?: boolean, // DEV-only
};
type InitializationHandler = {
  parent: null | InitializationHandler,
  chunk: null | BlockedChunk<any>,
  value: any,
  reason: any,
  deps: number,
  errored: boolean,
};
let initializingHandler: null | InitializationHandler = null;
let initializingChunk: null | BlockedChunk<any> = null;
let isInitializingDebugInfo: boolean = false;

function initializeDebugChunk(
  response: Response,
  chunk: ResolvedModelChunk<any> | ResolvedObjectChunk<any> | PendingChunk<any>,
): void {
  const debugChunk = chunk._debugChunk;
  if (debugChunk !== null) {
    const debugInfo = chunk._debugInfo;
    const prevIsInitializingDebugInfo = isInitializingDebugInfo;
    isInitializingDebugInfo = true;
    try {
      if (debugChunk.status === RESOLVED_MODEL) {
        // Find the index of this debug info by walking the linked list.
        let idx = debugInfo.length;
        let c = debugChunk._debugChunk;
        while (c !== null) {
          if (c.status !== INITIALIZED) {
            idx++;
          }
          c = c._debugChunk;
        }
        // Initializing the model for the first time.
        initializeModelChunk(debugChunk);
        const initializedChunk = debugChunk as any as SomeChunk<any>;
        switch (initializedChunk.status) {
          case INITIALIZED: {
            debugInfo[idx] = initializeDebugInfo(
              response,
              initializedChunk.value,
            );
            break;
          }
          case BLOCKED:
          case PENDING: {
            waitForReference(
              initializedChunk,
              debugInfo,
              '' + idx,
              response,
              initializeDebugInfo,
              [''], // path
              true,
            );
            break;
          }
          default:
            throw initializedChunk.reason;
        }
      } else {
        switch (debugChunk.status) {
          case INITIALIZED: {
            // Already done.
            break;
          }
          case BLOCKED:
          case PENDING: {
            // Signal to the caller that we need to wait.
            waitForReference(
              debugChunk,
              {}, // noop, since we'll have already added an entry to debug info
              'debug', // noop, but we need it to not be empty string since that indicates the root object
              response,
              initializeDebugInfo,
              [''], // path
              true,
            );
            break;
          }
          default:
            throw debugChunk.reason;
        }
      }
    } catch (error) {
      triggerErrorOnChunk(response, chunk, error);
    } finally {
      isInitializingDebugInfo = prevIsInitializingDebugInfo;
    }
  }
}

function initializeModelChunk<T>(
  chunk: ResolvedModelChunk<T> | ResolvedObjectChunk<T>,
): void {
  const prevHandler = initializingHandler;
  const prevChunk = initializingChunk;
  initializingHandler = null;

  const isObjectForm = chunk.status === RESOLVED_OBJECT;
  const resolvedModel = chunk.value;
  const response = chunk.reason;

  // We go to the BLOCKED state until we've fully resolved this.
  // We do this before parsing in case we try to initialize the same chunk
  // while parsing the model. Such as in a cyclic reference.
  const cyclicChunk: BlockedChunk<T> = chunk as any;
  cyclicChunk.status = BLOCKED;
  cyclicChunk.value = null;
  cyclicChunk.reason = null;

  if ((enableProfilerTimer && enableComponentPerformanceTrack) || __DEV__) {
    initializingChunk = cyclicChunk;
  }

  if (__DEV__) {
    // Initialize any debug info and block the initializing chunk on any
    // unresolved entries.
    initializeDebugChunk(response, chunk);
    // TODO: The chunk might have transitioned to ERRORED now.
    // Should we return early if that happens?
  }

  try {
    const value: T = isObjectForm
      ? // The row arrived in object form from an in-process render: already
        // parsed, not yet revived. See parseModel for the wrapper object.
        reviveModel(response, resolvedModel as any, {'': resolvedModel}, '')
      : parseModel(response, resolvedModel as any);
    // Invoke any listeners added while resolving this model. I.e. cyclic
    // references. This may or may not fully resolve the model depending on
    // if they were blocked.
    const resolveListeners = cyclicChunk.value;
    if (resolveListeners !== null) {
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      for (let i = 0; i < resolveListeners.length; i++) {
        const listener = resolveListeners[i];
        if (typeof listener === 'function') {
          listener(value);
        } else {
          fulfillReference(response, listener, value, cyclicChunk);
        }
      }
    }
    if (initializingHandler !== null) {
      if (initializingHandler.errored) {
        throw initializingHandler.reason;
      }
      if (initializingHandler.deps > 0) {
        // We discovered new dependencies on modules that are not yet resolved.
        // We have to keep the BLOCKED state until they're resolved.
        initializingHandler.value = value;
        initializingHandler.chunk = cyclicChunk;
        return;
      }
    }
    const initializedChunk: InitializedChunk<T> = chunk as any;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = value;
    initializedChunk.reason = null;

    if (__DEV__) {
      processChunkDebugInfo(response, initializedChunk, value);
    }
  } catch (error) {
    const erroredChunk: ErroredChunk<T> = chunk as any;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  } finally {
    initializingHandler = prevHandler;
    if ((enableProfilerTimer && enableComponentPerformanceTrack) || __DEV__) {
      initializingChunk = prevChunk;
    }
  }
}

function initializeModuleChunk<T>(chunk: ResolvedModuleChunk<T>): void {
  try {
    const value: T = requireModule(chunk.value);
    const initializedChunk: InitializedChunk<T> = chunk as any;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = value;
    initializedChunk.reason = null;
  } catch (error) {
    const erroredChunk: ErroredChunk<T> = chunk as any;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  }
}

// Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.
export function reportGlobalError(
  weakResponse: WeakResponse,
  error: Error,
): void {
  if (hasGCedResponse(weakResponse)) {
    // Ignore close signal if we are not awaiting any more pending chunks.
    return;
  }
  const response = unwrapWeakResponse(weakResponse);
  response._closed = true;
  response._closedReason = error;
  response._chunks.forEach(chunk => {
    // If this chunk was already resolved or errored, it won't
    // trigger an error but if it wasn't then we need to
    // because we won't be getting any new data to resolve it.
    if (chunk.status === PENDING) {
      triggerErrorOnChunk(response, chunk, error);
    } else if (chunk.status === INITIALIZED && chunk.reason !== null) {
      chunk.reason.error(error);
    }
  });
  if (__DEV__) {
    const debugChannel = response._debugChannel;
    if (debugChannel !== undefined) {
      // If we don't have any more ways of reading data, we don't have to send
      // any more neither. So we close the writable side.
      closeDebugChannel(debugChannel);
      response._debugChannel = undefined;
      // Make sure the debug channel is not closed a second time when the
      // Response gets GC:ed.
      if (debugChannelRegistry !== null) {
        debugChannelRegistry.unregister(response);
      }
    }
  }
}

function nullRefGetter() {
  if (__DEV__) {
    return null;
  }
}

function getIOInfoTaskName(ioInfo: ReactIOInfo): string {
  return ioInfo.name || 'unknown';
}

function getAsyncInfoTaskName(asyncInfo: ReactAsyncInfo): string {
  return 'await ' + getIOInfoTaskName(asyncInfo.awaited);
}

function getServerComponentTaskName(componentInfo: ReactComponentInfo): string {
  return '<' + (componentInfo.name || '...') + '>';
}

function getTaskName(type: mixed): string {
  if (type === REACT_FRAGMENT_TYPE) {
    return '<>';
  }
  if (typeof type === 'function') {
    // This is a function so it must have been a Client Reference that resolved to
    // a function. We use "use client" to indicate that this is the boundary into
    // the client. There should only be one for any given owner chain.
    return '"use client"';
  }
  if (
    typeof type === 'object' &&
    type !== null &&
    type.$$typeof === REACT_LAZY_TYPE
  ) {
    if (type._init === readChunk) {
      // This is a lazy node created by Flight. It is probably a client reference.
      // We use the "use client" string to indicate that this is the boundary into
      // the client. There will only be one for any given owner chain.
      return '"use client"';
    }
    // We don't want to eagerly initialize the initializer in DEV mode so we can't
    // call it to extract the type so we don't know the type of this component.
    return '<...>';
  }
  try {
    const name = getComponentNameFromType(type);
    return name ? '<' + name + '>' : '<...>';
  } catch (x) {
    return '<...>';
  }
}

function initializeElement(
  response: Response,
  element: any,
  lazyNode: null | LazyComponent<
    React$Element<any>,
    SomeChunk<React$Element<any>>,
  >,
): void {
  if (!__DEV__) {
    return;
  }
  const stack = element._debugStack;
  const owner = element._owner;
  if (owner === null) {
    element._owner = response._debugRootOwner;
  }
  let env = response._rootEnvironmentName;
  if (owner !== null && owner.env != null) {
    // Interestingly we don't actually have the environment name of where
    // this JSX was created if it doesn't have an owner but if it does
    // it must be the same environment as the owner. We could send it separately
    // but it seems a bit unnecessary for this edge case.
    env = owner.env;
  }
  let normalizedStackTrace: null | Error = null;
  if (owner === null && response._debugRootStack != null) {
    // We override the stack if we override the owner since the stack where the root JSX
    // was created on the server isn't very useful but where the request was made is.
    normalizedStackTrace = response._debugRootStack;
  } else if (stack !== null) {
    // We create a fake stack and then create an Error object inside of it.
    // This means that the stack trace is now normalized into the native format
    // of the browser and the stack frames will have been registered with
    // source mapping information.
    // This can unfortunately happen within a user space callstack which will
    // remain on the stack.
    normalizedStackTrace = createFakeJSXCallStackInDEV(response, stack, env);
  }
  element._debugStack = normalizedStackTrace;
  let task: null | ConsoleTask = null;
  if (supportsCreateTask && stack !== null) {
    const createTaskFn = (console as any).createTask.bind(
      console,
      getTaskName(element.type),
    );
    const callStack = buildFakeCallStack(
      response,
      stack,
      env,
      false,
      createTaskFn,
    );
    // This owner should ideally have already been initialized to avoid getting
    // user stack frames on the stack.
    const ownerTask =
      owner === null ? null : initializeFakeTask(response, owner);
    if (ownerTask === null) {
      const rootTask = response._debugRootTask;
      if (rootTask != null) {
        task = rootTask.run(callStack);
      } else {
        task = callStack();
      }
    } else {
      task = ownerTask.run(callStack);
    }
  }
  element._debugTask = task;

  // This owner should ideally have already been initialized to avoid getting
  // user stack frames on the stack.
  if (owner !== null) {
    initializeFakeStack(response, owner);
  }

  if (lazyNode !== null) {
    // In case the JSX runtime has validated the lazy type as a static child, we
    // need to transfer this information to the element.
    if (
      lazyNode._store &&
      lazyNode._store.validated &&
      !element._store.validated
    ) {
      element._store.validated = lazyNode._store.validated;
    }

    // If the lazy node is initialized, we move its debug info to the inner
    // value.
    if (lazyNode._payload.status === INITIALIZED && lazyNode._debugInfo) {
      const debugInfo = lazyNode._debugInfo.splice(0);
      if (element._debugInfo) {
        // $FlowFixMe[method-unbinding]
        element._debugInfo.unshift.apply(element._debugInfo, debugInfo);
      } else {
        Object.defineProperty(element, '_debugInfo', {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugInfo,
        });
      }
    }
  }

  // TODO: We should be freezing the element but currently, we might write into
  // _debugInfo later. We could move it into _store which remains mutable.
  Object.freeze(element.props);
}

function createElement(
  response: Response,
  type: mixed,
  key: mixed,
  props: mixed,
  owner: ?ReactComponentInfo, // DEV-only
  stack: ?ReactStackTrace, // DEV-only
  validated: 0 | 1 | 2, // DEV-only
):
  | React$Element<any>
  | LazyComponent<React$Element<any>, SomeChunk<React$Element<any>>> {
  let element: any;
  if (__DEV__) {
    // `ref` is non-enumerable in dev
    element = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      props,
      _owner: owner === undefined ? null : owner,
    } as any;
    Object.defineProperty(element, 'ref', {
      enumerable: false,
      get: nullRefGetter,
    });
  } else {
    element = {
      // This tag allows us to uniquely identify this as a React Element
      $$typeof: REACT_ELEMENT_TYPE,

      type,
      key,
      ref: null,
      props,
    } as any;
  }

  if (__DEV__) {
    // We don't really need to add any of these but keeping them for good measure.
    // Unfortunately, _store is enumerable in jest matchers so for equality to
    // work, I need to keep it or make _store non-enumerable in the other file.
    element._store = {} as {
      validated?: number,
    };
    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: validated, // Whether the element has already been validated on the server.
    });
    // debugInfo contains Server Component debug information.
    Object.defineProperty(element, '_debugInfo', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null,
    });
    Object.defineProperty(element, '_debugStack', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: stack === undefined ? null : stack,
    });
    Object.defineProperty(element, '_debugTask', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null,
    });
  }

  if (initializingHandler !== null) {
    const handler = initializingHandler;
    // We pop the stack to the previous outer handler before leaving the Element.
    // This is effectively the complete phase.
    initializingHandler = handler.parent;
    if (handler.errored) {
      // Something errored inside this Element's props. We can turn this Element
      // into a Lazy so that we can still render up until that Lazy is rendered.
      const erroredChunk: ErroredChunk<React$Element<any>> = createErrorChunk(
        response,
        handler.reason,
      );
      if (__DEV__) {
        initializeElement(response, element, null);
        // Conceptually the error happened inside this Element but right before
        // it was rendered. We don't have a client side component to render but
        // we can add some DebugInfo to explain that this was conceptually a
        // Server side error that errored inside this element. That way any stack
        // traces will point to the nearest JSX that errored - e.g. during
        // serialization.
        const erroredComponent: ReactComponentInfo = {
          name: getComponentNameFromType(element.type) || '',
          owner: element._owner,
        };
        // $FlowFixMe[cannot-write]
        erroredComponent.debugStack = element._debugStack;
        if (supportsCreateTask) {
          // $FlowFixMe[cannot-write]
          erroredComponent.debugTask = element._debugTask;
        }
        erroredChunk._debugInfo = [erroredComponent];
      }
      return createLazyChunkWrapper(erroredChunk, validated);
    }
    if (handler.deps > 0) {
      // We have blocked references inside this Element but we can turn this into
      // a Lazy node referencing this Element to let everything around it proceed.
      const blockedChunk: BlockedChunk<React$Element<any>> =
        createBlockedChunk(response);
      handler.value = element;
      handler.chunk = blockedChunk;
      const lazyNode = createLazyChunkWrapper(blockedChunk, validated);
      if (__DEV__) {
        // After we have initialized any blocked references, initialize stack etc.
        const init = initializeElement.bind(null, response, element, lazyNode);
        blockedChunk.then(init, init);
      }
      return lazyNode;
    }
  }
  if (__DEV__) {
    initializeElement(response, element, null);
  }

  return element;
}

function createLazyChunkWrapper<T>(
  chunk: SomeChunk<T>,
  validated: 0 | 1 | 2, // DEV-only
): LazyComponent<T, SomeChunk<T>> {
  const lazyType: LazyComponent<T, SomeChunk<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: chunk,
    _init: readChunk,
  };
  if (__DEV__) {
    // Forward the live array
    lazyType._debugInfo = chunk._debugInfo;
    // Initialize a store for key validation by the JSX runtime.
    lazyType._store = {validated: validated};
  }
  return lazyType;
}

type PackedChunkItemReference<T> = {
  _chunk: SomeChunk<Array<T>>,
  _index: number,
};

function readPackedChunkItem<T>(reference: PackedChunkItemReference<T>): T {
  const items = readChunk(reference._chunk);
  return items[reference._index];
}

function createLazyPackedItemWrapper<T>(
  chunk: SomeChunk<Array<T>>,
  index: number,
): LazyComponent<T, PackedChunkItemReference<T>> {
  // The parent row initializes immediately and each item suspends at its
  // slot until the packed row arrives.
  const lazyType: LazyComponent<T, PackedChunkItemReference<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: {_chunk: chunk, _index: index},
    _init: readPackedChunkItem,
  };
  if (__DEV__) {
    // Forward the live array of the whole packed row. Per-item attribution
    // would require per-item debug info rows, which packing avoids.
    lazyType._debugInfo = chunk._debugInfo;
    // Initialize a store for key validation by the JSX runtime.
    lazyType._store = {validated: 0};
  }
  return lazyType;
}

function getChunk(response: Response, id: number): SomeChunk<any> {
  const chunks = response._chunks;
  let chunk = chunks.get(id);
  if (!chunk) {
    if (response._closed) {
      if (response._allowPartialStream) {
        // For partial streams, chunks accessed after close should be HALTED
        // (never resolve).
        chunk = createPendingChunk(response);
        const haltedChunk: HaltedChunk<any> = chunk as any;
        haltedChunk.status = HALTED;
        haltedChunk.value = null;
        haltedChunk.reason = null;
      } else {
        // We have already errored the response and we're not going to get
        // anything more streaming in so this will immediately error.
        chunk = createErrorChunk(response, response._closedReason);
      }
    } else {
      chunk = createPendingChunk(response);
    }
    chunks.set(id, chunk);
  }
  return chunk;
}

function fulfillReference(
  response: Response,
  reference: InitializationReference,
  value: any,
  fulfilledChunk: SomeChunk<any>,
): void {
  const {handler, parentObject, key, map, path} = reference;

  try {
    for (let i = 1; i < path.length; i++) {
      while (
        typeof value === 'object' &&
        value !== null &&
        value.$$typeof === REACT_LAZY_TYPE
      ) {
        // We never expect to see a Lazy node on this path because we encode those as
        // separate models. This must mean that we have inserted an extra lazy node
        // e.g. to replace a blocked element. We must instead look for it inside.
        const referencedChunk: SomeChunk<any> = value._payload;
        if (referencedChunk === handler.chunk) {
          // This is a reference to the thing we're currently blocking. We can peak
          // inside of it to get the value.
          value = handler.value;
          continue;
        } else {
          switch (referencedChunk.status) {
            case RESOLVED_MODEL:
            case RESOLVED_OBJECT:
              initializeModelChunk(referencedChunk);
              break;
            case RESOLVED_MODULE:
              initializeModuleChunk(referencedChunk);
              break;
          }
          switch (referencedChunk.status) {
            case INITIALIZED: {
              value = referencedChunk.value;
              continue;
            }
            case BLOCKED: {
              // It is possible that we're blocked on our own chunk if it's a cycle.
              // Before adding the listener to the inner chunk, let's check if it would
              // result in a cycle.
              const cyclicHandler = resolveBlockedCycle(
                referencedChunk,
                reference,
              );
              if (cyclicHandler !== null) {
                // This reference points back to this chunk. We can resolve the cycle by
                // using the value from that handler.
                value = cyclicHandler.value;
                continue;
              }
              // Fallthrough
            }
            case PENDING: {
              // If we're not yet initialized we need to skip what we've already drilled
              // through and then wait for the next value to become available.
              path.splice(0, i - 1);
              // Add "listener" to our new chunk dependency.
              if (referencedChunk.value === null) {
                referencedChunk.value = [reference];
              } else {
                referencedChunk.value.push(reference);
              }
              if (referencedChunk.reason === null) {
                referencedChunk.reason = [reference];
              } else {
                referencedChunk.reason.push(reference);
              }
              return;
            }
            case HALTED: {
              // Do nothing. We couldn't fulfill.
              // TODO: Mark downstreams as halted too.
              return;
            }
            default: {
              rejectReference(
                response,
                reference.handler,
                referencedChunk.reason,
              );
              return;
            }
          }
        }
      }
      const name = path[i];
      if (
        typeof value === 'object' &&
        value !== null &&
        hasOwnProperty.call(value, name)
      ) {
        value = value[name];
      } else {
        throw new Error('Invalid reference.');
      }
    }

    while (
      typeof value === 'object' &&
      value !== null &&
      value.$$typeof === REACT_LAZY_TYPE
    ) {
      // If what we're referencing is a Lazy it must be because we inserted one as a virtual node
      // while it was blocked by other data. If it's no longer blocked, we can unwrap it.
      const referencedChunk: SomeChunk<any> = value._payload;
      if (referencedChunk === handler.chunk) {
        // This is a reference to the thing we're currently blocking. We can peak
        // inside of it to get the value.
        value = handler.value;
        continue;
      } else {
        switch (referencedChunk.status) {
          case RESOLVED_MODEL:
          case RESOLVED_OBJECT:
            initializeModelChunk(referencedChunk);
            break;
          case RESOLVED_MODULE:
            initializeModuleChunk(referencedChunk);
            break;
        }
        switch (referencedChunk.status) {
          case INITIALIZED: {
            value = referencedChunk.value;
            continue;
          }
        }
      }
      break;
    }

    const mappedValue = map(response, value, parentObject, key);
    if (key !== __PROTO__) {
      parentObject[key] = mappedValue;
    }

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (key === '' && handler.value === null) {
      handler.value = mappedValue;
    }

    // If the parent object is an unparsed React element tuple, we also need to
    // update the props and owner of the parsed element object (i.e.
    // handler.value).
    if (
      parentObject[0] === REACT_ELEMENT_TYPE &&
      typeof handler.value === 'object' &&
      handler.value !== null &&
      handler.value.$$typeof === REACT_ELEMENT_TYPE
    ) {
      const element: any = handler.value;
      switch (key) {
        case '3':
          if (__DEV__) {
            transferReferencedDebugInfo(handler.chunk, fulfilledChunk);
          }
          element.props = mappedValue;
          break;
        case '4':
          // This path doesn't call transferReferencedDebugInfo because this reference is to a debug chunk.
          if (__DEV__) {
            element._owner = mappedValue;
          }
          break;
        case '5':
          // This path doesn't call transferReferencedDebugInfo because this reference is to a debug chunk.
          if (__DEV__) {
            element._debugStack = mappedValue;
          }
          break;
        default:
          if (__DEV__) {
            transferReferencedDebugInfo(handler.chunk, fulfilledChunk);
          }
          break;
      }
    } else if (__DEV__ && !reference.isDebug) {
      transferReferencedDebugInfo(handler.chunk, fulfilledChunk);
    }
  } catch (error) {
    rejectReference(response, reference.handler, error);
    return;
  }

  handler.deps--;

  if (handler.deps === 0) {
    const chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    const resolveListeners = chunk.value;
    const initializedChunk: InitializedChunk<any> = chunk as any;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = handler.value;
    initializedChunk.reason = handler.reason; // Used by streaming chunks
    if (resolveListeners !== null) {
      wakeChunk(response, resolveListeners, handler.value, initializedChunk);
    } else {
      if (__DEV__) {
        processChunkDebugInfo(response, initializedChunk, handler.value);
      }
    }
  }
}

function rejectReference(
  response: Response,
  handler: InitializationHandler,
  error: mixed,
): void {
  if (handler.errored) {
    // We've already errored. We could instead build up an AggregateError
    // but if there are multiple errors we just take the first one like
    // Promise.all.
    return;
  }
  const blockedValue = handler.value;
  handler.errored = true;
  handler.value = null;
  handler.reason = error;
  const chunk = handler.chunk;
  if (chunk === null || chunk.status !== BLOCKED) {
    return;
  }

  if (__DEV__) {
    if (
      typeof blockedValue === 'object' &&
      blockedValue !== null &&
      blockedValue.$$typeof === REACT_ELEMENT_TYPE
    ) {
      const element = blockedValue;
      // Conceptually the error happened inside this Element but right before
      // it was rendered. We don't have a client side component to render but
      // we can add some DebugInfo to explain that this was conceptually a
      // Server side error that errored inside this element. That way any stack
      // traces will point to the nearest JSX that errored - e.g. during
      // serialization.
      const erroredComponent: ReactComponentInfo = {
        name: getComponentNameFromType(element.type) || '',
        owner: element._owner,
      };
      // $FlowFixMe[cannot-write]
      erroredComponent.debugStack = element._debugStack;
      if (supportsCreateTask) {
        // $FlowFixMe[cannot-write]
        erroredComponent.debugTask = element._debugTask;
      }
      chunk._debugInfo.push(erroredComponent);
    }
  }

  triggerErrorOnChunk(response, chunk, error);
}

function waitForReference<T>(
  referencedChunk: PendingChunk<T> | BlockedChunk<T>,
  parentObject: Object,
  key: string,
  response: Response,
  map: (response: Response, model: any, parentObject: Object, key: string) => T,
  path: Array<string>,
  isAwaitingDebugInfo: boolean, // DEV-only
): T {
  if (
    __DEV__ &&
    (response._debugChannel === undefined ||
      !response._debugChannel.hasReadable)
  ) {
    if (
      referencedChunk.status === PENDING &&
      parentObject[0] === REACT_ELEMENT_TYPE &&
      (key === '4' || key === '5')
    ) {
      // If the parent object is an unparsed React element tuple, and this is a reference
      // to the owner or debug stack. Then we expect the chunk to have been emitted earlier
      // in the stream. It might be blocked on other things but chunk should no longer be pending.
      // If it's still pending that suggests that it was referencing an object in the debug
      // channel, but no debug channel was wired up so it's missing. In this case we can just
      // drop the debug info instead of halting the whole stream.
      return null as any;
    }
  }

  let handler: InitializationHandler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      parent: null,
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false,
    };
  }

  const reference: InitializationReference = {
    handler,
    parentObject,
    key,
    map,
    path,
  };
  if (__DEV__) {
    reference.isDebug = isAwaitingDebugInfo;
  }

  // Add "listener".
  if (referencedChunk.value === null) {
    referencedChunk.value = [reference];
  } else {
    referencedChunk.value.push(reference);
  }
  if (referencedChunk.reason === null) {
    referencedChunk.reason = [reference];
  } else {
    referencedChunk.reason.push(reference);
  }

  // Return a place holder value for now.
  return null as any;
}

function loadServerReference<A: Iterable<any>, T>(
  response: Response,
  metaData: {
    id: any,
    bound: null | Thenable<Array<any>>,
    name?: string, // DEV-only
    env?: string, // DEV-only
    location?: ReactFunctionLocation, // DEV-only
  },
  parentObject: Object,
  key: string,
): (...A) => Promise<T> {
  if (!response._serverReferenceConfig) {
    // In the normal case, we can't load this Server Reference in the current environment and
    // we just return a proxy to it.
    return createBoundServerReference(
      metaData,
      response._callServer,
      response._encodeFormAction,
      __DEV__ ? response._debugFindSourceMapURL : undefined,
    );
  }
  // If we have a module mapping we can load the real version of this Server Reference.
  const serverReference: ClientReference<T> =
    resolveServerReference<$FlowFixMe>(
      response._serverReferenceConfig,
      metaData.id,
    );

  let promise: null | Thenable<any> = preloadModule(serverReference);
  if (!promise) {
    if (!metaData.bound) {
      const resolvedValue = requireModule(serverReference) as any;
      registerBoundServerReference(
        resolvedValue,
        metaData.id,
        metaData.bound,
        response._encodeFormAction,
      );
      return resolvedValue;
    } else {
      promise = Promise.resolve(metaData.bound);
    }
  } else if (metaData.bound) {
    promise = Promise.all([promise, metaData.bound]);
  }

  let handler: InitializationHandler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      parent: null,
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false,
    };
  }

  function fulfill(): void {
    let resolvedValue = requireModule(serverReference) as any;

    if (metaData.bound) {
      // This promise is coming from us and should have initilialized by now.
      const boundArgs: Array<any> = (metaData.bound as any).value.slice(0);
      boundArgs.unshift(null); // this
      resolvedValue = resolvedValue.bind.apply(resolvedValue, boundArgs);
    }

    registerBoundServerReference(
      resolvedValue,
      metaData.id,
      metaData.bound,
      response._encodeFormAction,
    );

    if (key !== __PROTO__) {
      parentObject[key] = resolvedValue;
    }

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (key === '' && handler.value === null) {
      handler.value = resolvedValue;
    }

    // If the parent object is an unparsed React element tuple, we also need to
    // update the props and owner of the parsed element object (i.e.
    // handler.value).
    if (
      parentObject[0] === REACT_ELEMENT_TYPE &&
      typeof handler.value === 'object' &&
      handler.value !== null &&
      handler.value.$$typeof === REACT_ELEMENT_TYPE
    ) {
      const element: any = handler.value;
      switch (key) {
        case '3':
          element.props = resolvedValue;
          break;
        case '4':
          if (__DEV__) {
            element._owner = resolvedValue;
          }
          break;
      }
    }

    handler.deps--;

    if (handler.deps === 0) {
      const chunk = handler.chunk;
      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }
      const resolveListeners = chunk.value;
      const initializedChunk: InitializedChunk<T> = chunk as any;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = handler.value;
      initializedChunk.reason = null;
      if (resolveListeners !== null) {
        wakeChunk(response, resolveListeners, handler.value, initializedChunk);
      } else {
        if (__DEV__) {
          processChunkDebugInfo(response, initializedChunk, handler.value);
        }
      }
    }
  }

  function reject(error: mixed): void {
    if (handler.errored) {
      // We've already errored. We could instead build up an AggregateError
      // but if there are multiple errors we just take the first one like
      // Promise.all.
      return;
    }
    const blockedValue = handler.value;
    handler.errored = true;
    handler.value = null;
    handler.reason = error;
    const chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }

    if (__DEV__) {
      if (
        typeof blockedValue === 'object' &&
        blockedValue !== null &&
        blockedValue.$$typeof === REACT_ELEMENT_TYPE
      ) {
        const element = blockedValue;
        // Conceptually the error happened inside this Element but right before
        // it was rendered. We don't have a client side component to render but
        // we can add some DebugInfo to explain that this was conceptually a
        // Server side error that errored inside this element. That way any stack
        // traces will point to the nearest JSX that errored - e.g. during
        // serialization.
        const erroredComponent: ReactComponentInfo = {
          name: getComponentNameFromType(element.type) || '',
          owner: element._owner,
        };
        // $FlowFixMe[cannot-write]
        erroredComponent.debugStack = element._debugStack;
        if (supportsCreateTask) {
          // $FlowFixMe[cannot-write]
          erroredComponent.debugTask = element._debugTask;
        }
        chunk._debugInfo.push(erroredComponent);
      }
    }

    triggerErrorOnChunk(response, chunk, error);
  }

  promise.then(fulfill, reject);

  // Return a place holder value for now.
  return null as any;
}

function resolveLazy(value: any): mixed {
  while (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof === REACT_LAZY_TYPE
  ) {
    const payload: SomeChunk<any> = value._payload;
    if (payload.status === INITIALIZED) {
      value = payload.value;
      continue;
    }
    break;
  }

  return value;
}

function transferReferencedDebugInfo(
  parentChunk: null | SomeChunk<any>,
  referencedChunk: SomeChunk<any>,
): void {
  if (__DEV__) {
    // We add the debug info to the initializing chunk since the resolution of
    // that promise is also blocked by the referenced debug info. By adding it
    // to both we can track it even if the array/element/lazy is extracted, or
    // if the root is rendered as is.
    if (parentChunk !== null) {
      const referencedDebugInfo = referencedChunk._debugInfo;
      const parentDebugInfo = parentChunk._debugInfo;
      for (let i = 0; i < referencedDebugInfo.length; ++i) {
        const debugInfoEntry = referencedDebugInfo[i];
        if (debugInfoEntry.name != null) {
          debugInfoEntry as ReactComponentInfo;
          // We're not transferring Component info since we use Component info
          // in Debug info to fill in gaps between Fibers for the parent stack.
        } else {
          parentDebugInfo.push(debugInfoEntry);
        }
      }
    }
  }
}

function getOutlinedModel<T>(
  response: Response,
  reference: string,
  parentObject: Object,
  key: string,
  map: (response: Response, model: any, parentObject: Object, key: string) => T,
): T {
  const path = reference.split(':');
  const id = parseInt(path[0], 16);
  const chunk = getChunk(response, id);
  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    if (initializingChunk !== null && isArray(initializingChunk._children)) {
      initializingChunk._children.push(chunk);
    }
  }
  switch (chunk.status) {
    case RESOLVED_MODEL:
    case RESOLVED_OBJECT:
      initializeModelChunk(chunk);
      break;
    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      let value = chunk.value;
      for (let i = 1; i < path.length; i++) {
        while (
          typeof value === 'object' &&
          value !== null &&
          value.$$typeof === REACT_LAZY_TYPE
        ) {
          const referencedChunk: SomeChunk<any> = value._payload;
          switch (referencedChunk.status) {
            case RESOLVED_MODEL:
            case RESOLVED_OBJECT:
              initializeModelChunk(referencedChunk);
              break;
            case RESOLVED_MODULE:
              initializeModuleChunk(referencedChunk);
              break;
          }
          switch (referencedChunk.status) {
            case INITIALIZED: {
              value = referencedChunk.value;
              break;
            }
            case BLOCKED:
            case PENDING: {
              return waitForReference(
                referencedChunk,
                parentObject,
                key,
                response,
                map,
                path.slice(i - 1),
                isInitializingDebugInfo,
              );
            }
            case HALTED: {
              // Add a dependency that will never resolve.
              // TODO: Mark downstreams as halted too.
              let handler: InitializationHandler;
              if (initializingHandler) {
                handler = initializingHandler;
                handler.deps++;
              } else {
                handler = initializingHandler = {
                  parent: null,
                  chunk: null,
                  value: null,
                  reason: null,
                  deps: 1,
                  errored: false,
                };
              }
              return null as any;
            }
            default: {
              // This is an error. Instead of erroring directly, we're going to encode this on
              // an initialization handler so that we can catch it at the nearest Element.
              if (initializingHandler) {
                initializingHandler.errored = true;
                initializingHandler.value = null;
                initializingHandler.reason = referencedChunk.reason;
              } else {
                initializingHandler = {
                  parent: null,
                  chunk: null,
                  value: null,
                  reason: referencedChunk.reason,
                  deps: 0,
                  errored: true,
                };
              }
              return null as any;
            }
          }
        }
        value = value[path[i]];
      }

      while (
        typeof value === 'object' &&
        value !== null &&
        value.$$typeof === REACT_LAZY_TYPE
      ) {
        // If what we're referencing is a Lazy it must be because we inserted one as a virtual node
        // while it was blocked by other data. If it's no longer blocked, we can unwrap it.
        const referencedChunk: SomeChunk<any> = value._payload;
        switch (referencedChunk.status) {
          case RESOLVED_MODEL:
          case RESOLVED_OBJECT:
            initializeModelChunk(referencedChunk);
            break;
          case RESOLVED_MODULE:
            initializeModuleChunk(referencedChunk);
            break;
        }
        switch (referencedChunk.status) {
          case INITIALIZED: {
            value = referencedChunk.value;
            continue;
          }
        }
        break;
      }

      const chunkValue = map(response, value, parentObject, key);
      if (__DEV__) {
        if (
          parentObject[0] === REACT_ELEMENT_TYPE &&
          (key === '4' || key === '5')
        ) {
          // If we're resolving the "owner" or "stack" slot of an Element array,
          // we don't call transferReferencedDebugInfo because this reference is
          // to a debug chunk.
        } else if (isInitializingDebugInfo) {
          // If we're resolving references as part of debug info resolution, we
          // don't call transferReferencedDebugInfo because these references are
          // to debug chunks.
        } else {
          transferReferencedDebugInfo(initializingChunk, chunk);
        }
      }
      return chunkValue;
    case PENDING:
    case BLOCKED:
      return waitForReference(
        chunk,
        parentObject,
        key,
        response,
        map,
        path,
        isInitializingDebugInfo,
      );
    case HALTED: {
      // Add a dependency that will never resolve.
      // TODO: Mark downstreams as halted too.
      let handler: InitializationHandler;
      if (initializingHandler) {
        handler = initializingHandler;
        handler.deps++;
      } else {
        handler = initializingHandler = {
          parent: null,
          chunk: null,
          value: null,
          reason: null,
          deps: 1,
          errored: false,
        };
      }
      return null as any;
    }
    default:
      // This is an error. Instead of erroring directly, we're going to encode this on
      // an initialization handler so that we can catch it at the nearest Element.
      if (initializingHandler) {
        initializingHandler.errored = true;
        initializingHandler.value = null;
        initializingHandler.reason = chunk.reason;
      } else {
        initializingHandler = {
          parent: null,
          chunk: null,
          value: null,
          reason: chunk.reason,
          deps: 0,
          errored: true,
        };
      }
      // Placeholder
      return null as any;
  }
}

function createMap(
  response: Response,
  model: Array<[any, any]>,
): Map<any, any> {
  return new Map(model);
}

function createSet(response: Response, model: Array<any>): Set<any> {
  return new Set(model);
}

function createBlob(response: Response, model: Array<any>): Blob {
  return new Blob(model.slice(1), {type: model[0]});
}

function createFormData(
  response: Response,
  model: Array<[any, any]>,
): FormData {
  const formData = new FormData();
  for (let i = 0; i < model.length; i++) {
    formData.append(model[i][0], model[i][1]);
  }
  return formData;
}

function applyConstructor(
  response: Response,
  model: Function,
  parentObject: Object,
  key: string,
): void {
  Object.setPrototypeOf(parentObject, model.prototype);
  // Delete the property. It was just a placeholder.
  return undefined;
}

function defineLazyGetter<T>(
  response: Response,
  chunk: SomeChunk<T>,
  parentObject: Object,
  key: string,
): any {
  // We don't immediately initialize it even if it's resolved.
  // Instead, we wait for the getter to get accessed.
  if (key !== __PROTO__) {
    Object.defineProperty(parentObject, key, {
      get: function () {
        if (
          chunk.status === RESOLVED_MODEL ||
          chunk.status === RESOLVED_OBJECT
        ) {
          // If it was now resolved, then we initialize it. This may then discover
          // a new set of lazy references that are then asked for eagerly in case
          // we get that deep.
          initializeModelChunk(chunk);
        }
        switch (chunk.status) {
          case INITIALIZED: {
            return chunk.value;
          }
          case ERRORED:
            throw chunk.reason;
        }
        // Otherwise, we didn't have enough time to load the object before it was
        // accessed or the connection closed. So we just log that it was omitted.
        // TODO: We should ideally throw here to indicate a difference.
        return OMITTED_PROP_ERROR;
      },
      // no-op: the walk function may try to reassign this property after
      // parseModelString returns. With the JSON.parse reviver, the engine's
      // internal CreateDataProperty silently failed. We use a no-op setter
      // to match that behavior in strict mode.
      set: function () {},
      enumerable: true,
      configurable: false,
    });
  }
  return null;
}

function extractIterator(response: Response, model: Array<any>): Iterator<any> {
  // $FlowFixMe[incompatible-use]: This uses raw Symbols because we're extracting from a native array.
  return model[Symbol.iterator]();
}

function createModel(response: Response, model: any): any {
  return model;
}

const mightHaveStaticConstructor = /\bclass\b.*\bstatic\b/;

function getInferredFunctionApproximate(code: string): () => void {
  let slicedCode;
  if (code.startsWith('Object.defineProperty(')) {
    slicedCode = code.slice('Object.defineProperty('.length);
  } else if (code.startsWith('(')) {
    slicedCode = code.slice(1);
  } else {
    slicedCode = code;
  }
  if (slicedCode.startsWith('async function')) {
    const idx = slicedCode.indexOf('(', 14);
    if (idx !== -1) {
      const name = slicedCode.slice(14, idx).trim();
      // eslint-disable-next-line no-eval
      return (0, eval)('({' + JSON.stringify(name) + ':async function(){}})')[
        name
      ];
    }
  } else if (slicedCode.startsWith('function')) {
    const idx = slicedCode.indexOf('(', 8);
    if (idx !== -1) {
      const name = slicedCode.slice(8, idx).trim();
      // eslint-disable-next-line no-eval
      return (0, eval)('({' + JSON.stringify(name) + ':function(){}})')[name];
    }
  } else if (slicedCode.startsWith('class')) {
    const idx = slicedCode.indexOf('{', 5);
    if (idx !== -1) {
      const name = slicedCode.slice(5, idx).trim();
      // eslint-disable-next-line no-eval
      return (0, eval)('({' + JSON.stringify(name) + ':class{}})')[name];
    }
  }
  return function () {};
}

function parseModelString(
  response: Response,
  parentObject: Object,
  key: string,
  value: string,
): any {
  if (value[0] === '$') {
    if (value === '$') {
      // A very common symbol.
      if (initializingHandler !== null && key === '0') {
        // We we already have an initializing handler and we're abound to enter
        // a new element, we need to shadow it because we're now in a new scope.
        // This is effectively the "begin" or "push" phase of Element parsing.
        // We'll pop later when we parse the array itself.
        initializingHandler = {
          parent: initializingHandler,
          chunk: null,
          value: null,
          reason: null,
          deps: 0,
          errored: false,
        };
      }
      return REACT_ELEMENT_TYPE;
    }
    switch (value[1]) {
      case '$': {
        // This was an escaped string value.
        return value.slice(1);
      }
      case 'L': {
        // Lazy node
        const ref = value.slice(2);
        const id = parseInt(ref, 16);
        const chunk = getChunk(response, id);
        if (enableProfilerTimer && enableComponentPerformanceTrack) {
          if (
            initializingChunk !== null &&
            isArray(initializingChunk._children)
          ) {
            initializingChunk._children.push(chunk);
          }
        }
        const separatorIdx = ref.indexOf(':');
        if (separatorIdx > -1) {
          // A reference to one item inside a packed row of deferred siblings.
          const index = parseInt(ref.slice(separatorIdx + 1), 10);
          return createLazyPackedItemWrapper(chunk, index);
        }
        // We create a React.lazy wrapper around any lazy values.
        // When passed into React, we'll know how to suspend on this.
        return createLazyChunkWrapper(chunk, 0);
      }
      case '@': {
        // Promise
        const id = parseInt(value.slice(2), 16);
        const chunk = getChunk(response, id);
        if (enableProfilerTimer && enableComponentPerformanceTrack) {
          if (
            initializingChunk !== null &&
            isArray(initializingChunk._children)
          ) {
            initializingChunk._children.push(chunk);
          }
        }
        return chunk;
      }
      case 'S': {
        // Symbol
        return Symbol.for(value.slice(2));
      }
      case 'h': {
        // Server Reference
        const ref = value.slice(2);
        return getOutlinedModel(
          response,
          ref,
          parentObject,
          key,
          loadServerReference,
        );
      }
      case 'T': {
        // Temporary Reference
        const reference = '$' + value.slice(2);
        const temporaryReferences = response._tempRefs;
        if (temporaryReferences == null) {
          throw new Error(
            'Missing a temporary reference set but the RSC response returned a temporary reference. ' +
              'Pass a temporaryReference option with the set that was used with the reply.',
          );
        }
        return readTemporaryReference(temporaryReferences, reference);
      }
      case 'Q': {
        // Map
        const ref = value.slice(2);
        return getOutlinedModel(response, ref, parentObject, key, createMap);
      }
      case 'W': {
        // Set
        const ref = value.slice(2);
        return getOutlinedModel(response, ref, parentObject, key, createSet);
      }
      case 'B': {
        // Blob
        const ref = value.slice(2);
        return getOutlinedModel(response, ref, parentObject, key, createBlob);
      }
      case 'K': {
        // FormData
        const ref = value.slice(2);
        return getOutlinedModel(
          response,
          ref,
          parentObject,
          key,
          createFormData,
        );
      }
      case 'Z': {
        // Error
        if (__DEV__) {
          const ref = value.slice(2);
          return getOutlinedModel(
            response,
            ref,
            parentObject,
            key,
            resolveErrorDev,
          );
        } else {
          return resolveErrorProd(response);
        }
      }
      case 'i': {
        // Iterator
        const ref = value.slice(2);
        return getOutlinedModel(
          response,
          ref,
          parentObject,
          key,
          extractIterator,
        );
      }
      case 'I': {
        // $Infinity
        return Infinity;
      }
      case '-': {
        // $-0 or $-Infinity
        if (value === '$-0') {
          return -0;
        } else {
          return -Infinity;
        }
      }
      case 'N': {
        // $NaN
        return NaN;
      }
      case 'u': {
        // matches "$undefined"
        // Special encoding for `undefined` which can't be serialized as JSON otherwise.
        return undefined;
      }
      case 'D': {
        // Date
        return new Date(Date.parse(value.slice(2)));
      }
      case 'n': {
        // BigInt
        return BigInt(value.slice(2));
      }
      case 'P': {
        if (__DEV__) {
          // In DEV mode we allow debug objects to specify themselves as instances of
          // another constructor.
          const ref = value.slice(2);
          return getOutlinedModel(
            response,
            ref,
            parentObject,
            key,
            applyConstructor,
          );
        }
        //Fallthrough
      }
      case 'E': {
        if (__DEV__) {
          // In DEV mode we allow indirect eval to produce functions for logging.
          // This should not compile to eval() because then it has local scope access.
          const code = value.slice(2);
          try {
            // If this might be a class constructor with a static initializer or
            // static constructor then don't eval it. It might cause unexpected
            // side-effects. Instead, fallback to parsing out the function type
            // and name.
            if (!mightHaveStaticConstructor.test(code)) {
              // eslint-disable-next-line no-eval
              return (0, eval)(code);
            }
          } catch (x) {
            // Fallthrough to fallback case.
          }
          // We currently use this to express functions so we fail parsing it,
          // let's just return a blank function as a place holder.
          let fn;
          try {
            fn = getInferredFunctionApproximate(code);
            if (code.startsWith('Object.defineProperty(')) {
              const DESCRIPTOR = ',"name",{value:"';
              const idx = code.lastIndexOf(DESCRIPTOR);
              if (idx !== -1) {
                const name = JSON.parse(
                  code.slice(idx + DESCRIPTOR.length - 1, code.length - 2),
                );
                // $FlowFixMe[cannot-write]
                Object.defineProperty(fn, 'name', {value: name});
              }
            }
          } catch (_) {
            fn = function () {};
          }
          return fn;
        }
        // Fallthrough
      }
      case 'Y': {
        if (__DEV__) {
          if (value.length > 2) {
            const debugChannelCallback =
              response._debugChannel && response._debugChannel.callback;
            if (debugChannelCallback) {
              if (value[2] === '@') {
                // This is a deferred Promise.
                const ref = value.slice(3); // We assume this doesn't have a path just id.
                const id = parseInt(ref, 16);
                if (!response._chunks.has(id)) {
                  // We haven't seen this id before. Query the server to start sending it.
                  debugChannelCallback('P:' + ref);
                }
                // Start waiting. This now creates a pending chunk if it doesn't already exist.
                // This is the actual Promise we're waiting for.
                return getChunk(response, id);
              }
              const ref = value.slice(2); // We assume this doesn't have a path just id.
              const id = parseInt(ref, 16);
              if (!response._chunks.has(id)) {
                // We haven't seen this id before. Query the server to start sending it.
                debugChannelCallback('Q:' + ref);
              }
              // Start waiting. This now creates a pending chunk if it doesn't already exist.
              const chunk = getChunk(response, id);
              if (chunk.status === INITIALIZED) {
                // We already loaded this before. We can just use the real value.
                return chunk.value;
              }
              return defineLazyGetter(response, chunk, parentObject, key);
            }
          }

          // In DEV mode we encode omitted objects in logs as a getter that throws
          // so that when you try to access it on the client, you know why that
          // happened.
          if (key !== __PROTO__) {
            Object.defineProperty(parentObject, key, {
              get: function () {
                // TODO: We should ideally throw here to indicate a difference.
                return OMITTED_PROP_ERROR;
              },
              // no-op: the walk function may try to reassign this property
              // after parseModelString returns. With the JSON.parse reviver,
              // the engine's internal CreateDataProperty silently failed.
              // We use a no-op setter to match that behavior in strict mode.
              set: function () {},
              enumerable: true,
              configurable: false,
            });
          }
          return null;
        }
        // Fallthrough
      }
      default: {
        // We assume that anything else is a reference ID.
        const ref = value.slice(1);
        return getOutlinedModel(response, ref, parentObject, key, createModel);
      }
    }
  }
  return value;
}

function parseModelTuple(
  response: Response,
  value: {+[key: string]: JSONValue} | $ReadOnlyArray<JSONValue>,
): any {
  const tuple: [mixed, mixed, mixed, mixed] = value as any;

  if (tuple[0] === REACT_ELEMENT_TYPE) {
    // TODO: Consider having React just directly accept these arrays as elements.
    // Or even change the ReactElement type to be an array.
    return createElement(
      response,
      tuple[1],
      tuple[2],
      tuple[3],
      __DEV__ ? (tuple as any)[4] : null,
      __DEV__ ? (tuple as any)[5] : null,
      __DEV__ ? (tuple as any)[6] : 0,
    );
  }
  return value;
}

function missingCall() {
  throw new Error(
    'Trying to call a function from "use server" but the callServer option ' +
      'was not implemented in your router runtime.',
  );
}

function markIOStarted(this: Response) {
  this._debugIOStarted = true;
}

function ResponseInstance(
  this: $FlowFixMe,
  bundlerConfig: ServerConsumerModuleMap,
  serverReferenceConfig: null | ServerManifest,
  moduleLoading: ModuleLoading,
  callServer: void | CallServerCallback,
  encodeFormAction: void | EncodeFormActionCallback,
  nonce: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  allowPartialStream: boolean,
  findSourceMapURL: void | FindSourceMapURLCallback, // DEV-only
  replayConsole: boolean, // DEV-only
  environmentName: void | string, // DEV-only
  debugStartTime: void | number, // DEV-only
  debugEndTime: void | number, // DEV-only
  debugChannel: void | DebugChannel, // DEV-only
) {
  const chunks: Map<number, SomeChunk<any>> = new Map();
  this._bundlerConfig = bundlerConfig;
  this._serverReferenceConfig = serverReferenceConfig;
  this._moduleLoading = moduleLoading;
  this._callServer = callServer !== undefined ? callServer : missingCall;
  this._encodeFormAction = encodeFormAction;
  this._nonce = nonce;
  this._deferredDispatches = null;
  this._dispatchScope = null;
  this._chunks = chunks;
  this._stringDecoder = createStringDecoder();
  this._closed = false;
  this._closedReason = null;
  this._allowPartialStream = allowPartialStream;
  this._tempRefs = temporaryReferences;
  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    this._timeOrigin = 0;
    this._pendingInitialRender = null;
  }
  if (__DEV__) {
    this._pendingChunks = 0;
    this._weakResponse = {
      weak: new WeakRef(this),
      response: this,
    };
    // TODO: The Flight Client can be used in a Client Environment too and we should really support
    // getting the owner there as well, but currently the owner of ReactComponentInfo is typed as only
    // supporting other ReactComponentInfo as owners (and not Fiber or Fizz's ComponentStackNode).
    // We need to update all the callsites consuming ReactComponentInfo owners to support those.
    // In the meantime we only check ReactSharedInteralsServer since we know that in an RSC environment
    // the only owners will be ReactComponentInfo.
    const rootOwner: null | ReactComponentInfo =
      ReactSharedInteralsServer === undefined ||
      ReactSharedInteralsServer.A === null
        ? null
        : (ReactSharedInteralsServer.A.getOwner() as any);

    this._debugRootOwner = rootOwner;
    this._debugRootStack =
      rootOwner !== null
        ? // TODO: Consider passing the top frame in so we can avoid internals showing up.
          new Error('react-stack-top-frame')
        : null;

    const rootEnv = environmentName === undefined ? 'Server' : environmentName;
    if (supportsCreateTask) {
      // Any stacks that appear on the server need to be rooted somehow on the client
      // so we create a root Task for this response which will be the root owner for any
      // elements created by the server. We use the "use server" string to indicate that
      // this is where we enter the server from the client.
      // TODO: Make this string configurable.
      this._debugRootTask = (console as any).createTask(
        '"use ' + rootEnv.toLowerCase() + '"',
      );
    }
    if (enableAsyncDebugInfo) {
      // Track the start of the fetch to the best of our knowledge.
      // Note: createFromFetch allows this to be marked at the start of the fetch
      // where as if you use createFromReadableStream from the body of the fetch
      // then the start time is when the headers resolved.
      this._debugStartTime =
        debugStartTime == null ? performance.now() : debugStartTime;
      this._debugIOStarted = false;
      // We consider everything before the first setTimeout task to be cached data
      // and is not considered I/O required to load the stream.
      setTimeout(markIOStarted.bind(this), 0);
    }
    this._debugEndTime = debugEndTime === undefined ? null : debugEndTime;
    this._debugFindSourceMapURL = findSourceMapURL;
    this._debugChannel = debugChannel;
    this._blockedConsole = null;
    this._replayConsole = replayConsole;
    this._rootEnvironmentName = rootEnv;
    if (debugChannel) {
      if (debugChannelRegistry === null) {
        // We can't safely clean things up later, so we immediately close the
        // debug channel.
        closeDebugChannel(debugChannel);
        this._debugChannel = undefined;
      } else {
        // When a Response gets GC:ed because nobody is referring to any of the
        // objects that lazily load from the Response anymore, then we can close
        // the debug channel.
        debugChannelRegistry.register(this, debugChannel, this);
      }
    }
  }
  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    // Since we don't know when recording of profiles will start and stop, we have to
    // mark the order over and over again.
    if (replayConsole) {
      markAllTracksInOrder();
    }
  }
}

export function createResponse(
  bundlerConfig: ServerConsumerModuleMap,
  serverReferenceConfig: null | ServerManifest,
  moduleLoading: ModuleLoading,
  callServer: void | CallServerCallback,
  encodeFormAction: void | EncodeFormActionCallback,
  nonce: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  allowPartialStream: boolean,
  findSourceMapURL: void | FindSourceMapURLCallback, // DEV-only
  replayConsole: boolean, // DEV-only
  environmentName: void | string, // DEV-only
  debugStartTime: void | number, // DEV-only
  debugEndTime: void | number, // DEV-only
  debugChannel: void | DebugChannel, // DEV-only
): WeakResponse {
  if (__DEV__) {
    // We use eval to create fake function stacks which includes Component stacks.
    // A warning would be noise if you used Flight without Components and don't encounter
    // errors. We're warning eagerly so that you configure your environment accordingly
    // before you encounter an error.
    checkEvalAvailabilityOnceDev();
  }

  return getWeakResponse(
    // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
    new ResponseInstance(
      bundlerConfig,
      serverReferenceConfig,
      moduleLoading,
      callServer,
      encodeFormAction,
      nonce,
      temporaryReferences,
      allowPartialStream,
      findSourceMapURL,
      replayConsole,
      environmentName,
      debugStartTime,
      debugEndTime,
      debugChannel,
    ),
  );
}

export type StreamState = {
  _rowState: RowParserState,
  _rowID: number, // parts of a row ID parsed so far
  _rowTag: number, // 0 indicates that we're currently parsing the row ID
  _rowLength: number, // remaining bytes in the row. 0 indicates that we're looking for a newline.
  _buffer: Array<Uint8Array>, // chunks received so far as part of this row
  _stringBuffer: string, // for string chunks: the part of the row received so far
  _debugInfo: ReactIOInfo, // DEV-only
  _debugTargetChunkSize: number, // DEV-only
};

export function createStreamState(
  weakResponse: WeakResponse, // DEV-only
  streamDebugValue: mixed, // DEV-only
): StreamState {
  const streamState: StreamState = {
    _rowState: 0,
    _rowID: 0,
    _rowTag: 0,
    _rowLength: 0,
    _buffer: [],
    _stringBuffer: '',
  } as Omit<StreamState, '_debugInfo' | '_debugTargetChunkSize'> as any;
  if (__DEV__ && enableAsyncDebugInfo) {
    const response = unwrapWeakResponse(weakResponse);
    // Create an entry for the I/O to load the stream itself.
    const debugValuePromise = Promise.resolve(streamDebugValue);
    (debugValuePromise as any).status = 'fulfilled';
    (debugValuePromise as any).value = streamDebugValue;
    streamState._debugInfo = {
      name: 'rsc stream',
      start: response._debugStartTime,
      end: response._debugStartTime, // will be updated once we finish a chunk
      byteSize: 0, // will be updated as we resolve a data chunk
      value: debugValuePromise,
      owner: response._debugRootOwner,
      debugStack: response._debugRootStack,
      debugTask: response._debugRootTask,
    };
    streamState._debugTargetChunkSize = MIN_CHUNK_SIZE;
  }
  return streamState;
}

// Depending on set up the chunks of a TLS connection can vary in size. However in practice it's often
// at 64kb or even multiples of 64kb. It can also be smaller but in practice it also happens that 64kb
// is around what you can download on fast 4G connection in 300ms which is what we throttle reveals at
// anyway. The net effect is that in practice, you won't really reveal anything in smaller units than
// 64kb if they're revealing at maximum speed in production. Therefore we group smaller chunks into
// these larger chunks since in production that's more realistic.
// TODO: If the stream is compressed, then you could fit much more in a single 300ms so maybe it should
// actually be larger.
const MIN_CHUNK_SIZE = 65536;

function incrementChunkDebugInfo(
  streamState: StreamState,
  chunkLength: number,
): void {
  if (__DEV__ && enableAsyncDebugInfo) {
    const debugInfo: ReactIOInfo = streamState._debugInfo;
    const endTime = performance.now();
    const previousEndTime = debugInfo.end;
    const newByteLength = (debugInfo.byteSize as any as number) + chunkLength;
    if (
      newByteLength > streamState._debugTargetChunkSize ||
      endTime > previousEndTime + 10
    ) {
      // This new chunk would overshoot the chunk size so therefore we treat it as its own new chunk
      // by cloning the old one. Similarly, if some time has passed we assume that it was actually
      // due to the server being unable to flush chunks faster e.g. due to I/O so it would be a
      // new chunk in production even if the buffer hasn't been reached.
      streamState._debugInfo = {
        name: debugInfo.name,
        start: debugInfo.start,
        end: endTime,
        byteSize: newByteLength,
        value: debugInfo.value,
        owner: debugInfo.owner,
        debugStack: debugInfo.debugStack,
        debugTask: debugInfo.debugTask,
      };
      streamState._debugTargetChunkSize = newByteLength + MIN_CHUNK_SIZE;
    } else {
      // Otherwise we reuse the old chunk but update the end time and byteSize to the latest.
      // $FlowFixMe[cannot-write]
      debugInfo.end = endTime;
      // $FlowFixMe[cannot-write]
      debugInfo.byteSize = newByteLength;
    }
  }
}

function addAsyncInfo(chunk: SomeChunk<any>, asyncInfo: ReactAsyncInfo): void {
  const value = resolveLazy(chunk.value);
  if (
    typeof value === 'object' &&
    value !== null &&
    (isArray(value) ||
      typeof value[ASYNC_ITERATOR] === 'function' ||
      value.$$typeof === REACT_ELEMENT_TYPE ||
      value.$$typeof === REACT_LAZY_TYPE)
  ) {
    if (isArray(value._debugInfo)) {
      // $FlowFixMe[method-unbinding]
      value._debugInfo.push(asyncInfo);
    } else if (!Object.isFrozen(value)) {
      // TODO: Debug info is dropped for frozen elements. See the TODO in
      // moveDebugInfoFromChunkToInnerValue.
      Object.defineProperty(value as any, '_debugInfo', {
        configurable: false,
        enumerable: false,
        writable: true,
        value: [asyncInfo],
      });
    }
  } else {
    // $FlowFixMe[method-unbinding]
    chunk._debugInfo.push(asyncInfo);
  }
}

function resolveChunkDebugInfo(
  response: Response,
  streamState: StreamState,
  chunk: SomeChunk<any>,
): void {
  if (__DEV__ && enableAsyncDebugInfo) {
    // Only include stream information after a macrotask. Any chunk processed
    // before that is considered cached data.
    if (response._debugIOStarted) {
      // Add the currently resolving chunk's debug info representing the stream
      // to the Promise that was waiting on the stream, or its underlying value.
      const asyncInfo: ReactAsyncInfo = {awaited: streamState._debugInfo};
      if (chunk.status === PENDING || chunk.status === BLOCKED) {
        const boundAddAsyncInfo = addAsyncInfo.bind(null, chunk, asyncInfo);
        chunk.then(boundAddAsyncInfo, boundAddAsyncInfo);
      } else {
        addAsyncInfo(chunk, asyncInfo);
      }
    }
  }
}

function resolveDebugHalt(response: Response, id: number): void {
  const chunks = response._chunks;
  let chunk = chunks.get(id);
  if (!chunk) {
    chunks.set(id, (chunk = createPendingChunk(response)));
  } else {
  }
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    return;
  }
  releasePendingChunk(response, chunk);
  const haltedChunk: HaltedChunk<any> = chunk as any;
  haltedChunk.status = HALTED;
  haltedChunk.value = null;
  haltedChunk.reason = null;
}

function resolveModel(
  response: Response,
  id: number,
  model: UninitializedModel,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk) {
    const newChunk: ResolvedModelChunk<any> = createResolvedModelChunk(
      response,
      model,
    );
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, newChunk);
    }
    chunks.set(id, newChunk);
  } else {
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, chunk);
    }
    resolveModelChunk(response, chunk, model, RESOLVED_MODEL);
  }
}

// For a row that arrived in object form and provably contains no Flight
// encodings (the producer's copy-on-write resolve walk returned the model
// unchanged): there's nothing to parse or revive, so the chunk can be
// initialized with the value directly.
function resolveInitializedModel(
  response: Response,
  id: number,
  value: Object,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk) {
    // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
    const newChunk: InitializedChunk<any> = new ReactPromise(
      INITIALIZED,
      value,
      null,
    );
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, newChunk);
    }
    chunks.set(id, newChunk);
    return;
  }
  if (__DEV__) {
    resolveChunkDebugInfo(response, streamState, chunk);
  }
  if (chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    controller.enqueueValue(value);
    return;
  }
  releasePendingChunk(response, chunk);
  const resolveListeners = chunk.value;
  const initializedChunk: InitializedChunk<any> = chunk as any;
  initializedChunk.status = INITIALIZED;
  initializedChunk.value = value;
  initializedChunk.reason = null;
  if (resolveListeners !== null) {
    wakeChunk(response, resolveListeners, value, initializedChunk);
  }
}

// Like resolveModel, but for a row that arrived in object form from an
// in-process render: already parsed, not yet revived.
function resolveModelObject(
  response: Response,
  id: number,
  model: Object,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk) {
    const newChunk: ResolvedObjectChunk<any> = createResolvedObjectChunk(
      response,
      model,
    );
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, newChunk);
    }
    chunks.set(id, newChunk);
  } else {
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, chunk);
    }
    resolveModelChunk(response, chunk, model, RESOLVED_OBJECT);
  }
}

function resolveText(
  response: Response,
  id: number,
  text: string,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (chunk && chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    controller.enqueueValue(text);
    return;
  }
  if (chunk) {
    releasePendingChunk(response, chunk);
  }
  const newChunk = createInitializedTextChunk(response, text);
  if (__DEV__) {
    resolveChunkDebugInfo(response, streamState, newChunk);
  }
  chunks.set(id, newChunk);
}

function resolveBuffer(
  response: Response,
  id: number,
  buffer: $ArrayBufferView | ArrayBuffer,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (chunk && chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    controller.enqueueValue(buffer);
    return;
  }
  if (chunk) {
    releasePendingChunk(response, chunk);
  }
  const newChunk = createInitializedBufferChunk(response, buffer);
  if (__DEV__) {
    resolveChunkDebugInfo(response, streamState, newChunk);
  }
  chunks.set(id, newChunk);
}

function resolveModule(
  response: Response,
  id: number,
  model: UninitializedModel,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  const clientReferenceMetadata: ClientReferenceMetadata = parseModel(
    response,
    model,
  );
  const clientReference = resolveClientReference<$FlowFixMe>(
    response._bundlerConfig,
    clientReferenceMetadata,
  );

  scheduleDispatch(response, () =>
    prepareDestinationForModule(
      response._moduleLoading,
      response._nonce,
      clientReferenceMetadata,
    ),
  );

  // TODO: Add an option to encode modules that are lazy loaded.
  // For now we preload all modules as early as possible since it's likely
  // that we'll need them.
  const promise = preloadModule(clientReference);
  if (promise) {
    let blockedChunk: BlockedChunk<any>;
    if (!chunk) {
      // Technically, we should just treat promise as the chunk in this
      // case. Because it'll just behave as any other promise.
      blockedChunk = createBlockedChunk(response);
      chunks.set(id, blockedChunk);
    } else {
      releasePendingChunk(response, chunk);
      // This can't actually happen because we don't have any forward
      // references to modules.
      blockedChunk = chunk as any;
      blockedChunk.status = BLOCKED;
    }
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, blockedChunk);
    }
    promise.then(
      () => resolveModuleChunk(response, blockedChunk, clientReference),
      error => triggerErrorOnChunk(response, blockedChunk, error),
    );
  } else {
    if (!chunk) {
      const newChunk = createResolvedModuleChunk(response, clientReference);
      if (__DEV__) {
        resolveChunkDebugInfo(response, streamState, newChunk);
      }
      chunks.set(id, newChunk);
    } else {
      if (__DEV__) {
        resolveChunkDebugInfo(response, streamState, chunk);
      }
      // This can't actually happen because we don't have any forward
      // references to modules.
      resolveModuleChunk(response, chunk, clientReference);
    }
  }
}

function resolveStream<T: ReadableStream | $AsyncIterable<any, any, void>>(
  response: Response,
  id: number,
  stream: T,
  controller: FlightStreamController,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk) {
    const newChunk = createInitializedStreamChunk(response, stream, controller);
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, newChunk);
    }
    chunks.set(id, newChunk);
    return;
  }
  if (__DEV__) {
    resolveChunkDebugInfo(response, streamState, chunk);
  }
  if (chunk.status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }

  const resolveListeners = chunk.value;

  if (__DEV__) {
    // Initialize any debug info and block the initializing chunk on any
    // unresolved entries.
    if (chunk._debugChunk != null) {
      const prevHandler = initializingHandler;
      const prevChunk = initializingChunk;
      initializingHandler = null;
      const cyclicChunk: BlockedChunk<T> = chunk as any;
      cyclicChunk.status = BLOCKED;
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      if ((enableProfilerTimer && enableComponentPerformanceTrack) || __DEV__) {
        initializingChunk = cyclicChunk;
      }
      try {
        initializeDebugChunk(response, chunk);
        if (initializingHandler !== null) {
          if (initializingHandler.errored) {
            // Ignore error parsing debug info, we'll report the original error instead.
          } else if (initializingHandler.deps > 0) {
            // Leave blocked until we can resolve all the debug info.
            initializingHandler.value = stream;
            initializingHandler.reason = controller;
            initializingHandler.chunk = cyclicChunk;
            return;
          }
        }
      } finally {
        initializingHandler = prevHandler;
        initializingChunk = prevChunk;
      }
    }
  }

  const resolvedChunk: InitializedStreamChunk<T> = chunk as any;
  resolvedChunk.status = INITIALIZED;
  resolvedChunk.value = stream;
  resolvedChunk.reason = controller;
  if (resolveListeners !== null) {
    wakeChunk(response, resolveListeners, chunk.value, chunk as any);
  } else {
    if (__DEV__) {
      processChunkDebugInfo(response, resolvedChunk, stream);
    }
  }
}

function startReadableStream<T>(
  response: Response,
  id: number,
  type: void | 'bytes',
  streamState: StreamState,
): void {
  let controller: ReadableStreamController = null as any;
  let closed = false;
  const stream = new ReadableStream({
    type: type,
    start(c) {
      controller = c;
    },
  });
  let previousBlockedChunk: SomeChunk<T> | null = null;
  const flightController = {
    enqueueValue(value: T): void {
      if (previousBlockedChunk === null) {
        controller.enqueue(value);
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        previousBlockedChunk.then(function () {
          controller.enqueue(value);
        });
      }
    },
    enqueueModel(
      json: UninitializedModel | Object,
      status: 'resolved_model' | 'resolved_object',
    ): void {
      if (previousBlockedChunk === null) {
        // If we're not blocked on any other chunks, we can try to eagerly initialize
        // this as a fast-path to avoid awaiting them.
        const chunk: ResolvedModelChunk<T> | ResolvedObjectChunk<T> =
          status === RESOLVED_MODEL
            ? createResolvedModelChunk(response, json as any)
            : createResolvedObjectChunk(response, json as any);
        initializeModelChunk(chunk);
        const initializedChunk: SomeChunk<T> = chunk;
        if (initializedChunk.status === INITIALIZED) {
          controller.enqueue(initializedChunk.value);
        } else {
          chunk.then(
            v => controller.enqueue(v),
            e => controller.error(e as any),
          );
          previousBlockedChunk = chunk;
        }
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        const blockedChunk = previousBlockedChunk;
        const chunk: SomeChunk<T> = createPendingChunk(response);
        chunk.then(
          v => controller.enqueue(v),
          e => controller.error(e as any),
        );
        previousBlockedChunk = chunk;
        blockedChunk.then(function () {
          if (previousBlockedChunk === chunk) {
            // We were still the last chunk so we can now clear the queue and return
            // to synchronous emitting.
            previousBlockedChunk = null;
          }
          resolveModelChunk(response, chunk, json, status);
        });
      }
    },
    close(json: UninitializedModel): void {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        controller.close();
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(() => controller.close());
      }
    },
    error(error: mixed): void {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        // $FlowFixMe[incompatible-type]
        controller.error(error);
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(() => controller.error(error as any));
      }
    },
  };
  resolveStream(response, id, stream, flightController, streamState);
}

function asyncIterator(this: $AsyncIterator<any, any, void>) {
  // Self referencing iterator.
  return this;
}

function createIterator<T>(
  next: (arg: void) => SomeChunk<IteratorResult<T, T>>,
): $AsyncIterator<T, T, void> {
  const iterator: any = {
    next: next,
    // TODO: Add return/throw as options for aborting.
  };
  // TODO: The iterator could inherit the AsyncIterator prototype which is not exposed as
  // a global but exists as a prototype of an AsyncGenerator. However, it's not needed
  // to satisfy the iterable protocol.
  (iterator as any)[ASYNC_ITERATOR] = asyncIterator;
  return iterator;
}

function startAsyncIterable<T>(
  response: Response,
  id: number,
  iterator: boolean,
  streamState: StreamState,
): void {
  const buffer: Array<SomeChunk<IteratorResult<T, T>>> = [];
  let closed = false;
  let nextWriteIndex = 0;
  const flightController = {
    enqueueValue(value: T): void {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createInitializedIteratorResultChunk(
          response,
          value,
          false,
        );
      } else {
        const chunk: PendingChunk<IteratorResult<T, T>> = buffer[
          nextWriteIndex
        ] as any;
        const resolveListeners = chunk.value;
        const rejectListeners = chunk.reason;
        const initializedChunk: InitializedChunk<IteratorResult<T, T>> =
          chunk as any;
        initializedChunk.status = INITIALIZED;
        initializedChunk.value = {done: false, value: value};
        initializedChunk.reason = null;
        if (resolveListeners !== null) {
          wakeChunkIfInitialized(
            response,
            chunk,
            resolveListeners,
            rejectListeners,
          );
        }
      }
      nextWriteIndex++;
    },
    enqueueModel(
      value: UninitializedModel | Object,
      status: 'resolved_model' | 'resolved_object',
    ): void {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(
          response,
          value,
          false,
          status,
        );
      } else {
        resolveIteratorResultChunk(
          response,
          buffer[nextWriteIndex],
          value,
          false,
          status,
        );
      }
      nextWriteIndex++;
    },
    close(value: UninitializedModel): void {
      if (closed) {
        return;
      }
      closed = true;
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(
          response,
          value,
          true,
          RESOLVED_MODEL,
        );
      } else {
        resolveIteratorResultChunk(
          response,
          buffer[nextWriteIndex],
          value,
          true,
          RESOLVED_MODEL,
        );
      }
      nextWriteIndex++;
      while (nextWriteIndex < buffer.length) {
        // In generators, any extra reads from the iterator have the value undefined.
        resolveIteratorResultChunk(
          response,
          buffer[nextWriteIndex++],
          '"$undefined"',
          true,
          RESOLVED_MODEL,
        );
      }
    },
    error(error: Error): void {
      if (closed) {
        return;
      }
      closed = true;
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] =
          createPendingChunk<IteratorResult<T, T>>(response);
      }
      while (nextWriteIndex < buffer.length) {
        triggerErrorOnChunk(response, buffer[nextWriteIndex++], error);
      }
    },
  };

  const iterable: $AsyncIterable<T, T, void> = {} as any;
  // $FlowFixMe[cannot-write]
  iterable[ASYNC_ITERATOR] = (): $AsyncIterator<T, T, void> => {
    let nextReadIndex = 0;
    return createIterator(arg => {
      if (arg !== undefined) {
        throw new Error(
          'Values cannot be passed to next() of AsyncIterables passed to Client Components.',
        );
      }
      if (nextReadIndex === buffer.length) {
        if (closed) {
          // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
          return new ReactPromise(
            INITIALIZED,
            {done: true, value: undefined},
            null,
          );
        }
        buffer[nextReadIndex] =
          createPendingChunk<IteratorResult<T, T>>(response);
      }
      return buffer[nextReadIndex++];
    });
  };

  // TODO: If it's a single shot iterator we can optimize memory by cleaning up the buffer after
  // reading through the end, but currently we favor code size over this optimization.
  resolveStream(
    response,
    id,
    iterator ? iterable[ASYNC_ITERATOR]() : iterable,
    flightController,
    streamState,
  );
}

function stopStream(
  response: Response,
  id: number,
  row: UninitializedModel,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk || chunk.status !== INITIALIZED) {
    // We didn't expect not to have an existing stream;
    return;
  }
  if (__DEV__) {
    if (--response._pendingChunks === 0) {
      // We're no longer waiting for any more chunks. We can release the strong
      // reference to the response. We'll regain it if we ask for any more data
      // later on.
      response._weakResponse.response = null;
    }
  }
  const streamChunk: InitializedStreamChunk<any> = chunk as any;
  const controller = streamChunk.reason;
  controller.close(row === '' ? '"$undefined"' : row);
}

type ErrorWithDigest = Error & {digest?: string};
function resolveErrorProd(response: Response): Error {
  if (__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resolveErrorProd should never be called in development mode. Use resolveErrorDev instead. This is a bug in React.',
    );
  }
  const error = new Error(
    'An error occurred in the Server Components render. The specific message is omitted in production' +
      ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
      ' may provide additional details about the nature of the error.',
  );
  error.stack = 'Error: ' + error.message;
  return error;
}

function resolveErrorDev(
  response: Response,
  errorInfo: ReactErrorInfoDev,
): Error {
  const name = errorInfo.name;
  const message = errorInfo.message;
  const stack = errorInfo.stack;
  const env = errorInfo.env;

  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resolveErrorDev should never be called in production mode. Use resolveErrorProd instead. This is a bug in React.',
    );
  }

  let error;
  const errorOptions =
    // We don't serialize Error.cause in prod so we never need to deserialize
    // $FlowFixMe[constant-condition]
    __DEV__ && 'cause' in errorInfo
      ? {
          cause: reviveModel(
            response,
            // $FlowFixMe[incompatible-type] -- Flow thinks `cause` in `cause?: JSONValue` can be undefined after `in` check.
            errorInfo.cause as JSONValue,
            errorInfo,
            'cause',
          ),
        }
      : undefined;
  const isAggregateError =
    typeof AggregateError !== 'undefined' && 'errors' in errorInfo;
  const revivedErrors =
    // We don't serialize AggregateError.errors in prod so we never need to deserialize
    __DEV__ && isAggregateError
      ? reviveModel(
          response,
          // $FlowFixMe[incompatible-type]
          errorInfo.errors as JSONValue,
          errorInfo,
          'errors',
        )
      : null;
  const callStack = buildFakeCallStack(
    response,
    stack,
    env,
    false,
    isAggregateError
      ? // $FlowFixMe[incompatible-use]
        AggregateError.bind(
          null,
          revivedErrors,
          message ||
            'An error occurred in the Server Components render but no message was provided',
          errorOptions,
        )
      : // $FlowFixMe[incompatible-use]
        Error.bind(
          null,
          message ||
            'An error occurred in the Server Components render but no message was provided',
          errorOptions,
        ),
  );

  let ownerTask: null | ConsoleTask = null;
  if (errorInfo.owner != null) {
    const ownerRef = errorInfo.owner.slice(1);
    // TODO: This is not resilient to the owner loading later in an Error like a debug channel.
    // The whole error serialization should probably go through the regular model at least for DEV.
    const owner = getOutlinedModel(response, ownerRef, {}, '', createModel);
    if (owner !== null) {
      ownerTask = initializeFakeTask(response, owner);
    }
  }

  if (ownerTask === null) {
    const rootTask = getRootTask(response, env);
    if (rootTask != null) {
      error = rootTask.run(callStack);
    } else {
      error = callStack();
    }
  } else {
    error = ownerTask.run(callStack);
  }

  (error as any).name = name;
  (error as any).environmentName = env;
  return error;
}

function resolveErrorModel(
  response: Response,
  id: number,
  row: UninitializedModel,
  streamState: StreamState,
): void {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  const errorInfo = JSON.parse(row);
  let error;
  if (__DEV__) {
    error = resolveErrorDev(response, errorInfo);
  } else {
    error = resolveErrorProd(response);
  }
  (error as any).digest = errorInfo.digest;
  const errorWithDigest: ErrorWithDigest = error as any;
  if (!chunk) {
    const newChunk: ErroredChunk<any> = createErrorChunk(
      response,
      errorWithDigest,
    );
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, newChunk);
    }
    chunks.set(id, newChunk);
  } else {
    if (__DEV__) {
      resolveChunkDebugInfo(response, streamState, chunk);
    }
    triggerErrorOnChunk(response, chunk, errorWithDigest);
  }
}

function resolveHint<Code: HintCode>(
  response: Response,
  code: Code,
  model: UninitializedModel,
): void {
  const hintModel: HintModel<Code> = parseModel(response, model);
  scheduleDispatch(response, () => dispatchHint(code, hintModel));
}

const supportsCreateTask = __DEV__ && !!(console as any).createTask;

type FakeFunction<T> = (() => T) => T;
const fakeFunctionCache: Map<string, FakeFunction<any>> = __DEV__
  ? new Map()
  : (null as any);

let fakeFunctionIdx = 0;
function createFakeFunction<T>(
  name: string,
  filename: string,
  sourceMap: null | string,
  line: number,
  col: number,
  enclosingLine: number,
  enclosingCol: number,
  environmentName: string,
): FakeFunction<T> {
  // This creates a fake copy of a Server Module. It represents a module that has already
  // executed on the server but we re-execute a blank copy for its stack frames on the client.

  const comment =
    '/* This module was rendered by a Server Component. Turn on Source Maps to see the server source. */';

  if (!name) {
    // An eval:ed function with no name gets the name "eval". We give it something more descriptive.
    name = '<anonymous>';
  }
  const encodedName = JSON.stringify(name);
  // We generate code where the call is at the line and column of the server executed code.
  // This allows us to use the original source map as the source map of this fake file to
  // point to the original source.
  let code;
  // Normalize line/col to zero based.
  if (enclosingLine < 1) {
    enclosingLine = 0;
  } else {
    enclosingLine--;
  }
  if (enclosingCol < 1) {
    enclosingCol = 0;
  } else {
    enclosingCol--;
  }
  if (line < 1) {
    line = 0;
  } else {
    line--;
  }
  if (col < 1) {
    col = 0;
  } else {
    col--;
  }
  if (line < enclosingLine || (line === enclosingLine && col < enclosingCol)) {
    // Protection against invalid enclosing information. Should not happen.
    enclosingLine = 0;
    enclosingCol = 0;
  }
  if (line < 1) {
    // Fit everything on the first line.
    const minCol = encodedName.length + 3;
    let enclosingColDistance = enclosingCol - minCol;
    if (enclosingColDistance < 0) {
      enclosingColDistance = 0;
    }
    let colDistance = col - enclosingColDistance - minCol - 3;
    if (colDistance < 0) {
      colDistance = 0;
    }
    code =
      '({' +
      encodedName +
      ':' +
      ' '.repeat(enclosingColDistance) +
      '_=>' +
      ' '.repeat(colDistance) +
      '_()})';
  } else if (enclosingLine < 1) {
    // Fit just the enclosing function on the first line.
    const minCol = encodedName.length + 3;
    let enclosingColDistance = enclosingCol - minCol;
    if (enclosingColDistance < 0) {
      enclosingColDistance = 0;
    }
    code =
      '({' +
      encodedName +
      ':' +
      ' '.repeat(enclosingColDistance) +
      '_=>' +
      '\n'.repeat(line - enclosingLine) +
      ' '.repeat(col) +
      '_()})';
  } else if (enclosingLine === line) {
    // Fit the enclosing function and callsite on same line.
    let colDistance = col - enclosingCol - 3;
    if (colDistance < 0) {
      colDistance = 0;
    }
    code =
      '\n'.repeat(enclosingLine - 1) +
      '({' +
      encodedName +
      ':\n' +
      ' '.repeat(enclosingCol) +
      '_=>' +
      ' '.repeat(colDistance) +
      '_()})';
  } else {
    // This is the ideal because we can always encode any position.
    code =
      '\n'.repeat(enclosingLine - 1) +
      '({' +
      encodedName +
      ':\n' +
      ' '.repeat(enclosingCol) +
      '_=>' +
      '\n'.repeat(line - enclosingLine) +
      ' '.repeat(col) +
      '_()})';
  }

  if (enclosingLine < 1) {
    // If the function starts at the first line, we append the comment after.
    code = code + '\n' + comment;
  } else {
    // Otherwise we prepend the comment on the first line.
    code = comment + code;
  }

  if (filename.startsWith('/')) {
    // If the filename starts with `/` we assume that it is a file system file
    // rather than relative to the current host. Since on the server fully qualified
    // stack traces use the file path.
    // TODO: What does this look like on Windows?
    filename = 'file://' + filename;
  }

  if (sourceMap) {
    // We use the prefix about://React/ to separate these from other files listed in
    // the Chrome DevTools. We need a "host name" and not just a protocol because
    // otherwise the group name becomes the root folder. Ideally we don't want to
    // show these at all but there's two reasons to assign a fake URL.
    // 1) A printed stack trace string needs a unique URL to be able to source map it.
    // 2) If source maps are disabled or fails, you should at least be able to tell
    //    which file it was.
    code +=
      '\n//# sourceURL=about://React/' +
      encodeURIComponent(environmentName) +
      '/' +
      encodeURI(filename) +
      '?' +
      fakeFunctionIdx++;
    code += '\n//# sourceMappingURL=' + sourceMap;
  } else if (filename) {
    code += '\n//# sourceURL=' + encodeURI(filename);
  } else {
    code += '\n//# sourceURL=<anonymous>';
  }

  let fn: FakeFunction<T>;
  try {
    // eslint-disable-next-line no-eval
    fn = (0, eval)(code)[name];
  } catch (x) {
    // If eval fails, such as if in an environment that doesn't support it,
    // we fallback to creating a function here. It'll still have the right
    // name but it'll lose line/column number and file name.
    fn = function (_) {
      return _();
    };
    // Using the usual {[name]: _() => _()}.bind() trick to avoid minifiers
    // doesn't work here since this will produce `Object.*` names.
    Object.defineProperty(
      fn,
      // $FlowFixMe[cannot-write] -- `name` is configurable though.
      'name',
      {value: name},
    );
  }
  return fn;
}

function buildFakeCallStack<T>(
  response: Response,
  stack: ReactStackTrace,
  environmentName: string,
  useEnclosingLine: boolean,
  innerCall: () => T,
): () => T {
  let callStack = innerCall;
  for (let i = 0; i < stack.length; i++) {
    const frame = stack[i];
    const frameKey =
      frame.join('-') +
      '-' +
      environmentName +
      (useEnclosingLine ? '-e' : '-n');
    let fn = fakeFunctionCache.get(frameKey);
    if (fn === undefined) {
      const [name, filename, line, col, enclosingLine, enclosingCol] = frame;
      const findSourceMapURL = response._debugFindSourceMapURL;
      const sourceMap = findSourceMapURL
        ? findSourceMapURL(filename, environmentName)
        : null;
      fn = createFakeFunction(
        name,
        filename,
        sourceMap,
        line,
        col,
        useEnclosingLine ? line : enclosingLine,
        useEnclosingLine ? col : enclosingCol,
        environmentName,
      );
      // TODO: This cache should technically live on the response since the _debugFindSourceMapURL
      // function is an input and can vary by response.
      fakeFunctionCache.set(frameKey, fn);
    }
    callStack = fn.bind(null, callStack);
  }
  return callStack;
}

function getRootTask(
  response: Response,
  childEnvironmentName: string,
): null | ConsoleTask {
  const rootTask = response._debugRootTask;
  if (!rootTask) {
    return null;
  }
  if (response._rootEnvironmentName !== childEnvironmentName) {
    // If the root most owner component is itself in a different environment than the requested
    // environment then we create an extra task to indicate that we're transitioning into it.
    // Like if one environment just requests another environment.
    const createTaskFn = (console as any).createTask.bind(
      console,
      '"use ' + childEnvironmentName.toLowerCase() + '"',
    );
    return rootTask.run(createTaskFn);
  }
  return rootTask;
}

function initializeFakeTask(
  response: Response,
  debugInfo: ReactComponentInfo | ReactAsyncInfo | ReactIOInfo,
): null | ConsoleTask {
  if (!supportsCreateTask) {
    return null;
  }
  if (debugInfo.stack == null) {
    // If this is an error, we should've really already initialized the task.
    // If it's null, we can't initialize a task.
    return null;
  }
  const cachedEntry = debugInfo.debugTask;
  if (cachedEntry !== undefined) {
    return cachedEntry;
  }

  // Workaround for a bug where Chrome Performance tracking uses the enclosing line/column
  // instead of the callsite. For ReactAsyncInfo/ReactIOInfo, the only thing we're going
  // to use the fake task for is the Performance tracking so we encode the enclosing line/
  // column at the callsite to get a better line number. We could do this for Components too
  // but we're going to use those for other things too like console logs and it's not worth
  // duplicating. If this bug is every fixed in Chrome, this should be set to false.
  const useEnclosingLine = debugInfo.key === undefined;

  const stack = debugInfo.stack;
  const env: string =
    debugInfo.env == null ? response._rootEnvironmentName : debugInfo.env;
  const ownerEnv: string =
    debugInfo.owner == null || debugInfo.owner.env == null
      ? response._rootEnvironmentName
      : debugInfo.owner.env;
  const ownerTask =
    debugInfo.owner == null
      ? null
      : initializeFakeTask(response, debugInfo.owner);
  const taskName =
    // This is the boundary between two environments so we'll annotate the task name.
    // We assume that the stack frame of the entry into the new environment was done
    // from the old environment. So we use the owner's environment as the current.
    env !== ownerEnv
      ? '"use ' + env.toLowerCase() + '"'
      : // Some unfortunate pattern matching to refine the type.
        debugInfo.key !== undefined
        ? getServerComponentTaskName(debugInfo as any as ReactComponentInfo)
        : debugInfo.name !== undefined
          ? getIOInfoTaskName(debugInfo as any as ReactIOInfo)
          : getAsyncInfoTaskName(debugInfo as any as ReactAsyncInfo);
  // $FlowFixMe[cannot-write]: We consider this part of initialization.
  return (debugInfo.debugTask = buildFakeTask(
    response,
    ownerTask,
    stack,
    taskName,
    ownerEnv,
    useEnclosingLine,
  ));
}

function buildFakeTask(
  response: Response,
  ownerTask: null | ConsoleTask,
  stack: ReactStackTrace,
  taskName: string,
  env: string,
  useEnclosingLine: boolean,
): ConsoleTask {
  const createTaskFn = (console as any).createTask.bind(console, taskName);
  const callStack = buildFakeCallStack(
    response,
    stack,
    env,
    useEnclosingLine,
    createTaskFn,
  );
  if (ownerTask === null) {
    const rootTask = getRootTask(response, env);
    if (rootTask != null) {
      return rootTask.run(callStack);
    } else {
      return callStack();
    }
  } else {
    return ownerTask.run(callStack);
  }
}

const createFakeJSXCallStack = {
  react_stack_bottom_frame: function (
    response: Response,
    stack: ReactStackTrace,
    environmentName: string,
  ): Error {
    const callStackForError = buildFakeCallStack(
      response,
      stack,
      environmentName,
      false,
      fakeJSXCallSite,
    );
    return callStackForError();
  },
};

const createFakeJSXCallStackInDEV: (
  response: Response,
  stack: ReactStackTrace,
  environmentName: string,
) => Error = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (createFakeJSXCallStack.react_stack_bottom_frame.bind(
      createFakeJSXCallStack,
    ) as any)
  : (null as any);

/** @noinline */
function fakeJSXCallSite() {
  // This extra call frame represents the JSX creation function. We always pop this frame
  // off before presenting so it needs to be part of the stack.
  return new Error('react-stack-top-frame');
}

function initializeFakeStack(
  response: Response,
  debugInfo: ReactComponentInfo | ReactAsyncInfo | ReactIOInfo,
): void {
  const cachedEntry = debugInfo.debugStack;
  if (cachedEntry !== undefined) {
    return;
  }
  if (debugInfo.stack != null) {
    const stack = debugInfo.stack;
    const env = debugInfo.env == null ? '' : debugInfo.env;
    // $FlowFixMe[cannot-write]
    debugInfo.debugStack = createFakeJSXCallStackInDEV(response, stack, env);
  }
  const owner = debugInfo.owner;
  if (owner != null) {
    // Initialize any owners not yet initialized.
    initializeFakeStack(response, owner);
    if (owner.debugLocation === undefined && debugInfo.debugStack != null) {
      // If we are the child of this owner, then the owner should be the bottom frame
      // our stack. We can use it as the implied location of the owner.
      owner.debugLocation = debugInfo.debugStack;
    }
  }
}

function initializeDebugInfo(
  response: Response,
  debugInfo: ReactDebugInfoEntry,
): ReactDebugInfoEntry {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'initializeDebugInfo should never be called in production mode. This is a bug in React.',
    );
  }
  if (debugInfo.stack !== undefined) {
    const componentInfoOrAsyncInfo: ReactComponentInfo | ReactAsyncInfo =
      // $FlowFixMe[incompatible-type]
      debugInfo;
    // We eagerly initialize the fake task because this resolving happens outside any
    // render phase so we're not inside a user space stack at this point. If we waited
    // to initialize it when we need it, we might be inside user code.
    initializeFakeTask(response, componentInfoOrAsyncInfo);
  }
  if (debugInfo.owner == null && response._debugRootOwner != null) {
    const componentInfoOrAsyncInfo: ReactComponentInfo | ReactAsyncInfo =
      // $FlowFixMe[incompatible-type]: By narrowing `owner` to `null`, we narrowed `debugInfo` to `ReactComponentInfo`
      debugInfo;
    // $FlowFixMe[cannot-write]
    componentInfoOrAsyncInfo.owner = response._debugRootOwner;
    // We clear the parsed stack frames to indicate that it needs to be re-parsed from debugStack.
    // $FlowFixMe[cannot-write]
    componentInfoOrAsyncInfo.stack = null;
    // We override the stack if we override the owner since the stack where the root JSX
    // was created on the server isn't very useful but where the request was made is.
    // $FlowFixMe[cannot-write]
    componentInfoOrAsyncInfo.debugStack = response._debugRootStack;
    // $FlowFixMe[cannot-write]
    componentInfoOrAsyncInfo.debugTask = response._debugRootTask;
  } else if (debugInfo.stack !== undefined) {
    const componentInfoOrAsyncInfo: ReactComponentInfo | ReactAsyncInfo =
      // $FlowFixMe[incompatible-type]
      debugInfo;
    initializeFakeStack(response, componentInfoOrAsyncInfo);
  }
  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    if (typeof debugInfo.time === 'number') {
      // Adjust the time to the current environment's time space.
      // Since this might be a deduped object, we clone it to avoid
      // applying the adjustment twice.
      debugInfo = {
        time: debugInfo.time + response._timeOrigin,
      };
    }
  }
  return debugInfo;
}

function resolveDebugModel(
  response: Response,
  id: number,
  json: UninitializedModel,
): void {
  const parentChunk = getChunk(response, id);
  if (
    parentChunk.status === INITIALIZED ||
    parentChunk.status === ERRORED ||
    parentChunk.status === HALTED ||
    parentChunk.status === BLOCKED
  ) {
    // We shouldn't really get debug info late. It's too late to add it after we resolved.
    return;
  }
  if (parentChunk.status === RESOLVED_MODULE) {
    // We don't expect to get debug info on modules.
    return;
  }
  const previousChunk = parentChunk._debugChunk;
  const debugChunk: ResolvedModelChunk<ReactDebugInfoEntry> =
    createResolvedModelChunk(response, json);
  debugChunk._debugChunk = previousChunk; // Linked list of the debug chunks
  parentChunk._debugChunk = debugChunk;
  initializeDebugChunk(response, parentChunk);
  if (
    __DEV__ &&
    (debugChunk as any as SomeChunk<any>).status === BLOCKED &&
    (response._debugChannel === undefined ||
      !response._debugChannel.hasReadable)
  ) {
    if (json[0] === '"' && json[1] === '$') {
      const path = json.slice(2, json.length - 1).split(':');
      const outlinedId = parseInt(path[0], 16);
      const chunk = getChunk(response, outlinedId);
      if (chunk.status === PENDING) {
        // We expect the debug chunk to have been emitted earlier in the stream. It might be
        // blocked on other things but chunk should no longer be pending.
        // If it's still pending that suggests that it was referencing an object in the debug
        // channel, but no debug channel was wired up so it's missing. In this case we can just
        // drop the debug info instead of halting the whole stream.
        parentChunk._debugChunk = null;
      }
    }
  }
}

let currentOwnerInDEV: null | ReactComponentInfo = null;
function getCurrentStackInDEV(): string {
  if (__DEV__) {
    const owner: null | ReactComponentInfo = currentOwnerInDEV;
    if (owner === null) {
      return '';
    }
    return getOwnerStackByComponentInfoInDev(owner);
  }
  return '';
}

const replayConsoleWithCallStack = {
  react_stack_bottom_frame: function (
    response: Response,
    payload: ConsoleEntry,
  ): void {
    const methodName = payload[0];
    const stackTrace = payload[1];
    const owner = payload[2];
    const env = payload[3];
    const args = payload.slice(4);

    // There really shouldn't be anything else on the stack atm.
    const prevStack = ReactSharedInternals.getCurrentStack;
    ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
    currentOwnerInDEV =
      owner === null ? (response._debugRootOwner as any) : owner;

    try {
      const callStack = buildFakeCallStack(
        response,
        stackTrace,
        env,
        false,
        bindToConsole(methodName, args, env),
      );
      if (owner != null) {
        const task = initializeFakeTask(response, owner);
        initializeFakeStack(response, owner);
        if (task !== null) {
          task.run(callStack);
          return;
        }
      }
      const rootTask = getRootTask(response, env);
      if (rootTask != null) {
        rootTask.run(callStack);
        return;
      }
      callStack();
    } finally {
      currentOwnerInDEV = null;
      ReactSharedInternals.getCurrentStack = prevStack;
    }
  },
};

const replayConsoleWithCallStackInDEV: (
  response: Response,
  payload: ConsoleEntry,
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (replayConsoleWithCallStack.react_stack_bottom_frame.bind(
      replayConsoleWithCallStack,
    ) as any)
  : (null as any);

type ConsoleEntry = [
  string,
  ReactStackTrace,
  null | ReactComponentInfo,
  string,
  mixed,
];

function resolveConsoleEntry(
  response: Response,
  json: UninitializedModel,
): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resolveConsoleEntry should never be called in production mode. This is a bug in React.',
    );
  }

  if (!response._replayConsole) {
    return;
  }

  const blockedChunk = response._blockedConsole;
  if (blockedChunk == null) {
    // If we're not blocked on any other chunks, we can try to eagerly initialize
    // this as a fast-path to avoid awaiting them.
    const chunk: ResolvedModelChunk<ConsoleEntry> = createResolvedModelChunk(
      response,
      json,
    );
    initializeModelChunk(chunk);
    const initializedChunk: SomeChunk<ConsoleEntry> = chunk;
    if (initializedChunk.status === INITIALIZED) {
      replayConsoleWithCallStackInDEV(response, initializedChunk.value);
    } else {
      chunk.then(
        v => replayConsoleWithCallStackInDEV(response, v),
        e => {
          // Ignore console errors for now. Unnecessary noise.
        },
      );
      response._blockedConsole = chunk;
    }
  } else {
    // We're still waiting on a previous chunk so we can't enqueue quite yet.
    const chunk: SomeChunk<ConsoleEntry> = createPendingChunk(response);
    chunk.then(
      v => replayConsoleWithCallStackInDEV(response, v),
      e => {
        // Ignore console errors for now. Unnecessary noise.
      },
    );
    response._blockedConsole = chunk;
    const unblock = () => {
      if (response._blockedConsole === chunk) {
        // We were still the last chunk so we can now clear the queue and return
        // to synchronous emitting.
        response._blockedConsole = null;
      }
      resolveModelChunk(response, chunk, json, RESOLVED_MODEL);
    };
    blockedChunk.then(unblock, unblock);
  }
}

function initializeIOInfo(response: Response, ioInfo: ReactIOInfo): void {
  if (ioInfo.stack !== undefined) {
    initializeFakeTask(response, ioInfo);
    initializeFakeStack(response, ioInfo);
  }
  // Adjust the time to the current environment's time space.
  // $FlowFixMe[cannot-write]
  ioInfo.start += response._timeOrigin;
  // $FlowFixMe[cannot-write]
  ioInfo.end += response._timeOrigin;

  if (enableComponentPerformanceTrack && response._replayConsole) {
    const env = response._rootEnvironmentName;
    const promise = ioInfo.value;
    if (promise) {
      const thenable: Thenable<mixed> = promise as any;
      switch (thenable.status) {
        case INITIALIZED:
          logIOInfo(ioInfo, env, thenable.value);
          break;
        case ERRORED:
          logIOInfoErrored(ioInfo, env, thenable.reason);
          break;
        default:
          // If we haven't resolved the Promise yet, wait to log until have so we can include
          // its data in the log.
          promise.then(
            logIOInfo.bind(null, ioInfo, env),
            logIOInfoErrored.bind(null, ioInfo, env),
          );
          break;
      }
    } else {
      logIOInfo(ioInfo, env, undefined);
    }
  }
}

function resolveIOInfo(
  response: Response,
  id: number,
  model: UninitializedModel,
): void {
  const chunks = response._chunks;
  let chunk = chunks.get(id);
  const prevIsInitializingDebugInfo = isInitializingDebugInfo;
  isInitializingDebugInfo = true;
  try {
    if (!chunk) {
      chunk = createResolvedModelChunk(response, model);
      chunks.set(id, chunk);
      initializeModelChunk(chunk);
    } else {
      resolveModelChunk(response, chunk, model, RESOLVED_MODEL);
      if (chunk.status === RESOLVED_MODEL) {
        initializeModelChunk(chunk);
      }
    }
  } finally {
    isInitializingDebugInfo = prevIsInitializingDebugInfo;
  }
  if (chunk.status === INITIALIZED) {
    initializeIOInfo(response, chunk.value);
  } else {
    chunk.then(
      v => {
        initializeIOInfo(response, v);
      },
      e => {
        // Ignore debug info errors for now. Unnecessary noise.
      },
    );
  }
}

function mergeBuffer(
  buffer: Array<Uint8Array>,
  lastChunk: Uint8Array,
): Uint8Array {
  const l = buffer.length;
  // Count the bytes we'll need
  let byteLength = lastChunk.length;
  for (let i = 0; i < l; i++) {
    byteLength += buffer[i].byteLength;
  }
  // Allocate enough contiguous space
  const result = new Uint8Array(byteLength);
  let offset = 0;
  // Copy all the buffers into it.
  for (let i = 0; i < l; i++) {
    const chunk = buffer[i];
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  result.set(lastChunk, offset);
  return result;
}

function resolveTypedArray(
  response: Response,
  id: number,
  buffer: Array<Uint8Array>,
  lastChunk: Uint8Array,
  constructor: any,
  bytesPerElement: number,
  streamState: StreamState,
): void {
  // If the view fits into one original buffer, we just reuse that buffer instead of
  // copying it out to a separate copy. This means that it's not always possible to
  // transfer these values to other threads without copying first since they may
  // share array buffer. For this to work, it must also have bytes aligned to a
  // multiple of a size of the type.
  const chunk =
    buffer.length === 0 && lastChunk.byteOffset % bytesPerElement === 0
      ? lastChunk
      : mergeBuffer(buffer, lastChunk);
  // TODO: The transfer protocol of RSC is little-endian. If the client isn't little-endian
  // we should convert it instead. In practice big endian isn't really Web compatible so it's
  // somewhat safe to assume that browsers aren't going to run it, but maybe there's some SSR
  // server that's affected.
  const view: $ArrayBufferView = new constructor(
    chunk.buffer,
    chunk.byteOffset,
    chunk.byteLength / bytesPerElement,
  );
  resolveBuffer(response, id, view, streamState);
}

function logComponentInfo(
  response: Response,
  root: SomeChunk<any>,
  componentInfo: ReactComponentInfo,
  trackIdx: number,
  startTime: number,
  componentEndTime: number,
  childrenEndTime: number,
  isLastComponent: boolean,
): void {
  // $FlowFixMe[incompatible-type]: Refined.
  if (
    isLastComponent &&
    root.status === ERRORED &&
    root.reason !== response._closedReason
  ) {
    // If this is the last component to render before this chunk rejected, then conceptually
    // this component errored. If this was a cancellation then it wasn't this component that
    // errored.
    logComponentErrored(
      componentInfo,
      trackIdx,
      startTime,
      componentEndTime,
      childrenEndTime,
      response._rootEnvironmentName,
      root.reason,
    );
  } else {
    logComponentRender(
      componentInfo,
      trackIdx,
      startTime,
      componentEndTime,
      childrenEndTime,
      response._rootEnvironmentName,
    );
  }
}

function flushComponentPerformance(
  response: Response,
  root: SomeChunk<any>,
  trackIdx: number, // Next available track
  trackTime: number, // The time after which it is available,
  parentEndTime: number,
): ProfilingResult {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'flushComponentPerformance should never be called in production mode. This is a bug in React.',
    );
  }
  // Write performance.measure() entries for Server Components in tree order.
  // This must be done at the end to collect the end time from the whole tree.
  if (!isArray(root._children)) {
    // We have already written this chunk. If this was a cycle, then this will
    // be -Infinity and it won't contribute to the parent end time.
    // If this was already emitted by another sibling then we reused the same
    // chunk in two places. We should extend the current end time as if it was
    // rendered as part of this tree.
    const previousResult: ProfilingResult = root._children;
    const previousEndTime = previousResult.endTime;
    if (
      parentEndTime > -Infinity &&
      parentEndTime < previousEndTime &&
      previousResult.component !== null
    ) {
      // Log a placeholder for the deduped value under this child starting
      // from the end of the self time of the parent and spanning until the
      // the deduped end.
      logDedupedComponentRender(
        previousResult.component,
        trackIdx,
        parentEndTime,
        previousEndTime,
        response._rootEnvironmentName,
      );
    }
    // Since we didn't bump the track this time, we just return the same track.
    previousResult.track = trackIdx;
    return previousResult;
  }
  const children = root._children;

  // First find the start time of the first component to know if it was running
  // in parallel with the previous.
  let debugInfo = null;
  if (__DEV__) {
    debugInfo = root._debugInfo;
    if (debugInfo.length === 0 && root.status === 'fulfilled') {
      const resolvedValue = resolveLazy(root.value);
      if (
        typeof resolvedValue === 'object' &&
        resolvedValue !== null &&
        (isArray(resolvedValue) ||
          typeof resolvedValue[ASYNC_ITERATOR] === 'function' ||
          resolvedValue.$$typeof === REACT_ELEMENT_TYPE ||
          resolvedValue.$$typeof === REACT_LAZY_TYPE) &&
        isArray(resolvedValue._debugInfo)
      ) {
        // It's possible that the value has been given the debug info.
        // In that case we need to look for it on the resolved value.
        debugInfo = resolvedValue._debugInfo;
      }
    }
  }
  if (debugInfo) {
    let startTime = 0;
    for (let i = 0; i < debugInfo.length; i++) {
      const info = debugInfo[i];
      if (typeof info.time === 'number') {
        startTime = info.time;
      }
      if (typeof info.name === 'string') {
        if (startTime < trackTime) {
          // The start time of this component is before the end time of the previous
          // component on this track so we need to bump the next one to a parallel track.
          trackIdx++;
        }
        trackTime = startTime;
        break;
      }
    }
    for (let i = debugInfo.length - 1; i >= 0; i--) {
      const info = debugInfo[i];
      if (typeof info.time === 'number') {
        if (info.time > parentEndTime) {
          parentEndTime = info.time;
          break; // We assume the highest number is at the end.
        }
      }
    }
  }

  const result: ProfilingResult = {
    track: trackIdx,
    endTime: -Infinity,
    component: null,
  };
  root._children = result;
  let childrenEndTime = -Infinity;
  let childTrackIdx = trackIdx;
  let childTrackTime = trackTime;
  for (let i = 0; i < children.length; i++) {
    const childResult = flushComponentPerformance(
      response,
      children[i],
      childTrackIdx,
      childTrackTime,
      parentEndTime,
    );
    if (childResult.component !== null) {
      result.component = childResult.component;
    }
    childTrackIdx = childResult.track;
    const childEndTime = childResult.endTime;
    if (childEndTime > childTrackTime) {
      childTrackTime = childEndTime;
    }
    if (childEndTime > childrenEndTime) {
      childrenEndTime = childEndTime;
    }
  }

  if (debugInfo) {
    // Write debug info in reverse order (just like stack traces).
    let componentEndTime = 0;
    let isLastComponent = true;
    let endTime = -1;
    let endTimeIdx = -1;
    for (let i = debugInfo.length - 1; i >= 0; i--) {
      const info = debugInfo[i];
      if (typeof info.time !== 'number') {
        continue;
      }
      if (componentEndTime === 0) {
        // Last timestamp is the end of the last component.
        componentEndTime = info.time;
      }
      const time = info.time;
      if (endTimeIdx > -1) {
        // Now that we know the start and end time, we can emit the entries between.
        for (let j = endTimeIdx - 1; j > i; j--) {
          const candidateInfo = debugInfo[j];
          if (typeof candidateInfo.name === 'string') {
            if (componentEndTime > childrenEndTime) {
              childrenEndTime = componentEndTime;
            }
            // $FlowFixMe[incompatible-type]: Refined.
            const componentInfo: ReactComponentInfo = candidateInfo;
            logComponentInfo(
              response,
              root,
              componentInfo,
              trackIdx,
              time,
              componentEndTime,
              childrenEndTime,
              isLastComponent,
            );
            componentEndTime = time; // The end time of previous component is the start time of the next.
            // Track the root most component of the result for deduping logging.
            result.component = componentInfo;
            isLastComponent = false;
          } else if (
            candidateInfo.awaited &&
            // Skip awaits on client resources since they didn't block the server component.
            candidateInfo.awaited.env != null
          ) {
            if (endTime > childrenEndTime) {
              childrenEndTime = endTime;
            }
            // $FlowFixMe[incompatible-type]: Refined.
            const asyncInfo: ReactAsyncInfo = candidateInfo;
            const env = response._rootEnvironmentName;
            const promise = asyncInfo.awaited.value;
            if (promise) {
              const thenable: Thenable<mixed> = promise as any;
              switch (thenable.status) {
                case INITIALIZED:
                  logComponentAwait(
                    asyncInfo,
                    trackIdx,
                    time,
                    endTime,
                    env,
                    thenable.value,
                  );
                  break;
                case ERRORED:
                  logComponentAwaitErrored(
                    asyncInfo,
                    trackIdx,
                    time,
                    endTime,
                    env,
                    thenable.reason,
                  );
                  break;
                default:
                  // We assume that we should have received the data by now since this is logged at the
                  // end of the response stream. This is more sensitive to ordering so we don't wait
                  // to log it.
                  logComponentAwait(
                    asyncInfo,
                    trackIdx,
                    time,
                    endTime,
                    env,
                    undefined,
                  );
                  break;
              }
            } else {
              logComponentAwait(
                asyncInfo,
                trackIdx,
                time,
                endTime,
                env,
                undefined,
              );
            }
          }
        }
      } else {
        // Anything between the end and now was aborted if it has no end time.
        // Either because the client stream was aborted reading it or the server stream aborted.
        endTime = time; // If we don't find anything else the endTime is the start time.
        for (let j = debugInfo.length - 1; j > i; j--) {
          const candidateInfo = debugInfo[j];
          if (typeof candidateInfo.name === 'string') {
            if (componentEndTime > childrenEndTime) {
              childrenEndTime = componentEndTime;
            }
            // $FlowFixMe[incompatible-type]: Refined.
            const componentInfo: ReactComponentInfo = candidateInfo;
            const env = response._rootEnvironmentName;
            logComponentAborted(
              componentInfo,
              trackIdx,
              time,
              componentEndTime,
              childrenEndTime,
              env,
            );
            componentEndTime = time; // The end time of previous component is the start time of the next.
            // Track the root most component of the result for deduping logging.
            result.component = componentInfo;
            isLastComponent = false;
          } else if (
            candidateInfo.awaited &&
            // Skip awaits on client resources since they didn't block the server component.
            candidateInfo.awaited.env != null
          ) {
            // If we don't have an end time for an await, that means we aborted.
            const asyncInfo: ReactAsyncInfo = candidateInfo;
            const env = response._rootEnvironmentName;
            if (asyncInfo.awaited.end > endTime) {
              endTime = asyncInfo.awaited.end; // Take the end time of the I/O as the await end.
            }
            if (endTime > childrenEndTime) {
              childrenEndTime = endTime;
            }
            logComponentAwaitAborted(asyncInfo, trackIdx, time, endTime, env);
          }
        }
      }
      endTime = time; // The end time of the next entry is this time.
      endTimeIdx = i;
    }
  }
  result.endTime = childrenEndTime;
  return result;
}

function flushInitialRenderPerformance(response: Response): void {
  if (
    enableProfilerTimer &&
    enableComponentPerformanceTrack &&
    response._replayConsole
  ) {
    const rootChunk = getChunk(response, 0);
    if (isArray(rootChunk._children)) {
      markAllTracksInOrder();
      flushComponentPerformance(response, rootChunk, 0, -Infinity, -Infinity);
    }
  }
}

function processFullBinaryRow(
  response: Response,
  streamState: StreamState,
  id: number,
  tag: number,
  buffer: Array<Uint8Array>,
  chunk: Uint8Array,
): void {
  switch (tag) {
    case 65 /* "A" */:
      // We must always clone to extract it into a separate buffer instead of just a view.
      resolveBuffer(
        response,
        id,
        mergeBuffer(buffer, chunk).buffer,
        streamState,
      );
      return;
    case 79 /* "O" */:
      resolveTypedArray(response, id, buffer, chunk, Int8Array, 1, streamState);
      return;
    case 111 /* "o" */:
      resolveBuffer(
        response,
        id,
        buffer.length === 0 ? chunk : mergeBuffer(buffer, chunk),
        streamState,
      );
      return;
    case 85 /* "U" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Uint8ClampedArray,
        1,
        streamState,
      );
      return;
    case 83 /* "S" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Int16Array,
        2,
        streamState,
      );
      return;
    case 115 /* "s" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Uint16Array,
        2,
        streamState,
      );
      return;
    case 76 /* "L" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Int32Array,
        4,
        streamState,
      );
      return;
    case 108 /* "l" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Uint32Array,
        4,
        streamState,
      );
      return;
    case 71 /* "G" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Float32Array,
        4,
        streamState,
      );
      return;
    case 103 /* "g" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        Float64Array,
        8,
        streamState,
      );
      return;
    case 77 /* "M" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        BigInt64Array,
        8,
        streamState,
      );
      return;
    case 109 /* "m" */:
      resolveTypedArray(
        response,
        id,
        buffer,
        chunk,
        BigUint64Array,
        8,
        streamState,
      );
      return;
    case 86 /* "V" */:
      resolveTypedArray(response, id, buffer, chunk, DataView, 1, streamState);
      return;
  }

  const stringDecoder = response._stringDecoder;
  let row = '';
  for (let i = 0; i < buffer.length; i++) {
    row += readPartialStringChunk(stringDecoder, buffer[i]);
  }
  row += readFinalStringChunk(stringDecoder, chunk);
  processFullStringRow(response, streamState, id, tag, row);
}

function processFullStringRow(
  response: Response,
  streamState: StreamState,
  id: number,
  tag: number,
  row: string,
): void {
  switch (tag) {
    case 73 /* "I" */: {
      resolveModule(response, id, row, streamState);
      return;
    }
    case 72 /* "H" */: {
      const code: HintCode = row[0] as any;
      resolveHint(response, code, row.slice(1));
      return;
    }
    case 69 /* "E" */: {
      resolveErrorModel(response, id, row, streamState);
      return;
    }
    case 84 /* "T" */: {
      resolveText(response, id, row, streamState);
      return;
    }
    case 78 /* "N" */: {
      if (
        enableProfilerTimer &&
        (enableComponentPerformanceTrack || enableAsyncDebugInfo)
      ) {
        // Track the time origin for future debug info. We track it relative
        // to the current environment's time space.
        const timeOrigin: number = +row;
        response._timeOrigin =
          timeOrigin -
          // $FlowFixMe[prop-missing]
          performance.timeOrigin;
        return;
      }
      // Fallthrough to share the error with Debug and Console entries.
    }
    case 68 /* "D" */: {
      if (__DEV__) {
        resolveDebugModel(response, id, row);
        return;
      }
      // Fallthrough to share the error with Console entries.
    }
    case 74 /* "J" */: {
      if (enableProfilerTimer && enableAsyncDebugInfo) {
        resolveIOInfo(response, id, row);
        return;
      }
      // Fallthrough to share the error with Console entries.
    }
    case 87 /* "W" */: {
      if (__DEV__) {
        resolveConsoleEntry(response, row);
        return;
      }
      throw new Error(
        'Failed to read a RSC payload created by a development version of React ' +
          'on the server while using a production version on the client. Always use ' +
          'matching versions on the server and the client.',
      );
    }
    case 82 /* "R" */: {
      startReadableStream(response, id, undefined, streamState);
      return;
    }
    // Fallthrough
    case 114 /* "r" */: {
      startReadableStream(response, id, 'bytes', streamState);
      return;
    }
    // Fallthrough
    case 88 /* "X" */: {
      startAsyncIterable(response, id, false, streamState);
      return;
    }
    // Fallthrough
    case 120 /* "x" */: {
      startAsyncIterable(response, id, true, streamState);
      return;
    }
    // Fallthrough
    case 67 /* "C" */: {
      stopStream(response, id, row);
      return;
    }
    // Fallthrough
    default: /* """ "{" "[" "t" "f" "n" "0" - "9" */ {
      if (__DEV__ && row === '') {
        resolveDebugHalt(response, id);
        return;
      }
      // We assume anything else is JSON.
      resolveModel(response, id, row, streamState);
      return;
    }
  }
}

export function processBinaryChunk(
  weakResponse: WeakResponse,
  streamState: StreamState,
  chunk: Uint8Array,
): void {
  if (hasGCedResponse(weakResponse)) {
    // Ignore more chunks if we've already GC:ed all listeners.
    return;
  }
  if (streamState._stringBuffer !== '') {
    // A row started as string chunks and continues as bytes: replay the
    // buffered text through this parser so it sees one contiguous byte
    // stream. The parser state still points into the buffered row.
    const bufferedText = streamState._stringBuffer;
    streamState._stringBuffer = '';
    if (stringChunkEncoder === null) {
      stringChunkEncoder = new TextEncoder();
    }
    const encodedText = stringChunkEncoder.encode(bufferedText);
    if (streamState._rowState === ROW_CHUNK_BY_LENGTH) {
      // Buffering the text already subtracted its bytes from the row's
      // remaining length; the byte parser is about to count them again.
      streamState._rowLength += encodedText.length;
    }
    processBinaryChunk(weakResponse, streamState, encodedText);
  }
  const response = unwrapWeakResponse(weakResponse);
  let i = 0;
  let rowState = streamState._rowState;
  let rowID = streamState._rowID;
  let rowTag = streamState._rowTag;
  let rowLength = streamState._rowLength;
  const buffer = streamState._buffer;
  const chunkLength = chunk.length;
  incrementChunkDebugInfo(streamState, chunkLength);
  while (i < chunkLength) {
    let lastIdx = -1;
    switch (rowState) {
      case ROW_ID: {
        const byte = chunk[i++];
        if (byte === 58 /* ":" */) {
          // Finished the rowID, next we'll parse the tag.
          rowState = ROW_TAG;
        } else {
          rowID = (rowID << 4) | (byte > 96 ? byte - 87 : byte - 48);
        }
        continue;
      }
      case ROW_TAG: {
        const resolvedRowTag = chunk[i];
        if (
          resolvedRowTag === 84 /* "T" */ ||
          resolvedRowTag === 65 /* "A" */ ||
          resolvedRowTag === 79 /* "O" */ ||
          resolvedRowTag === 111 /* "o" */ ||
          resolvedRowTag === 98 /* "b" */ ||
          resolvedRowTag === 85 /* "U" */ ||
          resolvedRowTag === 83 /* "S" */ ||
          resolvedRowTag === 115 /* "s" */ ||
          resolvedRowTag === 76 /* "L" */ ||
          resolvedRowTag === 108 /* "l" */ ||
          resolvedRowTag === 71 /* "G" */ ||
          resolvedRowTag === 103 /* "g" */ ||
          resolvedRowTag === 77 /* "M" */ ||
          resolvedRowTag === 109 /* "m" */ ||
          resolvedRowTag === 86 /* "V" */
        ) {
          rowTag = resolvedRowTag;
          rowState = ROW_LENGTH;
          i++;
        } else if (
          (resolvedRowTag > 64 && resolvedRowTag < 91) /* "A"-"Z" */ ||
          resolvedRowTag === 35 /* "#" */ ||
          resolvedRowTag === 114 /* "r" */ ||
          resolvedRowTag === 120 /* "x" */
        ) {
          rowTag = resolvedRowTag;
          rowState = ROW_CHUNK_BY_NEWLINE;
          i++;
        } else {
          rowTag = 0;
          rowState = ROW_CHUNK_BY_NEWLINE;
          // This was an unknown tag so it was probably part of the data.
        }
        continue;
      }
      case ROW_LENGTH: {
        const byte = chunk[i++];
        if (byte === 44 /* "," */) {
          // Finished the rowLength, next we'll buffer up to that length.
          rowState = ROW_CHUNK_BY_LENGTH;
        } else {
          rowLength = (rowLength << 4) | (byte > 96 ? byte - 87 : byte - 48);
        }
        continue;
      }
      case ROW_CHUNK_BY_NEWLINE: {
        // We're looking for a newline
        lastIdx = chunk.indexOf(10 /* "\n" */, i);
        break;
      }
      case ROW_CHUNK_BY_LENGTH: {
        // We're looking for the remaining byte length
        lastIdx = i + rowLength;
        if (lastIdx > chunk.length) {
          lastIdx = -1;
        }
        break;
      }
    }
    const offset = chunk.byteOffset + i;
    if (lastIdx > -1) {
      // We found the last chunk of the row
      const length = lastIdx - i;
      const lastChunk = new Uint8Array(chunk.buffer, offset, length);

      // Check if this is a Uint8Array for a byte stream. We enqueue it
      // immediately but need to determine if we can use zero-copy or must copy.
      if (rowTag === 98 /* "b" */) {
        resolveBuffer(
          response,
          rowID,
          // If we're at the end of the RSC chunk, no more parsing will access
          // this buffer and we don't need to copy the chunk to allow detaching
          // the buffer, otherwise we need to copy.
          lastIdx === chunkLength ? lastChunk : lastChunk.slice(),
          streamState,
        );
      } else {
        // Process all other row types.
        processFullBinaryRow(
          response,
          streamState,
          rowID,
          rowTag,
          buffer,
          lastChunk,
        );
      }

      // Reset state machine for a new row
      i = lastIdx;
      if (rowState === ROW_CHUNK_BY_NEWLINE) {
        // If we're trailing by a newline we need to skip it.
        i++;
      }
      rowState = ROW_ID;
      rowTag = 0;
      rowID = 0;
      rowLength = 0;
      buffer.length = 0;
    } else {
      // The rest of this row is in a future chunk.
      const length = chunk.byteLength - i;
      const remainingSlice = new Uint8Array(chunk.buffer, offset, length);

      // For byte streams, we can enqueue the partial row immediately without
      // copying since we're at the end of the RSC chunk and no more parsing
      // will access this buffer.
      if (rowTag === 98 /* "b" */) {
        // Update how many bytes we're still waiting for. We need to do this
        // before enqueueing, as enqueue will detach the buffer and byteLength
        // will become 0.
        rowLength -= remainingSlice.byteLength;
        resolveBuffer(response, rowID, remainingSlice, streamState);
      } else {
        // For other row types, stash the rest of the current chunk until we can
        // process the full row.
        buffer.push(remainingSlice);
        // Update how many bytes we're still waiting for. If we're looking for
        // a newline, this doesn't hurt since we'll just ignore it.
        rowLength -= remainingSlice.byteLength;
      }
      break;
    }
  }
  streamState._rowState = rowState;
  streamState._rowID = rowID;
  streamState._rowTag = rowTag;
  streamState._rowLength = rowLength;
}

// Returns the index at which byteBudget UTF-8 bytes have been consumed
// counting from start, or -1 if the string ends before consuming them. The
// producer frames rows on whole strings, so the budget always lands on a
// character boundary.
function indexOfUTF8ByteLength(
  chunk: string,
  start: number,
  byteBudget: number,
): number {
  let bytes = 0;
  let i = start;
  const length = chunk.length;
  while (i < length) {
    if (bytes === byteBudget) {
      return i;
    }
    const code = chunk.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
      i += 1;
    } else if (code < 0x800) {
      bytes += 2;
      i += 1;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // A surrogate pair encodes as one four byte character.
      bytes += 4;
      i += 2;
    } else {
      bytes += 3;
      i += 1;
    }
    if (bytes > byteBudget) {
      // The budget landed inside a character, which framing produced by a
      // Flight Server can't do.
      throw new Error(
        'A length-framed row ended inside a character. ' +
          'This is a bug in the wiring of the React streams.',
      );
    }
  }
  return bytes === byteBudget ? i : -1;
}

// Lazily created: only mixed transports that continue a binary row with a
// string chunk ever need to encode.
let stringChunkEncoder: null | TextEncoder = null;

function utf8ByteLength(chunk: string, start: number, end: number): number {
  let bytes = 0;
  let i = start;
  while (i < end) {
    const code = chunk.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
      i += 1;
    } else if (code < 0x800) {
      bytes += 2;
      i += 1;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 2;
    } else {
      bytes += 3;
      i += 1;
    }
  }
  return bytes;
}

export function processStringChunk(
  weakResponse: WeakResponse,
  streamState: StreamState,
  chunk: string,
): void {
  if (hasGCedResponse(weakResponse)) {
    // Ignore more chunks if we've already GC:ed all listeners.
    return;
  }
  const response = unwrapWeakResponse(weakResponse);
  // This is a fork of processBinaryChunk that takes a string as input.
  // This can't be just any binary chunk coverted to a string. It needs to be
  // in the same offsets given from the Flight Server. E.g. if it's shifted by
  // one byte then it won't line up to the UCS-2 encoding. It also needs to
  // be valid Unicode. Also binary chunks cannot use this even if they're
  // value Unicode. Large strings are encoded as binary and cannot be passed
  // here. Basically, only if Flight Server gave you this string as a chunk,
  // you can use it here.
  let i = 0;
  let rowState = streamState._rowState;
  let rowID = streamState._rowID;
  let rowTag = streamState._rowTag;
  let rowLength = streamState._rowLength;
  const buffer = streamState._buffer;
  const chunkLength = chunk.length;
  incrementChunkDebugInfo(streamState, chunkLength);
  while (i < chunkLength) {
    let lastIdx = -1;
    switch (rowState) {
      case ROW_ID: {
        const byte = chunk.charCodeAt(i++);
        if (byte === 58 /* ":" */) {
          // Finished the rowID, next we'll parse the tag.
          rowState = ROW_TAG;
        } else {
          rowID = (rowID << 4) | (byte > 96 ? byte - 87 : byte - 48);
        }
        continue;
      }
      case ROW_TAG: {
        const resolvedRowTag = chunk.charCodeAt(i);
        if (
          resolvedRowTag === 84 /* "T" */ ||
          resolvedRowTag === 65 /* "A" */ ||
          resolvedRowTag === 79 /* "O" */ ||
          resolvedRowTag === 111 /* "o" */ ||
          resolvedRowTag === 85 /* "U" */ ||
          resolvedRowTag === 83 /* "S" */ ||
          resolvedRowTag === 115 /* "s" */ ||
          resolvedRowTag === 76 /* "L" */ ||
          resolvedRowTag === 108 /* "l" */ ||
          resolvedRowTag === 71 /* "G" */ ||
          resolvedRowTag === 103 /* "g" */ ||
          resolvedRowTag === 77 /* "M" */ ||
          resolvedRowTag === 109 /* "m" */ ||
          resolvedRowTag === 86 /* "V" */
        ) {
          rowTag = resolvedRowTag;
          rowState = ROW_LENGTH;
          i++;
        } else if (
          (resolvedRowTag > 64 && resolvedRowTag < 91) /* "A"-"Z" */ ||
          resolvedRowTag === 114 /* "r" */ ||
          resolvedRowTag === 120 /* "x" */
        ) {
          rowTag = resolvedRowTag;
          rowState = ROW_CHUNK_BY_NEWLINE;
          i++;
        } else {
          rowTag = 0;
          rowState = ROW_CHUNK_BY_NEWLINE;
          // This was an unknown tag so it was probably part of the data.
        }
        continue;
      }
      case ROW_LENGTH: {
        const byte = chunk.charCodeAt(i++);
        if (byte === 44 /* "," */) {
          // Finished the rowLength, next we'll buffer up to that length.
          rowState = ROW_CHUNK_BY_LENGTH;
        } else {
          rowLength = (rowLength << 4) | (byte > 96 ? byte - 87 : byte - 48);
        }
        continue;
      }
      case ROW_CHUNK_BY_NEWLINE: {
        // We're looking for a newline
        lastIdx = chunk.indexOf('\n', i);
        break;
      }
      case ROW_CHUNK_BY_LENGTH: {
        if (rowTag !== 84) {
          // A binary row's bytes arrived in string form. The byte parser
          // handles every row kind, so encode the rest of this chunk and
          // continue there; the row's binary parts don't round-trip
          // through text.
          streamState._rowState = rowState;
          streamState._rowID = rowID;
          streamState._rowTag = rowTag;
          streamState._rowLength = rowLength;
          if (stringChunkEncoder === null) {
            stringChunkEncoder = new TextEncoder();
          }
          processBinaryChunk(
            weakResponse,
            streamState,
            stringChunkEncoder.encode(chunk.slice(i)),
          );
          return;
        }
        // rowLength counts the bytes of the row still unread; the chunk is
        // measured in UTF-16 code units, so the row's end is found by
        // walking the chunk's UTF-8 byte lengths.
        const split = indexOfUTF8ByteLength(chunk, i, rowLength);
        if (split === -1) {
          // The row continues in a future chunk.
          streamState._stringBuffer += chunk.slice(i);
          rowLength -= utf8ByteLength(chunk, i, chunk.length);
          i = chunkLength;
          continue;
        }
        lastIdx = split;
        break;
      }
    }
    if (lastIdx > -1) {
      // We found the last chunk of the row
      if (buffer.length > 0) {
        // The row started as binary parts, so it has to finish as one: its
        // buffered parts don't round-trip through text. Encode the rest of
        // this chunk and continue in the byte parser.
        streamState._rowState = rowState;
        streamState._rowID = rowID;
        streamState._rowTag = rowTag;
        streamState._rowLength = rowLength;
        if (stringChunkEncoder === null) {
          stringChunkEncoder = new TextEncoder();
        }
        processBinaryChunk(
          weakResponse,
          streamState,
          stringChunkEncoder.encode(chunk.slice(i)),
        );
        return;
      }
      let lastChunk = chunk.slice(i, lastIdx);
      if (streamState._stringBuffer !== '') {
        lastChunk = streamState._stringBuffer + lastChunk;
        streamState._stringBuffer = '';
      }
      processFullStringRow(response, streamState, rowID, rowTag, lastChunk);
      // Reset state machine for a new row
      i = lastIdx;
      if (rowState === ROW_CHUNK_BY_NEWLINE) {
        // If we're trailing by a newline we need to skip it.
        i++;
      }
      rowState = ROW_ID;
      rowTag = 0;
      rowID = 0;
      rowLength = 0;
      buffer.length = 0;
    } else if (chunk.length !== i) {
      // The rest of this newline-framed row is in a future chunk.
      streamState._stringBuffer += chunk.slice(i);
      i = chunkLength;
    }
  }
  streamState._rowState = rowState;
  streamState._rowID = rowID;
  streamState._rowTag = rowTag;
  streamState._rowLength = rowLength;
}

function scheduleDispatch(response: Response, dispatch: () => void): void {
  const scope = response._dispatchScope;
  if (scope !== null) {
    // Run within the consumer's captured async scope so the dispatch can
    // resolve the consuming renderer's request.
    scope(dispatch);
    return;
  }
  const deferred = response._deferredDispatches;
  if (deferred !== null) {
    // The consumer hasn't read anything yet; hold the dispatch until its
    // scope is captured.
    deferred.push(dispatch);
    return;
  }
  dispatch();
}

// Captures the async scope of the consumer's first read. Everything
// buffered so far flushes through it, and future dispatches run through it
// the moment their row is delivered — the same timing a byte stream's
// subscription gives them.
export function provideDispatchScope(
  weakResponse: WeakResponse,
  runInScope: (dispatch: () => void) => void,
): void {
  if (hasGCedResponse(weakResponse)) {
    return;
  }
  const response = unwrapWeakResponse(weakResponse);
  if (response._dispatchScope !== null) {
    return;
  }
  response._dispatchScope = runInScope;
  const deferred = response._deferredDispatches;
  response._deferredDispatches = null;
  if (deferred !== null && deferred.length > 0) {
    // Enter the captured scope once for the whole backlog.
    runInScope(() => {
      for (let i = 0; i < deferred.length; i++) {
        deferred[i]();
      }
    });
  }
}

export function connectRenderResult(
  weakResponse: WeakResponse,
  result: RenderResult,
  streamState: StreamState,
): void {
  if (!hasGCedResponse(weakResponse)) {
    unwrapWeakResponse(weakResponse)._deferredDispatches = [];
  }
  result._attach({
    row: (id: number, tag: string, payload: mixed, plainModel: boolean) =>
      processModelRow(weakResponse, streamState, id, tag, payload, plainModel),
    close: () => close(weakResponse),
    error: (reason: mixed) => reportGlobalError(weakResponse, reason as any),
  });
}

export function processModelRow(
  weakResponse: WeakResponse,
  streamState: StreamState,
  id: number,
  tag: string,
  payload: mixed,
  plainModel: boolean,
): void {
  if (hasGCedResponse(weakResponse)) {
    // Ignore more rows if we've already GC:ed all listeners.
    return;
  }
  const response = unwrapWeakResponse(weakResponse);
  switch (tag) {
    case '': {
      // An untagged model row. Objects arrive parsed but not yet revived;
      // strings are always the row's JSON text; an empty payload marks a
      // DEV-only halted row which intentionally never resolves.
      if (payload === '' || payload === undefined) {
        if (__DEV__) {
          resolveDebugHalt(response, id);
        }
        return;
      }
      if (typeof payload === 'string') {
        // The model's JSON text: primitives and DEV-only pre-serialized rows.
        resolveModel(response, id, payload, streamState);
      } else if (plainModel) {
        resolveInitializedModel(response, id, payload as any, streamState);
      } else {
        resolveModelObject(response, id, payload as any, streamState);
      }
      return;
    }
    case 'T': {
      // Text rows skip the wire's byte-length framing entirely.
      resolveText(response, id, payload as any, streamState);
      return;
    }
    case 'A': {
      // An ArrayBuffer, delivered as a view over exactly its bytes.
      resolveBuffer(response, id, (payload as any).buffer, streamState);
      return;
    }
    case 'O':
    case 'o':
    case 'U':
    case 'S':
    case 's':
    case 'L':
    case 'l':
    case 'G':
    case 'g':
    case 'M':
    case 'm':
    case 'V':
    case 'b': {
      // Binary rows are delivered as a view that already has the row's
      // type, so nothing needs to be reconstructed from raw bytes.
      resolveBuffer(response, id, payload as any, streamState);
      return;
    }
    default: {
      // Everything else is delivered as the same text that frames the row
      // on the wire, so it takes the exact same path a byte stream takes
      // after it has parsed a row.
      processFullStringRow(
        response,
        streamState,
        id,
        tag.charCodeAt(0),
        payload as any,
      );
      return;
    }
  }
}

function parseModel<T>(response: Response, json: UninitializedModel): T {
  const rawModel = JSON.parse(json);
  // Pass a wrapper object as parentObject to match the original JSON.parse
  // reviver behavior, where the root value's reviver receives {"": rootValue}
  // as `this`. This ensures parentObject is never null when accessed downstream.
  return reviveModel(response, rawModel, {'': rawModel}, '');
}

function reviveModel(
  response: Response,
  value: JSONValue,
  parentObject: Object,
  key: string,
): any {
  if (typeof value === 'string') {
    if (value[0] === '$') {
      return parseModelString(response, parentObject, key, value);
    }
    return value;
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const walked = reviveModel(response, value[i], value, '' + i);
      if (walked !== value[i]) {
        // Only write on change: unchanged values may be the producer's own
        // objects, which can be frozen.
        (value as any)[i] = walked;
      }
    }
    // $FlowFixMe[invalid-compare]
    if (value[0] === REACT_ELEMENT_TYPE) {
      // React element tuple
      return parseModelTuple(response, value);
    }
    return value;
  }
  // Plain object
  for (const k in value) {
    if (k === __PROTO__) {
      delete (value as any)[k];
    } else {
      const walked = reviveModel(response, (value as any)[k], value, k);
      if (walked === undefined) {
        delete (value as any)[k];
      } else if (walked !== (value as any)[k]) {
        // Only write on change: unchanged values may be the producer's own
        // objects, which can be frozen.
        (value as any)[k] = walked;
      }
    }
  }
  return value;
}

export function close(weakResponse: WeakResponse): void {
  // In case there are any remaining unresolved chunks, they won't be resolved
  // now. So we either error or halt them depending on whether partial streams
  // are allowed.
  // TODO: Ideally we should be able to bail out early if we kept a ref count of
  // pending chunks.
  if (hasGCedResponse(weakResponse)) {
    return;
  }
  const response = unwrapWeakResponse(weakResponse);
  if (response._allowPartialStream) {
    // For partial streams, we halt pending chunks instead of erroring them.
    response._closed = true;
    response._chunks.forEach(chunk => {
      if (chunk.status === PENDING) {
        // Clear listeners to release closures and transition to HALTED.
        // Future .then() calls on HALTED chunks are no-ops.
        releasePendingChunk(response, chunk);
        const haltedChunk: HaltedChunk<any> = chunk as any;
        haltedChunk.status = HALTED;
        haltedChunk.value = null;
        haltedChunk.reason = null;
      } else if (chunk.status === INITIALIZED && chunk.reason !== null) {
        // Stream chunk - close gracefully instead of erroring.
        chunk.reason.close('"$undefined"');
      }
    });
    if (__DEV__) {
      const debugChannel = response._debugChannel;
      if (debugChannel !== undefined) {
        closeDebugChannel(debugChannel);
        response._debugChannel = undefined;
        if (debugChannelRegistry !== null) {
          debugChannelRegistry.unregister(response);
        }
      }
    }
  } else {
    reportGlobalError(weakResponse, new Error('Connection closed.'));
  }
}

function getCurrentOwnerInDEV(): null | ReactComponentInfo {
  return currentOwnerInDEV;
}

export function injectIntoDevTools(): boolean {
  const internals: Object = {
    bundleType: __DEV__ ? 1 : 0, // Might add PROFILE later.
    version: rendererVersion,
    rendererPackageName: rendererPackageName,
    currentDispatcherRef: ReactSharedInternals,
    // Enables DevTools to detect reconciler version rather than renderer version
    // which may not match for third party renderers.
    reconcilerVersion: ReactVersion,
    getCurrentComponentInfo: getCurrentOwnerInDEV,
  };
  return injectInternals(internals);
}
