/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Thenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';
import type {Lane} from './ReactFiberLane';
import type {Transition} from 'react/src/ReactStartTransition';

import {
  requestTransitionLane,
  ensureScheduleIsScheduled,
} from './ReactFiberRootScheduler';
import {NoLane} from './ReactFiberLane';
import {
  hasScheduledTransitionWork,
  clearAsyncTransitionTimer,
} from './ReactProfilerTimer';
import {
  enableComponentPerformanceTrack,
  enableProfilerTimer,
  enableDefaultTransitionIndicator,
} from 'shared/ReactFeatureFlags';
import {clearEntangledAsyncTransitionTypes} from './ReactFiberTransitionTypes';

import noop from 'shared/noop';
import reportGlobalError from 'shared/reportGlobalError';

// If there are multiple, concurrent async actions, they are entangled. All
// transition updates that occur while the async action is still in progress
// are treated as part of the action.
//
// The ideal behavior would be to treat each async function as an independent
// action. However, without a mechanism like AsyncContext, we can't tell which
// action an update corresponds to. So instead, we entangle them all into one.

// The listeners to notify once the entangled scope completes.
let currentEntangledListeners: Array<() => mixed> | null = null;
// The number of pending async actions in the entangled scope.
let currentEntangledPendingCount: number = 0;
// The transition lane shared by all updates in the entangled scope.
let currentEntangledLane: Lane = NoLane;
// A thenable that resolves when the entangled scope completes. It does not
// resolve to a particular value because it's only used for suspending the UI
// until the async action scope has completed.
let currentEntangledActionThenable: Thenable<void> | null = null;

// Track the default indicator for every root. undefined means we haven't
// had any roots registered yet. null means there's more than one callback.
// If there's more than one callback we bailout to not supporting isomorphic
// default indicators.
let isomorphicDefaultTransitionIndicator:
  | void
  | null
  | (() => void | (() => void)) = undefined;
// The clean up function for the currently running indicator.
let pendingIsomorphicIndicator: null | (() => void) = null;
// The number of roots that have pending Transitions that depend on the
// started isomorphic indicator.
let pendingEntangledRoots: number = 0;
let needsIsomorphicIndicator: boolean = false;

export function entangleAsyncAction<S>(
  transition: Transition,
  thenable: Thenable<S>,
): Thenable<S> {
  // `thenable` is the return value of the async action scope function. Create
  // a combined thenable that resolves once every entangled scope function
  // has finished.
  if (currentEntangledListeners === null) {
    // There's no outer async action scope. Create a new one.
    const entangledListeners = (currentEntangledListeners = []);
    currentEntangledPendingCount = 0;
    currentEntangledLane = requestTransitionLane(transition);
    const entangledThenable: Thenable<void> = {
      status: 'pending',
      value: undefined,
      then(resolve: void => mixed) {
        entangledListeners.push(resolve);
      },
    };
    currentEntangledActionThenable = entangledThenable;
    if (enableDefaultTransitionIndicator) {
      needsIsomorphicIndicator = true;
      // We'll check if we need a default indicator in a microtask. Ensure
      // we have this scheduled even if no root is scheduled.
      ensureScheduleIsScheduled();
    }
  }
  currentEntangledPendingCount++;
  thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
  return thenable;
}

function pingEngtangledActionScope() {
  if (--currentEntangledPendingCount === 0) {
    if (enableProfilerTimer && enableComponentPerformanceTrack) {
      if (!hasScheduledTransitionWork()) {
        // If we have received no updates since we started the entangled Actions
        // that means it didn't lead to a Transition being rendered. We need to
        // clear the timer so that if we start another entangled sequence we use
        // the next start timer instead of appearing like we were blocked the
        // whole time. We currently don't log a track for Actions that don't
        // render a Transition.
        clearAsyncTransitionTimer();
      }
    }
    clearEntangledAsyncTransitionTypes();
    if (pendingEntangledRoots === 0) {
      stopIsomorphicDefaultIndicator();
    }
    if (currentEntangledListeners !== null) {
      // All the actions have finished. Close the entangled async action scope
      // and notify all the listeners.
      if (currentEntangledActionThenable !== null) {
        const fulfilledThenable: FulfilledThenable<void> =
          currentEntangledActionThenable as any;
        fulfilledThenable.status = 'fulfilled';
      }
      const listeners = currentEntangledListeners;
      currentEntangledListeners = null;
      currentEntangledLane = NoLane;
      currentEntangledActionThenable = null;
      needsIsomorphicIndicator = false;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        listener();
      }
    }
  }
}

