/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AsyncDispatcher} from 'react-reconciler/src/ReactInternalTypes';

import {resolveContext} from '../ReactFlightServer';
import {resolveOwner} from './ReactFlightCurrentOwner';

function resolveCache(): Map<Function, mixed> {
  const context = resolveContext();
  if (context) {
    return context.cache;
  }
  return new Map();
}

export const DefaultAsyncDispatcher: AsyncDispatcher = {
  getCacheForType<T>(resourceType: () => T): T {
    const cache = resolveCache();
    let entry: T | void = cache.get(resourceType) as any;
    if (entry === undefined) {
      entry = resourceType();
      // TODO: Warn if undefined?
      cache.set(resourceType, entry);
    }
    return entry;
  },
  cacheSignal(): null | AbortSignal {
    const context = resolveContext();
    if (context) {
      return context.cacheController.signal;
    }
    return null;
  },
} as any;

if (__DEV__) {
  DefaultAsyncDispatcher.getOwner = resolveOwner;
}
