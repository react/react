/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes';
import type {RendererTask} from './ReactSharedInternalsClient';
import ReactSharedInternals from './ReactSharedInternalsClient';
import queueMacrotask from 'shared/enqueueTask';

import {disableLegacyMode} from 'shared/ReactFeatureFlags';

// `act` calls can be nested, so we track the depth. This represents the
// number of `act` scopes on the stack.
let actScopeDepth = 0;

// We only warn the first time you neglect to await an async `act` scope.
let didWarnNoAwaitAct = false;

function aggregateErrors(errors: Array<mixed>): mixed {
  if (errors.length > 1 && typeof AggregateError === 'function') {
    return new AggregateError(errors);
  }
  return errors[0];
}

export function act<T>(callback: () => T | Thenable<T>): Thenable<T> {
  if (__DEV__) {
    // When ReactSharedInternals.actQueue is not null, it signals to React that
    // we're currently inside an `act` scope. React will push all its tasks to
    // this queue instead of scheduling them with platform APIs.
    //
    // We set this to an empty array when we first enter an `act` scope, and
    // only unset it once we've left the outermost `act` scope — remember that
    // `act` calls can be nested.
    //
    // If we're already inside an `act` scope, reuse the existing queue.
    const prevIsBatchingLegacy = !disableLegacyMode
      ? ReactSharedInternals.isBatchingLegacy
      : false;
    const prevActQueue = ReactSharedInternals.actQueue;
    const prevActScopeDepth = actScopeDepth;
    actScopeDepth++;
    const queue = (ReactSharedInternals.actQueue =
      prevActQueue !== null ? prevActQueue : []);
    // Used to reproduce behavior of `batchedUpdates` in legacy mode. Only
    // set to `true` while the given callback is executed, not for updates
    // triggered during an async event, because this is how the legacy
    // implementation of `act` behaved.
    if (!disableLegacyMode) {
      ReactSharedInternals.isBatchingLegacy = true;
    }

    let result;
    // This tracks whether the `act` call is awaited. In certain cases, not
    // awaiting it is a mistake, so we will detect that and warn.
    let didAwaitActCall = false;
    try {
      // Reset this to `false` right before entering the React work loop. The
      // only place we ever read this fields is just below, right after running
      // the callback. So we don't need to reset after the callback runs.
      if (!disableLegacyMode) {
        ReactSharedInternals.didScheduleLegacyUpdate = false;
      }
      result = callback();
      const didScheduleLegacyUpdate = !disableLegacyMode
        ? ReactSharedInternals.didScheduleLegacyUpdate
        : false;

      // Replicate behavior of original `act` implementation in legacy mode,
      // which flushed updates immediately after the scope function exits, even
      // if it's an async function.
      if (!prevIsBatchingLegacy && didScheduleLegacyUpdate) {
        flushActQueue(queue);
      }
      // `isBatchingLegacy` gets reset using the regular stack, not the async
      // one used to track `act` scopes. Why, you may be wondering? Because
      // that's how it worked before version 18. Yes, it's confusing! We should
      // delete legacy mode!!
      if (!disableLegacyMode) {
        ReactSharedInternals.isBatchingLegacy = prevIsBatchingLegacy;
      }
    } catch (error) {
      // `isBatchingLegacy` gets reset using the regular stack, not the async
      // one used to track `act` scopes. Why, you may be wondering? Because
      // that's how it worked before version 18. Yes, it's confusing! We should
      // delete legacy mode!!
      ReactSharedInternals.thrownErrors.push(error);
    }
    if (ReactSharedInternals.thrownErrors.length > 0) {
      if (!disableLegacyMode) {
        ReactSharedInternals.isBatchingLegacy = prevIsBatchingLegacy;
      }
      popActScope(prevActQueue, prevActScopeDepth);
      const thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
      ReactSharedInternals.thrownErrors.length = 0;
      throw thrownError;
    }

    if (
      // $FlowFixMe[invalid-compare]
      result !== null &&
      typeof result === 'object' &&
      // $FlowFixMe[method-unbinding]
      typeof result.then === 'function'
    ) {
      // A promise/thenable was returned from the callback. Wait for it to
      // resolve before flushing the queue.
      //
      // If `act` were implemented as an async function, this whole block could
      // be a single `await` call. That's really the only difference between
      // this branch and the next one.
      const thenable = result as any as Thenable<T>;

      // Warn if the an `act` call with an async scope is not awaited. In a
      // future release, consider making this an error.
      queueSeveralMicrotasks(() => {
        if (!didAwaitActCall && !didWarnNoAwaitAct) {
          didWarnNoAwaitAct = true;
          console.error(
            'You called act(async () => ...) without await. ' +
              'This could lead to unexpected testing behaviour, ' +
              'interleaving multiple act calls and mixing their ' +
              'scopes. ' +
              'You should - await act(async () => ...);',
          );
        }
      });

      return {
        then(resolve: T => mixed, reject: mixed => mixed) {
          didAwaitActCall = true;
          thenable.then(
            returnValue => {
              popActScope(prevActQueue, prevActScopeDepth);
              if (prevActScopeDepth === 0) {
                // We're exiting the outermost `act` scope. Flush the queue.
                try {
                  flushActQueue(queue);
                  queueMacrotask(() =>
                    // Recursively flush tasks scheduled by a microtask.
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject),
                  );
                } catch (error) {
                  // `thenable` might not be a real promise, and `flushActQueue`
                  // might throw, so we need to wrap `flushActQueue` in a
                  // try/catch.
                  ReactSharedInternals.thrownErrors.push(error);
                }
                if (ReactSharedInternals.thrownErrors.length > 0) {
                  const thrownError = aggregateErrors(
                    ReactSharedInternals.thrownErrors,
                  );
                  ReactSharedInternals.thrownErrors.length = 0;
                  reject(thrownError);
                }
              } else {
                resolve(returnValue);
              }
            },
            error => {
              popActScope(prevActQueue, prevActScopeDepth);
              if (ReactSharedInternals.thrownErrors.length > 0) {
                const thrownError = aggregateErrors(
                  ReactSharedInternals.thrownErrors,
                );
                ReactSharedInternals.thrownErrors.length = 0;
                reject(thrownError);
              } else {
                reject(error);
              }
            },
          );
        },
      };
    } else {
      const returnValue: T = result as any;
      // The callback is not an async function. Exit the current
      // scope immediately.
      popActScope(prevActQueue, prevActScopeDepth);
      if (prevActScopeDepth === 0) {
        // We're exiting the outermost `act` scope. Flush the queue.
        flushActQueue(queue);

        // If the queue is not empty, it implies that we intentionally yielded
        // to the main thread, because something suspended. We will continue
        // in an asynchronous task.
        //
        // Warn if something suspends but the `act` call is not awaited.
        // In a future release, consider making this an error.
        if (queue.length !== 0) {
          queueSeveralMicrotasks(() => {
            if (!didAwaitActCall && !didWarnNoAwaitAct) {
              didWarnNoAwaitAct = true;
              console.error(
                'A component suspended inside an `act` scope, but the ' +
                  '`act` call was not awaited. When testing React ' +
                  'components that depend on asynchronous data, you must ' +
                  'await the result:\n\n' +
                  'await act(() => ...)',
              );
            }
          });
        }

        // Like many things in this module, this is next part is confusing.
        //
        // We do not currently require every `act` call that is passed a
        // callback to be awaited, through arguably we should. Since this
        // callback was synchronous, we need to exit the current scope before
        // returning.
        //
        // However, if thenable we're about to return *is* awaited, we'll
        // immediately restore the current scope. So it shouldn't observable.
        //
        // This doesn't affect the case where the scope callback is async,
        // because we always require those calls to be awaited.
        //
        // TODO: In a future version, consider always requiring all `act` calls
        // to be awaited, regardless of whether the callback is sync or async.
        ReactSharedInternals.actQueue = null;
      }

      if (ReactSharedInternals.thrownErrors.length > 0) {
        const thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
        ReactSharedInternals.thrownErrors.length = 0;
        throw thrownError;
      }

      return {
        then(resolve: T => mixed, reject: mixed => mixed) {
          didAwaitActCall = true;
          if (prevActScopeDepth === 0) {
            // If the `act` call is awaited, restore the queue we were
            // using before (see long comment above) so we can flush it.
            ReactSharedInternals.actQueue = queue;
            queueMacrotask(() =>
              // Recursively flush tasks scheduled by a microtask.
              recursivelyFlushAsyncActWork(returnValue, resolve, reject),
            );
          } else {
            resolve(returnValue);
          }
        },
      };
    }
  } else {
    throw new Error('act(...) is not supported in production builds of React.');
  }
}

