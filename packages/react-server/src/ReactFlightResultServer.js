/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {Result, ModelReference} from 'shared/ReactFlightResult';
import {createAsyncIterable} from 'shared/ReactFlightResultAsyncIterable';
import {createReadableStream} from 'shared/ReactFlightResultReadableStream';
import type {ResultModel} from 'shared/ReactFlightResultModel';
import type {TemporaryReferenceSet} from './ReactFlightServerTemporaryReferences';
import {
  isOpaqueTemporaryReference,
  resolveTemporaryReference,
} from './ReactFlightServerTemporaryReferences';
import type {ReactClientValue} from './ReactFlightServer';
export type {ReactClientValue} from './ReactFlightServer';
import type {ThenableState} from './ReactFlightThenable';
import type {
  Thenable,
  PendingThenable,
  FulfilledThenable,
  RejectedThenable,
  ReactKey,
} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {
  Hints,
  HintCode,
  HintModel,
  FormatContext,
} from './ReactFlightResultServerConfig';

import {
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  getIteratorFn,
  ASYNC_ITERATOR,
  REACT_FRAGMENT_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';
import ReactSharedInternals from './ReactSharedInternalsServer';
import {
  HooksDispatcher,
  prepareToUseHooksForRequest,
  resetHooksForRequest,
  prepareToUseHooksForComponent,
  getThenableStateAfterSuspending,
} from './ReactFlightResultHooks';
import {SuspenseException, getSuspendedThenable} from './ReactFlightThenable';
import {
  createResult,
  completeResult,
  pushHint,
  closeHints,
  setErrorDigest,
  copyErrorReference,
  forwardModelReference,
  createValueReference,
  getValueReference,
  markFormDataWithBlobs,
  setAsyncIterable,
  setReadableStream,
  setIteratorEntries,
  getIteratorEntries,
  setServerReference,
  setTemporaryReference,
  getTemporaryReference,
  setCollectionEntries,
  setModelInfo,
  getModelInfo,
  markHalted,
  MODEL_OBJECT,
  MODEL_ARRAY,
  MODEL_ELEMENT,
  MODEL_KIND_MASK,
} from 'shared/ReactFlightResult';
import {
  createResultModel,
  fulfillResultModel,
  rejectResultModel,
} from 'shared/ReactFlightResultModel';
import {scheduleWork, scheduleMicrotask} from './ReactServerStreamConfig';
import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';
import noop from 'shared/noop';
import {
  enableTaint,
  enableFlightObjectReferences,
} from 'shared/ReactFeatureFlags';
import binaryToComparableString from 'shared/binaryToComparableString';
import {
  createHints,
  createRootFormatContext,
  getChildFormatContext,
} from './ReactFlightResultServerConfig';
import {resolveCache, setCurrentCache} from './flight/ReactFlightCurrentCache';
import {
  isClientReference,
  isServerReference,
  getServerReferenceId,
  getServerReferenceBoundArguments,
  supportsRequestStorage,
  cacheStorage,
  requestStorage,
} from './ReactFlightServerConfig';
import {DefaultAsyncDispatcher} from './flight/ReactFlightAsyncDispatcher';

const UNDEFINED_MODEL = Symbol();
const PENDING = 0;
const COMPLETED = 1;
const RENDERING = 5;
const BLOCKED = 6;
const ERRORED = 4;
const OPENING = 10;
const OPEN = 11;
const ABORTING = 12;
const ABORTED = 3;
const RENDER = 20;
const PRERENDER = 21;
const CLOSED = 14;

export type ReactClientObject = {+[key: string]: ReactClientValue};
const ObjectPrototype = Object.prototype;
const DatePrototype = Date.prototype;
// $FlowFixMe[method-unbinding]
const dateToJSON = DatePrototype.toJSON;
// $FlowFixMe[method-unbinding]
const dateToISOString = DatePrototype.toISOString;
// $FlowFixMe[method-unbinding]
const dateValueOf = DatePrototype.valueOf;
const dateToPrimitive = Date.prototype[Symbol.toPrimitive];
// $FlowFixMe[method-unbinding]
const dateGetTime = DatePrototype.getTime;

function isSimpleDate(value: Date): boolean {
  return (
    getPrototypeOf(value) === DatePrototype &&
    !hasOwnProperty.call(value, 'toJSON') &&
    !hasOwnProperty.call(value, 'toISOString') &&
    !hasOwnProperty.call(value, 'valueOf') &&
    !hasOwnProperty.call(value, Symbol.toPrimitive) &&
    // $FlowFixMe[method-unbinding]
    DatePrototype.toJSON === dateToJSON &&
    // $FlowFixMe[method-unbinding]
    DatePrototype.toISOString === dateToISOString &&
    // $FlowFixMe[method-unbinding]
    DatePrototype.valueOf === dateValueOf &&
    Date.prototype[Symbol.toPrimitive] === dateToPrimitive
  );
}
const {getPrototypeOf} = Object;
type Task = {
  model: ReactClientValue,
  promise: ResultModel<ReactClientValue>,
  status: 0 | 1 | 3 | 4 | 5 | 6,
  renderedModel: ReactClientValue,
  modelDependencies: null | Set<ResultModel<ReactClientValue>>,
  reference: ModelReference,
  currentReference: null | ModelReference,
  fieldParentReference: void | null | ModelReference,
  resolve: ReactClientValue => void,
  reject: mixed => void,
  formatContext: FormatContext,
  isModelReference: boolean,
  ping: () => void,
  thenableState: ThenableState | null,
  keyPath: ReactKey,
  implicitSlot: boolean,
};
interface Reference {}
type ModelParent = ReactClientObject | $ReadOnlyArray<ReactClientValue>;
type AddressedModelEntry = {
  model: ReactClientValue,
  +root: ResultModel<any>,
  +parent: null | ModelReference,
  +key: string,
};
type ModelEntry =
  | AddressedModelEntry
  | {model: ReactClientValue, +root: void, +parent: null, +key: string};

let modelRoot: null | ReactClientValue = null;
let serializedSize = 0;
const MAX_ROW_SIZE = 3200;
const emptyRoot = {};

export type Request = {
  type: 20 | 21,
  onAllReady: () => void,
  onFatalError: mixed => void,
  status: 10 | 11 | 12 | 14,
  fatalError: mixed,
  abortModel: null | ResultModel<ReactClientValue>,
  result: Result<ReactClientValue>,
  pingedTasks: Array<Task>,
  hints: Hints,
  cache: Map<Function, mixed>,
  cacheController: AbortController,
  modelEntries: WeakMap<Reference, ModelEntry>,
  renderedImplicitModels: WeakMap<Reference, ModelEntry>,
  renderedKeyedModels: null | Map<
    ReactKey,
    {
      explicit: WeakMap<Reference, ModelEntry>,
      implicit: WeakMap<Reference, ModelEntry>,
    },
  >,
  publishedModelReferences: null | WeakMap<ModelReference, ModelReference>,
  outlinedModels: null | WeakMap<Reference, Task>,
  outlinedModelDependencies: null | WeakMap<
    Reference,
    null | ResultModel<ReactClientValue>,
  >,
  resolvedOutlinedModels: null | WeakMap<Reference, ReactClientValue>,
  resolvingModelStack: Array<Reference>,
  resolvingModels: null | Set<Reference>,
  hasByValueModels: boolean,
  deferredBlobs: null | Array<Task>,
  taintCleanupQueue: Array<string | bigint>,
  abortableTasks: Set<Task>,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
  identifierPrefix: string,
  identifierCount: number,
  onError: mixed => ?string,
};

function defaultErrorHandler(error: mixed): void {
  console['error'](error);
}

const {
  TaintRegistryObjects,
  TaintRegistryValues,
  TaintRegistryByteLengths,
  TaintRegistryPendingRequests,
} = ReactSharedInternals;

function throwTaintViolation(message: string) {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(message);
}

function cleanupTaintQueue(request: Request): void {
  const cleanupQueue = request.taintCleanupQueue;
  TaintRegistryPendingRequests.delete(cleanupQueue);
  for (let i = 0; i < cleanupQueue.length; i++) {
    const entryValue = cleanupQueue[i];
    const entry = TaintRegistryValues.get(entryValue);
    if (entry !== undefined) {
      if (entry.count === 1) {
        TaintRegistryValues.delete(entryValue);
      } else {
        entry.count--;
      }
    }
  }
  cleanupQueue.length = 0;
}

function RequestInstance(
  this: any,
  model: ReactClientValue,
  onError: void | (mixed => ?string),
  identifierPrefix: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
  type: 20 | 21,
  onAllReady: () => void,
  onFatalError: mixed => void,
) {
  if (
    ReactSharedInternals.A !== null &&
    ReactSharedInternals.A !== DefaultAsyncDispatcher
  ) {
    throw new Error(
      'Currently React only supports one RSC renderer at a time.',
    );
  }
  ReactSharedInternals.A = DefaultAsyncDispatcher;
  this.type = type;
  this.onAllReady = onAllReady;
  this.onFatalError = onFatalError;
  this.status = OPENING;
  this.fatalError = null;
  this.abortModel = null;
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  this.hints = createHints();
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.modelEntries = new WeakMap();
  this.renderedImplicitModels = new WeakMap();
  this.renderedKeyedModels = null;
  this.publishedModelReferences = null;
  this.outlinedModels = null;
  this.outlinedModelDependencies = null;
  this.resolvedOutlinedModels = null;
  this.resolvingModelStack = [];
  this.resolvingModels = null;
  this.hasByValueModels = false;
  if (enableTaint) {
    this.deferredBlobs = null;
  }
  const cleanupQueue: Array<string | bigint> = [];
  if (enableTaint) {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  this.taintCleanupQueue = cleanupQueue;
  this.abortableTasks = new Set();
  this.identifierPrefix = identifierPrefix || '';
  this.temporaryReferences = temporaryReferences;
  this.createServerReference = createServerReference;
  this.identifierCount = 1;
  const rootTask = createTask(
    this,
    model,
    null,
    false,
    createRootFormatContext(),
  );
  const root = rootTask.promise;
  this.result = createResult(
    root,
    reason => abort(this, reason),
    temporaryReferences,
  );
  this.pingedTasks = [rootTask];
}

export function resolveRequest(): null | Request {
  const cache = resolveCache();
  if (cache instanceof RequestInstance) {
    return cache as any;
  }
  return null;
}

export function getHints(request: Request): Hints {
  return request.hints;
}

export function emitHint<Code: HintCode>(
  request: Request,
  code: Code,
  model: HintModel<Code>,
): void {
  pushHint(request.result, code, model);
}

export function createRequest(
  model: ReactClientValue,
  onError: void | (mixed => ?string),
  identifierPrefix: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(
    model,
    onError,
    identifierPrefix,
    temporaryReferences,
    createServerReference,
    RENDER,
    noop,
    noop,
  );
}

export function getResult(request: Request): Result<ReactClientValue> {
  return request.result;
}

function renderFunctionComponent<Props: {[name: string]: mixed}>(
  request: Request,
  task: Task,
  Component: (p: Props, arg: void) => ReactClientValue,
  props: Props,
  element: ReactElement,
): ReactClientValue {
  const renderedModels = getRenderedModels(
    request,
    element,
    task.keyPath,
    task.implicitSlot,
  );
  const prevThenableState = task.thenableState;
  task.thenableState = null;
  prepareToUseHooksForComponent(prevThenableState, null);
  let result = Component(props, undefined);
  if (request.status === ABORTING || request.status === CLOSED) {
    if (
      result !== null &&
      typeof result === 'object' &&
      !isClientReference(result) &&
      typeof (result as any).then === 'function'
    ) {
      (result as any).then(noop, noop);
    }
    throw request.fatalError;
  }
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  const key = element.key;
  if (key !== null) {
    if (key === REACT_OPTIMISTIC_KEY || prevKeyPath === REACT_OPTIMISTIC_KEY) {
      task.keyPath = REACT_OPTIMISTIC_KEY;
    } else {
      task.keyPath = prevKeyPath === null ? key : prevKeyPath + ',' + key;
    }
  } else if (prevKeyPath === null) {
    task.implicitSlot = true;
  }
  if (
    result !== null &&
    typeof result === 'object' &&
    !isClientReference(result) &&
    typeof (result as any).then === 'function'
  ) {
    const thenable: Thenable<ReactClientValue> = result as any;
    if (__DEV__) {
      thenable.then(resolvedValue => {
        if (
          resolvedValue !== null &&
          typeof resolvedValue === 'object' &&
          (resolvedValue as any).$$typeof === REACT_ELEMENT_TYPE
        ) {
          (resolvedValue as any)._store.validated = 1;
        }
      }, noop);
    }
    const expandedThenable: Thenable<ReactClientValue> = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      result,
    ) as any;
    const resolvedModel = createLazyWrapperAroundWakeable(expandedThenable);
    setRenderedModel(renderedModels, element, resolvedModel);
    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;
    task.isModelReference = true;
    return resolvedModel;
  }
  if (
    result !== null &&
    typeof result === 'object' &&
    (result as any).$$typeof !== REACT_ELEMENT_TYPE &&
    !isClientReference(result) &&
    !isArray(result) &&
    !(result instanceof Map) &&
    !(result instanceof Set)
  ) {
    const iteratorFn = getIteratorFn(result);
    if (iteratorFn) {
      const iterableChild: any = result;
      result = {
        [Symbol.iterator]: function () {
          return iteratorFn.call(iterableChild) as any;
        },
      };
    } else if (
      typeof (result as any)[ASYNC_ITERATOR] === 'function' &&
      (typeof ReadableStream !== 'function' ||
        !(result instanceof ReadableStream))
    ) {
      const iterableChild: any = result;
      result = {
        [ASYNC_ITERATOR]: function () {
          return iterableChild[ASYNC_ITERATOR]();
        },
      };
    }
  }
  if (
    __DEV__ &&
    result !== null &&
    typeof result === 'object' &&
    (result as any).$$typeof === REACT_ELEMENT_TYPE
  ) {
    (result as any)._store.validated = 1;
  }
  const resolvedModel = renderModelDestructive(
    request,
    task,
    emptyRoot,
    '',
    result,
  );
  setRenderedModel(
    renderedModels,
    element,
    resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
  );
  task.keyPath = prevKeyPath;
  task.implicitSlot = prevImplicitSlot;
  return resolvedModel;
}

function renderElement(
  request: Request,
  task: Task,
  type: any,
  element: ReactElement,
): ReactClientValue {
  if (element.props.ref != null) {
    throw new Error('Not implemented.');
  }
  if (
    typeof type === 'function' &&
    !isClientReference(type) &&
    !isOpaqueTemporaryReference(type)
  ) {
    return renderFunctionComponent(request, task, type, element.props, element);
  }
  if (type === REACT_FRAGMENT_TYPE && element.key === null) {
    const renderedModels = getRenderedModels(
      request,
      element,
      task.keyPath,
      task.implicitSlot,
    );
    const prevImplicitSlot = task.implicitSlot;
    if (task.keyPath === null) {
      task.implicitSlot = true;
    }
    const resolvedModel = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      element.props.children,
    );
    setRenderedModel(
      renderedModels,
      element,
      resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
    );
    task.implicitSlot = prevImplicitSlot;
    return resolvedModel;
  }
  if (type != null && typeof type === 'object' && !isClientReference(type)) {
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE: {
        const init = type._init;
        const payload = type._payload;
        const wrappedType = init(payload);
        if (request.status === ABORTING || request.status === CLOSED) {
          throw request.fatalError;
        }
        return renderElement(request, task, wrappedType, element);
      }
      case REACT_FORWARD_REF_TYPE: {
        return renderFunctionComponent(
          request,
          task,
          type.render,
          element.props,
          element,
        );
      }
      case REACT_MEMO_TYPE: {
        return renderElement(request, task, type.type, element);
      }
    }
  }
  if (
    typeof type !== 'string' &&
    typeof type !== 'symbol' &&
    !isClientReference(type) &&
    !isOpaqueTemporaryReference(type)
  ) {
    throw new Error('Not implemented.');
  }
  if (typeof type === 'symbol') {
    validateSymbol(type);
  }
  if (typeof type === 'string') {
    const parentFormatContext = task.formatContext;
    const newFormatContext = getChildFormatContext(
      parentFormatContext,
      type,
      element.props,
    );
    if (
      parentFormatContext !== newFormatContext &&
      element.props.children != null
    ) {
      outlineModelWithFormatContext(
        request,
        element.props.children,
        newFormatContext,
      );
    }
  }
  return renderClientElement(request, task, type, element);
}

