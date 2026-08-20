/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

/**
 * Replacement to React.createContext.
 *
 * Does not take any default value and avoids non-null assertions when using
 * the value of the context, like the following scenario.
 *
 * ```ts
 * const StoreDispatchContext = useContext<Dispatch<ReducerAction>>(null);
 * const dispatchStore = useContext(StoreDispatchContext);
 * ...
 * dipatchStore!({ ... });
 * ```
 *
 * Instead, it throws an error when `useContext` is not called within a
 * Provider with a value.
 */
export default function createContext<T>(): {
  useContext: () => NonNullable<T>;
  Provider: React.Provider<T | null>;
} {
  const context = React.createContext<T | null>(null);

  function useContext(): NonNullable<T> {
    const c = React.useContext(context);
    if (!c)
      throw new Error('useContext must be within a Provider with a value');
    return c;
  }

  return {useContext, Provider: context.Provider};
}
