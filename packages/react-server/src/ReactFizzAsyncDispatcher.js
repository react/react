/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AsyncDispatcher} from 'react-reconciler/src/ReactInternalTypes';
import type {ComponentStackNode} from './ReactFizzComponentStack';

import {currentTaskInDEV} from './ReactFizzCurrentTask';

function getCacheForType<T>(resourceType: () => T): T {
  throw new Error('Not implemented.');
}

function cacheSignal(): null | AbortSignal {
  throw new Error('Not implemented.');
}

export const DefaultAsyncDispatcher: AsyncDispatcher = {
  getCacheForType,
  cacheSignal,
} as any;

if (__DEV__) {
  DefaultAsyncDispatcher.getOwner = (): ComponentStackNode | null => {
    if (currentTaskInDEV === null) {
      return null;
    }
    return currentTaskInDEV.componentStack;
  };
}
