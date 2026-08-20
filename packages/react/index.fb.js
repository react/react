/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {captureOwnerStack as captureOwnerStackImpl} from './src/ReactClient';

export {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  __COMPILER_RUNTIME,
  act,
  cache,
  cacheSignal,
  Children,
  cloneElement,
  Component,
  createContext,
  createElement,
  createRef,
  useEffectEvent as experimental_useEffectEvent,
  useEffectEvent,
  forwardRef,
  Fragment,
  isValidElement,
  lazy,
  memo,
  Profiler,
  PureComponent,
  startTransition,
  StrictMode,
  Suspense,
  Activity,
  Activity as unstable_Activity,
  unstable_getCacheForType,
  unstable_LegacyHidden,
  unstable_Scope,
  unstable_SuspenseList,
  ViewTransition,
  ViewTransition as unstable_ViewTransition,
  unstable_TracingMarker,
  addTransitionType,
  addTransitionType as unstable_addTransitionType,
  unstable_useCacheRefresh,
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
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
  version,
} from './src/ReactClient';

export {jsx, jsxs, jsxDEV} from './src/jsx/ReactJSX';

// export for backwards compatibility during upgrade
export {useMemoCache as unstable_useMemoCache} from './src/ReactHooks';

// export to match the name of the OSS function typically exported from
// react/compiler-runtime
export {useMemoCache as c} from './src/ReactHooks';

// Only export captureOwnerStack in development.
let captureOwnerStack: ?() => null | string;
if (__DEV__) {
  captureOwnerStack = captureOwnerStackImpl;
}

export {captureOwnerStack};
