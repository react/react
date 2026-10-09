/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {Result} from 'shared/ReactFlightResult';
import type {ResultModel} from 'shared/ReactFlightResultModel';
import type {ClientReference} from './ReactFlightServerConfig';
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
  REACT_FRAGMENT_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';
import ReactSharedInternals from 'shared/ReactSharedInternals';
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
} from 'shared/ReactFlightResult';
import {
  createResultModel,
  fulfillResultModel,
  rejectResultModel,
} from 'shared/ReactFlightResultModel';
import {scheduleMicrotask} from './ReactServerStreamConfig';
import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';
import noop from 'shared/noop';
import {
  createHints,
  createRootFormatContext,
  getChildFormatContext,
} from './ReactFlightResultServerConfig';
import {resolveCache, setCurrentCache} from './flight/ReactFlightCurrentCache';
import {
  isClientReference,
  supportsRequestStorage,
  cacheStorage,
  requestStorage,
} from './ReactFlightServerConfig';
import {DefaultAsyncDispatcher} from './flight/ReactFlightAsyncDispatcher';

const UNDEFINED_MODEL = Symbol();
const PENDING = 0;
const COMPLETED = 1;
const RENDERING = 6;
const ERRORED = 4;
const OPENING = 10;
const CLOSED = 14;

export type ReactClientValue =
  | ReactElement
  | LazyComponent<ReactClientValue, Thenable<ReactClientValue>>
  | Promise<ReactClientValue>
  | ClientReference<any>
  | string
  | boolean
  | number
  | symbol
  | bigint
  | null
  | void
  | Array<ReactClientValue>
  | ReactClientObject
  | ((...args: Array<mixed>) => mixed);
export type ReactClientObject = {+[key: string]: ReactClientValue};
const ObjectPrototype = Object.prototype;
type Task = {
  model: ReactClientValue,
  promise: ResultModel<ReactClientValue>,
  status: 0 | 1 | 4 | 6,
  formatContext: FormatContext,
  isModelReference: boolean,
  ping: () => void,
  thenableState: ThenableState | null,
  keyPath: ReactKey,
  implicitSlot: boolean,
};
export type Request = {
  status: 10 | 14,
  result: Result<ReactClientValue>,
  pingedTasks: Array<Task>,
  hints: Hints,
  cache: Map<Function, mixed>,
  cacheController: AbortController,
  modelEntries: WeakMap<Object, ReactClientValue>,
  renderedImplicitModels: WeakMap<Object, ReactClientValue>,
  renderedKeyedModels: null | Map<
    ReactKey,
    {
      explicit: WeakMap<Object, ReactClientValue>,
      implicit: WeakMap<Object, ReactClientValue>,
    },
  >,
  abortableTasks: Set<Task>,
  identifierPrefix: string,
  identifierCount: number,
  onError: mixed => ?string,
};

function defaultErrorHandler(error: mixed): void {
  console['error'](error);
}

function RequestInstance(
  this: any,
  model: ReactClientValue,
  onError: void | (mixed => ?string),
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
  this.status = OPENING;
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  this.hints = createHints();
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.modelEntries = new WeakMap();
  this.renderedImplicitModels = new WeakMap();
  this.renderedKeyedModels = null;
  this.abortableTasks = new Set();
  this.identifierPrefix = '';
  this.identifierCount = 1;
  const rootTask = createTask(
    this,
    model,
    null,
    false,
    createRootFormatContext(),
  );
  const root = rootTask.promise;
  this.result = createResult(root, () => {
    throw new Error('Not implemented.');
  });
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
  onError?: mixed => ?string,
): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(model, onError);
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
  const result = Component(props, undefined);
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
    const expandedThenable: Thenable<ReactClientValue> = renderThenable(
      request,
      task,
      result,
    ) as any;
    const resolvedModel = createLazyWrapperAroundWakeable(expandedThenable);
    renderedModels.set(element, resolvedModel);
    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;
    task.isModelReference = true;
    return resolvedModel;
  }
  if (
    __DEV__ &&
    result !== null &&
    typeof result === 'object' &&
    (result as any).$$typeof === REACT_ELEMENT_TYPE
  ) {
    (result as any)._store.validated = 1;
  }
  const resolvedModel = renderModelDestructive(request, task, result);
  renderedModels.set(
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
  if (typeof type === 'function' && !isClientReference(type)) {
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
      element.props.children,
    );
    renderedModels.set(
      element,
      resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
    );
    task.implicitSlot = prevImplicitSlot;
    return resolvedModel;
  }
  if (
    typeof type !== 'string' &&
    typeof type !== 'symbol' &&
    !isClientReference(type)
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
  const task: Task = {
    model,
    promise: createResultModel<ReactClientValue>(),
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
    scheduleMicrotask(() => performWork(request));
  }
}

