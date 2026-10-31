/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable, ReactKey} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {Result} from 'shared/ReactFlightResult';
import type {RequestCleanupQueue} from 'react/src/ReactTaintRegistry';
import type {
  ClientReference,
  ClientReferenceMetadata,
  ServerConsumerModuleMap,
  ServerManifest,
  ModuleLoading,
} from './ReactFlightClientConfig';
import type {ClientReferenceMetadata as ServerClientReferenceMetadata} from 'react-server/src/ReactFlightServerConfig';
import type {
  CallServerCallback,
  EncodeFormActionCallback,
} from './ReactFlightReplyClient';
import type {TemporaryReferenceSet} from './ReactFlightTemporaryReferences';

import {
  resolveClientReference,
  resolveServerReference,
  preloadModule,
  requireModule,
  prepareDestinationForModule,
  dispatchHint,
} from './ReactFlightClientConfig';
import {subscribeToHints} from 'shared/ReactFlightRenderContext';
import {
  createBoundServerReference,
  registerBoundServerReference,
} from './ReactFlightReplyClient';
import {readTemporaryReference} from './ReactFlightTemporaryReferences';

import {enableTaint} from 'shared/ReactFeatureFlags';

import {
  PENDING as TASK_PENDING,
  FULFILLED as TASK_FULFILLED,
  getResultTask,
  retainResult,
  releaseResult,
  getIteratorEntries,
  getStreamReplay,
  getAsyncIterableReplay,
  createReplayReadableStream,
  createReplayAsyncIterable,
  isSingleShotIterator,
} from 'shared/ReactFlightResult';

import {
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_LEGACY_ELEMENT_TYPE,
  REACT_MEMO_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_OPTIMISTIC_KEY,
  ASYNC_ITERATOR,
  getIteratorFn,
} from 'shared/ReactSymbols';
import isArray from 'shared/isArray';
import getPrototypeOf from 'shared/getPrototypeOf';
import binaryToComparableString from 'shared/binaryToComparableString';
import {
  describeObjectForErrorMessage,
  jsxPropsParents,
  jsxChildrenParents,
} from 'shared/ReactSerializationErrors';

const ObjectPrototype = Object.prototype;

const emptyRoot = {};

// Reads a Result in the same process, for the renderer that consumes the
// Server Component output on the server, like Fizz rendering the HTML of a
// page. The model is walked once and what the serializer would have changed
// is applied as we go: a Server Component element is replaced by the value
// its Result task returned, a value that can't be passed to a Client
// Component is rejected with the same error. Everything else is returned
// as is, since it's already in this process: a plain object is only copied
// if something inside it changed.

// How the reader tells the server's references apart. These are the
// functions of the server's bundler config, which the entry point passes in
// because the reader runs in the server consumer's module graph.
export type ReferenceBundler = {
  isClientReference: (reference: any) => boolean,
  resolveClientReferenceMetadata: (
    reference: any,
  ) => ServerClientReferenceMetadata,
  isServerReference: (reference: any) => boolean,
  getServerReferenceId: (reference: any) => string,
  getServerReferenceBoundArguments: (reference: any) => null | Array<any>,
  // The id the server registered a temporary reference under, if any.
  resolveTemporaryReference: (value: any) => void | string,
};

export type ResultResponse = {
  _result: Result<any>,
  _bundlerConfig: ServerConsumerModuleMap,
  _serverReferenceConfig: null | ServerManifest,
  _moduleLoading: ModuleLoading,
  _nonce: ?string,
  _bundler: ReferenceBundler,
  _callServer: CallServerCallback,
  _encodeFormAction: void | EncodeFormActionCallback,
  _temporaryReferences: void | TemporaryReferenceSet,
  // Runs a callback in the async context this consumer was created in,
  // which is the render consuming the Result. Resource hints are dispatched
  // through it, since the DOM dispatcher finds the renderer through that
  // context, and a Server Component may emit a hint after an await, or
  // while another consumer runs it.
  _bindToConsumer: null | (<R>(callback: () => R) => R),
  // Client Reference id -> the chunk that loads its module. On the wire each
  // module is its own row, referenced from every place it's used.
  _modules: Map<string, SomeChunk<any>>,
  // Server Reference -> the chunk with the function this consumer gets for
  // it, which is also one row on the wire.
  _serverReferences: Map<any, SomeChunk<any>>,
  _onError: (error: mixed) => ?string,
  // Server object -> what this consumer got for it, when that is a different
  // object: a container that was copied because something inside it
  // changed, or an element. A plain object that was returned as is isn't
  // recorded, since it's its own record and a page can hold tens of
  // thousands of them.
  _models: Map<any, any>,
  // The models recorded by the row being read, in order, so that a row that
  // has to wait for something can forget them and start over.
  _recorded: Array<any>,
  // The containers being read, outermost first.
  _visiting: Array<any>,
  // Chunks waiting for something in the model, to reject if the Result is
  // aborted. A chunk waiting for a module isn't among them: modules load on
  // this side, like on the client.
  _pendingChunks: Set<SomeChunk<any>>,
  // Detaches this consumer from the Result's hints and abort once it is
  // closed.
  _unsubscribe: null | (() => void),
  // The first error met while reading the values inside the current element.
  // Like the serializer we report every invalid value in an element and
  // keep reading its siblings, then fail the element once.
  _readError: null | Error,
  // enableTaint. Tainted values whose lifetime ended while this consumer
  // was reading, which stay tainted until it's done, like for a request.
  _taintCleanupQueue: null | RequestCleanupQueue,
  // enableTaint. Blob -> the chunk that has checked its bytes.
  _blobs: null | Map<Blob, SomeChunk<Blob>>,
};

// The key context a value is read in, which is the keyPath and implicitSlot
// of the serializer's task at that point. The keys of the Server Components
// a terminal element is rendered through prefix its key; a Server Component
// without a key in a slot of its own means the terminal needs an implicit
// one. The props and children of a terminal are read in the enclosing
// context, since the serializer restores its task's context once it has
// rendered the terminal and before it recurses into them.
type KeyContext = {
  +keyPath: ReactKey,
  +implicitSlot: boolean,
  +enclosing: KeyContext,
};

function createRootKeyContext(): KeyContext {
  const context: KeyContext = {
    keyPath: null,
    implicitSlot: false,
    enclosing: null as any,
  };
  (context as any).enclosing = context;
  return context;
}
const rootKeyContext: KeyContext = createRootKeyContext();

// The context inside a Server Component with this key, like the keyPath and
// implicitSlot renderFunctionComponent sets before rendering its output.
function enterServerComponent(context: KeyContext, key: ReactKey): KeyContext {
  const prevKeyPath = context.keyPath;
  if (key !== null) {
    // Append the key to the path. Technically a null key should really add the child
    // index. We don't do that to hold the payload small and implementation simple.
    let keyPath;
    if (key === REACT_OPTIMISTIC_KEY || prevKeyPath === REACT_OPTIMISTIC_KEY) {
      // The optimistic key is viral. It turns the whole key into optimistic if any part is.
      keyPath = REACT_OPTIMISTIC_KEY;
    } else {
      keyPath = prevKeyPath === null ? key : prevKeyPath + ',' + key;
    }
    return {
      keyPath,
      implicitSlot: context.implicitSlot,
      enclosing: context.enclosing,
    };
  } else if (prevKeyPath === null && !context.implicitSlot) {
    // This sequence of Server Components has no keys. This means that it was rendered
    // in a slot that needs to assign an implicit key. Even if children below have
    // explicit keys, they should not be used for the outer most key since it might
    // collide with other slots in that set.
    return {keyPath: null, implicitSlot: true, enclosing: context.enclosing};
  }
  return context;
}

