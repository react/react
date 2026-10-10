/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ServerReferenceMetadata,
  Result,
  ModelReference,
} from 'shared/ReactFlightResult';
import type {TemporaryReferenceSet} from './ReactFlightTemporaryReferences';
import type {
  CallServerCallback,
  EncodeFormActionCallback,
} from './ReactFlightReplyClient';
import {readTemporaryReference} from './ReactFlightTemporaryReferences';
import {
  createBoundServerReference,
  registerBoundServerReference,
  createServerObjectReference,
} from './ReactFlightReplyClient';
import type {
  ResultStreamController,
  StreamReader,
} from 'shared/ReactFlightResultReadableStream';
import {closeReadableStream} from 'shared/ReactFlightResultReadableStream';
import type {AsyncIterableController} from 'shared/ReactFlightResultAsyncIterable';
import type {ReactElement} from 'shared/ReactElementType';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {
  ReactComponentInfo,
  ReactDebugInfo,
  ReactErrorInfoDev,
  ReactStackTrace,
  Wakeable,
  Thenable,
} from 'shared/ReactTypes';
import type {
  ClientReferenceMetadata,
  ClientReference,
  ServerConsumerModuleMap,
  ModuleLoading,
  ServerManifest,
} from './ReactFlightClientConfig';
import {
  getTemporaryReference,
  getAsyncIterable,
  getReadableStream,
  getIteratorEntries,
  getServerReference,
  getRoot,
  getValueReference,
  hasFormDataBlobs,
  getCollectionEntries,
  getModelInfo,
  MODEL_KIND_MASK,
  MODEL_OBJECT,
  MODEL_ARRAY,
  MODEL_ELEMENT,
  getErrorReference,
  getErrorInfo,
  isHalted,
  getHintQueue,
  waitForHints,
} from 'shared/ReactFlightResult';
import type {ResultModel} from 'shared/ReactFlightResultModel';
import {
  getResultModelStatus,
  getDebugModel,
  subscribeToDebugInfo,
} from 'shared/ReactFlightResultModel';
import {
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  ASYNC_ITERATOR,
} from 'shared/ReactSymbols';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import isArray from 'shared/isArray';
import getPrototypeOf from 'shared/getPrototypeOf';
import hasOwnProperty from 'shared/hasOwnProperty';
import noop from 'shared/noop';
import {describeObjectForErrorMessage} from 'shared/ReactSerializationErrors';
import {
  resolveClientReference,
  resolveServerReference,
  prepareDestinationForModule,
  preloadModule,
  requireModule,
  dispatchHint,
} from './ReactFlightClientConfig';

const ObjectPrototype = Object.prototype;

type ModelPreload = {
  model: Object,
  index: number,
  lowlink: number,
  onStack: boolean,
  passThrough: boolean,
  cacheable: boolean,
  chunk: null | SomeChunk<void>,
  dependencies: null | Set<Wakeable>,
};

type PreloadState = {
  nextIndex: number,
  parent: null | ModelPreload,
  stack: Array<ModelPreload>,
};

type PreloadDependencies = {
  dependencies: null | Set<Wakeable>,
  ...
};

type ModelSubscription = {
  response: null | Response,
  owner: null | Set<ModelSubscription>,
  resolve: null | (any => mixed),
  reject: null | (mixed => mixed),
};

export type Response = {
  _result: Result<any>,
  _bundlerConfig: ServerConsumerModuleMap,
  _serverReferenceConfig: null | ServerManifest,
  _callServer: CallServerCallback,
  _encodeFormAction: void | EncodeFormActionCallback,
  _tempRefs: void | TemporaryReferenceSet,
  _moduleLoading: ModuleLoading,
  _nonce: void | string,
  _resolveClientReferenceMetadata: Object => null | ClientReferenceMetadata,
  _onError: mixed => ?string,
  _allowPartialStream: boolean,
  _closed: boolean,
  _disposed: boolean,
  _closedReason: null | Error,
  _models: Map<any, any>,
  _preloads: Map<Object, ModelPreload>,
  _modules: Map<Object, SomeChunk<any>>,
  _chunks: Set<SomeChunk<any>>,
  _subscriptions: null | Set<ModelSubscription>,
  _weakSubscriptions: null | Array<WeakSubscription>,
  _streamErrors: null | Array<(Error) => void>,
  _cleanups: null | Set<() => void>,
  _completedElements: Array<ReactElement>, // DEV-only
  _debugFindSourceMapURL: void | ((string, string) => null | string), // DEV-only
};

export function createResponse(
  result: Result<any>,
  bundlerConfig: ServerConsumerModuleMap,
  serverReferenceConfig: null | ServerManifest,
  moduleLoading: ModuleLoading,
  resolveClientReferenceMetadata: Object => null | ClientReferenceMetadata,
  callServer: CallServerCallback,
  encodeFormAction: void | EncodeFormActionCallback,
  nonce: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  onError?: mixed => ?string,
  allowPartialStream: boolean = false,
  findSourceMapURL?: (string, string) => null | string,
): Response {
  const response: Response = {
    _result: result,
    _bundlerConfig: bundlerConfig,
    _serverReferenceConfig: serverReferenceConfig,
    _callServer: callServer,
    _encodeFormAction: encodeFormAction,
    _tempRefs: temporaryReferences,
    _moduleLoading: moduleLoading,
    _nonce: nonce,
    _resolveClientReferenceMetadata: resolveClientReferenceMetadata,
    _onError: onError === undefined ? defaultErrorHandler : onError,
    _allowPartialStream: allowPartialStream,
    _closed: false,
    _disposed: false,
    _closedReason: null,
    _models: new Map(),
    _preloads: new Map(),
    _modules: new Map(),
    _chunks: new Set(),
    _subscriptions: null,
    _weakSubscriptions: null,
    _streamErrors: null,
    _cleanups: null,
  } as any;
  if (__DEV__) {
    response._completedElements = [];
    response._debugFindSourceMapURL = findSourceMapURL;
  }
  return response;
}

function getClosedReason(response: Response): Error {
  let error = response._closedReason;
  if (error === null) {
    response._closedReason = error = new Error('Connection closed.');
  }
  return error;
}

function isHaltedModel(response: Response, model: Object): boolean {
  return !response._allowPartialStream && isHalted(response._result, model);
}

type PendingChunk<T> = {
  _debugInfo: ReactDebugInfo, // DEV-only
  status: 'pending' | 'pending_weak',
  value: null | Array<(T) => mixed>,
  reason: null | Array<(mixed) => mixed>,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
  // DEV-only
  _initializingElement?: ReactElement,
};

type HaltedChunk<T> = {
  _debugInfo: ReactDebugInfo, // DEV-only
  status: 'halted',
  value: null,
  reason: null,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};

type WeakSubscription = {
  response: null | Response,
  chunk: null | SomeChunk<any>,
  source: any,
};

type BlockedChunk<T> = {
  ...PendingChunk<T>,
  status: 'blocked',
};

type InitializedChunk<T> = {
  _debugInfo: ReactDebugInfo, // DEV-only
  status: 'fulfilled',
  value: T,
  reason: null,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};

type ErroredChunk<T> = {
  _debugInfo: ReactDebugInfo, // DEV-only
  status: 'rejected',
  value: null,
  reason: mixed,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};

type ResolvedModuleChunk<T> = {
  _debugInfo: ReactDebugInfo, // DEV-only
  status: 'resolved_module',
  value: ClientReference<T>,
  reason: null,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};

type ResolvedModelChunk<T> = {
  _debugInfo: ReactDebugInfo, // DEV-only
  status: 'resolved_model',
  value: T,
  reason: Response,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};

type SomeChunk<T> =
  | HaltedChunk<T>
  | PendingChunk<T>
  | BlockedChunk<T>
  | InitializedChunk<T>
  | ErroredChunk<T>
  | ResolvedModelChunk<T>
  | ResolvedModuleChunk<T>;

const PENDING = 'pending';
const PENDING_WEAK = 'pending_weak';
const HALTED = 'halted';
const BLOCKED = 'blocked';
const RESOLVED_MODEL = 'resolved_model';
const RESOLVED_MODULE = 'resolved_module';
const INITIALIZED = 'fulfilled';
const ERRORED = 'rejected';

function ReactPromise(this: any, status: any, value: any, reason: any) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  if (__DEV__) {
    this._debugInfo = [];
  }
}
ReactPromise.prototype = Object.create(Promise.prototype) as any;

