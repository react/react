/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Wakeable,
  Thenable,
  FulfilledThenable,
  RejectedThenable,
  ReactDebugInfo,
  ReactIOInfo,
} from 'shared/ReactTypes';

import {enableAsyncDebugInfo} from 'shared/ReactFeatureFlags';

import {REACT_LAZY_TYPE} from 'shared/ReactSymbols';

import noop from 'shared/noop';

const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

type UninitializedPayload<T> = {
  _status: -1,
  _result: () => Thenable<{default: T, ...}>,
  _ioInfo?: ReactIOInfo, // DEV-only
};

type PendingPayload = {
  _status: 0,
  _result: Wakeable,
  _ioInfo?: ReactIOInfo, // DEV-only
};

type ResolvedPayload<T> = {
  _status: 1,
  _result: {default: T, ...},
  _ioInfo?: ReactIOInfo, // DEV-only
};

type RejectedPayload = {
  _status: 2,
  _result: mixed,
  _ioInfo?: ReactIOInfo, // DEV-only
};

type Payload<T> =
  | UninitializedPayload<T>
  | PendingPayload
  | ResolvedPayload<T>
  | RejectedPayload;

export type LazyComponent<T, P> = {
  $$typeof: symbol | number,
  _payload: P,
  _init: (payload: P) => T,

  // __DEV__
  _debugInfo?: null | ReactDebugInfo,
  _store?: {validated: 0 | 1 | 2, ...}, // 0: not validated, 1: validated, 2: force fail
};

