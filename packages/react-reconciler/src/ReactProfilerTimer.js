/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';

import type {SuspendedReason} from './ReactFiberWorkLoop';

import type {Lane, Lanes} from './ReactFiberLane';

import type {CapturedValue} from './ReactCapturedValue';

import {
  isTransitionLane,
  isBlockingLane,
  isGestureRender,
  includesTransitionLane,
  includesBlockingLane,
  NoLanes,
} from './ReactFiberLane';

import {resolveEventType, resolveEventTimeStamp} from './ReactFiberConfig';

import {
  enableProfilerCommitHooks,
  enableProfilerNestedUpdatePhase,
  enableProfilerTimer,
  enableComponentPerformanceTrack,
} from 'shared/ReactFeatureFlags';

import getComponentNameFromFiber from './getComponentNameFromFiber';
import {isAlreadyRendering} from './ReactFiberWorkLoop';

// Intentionally not named imports because Rollup would use dynamic dispatch for
// CommonJS interop named imports.
import * as Scheduler from 'scheduler';

const {unstable_now: now} = Scheduler;

const createTask =
  // eslint-disable-next-line react-internal/no-production-logging
  __DEV__ && console.createTask
    ? // eslint-disable-next-line react-internal/no-production-logging
      console.createTask
    : (name: string) => null;

export const REGULAR_UPDATE: UpdateType = 0;
export const SPAWNED_UPDATE: UpdateType = 1;
export const PINGED_UPDATE: UpdateType = 2;
export opaque type UpdateType = 0 | 1 | 2;

export let renderStartTime: number = -0;
export let commitStartTime: number = -0;
export let commitEndTime: number = -0;
export let commitErrors: null | Array<CapturedValue<mixed>> = null;
export let profilerStartTime: number = -1.1;
export let profilerEffectDuration: number = -0;
export let componentEffectDuration: number = -0;
export let componentEffectStartTime: number = -1.1;
export let componentEffectEndTime: number = -1.1;
export let componentEffectErrors: null | Array<CapturedValue<mixed>> = null;
export let componentEffectSpawnedUpdate: boolean = false;

export let blockingClampTime: number = -0;
export let blockingUpdateTime: number = -1.1; // First sync setState scheduled.
export let blockingUpdateTask: null | ConsoleTask = null; // First sync setState's stack trace.
export let blockingUpdateType: UpdateType = 0;
export let blockingUpdateMethodName: null | string = null; // The name of the method that caused first sync update.
export let blockingUpdateComponentName: null | string = null; // The name of the component where first sync update happened.
export let blockingEventTime: number = -1.1; // Event timeStamp of the first setState.
export let blockingEventType: null | string = null; // Event type of the first setState.
export let blockingEventRepeatTime: number = -1.1;
export let blockingSuspendedTime: number = -1.1;

export let gestureClampTime: number = -0;
export let gestureUpdateTime: number = -1.1; // First setOptimistic scheduled inside startGestureTransition.
export let gestureUpdateTask: null | ConsoleTask = null; // First sync setState's stack trace.
export let gestureUpdateType: UpdateType = 0;
export let gestureUpdateMethodName: null | string = null; // The name of the method that caused first gesture update.
export let gestureUpdateComponentName: null | string = null; // The name of the component where first gesture update happened.
export let gestureEventTime: number = -1.1; // Event timeStamp of the first setState.
export let gestureEventType: null | string = null; // Event type of the first setState.
export let gestureEventRepeatTime: number = -1.1;
export let gestureSuspendedTime: number = -1.1;

// TODO: This should really be one per Transition lane.
export let transitionClampTime: number = -0;
export let transitionStartTime: number = -1.1; // First startTransition call before setState.
export let transitionUpdateTime: number = -1.1; // First transition setState scheduled.
export let transitionUpdateType: UpdateType = 0;
export let transitionUpdateTask: null | ConsoleTask = null; // First transition setState's stack trace.
export let transitionUpdateMethodName: null | string = null; // The name of the method that caused first transition update.
export let transitionUpdateComponentName: null | string = null; // The name of the component where first transition update happened.
export let transitionEventTime: number = -1.1; // Event timeStamp of the first transition.
export let transitionEventType: null | string = null; // Event type of the first transition.
export let transitionEventRepeatTime: number = -1.1;
export let transitionSuspendedTime: number = -1.1;

