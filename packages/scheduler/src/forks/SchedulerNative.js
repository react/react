/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as Scheduler from './Scheduler';
import type {Callback, Task} from './Scheduler';
import type {PriorityLevel} from '../SchedulerPriorities';
import typeof * as PriorityLevels from '../SchedulerPriorities';
import typeof * as SchedulerExportsType from './Scheduler';
import typeof * as SchedulerNativeExportsType from './SchedulerNative';

// This type is supposed to reflect the actual methods and arguments currently supported by the C++ implementation:
// https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/runtimescheduler/RuntimeSchedulerBinding.cpp
type NativeSchedulerType = {
  unstable_ImmediatePriority: PriorityLevels['ImmediatePriority'],
  unstable_UserBlockingPriority: PriorityLevels['UserBlockingPriority'],
  unstable_NormalPriority: PriorityLevels['NormalPriority'],
  unstable_IdlePriority: PriorityLevels['IdlePriority'],
  unstable_LowPriority: PriorityLevels['LowPriority'],
  unstable_scheduleCallback: (
    priorityLevel: PriorityLevel,
    callback: Callback,
  ) => Task,
  unstable_cancelCallback: (task: Task) => void,
  unstable_getCurrentPriorityLevel: () => PriorityLevel,
  unstable_shouldYield: () => boolean,
  unstable_requestPaint: () => void,
  unstable_now: () => DOMHighResTimeStamp,
};

declare const nativeRuntimeScheduler: void | NativeSchedulerType;

export const unstable_UserBlockingPriority: PriorityLevels['UserBlockingPriority'] =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_UserBlockingPriority
    : Scheduler.unstable_UserBlockingPriority;

export const unstable_NormalPriority: PriorityLevels['NormalPriority'] =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_NormalPriority
    : Scheduler.unstable_NormalPriority;

export const unstable_IdlePriority: PriorityLevels['IdlePriority'] =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_IdlePriority
    : Scheduler.unstable_IdlePriority;

export const unstable_LowPriority: PriorityLevels['LowPriority'] =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_LowPriority
    : Scheduler.unstable_LowPriority;

export const unstable_ImmediatePriority: PriorityLevels['ImmediatePriority'] =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_ImmediatePriority
    : Scheduler.unstable_ImmediatePriority;

export const unstable_scheduleCallback: (
  priorityLevel: PriorityLevel,
  callback: Callback,
) => Task =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_scheduleCallback
    : Scheduler.unstable_scheduleCallback;

export const unstable_cancelCallback: (task: Task) => void =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_cancelCallback
    : Scheduler.unstable_cancelCallback;

export const unstable_getCurrentPriorityLevel: () => PriorityLevel =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_getCurrentPriorityLevel
    : Scheduler.unstable_getCurrentPriorityLevel;

export const unstable_shouldYield: () => boolean =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_shouldYield
    : Scheduler.unstable_shouldYield;

export const unstable_requestPaint: () => void =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_requestPaint
    : Scheduler.unstable_requestPaint;

export const unstable_now: () => number | DOMHighResTimeStamp =
  typeof nativeRuntimeScheduler !== 'undefined'
    ? nativeRuntimeScheduler.unstable_now
    : Scheduler.unstable_now;

// These were never implemented on the native scheduler because React never calls them.
// For consistency, let's disable them altogether and make them throw.
export const unstable_next: any = throwNotImplemented;
export const unstable_runWithPriority: any = throwNotImplemented;
export const unstable_wrapCallback: any = throwNotImplemented;
export const unstable_forceFrameRate: any = throwNotImplemented;
export const unstable_Profiling: any = null;

function throwNotImplemented() {
  throw Error('Not implemented.');
}

// Flow magic to verify the exports of this file match the original version.
export type {Callback, Task};
null as any as SchedulerExportsType as SchedulerNativeExportsType as SchedulerExportsType;
