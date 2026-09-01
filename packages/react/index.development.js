/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Keep in sync with https://github.com/facebook/flow/blob/main/lib/react.js
export type ElementType = React$ElementType;
export type Element<+C> = React$Element<C>;
export type Key = React$Key;
export type Node = React$Node;
// eslint-disable-next-line no-undef
export type Context<T> = React.Context<T>;
export type Portal = React$Portal;
export type ElementProps<C> = React$ElementConfig<C>;
export type ElementConfig<C> = React$ElementConfig<C>;
// eslint-disable-next-line no-undef
export type ElementRef<C> = React.ElementRef<C>;
export type ChildrenArray<+T> = $ReadOnlyArray<ChildrenArray<T>> | T;

// Export all exports so that they're available in tests.
// We can't use export * from in Flow for some reason.
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
  unstable_LegacyHidden,
  Activity,
  ViewTransition,
  addTransitionType,
  unstable_Scope,
  unstable_SuspenseList,
  unstable_TracingMarker,
  unstable_getCacheForType,
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
  useSyncExternalStore,
  useReducer,
  useRef,
  useState,
  useTransition,
  useActionState,
  version,
  act, // DEV-only
  captureOwnerStack, // DEV-only
} from './src/ReactClient';