export let retryClampTime: number = -0;
export let idleClampTime: number = -0;

export let animatingLanes: Lanes = NoLanes;
export let animatingTask: null | ConsoleTask = null; // First ViewTransition applying an Animation.

export let yieldReason: SuspendedReason = 0 as any;
export let yieldStartTime: number = -1.1; // The time when we yielded to the event loop

export function startYieldTimer(reason: SuspendedReason) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  yieldStartTime = now();
  yieldReason = reason;
}

export function startUpdateTimerByLane(
  lane: Lane,
  method: string,
  fiber: Fiber | null,
): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (isGestureRender(lane)) {
    if (gestureUpdateTime < 0) {
      gestureUpdateTime = now();
      gestureUpdateTask = createTask(method);
      gestureUpdateMethodName = method;
      if (__DEV__ && fiber != null) {
        gestureUpdateComponentName = getComponentNameFromFiber(fiber);
      }
      const newEventTime = resolveEventTimeStamp();
      const newEventType = resolveEventType();
      if (
        newEventTime !== gestureEventRepeatTime ||
        newEventType !== gestureEventType
      ) {
        gestureEventRepeatTime = -1.1;
      }
      gestureEventTime = newEventTime;
      gestureEventType = newEventType;
    }
  } else if (isBlockingLane(lane)) {
    if (blockingUpdateTime < 0) {
      blockingUpdateTime = now();
      blockingUpdateTask = createTask(method);
      blockingUpdateMethodName = method;
      if (__DEV__ && fiber != null) {
        blockingUpdateComponentName = getComponentNameFromFiber(fiber);
      }
      if (isAlreadyRendering()) {
        componentEffectSpawnedUpdate = true;
        blockingUpdateType = SPAWNED_UPDATE;
      }
      const newEventTime = resolveEventTimeStamp();
      const newEventType = resolveEventType();
      if (
        newEventTime !== blockingEventRepeatTime ||
        newEventType !== blockingEventType
      ) {
        blockingEventRepeatTime = -1.1;
      } else if (newEventType !== null) {
        // If this is a second update in the same event, we treat it as a spawned update.
        // This might be a microtask spawned from useEffect, multiple flushSync or
        // a setState in a microtask spawned after the first setState. Regardless it's bad.
        blockingUpdateType = SPAWNED_UPDATE;
      }
      blockingEventTime = newEventTime;
      blockingEventType = newEventType;
    }
  } else if (isTransitionLane(lane)) {
    if (transitionUpdateTime < 0) {
      transitionUpdateTime = now();
      transitionUpdateTask = createTask(method);
      transitionUpdateMethodName = method;
      if (__DEV__ && fiber != null) {
        transitionUpdateComponentName = getComponentNameFromFiber(fiber);
      }
      if (transitionStartTime < 0) {
        const newEventTime = resolveEventTimeStamp();
        const newEventType = resolveEventType();
        if (
          newEventTime !== transitionEventRepeatTime ||
          newEventType !== transitionEventType
        ) {
          transitionEventRepeatTime = -1.1;
        }
        transitionEventTime = newEventTime;
        transitionEventType = newEventType;
      }
    }
  }
}

