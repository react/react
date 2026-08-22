/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactRecoverable} from 'shared/ReactTypes';

import hasOwnProperty from 'shared/hasOwnProperty';
import {REACT_RECOVERABLE_TYPE} from 'shared/ReactSymbols';

const browserReasonInitializationFallback =
  'The reason for browser-only rendering could not be determined because its ' +
  'initializer threw.';

export function isReactRecoverable(value: mixed): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    // $FlowFixMe[prop-missing]
    value.$$typeof === REACT_RECOVERABLE_TYPE
  );
}

export function createRecoverableError(recoverable: ReactRecoverable): Error {
  const reason = recoverable._reason;
  let initializedReason;
  if (typeof reason === 'function') {
    try {
      initializedReason = reason();
    } catch {
      // A reason is only diagnostic metadata. Its initializer must not affect
      // whether the renderer can defer the subtree to the browser.
      initializedReason = browserReasonInitializationFallback;
    }
  } else {
    initializedReason = reason;
  }
  // Always create the recoverable at the consumption point so its stack
  // identifies the relevant use() or abort() call. A lazy reason is diagnostic
  // metadata and can be any value supported by Error.cause.
  const error = new Error(
    'Browser-only rendering was requested by `browser()`.',
    reason === undefined ? undefined : {cause: initializedReason},
  );
  Object.defineProperty(error, REACT_RECOVERABLE_TYPE, {value: true});
  return error;
}

export function isRecoverableError(error: mixed): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  return (error as any)[REACT_RECOVERABLE_TYPE] === true;
}

export function cloneRecoverableErrorAsFatal(recoverableError: Error): Error {
  // Create a separate diagnostic for fatal reporting without changing the
  // branded recoverable error that other tasks may still need to observe.
  const fatalRecoverableError = new Error(
    'The server render could not complete because client rendering was ' +
      "requested outside a Suspense boundary. See this error's cause for " +
      'additional details.',
    hasOwnProperty.call(recoverableError, 'cause')
      ? {cause: (recoverableError as any).cause}
      : undefined,
  );
  // Keep the frames captured where the recoverable was consumed, but replace
  // the first line with the fatal error's message.
  const stack = recoverableError.stack;
  if (stack !== undefined) {
    const frameStart = stack.indexOf('\n');
    fatalRecoverableError.stack =
      fatalRecoverableError.name +
      ': ' +
      fatalRecoverableError.message +
      (frameStart === -1 ? '' : stack.slice(frameStart));
  } else {
    (fatalRecoverableError as any).stack = undefined;
  }
  return fatalRecoverableError;
}