function outlineModelWithFormatContext(
  request: Request,
  value: ReactClientValue,
  formatContext: FormatContext,
): ReactClientValue {
  const newTask = createTask(request, value, null, false, formatContext);
  retryTask(request, newTask);
  if (newTask.status !== COMPLETED) {
    if (newTask.status === PENDING) {
      const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
      if (value !== null && typeof value === 'object') {
        request.modelEntries.set(value, lazy);
      }
      return lazy;
    }
    throw newTask.promise.reason;
  }
  const model = newTask.model;
  if (value !== null && typeof value === 'object') {
    request.modelEntries.set(
      value,
      model === undefined ? UNDEFINED_MODEL : model,
    );
  }
  return model;
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
  rejectResultModel(task.promise, error);
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
  request.status = CLOSED;
  request.abortableTasks.forEach(task => {
    task.status = ERRORED;
    rejectResultModel(task.promise, error);
  });
  request.abortableTasks.clear();
  request.pingedTasks = [];
  closeHints(request.result);
  completeResult(request.result);
  request.cacheController.abort(error);
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
  getRenderedModels(request, value, task.keyPath, task.implicitSlot).set(
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
  task.isModelReference = true;
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
    request.modelEntries.set(children, copy);
    task.model = children;
    resolvedModel = copy;
  }
  renderedModels.set(element, resolvedModel);
  task.keyPath = null;
  task.implicitSlot = false;
  task.isModelReference = false;
  return resolvedModel;
}

function renderModelDestructive(
  request: Request,
  task: Task,
  value: ReactClientValue,
): ReactClientValue {
  task.model = value;
  task.isModelReference = false;
  if (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    isClientReference(value)
  ) {
    task.isModelReference = true;
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const existingModel = getRenderedModels(
      request,
      value,
      task.keyPath,
      task.implicitSlot,
    ).get(value);
    if (
      existingModel !== undefined &&
      existingModel !== task.promise &&
      !(
        existingModel !== null &&
        typeof existingModel === 'object' &&
        (existingModel as any).$$typeof === REACT_LAZY_TYPE &&
        (existingModel as any)._payload === task.promise
      )
    ) {
      task.isModelReference = true;
      return existingModel === UNDEFINED_MODEL ? undefined : existingModel;
    }
  }
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function') {
      throw new Error('Not implemented.');
    }
    if (typeof value === 'symbol') {
      validateSymbol(value);
    }
    return value;
  }
  if ((value as any).$$typeof === REACT_ELEMENT_TYPE) {
    const element: ReactElement = value as any;
    return renderElement(request, task, element.type, element);
  }
  if ((value as any).$$typeof === REACT_LAZY_TYPE) {
    const lazy: LazyComponent<ReactClientValue, any> = value as any;
    return renderModelDestructive(request, task, lazy._init(lazy._payload));
  }
  if (typeof (value as any).then === 'function') {
    return renderThenable(request, task, value);
  }
  if (isArray(value)) {
    return renderFragment(request, task, value);
  }
  if (Object.getPrototypeOf(value) !== ObjectPrototype) {
    throw new Error('Not implemented.');
  }
  return {};
}

function resolveModel(
  request: Request,
  task: Task,
  value: ReactClientValue,
): ReactClientValue {
  const rendered = renderModel(request, task, value);
  if (
    task.isModelReference ||
    rendered === null ||
    typeof rendered !== 'object'
  ) {
    return rendered;
  }
  return resolveModelFields(request, task, rendered);
}