function reactPromiseThen<T>(
  this: SomeChunk<T>,
  resolve: T => mixed,
  reject?: mixed => mixed,
): void {
  const chunk = this;
  if (chunk.status === RESOLVED_MODEL) {
    initializeResolvedModelChunk(chunk);
  } else if (chunk.status === RESOLVED_MODULE) {
    initializeModuleChunk(chunk);
  }
  switch (chunk.status) {
    case INITIALIZED:
      if (typeof resolve === 'function') {
        resolve(chunk.value);
      }
      break;
    case PENDING:
    case PENDING_WEAK:
    case BLOCKED:
      if (typeof resolve === 'function') {
        if (chunk.value === null) {
          chunk.value = [];
        }
        chunk.value.push(resolve);
      }
      if (typeof reject === 'function') {
        if (chunk.reason === null) {
          chunk.reason = [];
        }
        chunk.reason.push(reject);
      }
      break;
    case HALTED:
      break;
    default:
      if (typeof reject === 'function') {
        reject(chunk.reason);
      }
      break;
  }
}

Object.defineProperty(ReactPromise.prototype, 'then', {
  writable: true,
  enumerable: true,
  configurable: true,
  value: reactPromiseThen,
});

function createPendingChunk<T>(
  response: null | Response = null,
  weak: boolean = false,
): SomeChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  const chunk = new ReactPromise(weak ? PENDING_WEAK : PENDING, null, null);
  if (response !== null) {
    response._chunks.add(chunk);
  }
  return chunk;
}

function haltChunk<T>(chunk: SomeChunk<T>): void {
  const haltedChunk: HaltedChunk<T> = chunk as any;
  haltedChunk.status = HALTED;
  haltedChunk.value = null;
  haltedChunk.reason = null;
}

function createBlockedChunk<T>(response: Response): SomeChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  const chunk = new ReactPromise(BLOCKED, null, null);
  response._chunks.add(chunk);
  return chunk;
}

function createErrorChunk<T>(error: mixed): SomeChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, error);
}

function wakeChunk<T>(listeners: Array<(T) => mixed>, value: T): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](value);
  }
}

function rejectChunk(listeners: Array<(mixed) => mixed>, error: mixed): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](error);
  }
}

function wakeChunkIfInitialized<T>(
  chunk: SomeChunk<T>,
  resolveListeners: null | Array<(T) => mixed>,
  rejectListeners: null | Array<(mixed) => mixed>,
): void {
  switch (chunk.status) {
    case INITIALIZED:
      if (resolveListeners !== null) {
        wakeChunk(resolveListeners, chunk.value);
      }
      break;
    case ERRORED:
      if (rejectListeners !== null) {
        rejectChunk(rejectListeners, chunk.reason);
      }
      break;
    case PENDING:
    case PENDING_WEAK:
    case BLOCKED:
      if (resolveListeners !== null) {
        if (chunk.value === null) {
          chunk.value = resolveListeners;
        } else {
          for (let i = 0; i < resolveListeners.length; i++) {
            chunk.value.push(resolveListeners[i]);
          }
        }
      }
      if (rejectListeners !== null) {
        if (chunk.reason === null) {
          chunk.reason = rejectListeners;
        } else {
          for (let i = 0; i < rejectListeners.length; i++) {
            chunk.reason.push(rejectListeners[i]);
          }
        }
      }
      break;
  }
}

function initializeChunk<T>(chunk: SomeChunk<T>, value: T): void {
  if (
    chunk.status !== PENDING &&
    chunk.status !== PENDING_WEAK &&
    chunk.status !== BLOCKED
  ) {
    return;
  }
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const initializedChunk: InitializedChunk<T> = chunk as any;
  initializedChunk.status = INITIALIZED;
  initializedChunk.value = value;
  initializedChunk.reason = null;
  wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
}

function triggerErrorOnChunk<T>(chunk: SomeChunk<T>, error: mixed): void {
  if (
    chunk.status !== PENDING &&
    chunk.status !== PENDING_WEAK &&
    chunk.status !== BLOCKED
  ) {
    return;
  }
  const listeners = chunk.reason;
  const erroredChunk: ErroredChunk<T> = chunk as any;
  erroredChunk.status = ERRORED;
  erroredChunk.value = null;
  erroredChunk.reason = error;
  if (listeners !== null) {
    rejectChunk(listeners, error);
  }
}

function reportGlobalError(response: Response, error: Error): void {
  if (response._closed) {
    return;
  }
  response._closed = true;
  response._closedReason = error;
  closeWeakSubscriptions(response);
  const streamErrors = response._streamErrors;
  response._streamErrors = null;
  if (streamErrors !== null) {
    for (let i = 0; i < streamErrors.length; i++) {
      streamErrors[i](error);
    }
  }
  response._chunks.forEach(chunk => {
    if (chunk.status === PENDING) {
      triggerErrorOnChunk(chunk, error);
    } else if (chunk.status === PENDING_WEAK) {
      haltChunk(chunk);
    }
  });
}

export function stopReading(response: Response, reason: mixed): void {
  if (response._disposed) {
    return;
  }
  response._disposed = true;
  const error =
    reason instanceof Error ? reason : new Error('Connection closed.');
  const subscriptions = response._subscriptions;
  if (subscriptions !== null) {
    subscriptions.forEach(subscription =>
      detachModelSubscription(subscription),
    );
    response._subscriptions = null;
  }
  const cleanups = response._cleanups;
  if (cleanups !== null) {
    cleanups.forEach(cleanup => cleanup());
    response._cleanups = null;
  }
  reportGlobalError(response, error);
  response._chunks.forEach(chunk => {
    if (chunk.status === BLOCKED) {
      triggerErrorOnChunk(chunk, error);
    } else if (
      chunk.status === RESOLVED_MODEL ||
      chunk.status === RESOLVED_MODULE
    ) {
      const erroredChunk: ErroredChunk<any> = chunk as any;
      erroredChunk.status = ERRORED;
      erroredChunk.value = null;
      erroredChunk.reason = error;
    }
  });
}

export function addResponseCleanup(
  response: Response,
  cleanup: () => void,
): void {
  if (response._disposed) {
    cleanup();
    return;
  }
  let cleanups = response._cleanups;
  if (cleanups === null) {
    response._cleanups = cleanups = new Set();
  }
  cleanups.add(cleanup);
}

function detachModelSubscription(subscription: ModelSubscription): void {
  const response = subscription.response;
  subscription.response = null;
  subscription.resolve = null;
  subscription.reject = null;
  const owner = subscription.owner;
  subscription.owner = null;
  if (owner !== null) {
    owner.delete(subscription);
  }
  if (response !== null && response._subscriptions !== null) {
    response._subscriptions.delete(subscription);
  }
}

function subscribeToModel(
  response: Response,
  source: Thenable<any> | Promise<any> | Wakeable,
  resolve: any => mixed,
  reject: mixed => mixed,
  owner: null | Set<ModelSubscription> = null,
): void {
  if (response._disposed) {
    return;
  }
  const subscription: ModelSubscription = {response, owner, resolve, reject};
  if (owner !== null) {
    owner.add(subscription);
  }
  let subscriptions = response._subscriptions;
  if (subscriptions === null) {
    response._subscriptions = subscriptions = new Set();
  }
  subscriptions.add(subscription);
  source.then(
    model => {
      const onResolve = subscription.resolve;
      detachModelSubscription(subscription);
      if (onResolve !== null) {
        onResolve(model);
      }
    },
    error => {
      const onReject = subscription.reject;
      detachModelSubscription(subscription);
      if (onReject !== null) {
        onReject(error);
      }
    },
  );
}

function readChunk<T>(chunk: SomeChunk<T>): T {
  if (chunk.status === RESOLVED_MODEL) {
    initializeResolvedModelChunk(chunk);
  } else if (chunk.status === RESOLVED_MODULE) {
    initializeModuleChunk(chunk);
  }
  switch (chunk.status) {
    case INITIALIZED:
      return chunk.value;
    case PENDING:
    case PENDING_WEAK:
    case HALTED:
    case BLOCKED:
      throw chunk;
    default:
      throw chunk.reason;
  }
}

function createLazyChunkWrapper<T>(
  chunk: SomeChunk<T>,
): LazyComponent<T, SomeChunk<T>> {
  const lazy: LazyComponent<T, SomeChunk<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: chunk,
    _init: readChunk,
  };
  if (__DEV__) {
    const debugChunk: any = chunk;
    if (debugChunk._debugInfo === undefined) {
      debugChunk._debugInfo = [];
    }
    lazy._debugInfo = debugChunk._debugInfo;
  }
  return lazy;
}

