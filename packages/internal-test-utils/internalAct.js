/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// This version of `act` is only used by our tests. Unlike the public version
// of `act`, it's designed to work identically in both production and
// development. It may have slightly different behavior from the public
// version, too, since our constraints in our test suite are not the same as
// those of developers using React — we're testing React itself, as opposed to
// building an app with React.

import type {Thenable} from 'shared/ReactTypes';

import * as Scheduler from 'scheduler/unstable_mock';

import enqueueTask from './enqueueTask';
import {assertConsoleLogsCleared} from './consoleMock';
import {diff} from 'jest-diff';

export let actingUpdatesScopeDepth: number = 0;

export const thrownErrors: Array<mixed> = [];

async function waitForMicrotasks() {
  return new Promise(resolve => {
    enqueueTask(() => resolve());
  });
}

function aggregateErrors(errors: Array<mixed>): mixed {
  if (errors.length > 1 && typeof AggregateError === 'function') {
    return new AggregateError(errors);
  }
  return errors[0];
}

export async function act<T>(scope: () => Thenable<T>): Thenable<T> {
  if (Scheduler.unstable_flushUntilNextPaint === undefined) {
    throw Error(
      'This version of `act` requires a special mock build of Scheduler.',
    );
  }

  const actualYields = Scheduler.unstable_clearLog();
  if (actualYields.length !== 0) {
    const error = Error(
      'Log of yielded values is not empty. Call assertLog first.\n\n' +
        `Received:\n${diff('', actualYields.join('\n'), {
          omitAnnotationLines: true,
        })}`,
    );
    Error.captureStackTrace(error, act);
    throw error;
  }

  // We require every `act` call to assert console logs
  // with one of the assertion helpers. Fails if not empty.
  assertConsoleLogsCleared();

  // $FlowFixMe[cannot-resolve-name]: Flow doesn't know about global Jest object
  if (!jest.isMockFunction(setTimeout)) {
    throw Error(
      "This version of `act` requires Jest's timer mocks " +
        '(i.e. jest.useFakeTimers).',
    );
  }

  const previousIsActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
  const previousActingUpdatesScopeDepth = actingUpdatesScopeDepth;
  actingUpdatesScopeDepth++;
  if (actingUpdatesScopeDepth === 1) {
    // Because this is not the "real" `act`, we set this to `false` so React
    // knows not to fire `act` warnings.
    global.IS_REACT_ACT_ENVIRONMENT = false;
  }

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, act);

  // Call the provided scope function after an async gap. This is an extra
  // precaution to ensure that our tests do not accidentally rely on the act
  // scope adding work to the queue synchronously. We don't do this in the
  // public version of `act`, though we maybe should in the future.
  await waitForMicrotasks();

  const errorHandlerDOM = function (event: ErrorEvent) {
    // Prevent logs from reprinting this error.
    event.preventDefault();
    thrownErrors.push(event.error);
  };
  const errorHandlerNode = function (err: mixed) {
    thrownErrors.push(err);
  };
  // We track errors that were logged globally as if they occurred in this scope and then rethrow them.
  if (actingUpdatesScopeDepth === 1) {
    if (
      typeof window === 'object' &&
      typeof window.addEventListener === 'function'
    ) {
      // We're in a JS DOM environment.
      window.addEventListener('error', errorHandlerDOM);
    } else if (typeof process === 'object') {
      // Node environment
      process.on('uncaughtException', errorHandlerNode);
    }
  }

  try {
    const result = await scope();

    do {
      // Wait until end of current task/microtask.
      await waitForMicrotasks();

      // $FlowFixMe[cannot-resolve-name]: Flow doesn't know about global Jest object
      if (jest.isEnvironmentTornDown()) {
        error.message =
          'The Jest environment was torn down before `act` completed. This ' +
          'probably means you forgot to `await` an `act` call.';
        throw error;
      }

      if (!Scheduler.unstable_hasPendingWork()) {
        // $FlowFixMe[cannot-resolve-name]: Flow doesn't know about global Jest object
        const j = jest;
        if (j.getTimerCount() > 0) {
          // There's a pending timer. Flush it now. We only do this in order to
          // force Suspense fallbacks to display; the fact that it's a timer
          // is an implementation detail. If there are other timers scheduled,
          // those will also fire now, too, which is not ideal. (The public
          // version of `act` doesn't do this.) For this reason, we should try
          // to avoid using timers in our internal tests.
          j.runAllTicks();
          j.runOnlyPendingTimers();
          // If a committing a fallback triggers another update, it might not
          // get scheduled until a microtask. So wait one more time.
          await waitForMicrotasks();
        }
        if (Scheduler.unstable_hasPendingWork()) {
          // Committing a fallback scheduled additional work. Continue flushing.
        } else {
          // There's no pending work, even after both the microtask queue
          // and the timer queue are empty. Stop flushing.
          break;
        }
      }
      // flushUntilNextPaint stops when React yields execution. Allow microtasks
      // queue to flush before continuing.
      Scheduler.unstable_flushUntilNextPaint();
    } while (true);

    if (thrownErrors.length > 0) {
      // Rethrow any errors logged by the global error handling.
      const thrownError = aggregateErrors(thrownErrors);
      thrownErrors.length = 0;
      throw thrownError;
    }

    // $FlowFixMe[incompatible-type]
    return result;
  } finally {
    const depth = actingUpdatesScopeDepth;
    if (depth === 1) {
      if (
        typeof window === 'object' &&
        typeof window.addEventListener === 'function'
      ) {
        // We're in a JS DOM environment.
        window.removeEventListener('error', errorHandlerDOM);
      } else if (typeof process === 'object') {
        // Node environment
        process.off('uncaughtException', errorHandlerNode);
      }
      global.IS_REACT_ACT_ENVIRONMENT = previousIsActEnvironment;
    }
    actingUpdatesScopeDepth = depth - 1;

    if (actingUpdatesScopeDepth !== previousActingUpdatesScopeDepth) {
      // if it's _less than_ previousActingUpdatesScopeDepth, then we can
      // assume the 'other' one has warned
      Scheduler.unstable_clearLog();
      error.message =
        'You seem to have overlapping act() calls, this is not supported. ' +
        'Be sure to await previous act() calls before making a new one. ';
      throw error;
    }
  }
}