function popActScope(
  prevActQueue: null | Array<RendererTask>,
  prevActScopeDepth: number,
) {
  if (__DEV__) {
    if (prevActScopeDepth !== actScopeDepth - 1) {
      console.error(
        'You seem to have overlapping act() calls, this is not supported. ' +
          'Be sure to await previous act() calls before making a new one. ',
      );
    }
    actScopeDepth = prevActScopeDepth;
  }
}

function recursivelyFlushAsyncActWork<T>(
  returnValue: T,
  resolve: T => mixed,
  reject: mixed => mixed,
) {
  if (__DEV__) {
    // Check if any tasks were scheduled asynchronously.
    const queue = ReactSharedInternals.actQueue;
    if (queue !== null) {
      if (queue.length !== 0) {
        // Async tasks were scheduled, mostly likely in a microtask.
        // Keep flushing until there are no more.
        try {
          flushActQueue(queue);
          // The work we just performed may have schedule additional async
          // tasks. Wait a macrotask and check again.
          queueMacrotask(() =>
            recursivelyFlushAsyncActWork(returnValue, resolve, reject),
          );
          return;
        } catch (error) {
          // Leave remaining tasks on the queue if something throws.
          ReactSharedInternals.thrownErrors.push(error);
        }
      } else {
        // The queue is empty. We can finish.
        ReactSharedInternals.actQueue = null;
      }
    }
    if (ReactSharedInternals.thrownErrors.length > 0) {
      const thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
      ReactSharedInternals.thrownErrors.length = 0;
      reject(thrownError);
    } else {
      resolve(returnValue);
    }
  }
}

