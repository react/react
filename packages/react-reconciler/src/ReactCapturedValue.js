/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';

import {getStackByFiberInDevAndProd} from './ReactFiberComponentStack';

const CapturedStacks: WeakMap<any, CapturedValue<any>> = new WeakMap();

export type CapturedValue<+T> = {
  +value: T,
  source: Fiber | null,
  stack: string | null,
};

export function createCapturedValueAtFiber<T>(
  value: T,
  source: Fiber,
): CapturedValue<T> {
  // If the value is an error, call this function immediately after it is thrown
  // so the stack is accurate.
  // $FlowFixMe[invalid-compare]
  if (typeof value === 'object' && value !== null) {
    const existing = CapturedStacks.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const captured: CapturedValue<T> = {
      value,
      source,
      stack: getStackByFiberInDevAndProd(source),
    };
    CapturedStacks.set(value, captured);
    return captured;
  } else {
    return {
      value,
      source,
      stack: getStackByFiberInDevAndProd(source),
    };
  }
}

export function createCapturedValueFromError(
  value: Error,
  stack: null | string,
): CapturedValue<Error> {
  const captured: CapturedValue<Error> = {
    value,
    source: null,
    stack: stack,
  };
  if (typeof stack === 'string') {
    CapturedStacks.set(value, captured);
  }
  return captured;
}