async function waitForTasksAndTimers(error: Error) {
  do {
    // Wait until end of current task/microtask.
    await waitForMicrotasks();

    // $FlowFixMe[cannot-resolve-name]: Flow doesn't know about global Jest object
    if (jest.isEnvironmentTornDown()) {
      error.message =
        'The Jest environment was torn down before `act` completed. This ' +
        'probably means you forgot to `await` an `act` call.';
      throw error;
    }

    // $FlowFixMe[cannot-resolve-name]: Flow doesn't know about global Jest object
    const j = jest;
    if (j.getTimerCount() > 0) {
      // There's a pending timer. Flush it now. We only do this in order to
      // force Suspense fallbacks to display; the fact that it's a timer
      // is an implementation detail. If there are other timers scheduled,
      // those will also fire now, too, which is not ideal. (The public
      // version of `act` doesn't do this.) For this reason, we should try
      // to avoid using timers in our internal tests.
      j.runAllTicks();
      j.runOnlyPendingTimers();
      // If a committing a fallback triggers another update, it might not
      // get scheduled until a microtask. So wait one more time.
      await waitForMicrotasks();
    } else {
      break;
    }
  } while (true);
}

export async function serverAct<T>(scope: () => Thenable<T>): Thenable<T> {
  // We require every `act` call to assert console logs
  // with one of the assertion helpers. Fails if not empty.
  assertConsoleLogsCleared();

  // $FlowFixMe[cannot-resolve-name]: Flow doesn't know about global Jest object
  if (!jest.isMockFunction(setTimeout)) {
    throw Error(
      "This version of `act` requires Jest's timer mocks " +
        '(i.e. jest.useFakeTimers).',
    );
  }

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, act);

  // Call the provided scope function after an async gap. This is an extra
  // precaution to ensure that our tests do not accidentally rely on the act
  // scope adding work to the queue synchronously. We don't do this in the
  // public version of `act`, though we maybe should in the future.
  await waitForMicrotasks();

  const errorHandlerNode = function (err: mixed) {
    thrownErrors.push(err);
  };
  // We track errors that were logged globally as if they occurred in this scope and then rethrow them.
  if (typeof process === 'object') {
    // Node environment
    process.on('uncaughtException', errorHandlerNode);
  } else if (
    typeof window === 'object' &&
    typeof window.addEventListener === 'function'
  ) {
    throw new Error('serverAct is not supported in JSDOM environments');
  }

  try {
    const promise = scope();
    // $FlowFixMe[prop-missing]
    if (promise && typeof promise.catch === 'function') {
      // $FlowFixMe[incompatible-use]
      promise.catch(() => {}); // Handle below
    }
    // See if we need to do some work to unblock the promise first.
    await waitForTasksAndTimers(error);
    const result = await promise;
    // Then wait to flush the result.
    await waitForTasksAndTimers(error);

    if (thrownErrors.length > 0) {
      // Rethrow any errors logged by the global error handling.
      const thrownError = aggregateErrors(thrownErrors);
      thrownErrors.length = 0;
      throw thrownError;
    }

    // $FlowFixMe[incompatible-type]
    return result;
  } finally {
    if (typeof process === 'object') {
      // Node environment
      process.off('uncaughtException', errorHandlerNode);
    }
  }
}
