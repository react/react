/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FiberRoot} from './ReactInternalTypes';
import type {TransitionTypes} from 'react/src/ReactTransitionType';

import {enableViewTransition} from 'shared/ReactFeatureFlags';
import {includesTransitionLane} from './ReactFiberLane';

export function queueTransitionTypes(
  root: FiberRoot,
  transitionTypes: TransitionTypes,
): void {
  if (enableViewTransition) {
    // TODO: We should really store transitionTypes per lane in a LaneMap on
    // the root. Then merge it when we commit. We currently assume that all
    // Transitions are entangled.
    if (includesTransitionLane(root.pendingLanes)) {
      let queued = root.transitionTypes;
      if (queued === null) {
        queued = root.transitionTypes = [];
      }
      for (let i = 0; i < transitionTypes.length; i++) {
        const transitionType = transitionTypes[i];
        if (queued.indexOf(transitionType) === -1) {
          queued.push(transitionType);
        }
      }
    }
  }
}

// Store all types while we're entangled with an async Transition.
export let entangledTransitionTypes: null | TransitionTypes = null;

export function entangleAsyncTransitionTypes(
  transitionTypes: TransitionTypes,
): void {
  if (enableViewTransition) {
    let queued = entangledTransitionTypes;
    if (queued === null) {
      queued = entangledTransitionTypes = [];
    }
    for (let i = 0; i < transitionTypes.length; i++) {
      const transitionType = transitionTypes[i];
      if (queued.indexOf(transitionType) === -1) {
        queued.push(transitionType);
      }
    }
  }
}

export function clearEntangledAsyncTransitionTypes() {
  // Called when all Async Actions are done.
  entangledTransitionTypes = null;
}

export function claimQueuedTransitionTypes(
  root: FiberRoot,
): null | TransitionTypes {
  const claimed = root.transitionTypes;
  root.transitionTypes = null;
  return claimed;
}
