/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  __COMPILER_RUNTIME,
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  createRef,
  use,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  cache,
  cacheSignal,
  startTransition,
  optimisticKey,
  Activity,
  unstable_getCacheForType,
  unstable_SuspenseList,
  ViewTransition,
  unstable_startGestureTransition,
  addTransitionType,
  unstable_useCacheRefresh,
  useId,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  useActionState,
  version,
  act, // DEV-only
  captureOwnerStack, // DEV-only
} from './src/ReactClient';

import {useOptimistic} from './src/ReactClient';

export function experimental_useOptimistic<S, A>(
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  if (__DEV__) {
    console.error(
      'useOptimistic is now in canary. Remove the experimental_ prefix. ' +
        'The prefixed alias will be removed in an upcoming release.',
    );
  }
  return useOptimistic(passthrough, reducer);
}
