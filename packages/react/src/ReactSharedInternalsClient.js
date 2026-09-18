/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Dispatcher} from 'react-reconciler/src/ReactInternalTypes';
import type {AsyncDispatcher} from 'react-reconciler/src/ReactInternalTypes';
import type {Transition} from './ReactStartTransition';
import type {GestureProvider, GestureOptions} from 'shared/ReactTypes';

import {enableGestureTransition} from 'shared/ReactFeatureFlags';

type onStartTransitionFinish = (Transition, mixed) => void;
type onStartGestureTransitionFinish = (
  Transition,
  GestureProvider,
  ?GestureOptions,
) => () => void;

export type SharedStateClient = {
  H: null | Dispatcher, // ReactCurrentDispatcher for Hooks
  A: null | AsyncDispatcher, // ReactCurrentCache for Cache
  T: null | Transition, // ReactCurrentBatchConfig for Transitions
  S: null | onStartTransitionFinish,
  G: null | onStartGestureTransitionFinish,

  // DEV-only

  // ReactCurrentActQueue
  actQueue: null | Array<RendererTask>,

  // When zero this means we're outside an async startTransition.
  asyncTransitions: number,

  // Used to reproduce behavior of `batchedUpdates` in legacy mode.
  isBatchingLegacy: boolean,
  didScheduleLegacyUpdate: boolean,

  // Tracks whether something called `use` during the current batch of work.
  // Determines whether we should yield to microtasks to unwrap already resolved
  // promises without suspending.
  didUsePromise: boolean,

  // Track first uncaught error within this act
  thrownErrors: Array<mixed>,

  // ReactDebugCurrentFrame
  getCurrentStack: null | (() => string),

  // ReactOwnerStackReset
  recentlyCreatedOwnerStacks: 0,
};

export type RendererTask = boolean => RendererTask | null;

const ReactSharedInternals: SharedStateClient = {
  H: null,
  A: null,
  T: null,
  S: null,
} as any;
if (enableGestureTransition) {
  ReactSharedInternals.G = null;
}

if (__DEV__) {
  ReactSharedInternals.actQueue = null;
  ReactSharedInternals.asyncTransitions = 0;
  ReactSharedInternals.isBatchingLegacy = false;
  ReactSharedInternals.didScheduleLegacyUpdate = false;
  ReactSharedInternals.didUsePromise = false;
  ReactSharedInternals.thrownErrors = [];
  // Stack implementation injected by the current renderer.
  ReactSharedInternals.getCurrentStack = null as null | (() => string);
  ReactSharedInternals.recentlyCreatedOwnerStacks = 0;
}

export default ReactSharedInternals;
