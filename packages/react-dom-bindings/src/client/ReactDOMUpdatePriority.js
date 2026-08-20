/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {EventPriority} from 'react-reconciler/src/ReactEventPriorities';

import {getEventPriority} from '../events/ReactDOMEventListener';
import {
  NoEventPriority,
  DefaultEventPriority,
} from 'react-reconciler/src/ReactEventPriorities';

import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';

export function setCurrentUpdatePriority(
  newPriority: EventPriority,
  // Closure will consistently not inline this function when it has arity 1
  // however when it has arity 2 even if the second arg is omitted at every
  // callsite it seems to inline it even when the internal length of the function
  // is much longer. I hope this is consistent enough to rely on across builds
  IntentionallyUnusedArgument?: empty,
): void {
  ReactDOMSharedInternals.p /* currentUpdatePriority */ = newPriority;
}

export function getCurrentUpdatePriority(): EventPriority {
  return ReactDOMSharedInternals.p; /* currentUpdatePriority */
}

export function resolveUpdatePriority(): EventPriority {
  const updatePriority = ReactDOMSharedInternals.p; /* currentUpdatePriority */
  if (updatePriority !== NoEventPriority) {
    return updatePriority;
  }
  const currentEvent = window.event;
  if (currentEvent === undefined) {
    return DefaultEventPriority;
  }
  return getEventPriority(currentEvent.type);
}

export function runWithPriority<T>(priority: EventPriority, fn: () => T): T {
  const previousPriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(priority);
    return fn();
  } finally {
    setCurrentUpdatePriority(previousPriority);
  }
}
