/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from './ReactFlightResultModel';
import noop from './noop';

export opaque type Result<T>: {abort(reason: mixed): void, ...} = {
  +root: ResultModel<T>,
  closed: boolean,
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
  result.closed = true;
  result.abortCallback = null;
}