function initializeModuleChunk<T>(chunk: ResolvedModuleChunk<T>): void {
  try {
    const value = requireModule(chunk.value);
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

function resolveModuleChunk<T>(
  chunk: SomeChunk<T>,
  clientReference: ClientReference<T>,
): void {
  if (
    chunk.status !== PENDING &&
    chunk.status !== PENDING_WEAK &&
    chunk.status !== BLOCKED
  ) {
    return;
  }
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk: ResolvedModuleChunk<T> = chunk as any;
  resolvedChunk.status = RESOLVED_MODULE;
  resolvedChunk.value = clientReference;
  resolvedChunk.reason = null;
  if (resolveListeners !== null) {
    initializeModuleChunk(resolvedChunk);
    wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
  }
}

function defaultErrorHandler(error: mixed): void {
  console['error'](error);
}

function resolveClientReferenceError(response: Response, error: mixed): mixed {
  const onError = response._onError;
  const digest = onError(error);
  if (digest != null && typeof digest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      `onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "${typeof digest}" instead`,
    );
  }
  let resolvedError;
  if (__DEV__) {
    if (error instanceof Error) {
      // eslint-disable-next-line react-internal/prod-error-codes
      resolvedError = new Error(error.message);
      resolvedError.name = error.name;
      resolvedError.stack = error.stack;
    } else {
      const message =
        typeof error === 'object' && error !== null
          ? describeObjectForErrorMessage(error)
          : // eslint-disable-next-line react-internal/safe-string-coercion
            String(error);
      // eslint-disable-next-line react-internal/prod-error-codes
      resolvedError = new Error(message);
    }
  } else {
    resolvedError = resolveErrorProd(response);
  }
  (resolvedError as any).digest = digest || '';
  return resolvedError;
}

function resolveModule(
  response: Response,
  reference: Object,
): null | SomeChunk<any> {
  const existingChunk = response._modules.get(reference);
  if (existingChunk !== undefined) {
    return existingChunk;
  }
  let chunk;
  try {
    let clientReferenceMetadata;
    try {
      // This lookup runs in serializeClientReference in ordinary Flight.
      // SSR module loading below still belongs to the reader's error boundary.
      clientReferenceMetadata =
        response._resolveClientReferenceMetadata(reference);
    } catch (error) {
      chunk = createBlockedChunk<any>(response);
      response._modules.set(reference, chunk);
      try {
        triggerErrorOnChunk(
          chunk,
          resolveClientReferenceError(response, error),
        );
      } catch (fatalError) {
        stopReading(response, fatalError);
      }
      return chunk;
    }
    if (clientReferenceMetadata === null) {
      const metadata = getServerReference(response._result, reference);
      if (metadata === undefined) {
        return null;
      }
      chunk = createBlockedChunk<any>(response);
      response._modules.set(reference, chunk);
      if (response._closed) {
        triggerErrorOnChunk(chunk, getClosedReason(response));
        return chunk;
      }
      loadServerReference(response, metadata, chunk);
      return chunk;
    }
    chunk = createBlockedChunk<any>(response);
    response._modules.set(reference, chunk);
    if (response._closed) {
      triggerErrorOnChunk(chunk, getClosedReason(response));
      return chunk;
    }
    const clientReference = resolveClientReference<any>(
      response._bundlerConfig,
      clientReferenceMetadata,
    );
    prepareDestinationForModule(
      response._moduleLoading,
      response._nonce,
      clientReferenceMetadata,
    );
    const promise = preloadModule(clientReference);
    if (promise) {
      subscribeToModel(
        response,
        promise,
        resolveModuleChunk.bind(null, chunk, clientReference),
        triggerErrorOnChunk.bind(null, chunk),
      );
    } else {
      resolveModuleChunk(chunk, clientReference);
    }
  } catch (error) {
    if (chunk === undefined) {
      chunk = createBlockedChunk<any>(response);
      response._modules.set(reference, chunk);
    }
    triggerErrorOnChunk(chunk, error);
  }
  return chunk;
}

function createElementStore(validated: 0 | 1 | 2): {validated: 0 | 1 | 2} {
  const store = {validated};
  Object.defineProperty(store, 'validated', {
    configurable: false,
    enumerable: false,
    writable: true,
    value: validated,
  });
  return store;
}

function createElement(
  response: Response,
  element: ReactElement,
  registerModel: boolean,
): ReactElement {
  let resolvedElement: ReactElement;
  if (__DEV__) {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type: element.type,
      key: element.key,
      props: element.props,
      _owner: element._owner,
      _store: createElementStore(element._store.validated),
    } as any;
    Object.defineProperties(resolvedElement, {
      ref: {value: null},
      _debugInfo: {
        value: isArray(element._debugInfo)
          ? element._debugInfo.slice()
          : element._debugInfo,
        writable: true,
      },
      _debugStack: {value: element._debugStack, writable: true},
      _debugTask: {value: element._debugTask, writable: true},
    });
  } else {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type: element.type,
      key: element.key,
      ref: null,
      props: element.props,
    } as any;
  }
  if (registerModel) {
    response._models.set(element, resolvedElement);
  }
  const type = element.type;
  const moduleChunk =
    type !== null && (typeof type === 'object' || typeof type === 'function')
      ? resolveModule(response, type as any)
      : null;
  if (moduleChunk !== null) {
    resolvedElement.type = createLazyChunkWrapper(moduleChunk);
  } else if (
    type !== null &&
    (typeof type === 'object' || typeof type === 'function') &&
    resolveTemporaryReference(response, type as any)
  ) {
    resolvedElement.type = response._models.get(type);
  }
  if (__DEV__ && !registerModel) {
    const lazy = response._models.get(element);
    if (lazy === undefined) {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error(
        'Expected a pending element in Result. This is a bug in React.',
      );
    }
    const chunk: PendingChunk<ReactElement> = lazy._payload;
    chunk._initializingElement = resolvedElement;
    try {
      resolvedElement.props = readModel(response, element.props);
    } finally {
      delete chunk._initializingElement;
    }
  } else {
    resolvedElement.props = readModel(response, element.props);
  }
  if (__DEV__) {
    response._completedElements.push(resolvedElement);
  }
  return resolvedElement;
}

function initializeElementChunk(
  response: Response,
  chunk: SomeChunk<any>,
  element: ReactElement,
): void {
  try {
    initializeChunk(chunk, createElement(response, element, false));
  } catch (error) {
    rejectElementChunk(chunk, element, error);
  } finally {
    freezeCompletedElements(response);
  }
}

function rejectElementChunk(
  chunk: SomeChunk<any>,
  element: ReactElement,
  error: mixed,
): void {
  if (__DEV__) {
    const erroredComponent: ReactComponentInfo = {
      name: getComponentNameFromType(element.type) || '',
      owner: element._owner,
    };
    // $FlowFixMe[cannot-write]
    erroredComponent.debugStack = element._debugStack;
    (chunk as any)._debugInfo.push(erroredComponent);
  }
  triggerErrorOnChunk(chunk, error);
}

function readElement(response: Response, element: ReactElement): any {
  const type = element.type;
  if (
    type !== null &&
    (typeof type === 'object' || typeof type === 'function')
  ) {
    resolveModule(response, type as any);
  }
  let promise;
  try {
    promise = preloadModel(response, element.props);
  } catch (error) {
    const chunk = createBlockedChunk<any>(response);
    const lazy = createLazyChunkWrapper(chunk);
    rejectElementChunk(chunk, element, error);
    response._models.set(element, lazy);
    return lazy;
  }
  if (promise === null) {
    return createElement(response, element, true);
  }
  const chunk = createBlockedChunk<any>(response);
  const lazy = createLazyChunkWrapper(chunk);
  response._models.set(element, lazy);
  subscribeToModel(
    response,
    promise,
    initializeElementChunk.bind(null, response, chunk, element),
    rejectElementChunk.bind(null, chunk, element),
  );
  return lazy;
}

function resolveModelChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  model: T,
): void {
  if (chunk.status !== PENDING && chunk.status !== PENDING_WEAK) {
    return;
  }
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk: ResolvedModelChunk<T> = chunk as any;
  resolvedChunk.status = RESOLVED_MODEL;
  resolvedChunk.value = model;
  resolvedChunk.reason = response;
  if (resolveListeners !== null) {
    initializeResolvedModelChunk(resolvedChunk);
    wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
  }
}

