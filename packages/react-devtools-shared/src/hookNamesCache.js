/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {__DEBUG__} from 'react-devtools-shared/src/constants';

import type {HooksTree} from 'react-debug-tools/src/ReactDebugHooks';
import type {
  Thenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';
import type {
  Element,
  HookNames,
} from 'react-devtools-shared/src/frontend/types';
import type {FetchFileWithCaching} from 'react-devtools-shared/src/devtools/views/Components/FetchFileWithCachingContext';

import * as React from 'react';

import {withCallbackPerfMeasurements} from './PerformanceLoggingUtils';
import {logEvent} from './Logger';

const TIMEOUT = 30000;
function readRecord<T>(record: Thenable<T>): T | null {
  if (typeof React.use === 'function') {
    try {
      // eslint-disable-next-line react-hooks-published/rules-of-hooks
      return React.use(record);
    } catch (x) {
      if (record.status === 'rejected') {
        return null;
      }
      throw x;
    }
  }
  if (record.status === 'fulfilled') {
    return record.value;
  } else if (record.status === 'rejected') {
    return null;
  } else {
    throw record;
  }
}

type LoadHookNamesFunction = (
  hookLog: HooksTree,
  fetchFileWithCaching: FetchFileWithCaching | null,
) => Thenable<HookNames>;

// This is intentionally a module-level Map, rather than a React-managed one.
// Otherwise, refreshing the inspected element cache would also clear this cache.
// TODO Rethink this if the React API constraints change.
// See https://github.com/reactwg/react-18/discussions/25#discussioncomment-980435
let map: WeakMap<Element, Thenable<HookNames>> = new WeakMap();

export function hasAlreadyLoadedHookNames(element: Element): boolean {
  const record = map.get(element);
  return record != null && record.status === 'fulfilled';
}

export function getAlreadyLoadedHookNames(element: Element): HookNames | null {
  const record = map.get(element);
  if (record != null && record.status === 'fulfilled') {
    return record.value;
  }
  return null;
}

export function loadHookNames(
  element: Element,
  hooksTree: HooksTree,
  loadHookNamesFunction: LoadHookNamesFunction,
  fetchFileWithCaching: FetchFileWithCaching | null,
): HookNames | null {
  let record = map.get(element);

  // $FlowFixMe[constant-condition]
  if (__DEBUG__) {
    console.groupCollapsed('loadHookNames() record:');
    console.log(record);
    console.groupEnd();
  }

  if (!record) {
    const callbacks = new Set<(value: any) => mixed>();
    const rejectCallbacks = new Set<(reason: mixed) => mixed>();
    const thenable: Thenable<HookNames> = {
      status: 'pending',
      value: null,
      reason: null,
      then(callback: (value: any) => mixed, reject: (error: mixed) => mixed) {
        callbacks.add(callback);
        rejectCallbacks.add(reject);
      },

      // Optional property used by Timeline:
      displayName: `Loading hook names for ${element.displayName || 'Unknown'}`,
    };

    let timeoutID: $FlowFixMe | null;
    let didTimeout = false;
    let status: 'success' | 'error' | 'timeout' | 'unknown' = 'unknown';
    let resolvedHookNames: HookNames | null = null;

    const wake = () => {
      if (timeoutID) {
        clearTimeout(timeoutID);
        timeoutID = null;
      }

      // This assumes they won't throw.
      callbacks.forEach(callback => callback((thenable as any).value));
      callbacks.clear();
      rejectCallbacks.clear();
    };
    const wakeRejections = () => {
      if (timeoutID) {
        clearTimeout(timeoutID);
        timeoutID = null;
      }
      // This assumes they won't throw.
      rejectCallbacks.forEach(callback => callback((thenable as any).reason));
      rejectCallbacks.clear();
      callbacks.clear();
    };

    const handleLoadComplete = (durationMs: number): void => {
      // Log duration for parsing hook names
      logEvent({
        event_name: 'load-hook-names',
        event_status: status,
        duration_ms: durationMs,
        inspected_element_display_name: element.displayName,
        inspected_element_number_of_hooks: resolvedHookNames?.size ?? null,
      });
    };

    record = thenable;

    withCallbackPerfMeasurements(
      'loadHookNames',
      done => {
        loadHookNamesFunction(hooksTree, fetchFileWithCaching).then(
          function onSuccess(hookNames) {
            if (didTimeout) {
              return;
            }

            // $FlowFixMe[constant-condition]
            if (__DEBUG__) {
              console.log('[hookNamesCache] onSuccess() hookNames:', hookNames);
            }

            if (hookNames) {
              const fulfilledThenable: FulfilledThenable<HookNames> =
                thenable as any;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = hookNames;
              status = 'success';
              resolvedHookNames = hookNames;
              done();
              wake();
            } else {
              const notFoundThenable: RejectedThenable<HookNames> =
                thenable as any;
              notFoundThenable.status = 'rejected';
              notFoundThenable.reason = null;
              status = 'error';
              resolvedHookNames = hookNames;
              done();
              wakeRejections();
            }
          },
          function onError(error) {
            if (didTimeout) {
              return;
            }

            // $FlowFixMe[constant-condition]
            if (__DEBUG__) {
              console.log('[hookNamesCache] onError()');
            }

            console.error(error);

            const rejectedThenable: RejectedThenable<HookNames> =
              thenable as any;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = null;

            status = 'error';
            done();
            wakeRejections();
          },
        );

        // Eventually timeout and stop trying to load names.
        timeoutID = setTimeout(function onTimeout() {
          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            console.log('[hookNamesCache] onTimeout()');
          }

          timeoutID = null;

          didTimeout = true;

          const timedoutThenable: RejectedThenable<HookNames> = thenable as any;
          timedoutThenable.status = 'rejected';
          timedoutThenable.reason = null;

          status = 'timeout';
          done();
          wakeRejections();
        }, TIMEOUT);
      },
      handleLoadComplete,
    );
    map.set(element, record);
  }

  const response = readRecord(record);
  return response;
}

export function clearHookNamesCache(): void {
  map = new WeakMap();
}
