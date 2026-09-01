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
  REACT_ACTIVITY_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_PROFILER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
} from 'shared/ReactSymbols';
import {
  cloneElement,
  createElement,
  isValidElement,
} from './jsx/ReactJSXElement';
import {createRef} from './ReactCreateRef';
import {use, useId, useCallback, useDebugValue, useMemo} from './ReactHooks';
import {forwardRef} from './ReactForwardRef';
import {lazy} from './ReactLazy';
import {memo} from './ReactMemo';
import {cache, cacheSignal} from './ReactCacheServer';
import version from 'shared/ReactVersion';
import {captureOwnerStack} from './ReactOwnerStack';

const Children = {
  map,
  forEach,
  count,
  toArray,
  only,
};

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
  useId,
  useCallback,
  useDebugValue,
  useMemo,
  version,
  captureOwnerStack, // DEV-only
};
