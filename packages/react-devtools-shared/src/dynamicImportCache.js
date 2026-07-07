/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {__DEBUG__} from 'react-devtools-shared/src/constants';

import type {
  Thenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';

import * as React from 'react';

const TIMEOUT = 30000;

type Module = any;
type ModuleLoaderFunction = () => Thenable<Module>;

// This is intentionally a module-level Map, rather than a React-managed one.
// Otherwise, refreshing the inspected element cache would also clear this cache.
// Modules are static anyway.
const moduleLoaderFunctionToModuleMap: Map<ModuleLoaderFunction, Module> =
  new Map();
function readRecord<T>(record: Thenable<T>): T | null {
  if (typeof React.use === 'function') {
    try {
      // eslint-disable-next-line react-hooks-published/rules-of-hooks
      return React.use(record);
    } catch (x) {
      if (x === null) {
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

// TODO Flow type
export function loadModule(moduleLoaderFunction: ModuleLoaderFunction): Module {
  let record = moduleLoaderFunctionToModuleMap.get(moduleLoaderFunction);

  // $FlowFixMe[constant-condition]
  if (__DEBUG__) {
    console.log(
      `[dynamicImportCache] loadModule("${moduleLoaderFunction.name}")`,
    );
  }

  if (!record) {
    const callbacks = new Set<(value: any) => mixed>();
    const rejectCallbacks = new Set<(reason: mixed) => mixed>();
    const thenable: Thenable<Module> = {
      status: 'pending',
      value: null,
      reason: null,
      then(callback: (value: any) => mixed, reject: (error: mixed) => mixed) {
        callbacks.add(callback);
        rejectCallbacks.add(reject);
      },

      // Optional property used by Timeline:
      displayName: `Loading module "${moduleLoaderFunction.name}"`,
    };

    const wake = () => {
      if (timeoutID) {
        clearTimeout(timeoutID);
        timeoutID = null;
      }

      // This assumes they won't throw.
      callbacks.forEach(callback => callback());
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

    record = thenable;

    let didTimeout = false;

    moduleLoaderFunction().then(
      module => {
        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          console.log(
            `[dynamicImportCache] loadModule("${moduleLoaderFunction.name}") then()`,
          );
        }

        if (didTimeout) {
          return;
        }

        const fulfilledThenable: FulfilledThenable<Module> = thenable as any;
        fulfilledThenable.status = 'fulfilled';
        fulfilledThenable.value = module;

        wake();
      },
      error => {
        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          console.log(
            `[dynamicImportCache] loadModule("${moduleLoaderFunction.name}") catch()`,
          );
        }

        if (didTimeout) {
          return;
        }

        console.log(error);

        const rejectedThenable: RejectedThenable<Module> = thenable as any;
        rejectedThenable.status = 'rejected';
        rejectedThenable.reason = error;

        wakeRejections();
      },
    );

    // Eventually timeout and stop trying to load the module.
    let timeoutID: null | TimeoutID = setTimeout(function onTimeout() {
      // $FlowFixMe[constant-condition]
      if (__DEBUG__) {
        console.log(
          `[dynamicImportCache] loadModule("${moduleLoaderFunction.name}") onTimeout()`,
        );
      }

      timeoutID = null;

      didTimeout = true;

      const rejectedThenable: RejectedThenable<Module> = thenable as any;
      rejectedThenable.status = 'rejected';
      rejectedThenable.reason = null;

      wakeRejections();
    }, TIMEOUT);

    moduleLoaderFunctionToModuleMap.set(moduleLoaderFunction, record);
  }

  // $FlowFixMe[underconstrained-implicit-instantiation]
  const response = readRecord(record);
  return response;
}
