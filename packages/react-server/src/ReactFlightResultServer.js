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
import type {
  Hints,
  HintCode,
  HintModel,
  FormatContext,
} from './ReactFlightResultServerConfig';

import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';
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
import {
  createHints,
  createRootFormatContext,
  getChildFormatContext,
} from './ReactFlightResultServerConfig';
import {resolveCache, setCurrentCache} from './flight/ReactFlightCurrentCache';
import {isClientReference} from './ReactFlightServerConfig';

const UNDEFINED_MODEL = Symbol();
const PENDING = 0;
const COMPLETED = 1;
const ERRORED = 4;

export type ReactClientValue =
  | ReactElement
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
  status: 0 | 1 | 4,
  formatContext: FormatContext,
  isModelReference: boolean,
};
export type Request = {
  result: Result<ReactClientValue>,
  pingedTasks: Array<Task>,
  hints: Hints,
  cache: Map<Function, mixed>,
  cacheController: AbortController,
  modelEntries: WeakMap<Object, ReactClientValue>,
};

function RequestInstance(this: any, model: ReactClientValue) {
  this.hints = createHints();
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.modelEntries = new WeakMap();
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
): ReactClientValue {
  const result = Component(props, undefined);
  if (
    __DEV__ &&
    result !== null &&
    typeof result === 'object' &&
    (result as any).$$typeof === REACT_ELEMENT_TYPE
  ) {
    const element: ReactElement = result as any;
    element._store.validated = 1;
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
    return renderFunctionComponent(request, task, type, element.props);
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
  return {
    model,
    promise: createResultModel<ReactClientValue>(),
    status: PENDING,
    formatContext,
    isModelReference: false,
  };
}

function outlineModelWithFormatContext(
  request: Request,
  value: ReactClientValue,
  formatContext: FormatContext,
): ReactClientValue {
  const newTask = createTask(request, value, formatContext);
  retryTask(request, newTask);
  if (newTask.status !== COMPLETED) {
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
    if (existingModel !== undefined) {
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
  const rendered = renderModelDestructive(request, task, value);
  if (
    task.isModelReference ||
    rendered === null ||
    typeof rendered !== 'object'
  ) {
    return rendered;
  }
  return resolveModelFields(request, task, rendered);
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
  try {
    const resolvedModel = resolveModel(request, task, task.model);
    task.model = resolvedModel;
    task.status = COMPLETED;
    fulfillResultModel(task.promise, resolvedModel);
  } catch (error) {
    task.status = ERRORED;
    rejectResultModel(task.promise, error);
  }
}

function performWork(request: Request): void {
  const prevCache = setCurrentCache(request);
  try {
    const pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (let i = 0; i < pingedTasks.length; i++) {
      retryTask(request, pingedTasks[i]);
    }
  } finally {
    closeHints(request.result);
    completeResult(request.result);
    setCurrentCache(prevCache);
  }
}

export function startWork(request: Request): void {
  scheduleMicrotask(() => performWork(request));
}
