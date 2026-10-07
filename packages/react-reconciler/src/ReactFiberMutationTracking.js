/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {enableDefaultTransitionIndicator} from 'shared/ReactFeatureFlags';

export let rootMutationContext: boolean = false;
export let viewTransitionMutationContext: boolean = false;

export function pushRootMutationContext(): void {
  if (enableDefaultTransitionIndicator) {
    rootMutationContext = false;
  }
  viewTransitionMutationContext = false;
}

export function pushMutationContext(): boolean {
  const prev = viewTransitionMutationContext;
  viewTransitionMutationContext = false;
  return prev;
}

export function popMutationContext(prev: boolean): void {
  if (viewTransitionMutationContext) {
    rootMutationContext = true;
  }
  viewTransitionMutationContext = prev;
}

export function trackHostMutation(): void {
  // This is extremely hot function that must be inlined. Don't add more stuff.
  // rootMutationContext is collected from this when we pop.
  viewTransitionMutationContext = true;
}