// The key of a terminal element rendered in this context, like
// renderClientElement computes it.
function terminalKey(context: KeyContext, key: ReactKey): ReactKey {
  // We prepend the terminal client element that actually gets serialized with
  // the keys of any Server Components which are not serialized.
  const keyPath = context.keyPath;
  if (key === null) {
    return keyPath;
  } else if (keyPath !== null) {
    if (keyPath === REACT_OPTIMISTIC_KEY || key === REACT_OPTIMISTIC_KEY) {
      // Optimistic key is viral and turns the whole key optimistic.
      return REACT_OPTIMISTIC_KEY;
    }
    return keyPath + ',' + key;
  }
  return key;
}

// Chunk status. These are the statuses use() understands, plus one for a
// module that has loaded but hasn't been required yet.
const PENDING = 'pending';
const RESOLVED_MODULE = 'resolved_module';
const INITIALIZED = 'fulfilled';
const ERRORED = 'rejected';

type PendingChunk<T> = {
  status: 'pending',
  value: null | Array<(T) => mixed>,
  reason: null | Array<(mixed) => mixed>,
  _response: ResultResponse,
  _context: KeyContext,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type ResolvedModuleChunk<T> = {
  status: 'resolved_module',
  value: ClientReference<T>,
  reason: null,
  _response: ResultResponse,
  _context: KeyContext,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type InitializedChunk<T> = {
  status: 'fulfilled',
  value: T,
  reason: null,
  _response: ResultResponse,
  _context: KeyContext,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type ErroredChunk<T> = {
  status: 'rejected',
  value: null,
  reason: mixed,
  _response: ResultResponse,
  _context: KeyContext,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type SomeChunk<T> =
  | PendingChunk<T>
  | ResolvedModuleChunk<T>
  | InitializedChunk<T>
  | ErroredChunk<T>;

// $FlowFixMe[missing-this-annot]
function ReactPromise(
  status: any,
  value: any,
  reason: any,
  response: ResultResponse,
  context: KeyContext,
) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  this._response = response;
  // The key context the chunk's model is read in.
  this._context = context;
}
// We subclass Promise.prototype so that we get other methods like .catch
ReactPromise.prototype = Object.create(Promise.prototype) as any;
// TODO: This doesn't return a new Promise chain unlike the real .then
function reactPromiseThen<T>(
  this: SomeChunk<T>,
  resolve: (value: T) => mixed,
  reject?: (reason: mixed) => mixed,
) {
  const chunk: SomeChunk<T> = this;
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      if (typeof resolve === 'function') {
        resolve(chunk.value);
      }
      break;
    case PENDING:
      if (typeof resolve === 'function') {
        if (chunk.value === null) {
          chunk.value = [] as Array<(T) => mixed>;
        }
        chunk.value.push(resolve);
      }
      if (typeof reject === 'function') {
        if (chunk.reason === null) {
          chunk.reason = [] as Array<(mixed) => mixed>;
        }
        chunk.reason.push(reject);
      }
      break;
    default:
      if (typeof reject === 'function') {
        reject(chunk.reason);
      }
      break;
  }
}
// The shadowing `then` must be defined with `Object.defineProperty` instead of
// assignment. Assignment would throw when `Promise.prototype` is frozen (e.g.
// by SES lockdown) because assigning over an inherited non-writable property
// is rejected.
Object.defineProperty(ReactPromise.prototype, 'then', {
  writable: true,
  enumerable: true,
  configurable: true,
  value: reactPromiseThen,
});

function readChunk<T>(chunk: SomeChunk<T>): T {
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      return chunk.value;
    case PENDING:
      // eslint-disable-next-line no-throw-literal
      throw chunk as any as Thenable<T>;
    default:
      throw chunk.reason;
  }
}

function createPendingChunk<T>(
  response: ResultResponse,
  context: KeyContext,
): PendingChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  const chunk = new ReactPromise(PENDING, null, null, response, context);
  response._pendingChunks.add(chunk);
  return chunk;
}

function createPendingModuleChunk<T>(
  response: ResultResponse,
): PendingChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(PENDING, null, null, response, null as any);
}

function createErrorChunk<T>(
  response: ResultResponse,
  error: mixed,
): ErroredChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, error, response, null as any);
}

function createInitializedChunk<T>(
  response: ResultResponse,
  value: T,
): InitializedChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, null, response, null as any);
}

// A chunk for a model that's already here, read right away.
function createModelChunk<T>(
  response: ResultResponse,
  model: any,
  context: KeyContext,
): SomeChunk<T> {
  const chunk: SomeChunk<T> = createPendingChunk(response, context);
  resolveModelChunk(response, chunk, model);
  return chunk;
}

function createResolvedModuleChunk<T>(
  response: ResultResponse,
  value: ClientReference<T>,
): ResolvedModuleChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODULE, value, null, response, null as any);
}

function wakeChunk<T>(listeners: Array<(T) => mixed>, value: T): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](value);
  }
}

function wakeChunkIfInitialized<T>(
  chunk: SomeChunk<T>,
  resolveListeners: Array<(T) => mixed>,
  rejectListeners: null | Array<(mixed) => mixed>,
): void {
  switch (chunk.status) {
    case INITIALIZED:
      wakeChunk(resolveListeners, chunk.value);
      break;
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
        wakeChunk(rejectListeners, chunk.reason);
      }
      break;
  }
}

function fulfillChunk<T>(chunk: SomeChunk<T>, value: T): void {
  if (chunk.status !== PENDING) {
    return;
  }
  chunk._response._pendingChunks.delete(chunk);
  const listeners = chunk.value;
  const initializedChunk: InitializedChunk<T> = chunk as any;
  initializedChunk.status = INITIALIZED;
  initializedChunk.value = value;
  initializedChunk.reason = null;
  if (listeners !== null) {
    wakeChunk(listeners, value);
  }
}

function triggerErrorOnChunk<T>(chunk: SomeChunk<T>, error: mixed): void {
  if (chunk.status !== PENDING) {
    return;
  }
  chunk._response._pendingChunks.delete(chunk);
  const listeners = chunk.reason;
  const erroredChunk: ErroredChunk<T> = chunk as any;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;
  if (listeners !== null) {
    wakeChunk(listeners, error);
  }
}

// Reads the model that arrived for a pending chunk and settles the chunk
// with what it reads. The model is read now rather than when the chunk is
// first read, since the serializer would have reported anything invalid in
// it at this point too. A chunk is a row: a value that couldn't be read
// anywhere inside it fails the whole chunk, like a row with an error
// reference in it fails on the client.
function resolveModelChunk<T>(
  response: ResultResponse,
  chunk: SomeChunk<T>,
  model: any,
): void {
  if (chunk.status !== PENDING) {
    return;
  }
  const prevReadError = response._readError;
  response._readError = null;
  const recorded = response._recorded.length;
  let value;
  try {
    value = readModel(response, model, chunk._context, emptyRoot, '');
  } catch (thrown) {
    response._readError = prevReadError;
    if (isThenable(thrown)) {
      // Something inside the model is still loading, like a Client
      // Component's module. The chunk waits for it and reads the model again
      // then, the way a row waits for a reference inside it before it
      // initializes.
      forgetModels(response, recorded);
      const retry = () => resolveModelChunk(response, chunk, model);
      thrown.then(retry, retry);
      return;
    }
    // The value at the top of the row can't be read, so the row fails with
    // it, the way a task errors when its model does.
    triggerErrorOnChunk(chunk, reportReadError(response, thrown));
    return;
  }
  const error = response._readError;
  response._readError = prevReadError;
  if (error !== null) {
    triggerErrorOnChunk(chunk, error);
    return;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof === REACT_LAZY_TYPE &&
    value._init === readChunk
  ) {
    // The model itself is still pending, like a Server Component at the top
    // of this row that hasn't returned yet. The row waits for it instead of
    // referring to it lazily, the way the serializer's task retries until
    // the model at its root renders. Only a nested position can refer to a
    // pending value lazily.
    const inner: SomeChunk<T> = value._payload;
    inner.then(
      resolvedValue => fulfillChunk(chunk, resolvedValue),
      reason => triggerErrorOnChunk(chunk, reason),
    );
    return;
  }
  fulfillChunk(chunk, value);
}