function initializeResolvedModelChunk<T>(chunk: ResolvedModelChunk<T>): void {
  const model = chunk.value;
  const response = chunk.reason;
  const blockedChunk: BlockedChunk<T> = chunk as any;
  blockedChunk.status = BLOCKED;
  blockedChunk.value = null;
  blockedChunk.reason = null;
  try {
    const promise = preloadModel(response, model);
    if (promise === null) {
      initializeModelChunk(response, blockedChunk, model);
    } else {
      subscribeToModel(
        response,
        promise,
        () => initializeModelChunk(response, blockedChunk, model),
        error => triggerErrorOnChunk(blockedChunk, error),
      );
    }
  } catch (error) {
    triggerErrorOnChunk(blockedChunk, error);
  }
}

function isLazyModel(response: Response, model: any): boolean {
  return (
    model !== null &&
    typeof model === 'object' &&
    model.$$typeof === REACT_LAZY_TYPE &&
    getModelInfo(response._result, model) === 0
  );
}

function isElementModel(response: Response, model: any): boolean {
  if (
    model === null ||
    typeof model !== 'object' ||
    model.$$typeof !== REACT_ELEMENT_TYPE
  ) {
    return false;
  }
  const kind = getModelInfo(response._result, model) & MODEL_KIND_MASK;
  return kind === 0 || kind === MODEL_ELEMENT;
}

function readModelReference(
  response: Response,
  reference: ModelReference,
  visitElement?: ReactElement => void,
): any {
  const source = reference.root;
  if (source.status !== 'fulfilled') {
    if (source.status === 'rejected') {
      throw resolveError(response, source, source.reason);
    }
    throw source;
  }
  const keys = [];
  let location = reference;
  let parent = location.parent;
  while (parent !== null) {
    keys.push(location.key);
    location = parent;
    parent = location.parent;
  }
  let model: any = source.value;
  for (let i = keys.length; i >= 0; i--) {
    while (isLazyModel(response, model)) {
      const lazy = model;
      try {
        model = lazy._init(lazy._payload);
      } catch (error) {
        throw resolveError(response, lazy._payload, error);
      }
    }
    if (visitElement !== undefined && isElementModel(response, model)) {
      visitElement(model);
    }
    if (i > 0) {
      model = model[keys[i - 1]];
    }
  }
  return model;
}

function readModel(response: Response, value: any): any {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return value;
  }

  const info = getModelInfo(response._result, value);
  const models = response._models;
  const existingModel = models.get(value);
  if (existingModel !== undefined) {
    if (__DEV__ && existingModel === value && isArray(value)) {
      return readArray(response, value);
    }
    return existingModel;
  }
  const reference = getValueReference(response._result, value);
  if (reference !== undefined) {
    const referencedModel = readModelReference(response, reference);
    let model;
    if (
      __DEV__ &&
      reference.parent === null &&
      referencedModel === reference.root.value
    ) {
      // Root completion consumes its task history; raw dereferencing skips it.
      // A chunk still initializing can use provisional copies to preserve cycles.
      const chunk: SomeChunk<any> = readModel(response, reference.root);
      model =
        chunk.status === INITIALIZED
          ? chunk.value
          : readModel(response, referencedModel);
    } else {
      model = readModel(response, referencedModel);
    }
    models.set(value, model);
    return model;
  }
  switch (info & MODEL_KIND_MASK) {
    case MODEL_OBJECT:
      return readObject(response, value);
    case MODEL_ARRAY:
      return readArray(response, value);
    case MODEL_ELEMENT:
      return readElement(response, value);
  }
  return readSpecialModel(response, value);
}

function readArray(response: Response, value: Array<any>): Array<any> {
  const copy: Array<any> = new Array(value.length);
  response._models.set(value, copy);
  for (let i = 0; i < value.length; i++) {
    copy[i] = readModel(response, value[i]);
  }
  return copy;
}

function readObject(response: Response, object: {[key: string]: any}): any {
  const copy: {[key: string]: any} = {};
  response._models.set(object, copy);
  const keys = Object.keys(object);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const child = readModel(response, object[key]);
    if (key === '__proto__') {
      Object.defineProperty(copy, key, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    } else {
      copy[key] = child;
    }
  }
  return copy;
}

function waitForOutlinedModel(
  response: Response,
  model: any,
  wakeable: Wakeable,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function retry() {
      try {
        const pending = preloadModel(response, model, true);
        if (pending === null) {
          resolve();
        } else {
          subscribeToModel(response, pending, resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    }
    subscribeToModel(response, wakeable, retry, retry);
  });
}

function scanOutlinedModel(
  response: Response,
  model: any,
  state: PreloadState,
  chunks: PreloadDependencies,
): void {
  let value = model;
  while (isLazyModel(response, value)) {
    const lazy = value;
    try {
      value = lazy._init(lazy._payload);
    } catch (error) {
      if (isHaltedModel(response, lazy._payload)) {
        throw getClosedReason(response);
      }
      if (
        lazy._payload.status !== 'rejected' &&
        error !== null &&
        typeof error === 'object' &&
        typeof (error as any).then === 'function'
      ) {
        if (state.parent !== null) {
          state.parent.cacheable = false;
        }
        addPreloadDependency(
          chunks,
          waitForOutlinedModel(response, model, error as any),
        );
        return;
      }
      throw resolveError(response, lazy._payload, error);
    }
  }
  if (isElementModel(response, value)) {
    const type = value.type;
    if (
      type !== null &&
      (typeof type === 'object' || typeof type === 'function')
    ) {
      resolveModule(response, type as any);
    }
    scanModel(response, value.props, state, chunks);
  } else {
    scanModel(response, value, state, chunks);
  }
}

function createPreloadPromise(chunk: Wakeable): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chunk.then(() => resolve(), reject);
  });
}

function preloadModel(
  response: Response,
  model: any,
  isOutlined: boolean = false,
): Promise<void> | null {
  if (
    model === null ||
    (typeof model !== 'object' && typeof model !== 'function') ||
    response._models.get(model) === model
  ) {
    return null;
  }
  const state: PreloadState = {nextIndex: 0, parent: null, stack: []};
  const pending: PreloadDependencies = {dependencies: null};
  try {
    if (isOutlined) {
      scanOutlinedModel(response, model, state, pending);
    } else {
      scanModel(response, model, state, pending);
    }
  } catch (error) {
    const chunk = createErrorChunk<void>(error);
    for (let i = 0; i < state.stack.length; i++) {
      const preload = state.stack[i];
      preload.onStack = false;
      preload.dependencies = null;
      preload.chunk = chunk;
    }
    throw error;
  }
  const chunks = pending.dependencies;
  if (chunks === null) {
    return null;
  }
  const promises = [];
  const iterator = chunks.values();
  for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
    promises.push(createPreloadPromise(entry.value));
  }
  return Promise.all(promises).then(noop);
}

function scanModelReference(
  response: Response,
  value: Object,
  reference: ModelReference,
  state: PreloadState,
  chunks: PreloadDependencies,
): void {
  try {
    const root = reference.root;
    if (root.status !== 'fulfilled') {
      if (root.status === 'rejected') {
        throw resolveError(response, root, root.reason);
      }
      throw root;
    }
    scanModel(response, root.value, state, chunks);
    const model = readModelReference(response, reference, element => {
      scanModel(response, element.props, state, chunks);
    });
    scanModel(response, model, state, chunks);
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      if (state.parent !== null) {
        state.parent.cacheable = false;
      }
      addPreloadDependency(
        chunks,
        waitForOutlinedModel(response, value, error as any),
      );
    } else {
      throw error;
    }
  }
}

function scanModel(
  response: Response,
  value: any,
  state: PreloadState,
  chunks: PreloadDependencies,
): boolean {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return true;
  }
  const existingModel = response._models.get(value);
  if (existingModel !== undefined) {
    return existingModel === value;
  }
  const info = getModelInfo(response._result, value);
  const kind = info & MODEL_KIND_MASK;
  if (kind === MODEL_ELEMENT) {
    return false;
  }
  if (kind === 0) {
    if (resolveTemporaryReference(response, value)) {
      return response._models.get(value) === value;
    }
    const chunk = resolveModule(response, value);
    if (chunk !== null) {
      if (chunk.status === RESOLVED_MODULE) {
        initializeModuleChunk(chunk);
      }
      if (chunk.status === ERRORED) {
        throw chunk.reason;
      }
      if (chunk.status === PENDING || chunk.status === BLOCKED) {
        addPreloadDependency(chunks, chunk);
      }
      return false;
    }
    if (value instanceof Date) {
      return true;
    }
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return true;
    }
    if (
      value.$$typeof === REACT_ELEMENT_TYPE ||
      value.$$typeof === REACT_LAZY_TYPE ||
      typeof value.then === 'function'
    ) {
      return false;
    }
  }
  let preload: void | ModelPreload = response._preloads.get(value);
  const existingPreload = preload !== undefined;
  const parent = state.parent;
  if (preload === undefined) {
    const index = state.nextIndex++;
    preload = {
      model: value,
      index,
      lowlink: index,
      onStack: true,
      passThrough: false as boolean,
      cacheable: true as boolean,
      chunk: null,
      dependencies: null,
    };
    response._preloads.set(value, preload);
    state.stack.push(preload);
    state.parent = preload;
    try {
      preload.passThrough = scanModelFields(
        response,
        value,
        state,
        preload,
        kind,
      );
    } finally {
      state.parent = parent;
    }
    if (preload.lowlink === preload.index) {
      completeModelPreloads(response, state, preload);
    }
  }
  if (parent !== null && !preload.cacheable) {
    parent.cacheable = false;
  }
  if (preload.onStack) {
    if (parent !== null) {
      parent.lowlink = Math.min(
        parent.lowlink,
        existingPreload ? preload.index : preload.lowlink,
      );
    }
    return false;
  }
  const pending = preload.chunk;
  if (pending !== null) {
    if (pending.status === ERRORED) {
      throw pending.reason;
    }
    if (pending.status !== INITIALIZED) {
      addPreloadDependency(chunks, pending);
    }
  }
  return preload.passThrough;
}