export function startHostActionTimer(fiber: Fiber): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // This schedules an update on both the blocking lane for the pending state and on the
  // transition lane for the action update. Using the debug task from the host fiber.
  if (blockingUpdateTime < 0) {
    blockingUpdateTime = now();
    blockingUpdateTask =
      __DEV__ && fiber._debugTask != null ? fiber._debugTask : null;
    if (isAlreadyRendering()) {
      blockingUpdateType = SPAWNED_UPDATE;
    }
    const newEventTime = resolveEventTimeStamp();
    const newEventType = resolveEventType();
    if (
      newEventTime !== blockingEventRepeatTime ||
      newEventType !== blockingEventType
    ) {
      blockingEventRepeatTime = -1.1;
    } else if (newEventType !== null) {
      // If this is a second update in the same event, we treat it as a spawned update.
      // This might be a microtask spawned from useEffect, multiple flushSync or
      // a setState in a microtask spawned after the first setState. Regardless it's bad.
      blockingUpdateType = SPAWNED_UPDATE;
    }
    blockingEventTime = newEventTime;
    blockingEventType = newEventType;
  }
  if (transitionUpdateTime < 0) {
    transitionUpdateTime = now();
    transitionUpdateTask =
      __DEV__ && fiber._debugTask != null ? fiber._debugTask : null;
    if (transitionStartTime < 0) {
      const newEventTime = resolveEventTimeStamp();
      const newEventType = resolveEventType();
      if (
        newEventTime !== transitionEventRepeatTime ||
        newEventType !== transitionEventType
      ) {
        transitionEventRepeatTime = -1.1;
      }
      transitionEventTime = newEventTime;
      transitionEventType = newEventType;
    }
  }
}

export function startPingTimerByLanes(lanes: Lanes): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // Mark the update time and clamp anything before it because we don't want
  // to show the event time for pings but we also don't want to clear it
  // because we still need to track if this was a repeat.
  if (isGestureRender(lanes)) {
    if (gestureUpdateTime < 0) {
      gestureClampTime = gestureUpdateTime = now();
      gestureUpdateTask = createTask('Promise Resolved');
      gestureUpdateType = PINGED_UPDATE;
    }
  } else if (includesBlockingLane(lanes)) {
    if (blockingUpdateTime < 0) {
      blockingClampTime = blockingUpdateTime = now();
      blockingUpdateTask = createTask('Promise Resolved');
      blockingUpdateType = PINGED_UPDATE;
    }
  } else if (includesTransitionLane(lanes)) {
    if (transitionUpdateTime < 0) {
      transitionClampTime = transitionUpdateTime = now();
      transitionUpdateTask = createTask('Promise Resolved');
      transitionUpdateType = PINGED_UPDATE;
    }
  }
}

export function trackSuspendedTime(lanes: Lanes, renderEndTime: number) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (isGestureRender(lanes)) {
    gestureSuspendedTime = renderEndTime;
  } else if (includesBlockingLane(lanes)) {
    blockingSuspendedTime = renderEndTime;
  } else if (includesTransitionLane(lanes)) {
    transitionSuspendedTime = renderEndTime;
  }
}

export function clearBlockingTimers(): void {
  blockingUpdateTime = -1.1;
  blockingUpdateType = 0;
  blockingUpdateMethodName = null;
  blockingUpdateComponentName = null;
  blockingSuspendedTime = -1.1;
  blockingEventRepeatTime = blockingEventTime;
  blockingEventTime = -1.1;
  blockingClampTime = now();
}

export function startAsyncTransitionTimer(): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (transitionStartTime < 0 && transitionUpdateTime < 0) {
    transitionStartTime = now();
    const newEventTime = resolveEventTimeStamp();
    const newEventType = resolveEventType();
    if (
      newEventTime !== transitionEventRepeatTime ||
      newEventType !== transitionEventType
    ) {
      transitionEventRepeatTime = -1.1;
    }
    transitionEventTime = newEventTime;
    transitionEventType = newEventType;
  }
}

export function hasScheduledTransitionWork(): boolean {
  // If we have setState on a transition or scheduled useActionState update.
  return transitionUpdateTime > -1;
}

export function clearAsyncTransitionTimer(): void {
  transitionStartTime = -1.1;
}

export function clearTransitionTimers(): void {
  transitionStartTime = -1.1;
  transitionUpdateTime = -1.1;
  transitionUpdateType = 0;
  transitionSuspendedTime = -1.1;
  transitionEventRepeatTime = transitionEventTime;
  transitionEventTime = -1.1;
  transitionClampTime = now();
}

export function hasScheduledGestureTransitionWork(): boolean {
  // If we have call setOptimistic on a gesture
  return gestureUpdateTime > -1;
}

