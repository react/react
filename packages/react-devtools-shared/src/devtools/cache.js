/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactContext,
  Thenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';

import * as React from 'react';
import {createContext} from 'react';

// TODO (cache) Remove this cache; it is outdated and will not work with newer APIs like startTransition.

// Cache implementation was forked from the React repo:
// https://github.com/facebook/react/blob/main/packages/react-cache/src/ReactCacheOld.js
//
// This cache is simpler than react-cache in that:
// 1. Individual items don't need to be invalidated.
//    Profiling data is invalidated as a whole.
// 2. We didn't need the added overhead of an LRU cache.
//    The size of this cache is bounded by how many renders were profiled,
//    and it will be fully reset between profiling sessions.

export type {Thenable};

export type Resource<Input, Key, Value> = {
  clear(): void,
  invalidate(Key): void,
  read(Input): Value,
  preload(Input): void,
  write(Key, Value): void,
};

let readContext;
if (typeof React.use === 'function') {
  readContext = function (Context: ReactContext<null>) {
    // eslint-disable-next-line react-hooks-published/rules-of-hooks
    return React.use(Context);
  };
} else if (
  typeof (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ===
  'object'
) {
  const ReactCurrentDispatcher = (React as any)
    .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
  readContext = function (Context: ReactContext<null>) {
    const dispatcher = ReactCurrentDispatcher.current;
    if (dispatcher === null) {
      throw new Error(
        'react-cache: read and preload may only be called from within a ' +
          "component's render. They are not supported in event handlers or " +
          'lifecycle methods.',
      );
    }
    return dispatcher.readContext(Context);
  };
} else {
  throw new Error('react-cache: Unsupported React version');
}

const CacheContext = createContext(null);

type Config = {useWeakMap?: boolean, ...};

const entries: Map<
  Resource<any, any, any>,
  Map<any, any> | WeakMap<any, any>,
> = new Map();
const resourceConfigs: Map<Resource<any, any, any>, Config> = new Map();

function getEntriesForResource(
  resource: any,
): Map<any, any> | WeakMap<any, any> {
  let entriesForResource: Map<any, any> | WeakMap<any, any> = entries.get(
    resource,
  ) as any as Map<any, any>;
  if (entriesForResource === undefined) {
    const config = resourceConfigs.get(resource);
    entriesForResource =
      config !== undefined && config.useWeakMap ? new WeakMap() : new Map();
    entries.set(resource, entriesForResource);
  }
  return entriesForResource;
}

function accessResult<Input, Key, Value>(
  resource: any,
  fetch: Input => Thenable<Value>,
  input: Input,
  key: Key,
): Thenable<Value> {
  const entriesForResource = getEntriesForResource(resource);
  const entry = entriesForResource.get(key);
  if (entry === undefined) {
    const thenable = fetch(input);
    thenable.then(
      value => {
        const fulfilledThenable: FulfilledThenable<Value> = thenable as any;
        fulfilledThenable.status = 'fulfilled';
        fulfilledThenable.value = value;
      },
      error => {
        const rejectedThenable: RejectedThenable<Value> = thenable as any;
        rejectedThenable.status = 'rejected';
        rejectedThenable.reason = error;
      },
    );
    entriesForResource.set(key, thenable);
    return thenable;
  } else {
    return entry;
  }
}

export function createResource<Input, Key, Value>(
  fetch: Input => Thenable<Value>,
  hashInput: Input => Key,
  config?: Config = {},
): Resource<Input, Key, Value> {
  const resource = {
    clear(): void {
      entries.delete(resource);
    },

    invalidate(key: Key): void {
      const entriesForResource = getEntriesForResource(resource);
      entriesForResource.delete(key);
    },

    read(input: Input): Value {
      // Prevent access outside of render.
      readContext(CacheContext);

      const key = hashInput(input);
      const result: Thenable<Value> = accessResult(resource, fetch, input, key);
      if (typeof React.use === 'function') {
        // eslint-disable-next-line react-hooks-published/rules-of-hooks
        return React.use(result);
      }

      switch (result.status) {
        case 'fulfilled': {
          const value = result.value;
          return value;
        }
        case 'rejected': {
          const error = result.reason;
          throw error;
        }
        default:
          throw result;
      }
    },

    preload(input: Input): void {
      // Prevent access outside of render.
      readContext(CacheContext);

      const key = hashInput(input);
      accessResult(resource, fetch, input, key);
    },

    write(key: Key, value: Value): void {
      const entriesForResource = getEntriesForResource(resource);

      const fulfilledThenable: FulfilledThenable<Value> = Promise.resolve(
        value,
      ) as any;
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = value;

      entriesForResource.set(key, fulfilledThenable);
    },
  };

  resourceConfigs.set(resource, config);

  return resource;
}

export function invalidateResources(): void {
  entries.clear();
}
