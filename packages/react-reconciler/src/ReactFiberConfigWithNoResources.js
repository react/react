/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Renderers that don't support hydration
// can re-export everything from this module.

function shim(...args: any): empty {
  throw new Error(
    'The current renderer does not support Resources. ' +
      'This error is likely caused by a bug in React. ' +
      'Please file an issue.',
  );
}

export type HoistableRoot = mixed;
export type Resource = mixed;

// Resources (when unsupported)
export const supportsResources = false;
export const isHostHoistableType = shim;
export const getHoistableRoot = shim;
export const getResource = shim;
export const acquireResource = shim;
export const releaseResource = shim;
export const hydrateHoistable = shim;
export const mountHoistable = shim;
export const unmountHoistable = shim;
export const createHoistableInstance = shim;
export const prepareToCommitHoistables = shim;
export const mayResourceSuspendCommit = shim;
export const preloadResource = shim;
export const suspendResource = shim;
