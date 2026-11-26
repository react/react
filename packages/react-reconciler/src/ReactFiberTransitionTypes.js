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
import type {Lane, Lanes} from './ReactFiberLane';

import {enableViewTransition} from 'shared/ReactFeatureFlags';
import {NoLanes, laneToIndex, pickArbitraryLane} from './ReactFiberLane';

export function queueTransitionTypes(
  root: FiberRoot,
  lane: Lane,
  transitionTypes: TransitionTypes,
): void {
  if (enableViewTransition) {
    // Only associate types with roots that have work in this transition's lane.
    if ((root.pendingLanes & lane) !== NoLanes) {
      const index = laneToIndex(lane);
      let queued = root.transitionTypes[index];
      if (queued === null) {
        queued = root.transitionTypes[index] = [];
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
  lanes: Lanes,
): null | TransitionTypes {
  // Read the types before markRootFinished clears lanes that are no longer
  // pending. Types for other lanes must not be included in this commit.
  let claimed: null | TransitionTypes = null;
  while (lanes !== NoLanes) {
    const lane = pickArbitraryLane(lanes);
    const queued = root.transitionTypes[laneToIndex(lane)];
    if (queued !== null) {
      if (claimed === null) {
        claimed = [];
      }
      for (let i = 0; i < queued.length; i++) {
        const transitionType = queued[i];
        if (claimed.indexOf(transitionType) === -1) {
          claimed.push(transitionType);
        }
      }
    }
    lanes &= ~lane;
  }
  return claimed;
}
