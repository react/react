/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import memoize from 'memoize-one';

import type {
  BatchUID,
  Milliseconds,
  ReactMeasure,
  TimelineData,
} from '../types';

function unmemoizedGetBatchRange(
  batchUID: BatchUID,
  data: TimelineData,
  minStartTime?: number = 0,
): [Milliseconds, Milliseconds] {
  const measures = data.batchUIDToMeasuresMap.get(batchUID);
  if (measures == null || measures.length === 0) {
    throw Error(`Could not find measures with batch UID "${batchUID}"`);
  }

  const lastMeasure = measures[measures.length - 1] as any as ReactMeasure;
  const stopTime = lastMeasure.timestamp + lastMeasure.duration;

  if (stopTime < minStartTime) {
    return [0, 0];
  }

  let startTime = minStartTime;
  for (let index = 0; index < measures.length; index++) {
    const measure = measures[index];
    if (measure.timestamp >= minStartTime) {
      startTime = measure.timestamp;
      break;
    }
  }

  return [startTime, stopTime];
}

export const getBatchRange: (
  batchUID: BatchUID,
  data: TimelineData,
  minStartTime?: number,
) => [Milliseconds, Milliseconds] = memoize(unmemoizedGetBatchRange);