function validateSymbol(value: symbol): void {
  // $FlowFixMe[incompatible-type] `description` might be undefined
  const name: string = value.description;
  if (Symbol.for(name) !== value) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'Only global symbols received from Symbol.for(...) can be passed to Client Components. ' +
        `The symbol Symbol.for(${name}) cannot be found among global symbols.`,
    );
  }
}

function createTask(
  request: Request,
  model: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
  formatContext: FormatContext,
): Task {
  const promise = createResultModel<ReactClientValue>();
  const reference: ModelReference = {root: promise, parent: null, key: ''};
  if (model !== null && typeof model === 'object') {
    setModelReferenceIfAbsent(request, model, reference);
  }
  const task: Task = {
    model,
    promise,
    reference,
    currentReference: reference,
    fieldParentReference: undefined,
    renderedModel: undefined,
    modelDependencies: null,
    resolve: value => fulfillResultModel(promise, value),
    reject: error => rejectResultModel(promise, error),
    status: PENDING,
    formatContext,
    isModelReference: false,
    ping: () => pingTask(request, task),
    thenableState: null,
    keyPath,
    implicitSlot,
  };
  request.abortableTasks.add(task);
  return task;
}

function pingTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    if (request.type === PRERENDER || request.status === OPENING) {
      scheduleMicrotask(() => performWork(request));
    } else {
      scheduleWork(() => performWork(request));
    }
  }
}

function outlineModelWithFormatContext(
  request: Request,
  value: ReactClientValue,
  formatContext: FormatContext,
): ReactClientValue {
  const newTask = createTask(request, value, null, false, formatContext);
  if (value !== null && typeof value === 'object') {
    setModelReference(request, value, newTask.reference);
    setRenderedModel(request.modelEntries, value, newTask.promise);
  }
  retryTask(request, newTask);
  const model = newTask.status === COMPLETED ? newTask.model : newTask.promise;
  if (value !== null && typeof value === 'object') {
    setRenderedModel(
      request.modelEntries,
      value,
      model === undefined ? UNDEFINED_MODEL : model,
    );
  }
  if (newTask.status !== COMPLETED) {
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(newTask.promise, newTask);
    request.hasByValueModels = true;
  }
  return model;
}

function outlineModel(
  request: Request,
  value: ReactClientValue,
): ReactClientValue {
  if (value !== null && typeof value === 'object') {
    const existingModel = getRenderedModel(request.modelEntries, value);
    if (existingModel !== undefined) {
      return existingModel === UNDEFINED_MODEL ? undefined : existingModel;
    }
  }
  return outlineModelWithFormatContext(
    request,
    value,
    createRootFormatContext(),
  );
}

function readThenable<T>(thenable: Thenable<T>): T {
  if (thenable.status === 'fulfilled') {
    return thenable.value;
  } else if (thenable.status === 'rejected') {
    throw thenable.reason;
  }
  throw thenable;
}

function createLazyWrapperAroundWakeable(
  thenable: Thenable<ReactClientValue>,
): ReactClientValue {
  if (thenable.status === 'fulfilled') {
    return thenable.value;
  }
  const lazy: LazyComponent<ReactClientValue, Thenable<ReactClientValue>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: thenable,
    _init: readThenable,
  };
  return lazy;
}

function erroredTask(request: Request, task: Task, error: mixed): void {
  task.status = ERRORED;
  const digest = logRecoverableError(request, error);
  setErrorDigest(request.result, task.promise, digest);
  request.abortableTasks.delete(task);
  task.reject(error);
}

function logRecoverableError(request: Request, error: mixed): string {
  const prevCache = setCurrentCache(null);
  let errorDigest;
  try {
    const onError = request.onError;
    // $FlowFixMe[constant-condition]
    if (supportsRequestStorage) {
      errorDigest = cacheStorage.run(undefined, () =>
        requestStorage.run(undefined, onError, error),
      );
    } else {
      errorDigest = onError(error);
    }
  } finally {
    setCurrentCache(prevCache);
  }
  if (errorDigest != null && typeof errorDigest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      `onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "${typeof errorDigest}" instead`,
    );
  }
  return errorDigest || '';
}

function fatalError(request: Request, error: mixed): void {
  if (request.status === CLOSED) {
    return;
  }
  request.status = ABORTING;
  request.fatalError = error;
  request.cacheController.abort(error);
  finishAbort(request, error);
  request.onFatalError(error);
}

