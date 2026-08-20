/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable no-var */
/* eslint-disable react-internal/prod-error-codes */

import type {PriorityLevel} from '../SchedulerPriorities';

import {enableProfiling} from '../SchedulerFeatureFlags';
import {push, pop, peek} from '../SchedulerMinHeap';

// TODO: Use symbols?
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from '../SchedulerPriorities';
import {
  markTaskRun,
  markTaskYield,
  markTaskCompleted,
  markTaskCanceled,
  markTaskErrored,
  markSchedulerSuspended,
  markSchedulerUnsuspended,
  markTaskStart,
  stopLoggingProfilingEvents,
  startLoggingProfilingEvents,
} from '../SchedulerProfiling';

type Callback = boolean => ?Callback;

type Task = {
  id: number,
  callback: Callback | null,
  priorityLevel: PriorityLevel,
  startTime: number,
  expirationTime: number,
  sortIndex: number,
  isQueued?: boolean,
};

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// Tasks are stored on a min heap
var taskQueue: Array<Task> = [];
var timerQueue: Array<Task> = [];

// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;

var currentTask = null;
var currentPriorityLevel: PriorityLevel = NormalPriority;

// This is set while performing work, to prevent re-entrance.
var isPerformingWork = false;

var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false;

let currentMockTime: number = 0;
let scheduledCallback:
  | null
  | ((
      hasTimeRemaining: boolean,
      initialTime: DOMHighResTimeStamp | number,
    ) => boolean) = null;
let scheduledTimeout: (number => void) | null = null;
let timeoutTime: number = -1;
let yieldedValues: Array<mixed> | null = null;
let expectedNumberOfYields: number = -1;
let didStop: boolean = false;
let isFlushing: boolean = false;
let needsPaint: boolean = false;
let shouldYieldForPaint: boolean = false;

var disableYieldValue = false;

function setDisableYieldValue(newValue: boolean) {
  disableYieldValue = newValue;
}

function advanceTimers(currentTime: number) {
  // Check for tasks that are no longer delayed and add them to the queue.
  let timer = peek(timerQueue);
  while (timer !== null) {
    if (timer.callback === null) {
      // Timer was cancelled.
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      // Timer fired. Transfer to the task queue.
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
      // $FlowFixMe[constant-condition]
      if (enableProfiling) {
        markTaskStart(timer, currentTime);
        timer.isQueued = true;
      }
    } else {
      // Remaining timers are pending.
      return;
    }
    timer = peek(timerQueue);
  }
}

function handleTimeout(currentTime: number) {
  isHostTimeoutScheduled = false;
  advanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    } else {
      const firstTimer = peek(timerQueue);
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

function flushWork(hasTimeRemaining: boolean, initialTime: number) {
  // $FlowFixMe[constant-condition]
  if (enableProfiling) {
    markSchedulerUnsuspended(initialTime);
  }

  // We'll need a host callback the next time work is scheduled.
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    // We scheduled a timeout but it's no longer needed. Cancel it.
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    // $FlowFixMe[constant-condition]
    if (enableProfiling) {
      try {
        return workLoop(hasTimeRemaining, initialTime);
      } catch (error) {
        if (currentTask !== null) {
          const currentTime = getCurrentTime();
          // $FlowFixMe[incompatible-call] found when upgrading Flow
          // $FlowFixMe[incompatible-type]
          markTaskErrored(currentTask, currentTime);
          // $FlowFixMe[incompatible-use] found when upgrading Flow
          currentTask.isQueued = false;
        }
        throw error;
      }
    } else {
      // No catch in prod code path.
      return workLoop(hasTimeRemaining, initialTime);
    }
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
    // $FlowFixMe[constant-condition]
    if (enableProfiling) {
      const currentTime = getCurrentTime();
      markSchedulerSuspended(currentTime);
    }
  }
}