function completeModelPreloads(
  response: Response,
  state: PreloadState,
  root: ModelPreload,
): void {
  const stack = state.stack;
  if (stack[stack.length - 1] === root) {
    stack.pop();
    root.onStack = false;
    root.chunk = createModelPreloadChunk(response, root.dependencies);
    root.dependencies = null;
    cacheModelPreload(response, root);
    return;
  }
  const group: Array<ModelPreload> = [];
  let dependencies: null | Set<Wakeable> = null;
  let cacheable = true;
  let preload;
  do {
    preload = stack.pop();
    if (preload === undefined) {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error('Expected a pending Result model preload.');
    }
    preload.onStack = false;
    cacheable = cacheable && preload.cacheable;
    group.push(preload);
    const localDependencies = preload.dependencies;
    if (localDependencies !== null) {
      if (dependencies === null) {
        dependencies = localDependencies;
      } else {
        const iterator = localDependencies.values();
        for (
          let entry = iterator.next();
          !entry.done;
          entry = iterator.next()
        ) {
          dependencies.add(entry.value);
        }
      }
      preload.dependencies = null;
    }
  } while (preload !== root);

  const chunk = createModelPreloadChunk(response, dependencies);
  for (let i = 0; i < group.length; i++) {
    preload = group[i];
    preload.chunk = chunk;
    preload.cacheable = cacheable;
    cacheModelPreload(response, preload);
  }
}

function addPreloadDependency(
  preload: PreloadDependencies,
  dependency: Wakeable,
): void {
  let dependencies = preload.dependencies;
  if (dependencies === null) {
    preload.dependencies = dependencies = new Set();
  }
  dependencies.add(dependency);
}

function createModelPreloadChunk(
  response: Response,
  dependencies: null | Set<Wakeable>,
): null | SomeChunk<void> {
  if (dependencies === null) {
    return null;
  }
  const chunk = createBlockedChunk<void>(response);
  let remaining = dependencies.size;
  dependencies.forEach(dependency => {
    dependency.then(
      () => {
        if (--remaining === 0) {
          initializeChunk(chunk, undefined);
        }
      },
      error => triggerErrorOnChunk(chunk, error),
    );
  });
  return chunk;
}

function cacheModelPreload(response: Response, preload: ModelPreload): void {
  if (preload.passThrough) {
    response._models.set(preload.model, preload.model);
  }
  if (preload.passThrough || !preload.cacheable) {
    response._preloads.delete(preload.model);
  }
}

function scanModelFields(
  response: Response,
  value: any,
  state: PreloadState,
  chunks: PreloadDependencies,
  kind: number,
): boolean {
  let passThrough = true;
  const reference = getValueReference(response._result, value);
  if (reference !== undefined) {
    scanModelReference(response, value, reference, state, chunks);
    return false;
  }
  const collection =
    kind === 0 ? getCollectionEntries(response._result, value) : undefined;
  if (collection !== undefined) {
    scanModelReference(
      response,
      value,
      {root: collection, parent: null, key: ''},
      state,
      chunks,
    );
    return false;
  }
  if (kind === MODEL_ARRAY || (kind === 0 && isArray(value))) {
    for (let i = 0; i < value.length; i++) {
      if (hasOwnProperty.call(value, i)) {
        if (!scanModel(response, value[i], state, chunks)) {
          passThrough = false;
        }
      } else {
        passThrough = false;
      }
    }
  } else if (kind === 0 && value instanceof Map) {
    const iterator = value.entries();
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
      if (!scanModel(response, entry.value[0], state, chunks)) {
        passThrough = false;
      }
      if (!scanModel(response, entry.value[1], state, chunks)) {
        passThrough = false;
      }
    }
  } else if (kind === 0 && value instanceof Set) {
    const iterator = value.values();
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
      if (!scanModel(response, entry.value, state, chunks)) {
        passThrough = false;
      }
    }
  } else {
    if (kind === 0 && getPrototypeOf(value) !== ObjectPrototype) {
      if (getReadableStream(response._result, value) !== undefined) {
        return false;
      }
      if (getAsyncIterable(response._result, value) !== undefined) {
        return false;
      }
      const entries = getIteratorEntries(response._result, value);
      if (entries !== undefined) {
        scanModel(response, entries, state, chunks);
        return false;
      }
      if (typeof FormData === 'function' && value instanceof FormData) {
        return !hasFormDataBlobs(response._result, value);
      }
      if (typeof Blob === 'function' && value instanceof Blob) {
        return false;
      }
      if (value instanceof Error) {
        if (__DEV__ && 'cause' in value) {
          scanOutlinedModel(response, value.cause, state, chunks);
        }
        if (
          __DEV__ &&
          typeof AggregateError !== 'undefined' &&
          value instanceof AggregateError
        ) {
          scanOutlinedModel(response, value.errors, state, chunks);
        }
        return false;
      }
    }
    const object: {[key: string]: any} = value;
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      if (!scanModel(response, object[keys[i]], state, chunks)) {
        passThrough = false;
      }
    }
  }
  return passThrough;
}

function freezeCompletedElements(response: Response): void {
  if (__DEV__) {
    const elements = response._completedElements;
    for (let i = 0; i < elements.length; i++) {
      Object.freeze(elements[i].props);
      Object.freeze(elements[i]);
    }
    elements.length = 0;
  }
}

function subscribeChunkDebugInfo(
  response: Response,
  chunk: SomeChunk<any>,
  source: ResultModel<any>,
): void {
  if (
    __DEV__ &&
    !response._closed &&
    getResultModelStatus(source) !== null &&
    source._debugInfo !== undefined &&
    !isHalted(response._result, source)
  ) {
    let debugChunk: null | SomeChunk<any> = chunk;
    const unsubscribe = subscribeToDebugInfo(source, info => {
      if (debugChunk !== null) {
        debugChunk._debugInfo.push(info);
      }
    });
    let owner: null | Response = response;
    const cleanup = () => {
      unsubscribe();
      debugChunk = null;
      if (owner !== null) {
        if (owner._cleanups !== null) {
          owner._cleanups.delete(cleanup);
        }
        owner = null;
      }
    };
    if (response._cleanups === null) {
      response._cleanups = new Set();
    }
    response._cleanups.add(cleanup);
    source.then(cleanup, cleanup);
  }
}

function initializeModelChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  model: any,
): void {
  try {
    initializeChunk(
      chunk,
      completeModel(response, model, __DEV__ ? chunk._debugInfo : undefined),
    );
  } catch (error) {
    triggerErrorOnChunk(chunk, error);
  }
}

