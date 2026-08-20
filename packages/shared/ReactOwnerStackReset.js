/**
 * Copyright (c) Meta Platforms, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactSharedInternals from 'shared/ReactSharedInternals';

let lastResetTime = 0;

let getCurrentTime: () => number | DOMHighResTimeStamp;
const hasPerformanceNow =
  // $FlowFixMe[method-unbinding]
  typeof performance === 'object' && typeof performance.now === 'function';

if (hasPerformanceNow) {
  const localPerformance = performance;
  getCurrentTime = () => localPerformance.now();
} else {
  const localDate = Date;
  getCurrentTime = () => localDate.now();
}

export function resetOwnerStackLimit() {
  if (__DEV__) {
    const now = getCurrentTime();
    const timeSinceLastReset = now - lastResetTime;
    if (timeSinceLastReset > 1000) {
      ReactSharedInternals.recentlyCreatedOwnerStacks = 0;
      lastResetTime = now;
    }
  } else {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resetOwnerStackLimit should never be called in production mode. This is a bug in React.',
    );
  }
}