function workLoop(hasTimeRemaining: boolean, initialTime: number): boolean {
  let currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  while (currentTask !== null) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentTask.callback = null;
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentPriorityLevel = currentTask.priorityLevel;
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      // $FlowFixMe[constant-condition]
      if (enableProfiling) {
        // $FlowFixMe[incompatible-call] found when upgrading Flow
        // $FlowFixMe[incompatible-type]
        markTaskRun(currentTask, currentTime);
      }
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if (typeof continuationCallback === 'function') {
        // If a continuation is returned, immediately yield to the main thread
        // regardless of how much time is left in the current time slice.
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        currentTask.callback = continuationCallback;
        // $FlowFixMe[constant-condition]
        if (enableProfiling) {
          // $FlowFixMe[incompatible-call] found when upgrading Flow
          // $FlowFixMe[incompatible-type]
          markTaskYield(currentTask, currentTime);
        }
        advanceTimers(currentTime);

        if (shouldYieldForPaint) {
          needsPaint = true;
          return true;
        } else {
          // If `shouldYieldForPaint` is false, we keep flushing synchronously
          // without yielding to the main thread. This is the behavior of the
          // `toFlushAndYield` and `toFlushAndYieldThrough` testing helpers .
        }
      } else {
        // $FlowFixMe[constant-condition]
        if (enableProfiling) {
          // $FlowFixMe[incompatible-call] found when upgrading Flow
          // $FlowFixMe[incompatible-type]
          markTaskCompleted(currentTask, currentTime);
          // $FlowFixMe[incompatible-use] found when upgrading Flow
          currentTask.isQueued = false;
        }
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
        advanceTimers(currentTime);
      }
    } else {
      pop(taskQueue);
    }
    currentTask = peek(taskQueue);
  }
  // Return whether there's additional work
  if (currentTask !== null) {
    return true;
  } else {
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

function unstable_runWithPriority<T>(
  priorityLevel: PriorityLevel,
  eventHandler: () => T,
): T {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_next<T>(eventHandler: () => T): T {
  var priorityLevel: PriorityLevel;
  switch (currentPriorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
      // Shift down to normal priority
      priorityLevel = NormalPriority;
      break;
    default:
      // Anything lower than normal priority should remain at the current level.
      priorityLevel = currentPriorityLevel;
      break;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_wrapCallback<T: (...Array<mixed>) => mixed>(callback: T): T {
  var parentPriorityLevel = currentPriorityLevel;
  // $FlowFixMe[incompatible-return]
  // $FlowFixMe[missing-this-annot]
  // $FlowFixMe[incompatible-type]
  return function () {
    // This is a fork of runWithPriority, inlined for performance.
    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;

    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = previousPriorityLevel;
    }
  };
}

function unstable_scheduleCallback(
  priorityLevel: PriorityLevel,
  callback: Callback,
  options?: {delay: number},
): Task {
  var currentTime = getCurrentTime();

  var startTime;
  // $FlowFixMe[invalid-compare]
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }

  var expirationTime = startTime + timeout;

  var newTask: Task = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  // $FlowFixMe[constant-condition]
  if (enableProfiling) {
    newTask.isQueued = false;
  }

  if (startTime > currentTime) {
    // This is a delayed task.
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // All tasks are delayed, and this is the task with the earliest delay.
      if (isHostTimeoutScheduled) {
        // Cancel an existing timeout.
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // Schedule a timeout.
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    // $FlowFixMe[constant-condition]
    if (enableProfiling) {
      markTaskStart(newTask, currentTime);
      newTask.isQueued = true;
    }
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

function unstable_cancelCallback(task: Task) {
  // $FlowFixMe[constant-condition]
  if (enableProfiling) {
    if (task.isQueued) {
      const currentTime = getCurrentTime();
      markTaskCanceled(task, currentTime);
      task.isQueued = false;
    }
  }

  // Null out the callback to indicate the task has been canceled. (Can't
  // remove from the queue because you can't remove arbitrary nodes from an
  // array based heap, only the first one.)
  task.callback = null;
}

function unstable_getCurrentPriorityLevel(): PriorityLevel {
  return currentPriorityLevel;
}

function requestHostCallback(callback: (boolean, number) => boolean) {
  scheduledCallback = callback;
}

function requestHostTimeout(callback: number => void, ms: number) {
  scheduledTimeout = callback;
  timeoutTime = currentMockTime + ms;
}

function cancelHostTimeout(): void {
  scheduledTimeout = null;
  timeoutTime = -1;
}

function shouldYieldToHost(): boolean {
  if (
    (expectedNumberOfYields === 0 && yieldedValues === null) ||
    (expectedNumberOfYields !== -1 &&
      yieldedValues !== null &&
      yieldedValues.length >= expectedNumberOfYields) ||
    (shouldYieldForPaint && needsPaint)
  ) {
    // We yielded at least as many values as expected. Stop flushing.
    didStop = true;
    return true;
  }
  return false;
}

function getCurrentTime(): number {
  return currentMockTime;
}

function forceFrameRate() {
  // No-op
}

function reset() {
  if (isFlushing) {
    throw new Error('Cannot reset while already flushing work.');
  }
  currentMockTime = 0;
  scheduledCallback = null;
  scheduledTimeout = null;
  timeoutTime = -1;
  yieldedValues = null;
  expectedNumberOfYields = -1;
  didStop = false;
  isFlushing = false;
  needsPaint = false;
}

// Should only be used via an assertion helper that inspects the yielded values.
function unstable_flushNumberOfYields(count: number): void {
  if (isFlushing) {
    throw new Error('Already flushing work.');
  }
  if (scheduledCallback !== null) {
    const cb = scheduledCallback;
    expectedNumberOfYields = count;
    isFlushing = true;
    try {
      let hasMoreWork = true;
      do {
        hasMoreWork = cb(true, currentMockTime);
      } while (hasMoreWork && !didStop);
      if (!hasMoreWork) {
        scheduledCallback = null;
      }
    } finally {
      expectedNumberOfYields = -1;
      didStop = false;
      isFlushing = false;
    }
  }
}

function unstable_flushUntilNextPaint(): false {
  if (isFlushing) {
    throw new Error('Already flushing work.');
  }
  if (scheduledCallback !== null) {
    const cb = scheduledCallback;
    shouldYieldForPaint = true;
    needsPaint = false;
    isFlushing = true;
    try {
      let hasMoreWork = true;
      do {
        hasMoreWork = cb(true, currentMockTime);
      } while (hasMoreWork && !didStop);
      if (!hasMoreWork) {
        scheduledCallback = null;
      }
    } finally {
      shouldYieldForPaint = false;
      didStop = false;
      isFlushing = false;
    }
  }
  return false;
}

function unstable_hasPendingWork(): boolean {
  return scheduledCallback !== null;
}

function unstable_flushExpired() {
  if (isFlushing) {
    throw new Error('Already flushing work.');
  }
  if (scheduledCallback !== null) {
    isFlushing = true;
    try {
      const hasMoreWork = scheduledCallback(false, currentMockTime);
      if (!hasMoreWork) {
        scheduledCallback = null;
      }
    } finally {
      isFlushing = false;
    }
  }
}

function unstable_flushAllWithoutAsserting(): boolean {
  // Returns false if no work was flushed.
  if (isFlushing) {
    throw new Error('Already flushing work.');
  }
  if (scheduledCallback !== null) {
    const cb = scheduledCallback;
    isFlushing = true;
    try {
      let hasMoreWork = true;
      do {
        hasMoreWork = cb(true, currentMockTime);
      } while (hasMoreWork);
      // $FlowFixMe[constant-condition]
      if (!hasMoreWork) {
        scheduledCallback = null;
      }
      return true;
    } finally {
      isFlushing = false;
    }
  } else {
    return false;
  }
}

function unstable_clearLog(): Array<mixed> {
  if (yieldedValues === null) {
    return [];
  }
  const values = yieldedValues;
  yieldedValues = null;
  return values;
}

function unstable_flushAll(): void {
  if (yieldedValues !== null) {
    throw new Error(
      'Log is not empty. Assert on the log of yielded values before ' +
        'flushing additional work.',
    );
  }
  unstable_flushAllWithoutAsserting();
  if (yieldedValues !== null) {
    throw new Error(
      'While flushing work, something yielded a value. Use an ' +
        'assertion helper to assert on the log of yielded values, e.g. ' +
        'expect(Scheduler).toFlushAndYield([...])',
    );
  }
}

function log(value: mixed): void {
  // eslint-disable-next-line react-internal/no-production-logging
  if (console.log.name === 'disabledLog' || disableYieldValue) {
    // If console.log has been patched, we assume we're in render
    // replaying and we ignore any values yielding in the second pass.
    return;
  }
  if (yieldedValues === null) {
    yieldedValues = [value];
  } else {
    yieldedValues.push(value);
  }
}

function unstable_advanceTime(ms: number) {
  // eslint-disable-next-line react-internal/no-production-logging
  if (console.log.name === 'disabledLog' || disableYieldValue) {
    // If console.log has been patched, we assume we're in render
    // replaying and we ignore any time advancing in the second pass.
    return;
  }
  currentMockTime += ms;
  if (scheduledTimeout !== null && timeoutTime <= currentMockTime) {
    scheduledTimeout(currentMockTime);
    timeoutTime = -1;
    scheduledTimeout = null;
  }
}

function requestPaint() {
  needsPaint = true;
}

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  LowPriority as unstable_LowPriority,
  unstable_runWithPriority,
  unstable_next,
  unstable_scheduleCallback,
  unstable_cancelCallback,
  unstable_wrapCallback,
  unstable_getCurrentPriorityLevel,
  shouldYieldToHost as unstable_shouldYield,
  requestPaint as unstable_requestPaint,
  getCurrentTime as unstable_now,
  forceFrameRate as unstable_forceFrameRate,
  unstable_flushAllWithoutAsserting,
  unstable_flushNumberOfYields,
  unstable_flushExpired,
  unstable_clearLog,
  unstable_flushUntilNextPaint,
  unstable_hasPendingWork,
  unstable_flushAll,
  log,
  unstable_advanceTime,
  reset,
  setDisableYieldValue as unstable_setDisableYieldValue,
};

export const unstable_Profiling: {
  startLoggingProfilingEvents(): void,
  stopLoggingProfilingEvents(): ArrayBuffer | null,
  // $FlowFixMe[constant-condition]
} | null = enableProfiling
  ? {
      startLoggingProfilingEvents,
      stopLoggingProfilingEvents,
    }
  : null;