function resolveModuleChunk<T>(
  response: ResultResponse,
  chunk: SomeChunk<T>,
  value: ClientReference<T>,
): void {
  if (chunk.status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }
  chunk._response._pendingChunks.delete(chunk);
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk: ResolvedModuleChunk<T> = chunk as any;
  resolvedChunk.status = RESOLVED_MODULE;
  resolvedChunk.value = value;
  resolvedChunk.reason = null;
  if (resolveListeners !== null) {
    initializeModuleChunk(resolvedChunk);
    wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
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

function createLazyChunkWrapper<T>(
  chunk: SomeChunk<T>,
): LazyComponent<T, SomeChunk<T>> {
  const lazyType: LazyComponent<T, SomeChunk<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: chunk,
    _init: readChunk,
  };
  if (__DEV__) {
    // The key was validated when the element was created on the server.
    lazyType._store = {validated: 1};
  }
  return lazyType;
}

// The error the renderer sees for an error that happened on the server. In
// production the message is replaced with a generic one, like it is for an
// error row on the wire. The digest is how a server error is identified.
function resolveErrorProd(response: ResultResponse): Error {
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

// Like emitErrorChunk and resolveErrorDev together: the error the client
// would build from the error row, with the cause and an AggregateError's
// errors read as values.
function resolveErrorDev(response: ResultResponse, reason: mixed): Error {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resolveErrorDev should never be called in production mode. Use resolveErrorProd instead. This is a bug in React.',
    );
  }
  let name: string = 'Error';
  let message: string;
  let stack: void | string;
  let env = (0, response._result.environmentName)();
  let errorOptions: void | {cause: mixed};
  let errors: null | Array<mixed> = null;
  if (reason instanceof Error) {
    name = reason.name;
    // eslint-disable-next-line react-internal/safe-string-coercion
    message = String(reason.message);
    stack = reason.stack;
    const errorEnv = (reason as any).environmentName;
    if (typeof errorEnv === 'string') {
      // This probably came from another FlightClient as a pass through.
      // Keep the environment name.
      env = errorEnv;
    }
    if ('cause' in reason) {
      // The serializer outlines the cause in a row of its own, so it's read
      // outside any key context.
      errorOptions = {
        cause: readModel(
          response,
          reason.cause,
          rootKeyContext,
          reason,
          'cause',
        ),
      };
    }
    if (
      typeof AggregateError !== 'undefined' &&
      reason instanceof AggregateError
    ) {
      errors = readModel(
        response,
        reason.errors,
        rootKeyContext,
        reason,
        'errors',
      );
    }
  } else if (typeof reason === 'object' && reason !== null) {
    message = describeObjectForErrorMessage(reason);
  } else {
    // eslint-disable-next-line react-internal/safe-string-coercion
    message = String(reason);
  }
  let error;
  if (errors !== null) {
    // $FlowFixMe[extra-arg] AggregateError takes options like Error does
    error = new AggregateError(errors, message, errorOptions);
  } else {
    // eslint-disable-next-line react-internal/prod-error-codes
    error = new Error(message, errorOptions);
  }
  error.name = name;
  if (stack !== undefined) {
    error.stack = stack;
  }
  (error as any).environmentName = env;
  return error;
}

function resolveError(
  response: ResultResponse,
  reason: mixed,
  digest: string,
): Error {
  const error = __DEV__
    ? resolveErrorDev(response, reason)
    : resolveErrorProd(response);
  (error as any).digest = digest;
  return error;
}

function logRecoverableError(response: ResultResponse, error: mixed): string {
  const result = response._result;
  if (typeof error === 'object' && error !== null) {
    const knownDigest = result.errorDigests.get(error);
    if (knownDigest !== undefined) {
      // Another consumer of the Result already reported this error.
      return knownDigest;
    }
  }
  const onError = response._onError;
  const errorDigest = onError(error);
  if (errorDigest != null && typeof errorDigest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      `onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "${typeof errorDigest}" instead`,
    );
  }
  const digest = errorDigest || '';
  if (typeof error === 'object' && error !== null) {
    result.errorDigests.set(error, digest);
  }
  return digest;
}

// Reports an error that happened while reading, like a value the serializer
// would have rejected, and returns the error the renderer sees for it.
function reportReadError(response: ResultResponse, error: mixed): Error {
  const digest = logRecoverableError(response, error);
  return resolveError(response, error, digest);
}

// Errors a chunk with a rejection from the server, reporting it, unless the
// chunk already errored, like when the Result was aborted.
function reportErrorOnChunk(
  response: ResultResponse,
  chunk: SomeChunk<any>,
  reason: mixed,
): void {
  if (chunk.status !== PENDING) {
    return;
  }
  triggerErrorOnChunk(chunk, reportReadError(response, reason));
}

function createElement(type: any, key: ReactKey, props: any): any {
  let element: any;
  if (__DEV__) {
    element = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      props,
      _owner: null,
    } as any;
    Object.defineProperty(element, 'ref', {
      enumerable: false,
      get: nullRefGetter,
    });
    element._store = {} as {validated?: number};
    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      // The key was validated when the element was created on the server.
      value: 1,
    });
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
      value: null,
    });
    Object.defineProperty(element, '_debugTask', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null,
    });
  } else {
    element = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: null,
      props,
    };
  }
  return element;
}

function nullRefGetter() {
  if (__DEV__) {
    return null;
  }
}

// Reads one value, like renderModel on the server: if it can't be read, the
// error is reported and remembered as the error of the row being read, and
// the rest of the row is still read and reported. The row fails once at the
// end. On the server each invalid value becomes an error reference in the
// row; here it becomes undefined, since the row fails anyway.
function readValue(
  response: ResultResponse,
  value: any,
  context: KeyContext,
  parent: Object,
  parentPropertyName: string,
): any {
  try {
    return readModel(response, value, context, parent, parentPropertyName);
  } catch (thrown) {
    if (isThenable(thrown)) {
      // A reference inside is still loading. Let the row wait for it.
      throw thrown;
    }
    const error = reportReadError(response, thrown);
    if (response._readError === null) {
      response._readError = error;
    }
    return undefined;
  }
}

function recordModel(response: ResultResponse, model: any, read: any): void {
  response._models.set(model, read);
  response._recorded.push(model);
}

// Forgets what a row recorded before it had to wait for something. The row
// is read again from the start when it retries, and anything it created
// before, like a copy it left half filled, must not be found by that read.
function forgetModels(response: ResultResponse, recorded: number): void {
  const models = response._models;
  const list = response._recorded;
  for (let i = recorded; i < list.length; i++) {
    models.delete(list[i]);
  }
  list.length = recorded;
}

// Starts reading a container. Returns null, or if the container is already
// being read higher up the stack, the copy that read will fill in: a cycle
// can't be returned as is, since the reference inside it has to point at
// what this consumer gets for the container, the way a reference to an
// outer row by path resolves to the object that row creates. The stack is
// short for any realistic model, so checking it is cheap.
function enterContainer(
  response: ResultResponse,
  container: any,
  createCopy: () => any,
): null | any {
  const visiting = response._visiting;
  if (visiting.indexOf(container) !== -1) {
    return copyOf(response, container, createCopy);
  }
  visiting.push(container);
  return null;
}

function exitContainer(response: ResultResponse): void {
  response._visiting.pop();
}

// The copy this consumer gets for a container, created on first use so that
// a reference inside a cycle and the read that finds a changed value share
// it.
function copyOf(
  response: ResultResponse,
  container: any,
  createCopy: () => any,
): any {
  let copy = response._models.get(container);
  if (copy === undefined) {
    copy = createCopy();
    recordModel(response, container, copy);
  }
  return copy;
}