function renderThenable(
  request: Request,
  task: Task,
  value: ReactClientValue,
): ReactClientValue {
  const thenable: Thenable<ReactClientValue> = value as any;
  const newTask = createTask(
    request,
    value,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  setRenderedModel(
    getRenderedModels(request, value, task.keyPath, task.implicitSlot),
    thenable,
    newTask.promise,
  );
  switch (thenable.status) {
    case 'fulfilled':
      newTask.model = thenable.value;
      pingTask(request, newTask);
      break;
    case 'rejected':
      try {
        erroredTask(request, newTask, thenable.reason);
      } catch (error) {
        fatalError(request, error);
      }
      break;
    default: {
      if (request.status === ABORTING) {
        abortTask(request, newTask);
        return newTask.promise;
      }
      if (typeof thenable.status !== 'string') {
        const pendingThenable: PendingThenable<ReactClientValue> =
          thenable as any;
        pendingThenable.status = 'pending';
        pendingThenable.then(
          fulfilledValue => {
            if (thenable.status === 'pending') {
              const fulfilledThenable: FulfilledThenable<ReactClientValue> =
                thenable as any;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = fulfilledValue;
            }
          },
          (error: mixed) => {
            if (thenable.status === 'pending') {
              const rejectedThenable: RejectedThenable<ReactClientValue> =
                thenable as any;
              rejectedThenable.status = 'rejected';
              rejectedThenable.reason = error;
            }
          },
        );
      }
      thenable.then(
        fulfilledValue => {
          if (newTask.status === PENDING) {
            newTask.model = fulfilledValue;
            pingTask(request, newTask);
          }
        },
        reason => {
          if (newTask.status === PENDING) {
            try {
              erroredTask(request, newTask, reason);
            } catch (error) {
              fatalError(request, error);
            }
            scheduleMicrotask(() => performWork(request));
          }
        },
      );
    }
  }
  return newTask.promise;
}

function renderClientElement(
  request: Request,
  task: Task,
  type: any,
  element: ReactElement,
): ReactClientValue {
  let key = element.key;
  const keyPath = task.keyPath;
  if (key === null) {
    key = keyPath;
  } else if (keyPath !== null) {
    if (keyPath === REACT_OPTIMISTIC_KEY || key === REACT_OPTIMISTIC_KEY) {
      key = REACT_OPTIMISTIC_KEY;
    } else {
      key = keyPath + ',' + key;
    }
  }
  if (__DEV__ && task.implicitSlot) {
    element._store.validated = 1;
  }
  let resolvedElement: ReactElement;
  if (__DEV__) {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      props: element.props,
      _owner: null,
      _store: element._store,
    } as any;
    Object.defineProperties(resolvedElement, {
      ref: {value: null},
      _debugInfo: {value: element._debugInfo, writable: true},
      _debugStack: {value: null, writable: true},
      _debugTask: {value: null, writable: true},
    });
  } else {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: null,
      props: element.props,
    } as any;
  }
  const renderedModels = getRenderedModels(
    request,
    element,
    keyPath,
    task.implicitSlot,
  );
  let resolvedModel: ReactClientValue = resolvedElement;
  if (task.implicitSlot && key !== null) {
    const children: Array<ReactClientValue> = [resolvedElement];
    const copy: Array<ReactClientValue> = [];
    setRenderedModel(request.modelEntries, children, copy);
    const reference = task.currentReference;
    if (reference !== null) {
      setModelReference(request, children, reference);
      setModelReference(request, resolvedElement, {
        root: reference.root,
        parent: reference,
        key: '0',
      });
    }
    task.model = children;
    resolvedModel = copy;
  }
  setRenderedModel(renderedModels, element, resolvedModel);
  const reference = task.currentReference;
  task.fieldParentReference =
    resolvedModel !== resolvedElement
      ? undefined
      : reference === null
        ? null
        : {root: reference.root, parent: reference.parent, key: reference.key};
  task.keyPath = null;
  task.implicitSlot = false;
  task.isModelReference = false;
  return resolvedModel;
}

function renderModelDestructive(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  parentReference?: null | ModelReference,
): ReactClientValue {
  task.model = value;
  task.isModelReference = false;
  if (
    value !== null &&
    typeof value === 'object' &&
    getValueReference(request.result, value) !== undefined
  ) {
    return renderModelReference(task, value);
  }
  if (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function')
  ) {
    if (isClientReference(value)) {
      return renderModelReference(task, value);
    }
    if (
      (typeof value === 'function' || enableFlightObjectReferences) &&
      isServerReference(value)
    ) {
      return renderModelReference(task, renderServerReference(request, value));
    }
    if (request.temporaryReferences !== undefined) {
      const reference = resolveTemporaryReference(
        request.temporaryReferences,
        value as any,
      );
      if (reference !== undefined) {
        setTemporaryReference(request.result, value as any, reference);
        return renderModelReference(task, value);
      }
    }
  }

  if (enableTaint) {
    // Check the source before copying it. A copy does not carry its taint mark.
    if (typeof value === 'string' || typeof value === 'bigint') {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    } else if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function')
    ) {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
  }

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') {
      serializedSize += value.length;
    }
    if (
      typeof value === 'string' &&
      value[value.length - 1] === 'Z' &&
      parent[parentPropertyName as any] instanceof Date
    ) {
      return renderModelReference(task, new Date(value));
    }
    if (typeof value === 'function') {
      if (isOpaqueTemporaryReference(value)) {
        throw new Error(
          'Could not reference an opaque temporary reference. This is likely due to misconfiguring the temporaryReferences options on the server.',
        );
      }
      throw new Error('Not implemented.');
    }
    if (typeof value === 'symbol') {
      validateSymbol(value);
    }
    return value;
  }
  const renderedModels = getRenderedModels(
    request,
    value,
    task.keyPath,
    task.implicitSlot,
  );
  let modelEntry = renderedModels.get(value);
  let existingModel = modelEntry === undefined ? undefined : modelEntry.model;
  const elementType = (value as any).$$typeof;
  const canReference =
    elementType === REACT_ELEMENT_TYPE
      ? task.keyPath === null && !task.implicitSlot
      : (isArray(value) && task.keyPath === null) ||
        value instanceof Map ||
        value instanceof Set ||
        getPrototypeOf(value) === ObjectPrototype;
  const referenceEntry = canReference
    ? renderedModels === request.modelEntries
      ? modelEntry
      : request.modelEntries.get(value)
    : undefined;
  let reference = getEntryReference(referenceEntry);
  if (
    canReference &&
    reference !== undefined &&
    reference.root !== task.promise &&
    existingModel !== undefined &&
    typeof (value as any).then !== 'function'
  ) {
    return renderModelReference(
      task,
      createResultValueReference(request, reference) as any,
    );
  }
  if (existingModel !== undefined) {
    if (
      elementType === REACT_ELEMENT_TYPE &&
      typeof existingModel === 'string' &&
      modelEntry !== undefined &&
      modelEntry.root !== undefined &&
      modelRoot !== value
    ) {
      return renderModelReference(
        task,
        createResultValueReference(request, modelEntry) as any,
      );
    }
    if (existingModel === UNDEFINED_MODEL) {
      existingModel = undefined;
    }
    if (request.hasByValueModels && existingModel !== task.promise) {
      const outlinedModels = request.outlinedModels;
      if (outlinedModels !== null) {
        const dependency = outlinedModels.get(existingModel as any);
        if (dependency !== undefined && dependency.status === COMPLETED) {
          existingModel = dependency.model;
        } else if (dependency === task && task.status === RENDERING) {
          existingModel = task.renderedModel;
        } else {
          const dependencies = getOutlinedModelDependencies(
            request,
            existingModel,
            outlinedModels,
          );
          const iterator = dependencies.values();
          for (
            let entry = iterator.next();
            !entry.done;
            entry = iterator.next()
          ) {
            addModelDependency(task, entry.value);
          }
        }
      }
    }
    if (modelRoot === value) {
      if (
        existingModel !== task.promise &&
        !(
          existingModel !== null &&
          typeof existingModel === 'object' &&
          (existingModel as any).$$typeof === REACT_LAZY_TYPE &&
          (existingModel as any)._payload === task.promise
        )
      ) {
        return renderModelReference(task, existingModel);
      }
      modelRoot = null;
    } else {
      return renderModelReference(task, existingModel);
    }
  }

  if (parentReference === undefined) {
    parentReference =
      parent === emptyRoot
        ? task.currentReference
        : getModelReference(request, parent);
  }
  if (
    reference === undefined &&
    parentReference != null &&
    parentPropertyName.indexOf(':') === -1
  ) {
    if (canReference) {
      const newEntry: AddressedModelEntry = {
        model: referenceEntry === undefined ? undefined : referenceEntry.model,
        root: parentReference.root,
        parent: parent === emptyRoot ? parentReference.parent : parentReference,
        key: parent === emptyRoot ? parentReference.key : parentPropertyName,
      };
      request.modelEntries.set(value, newEntry);
      reference = newEntry;
      if (renderedModels === request.modelEntries) {
        modelEntry = newEntry;
      }
    } else {
      reference =
        parent === emptyRoot
          ? parentReference
          : {
              root: parentReference.root,
              parent: parentReference,
              key: parentPropertyName,
            };
    }
  }
  task.currentReference = reference === undefined ? null : reference;
  if (elementType === REACT_ELEMENT_TYPE) {
    if (serializedSize > MAX_ROW_SIZE) {
      return deferTask(request, task);
    }
    const element: ReactElement = value as any;
    const rendered = renderElement(request, task, element.type, element);
    if (typeof rendered === 'string' && reference !== undefined) {
      const entry = renderedModels.get(value);
      if (entry !== undefined) {
        renderedModels.set(value, createModelEntry(entry.model, reference));
      }
    }
    if (
      rendered !== null &&
      typeof rendered === 'object' &&
      reference != null &&
      (rendered as any).$$typeof === REACT_ELEMENT_TYPE &&
      task.fieldParentReference === null
    ) {
      task.fieldParentReference = {
        root: reference.root,
        parent: reference.parent,
        key: reference.key,
      };
    }
    return rendered;
  }
  if (elementType === REACT_LAZY_TYPE) {
    if (serializedSize > MAX_ROW_SIZE) {
      return deferTask(request, task);
    }
    const lazy: LazyComponent<ReactClientValue, any> = value as any;
    task.thenableState = null;
    const init = lazy._init;
    const payload = lazy._payload;
    const resolvedModel = init(payload);
    if (request.status === ABORTING || request.status === CLOSED) {
      throw request.fatalError;
    }
    return renderModelDestructive(
      request,
      task,
      parent,
      parentPropertyName,
      resolvedModel,
      parentReference,
    );
  }
  if (typeof (value as any).then === 'function') {
    return renderModelReference(task, renderThenable(request, task, value));
  }
  if (isArray(value)) {
    return renderFragment(request, task, value);
  }
  if (value instanceof Date) {
    const date: Date = value;
    return renderModelReference(
      task,
      isSimpleDate(date)
        ? new Date(dateGetTime.call(date))
        : // Match Flight's '$D' + date.toJSON() coercion, including Symbols.
          // eslint-disable-next-line react-internal/safe-string-coercion
          new Date('' + date.toJSON()),
    );
  }
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    if (enableTaint) {
      const typedArray: $ArrayBufferView =
        value instanceof ArrayBuffer ? new Uint8Array(value) : (value as any);
      if (TaintRegistryByteLengths.has(typedArray.byteLength)) {
        const tainted = TaintRegistryValues.get(
          binaryToComparableString(typedArray),
        );
        if (tainted !== undefined) {
          throwTaintViolation(tainted.message);
        }
      }
    }
    return renderModelReference(task, value);
  }
  if (value instanceof Map) {
    return renderModelReference(task, renderMap(request, task, value));
  }
  if (value instanceof Set) {
    return renderModelReference(task, renderSet(request, task, value));
  }
  if (typeof FormData === 'function' && value instanceof FormData) {
    return renderModelReference(task, renderFormData(request, task, value));
  }
  if (typeof Blob === 'function' && value instanceof Blob) {
    return renderModelReference(task, renderBlob(request, task, value));
  }
  const iteratorFn = getIteratorFn(value);
  if (iteratorFn) {
    const iterator = iteratorFn.call(value);
    if (iterator === value) {
      return renderModelReference(
        task,
        renderIterator(request, task, iterator as any),
      );
    }
    return renderFragment(
      request,
      task,
      Array.from(iterator as any),
      value as any,
    );
  }
  if (typeof ReadableStream === 'function' && value instanceof ReadableStream) {
    return renderModelReference(
      task,
      renderReadableStream(request, task, value),
    );
  }
  const getAsyncIterator = (value as any)[ASYNC_ITERATOR];
  if (typeof getAsyncIterator === 'function') {
    const model = renderAsyncFragment(
      request,
      task,
      value as any,
      getAsyncIterator,
    );
    return renderModelReference(task, model);
  }
  if (Object.getPrototypeOf(value) !== ObjectPrototype) {
    throw new Error('Not implemented.');
  }
  const copy: {[key: string]: ReactClientValue} = {};
  setRenderedModel(request.modelEntries, value, copy);
  task.fieldParentReference = undefined;
  return copy;
}

