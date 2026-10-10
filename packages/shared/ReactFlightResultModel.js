/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import noop from './noop';
import type {ReactDebugInfo, ReactDebugInfoEntry} from './ReactTypes';

const RESULT_MODEL_TYPE = Symbol.for('react.result.model');
type Outcome<T> = {+value: T};

export opaque type ResultModel<T>: Promise<T> & {
  +status: 'pending' | 'pending_weak' | 'fulfilled' | 'rejected',
  +value: void | T,
  +reason: mixed,
  _debugInfo: ReactDebugInfo, // DEV-only
  ...
} = Promise<T> & {
  _promise: Promise<Outcome<T>>,
  _resolve: (Outcome<T>) => void,
  _reject: mixed => void,
  status: 'pending' | 'pending_weak' | 'fulfilled' | 'rejected',
  value: void | T,
  reason: mixed,
  _debugInfo: ReactDebugInfo, // DEV-only
  _debugModel?: T, // DEV-only
  _debugListeners?: Set<(ReactDebugInfoEntry) => void>, // DEV-only
};

function ReactPromise(this: any, weak: boolean) {
  this.$$typeof = RESULT_MODEL_TYPE;
  this.status = weak ? 'pending_weak' : 'pending';
  this.value = undefined;
  this.reason = undefined;
  this._promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });
  this._promise.catch(noop);
}
ReactPromise.prototype = Object.create(Promise.prototype) as any;
function reactPromiseThen<T>(
  this: ResultModel<T>,
  resolve: void | null | (T => mixed),
  reject: void | null | (mixed => mixed),
): Promise<mixed> {
  return this._promise.then(
    outcome =>
      typeof resolve === 'function' ? resolve(outcome.value) : outcome.value,
    reject,
  );
}
Object.defineProperty(ReactPromise.prototype, 'then', {
  writable: true,
  enumerable: true,
  configurable: true,
  value: reactPromiseThen,
});

export function createResultModel<T>(weak: boolean = false): ResultModel<T> {
  return new (ReactPromise as any)(weak);
}

export function fulfillResultModel<T>(model: ResultModel<T>, value: T): void {
  if (model.status !== 'pending' && model.status !== 'pending_weak') {
    return;
  }
  model.status = 'fulfilled';
  model.value = value;
  model._resolve({value});
}

export function rejectResultModel<T>(
  model: ResultModel<T>,
  error: mixed,
): void {
  if (model.status !== 'pending' && model.status !== 'pending_weak') {
    return;
  }
  model.status = 'rejected';
  model.reason = error;
  model._reject(error);
}

export function getResultModelStatus(
  value: Object,
): null | 'pending' | 'pending_weak' | 'fulfilled' | 'rejected' {
  return value.$$typeof === RESULT_MODEL_TYPE ? value.status : null;
}

export function setDebugModel<T>(model: ResultModel<T>, value: T): void {
  if (__DEV__) {
    model._debugModel = value;
  }
}

export function getDebugModel<T>(model: ResultModel<T>): void | T {
  if (__DEV__) {
    return model._debugModel;
  }
}

export function pushDebugInfo<T>(
  model: ResultModel<T>,
  info: ReactDebugInfoEntry,
): void {
  if (__DEV__) {
    model._debugInfo.push(info);
    const listeners = model._debugListeners;
    if (listeners !== undefined) {
      listeners.forEach(listener => listener(info));
    }
  }
}

export function subscribeToDebugInfo<T>(
  model: ResultModel<T>,
  listener: ReactDebugInfoEntry => void,
): () => void {
  if (__DEV__) {
    const info = model._debugInfo;
    if (info !== undefined) {
      for (let i = 0; i < info.length; i++) {
        listener(info[i]);
      }
    }
    let listeners = model._debugListeners;
    if (listeners === undefined) {
      model._debugListeners = listeners = new Set();
    }
    const subscriptions = listeners;
    subscriptions.add(listener);
    return () => {
      subscriptions.delete(listener);
    };
  }
  return noop;
}