let isFlushing = false;
function flushActQueue(queue: Array<RendererTask>) {
  if (__DEV__) {
    if (!isFlushing) {
      // Prevent re-entrance.
      isFlushing = true;
      let i = 0;
      try {
        for (; i < queue.length; i++) {
          let callback: RendererTask = queue[i];
          do {
            ReactSharedInternals.didUsePromise = false;
            const continuation = callback(false);
            if (continuation !== null) {
              if (ReactSharedInternals.didUsePromise) {
                // The component just suspended. Yield to the main thread in
                // case the promise is already resolved. If so, it will ping in
                // a microtask and we can resume without unwinding the stack.
                queue[i] = callback;
                queue.splice(0, i);
                return;
              }
              callback = continuation;
            } else {
              break;
            }
          } while (true);
        }
        // We flushed the entire queue.
        queue.length = 0;
      } catch (error) {
        // If something throws, leave the remaining callbacks on the queue.
        queue.splice(0, i + 1);
        ReactSharedInternals.thrownErrors.push(error);
      } finally {
        isFlushing = false;
      }
    }
  }
}

// Some of our warnings attempt to detect if the `act` call is awaited by
// checking in an asynchronous task. Wait a few microtasks before checking. The
// only reason one isn't sufficient is we want to accommodate the case where an
// `act` call is returned from an async function without first being awaited,
// since that's a somewhat common pattern. If you do this too many times in a
// nested sequence, you might get a warning, but you can always fix by awaiting
// the call.
//
// A macrotask would also work (and is the fallback) but depending on the test
// environment it may cause the warning to fire too late.
const queueSeveralMicrotasks =
  typeof queueMicrotask === 'function'
    ? (callback: () => void) => {
        queueMicrotask(() => queueMicrotask(callback));
      }
    : queueMacrotask;