function resolveModel(
  request: Request,
  task: Task,
  parent: ModelParent,
  key: string,
  value: ReactClientValue,
  parentReference?: null | ModelReference,
  renderedRoot?: ReactClientValue,
): ReactClientValue {
  let jsonValue: ReactClientValue = value;
  if (
    value !== null &&
    typeof value === 'object' &&
    !(enableFlightObjectReferences && isServerReference(value)) &&
    typeof (value as any).toJSON === 'function'
  ) {
    if (enableTaint) {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
    if (value instanceof Date && isSimpleDate(value)) {
      const time = dateGetTime.call(value);
      if (enableTaint && !Number.isNaN(time)) {
        const tainted = TaintRegistryValues.get(dateToISOString.call(value));
        if (tainted !== undefined) {
          throwTaintViolation(tainted.message);
        }
      }
      return renderModelReference(
        task,
        Number.isNaN(time) ? null : new Date(time),
      );
    }
    jsonValue = (value as any).toJSON(key);
  }
  const rendered =
    renderedRoot !== undefined && jsonValue === value
      ? renderedRoot
      : renderModel(request, task, parent, key, jsonValue, parentReference);
  if (renderedRoot !== undefined) {
    task.renderedModel = rendered;
    if (jsonValue !== value) {
      let outlinedModels = request.outlinedModels;
      if (outlinedModels === null) {
        request.outlinedModels = outlinedModels = new WeakMap();
      }
      outlinedModels.set(renderedRoot as any, task);
      request.hasByValueModels = true;
    }
  }
  if (
    task.isModelReference ||
    rendered === null ||
    typeof rendered !== 'object'
  ) {
    return rendered;
  }
  const stack = request.resolvingModelStack;
  stack.push(rendered);
  if (request.resolvingModels !== null) {
    request.resolvingModels.add(rendered);
  }
  try {
    return resolveModelFields(request, task, rendered);
  } finally {
    stack.pop();
    if (request.resolvingModels !== null) {
      request.resolvingModels.delete(rendered);
    }
  }
}

function renderModel(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  parentReference?: null | ModelReference,
): ReactClientValue {
  serializedSize +=
    (parent as any).$$typeof === REACT_ELEMENT_TYPE
      ? 1
      : parentPropertyName.length;
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  try {
    return renderModelDestructive(
      request,
      task,
      parent,
      parentPropertyName,
      value,
      parentReference,
    );
  } catch (thrownValue) {
    if (request.status === CLOSED) {
      throw request.fatalError;
    }
    const error =
      request.status === ABORTING
        ? request.fatalError
        : thrownValue === SuspenseException
          ? getSuspendedThenable()
          : thrownValue;
    const model = task.model;
    if (
      model !== null &&
      typeof model === 'object' &&
      ((model as any).$$typeof === REACT_ELEMENT_TYPE ||
        (model as any).$$typeof === REACT_LAZY_TYPE)
    ) {
      const newTask = createTask(
        request,
        model,
        task.keyPath,
        task.implicitSlot,
        task.formatContext,
      );
      const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
      setModelReference(request, model, newTask.reference);
      if ((model as any).$$typeof === REACT_ELEMENT_TYPE) {
        const renderedModels = getRenderedModels(
          request,
          model,
          task.keyPath,
          task.implicitSlot,
        );
        if (getRenderedModel(renderedModels, model) === undefined) {
          setRenderedModel(renderedModels, model, lazy);
        }
      }
      if (
        value !== model &&
        value !== null &&
        typeof value === 'object' &&
        (value as any).$$typeof === REACT_ELEMENT_TYPE
      ) {
        setRenderedModel(
          getRenderedModels(request, value, prevKeyPath, prevImplicitSlot),
          value,
          lazy,
        );
      }
      task.keyPath = prevKeyPath;
      task.implicitSlot = prevImplicitSlot;
      if (request.status === ABORTING) {
        abortTask(request, newTask);
      } else if (
        error != null &&
        typeof error === 'object' &&
        typeof (error as any).then === 'function'
      ) {
        const ping = newTask.ping;
        (error as any).then(ping, ping);
        newTask.thenableState = getThenableStateAfterSuspending();
      } else {
        erroredTask(request, newTask, error);
      }
      return renderModelReference(task, lazy);
    }
    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;
    const newTask = createTask(
      request,
      model,
      prevKeyPath,
      prevImplicitSlot,
      task.formatContext,
    );
    // Binding in the recovery path avoids a captured local in every hot call,
    // including after a later bundler inlines this helper.
    newTask.resolve = resolveBoxedModel.bind(null, newTask.resolve);
    if (model !== null && typeof model === 'object') {
      setModelReference(request, model, {
        root: newTask.promise,
        parent: newTask.reference,
        key: 'value',
      });
    }
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(newTask.promise, newTask);
    request.hasByValueModels = true;
    addModelDependency(task, newTask.promise);
    markErroredModel(request, newTask, value, prevKeyPath, prevImplicitSlot);
    if (request.status === ABORTING) {
      abortTask(request, newTask);
    } else if (
      error != null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      newTask.thenableState = getThenableStateAfterSuspending();
      const ping = newTask.ping;
      (error as any).then(ping, ping);
    } else {
      erroredTask(request, newTask, error);
    }
    if (__DEV__) {
      const reference = createResultValueReference(request, {
        root: newTask.promise,
        parent: newTask.reference,
        key: 'value',
      });
      outlinedModels.set(reference, newTask);
      return renderModelReference(task, reference);
    }
    return renderModelReference(task, newTask.promise);
  }
}

function resolveModelFields(
  request: Request,
  task: Task,
  rendered: ReactClientValue,
): ReactClientValue {
  const model = task.model;
  const parentReference = task.fieldParentReference;
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  task.keyPath = null;
  task.implicitSlot = false;
  if ((rendered as any).$$typeof === REACT_ELEMENT_TYPE) {
    const element: ReactElement = rendered as any;
    const prevDependencies = task.modelDependencies;
    task.modelDependencies = null;
    try {
      serializedSize += 2;
      if (typeof element.key === 'string') {
        serializedSize += element.key.length;
      }
      element.type = resolveModel(
        request,
        task,
        element as any,
        'type',
        element.type,
        parentReference,
      );
      element.props = resolveModel(
        request,
        task,
        element as any,
        'props',
        element.props,
        parentReference,
      );
      const resolved = renderOutlinedElement(
        request,
        task,
        element,
        model,
        prevKeyPath,
        prevImplicitSlot,
        task.modelDependencies,
      );
      setModelInfo(request.result, element, MODEL_ELEMENT);
      return resolved;
    } catch (error) {
      markErroredModel(
        request,
        task,
        rendered,
        prevKeyPath,
        prevImplicitSlot,
        rendered,
      );
      throw error;
    } finally {
      task.modelDependencies = prevDependencies;
    }
  }
  if (isArray(rendered)) {
    const children: Array<ReactClientValue> = model as any;
    const copy: Array<ReactClientValue> = rendered as any;
    try {
      for (let i = 0; i < children.length; i++) {
        if (i in children) {
          copy[i] = resolveModel(
            request,
            task,
            children,
            '' + i,
            children[i],
            parentReference,
          );
        }
      }
      copy.length = children.length;
      setModelInfo(request.result, copy, MODEL_ARRAY);
      return copy;
    } catch (error) {
      markErroredModel(request, task, model, prevKeyPath, prevImplicitSlot);
      throw error;
    }
  }
  const object: ReactClientObject = model as any;
  const copy: {[key: string]: ReactClientValue} = rendered as any;
  try {
    for (const key in object) {
      if (hasOwnProperty.call(object, key)) {
        const child = resolveModel(
          request,
          task,
          object,
          key,
          object[key],
          parentReference,
        );
        if (key === '__proto__') {
          Object.defineProperty(copy, key, {
            value: child,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        } else {
          copy[key] = child;
        }
      }
    }
    setModelInfo(request.result, copy, MODEL_OBJECT);
    return copy;
  } catch (error) {
    markErroredModel(request, task, model, prevKeyPath, prevImplicitSlot);
    throw error;
  }
}

function retryTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  task.status = RENDERING;
  const originalModel = task.model;
  const originalKeyPath = task.keyPath;
  const originalImplicitSlot = task.implicitSlot;
  const parentSerializedSize = serializedSize;
  task.currentReference = task.reference;
  try {
    modelRoot = task.model;
    const rendered = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      task.model,
    );
    task.renderedModel = rendered;
    const rootModel =
      rendered !== null &&
      typeof rendered === 'object' &&
      (rendered as any).$$typeof === REACT_ELEMENT_TYPE
        ? rendered
        : task.model;
    const resolvedModel =
      task.isModelReference || rendered === null || typeof rendered !== 'object'
        ? rendered
        : resolveModel(
            request,
            task,
            {'': rootModel},
            '',
            rootModel,
            undefined,
            rendered,
          );
    if (request.status === CLOSED) {
      return;
    }
    if (enableTaint) {
      validateDeferredBlobs(request);
    }
    const outlinedModels = request.outlinedModels;
    if (
      outlinedModels !== null &&
      waitForOutlinedModel(request, task, resolvedModel, outlinedModels)
    ) {
      return;
    }
    completeTask(request, task, resolvedModel);
  } catch (thrownValue) {
    if (request.status >= ABORTING) {
      if (request.status === ABORTING) {
        abortTask(request, task);
      }
      return;
    }
    const error =
      thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
    const model = task.model;
    if (
      error != null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      markErroredModel(request, task, model, task.keyPath, task.implicitSlot);
      task.status = PENDING;
      task.thenableState = getThenableStateAfterSuspending();
      const ping = task.ping;
      (error as any).then(ping, ping);
      return;
    }
    markErroredModel(
      request,
      task,
      originalModel,
      originalKeyPath,
      originalImplicitSlot,
    );
    erroredTask(request, task, error);
  } finally {
    try {
      if (enableTaint) {
        // A sibling may throw after registering a Blob validation task.
        validateDeferredBlobs(request);
      }
    } finally {
      serializedSize = parentSerializedSize;
    }
  }
}

function getRenderedModels(
  request: Request,
  value: ReactClientValue | ReactElement,
  keyPath: ReactKey,
  implicitSlot: boolean,
): WeakMap<Reference, ModelEntry> {
  if (
    keyPath !== null &&
    value !== null &&
    typeof value === 'object' &&
    ((value as any).$$typeof === REACT_ELEMENT_TYPE ||
      typeof (value as any).then === 'function' ||
      isArray(value) ||
      (!(value instanceof Map) &&
        !(value instanceof Set) &&
        (getIteratorFn(value) !== null ||
          typeof (value as any)[ASYNC_ITERATOR] === 'function')))
  ) {
    let keyedModels = request.renderedKeyedModels;
    if (keyedModels === null) {
      request.renderedKeyedModels = keyedModels = new Map();
    }
    let models = keyedModels.get(keyPath);
    if (models === undefined) {
      models = {explicit: new WeakMap(), implicit: new WeakMap()};
      keyedModels.set(keyPath, models);
    }
    return implicitSlot ? models.implicit : models.explicit;
  }
  if (
    implicitSlot &&
    value !== null &&
    typeof value === 'object' &&
    (((value as any).$$typeof === REACT_ELEMENT_TYPE &&
      (value as any).key !== null) ||
      typeof (value as any).then === 'function')
  ) {
    return request.renderedImplicitModels;
  }
  return request.modelEntries;
}

function renderFragment(
  request: Request,
  task: Task,
  children: Array<ReactClientValue>,
  source: Iterable<ReactClientValue> = children,
): ReactClientValue {
  const keyPath = task.keyPath;
  let resolvedModel: ReactClientValue;
  if (keyPath !== null) {
    const props = {children};
    let fragment: ReactElement;
    if (__DEV__) {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        props,
        _owner: null,
        _store: {validated: 0},
      } as any;
      Object.defineProperties(fragment, {
        ref: {value: null},
        _debugInfo: {value: null, writable: true},
        _debugStack: {value: null, writable: true},
        _debugTask: {value: null, writable: true},
      });
    } else {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        ref: null,
        props,
      } as any;
    }
    if (task.implicitSlot) {
      const wrappedChildren: Array<ReactClientValue> = [fragment];
      const copy: Array<ReactClientValue> = [];
      setRenderedModel(request.modelEntries, wrappedChildren, copy);
      task.model = wrappedChildren;
      resolvedModel = copy;
      task.fieldParentReference = null;
    } else {
      resolvedModel = fragment;
      task.fieldParentReference = null;
    }
    setRenderedModel(
      getRenderedModels(request, source, keyPath, task.implicitSlot),
      source,
      resolvedModel,
    );
  } else {
    const copy: Array<ReactClientValue> = new Array(children.length);
    setRenderedModel(request.modelEntries, children, copy);
    if (source !== children) {
      setRenderedModel(request.modelEntries, source, copy);
    }
    task.model = children;
    resolvedModel = copy;
    task.fieldParentReference = source === children ? undefined : null;
  }
  task.isModelReference = false;
  return resolvedModel;
}

