/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// $FlowFixMe[cannot-resolve-module]
const dynamicFeatureFlags = require('SchedulerFeatureFlags');

export const {enableRequestPaint} = dynamicFeatureFlags;

export const enableProfiling = __DEV__;
export const frameYieldMs = 10;

export const userBlockingPriorityTimeout = 250;
export const normalPriorityTimeout = 5000;
export const lowPriorityTimeout = 10000;

export const enableAlwaysYieldScheduler = false;
