/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes';
import type {Result} from 'shared/ReactFlightResult';
import type {Options} from './ReactFlightDOMResultClient';

import {createFromResult as createFromResultImpl} from './ReactFlightDOMResultClient';

import {AsyncLocalStorage} from 'async_hooks';

export function createFromResult<T>(
  result: Result<T>,
  options: Options,
): Thenable<T> {
  // snapshot is missing from Flow's definition of AsyncLocalStorage.
  const snapshot: void | (() => <R>(callback: () => R) => R) = (
    AsyncLocalStorage as any
  ).snapshot;
  return createFromResultImpl(
    result,
    options,
    typeof snapshot === 'function' ? snapshot() : null,
  );
}
