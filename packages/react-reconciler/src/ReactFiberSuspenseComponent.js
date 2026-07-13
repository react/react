/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Wakeable, SuspenseListTailMode} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {SuspenseInstance} from './ReactFiberConfig';
import type {Lane} from './ReactFiberLane';
import type {TreeContext} from './ReactFiberTreeContext';
import type {CapturedValue} from './ReactCapturedValue';

import {SuspenseComponent, SuspenseListComponent} from './ReactWorkTags';
import {NoFlags, DidCapture} from './ReactFiberFlags';
import {
  isSuspenseInstancePending,
  isSuspenseInstanceFallback,
} from './ReactFiberConfig';

// A null SuspenseState represents an unsuspended normal Suspense boundary.
// A non-null SuspenseState means that it is blocked for one reason or another.
// - A non-null dehydrated field means it's blocked pending hydration.
//   - A non-null dehydrated field can use isSuspenseInstancePending or
//     isSuspenseInstanceFallback to query the reason for being dehydrated.
// - A null dehydrated field means it's blocked by something suspending and
//   we're currently showing a fallback instead.
export type SuspenseState = {
  // If this boundary is still dehydrated, we store the SuspenseInstance
  // here to indicate that it is dehydrated (flag) and for quick access
  // to check things like isSuspenseInstancePending.
  dehydrated: null | SuspenseInstance,
  treeContext: null | TreeContext,
  // Represents the lane we should attempt to hydrate a dehydrated boundary at.
  // OffscreenLane is the default for dehydrated boundaries.
  // NoLane is the default for normal boundaries, which turns into "normal" pri.
  retryLane: Lane,
  // Stashed Errors that happened while attempting to hydrate this boundary.
  hydrationErrors: Array<CapturedValue<mixed>> | null,
};

export type SuspenseListRenderState = {
  isBackwards: boolean,
  // The currently rendering tail row.
  rendering: null | Fiber,
  // The absolute time when we started rendering the most recent tail row.
  renderingStartTime: number,
  // The last of the already rendered children.
  last: null | Fiber,
  // Remaining rows on the tail of the list.
  tail: null | Fiber,
  // Tail insertions setting.
  tailMode: SuspenseListTailMode,
  // Keep track of total number of forks during multiple passes
  treeForkCount: number,
};

export type RetryQueue = Set<Wakeable>;

export function findFirstSuspended(row: Fiber): null | Fiber {
  let node = row;
  // $FlowFixMe[invalid-compare]
  while (node !== null) {
    if (node.tag === SuspenseComponent) {
      const state: SuspenseState | null = node.memoizedState;
      if (state !== null) {
        const dehydrated: null | SuspenseInstance = state.dehydrated;
        if (
          dehydrated === null ||
          isSuspenseInstancePending(dehydrated) ||
          isSuspenseInstanceFallback(dehydrated)
        ) {
          return node;
        }
      }
    } else if (
      node.tag === SuspenseListComponent &&
      // Independent revealOrder can't be trusted because it doesn't
      // keep track of whether it suspended or not.
      node.memoizedProps.revealOrder !== 'independent'
    ) {
      const didSuspend = (node.flags & DidCapture) !== NoFlags;
      if (didSuspend) {
        return node;
      }
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === row) {
      return null;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === row) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return null;
}
