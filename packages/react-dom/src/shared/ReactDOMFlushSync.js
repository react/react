/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {disableLegacyMode} from 'shared/ReactFeatureFlags';
import {DiscreteEventPriority} from 'react-reconciler/src/ReactEventPriorities';

import ReactSharedInternals from 'shared/ReactSharedInternals';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

declare function flushSyncImpl<R>(fn: () => R): R;
declare function flushSyncImpl(void): void;
function flushSyncImpl<R>(fn: (() => R) | void): R | void {
  const previousTransition = ReactSharedInternals.T;
  const previousUpdatePriority =
    ReactDOMSharedInternals.p; /* ReactDOMCurrentUpdatePriority */

  try {
    ReactSharedInternals.T = null;
    ReactDOMSharedInternals.p /* ReactDOMCurrentUpdatePriority */ =
      DiscreteEventPriority;
    if (fn) {
      return fn();
    } else {
      return undefined;
    }
  } finally {
    ReactSharedInternals.T = previousTransition;
    ReactDOMSharedInternals.p /* ReactDOMCurrentUpdatePriority */ =
      previousUpdatePriority;
    const wasInRender =
      ReactDOMSharedInternals.d /* ReactDOMCurrentDispatcher */
        .f(); /* flushSyncWork */
    if (__DEV__) {
      if (wasInRender) {
        console.error(
          'flushSync was called from inside a lifecycle method. React cannot ' +
            'flush when React is already rendering. Consider moving this call to ' +
            'a scheduler task or micro task.',
        );
      }
    }
  }
}

declare function flushSyncErrorInBuildsThatSupportLegacyMode<R>(fn: () => R): R;
declare function flushSyncErrorInBuildsThatSupportLegacyMode(void): void;
function flushSyncErrorInBuildsThatSupportLegacyMode() {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(
    'Expected this build of React to not support legacy mode but it does. This is a bug in React.',
  );
}

export const flushSync: typeof flushSyncImpl = disableLegacyMode
  ? flushSyncImpl
  : flushSyncErrorInBuildsThatSupportLegacyMode;