function performWork(request: Request): void {
  if (request.status === CLOSED) {
    return;
  }
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  const prevCache = setCurrentCache(request);
  prepareToUseHooksForRequest(request);
  try {
    const pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (let i = 0; i < pingedTasks.length; i++) {
      retryTask(request, pingedTasks[i]);
    }
  } catch (error) {
    fatalError(request, error);
  } finally {
    if (request.status !== CLOSED && request.abortableTasks.size === 0) {
      request.status = CLOSED;
      closeHints(request.result);
      completeResult(request.result);
      if (enableTaint) {
        cleanupTaintQueue(request);
      }
      request.cacheController.abort(
        new Error(
          'This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.',
        ),
      );
      request.onAllReady();
    }
    ReactSharedInternals.H = prevDispatcher;
    resetHooksForRequest();
    setCurrentCache(prevCache);
  }
}

export function startWork(request: Request): void {
  // $FlowFixMe[constant-condition]
  if (supportsRequestStorage) {
    scheduleMicrotask(() => {
      cacheStorage.run(request, () =>
        requestStorage.run(undefined, performWork, request),
      );
    });
  } else {
    scheduleMicrotask(() => performWork(request));
  }
  scheduleWork(() => {
    if (request.status === OPENING) {
      request.status = OPEN;
    }
  });
}

function createModelEntry(
  model: ReactClientValue,
  reference: void | ModelReference,
): ModelEntry {
  return reference === undefined
    ? {model, root: undefined, parent: null, key: ''}
    : {
        model,
        root: reference.root,
        parent: reference.parent,
        key: reference.key,
      };
}

function getEntryReference(entry: void | ModelEntry): void | ModelReference {
  return entry === undefined || entry.root === undefined ? undefined : entry;
}

function getPublishedModelReference(
  request: Request,
  reference: ModelReference,
): ModelReference {
  // Escaping paths must not retain memo models after their defining region fails.
  if (reference.parent === null && !hasOwnProperty.call(reference, 'model')) {
    return reference;
  }
  let publishedReferences = request.publishedModelReferences;
  if (publishedReferences === null) {
    request.publishedModelReferences = publishedReferences = new WeakMap();
  }
  const cached = publishedReferences.get(reference);
  if (cached !== undefined) {
    return cached;
  }
  const path = [];
  let location: ModelReference = reference;
  let published: ModelReference = reference;
  while (true) {
    const parent = location.parent;
    if (parent === null) {
      if (hasOwnProperty.call(location, 'model')) {
        published = {root: location.root, parent: null, key: location.key};
        publishedReferences.set(location, published);
      } else {
        published = location;
      }
      break;
    }
    path.push(location);
    location = parent;
    const cachedParent = publishedReferences.get(location);
    if (cachedParent !== undefined) {
      published = cachedParent;
      break;
    }
  }
  for (let i = path.length - 1; i >= 0; i--) {
    const source = path[i];
    if (!hasOwnProperty.call(source, 'model') && source.parent === published) {
      published = source;
    } else {
      published = {
        root: source.root,
        parent: published,
        key: source.key,
      };
      publishedReferences.set(source, published);
    }
  }
  return published;
}

function createResultValueReference(
  request: Request,
  reference: ModelReference,
): Object {
  return createValueReference(
    request.result,
    getPublishedModelReference(request, reference),
  );
}

function getRenderedModel(
  models: WeakMap<Reference, ModelEntry>,
  value: Reference,
): ReactClientValue {
  const entry = models.get(value);
  return entry === undefined ? undefined : entry.model;
}

function setRenderedModel(
  models: WeakMap<Reference, ModelEntry>,
  value: Reference,
  model: ReactClientValue,
): void {
  const entry = models.get(value);
  if (entry === undefined) {
    models.set(value, createModelEntry(model, undefined));
  } else {
    entry.model = model;
  }
}

function getModelReference(
  request: Request,
  value: Reference,
): void | ModelReference {
  const entry = request.modelEntries.get(value);
  return getEntryReference(entry);
}

function setModelReference(
  request: Request,
  value: Reference,
  reference: ModelReference,
): void {
  const entry = request.modelEntries.get(value);
  request.modelEntries.set(
    value,
    createModelEntry(entry === undefined ? undefined : entry.model, reference),
  );
}

function setModelReferenceIfAbsent(
  request: Request,
  value: Reference,
  reference: ModelReference,
): void {
  const entry = request.modelEntries.get(value);
  if (entry === undefined) {
    request.modelEntries.set(value, createModelEntry(undefined, reference));
  } else if (entry.root === undefined) {
    request.modelEntries.set(value, createModelEntry(entry.model, reference));
  }
}

function resolveBoxedModel(
  resolve: (model: ReactClientValue) => void,
  model: ReactClientValue,
): void {
  resolve({value: model});
}

function markErroredModel(
  request: Request,
  task: Task,
  model: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
  rendered: ReactClientValue = undefined,
): void {
  if (model === null || typeof model !== 'object') {
    return;
  }
  const models = getRenderedModels(request, model, keyPath, implicitSlot);
  const copy =
    rendered === undefined ? getRenderedModel(models, model) : rendered;
  if (
    copy !== null &&
    typeof copy === 'object' &&
    copy !== task.promise &&
    (copy as any).$$typeof !== REACT_LAZY_TYPE
  ) {
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(copy, task);
    request.hasByValueModels = true;
  }
  setRenderedModel(
    models,
    model,
    (model as any).$$typeof === REACT_ELEMENT_TYPE
      ? createLazyWrapperAroundWakeable(task.promise as any)
      : task.promise,
  );
}

function renderModelReference(
  task: Task,
  model: ReactClientValue,
): ReactClientValue {
  task.isModelReference = true;
  return model;
}

function addModelDependency(
  task: Task,
  promise: ResultModel<ReactClientValue>,
): void {
  let dependencies = task.modelDependencies;
  if (dependencies === null) {
    task.modelDependencies = dependencies = new Set();
  }
  dependencies.add(promise);
}