function createArrayCopy(): Array<any> {
  return [];
}

function createObjectCopy(): {[key: string]: any} {
  return {};
}

function createMapCopy(): Map<any, any> {
  return new Map();
}

function createSetCopy(): Set<any> {
  return new Set();
}

// An array is a fragment. Like renderFragment on the server, one rendered
// through a keyed Server Component is wrapped in a keyed Fragment element
// so that the whole set can move together.
function readFragment(
  response: ResultResponse,
  children: Array<any>,
  context: KeyContext,
): any {
  if (context.keyPath !== null) {
    // We have a Server Component that specifies a key but we're now splitting
    // the tree using a fragment.
    const fragment = createElement(REACT_FRAGMENT_TYPE, context.keyPath, {
      children: readArray(response, children, context.enclosing),
    });
    if (!context.implicitSlot) {
      // If this was keyed inside a set. I.e. the outer Server Component was keyed
      // then we need to handle reorders of the whole set. To do this we need to wrap
      // this array in a keyed Fragment.
      return fragment;
    }
    // If the outer Server Component was implicit but then an inner one had a key
    // we don't actually need to be able to move the whole set around. It'll always be
    // in an implicit slot. The key only exists to be able to reset the state of the
    // children. We wrap it with an unkeyed fragment and inner keyed fragment, like
    // the serializer does.
    return [fragment];
  }
  // The children are read in the enclosing context, like the serializer
  // recurses into them once its task's context is restored.
  return readArray(response, children, context.enclosing);
}

function readArray(
  response: ResultResponse,
  array: Array<any>,
  context: KeyContext,
): Array<any> {
  const cycle = enterContainer(response, array, createArrayCopy);
  if (cycle !== null) {
    return cycle;
  }
  let copy: null | Array<any> = null;
  try {
    for (let i = 0; i < array.length; i++) {
      const child = array[i];
      const read = readValue(response, child, context, array, '' + i);
      if (copy === null) {
        if (read === child) {
          continue;
        }
        copy = copyOf(response, array, createArrayCopy);
        for (let j = 0; j < i; j++) {
          copy[j] = array[j];
        }
      }
      copy[i] = read;
    }
  } finally {
    exitContainer(response);
  }
  return copy === null ? array : copy;
}

function readObject(
  response: ResultResponse,
  object: {[key: string]: any},
  context: KeyContext,
): {[key: string]: any} {
  const cycle = enterContainer(response, object, createObjectCopy);
  if (cycle !== null) {
    return cycle;
  }
  let copy: null | {[key: string]: any} = null;
  try {
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const child = object[key];
      // JSON drops a property whose value is undefined, and the client never
      // assigns __proto__.
      const read =
        child === undefined || key === '__proto__'
          ? undefined
          : readValue(response, child, context, object, key);
      if (copy === null) {
        if (read === child && child !== undefined) {
          continue;
        }
        copy = copyOf(response, object, createObjectCopy);
        for (let j = 0; j < i; j++) {
          copy[keys[j]] = object[keys[j]];
        }
      }
      if (read !== undefined) {
        copy[key] = read;
      }
    }
  } finally {
    exitContainer(response);
  }
  return copy === null ? object : copy;
}

function readMap(
  response: ResultResponse,
  map: Map<any, any>,
  context: KeyContext,
): Map<any, any> {
  const cycle = enterContainer(response, map, createMapCopy);
  if (cycle !== null) {
    return cycle;
  }
  let read;
  try {
    const entries = Array.from(map);
    read = readArray(response, entries, context);
    if (read === entries) {
      return map;
    }
  } finally {
    exitContainer(response);
  }
  const copy = copyOf(response, map, createMapCopy);
  for (let i = 0; i < read.length; i++) {
    copy.set(read[i][0], read[i][1]);
  }
  return copy;
}

function readSet(
  response: ResultResponse,
  set: Set<any>,
  context: KeyContext,
): Set<any> {
  const cycle = enterContainer(response, set, createSetCopy);
  if (cycle !== null) {
    return cycle;
  }
  let read;
  try {
    const values = Array.from(set);
    read = readArray(response, values, context);
    if (read === values) {
      return set;
    }
  } finally {
    exitContainer(response);
  }
  const copy = copyOf(response, set, createSetCopy);
  for (let i = 0; i < read.length; i++) {
    copy.add(read[i]);
  }
  return copy;
}

// Finds the Server Component an element renders, through memo, forwardRef
// and lazy wrappers, the same way renderElement does on the server. Returns
// null if the element renders something else.
function resolveServerComponentType(
  response: ResultResponse,
  type: any,
): null | Function {
  if (
    typeof type === 'function' &&
    !response._bundler.isClientReference(type)
  ) {
    return type;
  } else if (
    type != null &&
    typeof type === 'object' &&
    !response._bundler.isClientReference(type)
  ) {
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE: {
        const payload = type._payload;
        const init = type._init;
        return resolveServerComponentType(response, init(payload));
      }
      case REACT_FORWARD_REF_TYPE:
        return resolveServerComponentType(response, type.render);
      case REACT_MEMO_TYPE:
        return resolveServerComponentType(response, type.type);
    }
  }
  return null;
}

// The value a Server Component returned has the same special cases here as
// in processServerComponentReturnValue on the server.
function processServerComponentReturnValue(
  response: ResultResponse,
  output: any,
): any {
  if (__DEV__) {
    if (
      typeof output === 'object' &&
      output !== null &&
      output.$$typeof === REACT_ELEMENT_TYPE &&
      output._store
    ) {
      // If the server component renders to an element, then it was in a static position.
      // That doesn't need further validation of keys. The Server Component itself would
      // have had a key.
      output._store.validated = 1;
    }
  }
  if (
    typeof output !== 'object' ||
    output === null ||
    typeof output.then === 'function' ||
    response._bundler.isClientReference(output)
  ) {
    return output;
  }
  // Normally we'd serialize an Iterator/AsyncIterator as a single-shot which is not compatible
  // to be rendered as a React Child. However, because we have the function to recreate
  // an iterable from rendering the element again, we can effectively treat it as multi-
  // shot. Therefore we treat this as an Iterable/AsyncIterable, whether it was one or not, by
  // adding a wrapper so that this component effectively renders down to an AsyncIterable.
  const iteratorFn = getIteratorFn(output);
  if (iteratorFn) {
    const iterableChild = output;
    return {
      [Symbol.iterator]: function () {
        return iteratorFn.call(iterableChild);
      },
    };
  }
  if (
    typeof output[ASYNC_ITERATOR] === 'function' &&
    (typeof ReadableStream !== 'function' ||
      !(output instanceof ReadableStream))
  ) {
    const iterableChild = output;
    return {
      [ASYNC_ITERATOR]: function () {
        return iterableChild[ASYNC_ITERATOR]();
      },
    };
  }
  return output;
}

function readServerComponentOutput(
  response: ResultResponse,
  output: any,
  context: KeyContext,
): any {
  output = processServerComponentReturnValue(response, output);
  if (isThenable(output) && !response._bundler.isClientReference(output)) {
    // When the return value is in children position we can resolve it immediately,
    // to its value without a wrapper if it's synchronously available.
    const thenable: Thenable<any> = output;
    switch (thenable.status) {
      case 'fulfilled':
        return readServerComponentOutput(response, thenable.value, context);
      case 'rejected':
        return createLazyChunkWrapper(
          createErrorChunk(
            response,
            reportReadError(response, thenable.reason),
          ),
        );
    }
    const chunk: SomeChunk<any> = createPendingChunk(response, context);
    resolveServerComponentOutput(response, chunk, thenable);
    return createLazyChunkWrapper(chunk);
  }
  return readModel(response, output, context, emptyRoot, '');
}