export function clearGestureTimers(): void {
  gestureUpdateTime = -1.1;
  gestureUpdateType = 0;
  gestureSuspendedTime = -1.1;
  gestureEventRepeatTime = gestureEventTime;
  gestureEventTime = -1.1;
  gestureClampTime = now();
}

export function clearGestureUpdates(): void {
  // Same as clearGestureTimers but doesn't reset the clamp time because we didn't
  // actually emit a render.
  gestureUpdateTime = -1.1;
  gestureUpdateType = 0;
  gestureSuspendedTime = -1.1;
  gestureEventRepeatTime = gestureEventTime;
  gestureEventTime = -1.1;
}

export function clampBlockingTimers(finalTime: number): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // If we had new updates come in while we were still rendering or committing, we don't want
  // those update times to create overlapping tracks in the performance timeline so we clamp
  // them to the end of the commit phase.
  blockingClampTime = finalTime;
}

export function clampGestureTimers(finalTime: number): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // If we had new updates come in while we were still rendering or committing, we don't want
  // those update times to create overlapping tracks in the performance timeline so we clamp
  // them to the end of the commit phase.
  gestureClampTime = finalTime;
}

export function clampTransitionTimers(finalTime: number): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // If we had new updates come in while we were still rendering or committing, we don't want
  // those update times to create overlapping tracks in the performance timeline so we clamp
  // them to the end of the commit phase.
  transitionClampTime = finalTime;
}

export function clampRetryTimers(finalTime: number): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  retryClampTime = finalTime;
}

export function clampIdleTimers(finalTime: number): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  idleClampTime = finalTime;
}

export function pushNestedEffectDurations(): number {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const prevEffectDuration = profilerEffectDuration;
  profilerEffectDuration = 0; // Reset counter.
  return prevEffectDuration;
}

export function popNestedEffectDurations(prevEffectDuration: number): number {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const elapsedTime = profilerEffectDuration;
  profilerEffectDuration = prevEffectDuration;
  return elapsedTime;
}

// Like pop but it also adds the current elapsed time to the parent scope.
export function bubbleNestedEffectDurations(
  prevEffectDuration: number,
): number {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const elapsedTime = profilerEffectDuration;
  profilerEffectDuration += prevEffectDuration;
  return elapsedTime;
}

export function resetComponentEffectTimers(): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  componentEffectStartTime = -1.1;
  componentEffectEndTime = -1.1;
}

export function pushComponentEffectStart(): number {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const prevEffectStart = componentEffectStartTime;
  componentEffectStartTime = -1.1; // Track the next start.
  return prevEffectStart;
}

export function popComponentEffectStart(prevEffectStart: number): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  // If the parent component didn't have a start time, we let this current time persist.
  if (prevEffectStart >= 0) {
    // Otherwise, we restore the previous parent's start time.
    componentEffectStartTime = prevEffectStart;
  }
}

export function pushComponentEffectDuration(): number {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const prevEffectDuration = componentEffectDuration;
  componentEffectDuration = -0; // Reset component level duration.
  return prevEffectDuration;
}

export function popComponentEffectDuration(prevEffectDuration: number): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  // If the parent component didn't have a start time, we let this current time persist.
  if (prevEffectDuration >= 0) {
    // Otherwise, we restore the previous parent's start time.
    componentEffectDuration = prevEffectDuration;
  }
}

export function pushComponentEffectErrors(): null | Array<
  CapturedValue<mixed>,
> {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return null;
  }
  const prevErrors = componentEffectErrors;
  componentEffectErrors = null;
  return prevErrors;
}

export function popComponentEffectErrors(
  prevErrors: null | Array<CapturedValue<mixed>>,
): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  componentEffectErrors = prevErrors;
}

export function pushComponentEffectDidSpawnUpdate(): boolean {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return false;
  }

  const prev = componentEffectSpawnedUpdate;
  componentEffectSpawnedUpdate = false; // Reset.
  return prev;
}

export function popComponentEffectDidSpawnUpdate(previousValue: boolean): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  componentEffectSpawnedUpdate = previousValue;
}

