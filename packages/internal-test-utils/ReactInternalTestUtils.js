/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as SchedulerMock from 'scheduler/unstable_mock';
import {diff} from 'jest-diff';
import {equals} from '@jest/expect-utils';
import enqueueTask from './enqueueTask';
import simulateBrowserEventDispatch from './simulateBrowserEventDispatch';
import {
  clearLogs,
  clearWarnings,
  clearErrors,
  createLogAssertion,
} from './consoleMock';
export {getDebugInfo} from './debugInfo';
export {act, serverAct} from './internalAct';
const {assertConsoleLogsCleared} = require('internal-test-utils/consoleMock');

import {thrownErrors, actingUpdatesScopeDepth} from './internalAct';

function assertYieldsWereCleared(caller) {
  const actualYields = SchedulerMock.unstable_clearLog();
  if (actualYields.length !== 0) {
    const error = Error(
      'The event log is not empty. Call assertLog(...) first.',
    );
    Error.captureStackTrace(error, caller);
    throw error;
  }
  assertConsoleLogsCleared();
}

export async function waitForMicrotasks() {
  return new Promise(resolve => {
    enqueueTask(() => resolve());
  });
}

export async function waitFor(expectedLog, options) {
  assertYieldsWereCleared(waitFor);

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, waitFor);

  const stopAfter = expectedLog.length;
  const actualLog = [];
  do {
    // Wait until end of current task/microtask.
    await waitForMicrotasks();
    if (SchedulerMock.unstable_hasPendingWork()) {
      SchedulerMock.unstable_flushNumberOfYields(stopAfter - actualLog.length);
      actualLog.push(...SchedulerMock.unstable_clearLog());
      if (stopAfter > actualLog.length) {
        // Continue flushing until we've logged the expected number of items.
      } else {
        // Once we've reached the expected sequence, wait one more microtask to
        // flush any remaining synchronous work.
        await waitForMicrotasks();
        actualLog.push(...SchedulerMock.unstable_clearLog());
        break;
      }
    } else {
      // There's no pending work, even after a microtask.
      break;
    }
  } while (true);

  if (options && options.additionalLogsAfterAttemptingToYield) {
    expectedLog = expectedLog.concat(
      options.additionalLogsAfterAttemptingToYield,
    );
  }

  if (equals(actualLog, expectedLog)) {
    return;
  }

  error.message = `
Expected sequence of events did not occur.

${diff(expectedLog, actualLog)}
`;
  throw error;
}

export async function waitForAll(expectedLog) {
  assertYieldsWereCleared(waitForAll);

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, waitForAll);

  do {
    // Wait until end of current task/microtask.
    await waitForMicrotasks();
    if (!SchedulerMock.unstable_hasPendingWork()) {
      // There's no pending work, even after a microtask. Stop flushing.
      break;
    }
    SchedulerMock.unstable_flushAllWithoutAsserting();
  } while (true);

  const actualLog = SchedulerMock.unstable_clearLog();
  if (equals(actualLog, expectedLog)) {
    return;
  }

  error.message = `
Expected sequence of events did not occur.

${diff(expectedLog, actualLog)}
`;
  throw error;
}

function aggregateErrors(errors: Array<mixed>): mixed {
  if (errors.length > 1 && typeof AggregateError === 'function') {
    return new AggregateError(errors);
  }
  return errors[0];
}

export async function waitForThrow(expectedError: mixed): mixed {
  assertYieldsWereCleared(waitForThrow);

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, waitForThrow);

  do {
    // Wait until end of current task/microtask.
    await waitForMicrotasks();
    if (!SchedulerMock.unstable_hasPendingWork()) {
      // There's no pending work, even after a microtask. Stop flushing.
      error.message = 'Expected something to throw, but nothing did.';
      throw error;
    }

    const errorHandlerDOM = function (event: ErrorEvent) {
      // Prevent logs from reprinting this error.
      event.preventDefault();
      thrownErrors.push(event.error);
    };
    const errorHandlerNode = function (err: mixed) {
      thrownErrors.push(err);
    };
    // We track errors that were logged globally as if they occurred in this scope and then rethrow them.
    if (actingUpdatesScopeDepth === 0) {
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
      SchedulerMock.unstable_flushAllWithoutAsserting();
    } catch (x) {
      thrownErrors.push(x);
    } finally {
      if (actingUpdatesScopeDepth === 0) {
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
      }
    }
    if (thrownErrors.length > 0) {
      const thrownError = aggregateErrors(thrownErrors);
      thrownErrors.length = 0;

      if (expectedError === undefined) {
        // If no expected error was provided, then assume the caller is OK with
        // any error being thrown. We're returning the error so they can do
        // their own checks, if they wish.
        return thrownError;
      }
      if (equals(thrownError, expectedError)) {
        return thrownError;
      }
      if (
        typeof expectedError === 'string' &&
        typeof thrownError === 'object' &&
        thrownError !== null &&
        typeof thrownError.message === 'string'
      ) {
        if (thrownError.message.includes(expectedError)) {
          return thrownError;
        } else {
          error.message = `
Expected error was not thrown.

${diff(expectedError, thrownError.message)}
`;
          throw error;
        }
      }
      error.message = `
Expected error was not thrown.

${diff(expectedError, thrownError)}
`;
      throw error;
    }
  } while (true);
}