// Resolves a chunk with the value a Server Component returned once that is
// known, unwrapping a returned promise first.
function resolveServerComponentOutput(
  response: ResultResponse,
  chunk: SomeChunk<any>,
  output: any,
): void {
  output = processServerComponentReturnValue(response, output);
  if (isThenable(output) && !response._bundler.isClientReference(output)) {
    const thenable: Thenable<any> = output;
    thenable.then(
      value => resolveServerComponentOutput(response, chunk, value),
      reason => reportErrorOnChunk(response, chunk, reason),
    );
    return;
  }
  resolveModelChunk(response, chunk, output);
}

function readServerComponent(
  response: ResultResponse,
  element: any,
  context: KeyContext,
): any {
  const task = getResultTask(response._result, element);
  // Track this element's key on the Server Component on the keyPath context.
  context = enterServerComponent(context, element.key);
  switch (task.status) {
    case TASK_FULFILLED:
      return readServerComponentOutput(response, task.value, context);
    case TASK_PENDING: {
      const chunk: SomeChunk<any> = createPendingChunk(response, context);
      task.then(
        value => resolveServerComponentOutput(response, chunk, value),
        reason => reportErrorOnChunk(response, chunk, reason),
      );
      return createLazyChunkWrapper(chunk);
    }
    default:
      return createLazyChunkWrapper(
        createErrorChunk(response, reportReadError(response, task.reason)),
      );
  }
}

// A promise in the model reads as a chunk that resolves to its value, read
// once it's known.
function readThenable(
  response: ResultResponse,
  thenable: Thenable<any>,
  context: KeyContext,
): SomeChunk<any> {
  // If we're in some kind of context we can't reuse the result of this render or
  // previous renders of this element. We only reuse Promises if they're not wrapped
  // by another Server Component.
  const reusable = context.keyPath === null && !context.implicitSlot;
  if (reusable) {
    const existing = response._models.get(thenable);
    if (existing !== undefined) {
      return existing;
    }
  }
  let chunk: SomeChunk<any>;
  switch (thenable.status) {
    case 'fulfilled':
      chunk = createModelChunk(response, thenable.value, context);
      break;
    case 'rejected':
      chunk = createErrorChunk(
        response,
        reportReadError(response, thenable.reason),
      );
      break;
    default: {
      const pendingChunk: SomeChunk<any> = createPendingChunk(
        response,
        context,
      );
      thenable.then(
        value => resolveModelChunk(response, pendingChunk, value),
        reason => reportErrorOnChunk(response, pendingChunk, reason),
      );
      chunk = pendingChunk;
    }
  }
  if (reusable) {
    recordModel(response, thenable, chunk);
  }
  return chunk;
}

function isThenable(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.then === 'function'
  );
}

// Each value a stream or async iterable yields is a row of its own on the
// wire, read in the context of the stream's position, so it's read like a
// row here: an invalid value inside it fails that value.
function readStreamedValue(
  response: ResultResponse,
  value: any,
  context: KeyContext,
): any {
  const prevReadError = response._readError;
  response._readError = null;
  let read;
  try {
    read = readModel(response, value, context, emptyRoot, '');
  } catch (thrown) {
    response._readError = prevReadError;
    if (isThenable(thrown)) {
      throw thrown;
    }
    throw reportReadError(response, thrown);
  }
  const error = response._readError;
  response._readError = prevReadError;
  if (error !== null) {
    throw error;
  }
  return read;
}

// Reads one entry of a stream, retrying if it has to wait for something
// like a loading module. The entries after it can be read meanwhile, as the
// rows after it can on the wire. Resolves to an iterator result, so that a
// value that is itself a promise isn't unwrapped.
function readStreamedEntry(
  response: ResultResponse,
  entry: {+done: boolean, +value: any, ...},
  context: KeyContext,
): Promise<IteratorResult<any, any>> {
  return new Promise((resolve, reject) => {
    function attempt() {
      let value;
      try {
        value = readStreamedValue(response, entry.value, context);
      } catch (thrown) {
        if (isThenable(thrown)) {
          thrown.then(attempt, attempt);
          return;
        }
        reject(thrown);
        return;
      }
      resolve(entry.done ? {done: true, value} : {done: false, value});
    }
    attempt();
  });
}

// A ReadableStream reads as a fresh stream fed from the Result's replay of
// it, with each chunk read like a row.
function readStream(
  response: ResultResponse,
  stream: ReadableStream,
  context: KeyContext,
): ReadableStream {
  const replay = getStreamReplay(response._result, stream);
  const replayed = createReplayReadableStream(replay);
  if (replay.isByteStream) {
    // Bytes read as themselves.
    return replayed;
  }
  const reader = replayed.getReader();
  return new ReadableStream({
    pull(controller: any): Promise<void> {
      return reader.read().then(
        entry => {
          if (entry.done) {
            controller.close();
            return;
          }
          return readStreamedEntry(response, entry, context).then(
            read => {
              controller.enqueue(read.value);
            },
            error => {
              controller.error(error);
            },
          );
        },
        reason => {
          controller.error(reportReadError(response, reason));
        },
      );
    },
  });
}

// An async iterable reads as a fresh iterable fed from the Result's replay
// of it, or an async iterator if the original was single-shot, with each
// value read like a row.
function readAsyncIterable(
  response: ResultResponse,
  iterable: Object,
  context: KeyContext,
): any {
  const replay = getAsyncIterableReplay(
    response._result,
    iterable,
    iterable[ASYNC_ITERATOR],
  );
  const replayed: any = createReplayAsyncIterable(replay);
  const read: any = {};
  read[ASYNC_ITERATOR] = () => {
    const source = replayed[ASYNC_ITERATOR]();
    const iterator: any = {
      next(arg: void): Promise<IteratorResult<any, any>> {
        return source.next(arg).then(
          entry =>
            entry.done && entry.value === undefined
              ? entry
              : readStreamedEntry(response, entry, context),
          reason => {
            throw reportReadError(response, reason);
          },
        );
      },
    };
    iterator[ASYNC_ITERATOR] = () => iterator;
    return iterator;
  };
  return replay.isIterator ? read[ASYNC_ITERATOR]() : read;
}

// An async iterable in a node position is a fragment, keyed like an array
// in renderAsyncFragment. Its values are read in the stream's context: the
// enclosing one if a keyed fragment wraps the stream, since the serializer
// recurses into that fragment's children with its task's context restored.
function readAsyncFragment(
  response: ResultResponse,
  iterable: Object,
  context: KeyContext,
): any {
  if (context.keyPath !== null) {
    const fragment = createElement(REACT_FRAGMENT_TYPE, context.keyPath, {
      children: readAsyncIterable(response, iterable, context.enclosing),
    });
    return context.implicitSlot ? [fragment] : fragment;
  }
  return readAsyncIterable(response, iterable, context);
}

// An element that can't be read becomes a lazy that throws when the
// renderer reaches it, and its siblings are unaffected. On the wire this is
// what happens to an element in a row of its own; an element inlined into
// its parent's row takes the parent down with it, but which elements get
// inlined depends on row sizes and timing, so every element is treated as
// its own row here.
function readElement(
  response: ResultResponse,
  element: any,
  context: KeyContext,
): any {
  // If we're in some kind of context we can't reuse the result of this render or
  // previous renders of this element. We only reuse elements if they're not wrapped
  // by another Server Component.
  const reusable = context.keyPath === null && !context.implicitSlot;
  if (reusable) {
    const existing = response._models.get(element);
    if (existing !== undefined) {
      return existing;
    }
  }
  const recorded = response._recorded.length;
  let read;
  try {
    if (resolveServerComponentType(response, element.type) !== null) {
      read = readServerComponent(response, element, context);
    } else {
      read = readClientElement(response, element, context);
    }
  } catch (thrown) {
    if (isThenable(thrown)) {
      // Something inside the element is still loading. It becomes a lazy
      // that reads the element again once that's done, like an element
      // whose row waits for a reference.
      forgetModels(response, recorded);
      const chunk: SomeChunk<any> = createPendingChunk(response, context);
      const retry = () => {
        // What's recorded for the element is the lazy itself.
        response._models.delete(element);
        resolveModelChunk(response, chunk, element);
      };
      thrown.then(retry, retry);
      read = createLazyChunkWrapper(chunk);
    } else {
      const chunk: SomeChunk<any> = createErrorChunk(
        response,
        reportReadError(response, thrown),
      );
      read = createLazyChunkWrapper(chunk);
    }
  }
  if (reusable) {
    recordModel(response, element, read);
  }
  return read;
}