export function chainThenableValue<T>(
  thenable: Thenable<T>,
  result: T,
): Thenable<T> {
  // Equivalent to: Promise.resolve(thenable).then(() => result), except we can
  // cheat a bit since we know that that this thenable is only ever consumed
  // by React.
  //
  // We don't technically require promise support on the client yet, hence this
  // extra code.
  const listeners = [];
  const thenableWithOverride: Thenable<T> = {
    status: 'pending',
    value: null,
    reason: null,
    then(resolve: T => mixed) {
      listeners.push(resolve);
    },
  };
  thenable.then(
    (value: T) => {
      const fulfilledThenable: FulfilledThenable<T> =
        thenableWithOverride as any;
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = result;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        listener(result);
      }
    },
    error => {
      const rejectedThenable: RejectedThenable<T> = thenableWithOverride as any;
      rejectedThenable.status = 'rejected';
      rejectedThenable.reason = error;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        // This is a perf hack where we call the `onFulfill` ping function
        // instead of `onReject`, because we know that React is the only
        // consumer of these promises, and it passes the same listener to both.
        // We also know that it will read the error directly off the
        // `.reason` field.
        listener(undefined as any);
      }
    },
  );
  return thenableWithOverride;
}

export function peekEntangledActionLane(): Lane {
  return currentEntangledLane;
}

export function peekEntangledActionThenable(): Thenable<void> | null {
  return currentEntangledActionThenable;
}

export function registerDefaultIndicator(
  onDefaultTransitionIndicator: () => void | (() => void),
): void {
  if (!enableDefaultTransitionIndicator) {
    return;
  }
  if (isomorphicDefaultTransitionIndicator === undefined) {
    isomorphicDefaultTransitionIndicator = onDefaultTransitionIndicator;
  } else if (
    isomorphicDefaultTransitionIndicator !== onDefaultTransitionIndicator
  ) {
    isomorphicDefaultTransitionIndicator = null;
    // Stop any on-going indicator since it's now ambiguous.
    stopIsomorphicDefaultIndicator();
  }
}

export function startIsomorphicDefaultIndicatorIfNeeded() {
  if (!enableDefaultTransitionIndicator) {
    return;
  }
  if (!needsIsomorphicIndicator) {
    return;
  }
  if (
    isomorphicDefaultTransitionIndicator != null &&
    pendingIsomorphicIndicator === null
  ) {
    try {
      pendingIsomorphicIndicator =
        isomorphicDefaultTransitionIndicator() || noop;
    } catch (x) {
      pendingIsomorphicIndicator = noop;
      reportGlobalError(x);
    }
  }
}

function stopIsomorphicDefaultIndicator() {
  if (!enableDefaultTransitionIndicator) {
    return;
  }
  if (pendingIsomorphicIndicator !== null) {
    const cleanup = pendingIsomorphicIndicator;
    pendingIsomorphicIndicator = null;
    cleanup();
  }
}

function releaseIsomorphicIndicator() {
  if (--pendingEntangledRoots === 0) {
    stopIsomorphicDefaultIndicator();
  }
}

export function hasOngoingIsomorphicIndicator(): boolean {
  return pendingIsomorphicIndicator !== null;
}

export function retainIsomorphicIndicator(): () => void {
  pendingEntangledRoots++;
  return releaseIsomorphicIndicator;
}

export function markIsomorphicIndicatorHandled(): void {
  needsIsomorphicIndicator = false;
}
