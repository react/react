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
} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {
  Hints,
  HintCode,
  HintModel,
  FormatContext,
} from './ReactFlightResultServerConfig';

import {REACT_ELEMENT_TYPE, REACT_LAZY_TYPE} from 'shared/ReactSymbols';
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
};
export type Request = {
  result: Result<ReactClientValue>,
  pingedTasks: Array<Task>,
  hints: Hints,
  cache: Map<Function, mixed>,
  cacheController: AbortController,
  modelEntries: WeakMap<Object, ReactClientValue>,
  abortableTasks: Set<Task>,
  identifierPrefix: string,
  identifierCount: number,
};

function RequestInstance(this: any, model: ReactClientValue) {
  if (
    ReactSharedInternals.A !== null &&
    ReactSharedInternals.A !== DefaultAsyncDispatcher
  ) {
    throw new Error(
      'Currently React only supports one RSC renderer at a time.',
    );
  }
  ReactSharedInternals.A = DefaultAsyncDispatcher;
  this.hints = createHints();
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.modelEntries = new WeakMap();
  this.abortableTasks = new Set();
  this.identifierPrefix = '';
  this.identifierCount = 1;
  const rootTask = createTask(this, model, createRootFormatContext());
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

export function createRequest(model: ReactClientValue): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(model);
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
  const prevThenableState = task.thenableState;
  task.thenableState = null;
  prepareToUseHooksForComponent(prevThenableState, null);
  const result = Component(props, undefined);
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
    request.modelEntries.set(element, resolvedModel);
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
  return renderModelDestructive(request, task, result);
}

function renderElement(
  request: Request,
  task: Task,
  type: any,
  element: ReactElement,
): ReactClientValue {
  if (element.key !== null || element.props.ref != null) {
    throw new Error('Not implemented.');
  }
  if (typeof type === 'function' && !isClientReference(type)) {
    return renderFunctionComponent(request, task, type, element.props, element);
  }
  if (typeof type !== 'string' && !isClientReference(type)) {
    throw new Error('Not implemented.');
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

function createTask(
  request: Request,
  model: ReactClientValue,
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
  };
  request.abortableTasks.add(task);
  return task;
}

function pingTask(request: Request, task: Task): void {
  if (task.status !== PENDING) {
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
  const newTask = createTask(request, value, formatContext);
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
  request.abortableTasks.delete(task);
  rejectResultModel(task.promise, error);
}

function renderThenable(
  request: Request,
  task: Task,
  value: ReactClientValue,
): ReactClientValue {
  const thenable: Thenable<ReactClientValue> = value as any;
  const newTask = createTask(request, value, task.formatContext);
  request.modelEntries.set(thenable, newTask.promise);
  switch (thenable.status) {
    case 'fulfilled':
      newTask.model = thenable.value;
      pingTask(request, newTask);
      break;
    case 'rejected':
      erroredTask(request, newTask, thenable.reason);
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
            erroredTask(request, newTask, reason);
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
  let resolvedElement: ReactElement;
  if (__DEV__) {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key: element.key,
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
      key: element.key,
      ref: null,
      props: element.props,
    } as any;
  }
  return resolvedElement;
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
    const existingModel = request.modelEntries.get(value);
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
    if (typeof value === 'function' || typeof value === 'symbol') {
      throw new Error('Not implemented.');
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
    return [];
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
        (model as any).$$typeof === REACT_LAZY_TYPE) &&
      error != null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      const newTask = createTask(request, model, task.formatContext);
      const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
      request.modelEntries.set(model, lazy);
      if (
        value !== model &&
        value !== null &&
        typeof value === 'object' &&
        (value as any).$$typeof === REACT_ELEMENT_TYPE
      ) {
        request.modelEntries.set(value, lazy);
      }
      newTask.thenableState = getThenableStateAfterSuspending();
      const ping = newTask.ping;
      (error as any).then(ping, ping);
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
  if (task.status !== PENDING) {
    return;
  }
  task.status = RENDERING;
  const originalModel = task.model;
  try {
    const model = task.model;
    const rendered = renderModelDestructive(request, task, model);
    const resolvedModel =
      task.isModelReference || rendered === null || typeof rendered !== 'object'
        ? rendered
        : resolveModelFields(request, task, rendered);
    task.model = resolvedModel;
    if (originalModel !== null && typeof originalModel === 'object') {
      const existing = request.modelEntries.get(originalModel);
      if (
        existing !== null &&
        typeof existing === 'object' &&
        (existing as any).$$typeof === REACT_LAZY_TYPE &&
        (existing as any)._payload === task.promise
      ) {
        request.modelEntries.set(
          originalModel,
          resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
        );
      }
    }
    task.status = COMPLETED;
    request.abortableTasks.delete(task);
    fulfillResultModel(task.promise, resolvedModel);
  } catch (thrownValue) {
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

function performWork(request: Request): void {
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
  } finally {
    if (request.abortableTasks.size === 0) {
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
