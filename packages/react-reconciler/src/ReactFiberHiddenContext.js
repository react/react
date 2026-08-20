/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {StackCursor} from './ReactFiberStack';
import type {Lanes} from './ReactFiberLane';

import {createCursor, push, pop} from './ReactFiberStack';

import {
  getEntangledRenderLanes,
  setEntangledRenderLanes,
} from './ReactFiberWorkLoop';
import {NoLanes, mergeLanes} from './ReactFiberLane';

// TODO: Remove `renderLanes` context in favor of hidden context
type HiddenContext = {
  // Represents the lanes that must be included when processing updates in
  // order to reveal the hidden content.
  // TODO: Remove `subtreeLanes` context from work loop in favor of this one.
  baseLanes: number,
  ...
};

// TODO: This isn't being used yet, but it's intended to replace the
// InvisibleParentContext that is currently managed by SuspenseContext.
export const currentTreeHiddenStackCursor: StackCursor<HiddenContext | null> =
  createCursor(null);
export const prevEntangledRenderLanesCursor: StackCursor<Lanes> =
  createCursor(NoLanes);

export function pushHiddenContext(fiber: Fiber, context: HiddenContext): void {
  const prevEntangledRenderLanes = getEntangledRenderLanes();
  push(prevEntangledRenderLanesCursor, prevEntangledRenderLanes, fiber);
  push(currentTreeHiddenStackCursor, context, fiber);

  // When rendering a subtree that's currently hidden, we must include all
  // lanes that would have rendered if the hidden subtree hadn't been deferred.
  // That is, in order to reveal content from hidden -> visible, we must commit
  // all the updates that we skipped when we originally hid the tree.
  setEntangledRenderLanes(
    mergeLanes(prevEntangledRenderLanes, context.baseLanes),
  );
}

export function reuseHiddenContextOnStack(fiber: Fiber): void {
  // This subtree is not currently hidden, so we don't need to add any lanes
  // to the render lanes. But we still need to push something to avoid a
  // context mismatch. Reuse the existing context on the stack.
  push(prevEntangledRenderLanesCursor, getEntangledRenderLanes(), fiber);
  push(
    currentTreeHiddenStackCursor,
    currentTreeHiddenStackCursor.current,
    fiber,
  );
}

export function popHiddenContext(fiber: Fiber): void {
  // Restore the previous render lanes from the stack
  setEntangledRenderLanes(prevEntangledRenderLanesCursor.current);

  pop(currentTreeHiddenStackCursor, fiber);
  pop(prevEntangledRenderLanesCursor, fiber);
}

export function isCurrentTreeHidden(): boolean {
  return currentTreeHiddenStackCursor.current !== null;
}