function lazyInitializer<T>(payload: Payload<T>): T {
  if (payload._status === Uninitialized) {
    let resolveDebugValue: (void | T) => void = null as any;
    let rejectDebugValue: mixed => void = null as any;
    if (__DEV__ && enableAsyncDebugInfo) {
      const ioInfo = payload._ioInfo;
      if (ioInfo != null) {
        // Mark when we first kicked off the lazy request.
        // $FlowFixMe[cannot-write]
        ioInfo.start = ioInfo.end = performance.now();
        // Stash a Promise for introspection of the value later.
        // $FlowFixMe[cannot-write]
        ioInfo.value = new Promise((resolve, reject) => {
          resolveDebugValue = resolve;
          rejectDebugValue = reject;
        });
      }
    }
    const ctor = payload._result;
    const thenable = ctor();
    // Transition to the next state.
    // This might throw either because it's missing or throws. If so, we treat it
    // as still uninitialized and try again next time. Which is the same as what
    // happens if the ctor or any wrappers processing the ctor throws. This might
    // end up fixing it if the resolution was a concurrency bug.
    thenable.then(
      moduleObject => {
        if (
          (payload as Payload<T>)._status === Pending ||
          payload._status === Uninitialized
        ) {
          // Transition to the next state.
          const resolved: ResolvedPayload<T> = payload as any;
          resolved._status = Resolved;
          resolved._result = moduleObject;
          if (__DEV__ && enableAsyncDebugInfo) {
            const ioInfo = payload._ioInfo;
            if (ioInfo != null) {
              // Mark the end time of when we resolved.
              // $FlowFixMe[cannot-write]
              ioInfo.end = performance.now();
              // Surface the default export as the resolved "value" for debug purposes.
              const debugValue =
                moduleObject == null ? undefined : moduleObject.default;
              resolveDebugValue(debugValue);
              // $FlowFixMe[incompatible-use]
              // $FlowFixMe[prop-missing]
              ioInfo.value.status = 'fulfilled';
              // $FlowFixMe[incompatible-use]
              // $FlowFixMe[prop-missing]
              ioInfo.value.value = debugValue;
            }
          }
          // Make the thenable introspectable
          // TODO we should move the lazy introspection into the resolveLazy
          // impl or make suspendedThenable be able to be a lazy itself
          if (thenable.status === undefined) {
            const fulfilledThenable: FulfilledThenable<{default: T, ...}> =
              thenable as any;
            fulfilledThenable.status = 'fulfilled';
            fulfilledThenable.value = moduleObject;
          }
        }
      },
      error => {
        if (
          (payload as Payload<T>)._status === Pending ||
          payload._status === Uninitialized
        ) {
          // Transition to the next state.
          const rejected: RejectedPayload = payload as any;
          rejected._status = Rejected;
          rejected._result = error;
          if (__DEV__ && enableAsyncDebugInfo) {
            const ioInfo = payload._ioInfo;
            if (ioInfo != null) {
              // Mark the end time of when we rejected.
              // $FlowFixMe[cannot-write]
              ioInfo.end = performance.now();
              // Hide unhandled rejections.
              // $FlowFixMe[incompatible-use]
              ioInfo.value.then(noop, noop);
              rejectDebugValue(error);
              // $FlowFixMe[incompatible-use]
              // $FlowFixMe[prop-missing]
              ioInfo.value.status = 'rejected';
              // $FlowFixMe[incompatible-use]
              // $FlowFixMe[prop-missing]
              ioInfo.value.reason = error;
            }
          }
          // Make the thenable introspectable
          // TODO we should move the lazy introspection into the resolveLazy
          // impl or make suspendedThenable be able to be a lazy itself
          if (thenable.status === undefined) {
            const rejectedThenable: RejectedThenable<{default: T, ...}> =
              thenable as any;
            rejectedThenable.status = 'rejected';
            rejectedThenable.reason = error;
          }
        }
      },
    );
    if (__DEV__ && enableAsyncDebugInfo) {
      const ioInfo = payload._ioInfo;
      if (ioInfo != null) {
        const displayName = thenable.displayName;
        if (typeof displayName === 'string') {
          // $FlowFixMe[cannot-write]
          ioInfo.name = displayName;
        }
      }
    }
    if (payload._status === Uninitialized) {
      // In case, we're still uninitialized, then we're waiting for the thenable
      // to resolve. Set it as pending in the meantime.
      const pending: PendingPayload = payload as any;
      pending._status = Pending;
      pending._result = thenable;
    }
  }
  if (payload._status === Resolved) {
    const moduleObject = payload._result;
    if (__DEV__) {
      if (moduleObject === undefined) {
        console.error(
          'lazy: Expected the result of a dynamic imp' +
            'ort() call. ' +
            'Instead received: %s\n\nYour code should look like: \n  ' +
            // Break up imports to avoid accidentally parsing them as dependencies.
            'const MyComponent = lazy(() => imp' +
            "ort('./MyComponent'))\n\n" +
            'Did you accidentally put curly braces around the import?',
          moduleObject,
        );
      }
    }
    if (__DEV__) {
      if (!('default' in moduleObject)) {
        console.error(
          'lazy: Expected the result of a dynamic imp' +
            'ort() call. ' +
            'Instead received: %s\n\nYour code should look like: \n  ' +
            // Break up imports to avoid accidentally parsing them as dependencies.
            'const MyComponent = lazy(() => imp' +
            "ort('./MyComponent'))",
          moduleObject,
        );
      }
    }
    return moduleObject.default;
  } else {
    throw payload._result;
  }
}

export function lazy<T>(
  ctor: () => Thenable<{default: T, ...}>,
): LazyComponent<T, Payload<T>> {
  const payload: Payload<T> = {
    // We use these fields to store the result.
    _status: Uninitialized,
    _result: ctor,
  };

  const lazyType: LazyComponent<T, Payload<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: lazyInitializer,
  };

  if (__DEV__ && enableAsyncDebugInfo) {
    // TODO: We should really track the owner here but currently ReactIOInfo
    // can only contain ReactComponentInfo and not a Fiber. It's unusual to
    // create a lazy inside an owner though since they should be in module scope.
    const owner = null;
    const ioInfo: ReactIOInfo = {
      name: 'lazy',
      start: -1,
      end: -1,
      value: null,
      owner: owner,
      debugStack: new Error('react-stack-top-frame'),
      // eslint-disable-next-line react-internal/no-production-logging
      debugTask: console.createTask ? console.createTask('lazy()') : null,
    };
    payload._ioInfo = ioInfo;
    // Add debug info to the lazy, but this doesn't have an await stack yet.
    // That will be inferred by later usage.
    lazyType._debugInfo = [{awaited: ioInfo}];
  }

  return lazyType;
}