// A host or Client Component element. The serializer outlines each of these
// as its own row when it can't be inlined, and its props are what that row
// holds, so an invalid prop fails this element and nothing above it.
function readClientElement(
  response: ResultResponse,
  element: any,
  context: KeyContext,
): any {
  const props = element.props;
  if (props.ref !== undefined && props.ref !== null) {
    throw new Error(
      'Refs cannot be used in Server Components, nor passed to Client Components.',
    );
  }
  if (__DEV__) {
    jsxPropsParents.set(props, element.type);
    if (typeof props.children === 'object' && props.children !== null) {
      jsxChildrenParents.set(props.children, element.type);
    }
  }
  let type = element.type;
  if (type === REACT_FRAGMENT_TYPE && element.key === null) {
    // For key-less fragments, we add a small optimization to avoid serializing
    // it as a wrapper.
    const childContext =
      context.keyPath === null && !context.implicitSlot
        ? {keyPath: null, implicitSlot: true, enclosing: context.enclosing}
        : context;
    return readModel(response, props.children, childContext, props, 'children');
  }
  // The serializer resolves a lazy type and unwraps memo and forwardRef
  // before it emits the element, so neither reaches a consumer.
  while (
    type !== null &&
    typeof type === 'object' &&
    !response._bundler.isClientReference(type)
  ) {
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE: {
        const payload = type._payload;
        const init = type._init;
        type = init(payload);
        continue;
      }
      case REACT_MEMO_TYPE:
        type = type.type;
        continue;
      case REACT_FORWARD_REF_TYPE:
        type = type.render;
        continue;
    }
    break;
  }
  const key = terminalKey(context, element.key);
  const prevReadError = response._readError;
  response._readError = null;
  const readProps = readValue(
    response,
    props,
    context.enclosing,
    element,
    'props',
  );
  const error = response._readError;
  response._readError = prevReadError;
  let read;
  if (error !== null) {
    const chunk: SomeChunk<any> = createErrorChunk(response, error);
    read = createLazyChunkWrapper(chunk);
  } else if (response._bundler.isClientReference(type)) {
    // Like on the wire, the type is a lazy over the module, so that the
    // renderer suspends on this component rather than its parent until the
    // code has loaded.
    read = createElement(
      createLazyChunkWrapper(getModuleChunk(response, type)),
      key,
      readProps,
    );
  } else if (
    key === element.key &&
    type === element.type &&
    readProps === props
  ) {
    read = element;
  } else {
    read = createElement(type, key, readProps);
  }
  if (context.implicitSlot && key !== null) {
    // The root Server Component had no key so it was in an implicit slot.
    // If we had a key lower, it would end up in that slot with an explicit key.
    // We wrap the element in a fragment to give it an implicit key slot with
    // an inner explicit key.
    return [read];
  }
  return read;
}

// The chunk loading a Client Reference's module in this consumer's module
// graph. The module is preloaded as early as possible, like on the wire,
// but only required when something first reads the chunk.
function getModuleChunk(
  response: ResultResponse,
  reference: any,
): SomeChunk<any> {
  const id: string = reference.$$id;
  const modules = response._modules;
  const existing = modules.get(id);
  if (existing !== undefined) {
    return existing;
  }
  // The metadata the server would have serialized is what the consumer's
  // module map is keyed by, as it is on the wire.
  const clientReferenceMetadata: ClientReferenceMetadata =
    response._bundler.resolveClientReferenceMetadata(reference) as any;
  const clientReference = resolveClientReference<$FlowFixMe>(
    response._bundlerConfig,
    clientReferenceMetadata,
  );
  const bindToConsumer = response._bindToConsumer;
  if (bindToConsumer !== null) {
    bindToConsumer(() =>
      prepareDestinationForModule(
        response._moduleLoading,
        response._nonce,
        clientReferenceMetadata,
      ),
    );
  } else {
    prepareDestinationForModule(
      response._moduleLoading,
      response._nonce,
      clientReferenceMetadata,
    );
  }
  const promise = preloadModule(clientReference);
  let chunk;
  if (promise) {
    const pendingChunk: SomeChunk<any> = createPendingModuleChunk(response);
    promise.then(
      () => resolveModuleChunk(response, pendingChunk, clientReference),
      error => triggerErrorOnChunk(pendingChunk, error),
    );
    chunk = pendingChunk;
  } else {
    chunk = createResolvedModuleChunk(response, clientReference);
  }
  modules.set(id, chunk);
  return chunk;
}

// A Client Reference anywhere else is its module's export. If the module
// is still loading, the row holding the reference waits for it. If the
// module failed to load, the row fails with the module's own error, which
// is this consumer's error and not reported to onError.
function readClientReferenceValue(response: ResultResponse, reference: any) {
  return readReferenceChunk(response, getModuleChunk(response, reference));
}

// Reads a chunk referenced from a row, like a direct $ reference on the
// wire: the row waits for it or fails with it.
function readReferenceChunk(
  response: ResultResponse,
  chunk: SomeChunk<any>,
): any {
  switch (chunk.status) {
    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  }
  switch (chunk.status) {
    case INITIALIZED:
      return chunk.value;
    case PENDING:
      // eslint-disable-next-line no-throw-literal
      throw chunk as any as Thenable<any>;
    default:
      if (response._readError === null) {
        response._readError = chunk.reason as any;
      }
      return undefined;
  }
}

// A Server Reference reads as what the wire would give this consumer for
// it. With a server module map that's the function itself, loaded from this
// consumer's module graph with the bound arguments applied, the same way
// loadServerReference does on the client. Without one it's a proxy that
// calls the server. Either way it carries the form action metadata.
function readServerReference(
  response: ResultResponse,
  reference: any,
  context: KeyContext,
): any {
  const serverReferences = response._serverReferences;
  const existing = serverReferences.get(reference);
  if (existing !== undefined) {
    return readReferenceChunk(response, existing);
  }
  const bundler = response._bundler;
  const id = bundler.getServerReferenceId(reference);
  const boundArgs = bundler.getServerReferenceBoundArguments(reference);
  const args =
    boundArgs === null ? null : readArray(response, boundArgs, context);
  const bound = args === null ? null : Promise.resolve(args);
  let chunk;
  if (!response._serverReferenceConfig) {
    // In the normal case, we can't load this Server Reference in the current environment and
    // we just return a proxy to it.
    const proxy = createBoundServerReference<Array<any>, any>(
      {id, bound},
      response._callServer,
      response._encodeFormAction,
    );
    chunk = createInitializedChunk(response, proxy);
  } else {
    // If we have a module mapping we can load the real version of this Server Reference.
    const serverReference: ClientReference<any> =
      resolveServerReference<$FlowFixMe>(response._serverReferenceConfig, id);
    const pendingChunk: SomeChunk<any> = createPendingModuleChunk(response);
    const load = () => {
      let fn;
      try {
        fn = requireModule(serverReference);
        if (args !== null) {
          fn = fn.bind.apply(fn, [null].concat(args));
        }
        registerBoundServerReference(fn, id, bound, response._encodeFormAction);
      } catch (error) {
        triggerErrorOnChunk(pendingChunk, error);
        return;
      }
      fulfillChunk(pendingChunk, fn);
    };
    const promise = preloadModule(serverReference);
    if (promise) {
      promise.then(load, error => triggerErrorOnChunk(pendingChunk, error));
    } else {
      load();
    }
    chunk = pendingChunk;
  }
  serverReferences.set(reference, chunk);
  return readReferenceChunk(response, chunk);
}

