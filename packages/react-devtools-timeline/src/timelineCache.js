/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Thenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';
import type {TimelineData} from './types';

import * as React from 'react';

import {importFile as importFileWorker} from './import-worker';

// This is intentionally a module-level Map, rather than a React-managed one.
// Otherwise, refreshing the inspected element cache would also clear this cache.
// Profiler file contents are static anyway.
const fileNameToProfilerDataMap: Map<
  string,
  Thenable<TimelineData>,
> = new Map();

function readRecord<T>(record: Thenable<T>): T | Error {
  if (typeof React.use === 'function') {
    try {
      // eslint-disable-next-line react-hooks-published/rules-of-hooks
      return React.use(record);
    } catch (x) {
      if (record.status === 'rejected') {
        return record.reason as any;
      }
      throw x;
    }
  }
  if (record.status === 'fulfilled') {
    return record.value;
  } else if (record.status === 'rejected') {
    return record.reason as any;
  } else {
    throw record;
  }
}

export function importFile(file: File): TimelineData | Error {
  const fileName = file.name;
  let record = fileNameToProfilerDataMap.get(fileName);

  if (!record) {
    const callbacks = new Set<(value: any) => mixed>();
    const rejectCallbacks = new Set<(reason: mixed) => mixed>();
    const thenable: Thenable<TimelineData> = {
      status: 'pending',
      value: null,
      reason: null,
      then(callback: (value: any) => mixed, reject: (error: mixed) => mixed) {
        callbacks.add(callback);
        rejectCallbacks.add(reject);
      },

      // Optional property used by Timeline:
      displayName: `Importing file "${fileName}"`,
    };

    const wake = () => {
      // This assumes they won't throw.
      callbacks.forEach(callback => callback((thenable as any).value));
      callbacks.clear();
      rejectCallbacks.clear();
    };
    const wakeRejections = () => {
      // This assumes they won't throw.
      rejectCallbacks.forEach(callback => callback((thenable as any).reason));
      rejectCallbacks.clear();
      callbacks.clear();
    };

    record = thenable;

    importFileWorker(file).then(data => {
      switch (data.status) {
        case 'SUCCESS':
          const fulfilledThenable: FulfilledThenable<TimelineData> =
            thenable as any;
          fulfilledThenable.status = 'fulfilled';
          fulfilledThenable.value = data.processedData;
          wake();
          break;
        case 'INVALID_PROFILE_ERROR':
        case 'UNEXPECTED_ERROR':
          const rejectedThenable: RejectedThenable<TimelineData> =
            thenable as any;
          rejectedThenable.status = 'rejected';
          rejectedThenable.reason = data.error;
          wakeRejections();
          break;
      }
    });

    fileNameToProfilerDataMap.set(fileName, record);
  }

  const response = readRecord(record);
  return response;
}
