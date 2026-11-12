/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Renderers that don't support view transitions
// can re-export everything from this module.

function shim(...args: any): empty {
  throw new Error(
    'The current renderer does not support view transitions. ' +
      'This error is likely caused by a bug in React. ' +
      'Please file an issue.',
  );
}

// View Transitions (when unsupported)
export const applyViewTransitionName = shim;
export const restoreViewTransitionName = shim;
export const cancelViewTransitionName = shim;
export const cancelRootViewTransitionName = shim;
export const restoreRootViewTransitionName = shim;
export const cloneRootViewTransitionContainer = shim;
export const removeRootViewTransitionClone = shim;
export type InstanceMeasurement = any;
export const measureInstance = shim;
export const measureClonedInstance = shim;
export const wasInstanceInViewport = shim;
export const hasInstanceChanged = shim;
export const hasInstanceAffectedParent = shim;
export const startViewTransition = shim;
export type RunningViewTransition = any;
export const startGestureTransition = shim;
export const stopViewTransition = shim;
export const addViewTransitionFinishedListener = shim;
export type ViewTransitionInstance = any;
export const createViewTransitionInstance = shim;
