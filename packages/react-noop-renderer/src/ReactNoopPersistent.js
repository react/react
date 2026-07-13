/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * This is a renderer of React that doesn't have a render target output.
 * It is useful to demonstrate the internals of the reconciler in isolation
 * and for testing semantics of reconciliation separate from the host
 * environment.
 */

import ReactFiberReconciler from 'react-reconciler';
import createReactNoop from './createReactNoop';

export const {
  _Scheduler,
  getChildren,
  dangerouslyGetChildren,
  getPendingChildren,
  dangerouslyGetPendingChildren,
  getOrCreateRootContainer,
  createRoot,
  createLegacyRoot,
  getChildrenAsJSX,
  getPendingChildrenAsJSX,
  getSuspenseyThingStatus,
  resolveSuspenseyThing,
  resetSuspenseyThingCache,
  createPortal,
  render,
  renderLegacySyncRoot,
  renderToRootWithID,
  unmountRootWithID,
  findInstance,
  flushNextYield,
  startTrackingHostCounters,
  stopTrackingHostCounters,
  expire,
  flushExpired,
  batchedUpdates,
  deferredUpdates,
  discreteUpdates,
  idleUpdates,
  flushDiscreteUpdates,
  flushSync,
  flushPassiveEffects,
  act,
  dumpTree,
  getRoot,
  // TODO: Remove this once callers migrate to alternatives.
  // This should only be used by React internals.
  unstable_runWithPriority,
  // $FlowFixMe[signature-verification-failure]
} = createReactNoop(
  ReactFiberReconciler, // reconciler
  false, // useMutation
);
