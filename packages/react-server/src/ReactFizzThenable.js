/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Corresponds to ReactFiberThenable and ReactFlightThenable modules. Generally,
// changes to one module should be reflected in the others.

import type {
  Thenable,
  PendingThenable,
  FulfilledThenable,
  RejectedThenable,
} from 'shared/ReactTypes';
import type {ComponentStackNode} from './ReactFizzComponentStack';

import noop from 'shared/noop';
import {currentTaskInDEV} from './ReactFizzCurrentTask';

export opaque type ThenableState = Array<Thenable<any>>;

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
      if (__DEV__ && shouldCaptureSuspendedCallSite) {
        captureSuspendedCallSite();
      }
      throw SuspenseException;
    }
  }
}

export function readPreviousThenable<T>(
  thenableState: ThenableState,
  index: number,
): void | T {
  const previous = thenableState[index];
  if (previous === undefined) {
    return undefined;
  } else {
    // We assume this has been resolved already.
    return (previous as any).value;
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

let shouldCaptureSuspendedCallSite: boolean = false;
export function setCaptureSuspendedCallSiteDEV(capture: boolean): void {
  if (!__DEV__) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'setCaptureSuspendedCallSiteDEV was called in a production environment. ' +
        'This is a bug in React.',
    );
  }
  shouldCaptureSuspendedCallSite = capture;
}

// DEV-only
let suspendedCallSiteStack: ComponentStackNode | null = null;
let suspendedCallSiteDebugTask: ConsoleTask | null = null;
function captureSuspendedCallSite(): void {
  // This is currently only used when aborting in Fizz.
  // You can only abort the render in Fizz and Flight.
  // In Fiber we only track suspended use via DevTools.
  // In Flight, we track suspended use via async debug info.
  const currentTask = currentTaskInDEV;
  if (currentTask === null) {
    // eslint-disable-next-line react-internal/prod-error-codes -- not a prod error
    throw new Error(
      'Expected to have a current task when tracking a suspend call site. ' +
        'This is a bug in React.',
    );
  }
  const currentComponentStack = currentTask.componentStack;
  if (currentComponentStack === null) {
    // eslint-disable-next-line react-internal/prod-error-codes -- not a prod error
    throw new Error(
      'Expected to have a component stack on the current task when ' +
        'tracking a suspended call site. This is a bug in React.',
    );
  }
  suspendedCallSiteStack = {
    parent: currentComponentStack.parent,
    type: currentComponentStack.type,
    owner: currentComponentStack.owner,
    stack: Error('react-stack-top-frame'),
  };
  // TODO: If this is used in error handlers, the ConsoleTask stack
  // will just be this debugTask + the stack of the abort() call which usually means
  // it's just this debugTask.
  // Ideally we'd be able to reconstruct the owner ConsoleTask as well.
  // The stack of the debugTask would not point to the suspend location anyway.
  // The focus is really on callsite which should be used in captureOwnerStack().
  suspendedCallSiteDebugTask = currentTask.debugTask;
}
export function getSuspendedCallSiteStackDEV(): ComponentStackNode | null {
  if (__DEV__) {
    if (suspendedCallSiteStack === null) {
      return null;
    }
    const callSite = suspendedCallSiteStack;
    suspendedCallSiteStack = null;
    return callSite;
  } else {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'getSuspendedCallSiteDEV was called in a production environment. ' +
        'This is a bug in React.',
    );
  }
}

export function getSuspendedCallSiteDebugTaskDEV(): ConsoleTask | null {
  if (__DEV__) {
    if (suspendedCallSiteDebugTask === null) {
      return null;
    }
    const debugTask = suspendedCallSiteDebugTask;
    suspendedCallSiteDebugTask = null;
    return debugTask;
  } else {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'getSuspendedCallSiteDebugTaskDEV was called in a production environment. ' +
        'This is a bug in React.',
    );
  }
}

export function ensureSuspendableThenableStateDEV(
  thenableState: ThenableState,
): () => void {
  if (__DEV__) {
    const lastThenable = thenableState[thenableState.length - 1];
    // Reset the last thenable back to pending.
    switch (lastThenable.status) {
      case 'fulfilled': {
        const previousThenableValue = lastThenable.value;
        // $FlowFixMe[method-unbinding] We rebind .then immediately.
        const previousThenableThen = lastThenable.then.bind(lastThenable);
        delete lastThenable.value;
        delete (lastThenable as any).status;
        // We'll call .then again if we resuspend. Since we potentially corrupted
        // the internal state of unknown classes, we need to diffuse the potential
        // crash by replacing the .then method with a noop.
        // $FlowFixMe[cannot-write] Custom userspace Thenables may not be but native Promises are.
        lastThenable.then = noop;
        return () => {
          // $FlowFixMe[cannot-write] Custom userspace Thenables may not be but native Promises are.
          lastThenable.then = previousThenableThen;
          lastThenable.value = previousThenableValue;
          lastThenable.status = 'fulfilled';
        };
      }
      case 'rejected': {
        const previousThenableReason = lastThenable.reason;
        // $FlowFixMe[method-unbinding] We rebind .then immediately.
        const previousThenableThen = lastThenable.then.bind(lastThenable);
        delete lastThenable.reason;
        delete (lastThenable as any).status;
        // We'll call .then again if we resuspend. Since we potentially corrupted
        // the internal state of unknown classes, we need to diffuse the potential
        // crash by replacing the .then method with a noop.
        // $FlowFixMe[cannot-write] Custom userspace Thenables may not be but native Promises are.
        lastThenable.then = noop;
        return () => {
          // $FlowFixMe[cannot-write] Custom userspace Thenables may not be but native Promises are.
          lastThenable.then = previousThenableThen;
          lastThenable.reason = previousThenableReason;
          lastThenable.status = 'rejected';
        };
      }
    }
    return noop;
  } else {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'ensureSuspendableThenableStateDEV was called in a production environment. ' +
        'This is a bug in React.',
    );
  }
}