function getOutlinedModelDependencies(
  request: Request,
  model: ReactClientValue,
  outlinedModels: WeakMap<Reference, Task>,
): Set<ResultModel<ReactClientValue>> {
  const resolvingModels =
    request.resolvingModels === null
      ? new Set(request.resolvingModelStack)
      : request.resolvingModels;
  request.resolvingModels = resolvingModels;
  type Record = {
    model: Reference,
    index: number,
    low: number,
    active: boolean,
    stable: boolean,
    dependencies: Set<ResultModel<ReactClientValue>>,
    ready: null | ResultModel<ReactClientValue>,
  };
  const cache: WeakMap<Reference, null | ResultModel<ReactClientValue>> =
    request.outlinedModelDependencies === null
      ? new WeakMap()
      : request.outlinedModelDependencies;
  request.outlinedModelDependencies = cache;
  const records: Map<Reference, Record> = new Map();
  const stack: Array<Record> = [];
  let index = 0;
  function visit(value: any, parent: null | Record): void {
    if (value === null || typeof value !== 'object') {
      return;
    }
    const outlinedTask = outlinedModels.get(value);
    if (outlinedTask !== undefined) {
      if (parent !== null && outlinedTask.status !== COMPLETED) {
        parent.dependencies.add(outlinedTask.promise);
      }
      return;
    }
    const cached = cache.get(value);
    if (cached !== undefined) {
      if (parent !== null && cached !== null && cached.status !== 'fulfilled') {
        parent.dependencies.add(cached);
      }
      return;
    }
    const existing = records.get(value);
    if (existing !== undefined) {
      if (parent !== null) {
        if (existing.active) {
          parent.low = Math.min(parent.low, existing.index);
        } else {
          if (
            existing.ready !== null &&
            existing.ready.status !== 'fulfilled'
          ) {
            parent.dependencies.add(existing.ready);
          }
          parent.stable = parent.stable && existing.stable;
        }
      }
      return;
    }
    const record: Record = {
      model: value,
      index,
      low: index++,
      active: true,
      stable: !resolvingModels.has(value),
      dependencies: new Set(),
      ready: null,
    };
    records.set(value, record);
    stack.push(record);
    visitFields(value, record);
    if (record.low === record.index) {
      const members: Array<Record> = [];
      let member;
      do {
        member = stack[stack.length - 1];
        stack.length--;
        members.push(member);
        member.dependencies.forEach(dependency =>
          record.dependencies.add(dependency),
        );
        record.stable = record.stable && member.stable;
      } while (member !== record);
      const dependencies = record.dependencies;
      dependencies.forEach(dependency => {
        if (dependency.status === 'fulfilled') {
          dependencies.delete(dependency);
        }
      });
      if (dependencies.size === 1) {
        dependencies.forEach(dependency => {
          record.ready = dependency;
        });
      } else if (dependencies.size > 1) {
        const ready = createResultModel<ReactClientValue>();
        record.ready = ready;
        let remaining = dependencies.size;
        dependencies.forEach(dependency => {
          dependency.then(
            () => {
              if (--remaining === 0) {
                fulfillResultModel(ready, undefined);
              }
            },
            error => {
              copyErrorReference(request.result, ready, dependency);
              rejectResultModel(ready, error);
            },
          );
        });
      }
      for (let i = 0; i < members.length; i++) {
        member = members[i];
        member.active = false;
        member.stable = record.stable;
        member.ready = record.ready;
        member.dependencies.clear();
        if (record.stable) {
          cache.set(member.model, record.ready);
        }
      }
    }
    if (parent !== null) {
      if (record.active) {
        parent.low = Math.min(parent.low, record.low);
      } else {
        if (record.ready !== null && record.ready.status !== 'fulfilled') {
          parent.dependencies.add(record.ready);
        }
        parent.stable = parent.stable && record.stable;
      }
    }
  }
  function visitFields(value: any, record: Record): void {
    const kind = getModelInfo(request.result, value) & MODEL_KIND_MASK;
    if (
      kind === 0 &&
      (isClientReference(value) ||
        isServerReference(value) ||
        getTemporaryReference(request.result, value) !== undefined ||
        getValueReference(request.result, value) !== undefined)
    ) {
      return;
    }
    if (
      kind === MODEL_ELEMENT ||
      (kind === 0 && value.$$typeof === REACT_ELEMENT_TYPE)
    ) {
      visit(value.type, record);
      visit(value.props, record);
    } else if (
      kind === 0 &&
      (value.$$typeof === REACT_LAZY_TYPE ||
        typeof value.then === 'function' ||
        value instanceof Date ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value))
    ) {
      return;
    } else if (kind === MODEL_ARRAY || (kind === 0 && isArray(value))) {
      for (let i = 0; i < value.length; i++) {
        visit(value[i], record);
      }
    } else if (kind === 0 && value instanceof Map) {
      value.forEach((child: ReactClientValue, key: ReactClientValue) => {
        visit(key, record);
        visit(child, record);
      });
    } else if (kind === 0 && value instanceof Set) {
      value.forEach((child: ReactClientValue) => visit(child, record));
    } else {
      if (kind === 0 && getPrototypeOf(value) !== ObjectPrototype) {
        if (typeof FormData === 'function' && value instanceof FormData) {
          const iterator = value.entries();
          for (
            let entry = iterator.next();
            !entry.done;
            entry = iterator.next()
          ) {
            visit(entry.value[1], record);
          }
          return;
        }
        if (typeof Blob === 'function' && value instanceof Blob) {
          return;
        }
        const entries = getIteratorEntries(request.result, value);
        if (entries !== undefined) {
          visit(entries, record);
          return;
        }
      }
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        visit(value[keys[i]], record);
      }
    }
  }
  visit(model, null);
  const dependencies: Set<ResultModel<ReactClientValue>> = new Set();
  if (model !== null && typeof model === 'object') {
    const ownTask = outlinedModels.get(model);
    if (ownTask !== undefined) {
      if (ownTask.status !== COMPLETED) {
        dependencies.add(ownTask.promise);
      }
    } else {
      const record = records.get(model);
      const ready = record === undefined ? cache.get(model) : record.ready;
      if (
        ready !== undefined &&
        ready !== null &&
        ready.status !== 'fulfilled'
      ) {
        dependencies.add(ready);
      }
    }
  }
  return dependencies;
}

function resolveOutlinedModel(
  request: Request,
  model: ReactClientValue,
  outlinedModels: WeakMap<Reference, Task>,
): ReactClientValue {
  const visited: WeakMap<Reference, ReactClientValue> =
    request.resolvedOutlinedModels === null
      ? new WeakMap()
      : request.resolvedOutlinedModels;
  request.resolvedOutlinedModels = visited;
  function resolve(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (visited.has(value)) {
      return visited.get(value);
    }
    visited.set(value, value);
    const dependency = outlinedModels.get(value);
    if (dependency !== undefined && value !== dependency.model) {
      visited.set(value, dependency.model);
      const resolved = resolve(dependency.model);
      visited.set(value, resolved);
      return resolved;
    }
    const kind = getModelInfo(request.result, value) & MODEL_KIND_MASK;
    if (
      kind === 0 &&
      (isClientReference(value) ||
        isServerReference(value) ||
        getTemporaryReference(request.result, value) !== undefined ||
        getValueReference(request.result, value) !== undefined)
    ) {
      return value;
    }
    if (
      kind === MODEL_ELEMENT ||
      (kind === 0 && value.$$typeof === REACT_ELEMENT_TYPE)
    ) {
      const type = resolve(value.type);
      if (type !== value.type) {
        value.type = type;
      }
      const props = resolve(value.props);
      if (props !== value.props) {
        value.props = props;
      }
    } else if (
      kind === 0 &&
      (value.$$typeof === REACT_LAZY_TYPE ||
        typeof value.then === 'function' ||
        value instanceof Date ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value))
    ) {
      return value;
    } else if (kind === MODEL_ARRAY || (kind === 0 && isArray(value))) {
      for (let i = 0; i < value.length; i++) {
        if (hasOwnProperty.call(value, i)) {
          const child = resolve(value[i]);
          if (!Object.is(child, value[i])) {
            value[i] = child;
          }
        }
      }
    } else if (kind === 0 && value instanceof Map) {
      const entries: Array<[any, any]> = Array.from(value);
      value.clear();
      for (let i = 0; i < entries.length; i++) {
        value.set(resolve(entries[i][0]), resolve(entries[i][1]));
      }
    } else if (kind === 0 && value instanceof Set) {
      const entries: Array<any> = Array.from(value);
      value.clear();
      for (let i = 0; i < entries.length; i++) {
        value.add(resolve(entries[i]));
      }
    } else {
      if (
        kind === 0 &&
        getPrototypeOf(value) !== ObjectPrototype &&
        ((typeof FormData === 'function' && value instanceof FormData) ||
          (typeof Blob === 'function' && value instanceof Blob))
      ) {
        return value;
      }
      const entries =
        kind === 0 ? getIteratorEntries(request.result, value) : undefined;
      if (entries !== undefined) {
        resolve(entries);
        return value;
      }
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const child = resolve(value[key]);
        if (!Object.is(child, value[key])) {
          value[key] = child;
        }
      }
    }
    return value;
  }
  return resolve(model);
}

function renderOutlinedElement(
  request: Request,
  task: Task,
  element: ReactElement,
  model: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
  dependencies: null | Set<ResultModel<ReactClientValue>>,
): ReactClientValue {
  const outlinedModels = request.outlinedModels;
  const elementModel: ReactClientValue = element as any;
  if (outlinedModels !== null && dependencies !== null) {
    const newTask = createTask(
      request,
      elementModel,
      null,
      false,
      task.formatContext,
    );
    blockTask(request, newTask, elementModel, dependencies);
    const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
    outlinedModels.set(element, newTask);
    outlinedModels.set(newTask.promise, newTask);
    if (model !== null && typeof model === 'object') {
      setRenderedModel(
        getRenderedModels(request, model, keyPath, implicitSlot),
        model,
        lazy,
      );
    }
    return renderModelReference(task, lazy);
  }
  return elementModel;
}

function waitForOutlinedModel(
  request: Request,
  task: Task,
  model: ReactClientValue,
  outlinedModels: WeakMap<Reference, Task>,
): boolean {
  const dependencies = getOutlinedModelDependencies(
    request,
    model,
    outlinedModels,
  );
  if (dependencies.size === 0) {
    return false;
  }
  blockTask(request, task, model, dependencies);
  return true;
}

function blockTask(
  request: Request,
  task: Task,
  model: ReactClientValue,
  dependencies: Set<ResultModel<ReactClientValue>>,
): void {
  task.model = model;
  task.status = BLOCKED;
  if (request.status === ABORTING) {
    abortTask(request, task);
    return;
  }
  let remaining = dependencies.size;
  dependencies.forEach(dependency => {
    const resolve = () => {
      if (task.status !== BLOCKED) {
        return;
      }
      if (--remaining === 0) {
        const outlinedModels = request.outlinedModels;
        completeTask(
          request,
          task,
          outlinedModels === null
            ? model
            : resolveOutlinedModel(request, model, outlinedModels),
        );
        scheduleMicrotask(() => performWork(request));
      }
    };
    const reject = (error: mixed) => {
      if (task.status !== BLOCKED) {
        return;
      }
      copyErrorReference(request.result, task.promise, dependency);
      task.status = ERRORED;
      task.reject(error);
      request.abortableTasks.delete(task);
      scheduleMicrotask(() => performWork(request));
    };
    if (dependency.status === 'fulfilled') {
      resolve();
    } else if (dependency.status === 'rejected') {
      reject(dependency.reason);
    } else {
      dependency.then(resolve, reject);
    }
  });
}

function completeTask(
  request: Request,
  task: Task,
  resolvedModel: ReactClientValue,
): void {
  task.model = resolvedModel;
  task.status = COMPLETED;
  if (
    resolvedModel !== null &&
    typeof resolvedModel === 'object' &&
    (resolvedModel as any).$$typeof === REACT_LAZY_TYPE &&
    getModelInfo(request.result, resolvedModel) === 0
  ) {
    const lazy: LazyComponent<
      ReactClientValue,
      ResultModel<ReactClientValue>,
    > = resolvedModel as any;
    const outlinedModels = request.outlinedModels;
    if (outlinedModels === null || !outlinedModels.has(lazy._payload)) {
      const source = lazy._payload;
      forwardModelReference(request.result, task.promise, source);
      source.then(task.resolve, error => {
        copyErrorReference(request.result, task.promise, source);
        task.reject(error);
      });
      request.abortableTasks.delete(task);
      return;
    }
  }
  task.resolve(resolvedModel);
  request.abortableTasks.delete(task);
}