// This is prefixed with `unstable_` because you should almost always try to
// avoid using it in tests. It's really only for testing a particular
// implementation detail (update starvation prevention).
export async function unstable_waitForExpired(expectedLog): mixed {
  assertYieldsWereCleared(unstable_waitForExpired);

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, unstable_waitForExpired);

  // Wait until end of current task/microtask.
  await waitForMicrotasks();
  SchedulerMock.unstable_flushExpired();

  const actualLog = SchedulerMock.unstable_clearLog();
  if (equals(actualLog, expectedLog)) {
    return;
  }

  error.message = `
Expected sequence of events did not occur.

${diff(expectedLog, actualLog)}
`;
  throw error;
}

// TODO: This name is a bit misleading currently because it will stop as soon as
// React yields for any reason, not just for a paint. I've left it this way for
// now because that's how untable_flushUntilNextPaint already worked, but maybe
// we should split these use cases into separate APIs.
export async function waitForPaint(expectedLog) {
  assertYieldsWereCleared(waitForPaint);

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, waitForPaint);

  // Wait until end of current task/microtask.
  await waitForMicrotasks();
  if (SchedulerMock.unstable_hasPendingWork()) {
    // Flush until React yields.
    SchedulerMock.unstable_flushUntilNextPaint();
    // Wait one more microtask to flush any remaining synchronous work.
    await waitForMicrotasks();
  }

  const actualLog = SchedulerMock.unstable_clearLog();
  if (equals(actualLog, expectedLog)) {
    return;
  }

  error.message = `
Expected sequence of events did not occur.

${diff(expectedLog, actualLog)}
`;
  throw error;
}

export async function waitForDiscrete(expectedLog) {
  assertYieldsWereCleared(waitForDiscrete);

  // Create the error object before doing any async work, to get a better
  // stack trace.
  const error = new Error();
  Error.captureStackTrace(error, waitForDiscrete);

  // Wait until end of current task/microtask.
  await waitForMicrotasks();

  const actualLog = SchedulerMock.unstable_clearLog();
  if (equals(actualLog, expectedLog)) {
    return;
  }

  error.message = `
Expected sequence of events did not occur.

${diff(expectedLog, actualLog)}
`;
  throw error;
}

export function assertLog(expectedLog) {
  const actualLog = SchedulerMock.unstable_clearLog();
  if (equals(actualLog, expectedLog)) {
    return;
  }

  const error = new Error(`
Expected sequence of events did not occur.

${diff(expectedLog, actualLog)}
`);
  Error.captureStackTrace(error, assertLog);
  throw error;
}

export const assertConsoleLogDev = createLogAssertion(
  'log',
  'assertConsoleLogDev',
  clearLogs,
);
export const assertConsoleWarnDev = createLogAssertion(
  'warn',
  'assertConsoleWarnDev',
  clearWarnings,
);
export const assertConsoleErrorDev = createLogAssertion(
  'error',
  'assertConsoleErrorDev',
  clearErrors,
);

// Simulates dispatching events, waiting for microtasks in between.
// This matches the browser behavior, which will flush microtasks
// between each event handler. This will allow discrete events to
// flush between events across different event handlers.
export async function simulateEventDispatch(
  node: Node,
  eventType: string,
): Promise<void> {
  // Ensure the node is in the document.
  for (let current = node; current; current = current.parentNode) {
    if (current === document) {
      break;
    } else if (current.parentNode == null) {
      return;
    }
  }

  const customEvent = new Event(eventType, {
    bubbles: true,
  });

  Object.defineProperty(customEvent, 'target', {
    // Override the target to the node on which we dispatched the event.
    value: node,
  });

  const impl = Object.getOwnPropertySymbols(node)[0];
  const oldDispatch = node[impl].dispatchEvent;
  try {
    node[impl].dispatchEvent = simulateBrowserEventDispatch;

    await node.dispatchEvent(customEvent);
  } finally {
    node[impl].dispatchEvent = oldDispatch;
  }
}
