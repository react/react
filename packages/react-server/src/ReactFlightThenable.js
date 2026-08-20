/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Corresponds to ReactFiberWakeable and ReactFizzWakeable modules. Generally,
// changes to one module should be reflected in the others.

// TODO: Rename this module and the corresponding Fiber one to "Thenable"
// instead of "Wakeable". Or some other more appropriate name.

import type {
  Thenable,
  PendingThenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';

import {enableAsyncDebugInfo} from 'shared/ReactFeatureFlags';

import noop from 'shared/noop';

export type ThenableState = Array<Thenable<any>>;

// An error that is thrown (e.g. by `use`) to trigger Suspense. If we
// detect this is caught by userspace, we'll log a warning in development.
export const SuspenseException: mixed = new Error(
  "Suspense Exception: This is not a real error! It's an implementation " +
    'detail of `use` to interrupt the current render. You must either ' +
    'rethrow it immediately, or move the `use` call outside of the ' +
    '`try/catch` block. Capturing without rethrowing will lead to ' +
    'unexpected behavior.\n\n' +
    'To handle async errors, wrap your component in an error boundary, or ' +
    "call the promise's `.catch` method and pass the result to `use`.",
);

export function createThenableState(): ThenableState {
  // The ThenableState is created the first time a component suspends. If it
  // suspends again, we'll reuse the same state.
  return [];
}

export function trackUsedThenable<T>(
  thenableState: ThenableState,
  thenable: Thenable<T>,
  index: number,
): T {
  const previous = thenableState[index];
  if (previous === undefined) {
    thenableState.push(thenable);
    if (__DEV__ && enableAsyncDebugInfo) {
      const stacks: Array<Error> =
        (thenableState as any)._stacks || ((thenableState as any)._stacks = []);
      stacks.push(new Error());
    }
  } else {
    if (previous !== thenable) {
      // Reuse the previous thenable, and drop the new one. We can assume
      // they represent the same value, because components are idempotent.

      // Avoid an unhandled rejection errors for the Promises that we'll
      // intentionally ignore.
      thenable.then(noop, noop);
      thenable = previous;
    }
  }

  // We use an expando to track the status and result of a thenable so that we
  // can synchronously unwrap the value. Think of this as an extension of the
  // Promise API, or a custom interface that is a superset of Thenable.
  //
  // If the thenable doesn't have a status, set it to "pending" and attach
  // a listener that will update its status and result when it resolves.
  switch (thenable.status) {
    case 'fulfilled': {
      // This could be a bad instrumentation that doesn't set .value.
      // We're not type-checking since this is a hot path where you can
      // track down easily when something becomes `undefined` unexpectedly.
      const fulfilledValue: T = thenable.value;
      return fulfilledValue;
    }
    case 'rejected': {
      const rejectedError = thenable.reason;

      // Rejected Promises are rarer so we're doing an extra type-check in
      // case of a bad instrumentation that doesn't set .reason
      // If we end up throwing `undefined` it becomes hard to track down
      // where that throw originated because no callstack would exist.
      // React would still have a Component stack but that could only be used
      // as an approximation.
      if (rejectedError === undefined && !('reason' in thenable)) {
        throw new Error(
          'A rejected Promise was passed to React without a `reason` property. ' +
            'React threw a generic error from where the Promise was used to assist in identifying the problematic Promise. ' +
            "Make sure that instrumented Promises correctly set the `reason` property when setting `status` to `'rejected'`.",
        );
      }

      throw rejectedError;
    }
    default: {
      if (typeof thenable.status === 'string') {
        // Only instrument the thenable if the status if not defined. If
        // it's defined, but an unknown value, assume it's been instrumented by
        // some custom userspace implementation. We treat it as "pending".
        // Attach a dummy listener, to ensure that any lazy initialization can
        // happen. Flight lazily parses JSON when the value is actually awaited.
        thenable.then(noop, noop);
      } else {
        const pendingThenable: PendingThenable<T> = thenable as any;
        pendingThenable.status = 'pending';
        pendingThenable.then(
          fulfilledValue => {
            if (thenable.status === 'pending') {
              const fulfilledThenable: FulfilledThenable<T> = thenable as any;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = fulfilledValue;
            }
          },
          (error: mixed) => {
            if (thenable.status === 'pending') {
              const rejectedThenable: RejectedThenable<T> = thenable as any;
              rejectedThenable.status = 'rejected';
              rejectedThenable.reason = error;
            }
          },
        );
      }

      // Check one more time in case the thenable resolved synchronously
      switch ((thenable as Thenable<T>).status) {
        case 'fulfilled': {
          const fulfilledThenable: FulfilledThenable<T> = thenable as any;
          return fulfilledThenable.value;
        }
        case 'rejected': {
          const rejectedThenable: RejectedThenable<T> = thenable as any;
          throw rejectedThenable.reason;
        }
      }

      // Suspend.
      //
      // Throwing here is an implementation detail that allows us to unwind the
      // call stack. But we shouldn't allow it to leak into userspace. Throw an
      // opaque placeholder value instead of the actual thenable. If it doesn't
      // get captured by the work loop, log a warning, because that means
      // something in userspace must have caught it.
      suspendedThenable = thenable;
      throw SuspenseException;
    }
  }
}

// This is used to track the actual thenable that suspended so it can be
// passed to the rest of the Suspense implementation — which, for historical
// reasons, expects to receive a thenable.
let suspendedThenable: Thenable<any> | null = null;
export function getSuspendedThenable(): Thenable<mixed> {
  // This is called right after `use` suspends by throwing an exception. `use`
  // throws an opaque value instead of the thenable itself so that it can't be
  // caught in userspace. Then the work loop accesses the actual thenable using
  // this function.
  if (suspendedThenable === null) {
    throw new Error(
      'Expected a suspended thenable. This is a bug in React. Please file ' +
        'an issue.',
    );
  }
  const thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
