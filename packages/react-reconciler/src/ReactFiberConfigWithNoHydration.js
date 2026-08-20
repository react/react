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
    'The current renderer does not support hydration. ' +
      'This error is likely caused by a bug in React. ' +
      'Please file an issue.',
  );
}

// Hydration (when unsupported)
export type ActivityInstance = mixed;
export type SuspenseInstance = mixed;
export const supportsHydration = false;
export const isSuspenseInstancePending = shim;
export const isSuspenseInstanceFallback = shim;
export const getSuspenseInstanceFallbackErrorDetails = shim;
export const registerSuspenseInstanceRetry = shim;
export const canHydrateFormStateMarker = shim;
export const isFormStateMarkerMatching = shim;
export const getNextHydratableSibling = shim;
export const getNextHydratableSiblingAfterSingleton = shim;
export const getFirstHydratableChild = shim;
export const getFirstHydratableChildWithinContainer = shim;
export const getFirstHydratableChildWithinActivityInstance = shim;
export const getFirstHydratableChildWithinSuspenseInstance = shim;
export const getFirstHydratableChildWithinSingleton = shim;
export const canHydrateInstance = shim;
export const canHydrateTextInstance = shim;
export const canHydrateActivityInstance = shim;
export const canHydrateSuspenseInstance = shim;
export const hydrateInstance = shim;
export const hydrateTextInstance = shim;
export const hydrateActivityInstance = shim;
export const hydrateSuspenseInstance = shim;
export const getNextHydratableInstanceAfterActivityInstance = shim;
export const getNextHydratableInstanceAfterSuspenseInstance = shim;
export const finalizeHydratedChildren = shim;
export const commitHydratedInstance = shim;
export const commitHydratedContainer = shim;
export const commitHydratedActivityInstance = shim;
export const commitHydratedSuspenseInstance = shim;
export const flushHydrationEvents = shim;
export const clearActivityBoundary = shim;
export const clearSuspenseBoundary = shim;
export const clearActivityBoundaryFromContainer = shim;
export const clearSuspenseBoundaryFromContainer = shim;
export const hideDehydratedBoundary = shim;
export const unhideDehydratedBoundary = shim;
export const shouldDeleteUnhydratedTailInstances = shim;
export const diffHydratedPropsForDevWarnings = shim;
export const diffHydratedTextForDevWarnings = shim;
export const describeHydratableInstanceForDevWarnings = shim;
export const validateHydratableInstance = shim;
export const validateHydratableTextInstance = shim;
