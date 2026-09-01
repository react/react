/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactVersion from 'shared/ReactVersion';
import {
  REACT_FRAGMENT_TYPE,
  REACT_PROFILER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_ACTIVITY_TYPE,
  REACT_SCOPE_TYPE,
  REACT_TRACING_MARKER_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';

import {Component, PureComponent} from './ReactBaseClasses';
import {createRef} from './ReactCreateRef';
import {forEach, map, count, toArray, only} from './ReactChildren';
import {
  createElement,
  cloneElement,
  isValidElement,
} from './jsx/ReactJSXElement';
import {createContext} from './ReactContext';
import {lazy} from './ReactLazy';
import {forwardRef} from './ReactForwardRef';
import {memo} from './ReactMemo';
import {cache, cacheSignal} from './ReactCacheClient';
import {
  getCacheForType,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useDebugValue,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  useReducer,
  useRef,
  useState,
  useTransition,
  useDeferredValue,
  useId,
  useCacheRefresh,
  use,
  useOptimistic,
  useActionState,
} from './ReactHooks';
import ReactSharedInternals from './ReactSharedInternalsClient';
import {startTransition, startGestureTransition} from './ReactStartTransition';
import {addTransitionType} from './ReactTransitionType';
import {act} from './ReactAct';
import {captureOwnerStack} from './ReactOwnerStack';
import * as ReactCompilerRuntime from './ReactCompilerRuntime';

const Children = {
  map,
  forEach,
  count,
  toArray,
  only,
};

export {
  Children,
  createRef,
  Component,
  PureComponent,
  createContext,
  forwardRef,
  lazy,
  memo,
  cache,
  cacheSignal,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useDebugValue,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useActionState,
  useSyncExternalStore,
  useReducer,
  useRef,
  useState,
  REACT_FRAGMENT_TYPE as Fragment,
  REACT_PROFILER_TYPE as Profiler,
  REACT_STRICT_MODE_TYPE as StrictMode,
  REACT_SUSPENSE_TYPE as Suspense,
  createElement,
  cloneElement,
  isValidElement,
  ReactVersion as version,
  ReactSharedInternals as __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  ReactCompilerRuntime as __COMPILER_RUNTIME,
  // Concurrent Mode
  useTransition,
  startTransition,
  useDeferredValue,
  REACT_SUSPENSE_LIST_TYPE as unstable_SuspenseList,
  REACT_LEGACY_HIDDEN_TYPE as unstable_LegacyHidden,
  REACT_ACTIVITY_TYPE as Activity,
  getCacheForType as unstable_getCacheForType,
  useCacheRefresh as unstable_useCacheRefresh,
  use,
  // enableScopeAPI
  REACT_SCOPE_TYPE as unstable_Scope,
  // enableTransitionTracing
  REACT_TRACING_MARKER_TYPE as unstable_TracingMarker,
  // enableViewTransition
  REACT_VIEW_TRANSITION_TYPE as ViewTransition,
  addTransitionType as addTransitionType,
  // enableGestureTransition
  startGestureTransition as unstable_startGestureTransition,
  // enableOptimisticKey
  REACT_OPTIMISTIC_KEY as optimisticKey,
  // DEV-only
  useId,
  act,
  captureOwnerStack,
};
