/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This module only exists as an ESM wrapper around the external CommonJS
// Scheduler dependency. Notice that we're intentionally not using named imports
// because Rollup would use dynamic dispatch for CommonJS interop named imports.
// When we switch to ESM, we can delete this module.
import * as Scheduler from 'scheduler';

export const scheduleCallback = Scheduler.unstable_scheduleCallback;
export const cancelCallback = Scheduler.unstable_cancelCallback;
export const shouldYield = Scheduler.unstable_shouldYield;
export const requestPaint = Scheduler.unstable_requestPaint;
export const now = Scheduler.unstable_now;
export const getCurrentPriorityLevel =
  Scheduler.unstable_getCurrentPriorityLevel;
export const ImmediatePriority = Scheduler.unstable_ImmediatePriority;
export const UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
export const NormalPriority = Scheduler.unstable_NormalPriority;
export const LowPriority = Scheduler.unstable_LowPriority;
export const IdlePriority = Scheduler.unstable_IdlePriority;
export type SchedulerCallback = (isSync: boolean) => SchedulerCallback | null;

// this doesn't actually exist on the scheduler, but it *does*
// on scheduler/unstable_mock, which we'll need for internal testing
export const log = Scheduler.log;
export const unstable_setDisableYieldValue =
  Scheduler.unstable_setDisableYieldValue;