function resolveErrorProd(response: Response): Error {
  if (__DEV__) {
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

function resolveError(
  response: Response,
  thenable: Object,
  error: mixed,
): mixed {
  if (isHaltedModel(response, thenable)) {
    return getClosedReason(response);
  }
  const reference = getErrorReference(response._result, thenable);
  if (reference === undefined) {
    return error;
  }
  const existingError = response._models.get(reference);
  if (existingError !== undefined) {
    return existingError;
  }
  let resolvedError;
  if (
    __DEV__ &&
    error instanceof Error &&
    getErrorInfo(response._result, error) !== undefined
  ) {
    resolvedError = readModel(response, error);
  } else if (__DEV__) {
    let name = 'Error';
    let message;
    let descriptors = null;
    try {
      if (error instanceof Error) {
        name = error.name;
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error.message);
        descriptors = Object.getOwnPropertyDescriptors(error as any);
        delete descriptors.digest;
        delete descriptors.message;
        delete descriptors.name;
      } else if (typeof error === 'object' && error !== null) {
        message = describeObjectForErrorMessage(error);
      } else {
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error);
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      descriptors = null;
    }
    // eslint-disable-next-line react-internal/prod-error-codes
    resolvedError = new Error(message);
    if (descriptors !== null) {
      Object.defineProperties(resolvedError, descriptors);
    }
    resolvedError.name = name;
  } else {
    resolvedError = resolveErrorProd(response);
  }
  (resolvedError as any).digest = reference.digest;
  response._models.set(reference, resolvedError);
  return resolvedError;
}

export function readResult<T>(
  response: Response,
  result: Result<T>,
): Thenable<T> {
  const root = getRoot(result);
  const chunk = readModel(response, root);
  const hints = getHintQueue(result);
  let nextHintIndex = 0;
  function flushHints(): void {
    if (response._closed) {
      return;
    }
    try {
      const completedHints = hints.completedHints;
      for (; nextHintIndex < completedHints.length; nextHintIndex++) {
        const hint = completedHints[nextHintIndex];
        dispatchHint(hint.code, hint.model);
      }
      if (!hints.closed) {
        subscribeToModel(response, waitForHints(hints), flushHints, error =>
          stopReading(response, error),
        );
      } else {
        closeWeakSubscriptions(response);
      }
    } catch (error) {
      reportGlobalError(response, error);
    }
  }
  flushHints();
  return chunk;
}

function completeModel(
  response: Response,
  model: any,
  debugInfo?: ReactDebugInfo,
): any {
  try {
    const value: any =
      __DEV__ &&
      debugInfo !== undefined &&
      debugInfo.length > 0 &&
      isArray(model) &&
      (response._models.get(model) === undefined ||
        response._models.get(model) === model)
        ? readArray(response, model)
        : readModel(response, model);
    if (
      __DEV__ &&
      debugInfo !== undefined &&
      debugInfo.length > 0 &&
      value !== null &&
      typeof value === 'object' &&
      (value.$$typeof === REACT_ELEMENT_TYPE || isArray(value))
    ) {
      const resolvedDebugInfo = debugInfo.splice(0);
      if (isArray(value._debugInfo)) {
        // $FlowFixMe[method-unbinding]
        value._debugInfo.unshift.apply(value._debugInfo, resolvedDebugInfo);
      } else if (!Object.isFrozen(value)) {
        Object.defineProperty(value, '_debugInfo', {
          configurable: false,
          enumerable: false,
          value: resolvedDebugInfo,
          writable: true,
        });
      }
    }
    return value;
  } finally {
    freezeCompletedElements(response);
  }
}

function readSpecialModel(response: Response, value: any): any {
  const models = response._models;
  if (resolveTemporaryReference(response, value)) {
    return models.get(value);
  }
  const moduleChunk = resolveModule(response, value);
  if (moduleChunk !== null) {
    return readChunk(moduleChunk);
  }
  if (value.$$typeof === REACT_ELEMENT_TYPE) {
    return readElement(response, value);
  } else if (value.$$typeof === REACT_LAZY_TYPE) {
    const chunk = createPendingChunk<any>(response);
    const lazy = createLazyChunkWrapper(chunk);
    if (__DEV__) {
      const debugInfo = value._debugInfo;
      if (debugInfo !== undefined && debugInfo !== null) {
        const localDebugInfo: ReactDebugInfo = chunk._debugInfo;
        for (let i = 0; i < debugInfo.length; i++) {
          localDebugInfo.push(debugInfo[i]);
        }
      }
      const store = value._store;
      lazy._store =
        store === undefined ? undefined : createElementStore(store.validated);
    }
    models.set(value, lazy);
    const source = value._payload;
    if (__DEV__) {
      subscribeChunkDebugInfo(response, chunk, source);
    }
    const reject = (error: mixed): void => {
      if (__DEV__ && getResultModelStatus(source) !== null) {
        const model = getDebugModel(source);
        if (model !== undefined) {
          rejectElementChunk(
            chunk,
            model,
            resolveError(response, source, error),
          );
          return;
        }
      }
      triggerErrorOnChunk(chunk, resolveError(response, source, error));
    };
    if (response._closed || isHaltedModel(response, source)) {
      triggerErrorOnChunk(chunk, getClosedReason(response));
    } else if (source.status === INITIALIZED) {
      resolveModelChunk(response, chunk, source.value);
    } else if (source.status === ERRORED) {
      reject(source.reason);
    } else {
      subscribeToModel(
        response,
        source,
        model => resolveModelChunk(response, chunk, model),
        reject,
      );
    }
    return lazy;
  } else if (isArray(value)) {
    return readArray(response, value);
  } else {
    if (typeof value.then === 'function') {
      const thenable: {status?: string, ...} = value;
      const chunk = createPendingChunk<any>(
        response,
        thenable.status === PENDING_WEAK,
      );
      models.set(value, chunk);
      if (__DEV__) {
        subscribeChunkDebugInfo(response, chunk, value);
      }
      if (chunk.status === PENDING_WEAK && isHalted(response._result, value)) {
        haltChunk(chunk);
        return chunk;
      }
      if (response._closed || isHaltedModel(response, value)) {
        if (chunk.status === PENDING_WEAK) {
          haltChunk(chunk);
        } else {
          triggerErrorOnChunk(chunk, getClosedReason(response));
        }
        return chunk;
      }
      if (chunk.status === PENDING_WEAK) {
        subscribeWeakModel(response, chunk, value);
        return chunk;
      }
      const resolve = (model: any): void => {
        if (response._closed || chunk.status !== PENDING) {
          return;
        }
        const blockedChunk: BlockedChunk<any> = chunk as any;
        blockedChunk.status = BLOCKED;
        try {
          const promise = preloadModel(response, model);
          if (promise === null) {
            initializeModelChunk(response, chunk, model);
          } else {
            subscribeToModel(
              response,
              promise,
              () => initializeModelChunk(response, chunk, model),
              error => triggerErrorOnChunk(chunk, error),
            );
          }
        } catch (error) {
          triggerErrorOnChunk(chunk, error);
        }
      };
      const reject = (error: mixed) =>
        triggerErrorOnChunk(chunk, resolveError(response, value, error));
      const status = getResultModelStatus(value);
      if (status === INITIALIZED) {
        resolve(value.value);
      } else if (status === ERRORED) {
        reject(value.reason);
      } else {
        subscribeToModel(response, value, resolve, reject);
      }
      return chunk;
    }
    if (value instanceof Date) {
      return value;
    }
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return value;
    }
    if (value instanceof Map) {
      const copy: Map<any, any> = new Map();
      models.set(value, copy);
      const model = getCollectionEntries(response._result, value);
      if (model !== undefined) {
        const entries = readModel(
          response,
          readModelReference(response, {root: model, parent: null, key: ''}),
        );
        for (let i = 0; i < entries.length; i++) {
          copy.set(entries[i][0], entries[i][1]);
        }
        return copy;
      }
      value.forEach((child: any, key: any) => {
        copy.set(readModel(response, key), readModel(response, child));
      });
      return copy;
    }
    if (value instanceof Set) {
      const copy: Set<any> = new Set();
      models.set(value, copy);
      const model = getCollectionEntries(response._result, value);
      if (model !== undefined) {
        const entries = readModel(
          response,
          readModelReference(response, {root: model, parent: null, key: ''}),
        );
        for (let i = 0; i < entries.length; i++) {
          copy.add(entries[i]);
        }
        return copy;
      }
      value.forEach((child: any) => {
        copy.add(readModel(response, child));
      });
      return copy;
    }
    const readableStream = getReadableStream(response._result, value);
    if (readableStream !== undefined) {
      return readReadableStream(response, value, readableStream);
    }
    const asyncIterable = getAsyncIterable(response._result, value);
    if (asyncIterable !== undefined) {
      return readAsyncIterable(response, value, asyncIterable);
    }
    const iteratorEntries = getIteratorEntries(response._result, value);
    if (iteratorEntries !== undefined) {
      const copy: Array<any> = [];
      const iterator = copy.values();
      models.set(value, iterator);
      for (let i = 0; i < iteratorEntries.length; i++) {
        copy[i] = readModel(response, iteratorEntries[i]);
      }
      return iterator;
    }
    if (typeof FormData === 'function' && value instanceof FormData) {
      if (!hasFormDataBlobs(response._result, value)) {
        return value;
      }
      const formData: FormData = value;
      const entries = Array.from(formData.entries());
      const copy = new FormData();
      models.set(value, copy);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        copy.append(entry[0], readModel(response, entry[1]));
      }
      return copy;
    }
    if (typeof Blob === 'function' && value instanceof Blob) {
      const copy = new Blob([value], {type: value.type});
      models.set(value, copy);
      return copy;
    }
    if (value instanceof Error) {
      let copy;
      if (__DEV__) {
        const errorInfo = getErrorInfo(response._result, value);
        if (errorInfo === undefined) {
          // eslint-disable-next-line react-internal/prod-error-codes
          throw new Error(
            'Expected Error metadata in Result. This is a bug in React.',
          );
        }
        copy = resolveErrorDev(
          response,
          errorInfo,
          'cause' in value ? {cause: undefined} : undefined,
          typeof AggregateError !== 'undefined' &&
            value instanceof AggregateError,
        );
      } else {
        copy = resolveErrorProd(response);
      }
      models.set(value, copy);
      if (__DEV__ && 'cause' in value) {
        copy.cause = readOutlinedModel(response, value.cause);
      }
      if (
        __DEV__ &&
        typeof AggregateError !== 'undefined' &&
        copy instanceof AggregateError
      ) {
        copy.errors = new AggregateError(
          readOutlinedModel(response, value.errors),
        ).errors;
      }
      return copy;
    }
    return readObject(response, value);
  }
}

