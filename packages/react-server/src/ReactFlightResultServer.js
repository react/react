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

import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';
import {createResult, completeResult} from 'shared/ReactFlightResult';
import {
  createResultModel,
  fulfillResultModel,
  rejectResultModel,
} from 'shared/ReactFlightResultModel';
import {scheduleMicrotask} from './ReactServerStreamConfig';
import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';

export type ReactClientValue =
  | ReactElement
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
type Task = {model: ReactClientValue, promise: ResultModel<ReactClientValue>};
export type Request = {
  result: Result<ReactClientValue>,
  pingedTasks: Array<Task>,
};

function RequestInstance(this: any, model: ReactClientValue) {
  const root = createResultModel<ReactClientValue>();
  this.result = createResult(root, () => {
    throw new Error('Not implemented.');
  });
  this.pingedTasks = [{model, promise: root}];
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
  if (typeof type === 'function') {
    if (type.$$typeof !== undefined) {
      throw new Error('Not implemented.');
    }
    return renderFunctionComponent(request, task, type, element.props);
  }
  if (typeof type !== 'string') {
    throw new Error('Not implemented.');
  }
  return renderClientElement(request, task, type, element);
}

function renderClientElement(
  request: Request,
  task: Task,
  type: string,
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
  if (rendered === null || typeof rendered !== 'object') {
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
    fulfillResultModel(task.promise, resolvedModel);
  } catch (error) {
    rejectResultModel(task.promise, error);
  }
}

function performWork(request: Request): void {
  const pingedTasks = request.pingedTasks;
  request.pingedTasks = [];
  for (let i = 0; i < pingedTasks.length; i++) {
    retryTask(request, pingedTasks[i]);
  }
  completeResult(request.result);
}

export function startWork(request: Request): void {
  scheduleMicrotask(() => performWork(request));
}