/**
 * Tracks whether the current update was a nested/cascading update (scheduled from a layout effect).
 *
 * The overall sequence is:
 *   1. render
 *   2. commit (and call `onRender`, `onCommit`)
 *   3. check for nested updates
 *   4. flush passive effects (and call `onPostCommit`)
 *
 * Nested updates are identified in step 3 above,
 * but step 4 still applies to the work that was just committed.
 * We use two flags to track nested updates then:
 * one tracks whether the upcoming update is a nested update,
 * and the other tracks whether the current update was a nested update.
 * The first value gets synced to the second at the start of the render phase.
 */
let currentUpdateIsNested: boolean = false;
let nestedUpdateScheduled: boolean = false;

export function isCurrentUpdateNested(): boolean {
  return currentUpdateIsNested;
}

export function markNestedUpdateScheduled(): void {
  if (enableProfilerNestedUpdatePhase) {
    nestedUpdateScheduled = true;
  }
}

export function resetNestedUpdateFlag(): void {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = false;
    nestedUpdateScheduled = false;
  }
}

export function syncNestedUpdateFlag(): void {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = nestedUpdateScheduled;
    nestedUpdateScheduled = false;
  }
}

export function recordRenderTime(): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  renderStartTime = now();
}

export function recordCommitTime(): void {
  if (!enableProfilerTimer) {
    return;
  }
  commitStartTime = now();
}

export function recordCommitEndTime(): void {
  if (!enableProfilerTimer) {
    return;
  }
  commitEndTime = now();
}

export function startProfilerTimer(fiber: Fiber): void {
  if (!enableProfilerTimer) {
    return;
  }

  profilerStartTime = now();

  if ((fiber.actualStartTime as any as number) < 0) {
    fiber.actualStartTime = profilerStartTime;
  }
}

export function stopProfilerTimerIfRunning(fiber: Fiber): void {
  if (!enableProfilerTimer) {
    return;
  }
  profilerStartTime = -1;
}

export function stopProfilerTimerIfRunningAndRecordDuration(
  fiber: Fiber,
): void {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    fiber.selfBaseDuration = elapsedTime;
    profilerStartTime = -1;
  }
}

export function stopProfilerTimerIfRunningAndRecordIncompleteDuration(
  fiber: Fiber,
): void {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    // We don't update the selfBaseDuration here because we errored.
    profilerStartTime = -1;
  }
}

export function recordEffectDuration(fiber: Fiber): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  if (profilerStartTime >= 0) {
    const endTime = now();
    const elapsedTime = endTime - profilerStartTime;

    profilerStartTime = -1;

    // Store duration on the next nearest Profiler ancestor
    // Or the root (for the DevTools Profiler to read)
    profilerEffectDuration += elapsedTime;
    componentEffectDuration += elapsedTime;

    // Keep track of the last end time of the effects.
    componentEffectEndTime = endTime;
  }
}

export function recordEffectError(errorInfo: CapturedValue<mixed>): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  if (componentEffectErrors === null) {
    componentEffectErrors = [];
  }
  componentEffectErrors.push(errorInfo);
  if (commitErrors === null) {
    commitErrors = [];
  }
  commitErrors.push(errorInfo);
}

export function resetCommitErrors(): void {
  commitErrors = null;
}

export function startEffectTimer(): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  profilerStartTime = now();
  if (componentEffectStartTime < 0) {
    // Keep track of the first time we start an effect as the component's effect start time.
    componentEffectStartTime = profilerStartTime;
  }
}

export function transferActualDuration(fiber: Fiber): void {
  // Transfer time spent rendering these children so we don't lose it
  // after we rerender. This is used as a helper in special cases
  // where we should count the work of multiple passes.
  let child = fiber.child;
  while (child) {
    // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
    fiber.actualDuration += child.actualDuration;
    child = child.sibling;
  }
}

export function startAnimating(lanes: Lanes): void {
  animatingLanes |= lanes;
  animatingTask = null;
}

export function stopAnimating(lanes: Lanes): void {
  animatingLanes &= ~lanes;
  animatingTask = null;
}

export function trackAnimatingTask(task: ConsoleTask): void {
  if (animatingTask === null) {
    animatingTask = task;
  }
}
