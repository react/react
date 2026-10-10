/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {supportsRequestStorage, cacheStorage} from '../ReactFlightServerConfig';
import type {StackFrameFilter} from '../ReactFlightStackTraceContext';

export type CacheContext = {
  cache: Map<Function, mixed>,
  cacheController: AbortController,
  +filterStackFrame?: StackFrameFilter, // DEV-only
  ...
};

let currentCache: CacheContext | null = null;

export function setCurrentCache(
  cache: null | CacheContext,
): null | CacheContext {
  const previousCache = currentCache;
  currentCache = cache;
  return previousCache;
}

export function resolveCache(): null | CacheContext {
  if (currentCache) return currentCache;
  // $FlowFixMe[constant-condition]
  if (supportsRequestStorage) {
    const cache = cacheStorage.getStore();
    if (cache) return cache;
  }
  return null;
}