function renderModel(
  request: Request,
  task: Task,
  value: ReactClientValue,
): ReactClientValue {
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  try {
    return renderModelDestructive(request, task, value);
  } catch (thrownValue) {
    const error =
      thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
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
      getRenderedModels(request, model, task.keyPath, task.implicitSlot).set(
        model,
        lazy,
      );
      if (
        value !== model &&
        value !== null &&
        typeof value === 'object' &&
        (value as any).$$typeof === REACT_ELEMENT_TYPE
      ) {
        getRenderedModels(request, value, prevKeyPath, prevImplicitSlot).set(
          value,
          lazy,
        );
      }
      if (
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
      task.keyPath = prevKeyPath;
      task.implicitSlot = prevImplicitSlot;
      task.isModelReference = true;
      return lazy;
    }
    throw error;
  }
}

function resolveModelFields(
  request: Request,
  task: Task,
  rendered: ReactClientValue,
): ReactClientValue {
  const model = task.model;
  task.keyPath = null;
  task.implicitSlot = false;
  if ((rendered as any).$$typeof === REACT_ELEMENT_TYPE) {
    const element: ReactElement = rendered as any;
    element.props = resolveModel(request, task, element.props);
    return element;
  }
  if (isArray(rendered)) {
    const children: Array<ReactClientValue> = model as any;
    const copy: Array<ReactClientValue> = rendered as any;
    for (let i = 0; i < children.length; i++) {
      if (i in children) {
        copy[i] = resolveModel(request, task, children[i]);
      }
    }
    copy.length = children.length;
    return copy;
  }
  const object: ReactClientObject = model as any;
  const copy: {[key: string]: ReactClientValue} = rendered as any;
  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      const child = resolveModel(request, task, object[key]);
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
  return copy;
}

function retryTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  task.status = RENDERING;
  const originalModel = task.model;
  const originalKeyPath = task.keyPath;
  const originalImplicitSlot = task.implicitSlot;
  try {
    const model = task.model;
    const rendered = renderModelDestructive(request, task, model);
    const resolvedModel =
      task.isModelReference || rendered === null || typeof rendered !== 'object'
        ? rendered
        : resolveModelFields(request, task, rendered);
    if (request.status === CLOSED) {
      return;
    }
    task.model = resolvedModel;
    if (originalModel !== null && typeof originalModel === 'object') {
      const renderedModels = getRenderedModels(
        request,
        originalModel,
        originalKeyPath,
        originalImplicitSlot,
      );
      const existing = renderedModels.get(originalModel);
      if (
        existing !== null &&
        typeof existing === 'object' &&
        (existing as any).$$typeof === REACT_LAZY_TYPE &&
        (existing as any)._payload === task.promise
      ) {
        renderedModels.set(
          originalModel,
          resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
        );
      }
    }
    task.status = COMPLETED;
    request.abortableTasks.delete(task);
    fulfillResultModel(task.promise, resolvedModel);
  } catch (thrownValue) {
    if (request.status === CLOSED) {
      return;
    }
    const error =
      thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
    if (
      error != null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      task.status = PENDING;
      task.thenableState = getThenableStateAfterSuspending();
      const ping = task.ping;
      (error as any).then(ping, ping);
      return;
    }
    erroredTask(request, task, error);
  }
}

function getRenderedModels(
  request: Request,
  value: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
): WeakMap<Object, ReactClientValue> {
  if (
    keyPath !== null &&
    value !== null &&
    typeof value === 'object' &&
    ((value as any).$$typeof === REACT_ELEMENT_TYPE ||
      typeof (value as any).then === 'function' ||
      isArray(value))
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
      request.modelEntries.set(wrappedChildren, copy);
      task.model = wrappedChildren;
      resolvedModel = copy;
    } else {
      resolvedModel = fragment;
    }
    getRenderedModels(request, children, keyPath, task.implicitSlot).set(
      children,
      resolvedModel,
    );
  } else {
    const copy: Array<ReactClientValue> = new Array(children.length);
    request.modelEntries.set(children, copy);
    task.model = children;
    resolvedModel = copy;
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
      request.cacheController.abort(
        new Error(
          'This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.',
        ),
      );
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
}