function resolveTemporaryReference(response: Response, value: Object): boolean {
  const reference = getTemporaryReference(response._result, value);
  if (reference === undefined) {
    return false;
  }
  const temporaryReferences = response._tempRefs;
  if (temporaryReferences == null) {
    throw new Error(
      'Missing a temporary reference set but the RSC response returned a temporary reference. ' +
        'Pass a temporaryReference option with the set that was used with the reply.',
    );
  }
  response._models.set(
    value,
    readTemporaryReference(temporaryReferences, '$' + reference),
  );
  return true;
}

function loadServerReference(
  response: Response,
  metaData: ServerReferenceMetadata,
  chunk: SomeChunk<any>,
): void {
  if (metaData.isObjectReference) {
    initializeChunk(chunk, createServerObjectReference(metaData.id));
    return;
  }
  const bound =
    metaData.bound === null ? null : readModel(response, metaData.bound);
  if (bound !== null) {
    bound.catch(noop);
  }
  if (!response._serverReferenceConfig) {
    initializeChunk(
      chunk,
      createBoundServerReference(
        {id: metaData.id, bound},
        response._callServer,
        response._encodeFormAction,
        undefined,
      ),
    );
    return;
  }
  const serverReference = resolveServerReference<any>(
    response._serverReferenceConfig,
    metaData.id,
  );
  const promise = preloadModule(serverReference);
  if (!promise && !bound) {
    const resolvedValue = requireModule(serverReference) as any;
    registerBoundServerReference(
      resolvedValue,
      metaData.id,
      bound,
      response._encodeFormAction,
    );
    initializeChunk(chunk, resolvedValue);
    return;
  }
  subscribeToModel(
    response,
    Promise.all([promise, bound]),
    ([, boundArgs]) => {
      try {
        let resolvedValue = requireModule(serverReference) as any;
        if (boundArgs !== null) {
          boundArgs = boundArgs.slice(0);
          boundArgs.unshift(null);
          resolvedValue = resolvedValue.bind.apply(resolvedValue, boundArgs);
        }
        registerBoundServerReference(
          resolvedValue,
          metaData.id,
          bound,
          response._encodeFormAction,
        );
        initializeChunk(chunk, resolvedValue);
      } catch (error) {
        triggerErrorOnChunk(chunk, error);
      }
    },
    error => triggerErrorOnChunk(chunk, error),
  );
}

function registerStreamError(
  response: Response,
  onError: Error => void,
): () => void {
  let streamErrors = response._streamErrors;
  if (streamErrors === null) {
    response._streamErrors = streamErrors = [];
  }
  streamErrors.push(onError);
  return () => {
    const errors = response._streamErrors;
    if (errors !== null) {
      const index = errors.indexOf(onError);
      if (index !== -1) {
        errors.splice(index, 1);
      }
    }
  };
}

function readReadableStream<T>(
  response: Response,
  model: Object,
  source: ResultStreamController<T>,
): ReadableStream {
  let controller: ReadableStreamController = null as any;
  let closed = false;
  let cancelled = false;
  let unsubscribe = noop;
  let unregisterError = noop;
  const pendingChunks: Set<SomeChunk<T>> = new Set();
  const subscriptions: Set<ModelSubscription> = new Set();
  function subscribe(
    wakeable: Thenable<any> | Promise<any> | Wakeable,
    resolve: any => mixed,
    reject: mixed => mixed = noop,
  ): void {
    subscribeToModel(response, wakeable, resolve, reject, subscriptions);
  }
  function cancel(reason: mixed): void {
    if (cancelled) {
      return;
    }
    cancelled = true;
    closed = true;
    unsubscribe();
    unregisterError();
    subscriptions.forEach(detachModelSubscription);
    pendingChunks.forEach(chunk => triggerErrorOnChunk(chunk, reason));
    pendingChunks.clear();
    previousBlockedChunk = null;
  }
  const stream = new ReadableStream({
    type: source.isByteStream ? 'bytes' : undefined,
    start(c) {
      controller = c;
    },
    cancel(reason) {
      cancel(reason);
    },
  });
  response._models.set(model, stream);
  if (response._closed || isHaltedModel(response, model)) {
    controller.error(getClosedReason(response));
    return stream;
  }
  let previousBlockedChunk: SomeChunk<T> | null = null;
  const reader: StreamReader<T> = {
    halt() {
      if (response._allowPartialStream) {
        reader.close();
      } else {
        reader.error(getClosedReason(response));
      }
    },
    enqueue(entry: Promise<T>) {
      if (closed || cancelled) {
        return;
      }
      const previous = previousBlockedChunk;
      const chunk = createPendingChunk<T>();
      pendingChunks.add(chunk);
      previousBlockedChunk = chunk;
      subscribe(
        chunk,
        value => {
          pendingChunks.delete(chunk);
          if (!cancelled) {
            controller.enqueue(
              source.isByteStream
                ? new Uint8Array(value as any)
                : (value as any),
            );
          }
          if (previousBlockedChunk === chunk) {
            previousBlockedChunk = null;
          }
        },
        reason => {
          pendingChunks.delete(chunk);
          if (!cancelled) {
            cancel(reason);
            controller.error(reason as any);
          }
        },
      );

      if (isHaltedModel(response, entry)) {
        if (previous === null) {
          triggerErrorOnChunk(chunk, getClosedReason(response));
        } else {
          subscribe(
            previous,
            () => triggerErrorOnChunk(chunk, getClosedReason(response)),
            reason => triggerErrorOnChunk(chunk, reason),
          );
        }
        return;
      }
      subscribe(
        entry,
        value => {
          if (chunk.status !== PENDING) {
            return;
          }
          const blockedChunk: BlockedChunk<T> = chunk as any;
          blockedChunk.status = BLOCKED;
          try {
            const pending = preloadModel(response, value);
            if (pending !== null) {
              pending.catch(noop);
            }
            const initialize = () => {
              if (pending === null) {
                initializeModelChunk(response, chunk, value);
              } else {
                subscribe(
                  pending,
                  () => initializeModelChunk(response, chunk, value),
                  reason => triggerErrorOnChunk(chunk, reason),
                );
              }
            };
            if (previous === null) {
              initialize();
            } else {
              subscribe(previous, initialize, reason =>
                triggerErrorOnChunk(chunk, reason),
              );
            }
          } catch (reason) {
            if (previous === null) {
              triggerErrorOnChunk(chunk, reason);
            } else {
              subscribe(
                previous,
                () => triggerErrorOnChunk(chunk, reason),
                error => triggerErrorOnChunk(chunk, error),
              );
            }
          }
        },
        reason => {
          if (previous === null) {
            triggerErrorOnChunk(chunk, resolveError(response, entry, reason));
          } else {
            subscribe(
              previous,
              () =>
                triggerErrorOnChunk(
                  chunk,
                  resolveError(response, entry, reason),
                ),
              error => triggerErrorOnChunk(chunk, error),
            );
          }
        },
      );
    },
    close() {
      if (closed) {
        return;
      }
      closed = true;
      const previous = previousBlockedChunk;
      previousBlockedChunk = null;
      if (previous === null) {
        if (!cancelled) {
          closeReadableStream(controller, source.isByteStream);
          unregisterError();
        }
      } else {
        subscribe(previous, () => {
          if (!cancelled) {
            closeReadableStream(controller, source.isByteStream);
            unregisterError();
          }
        });
      }
    },
    error(reason: mixed) {
      if (closed) {
        return;
      }
      closed = true;
      const error = resolveError(response, model, reason);
      const previous = previousBlockedChunk;
      previousBlockedChunk = null;
      if (previous === null) {
        if (!cancelled) {
          cancelled = true;
          controller.error(error as any);
          unregisterError();
        }
      } else {
        subscribe(previous, () => {
          if (!cancelled) {
            cancelled = true;
            controller.error(error as any);
            unregisterError();
          }
        });
      }
    },
  };
  unregisterError = registerStreamError(response, error => {
    cancel(error);
    controller.error(error);
  });
  unsubscribe = source.subscribe(reader);
  if (cancelled) {
    unsubscribe();
  }
  return stream;
}

