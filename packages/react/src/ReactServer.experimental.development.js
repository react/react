/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {default as __SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE} from './ReactSharedInternalsServer';

import {forEach, map, count, toArray, only} from './ReactChildren';
import {
  REACT_FRAGMENT_TYPE,
  REACT_PROFILER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
  REACT_ACTIVITY_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';
import {
  cloneElement,
  createElement,
  isValidElement,
} from './jsx/ReactJSXElement';
import {createRef} from './ReactCreateRef';
import {
  use,
  useId,
  useCallback,
  useDebugValue,
  useMemo,
  getCacheForType,
} from './ReactHooks';
import {forwardRef} from './ReactForwardRef';
import {lazy} from './ReactLazy';
import {memo} from './ReactMemo';
import {cache, cacheSignal} from './ReactCacheServer';
import {startTransition} from './ReactStartTransition';
import {captureOwnerStack} from './ReactOwnerStack';
import version from 'shared/ReactVersion';

const Children = {
  map,
  forEach,
  count,
  toArray,
  only,
};

// These are server-only
export {
  taintUniqueValue as experimental_taintUniqueValue,
  taintObjectReference as experimental_taintObjectReference,
} from './ReactTaint';

export {
  Children,
  REACT_ACTIVITY_TYPE as Activity,
  REACT_FRAGMENT_TYPE as Fragment,
  REACT_PROFILER_TYPE as Profiler,
  REACT_STRICT_MODE_TYPE as StrictMode,
  REACT_SUSPENSE_TYPE as Suspense,
  REACT_VIEW_TRANSITION_TYPE as ViewTransition,
  cloneElement,
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
  getCacheForType as unstable_getCacheForType,
  useId,
  useCallback,
  useDebugValue,
  useMemo,
  version,
  // Experimental
  REACT_SUSPENSE_LIST_TYPE as unstable_SuspenseList,
  // enableOptimisticKey
  REACT_OPTIMISTIC_KEY as optimisticKey,
  captureOwnerStack, // DEV-only
};
