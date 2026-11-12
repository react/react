/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Used as a way to call batchedUpdates when we don't have a reference to
// the renderer. Such as when we're dispatching events or if third party
// libraries need to call batchedUpdates. Eventually, this API will go away when
// everything is batched by default. We'll then have a similar API to opt-out of
// scheduled work and instead do synchronous work.

// Defaults
let batchedUpdatesImpl = function (fn, bookkeeping) {
  return fn(bookkeeping);
};
let discreteUpdatesImpl = function (fn, a, b, c, d) {
  return fn(a, b, c, d);
};

let isInsideEventHandler = false;

export function batchedUpdates(fn, bookkeeping) {
  if (isInsideEventHandler) {
    // If we are currently inside another batch, we need to wait until it
    // fully completes before restoring state.
    return fn(bookkeeping);
  }
  isInsideEventHandler = true;
  try {
    return batchedUpdatesImpl(fn, bookkeeping);
  } finally {
    isInsideEventHandler = false;
  }
}

export function discreteUpdates(fn, a, b, c, d) {
  const prevIsInsideEventHandler = isInsideEventHandler;
  isInsideEventHandler = true;
  try {
    return discreteUpdatesImpl(fn, a, b, c, d);
  } finally {
    isInsideEventHandler = prevIsInsideEventHandler;
  }
}

export function setBatchingImplementation(
  _batchedUpdatesImpl,
  _discreteUpdatesImpl,
) {
  batchedUpdatesImpl = _batchedUpdatesImpl;
  discreteUpdatesImpl = _discreteUpdatesImpl;
}
