/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from './ReactFlightResultModel';
import type {
  HintCode,
  HintModel,
} from 'react-server/src/ReactFlightResultServerConfig';
import noop from './noop';

export type Hint = {+code: HintCode, +model: HintModel<any>};
export type HintQueue = {
  completedHints: Array<Hint>,
  closed: boolean,
  wakeup: null | Promise<void>,
  resolve: () => void,
};

export opaque type Result<T>: {abort(reason: mixed): void, ...} = {
  +root: ResultModel<T>,
  closed: boolean,
  completionListeners: null | Set<() => void>,
  hintQueue: null | HintQueue,
  hintsClosed: boolean,
  abortCallback: null | (mixed => void),
  abort: (reason: mixed) => void,
};

function abortResult<T>(result: Result<T>, reason: mixed): void {
  const callback = result.abortCallback;
  if (callback !== null) {
    callback(reason);
  }
}

export function createResult<T>(
  root: ResultModel<T>,
  abort: (reason: mixed) => void,
): Result<T> {
  const result: Result<T> = {
    root,
    closed: false,
    completionListeners: null,
    hintQueue: null,
    hintsClosed: false,
    abortCallback: abort,
    abort: noop,
  };
  result.abort = abortResult.bind(null, result);
  return result;
}

export function getRoot<T>(result: Result<T>): ResultModel<T> {
  return result.root;
}

export function completeResult<T>(result: Result<T>): void {
  if (result.closed) {
    return;
  }
  result.closed = true;
  result.abortCallback = null;
  const listeners = result.completionListeners;
  result.completionListeners = null;
  if (listeners !== null) {
    listeners.forEach(listener => listener());
    listeners.clear();
  }
}

export function subscribeToResult<T>(
  result: Result<T>,
  listener: () => void,
): () => void {
  if (result.closed) {
    listener();
    return noop;
  }
  let listeners = result.completionListeners;
  if (listeners === null) {
    result.completionListeners = listeners = new Set();
  }
  listeners.add(listener);
  const subscriptions = listeners;
  return () => {
    subscriptions.delete(listener);
  };
}

export function getHintQueue<T>(result: Result<T>): HintQueue {
  let queue = result.hintQueue;
  if (queue === null) {
    result.hintQueue = queue = {
      completedHints: [],
      closed: result.hintsClosed,
      wakeup: null,
      resolve: noop,
    };
  }
  return queue;
}

function wakeHintQueue(queue: HintQueue): void {
  const resolve = queue.resolve;
  queue.wakeup = null;
  queue.resolve = noop;
  resolve();
}

export function pushHint<T, Code: HintCode>(
  result: Result<T>,
  code: Code,
  model: HintModel<Code>,
): void {
  if (result.hintsClosed) {
    return;
  }
  const queue = getHintQueue(result);
  queue.completedHints.push({code, model});
  wakeHintQueue(queue);
}

export function waitForHints(queue: HintQueue): Promise<void> {
  let wakeup = queue.wakeup;
  if (wakeup === null) {
    queue.wakeup = wakeup = new Promise(resolve => {
      queue.resolve = resolve;
    });
  }
  return wakeup;
}

export function closeHints<T>(result: Result<T>): void {
  result.hintsClosed = true;
  const queue = result.hintQueue;
  if (queue !== null) {
    queue.closed = true;
    wakeHintQueue(queue);
  }
}
