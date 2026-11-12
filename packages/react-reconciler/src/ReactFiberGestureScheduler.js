/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FiberRoot} from './ReactInternalTypes';
import type {GestureOptions} from 'shared/ReactTypes';
import type {GestureTimeline, RunningViewTransition} from './ReactFiberConfig';
import type {TransitionTypes} from 'react/src/ReactTransitionType';
import type {Lane} from './ReactFiberLane';

import {
  GestureLane,
  markRootEntangled,
  markRootFinished,
  NoLane,
  NoLanes,
} from './ReactFiberLane';
import {
  ensureRootIsScheduled,
  requestTransitionLane,
} from './ReactFiberRootScheduler';
import {getCurrentGestureOffset, stopViewTransition} from './ReactFiberConfig';
import {pingGestureRoot, restartGestureRoot} from './ReactFiberWorkLoop';

// This type keeps track of any scheduled or active gestures.
export type ScheduledGesture = {
  provider: GestureTimeline,
  count: number, // The number of times this same provider has been started.
  rangeStart: number, // The percentage along the timeline where the "current" state starts.
  rangeEnd: number, // The percentage along the timeline where the "destination" state is reached.
  types: null | TransitionTypes, // Any addTransitionType call made during startGestureTransition.
  running: null | RunningViewTransition, // Used to cancel the running transition after we're done.
  commit: null | (() => void), // Callback to run to commit if there's a pending commit.
  committing: boolean, // If the gesture was released in a committed state and should actually commit.
  revertLane: Lane, // The Lane that we'll use to schedule the revert.
  prev: null | ScheduledGesture, // The previous scheduled gesture in the queue for this root.
  next: null | ScheduledGesture, // The next scheduled gesture in the queue for this root.
};

export function scheduleGesture(
  root: FiberRoot,
  provider: GestureTimeline,
): ScheduledGesture {
  let prev = root.pendingGestures;
  while (prev !== null) {
    if (prev.provider === provider) {
      // Existing instance found.
      return prev;
    }
    const next = prev.next;
    // $FlowFixMe[invalid-compare]
    if (next === null) {
      break;
    }
    prev = next;
  }
  const gesture: ScheduledGesture = {
    provider: provider,
    count: 0,
    rangeStart: 0, // Uninitialized
    rangeEnd: 100, // Uninitialized
    types: null,
    running: null,
    commit: null,
    committing: false,
    revertLane: NoLane, // Starts uninitialized.
    prev: prev,
    next: null,
  };
  if (prev === null) {
    root.pendingGestures = gesture;
  } else {
    prev.next = gesture;
  }
  ensureRootIsScheduled(root);
  return gesture;
}

export function startScheduledGesture(
  root: FiberRoot,
  gestureTimeline: GestureTimeline,
  gestureOptions: ?GestureOptions,
  transitionTypes: null | TransitionTypes,
): null | ScheduledGesture {
  const rangeStart =
    gestureOptions && gestureOptions.rangeStart != null
      ? gestureOptions.rangeStart
      : getCurrentGestureOffset(gestureTimeline);
  const rangeEnd =
    gestureOptions && gestureOptions.rangeEnd != null
      ? gestureOptions.rangeEnd
      : rangeStart < 50
        ? 100
        : 0;
  let prev = root.pendingGestures;
  while (prev !== null) {
    if (prev.provider === gestureTimeline) {
      // Existing instance found.
      prev.count++;
      // Update the options.
      prev.rangeStart = rangeStart;
      prev.rangeEnd = rangeEnd;
      if (transitionTypes !== null) {
        let scheduledTypes = prev.types;
        if (scheduledTypes === null) {
          scheduledTypes = prev.types = [];
        }
        for (let i = 0; i < transitionTypes.length; i++) {
          const transitionType = transitionTypes[i];
          if (scheduledTypes.indexOf(transitionType) === -1) {
            scheduledTypes.push(transitionType);
          }
        }
      }
      return prev;
    }
    const next = prev.next;
    // $FlowFixMe[invalid-compare]
    if (next === null) {
      break;
    }
    prev = next;
  }
  // No scheduled gestures. It must mean nothing for this renderer updated but
  // some other renderer might have updated.
  return null;
}