function asyncIterator(this: $AsyncIterator<any, any, void>) {
  return this;
}

function readAsyncIterable<T>(
  response: Response,
  model: Object,
  source: AsyncIterableController<T>,
): $AsyncIterable<T, T, void> {
  const buffer: Array<SomeChunk<IteratorResult<T, T>>> = [];
  let closed = false;
  let nextWriteIndex = 0;
  let unsubscribe = noop;
  let unregisterError = noop;
  const subscriptions: Set<ModelSubscription> = new Set();

  function release(): void {
    if (closed && subscriptions.size === 0) {
      unsubscribe();
      unregisterError();
    }
  }

  function rejectEntry(
    chunk: SomeChunk<IteratorResult<T, T>>,
    error: mixed,
  ): void {
    triggerErrorOnChunk(chunk, error);
    release();
  }

  function resolveIteratorResult(
    chunk: SomeChunk<IteratorResult<T, T>>,
    entry: IteratorResult<T, T>,
  ): void {
    if (chunk.status !== PENDING) {
      return;
    }
    const blockedChunk: BlockedChunk<IteratorResult<T, T>> = chunk as any;
    blockedChunk.status = BLOCKED;
    function initialize(): void {
      if (chunk.status !== BLOCKED) {
        return;
      }
      try {
        const value = entry.done
          ? readOutlinedModel(response, entry.value)
          : readModel(response, entry.value);
        freezeCompletedElements(response);
        initializeChunk(
          chunk,
          entry.done ? {done: true, value} : {done: false, value},
        );
      } catch (error) {
        triggerErrorOnChunk(chunk, error);
      }
      release();
    }
    try {
      const pending = preloadModel(response, entry.value, !!entry.done);
      if (pending === null) {
        initialize();
      } else {
        subscribeToModel(
          response,
          pending,
          initialize,
          error => rejectEntry(chunk, error),
          subscriptions,
        );
      }
    } catch (error) {
      rejectEntry(chunk, error);
    }
  }

  function enqueue(entry: Promise<T>, done: boolean): void {
    if (closed) {
      return;
    }
    if (nextWriteIndex === buffer.length) {
      buffer[nextWriteIndex] = createPendingChunk();
    }
    const chunk = buffer[nextWriteIndex++];
    if (isHaltedModel(response, entry)) {
      triggerErrorOnChunk(chunk, getClosedReason(response));
      return;
    }
    subscribeToModel(
      response,
      entry,
      value =>
        resolveIteratorResult(
          chunk,
          done ? {done: true, value} : {done: false, value},
        ),
      reason => rejectEntry(chunk, resolveError(response, entry, reason)),
      subscriptions,
    );
  }

  function close(): void {
    if (closed) {
      return;
    }
    closed = true;
    while (nextWriteIndex < buffer.length) {
      initializeChunk(buffer[nextWriteIndex++], {done: true, value: undefined});
    }
    release();
  }

  function errorIterable(reason: mixed): void {
    if (closed) {
      return;
    }
    closed = true;
    if (nextWriteIndex === buffer.length) {
      buffer[nextWriteIndex] = createPendingChunk();
    }
    const error = resolveError(response, model, reason);
    while (nextWriteIndex < buffer.length) {
      triggerErrorOnChunk(buffer[nextWriteIndex++], error);
    }
    release();
  }

  function halt(): void {
    if (response._allowPartialStream) {
      close();
    } else {
      errorIterable(getClosedReason(response));
    }
  }

  function getIterator(): $AsyncIterator<T, T, void> {
    let nextReadIndex = 0;
    const iterator: any = {
      next(arg: void) {
        if (arg !== undefined) {
          throw new Error(
            'Values cannot be passed to next() of AsyncIterables passed to Client Components.',
          );
        }
        if (nextReadIndex === buffer.length) {
          if (closed) {
            // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors.
            return new ReactPromise(
              INITIALIZED,
              {done: true, value: undefined},
              null,
            );
          }
          buffer[nextReadIndex] = createPendingChunk();
        }
        return buffer[nextReadIndex++];
      },
    };
    iterator[ASYNC_ITERATOR] = asyncIterator;
    return iterator;
  }

  const iterable: any = source.isIterator
    ? getIterator()
    : {[ASYNC_ITERATOR]: getIterator};
  response._models.set(model, iterable);
  if (response._closed) {
    errorIterable(getClosedReason(response));
  } else {
    unregisterError = registerStreamError(response, error => {
      unsubscribe();
      subscriptions.forEach(detachModelSubscription);
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i].status === PENDING || buffer[i].status === BLOCKED) {
          triggerErrorOnChunk(buffer[i], error);
        }
      }
      errorIterable(error);
    });
    unsubscribe = source.subscribe({
      enqueue,
      close,
      error: errorIterable,
      halt,
    });
    if (closed) {
      unsubscribe();
    }
  }
  return iterable;
}

function readOutlinedModel(response: Response, model: any): any {
  while (isLazyModel(response, model)) {
    const lazy = model;
    try {
      model = lazy._init(lazy._payload);
    } catch (error) {
      throw resolveError(response, lazy._payload, error);
    }
  }
  let value = readModel(response, model);
  if (isElementModel(response, model)) {
    while (value.$$typeof === REACT_LAZY_TYPE) {
      const initializingElement = value._payload._initializingElement;
      if (initializingElement !== undefined) {
        return initializingElement;
      }
      value = value._init(value._payload);
    }
  }
  return value;
}

function closeWeakSubscriptions(response: Response): void {
  const subscriptions = response._weakSubscriptions;
  response._weakSubscriptions = null;
  if (subscriptions !== null) {
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const chunk = subscription.chunk;
      if (
        chunk !== null &&
        (response._closed || isHalted(response._result, subscription.source))
      ) {
        if (chunk.status === PENDING_WEAK) {
          haltChunk(chunk);
        }
        subscription.response = null;
        subscription.chunk = null;
      }
    }
  }
}

function subscribeWeakModel(
  response: Response,
  chunk: SomeChunk<any>,
  source: any,
): void {
  const subscription: WeakSubscription = {response, chunk, source};
  let subscriptions = response._weakSubscriptions;
  if (subscriptions === null) {
    response._weakSubscriptions = subscriptions = [];
  }
  subscriptions.push(subscription);
  source.then(
    (model: any) => {
      const target = subscription.response;
      const pending = subscription.chunk;
      subscription.response = null;
      subscription.chunk = null;
      if (target !== null && pending !== null && !target._closed) {
        resolveModelChunk(target, pending, model);
        if (pending.status === RESOLVED_MODEL) {
          initializeResolvedModelChunk(pending as any);
        }
      }
    },
    (error: mixed) => {
      const target = subscription.response;
      const pending = subscription.chunk;
      subscription.response = null;
      subscription.chunk = null;
      if (target !== null && pending !== null) {
        triggerErrorOnChunk(
          pending,
          resolveError(target, subscription.source, error),
        );
      }
    },
  );
}

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

function resolveErrorDev(
  response: Response,
  errorInfo: ReactErrorInfoDev,
  errorOptions: void | {cause: mixed},
  isAggregateError: boolean,
): Error {
  const name = errorInfo.name;
  const message = errorInfo.message;
  const stack = errorInfo.stack;
  const env = errorInfo.env;
  if (!__DEV__) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resolveErrorDev should never be called in production mode. Use resolveErrorProd instead. This is a bug in React.',
    );
  }
  const callStack = buildFakeCallStack<Error>(
    response,
    stack,
    env,
    false,
    isAggregateError
      ? // $FlowFixMe[incompatible-use]
        AggregateError.bind(
          null,
          [],
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
  const error = callStack();
  (error as any).name = name;
  (error as any).environmentName = env;
  return error;
}
