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

export function createFromResult<T>(
  result: Result<T>,
  options?: Options,
): Thenable<T> {
  // The edge runtime exposes AsyncLocalStorage as a global, when at all.
  // snapshot is missing from Flow's definition of it.
  const snapshot: void | (() => <R>(callback: () => R) => R) =
    typeof AsyncLocalStorage === 'function'
      ? (AsyncLocalStorage as any).snapshot
      : undefined;
  return createFromResultImpl(
    result,
    options,
    typeof snapshot === 'function' ? snapshot() : null,
  );
}