export function cancelScheduledGesture(
  root: FiberRoot,
  gesture: ScheduledGesture,
): void {
  // Entangle any Transitions started in this event with the revertLane of the gesture
  // so that we commit them all together.
  if (gesture.revertLane !== NoLane) {
    const entangledLanes = gesture.revertLane | requestTransitionLane(null);
    markRootEntangled(root, entangledLanes);
  }

  gesture.count--;
  if (gesture.count === 0) {
    // If the end state is closer to the end than the beginning then we commit into the
    // end state before reverting back (or applying a new Transition).
    // Otherwise we just revert back and don't commit.
    let shouldCommit: boolean;
    const finalOffset = getCurrentGestureOffset(gesture.provider);
    const rangeStart = gesture.rangeStart;
    const rangeEnd = gesture.rangeEnd;
    if (rangeStart < rangeEnd) {
      shouldCommit = finalOffset > rangeStart + (rangeEnd - rangeStart) / 2;
    } else {
      shouldCommit = finalOffset < rangeEnd + (rangeStart - rangeEnd) / 2;
    }
    // TODO: If we're currently rendering this gesture, we need to restart the render
    // on a different gesture or cancel the render..
    // TODO: We might want to pause the View Transition at this point since you should
    // no longer be able to update the position of anything but it might be better to
    // just commit the gesture state.
    const runningTransition = gesture.running;
    if (runningTransition !== null && shouldCommit) {
      // If we are going to commit this gesture in its to state, we need to wait to
      // stop it until it commits. We should now schedule a render at the gesture
      // lane to actually commit it.
      gesture.committing = true;
      if (root.pendingGestures === gesture) {
        const commitCallback = gesture.commit;
        if (commitCallback !== null) {
          gesture.commit = null;
          // If we already have a commit prepared we can immediately commit the tree
          // without rerendering.
          // TODO: Consider scheduling this in a task instead of synchronously inside the last cancellation.s
          commitCallback();
        } else {
          // Ping the root given the new state. This is similar to pingSuspendedRoot.
          pingGestureRoot(root);
        }
      }
    } else {
      // If we're not going to commit this gesture we can stop the View Transition
      // right away and delete the scheduled gesture from the pending queue.
      if (gesture.prev === null) {
        if (root.pendingGestures === gesture) {
          // This was the currently rendering gesture.
          root.pendingGestures = gesture.next;
          let remainingLanes = root.pendingLanes;
          if (root.pendingGestures === null) {
            // Gestures don't clear their lanes while the gesture is still active but it
            // might not be scheduled to do any more renders and so we shouldn't schedule
            // any more gesture lane work until a new gesture is scheduled.
            remainingLanes &= ~GestureLane;
          }
          markRootFinished(
            root,
            GestureLane,
            remainingLanes,
            NoLane,
            NoLane,
            NoLanes,
          );
          // If we had a currently rendering gesture we need to now reset the gesture lane to
          // now render the next gesture or cancel if there's no more gestures in the queue.
          restartGestureRoot(root);
        }
        gesture.running = null;
        if (runningTransition !== null) {
          stopViewTransition(runningTransition);
        }
      } else {
        // This was not the current gesture so it doesn't affect the current render.
        gesture.prev.next = gesture.next;
        if (gesture.next !== null) {
          gesture.next.prev = gesture.prev;
        }
        gesture.prev = null;
        gesture.next = null;
      }
    }
  }
}

export function stopCommittedGesture(root: FiberRoot) {
  // The top was just committed. We can delete it from the queue
  // and stop its View Transition now.
  const committedGesture = root.pendingGestures;
  if (committedGesture !== null) {
    // Mark it as no longer committing and should no longer be included in rerenders.
    committedGesture.committing = false;
    const nextGesture = committedGesture.next;
    if (nextGesture === null) {
      // Gestures don't clear their lanes while the gesture is still active but it
      // might not be scheduled to do any more renders and so we shouldn't schedule
      // any more gesture lane work until a new gesture is scheduled.
      root.pendingLanes &= ~GestureLane;
    } else {
      nextGesture.prev = null;
    }
    root.pendingGestures = nextGesture;
    const runningTransition = committedGesture.running;
    if (runningTransition !== null) {
      committedGesture.running = null;
      stopViewTransition(runningTransition);
    }
  }
}

export function scheduleGestureCommit(
  gesture: ScheduledGesture,
  callback: () => void,
): () => void {
  gesture.commit = callback;
  return function () {
    gesture.commit = null;
  };
}