// A value the server registered as a temporary reference reads as the value
// this consumer registered under the same id, like a $T row does.
function readTemporaryReferenceValue(
  response: ResultResponse,
  value: any,
): void | any {
  const id = response._bundler.resolveTemporaryReference(value);
  if (id === undefined) {
    return undefined;
  }
  const temporaryReferences = response._temporaryReferences;
  if (temporaryReferences === undefined) {
    throw new Error(
      'Missing a temporary reference set but the RSC response returned a temporary reference. ' +
        'Pass a temporaryReference option with the set that was used with the reply.',
    );
  }
  // The server's set holds the reference without the $ that the wire adds
  // back and the client's set is keyed by.
  return readTemporaryReference(temporaryReferences, '$' + id);
}

function throwTaintViolation(message: string) {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(message);
}

function checkTaintedObject(response: ResultResponse, value: Object): void {
  const tainted = response._result.taintRegistries.objects.get(value);
  if (tainted !== undefined) {
    throwTaintViolation(tainted);
  }
}

function checkTaintedValue(
  response: ResultResponse,
  value: string | bigint,
): void {
  const tainted = response._result.taintRegistries.values.get(value);
  if (tainted !== undefined) {
    throwTaintViolation(tainted.message);
  }
}

function checkTaintedBytes(
  response: ResultResponse,
  view: $ArrayBufferView,
): void {
  const registries = response._result.taintRegistries;
  if (registries.byteLengths.has(view.byteLength)) {
    // If we have had any tainted values of this length, we check
    // to see if these bytes matches any entries in the registry.
    const tainted = registries.values.get(binaryToComparableString(view));
    if (tainted !== undefined) {
      throwTaintViolation(tainted.message);
    }
  }
}

// On the wire a Blob's bytes are checked as they're streamed, so they're
// read here before the Blob is handed over. The row waits for the read.
function readBlobBytes(response: ResultResponse, blob: Blob): SomeChunk<Blob> {
  let blobs = response._blobs;
  if (blobs === null) {
    blobs = response._blobs = new Map();
  }
  let chunk = blobs.get(blob);
  if (chunk === undefined) {
    const pendingChunk: SomeChunk<Blob> = createPendingModuleChunk(response);
    const reader = blob.stream().getReader();
    const error = (reason: mixed) => {
      triggerErrorOnChunk(pendingChunk, reportReadError(response, reason));
    };
    const progress = (
      entry: {done: false, value: Uint8Array} | {done: true, value: void},
    ): Promise<void> | void => {
      if (entry.done) {
        fulfillChunk(pendingChunk, blob);
        return;
      }
      try {
        checkTaintedBytes(response, entry.value);
      } catch (x) {
        error(x);
        return;
      }
      // $FlowFixMe[incompatible-type]
      return reader.read().then(progress, error);
    };
    // $FlowFixMe[incompatible-type]
    reader.read().then(progress, error);
    chunk = pendingChunk;
    blobs.set(blob, chunk);
  }
  return chunk;
}

// On the wire a FormData is its entries, so its names, strings and files
// are checked like them.
function checkTaintedFormData(
  response: ResultResponse,
  formData: FormData,
): void {
  const entries = Array.from(formData.entries());
  for (let i = 0; i < entries.length; i++) {
    const name = entries[i][0];
    const entry = entries[i][1];
    checkTaintedValue(response, name);
    if (typeof entry === 'string') {
      checkTaintedValue(response, entry);
    } else {
      readReferenceChunk(response, readBlobBytes(response, entry));
    }
  }
}

// Reads a value, applying what the serializer would have changed about it.
// The checks follow renderModelDestructive on the server: what it rejects
// is rejected here with the same message, so an invalid value fails this
// consumer like it fails the wire. `parent` and `parentPropertyName` only
// describe the location in that message.
// An iterable reads as a fragment of its values, like on the wire. An
// iterator is single-shot: another consumer of the Result may have drained
// it already, so it reads from the entries the Result keeps.
function readIterable(
  response: ResultResponse,
  value: any,
  iteratorFn: () => ?Iterator<any>,
  context: KeyContext,
): any {
  if (isSingleShotIterator(value)) {
    // Iterator, not Iterable. On the wire it reads as an iterator over its
    // entries.
    const entries = readArray(
      response,
      getIteratorEntries(response._result, value),
      context,
    );
    // $FlowFixMe[incompatible-use]: This uses raw Symbols because we're extracting from a native array.
    return entries[Symbol.iterator]();
  }
  const iterator = iteratorFn.call(value);
  if (isSingleShotIterator(iterator)) {
    // An iterator returned from a Server Component is wrapped to be iterated
    // like an iterable, but the iterator it yields is still single-shot.
    return readFragment(
      response,
      getIteratorEntries(response._result, iterator as any),
      context,
    );
  }
  return readFragment(response, Array.from(iterator as any), context);
}