function deferTask(request: Request, task: Task): ReactClientValue {
  const newTask = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
  const model = task.model;
  if (model !== null && typeof model === 'object') {
    setModelReference(request, model, newTask.reference);
    setRenderedModel(
      getRenderedModels(request, model, task.keyPath, task.implicitSlot),
      model,
      lazy,
    );
  }
  pingTask(request, newTask);
  return renderModelReference(task, lazy);
}

function abortTask(request: Request, task: Task): void {
  task.status = ABORTED;
  if (request.type === PRERENDER) {
    markHalted(request.result, task.promise);
  } else {
    const abortModel = request.abortModel;
    if (abortModel !== null) {
      copyErrorReference(request.result, task.promise, abortModel);
    }
    task.reject(request.fatalError);
  }
  request.abortableTasks.delete(task);
}

function finishAbort(
  request: Request,
  error: mixed,
  preserveRendering: boolean = false,
): void {
  request.abortableTasks.forEach(task => {
    if (preserveRendering) {
      if (task.status !== RENDERING) {
        if (__DEV__ && request.type === PRERENDER) {
          task.status = ABORTED;
        } else {
          abortTask(request, task);
        }
      }
    } else {
      task.status = ABORTED;
      task.reject(error);
      request.abortableTasks.delete(task);
    }
  });
  request.pingedTasks.length = 0;
  if (
    __DEV__ &&
    request.type === PRERENDER &&
    preserveRendering &&
    request.abortableTasks.size > 0
  ) {
    scheduleWork(() => finishAbortedTasks(request));
    return;
  }
  if (request.abortableTasks.size === 0) {
    request.status = CLOSED;
    closeHints(request.result);
    completeResult(request.result);
    if (enableTaint) {
      cleanupTaintQueue(request);
    }
  }
}

function renderAsyncIterable(
  request: Request,
  task: Task,
  iterable: $AsyncIterable<ReactClientValue, ReactClientValue, void>,
  iterator: $AsyncIterator<ReactClientValue, ReactClientValue, void>,
): ReactClientValue {
  const controller = createAsyncIterable<ReactClientValue>(
    iterable === iterator,
  );
  const streamTask = createTask(
    request,
    task.model,
    null,
    false,
    task.formatContext,
  );
  const resolvedIterable = controller.iterable;
  setRenderedModel(
    request.modelEntries,
    iterable as any,
    resolvedIterable as any,
  );
  setAsyncIterable(request.result, controller);

  function progress(entry: IteratorResult<ReactClientValue, ReactClientValue>) {
    if (streamTask.status !== PENDING) {
      return;
    }
    const entryTask = createTask(
      request,
      entry.value,
      null,
      false,
      entry.done ? createRootFormatContext() : streamTask.formatContext,
    );
    if (entry.done) {
      streamTask.status = COMPLETED;
      request.abortableTasks.delete(streamTask);
      request.cacheController.signal.removeEventListener(
        'abort',
        abortIterable,
      );
      controller.close(entryTask.promise as any);
    } else {
      controller.enqueue(entryTask.promise as any);
    }
    request.pingedTasks.push(entryTask);
    performWork(request);
    if (!entry.done && streamTask.status === PENDING) {
      next();
    }
  }

  function throwIntoIterator(reason: mixed): void {
    if (typeof (iterator as any).throw === 'function') {
      try {
        // $FlowFixMe[prop-missing] The optional iterator method accepts the reason.
        iterator.throw(reason).then(noop, noop);
      } catch (x) {
        // The stream already contains the original error.
      }
    }
  }

  function error(reason: mixed): void {
    if (streamTask.status !== PENDING) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortIterable);
    try {
      erroredTask(request, streamTask, reason);
      copyErrorReference(request.result, resolvedIterable, streamTask.promise);
      controller.error(reason);
    } catch (callbackError) {
      controller.error(callbackError);
      fatalError(request, callbackError);
    } finally {
      throwIntoIterator(reason);
      scheduleMicrotask(() => performWork(request));
    }
  }

  function abortIterable(): void {
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortIterable);
    const reason = signal.reason;
    if (request.type === PRERENDER) {
      markHalted(request.result, resolvedIterable);
      controller.halt();
    } else {
      streamTask.promise.then(noop, abortError => {
        copyErrorReference(
          request.result,
          resolvedIterable,
          streamTask.promise,
        );
        controller.error(abortError);
      });
    }
    throwIntoIterator(reason);
  }

  function next(): void {
    try {
      iterator.next().then(progress, error);
    } catch (x) {
      error(x);
    }
  }

  request.cacheController.signal.addEventListener('abort', abortIterable);
  next();
  return resolvedIterable as any;
}

function renderAsyncFragment(
  request: Request,
  task: Task,
  children: $AsyncIterable<ReactClientValue, ReactClientValue, void>,
  getAsyncIterator: () => $AsyncIterator<
    ReactClientValue,
    ReactClientValue,
    void,
  >,
): ReactClientValue {
  const keyPath = task.keyPath;
  const implicitSlot = task.implicitSlot;
  task.keyPath = null;
  task.implicitSlot = false;
  const existingIterable = getRenderedModel(request.modelEntries, children);
  const resolvedIterable =
    existingIterable === undefined || existingIterable === task.promise
      ? renderAsyncIterable(
          request,
          task,
          children,
          getAsyncIterator.call(children),
        )
      : existingIterable;
  if (keyPath !== null) {
    const props = {children: resolvedIterable};
    let fragment: ReactElement;
    if (__DEV__) {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        props,
        _owner: null,
        _store: {validated: 0},
      } as any;
      Object.defineProperties(fragment, {
        ref: {value: null},
        _debugInfo: {value: null, writable: true},
        _debugStack: {value: null, writable: true},
        _debugTask: {value: null, writable: true},
      });
    } else {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        ref: null,
        props,
      } as any;
    }
    const resolvedModel = implicitSlot ? [fragment as any] : (fragment as any);
    setRenderedModel(
      getRenderedModels(request, children, keyPath, implicitSlot),
      children,
      resolvedModel,
    );
    return resolvedModel;
  }
  return resolvedIterable;
}

export function attachAbortSignal(request: Request, signal: AbortSignal): void {
  if (signal.aborted) {
    abort(request, signal.reason);
    return;
  }
  const cacheSignal = request.cacheController.signal;
  if (cacheSignal.aborted) {
    return;
  }
  const subscription: {request: null | Request} = {request};
  function onAbort(): void {
    const current = subscription.request;
    if (current !== null) {
      abort(current, signal.reason);
    }
  }
  function detach(): void {
    subscription.request = null;
    signal.removeEventListener('abort', onAbort);
  }
  signal.addEventListener('abort', onAbort);
  cacheSignal.addEventListener('abort', detach, {once: true});
}

export function abort(request: Request, reason: mixed): void {
  if (request.status > OPEN) {
    return;
  }
  try {
    request.status = ABORTING;
    request.cacheController.abort(reason);
    if (request.type === PRERENDER) {
      finishAbort(request, reason, true);
      if (request.status === CLOSED) {
        request.onAllReady();
      }
      return;
    }
    const error =
      reason === undefined
        ? new Error('The render was aborted by the server without a reason.')
        : typeof reason === 'object' &&
            reason !== null &&
            typeof (reason as any).then === 'function'
          ? new Error('The render was aborted by the server with a promise.')
          : reason;
    request.fatalError = error;
    if (request.abortableTasks.size > 0) {
      const digest = logRecoverableError(request, error);
      const abortModel = createResultModel<ReactClientValue>();
      request.abortModel = abortModel;
      setErrorDigest(request.result, abortModel, digest);
      rejectResultModel(abortModel, error);
    }
    finishAbort(request, error, true);
    if (request.status === CLOSED) {
      request.onAllReady();
    }
  } catch (error) {
    fatalError(request, error);
  }
}

export function createPrerenderRequest(
  model: ReactClientValue,
  onAllReady: () => void,
  onFatalError: mixed => void,
  onError: void | (mixed => ?string),
  identifierPrefix: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(
    model,
    onError,
    identifierPrefix,
    temporaryReferences,
    createServerReference,
    PRERENDER,
    onAllReady,
    onFatalError,
  );
}

function finishAbortedTasks(request: Request): void {
  request.abortableTasks.forEach(task => {
    if (task.status === ABORTED) {
      abortTask(request, task);
    }
  });
  if (request.abortableTasks.size === 0 && request.status !== CLOSED) {
    request.status = CLOSED;
    closeHints(request.result);
    completeResult(request.result);
    if (enableTaint) {
      cleanupTaintQueue(request);
    }
    request.onAllReady();
  }
}

function renderMap(
  request: Request,
  task: Task,
  map: Map<ReactClientValue, ReactClientValue>,
): Map<ReactClientValue, ReactClientValue> {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, map) as any;
  }
  const entries = Array.from(map);
  const copy: Map<ReactClientValue, ReactClientValue> = new Map();
  setRenderedModel(request.modelEntries, map, copy);
  const model = renderCollectionEntries(request, task, copy, entries);
  const populate = (values: Array<[ReactClientValue, ReactClientValue]>) => {
    for (let i = 0; i < values.length; i++) {
      copy.set(values[i][0], values[i][1]);
    }
  };
  const values = model.value;
  if (model.status === 'fulfilled' && values !== undefined) {
    populate(values);
  } else {
    model.then(populate, noop);
  }
  return copy;
}

function renderSet(
  request: Request,
  task: Task,
  set: Set<ReactClientValue>,
): Set<ReactClientValue> {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, set) as any;
  }
  const entries = Array.from(set);
  const copy: Set<ReactClientValue> = new Set();
  setRenderedModel(request.modelEntries, set, copy);
  const model = renderCollectionEntries(request, task, copy, entries);
  const populate = (values: Array<ReactClientValue>) => {
    for (let i = 0; i < values.length; i++) {
      copy.add(values[i]);
    }
  };
  const values = model.value;
  if (model.status === 'fulfilled' && values !== undefined) {
    populate(values);
  } else {
    model.then(populate, noop);
  }
  return copy;
}

function renderCollectionEntries(
  request: Request,
  task: Task,
  collection: Object,
  entries: Array<any>,
): ResultModel<Array<any>> {
  const reference = task.currentReference;
  if (reference !== null) {
    setModelReference(request, collection, reference);
  }
  const newTask = createTask(request, entries, null, false, task.formatContext);
  setCollectionEntries(request.result, collection, newTask.promise as any);
  retryTask(request, newTask);
  return newTask.promise as any;
}

