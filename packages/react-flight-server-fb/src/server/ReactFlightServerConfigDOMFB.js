/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Custom implementation of FlightServerConfigDOM.
// Resource hint dispatching is a no-op since we handle resource loading
// through our own runtime.

// We keep the same type definitions so the Flight server protocol is compatible.

// prettier-ignore
type TypeMap = {
  'D': string,
  'C': string | [string, string],
  'L': [string, string] | [string, string, any],
  'm': string | [string, any],
  'S': string | [string, string] | [string, string | 0, any],
  'X': string | [string, any],
  'M': string | [string, any],
}

export type HintCode = $Keys<TypeMap>;
export type HintModel<T: HintCode> = TypeMap[T];

export type Hints = Set<string>;

export function createHints(): Hints {
  return new Set();
}

export opaque type FormatContext = number;

export function createRootFormatContext(): FormatContext {
  return 0;
}

export function getChildFormatContext(
  parentContext: FormatContext,
  type: string,
  props: Object,
): FormatContext {
  return parentContext;
}