function readModel(
  response: ResultResponse,
  value: any,
  context: KeyContext,
  parent: Object,
  parentPropertyName: string,
): any {
  if (value === null) {
    return null;
  }
  if (typeof value === 'object') {
    switch (value.$$typeof) {
      case REACT_ELEMENT_TYPE:
        return readElement(response, value, context);
      case REACT_LAZY_TYPE: {
        const lazy: LazyComponent<any, any> = value;
        const payload = lazy._payload;
        const init = lazy._init;
        return readModel(
          response,
          init(payload),
          context,
          parent,
          parentPropertyName,
        );
      }
      case REACT_LEGACY_ELEMENT_TYPE:
        throw new Error(
          'A React Element from an older version of React was rendered. ' +
            'This is not supported. It can happen if:\n' +
            '- Multiple copies of the "react" package is used.\n' +
            '- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n' +
            '- A compiler tries to "inline" JSX instead of using the runtime.',
        );
    }
    if (response._bundler.isClientReference(value)) {
      return readClientReferenceValue(response, value);
    }
    if (response._bundler.isServerReference(value)) {
      // An object registered as a Server Reference. This must be checked
      // before the thenable case below so that a reference that happens to
      // be a Promise is read by reference instead of being awaited.
      return readServerReference(response, value, context);
    }
    const temporaryReference = readTemporaryReferenceValue(response, value);
    if (temporaryReference !== undefined) {
      return temporaryReference;
    }
    if (enableTaint) {
      checkTaintedObject(response, value);
    }
    if (typeof value.then === 'function') {
      // We assume that any object with a .then property is a "Thenable" type,
      // or a Promise type. Either of which can be represented by a Promise.
      return readThenable(response, value, context);
    }
    const existing = response._models.get(value);
    if (existing !== undefined) {
      // We've read this before, so we can just return what we got for it.
      return existing;
    }
    const proto = getPrototypeOf(value);
    if (proto === ObjectPrototype) {
      // Nearly every value is a plain object, and of the cases below only
      // the iterator ones can apply to one, so the built-ins are checked
      // for the rest.
      const iteratorFn = getIteratorFn(value);
      if (iteratorFn) {
        return readIterable(response, value, iteratorFn, context);
      }
      if (typeof value[ASYNC_ITERATOR] === 'function') {
        return readAsyncFragment(response, value, context);
      }
      return readObject(response, value, context);
    }
    if (isArray(value)) {
      return readFragment(response, value, context);
    }
    if (value instanceof Map) {
      return readMap(response, value, context);
    }
    if (value instanceof Set) {
      return readSet(response, value, context);
    }
    // TODO: FormData is not available in old Node. Remove the typeof later.
    if (typeof FormData === 'function' && value instanceof FormData) {
      if (enableTaint) {
        checkTaintedFormData(response, value);
      }
      return value;
    }
    if (value instanceof Error) {
      // An Error value carries no details in production, like a $Z row. It
      // didn't throw into the render, so it isn't reported and has no digest.
      return __DEV__
        ? resolveErrorDev(response, value)
        : resolveErrorProd(response);
    }
    if (value instanceof ArrayBuffer) {
      if (enableTaint) {
        checkTaintedBytes(response, new Uint8Array(value));
      }
      return value;
    }
    if (ArrayBuffer.isView(value)) {
      if (enableTaint) {
        checkTaintedBytes(response, value);
      }
      return value;
    }
    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (typeof Blob === 'function' && value instanceof Blob) {
      if (enableTaint) {
        return readReferenceChunk(response, readBlobBytes(response, value));
      }
      return value;
    }
    const iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      return readIterable(response, value, iteratorFn, context);
    }
    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (
      typeof ReadableStream === 'function' &&
      value instanceof ReadableStream
    ) {
      return readStream(response, value, context);
    }
    if (typeof value[ASYNC_ITERATOR] === 'function') {
      // We treat AsyncIterables as a Fragment and as such we might need to key them.
      return readAsyncFragment(response, value, context);
    }

    if (value instanceof Date) {
      return value;
    }

    // Verify that this is a simple plain object.
    if (proto === null || getPrototypeOf(proto) !== null) {
      throw new Error(
        'Only plain objects, and a few built-ins, can be passed to Client Components ' +
          'from Server Components. Classes or null prototypes are not supported.' +
          describeObjectForErrorMessage(parent, parentPropertyName),
      );
    }
    return readObject(response, value, context);
  }

  if (typeof value === 'string') {
    if (enableTaint) {
      checkTaintedValue(response, value);
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'function') {
    if (response._bundler.isClientReference(value)) {
      return readClientReferenceValue(response, value);
    }
    if (response._bundler.isServerReference(value)) {
      return readServerReference(response, value, context);
    }
    const temporaryReference = readTemporaryReferenceValue(response, value);
    if (temporaryReference !== undefined) {
      return temporaryReference;
    }
    if (enableTaint) {
      checkTaintedObject(response, value);
    }
    if (/^on[A-Z]/.test(parentPropertyName)) {
      throw new Error(
        'Event handlers cannot be passed to Client Component props.' +
          describeObjectForErrorMessage(parent, parentPropertyName) +
          '\nIf you need interactivity, consider converting part of this to a Client Component.',
      );
    } else if (
      __DEV__ &&
      (jsxChildrenParents.has(parent) ||
        (jsxPropsParents.has(parent) && parentPropertyName === 'children'))
    ) {
      const componentName = value.displayName || value.name || 'Component';
      throw new Error(
        'Functions are not valid as a child of Client Components. This may happen if ' +
          'you return ' +
          componentName +
          ' instead of <' +
          componentName +
          ' /> from render. ' +
          'Or maybe you meant to call this function rather than return it.' +
          describeObjectForErrorMessage(parent, parentPropertyName),
      );
    } else {
      throw new Error(
        'Functions cannot be passed directly to Client Components ' +
          'unless you explicitly expose it by marking it with "use server". ' +
          'Or maybe you meant to call this function rather than return it.' +
          describeObjectForErrorMessage(parent, parentPropertyName),
      );
    }
  }

  if (typeof value === 'symbol') {
    if (Symbol.keyFor(value) === undefined) {
      throw new Error(
        'Only global symbols received from Symbol.for(...) can be passed to Client Components. ' +
          `The symbol Symbol.for(${
            // $FlowFixMe[incompatible-type] `description` might be undefined
            value.description
          }) cannot be found among global symbols.` +
          describeObjectForErrorMessage(parent, parentPropertyName),
      );
    }
    return value;
  }

  if (typeof value === 'bigint') {
    if (enableTaint) {
      checkTaintedValue(response, value);
    }
    return value;
  }

  throw new Error(
    `Type ${typeof value} is not supported in Client Component props.` +
      describeObjectForErrorMessage(parent, parentPropertyName),
  );
}

export function createResponse(
  result: Result<any>,
  bundlerConfig: ServerConsumerModuleMap,
  serverReferenceConfig: null | ServerManifest,
  moduleLoading: ModuleLoading,
  bundler: ReferenceBundler,
  callServer: CallServerCallback,
  encodeFormAction: void | EncodeFormActionCallback,
  temporaryReferences: void | TemporaryReferenceSet,
  bindToConsumer: null | (<R>(callback: () => R) => R),
  nonce: ?string,
  onError: void | ((error: mixed) => ?string),
): ResultResponse {
  const response: ResultResponse = {
    _result: result,
    _bundlerConfig: bundlerConfig,
    _serverReferenceConfig: serverReferenceConfig,
    _moduleLoading: moduleLoading,
    _nonce: nonce,
    _bundler: bundler,
    _callServer: callServer,
    _encodeFormAction: encodeFormAction,
    _temporaryReferences: temporaryReferences,
    _bindToConsumer: bindToConsumer,
    _modules: new Map(),
    _serverReferences: new Map(),
    _onError: onError === undefined ? result.onError : onError,
    _models: new Map(),
    _recorded: [],
    _visiting: [],
    _pendingChunks: new Set(),
    _unsubscribe: null,
    _readError: null,
    _taintCleanupQueue: null,
    _blobs: null,
  };
  // The renderer may read the Result for as long as it likes, so this
  // consumer holds the cache signal open until it's closed.
  retainResult(result);
  if (enableTaint) {
    const cleanupQueue: RequestCleanupQueue = [];
    response._taintCleanupQueue = cleanupQueue;
    result.taintRegistries.pendingRequests.add(cleanupQueue);
  }
  // Aborting the Result errors everything this consumer is still waiting
  // for, the way aborting a request errors its pending rows.
  const signal = result.abortController.signal;
  const abortListener = () => {
    const pendingChunks = response._pendingChunks;
    if (pendingChunks.size > 0) {
      const error = reportReadError(response, signal.reason);
      pendingChunks.forEach(chunk => triggerErrorOnChunk(chunk, error));
    }
  };
  signal.addEventListener('abort', abortListener);
  // Hints emitted so far and from now on, by whichever consumer runs the
  // component, reach the renderer consuming this Result.
  const unsubscribeHints = subscribeToHints(result.context, hint => {
    if (bindToConsumer !== null) {
      bindToConsumer(() => dispatchHint(hint.code, hint.model));
    } else {
      dispatchHint(hint.code, hint.model);
    }
  });
  response._unsubscribe = () => {
    signal.removeEventListener('abort', abortListener);
    unsubscribeHints();
  };
  return response;
}

// This consumer is done with the Result. Once every consumer is, the cache
// signal aborts.
export function close(response: ResultResponse, reason: mixed): void {
  const unsubscribe = response._unsubscribe;
  if (unsubscribe === null) {
    return;
  }
  response._unsubscribe = null;
  unsubscribe();
  if (enableTaint) {
    cleanupTaintQueue(response);
  }
  releaseResult(response._result, reason);
}

function cleanupTaintQueue(response: ResultResponse): void {
  const registries = response._result.taintRegistries;
  const cleanupQueue = response._taintCleanupQueue;
  if (cleanupQueue === null) {
    return;
  }
  response._taintCleanupQueue = null;
  registries.pendingRequests.delete(cleanupQueue);
  for (let i = 0; i < cleanupQueue.length; i++) {
    const entryValue = cleanupQueue[i];
    const entry = registries.values.get(entryValue);
    if (entry !== undefined) {
      if (entry.count === 1) {
        registries.values.delete(entryValue);
      } else {
        entry.count--;
      }
    }
  }
  cleanupQueue.length = 0;
}

export function getRoot<T>(response: ResultResponse): Thenable<T> {
  const chunk: SomeChunk<T> = createModelChunk(
    response,
    response._result.model,
    rootKeyContext,
  );
  return chunk as any;
}