function renderFormData(
  request: Request,
  task: Task,
  formData: FormData,
): FormData {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, formData) as any;
  }
  const entries: Array<[ReactClientValue, ReactClientValue]> = Array.from(
    formData.entries(),
  ) as any;
  let hasBlob = false;
  let hasOutlinedEntry = false;
  setRenderedModel(request.modelEntries, formData, formData);
  task.keyPath = null;
  task.implicitSlot = false;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = resolveModel(request, task, entry, '0', entry[0]);
    const value = resolveModel(request, task, entry, '1', entry[1] as any);
    if (typeof entry[1] !== 'string') {
      hasBlob = true;
    }
    if (key !== entry[0] || value !== entry[1]) {
      hasOutlinedEntry = true;
      entry[0] = key;
      entry[1] = value;
    }
  }
  if (hasBlob) {
    markFormDataWithBlobs(request.result, formData);
  }
  if (hasOutlinedEntry) {
    blockModelOnDependencies(request, formData, entries);
  }
  return formData;
}

function blockModelOnDependencies(
  request: Request,
  model: ReactClientValue,
  dependencyModel: ReactClientValue,
): void {
  const outlinedModels = request.outlinedModels;
  if (outlinedModels === null) {
    return;
  }
  const dependencies = getOutlinedModelDependencies(
    request,
    dependencyModel,
    outlinedModels,
  );
  if (dependencies.size > 0) {
    const newTask = createTask(
      request,
      model,
      null,
      false,
      createRootFormatContext(),
    );
    outlinedModels.set(model as any, newTask);
    blockTask(request, newTask, model, dependencies);
  }
}

function renderBlob(request: Request, task: Task, blob: Blob): Blob {
  setRenderedModel(request.modelEntries, blob, blob);
  if (enableTaint) {
    const newTask = createTask(
      request,
      blob,
      null,
      false,
      createRootFormatContext(),
    );
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(blob, newTask);
    request.hasByValueModels = true;
    addModelDependency(task, newTask.promise);
    const deferredBlobs = request.deferredBlobs;
    if (deferredBlobs === null) {
      request.deferredBlobs = [newTask];
    } else {
      deferredBlobs.push(newTask);
    }
  }
  return blob;
}

function validateBlob(request: Request, newTask: Task): void {
  if (newTask.status !== PENDING) {
    return;
  }
  const blob: Blob = newTask.model as any;
  try {
    const taintedType = TaintRegistryValues.get(blob.type);
    if (taintedType !== undefined) {
      throwTaintViolation(taintedType.message);
    }
    if (TaintRegistryByteLengths.size === 0) {
      completeTask(request, newTask, blob);
      return;
    }
  } catch (x) {
    erroredTask(request, newTask, x);
    return;
  }
  const copy = new Blob([blob], {type: blob.type});
  const reader = copy.stream().getReader();

  function progress(entry: {
    done: boolean,
    value: any,
    ...
  }): Promise<void> | void {
    if (newTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      request.cacheController.signal.removeEventListener('abort', abortBlob);
      scheduleMicrotask(() => performWork(request));
      completeTask(request, newTask, blob);
      return;
    }
    const chunk: Uint8Array = entry.value;
    if (TaintRegistryByteLengths.has(chunk.byteLength)) {
      const tainted = TaintRegistryValues.get(binaryToComparableString(chunk));
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    return reader.read().then(progress).catch(error);
  }
  function error(reason: mixed): void {
    if (newTask.status !== PENDING) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortBlob);
    scheduleMicrotask(() => performWork(request));
    try {
      erroredTask(request, newTask, reason);
    } catch (callbackError) {
      fatalError(request, callbackError);
    } finally {
      // $FlowFixMe[incompatible-type] Stream cancellation accepts any reason.
      reader.cancel(reason).then(noop, noop);
    }
  }
  function abortBlob(): void {
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortBlob);
    reader.cancel(signal.reason).then(noop, noop);
  }
  request.cacheController.signal.addEventListener('abort', abortBlob);
  reader.read().then(progress).catch(error);
}

function validateDeferredBlobs(request: Request): void {
  const deferredBlobs = request.deferredBlobs;
  request.deferredBlobs = null;
  if (deferredBlobs !== null) {
    for (let i = 0; i < deferredBlobs.length; i++) {
      validateBlob(request, deferredBlobs[i]);
    }
  }
}

function renderServerReference(request: Request, reference: Object): Object {
  const existingReference = getRenderedModel(request.modelEntries, reference);
  if (existingReference !== undefined) {
    return existingReference;
  }
  const id = getServerReferenceId(null as any, reference as any);
  if (typeof reference !== 'function') {
    setServerReference(request.result, reference, {
      id,
      bound: null,
      isObjectReference: true,
    });
    setRenderedModel(request.modelEntries, reference, reference);
    return reference;
  }
  const boundArgs = getServerReferenceBoundArguments(
    null as any,
    reference as any,
  );
  if (boundArgs === null) {
    setServerReference(request.result, reference, {
      id,
      bound: null,
      isObjectReference: false,
    });
    setRenderedModel(request.modelEntries, reference, reference);
    return reference;
  }
  const newTask = createTask(
    request,
    boundArgs as any,
    null,
    false,
    createRootFormatContext(),
  );
  newTask.promise.then(noop, noop);
  const copy = request.createServerReference(reference, newTask.promise as any);
  setServerReference(request.result, copy, {
    id,
    bound: newTask.promise as any,
    isObjectReference: false,
  });
  setRenderedModel(request.modelEntries, reference, copy);
  pingTask(request, newTask);
  return copy;
}

function renderIterator(
  request: Request,
  task: Task,
  iterator: Iterator<ReactClientValue>,
): Iterator<ReactClientValue> {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, iterator as any) as any;
  }
  const existingModel = getRenderedModel(request.modelEntries, iterator as any);
  if (existingModel !== undefined && existingModel !== task.promise) {
    return existingModel as any;
  }
  const entries = Array.from(iterator);
  const copy: Array<ReactClientValue> = [];
  const resolvedIterator = copy.values();
  setRenderedModel(
    request.modelEntries,
    iterator as any,
    resolvedIterator as any,
  );
  setIteratorEntries(request.result, resolvedIterator, copy);
  task.keyPath = null;
  task.implicitSlot = false;
  for (let i = 0; i < entries.length; i++) {
    copy[i] = resolveModel(request, task, entries, '' + i, entries[i]);
  }
  return resolvedIterator;
}

function renderReadableStream(
  request: Request,
  task: Task,
  stream: ReadableStream,
): ReactClientValue {
  // $FlowFixMe[prop-missing] This is a Node.js extension.
  let supportsBYOB: void | boolean = stream.supportsBYOB;
  if (supportsBYOB === undefined) {
    try {
      // $FlowFixMe[extra-arg] This argument is accepted.
      stream.getReader({mode: 'byob'}).releaseLock();
      supportsBYOB = true;
    } catch (x) {
      supportsBYOB = false;
    }
  }
  const isByteStream: boolean = supportsBYOB;
  const reader = stream.getReader();
  const controller = createReadableStream<ReactClientValue>(isByteStream);
  const streamTask = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  const resolvedStream = controller.stream;
  setRenderedModel(request.modelEntries, stream, resolvedStream);
  setReadableStream(request.result, controller);

  function progress(entry: {done: boolean, value: ReactClientValue, ...}) {
    if (streamTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      request.abortableTasks.delete(streamTask);
      request.cacheController.signal.removeEventListener('abort', abortStream);
      controller.close();
      scheduleMicrotask(() => performWork(request));
      return;
    }
    let entryTask: Task | null = null;
    try {
      streamTask.model = entry.value;
      if (isByteStream) {
        const value = renderModelDestructive(
          request,
          streamTask,
          emptyRoot,
          '',
          entry.value,
        );
        controller.enqueue(Promise.resolve(value));
      } else {
        entryTask = createTask(
          request,
          entry.value,
          streamTask.keyPath,
          streamTask.implicitSlot,
          streamTask.formatContext,
        );
        controller.enqueue(entryTask.promise as any);
        tryStreamTask(request, entryTask);
      }
      if (streamTask.status === PENDING) {
        reader.read().then(progress, error);
      }
    } catch (x) {
      error(x);
      if (entryTask !== null && entryTask.status === RENDERING) {
        copyErrorReference(
          request.result,
          entryTask.promise,
          streamTask.promise,
        );
        entryTask.status = ERRORED;
        entryTask.reject(x);
        request.abortableTasks.delete(entryTask);
      }
    }
  }

  function cancelReader(reason: mixed): void {
    // $FlowFixMe[incompatible-type] Stream cancellation accepts any reason.
    reader.cancel(reason).then(noop, noop);
  }

  function error(reason: mixed): void {
    if (streamTask.status !== PENDING) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortStream);
    try {
      erroredTask(request, streamTask, reason);
      copyErrorReference(request.result, resolvedStream, streamTask.promise);
      controller.error(reason);
    } catch (callbackError) {
      controller.error(callbackError);
      fatalError(request, callbackError);
    } finally {
      cancelReader(reason);
      scheduleMicrotask(() => performWork(request));
    }
  }

  function abortStream(): void {
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortStream);
    const reason = signal.reason;
    if (request.type === PRERENDER) {
      markHalted(request.result, resolvedStream);
      controller.halt();
    } else {
      streamTask.promise.then(noop, abortError => {
        copyErrorReference(request.result, resolvedStream, streamTask.promise);
        controller.error(abortError);
      });
    }
    cancelReader(reason);
  }

  request.cacheController.signal.addEventListener('abort', abortStream);
  reader.read().then(progress, error);
  return resolvedStream;
}

function tryStreamTask(request: Request, task: Task): void {
  const parentSerializedSize = serializedSize;
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  const prevCache = setCurrentCache(request);
  prepareToUseHooksForRequest(request);
  task.status = RENDERING;
  try {
    const value = resolveModel(request, task, emptyRoot, '', task.model);
    const model = value;
    if (request.status === CLOSED) {
      return;
    }
    if (enableTaint) {
      validateDeferredBlobs(request);
    }
    const outlinedModels = request.outlinedModels;
    if (
      outlinedModels !== null &&
      waitForOutlinedModel(request, task, model, outlinedModels)
    ) {
      return;
    }
    completeTask(request, task, model);
  } catch (error) {
    if (request.status === ABORTING) {
      abortTask(request, task);
      return;
    }
    throw error;
  } finally {
    modelRoot = null;
    try {
      if (enableTaint) {
        validateDeferredBlobs(request);
      }
      if (request.status !== CLOSED && request.abortableTasks.size === 0) {
        request.status = CLOSED;
        closeHints(request.result);
        completeResult(request.result);
        if (enableTaint) {
          cleanupTaintQueue(request);
        }
        request.cacheController.abort(
          new Error(
            'This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.',
          ),
        );
        request.onAllReady();
      }
    } finally {
      serializedSize = parentSerializedSize;
      ReactSharedInternals.H = prevDispatcher;
      resetHooksForRequest();
      setCurrentCache(prevCache);
    }
  }
}
