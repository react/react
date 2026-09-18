/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import {__PERFORMANCE_PROFILE__} from './constants';

const supportsUserTiming =
  typeof performance !== 'undefined' &&
  // $FlowFixMe[method-unbinding]
  typeof performance.mark === 'function' &&
  // $FlowFixMe[method-unbinding]
  typeof performance.clearMarks === 'function';

const supportsPerformanceNow =
  // $FlowFixMe[method-unbinding]
  typeof performance !== 'undefined' && typeof performance.now === 'function';

function mark(markName: string): void {
  if (supportsUserTiming) {
    performance.mark(markName + '-start');
  }
}

function measure(markName: string): void {
  if (supportsUserTiming) {
    performance.mark(markName + '-end');
    performance.measure(markName, markName + '-start', markName + '-end');
    performance.clearMarks(markName + '-start');
    performance.clearMarks(markName + '-end');
  }
}

function now(): number {
  if (supportsPerformanceNow) {
    return performance.now();
  }
  return Date.now();
}

export async function withAsyncPerfMeasurements<TReturn>(
  markName: string,
  callback: () => Promise<TReturn>,
  onComplete?: number => void,
): Promise<TReturn> {
  const start = now();
  // $FlowFixMe[constant-condition]
  if (__PERFORMANCE_PROFILE__) {
    mark(markName);
  }
  const result = await callback();

  // $FlowFixMe[constant-condition]
  if (__PERFORMANCE_PROFILE__) {
    measure(markName);
  }

  if (onComplete != null) {
    const duration = now() - start;
    onComplete(duration);
  }

  return result;
}

export function withSyncPerfMeasurements<TReturn>(
  markName: string,
  callback: () => TReturn,
  onComplete?: number => void,
): TReturn {
  const start = now();
  // $FlowFixMe[constant-condition]
  if (__PERFORMANCE_PROFILE__) {
    mark(markName);
  }
  const result = callback();

  // $FlowFixMe[constant-condition]
  if (__PERFORMANCE_PROFILE__) {
    measure(markName);
  }

  if (onComplete != null) {
    const duration = now() - start;
    onComplete(duration);
  }

  return result;
}

export function withCallbackPerfMeasurements<TReturn>(
  markName: string,
  callback: (done: () => void) => TReturn,
  onComplete?: number => void,
): TReturn {
  const start = now();
  // $FlowFixMe[constant-condition]
  if (__PERFORMANCE_PROFILE__) {
    mark(markName);
  }

  const done = () => {
    // $FlowFixMe[constant-condition]
    if (__PERFORMANCE_PROFILE__) {
      measure(markName);
    }

    if (onComplete != null) {
      const duration = now() - start;
      onComplete(duration);
    }
  };
  return callback(done);
}
