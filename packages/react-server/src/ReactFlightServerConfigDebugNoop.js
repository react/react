/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AsyncSequence} from './ReactFlightAsyncSequence';

// Exported for runtimes that don't support Promise instrumentation for async debugging.
export function initAsyncDebugInfo(): void {}
export function markAsyncSequenceRootTask(): void {}
export function getCurrentAsyncSequence(): null | AsyncSequence {
  return null;
}
export function getAsyncSequenceFromPromise(
  promise: any,
): null | AsyncSequence {
  return null;
}
