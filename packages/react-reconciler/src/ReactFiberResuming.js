/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber, FiberInstance} from './ReactInternalTypes';
import type {Lanes} from './ReactFiberLane';

import {enableResumingInterruptedRenders} from 'shared/ReactFeatureFlags';
import {
  NoLanes,
  isSubsetOfLanes,
  includesSomeLane,
  mergeLanes,
} from './ReactFiberLane';
import {
  NoFlags,
  DidCapture,
  PerformedWork,
  Placement,
  PlacementDEV,
} from './ReactFiberFlags';
import {
  HostRoot,
  ClassComponent,
  MemoComponent,
  SimpleMemoComponent,
} from './ReactWorkTags';
import {resolveClassComponentProps} from './ReactFiberClassComponent';
import is from 'shared/objectIs';
import {getIsHydrating} from './ReactFiberHydrationContext';
import {resolveTypeForHotReloading} from './ReactFiberHotReloading';

// A render that gets interrupted leaves behind versions of nodes that it
// finished. The next render of the same node would produce the same version
// if nothing about the node's inputs changed in between, so instead of cloning
// the committed version again it continues from the finished one.
//
// A version is a function of the committed version it was cloned from, the
// updates in the lanes it rendered at, the context values it read, and the
// state of anything it suspended on. Every one of these has a hook below that
// either invalidates the version or limits which renders may continue from it:
//
// - The lanes are recorded with it, and a render only continues from versions
//   that applied exactly the updates it would apply (getInProgressVersion).
// - An update to the node invalidates its version. Its ancestors' versions
//   are still good, but contain the stale one, so they're marked to be
//   descended into rather than taken as done (markInProgressSubtreeStale).
//   Context changes do the same for the consumers.
// - Anything that completes above a fiber that threw isn't recorded: it may
//   be a boundary whose state depends on a promise or an error.
// - A commit replaces the committed version the finished one was cloned from.
//   If the new committed version only bailed out of the old one, the finished
//   version is still good but something below it changed, so it's marked to be
//   descended into; otherwise it's released (releaseInProgressVersionOnCommit).
// - Finished versions only become available once the render that produced
//   them is abandoned. While it's running, its own second passes over a node
//   start from current like they always did.
//
// The fibers on the path from the root to where the render was interrupted
// have rendered and reconciled their children but haven't completed. They're
// kept too, marked stale so that the next render descends into them and
// completes them (recordInterruptedFiber).

// The lanes the render in progress applies updates for. NoLanes when it has to
// render everything from the committed tree, e.g. to recover from an error.
let resumableLanes: Lanes = NoLanes;

// The versions the render in progress has finished.
const completedFibers: Array<Fiber> = [];

// The versions the render in progress began but didn't finish, once it's
// interrupted.
const interruptedFibers: Array<Fiber> = [];

// Fibers above something that threw in the render in progress.
let taintedFibers: Set<Fiber> | null = null;

// The providers on the current path that provide a different value than the
// one the finished versions below them were rendered with.
const changedProviders: Array<Fiber> = [];

// What each abandoned render published, until a render in its lanes commits.
// That render continued from whatever it could use; the rest is obsolete and
// shouldn't keep its subtrees alive.
const publishedWork: Array<{lanes: Lanes, fibers: Array<Fiber>}> = [];

export function startResumableRender(lanes: Lanes): void {
  resumableLanes = enableResumingInterruptedRenders ? lanes : NoLanes;
  taintedFibers = null;
  changedProviders.length = 0;
}

// A provider is rendering. `previousValue` is what the finished versions below
// it were rendered with: the value its own finished version provided if that's
// what's rendering again, otherwise the committed value. If that's not the
// value it provides now, nothing below it can be continued from, since the
// consumers inside a finished version read the old value and there's no way
// to find them short of rendering it.
export function pushProviderValue(
  workInProgress: Fiber,
  previousValue: mixed,
  nextValue: mixed,
): void {
  if (enableResumingInterruptedRenders && !is(previousValue, nextValue)) {
    changedProviders.push(workInProgress);
  }
}

export function popProviderValue(workInProgress: Fiber): void {
  if (
    changedProviders.length > 0 &&
    changedProviders[changedProviders.length - 1] === workInProgress
  ) {
    changedProviders.pop();
  }
}

// A fiber threw. The versions of its ancestors that this render goes on to
// complete are shaped by what caught it, so they aren't kept.
export function taintAncestorsOfThrow(returnFiber: Fiber | null): void {
  if (!enableResumingInterruptedRenders) {
    return;
  }
  let tainted = taintedFibers;
  if (tainted === null) {
    tainted = taintedFibers = new Set();
  }
  let fiber = returnFiber;
  // Everything above an already tainted fiber is tainted too.
  while (fiber !== null && !tainted.has(fiber)) {
    tainted.add(fiber);
    fiber = fiber.return;
  }
}

export function recordCompletedFiber(completedWork: Fiber): void {
  if (!enableResumingInterruptedRenders) {
    return;
  }
  if (completedWork.instance.current === completedWork) {
    // A mount. There's no committed version that a later render would clone,
    // so there's nowhere for it to pick this one up from.
    return;
  }
  if (taintedFibers !== null && taintedFibers.has(completedWork)) {
    return;
  }
  completedFibers.push(completedWork);
}

// The render in progress is being interrupted, and `interruptedWork` is on the
// path from the root to where it stopped. It rendered and reconciled its
// children; only completing is left, which the render that continues from it
// does.
export function recordInterruptedFiber(interruptedWork: Fiber): void {
  if (!enableResumingInterruptedRenders) {
    return;
  }
  if (interruptedWork.instance.current === interruptedWork) {
    return;
  }
  if (taintedFibers !== null && taintedFibers.has(interruptedWork)) {
    return;
  }
  interruptedFibers.push(interruptedWork);
}

// The render in progress is being committed or has to be redone from scratch.
export function discardRecordedWork(): void {
  completedFibers.length = 0;
  interruptedFibers.length = 0;
}

// The render in progress is abandoned. What it finished is now available to
// the renders that follow.
export function publishAbandonedWork(lanes: Lanes): void {
  if (completedFibers.length === 0 && interruptedFibers.length === 0) {
    return;
  }
  for (let i = 0; i < completedFibers.length; i++) {
    const fiber = completedFibers[i];
    const instance = fiber.instance;
    if (instance.current === fiber) {
      // A render can finish and wait to commit while the next one starts. This
      // one committed in the meantime, so it's the current tree, not a version
      // to continue from.
      continue;
    }
    instance.inProgress = fiber;
    instance.inProgressLanes = lanes;
    instance.inProgressSubtreeIsStale = false;
  }
  for (let i = 0; i < interruptedFibers.length; i++) {
    const fiber = interruptedFibers[i];
    const instance = fiber.instance;
    instance.inProgress = fiber;
    instance.inProgressLanes = lanes;
    // Its children include the one that was interrupted, which is where the
    // next render picks up.
    instance.inProgressSubtreeIsStale = true;
  }
  publishedWork.push({
    lanes,
    fibers: completedFibers.concat(interruptedFibers),
  });
  completedFibers.length = 0;
  interruptedFibers.length = 0;
}

// A render at `lanes` is committing. Whatever was published for those lanes
// and wasn't continued from isn't going to be.
export function releasePublishedWorkOnCommit(lanes: Lanes): void {
  for (let i = publishedWork.length - 1; i >= 0; i--) {
    const published = publishedWork[i];
    if (includesSomeLane(lanes, published.lanes)) {
      const fibers = published.fibers;
      for (let j = 0; j < fibers.length; j++) {
        const fiber = fibers[j];
        if (fiber.instance.inProgress === fiber) {
          fiber.instance.inProgress = null;
        }
      }
      publishedWork.splice(i, 1);
    }
  }
}

// The version of `current` that a previous render finished, if this render can
// continue from it instead of cloning `current`. It's a complete render of the
// node against inputs that are still current, so the only thing left for
// beginWork to decide is whether the new pendingProps change anything, which it
// does the same way it would for a bailout against `current`.
export function getInProgressVersion(
  current: Fiber,
  pendingProps: any,
): Fiber | null {
  const instance = current.instance;
  const inProgress = instance.inProgress;
  if (
    inProgress === null ||
    current.tag === HostRoot ||
    // It committed since it was published. It's the current tree now.
    inProgress === current ||
    // A provider above changed its value (see pushProviderValue).
    changedProviders.length > 0
  ) {
    return null;
  }
  if (
    // A version that captured an error or suspended isn't a plain function of
    // its inputs: the render that's starting over may be doing so precisely to
    // find out whether it throws again.
    (inProgress.flags & DidCapture) !== NoFlags ||
    // The finished version applied the updates in the lanes it rendered at.
    // This render must include all of those, or it would show state it isn't
    // rendering yet. And everything this render would apply here must have
    // been among them, or the finished version is missing an update.
    !isSubsetOfLanes(resumableLanes, instance.inProgressLanes) ||
    !isSubsetOfLanes(
      instance.inProgressLanes,
      mergeLanes(current.lanes, current.childLanes) & resumableLanes,
    ) ||
    getIsHydrating() ||
    // A version rendered with an implementation that has since been hot
    // reloaded is stale.
    (__DEV__ && inProgress.type !== resolveTypeForHotReloading(current.type))
  ) {
    return null;
  }
  inProgress.pendingProps = pendingProps;
  // The version is authoritative for the lanes it rendered: it applied those
  // updates, and its own render may have scheduled more of them. For every
  // other lane the committed version is authoritative, since work in those
  // lanes may have been done by a render that committed in the meantime.
  const renderedLanes = instance.inProgressLanes;
  inProgress.lanes =
    (inProgress.lanes & renderedLanes) | (current.lanes & ~renderedLanes);
  inProgress.childLanes =
    (inProgress.childLanes & renderedLanes) |
    (current.childLanes & ~renderedLanes);
  // Where this version ends up is decided by the reconciliation that's
  // adopting it, not the one that created it.
  inProgress.flags &= ~(Placement | PlacementDEV);
  inProgress.index = current.index;
  inProgress.sibling = current.sibling;
  return inProgress;
}

// A kept version's deletions point at the versions of the children that were
// committed when it rendered. A commit since may have replaced one of them;
// the commit that deletes it has to walk what's committed now.
export function refreshDeletions(workInProgress: Fiber): void {
  const deletions = workInProgress.deletions;
  if (deletions === null) {
    return;
  }
  for (let i = 0; i < deletions.length; i++) {
    const deleted = deletions[i];
    const current = deleted.instance.current;
    if (current !== deleted) {
      deletions[i] = current;
    }
  }
}

// Whether this work-in-progress fiber is a version a previous render finished.
export function isInProgressVersion(workInProgress: Fiber): boolean {
  return workInProgress.instance.inProgress === workInProgress;
}

// The node has an update that the version a previous render finished doesn't
// include.
export function invalidateInProgressVersion(fiber: Fiber): void {
  fiber.instance.inProgress = null;
}

// A node below this one was invalidated. This node's finished version is still
// good, but a render that continues from it has to descend into it to get to
// the invalidated one.
export function markInProgressSubtreeStale(fiber: Fiber): void {
  fiber.instance.inProgressSubtreeIsStale = true;
}

// Whether a render that continued from this version has to descend into the
// children even though it looks like there's no work in them.
export function hasStaleDescendants(workInProgress: Fiber): boolean {
  const instance = workInProgress.instance;
  return (
    instance.inProgress === workInProgress && instance.inProgressSubtreeIsStale
  );
}

// `node` is being committed in place of `current`. The version a previous
// render finished was cloned from `current`; it's still good if `node` only
// bailed out of `current`, even if it descended into the children to update
// one of them.
// A version kept from an earlier render commits without being rendered again,
// and a render abandoned since then may have left the class instance at its
// own props and state.
export function syncClassInstance(node: Fiber): void {
  if (!enableResumingInterruptedRenders) {
    return;
  }
  const inst = node.stateNode;
  if (inst.state !== node.memoizedState) {
    inst.state = node.memoizedState;
  }
  if (inst.props !== node.memoizedProps) {
    // Resolved props are a copy, so for a class that has something to resolve
    // this can't tell whether the instance is behind.
    const type = node.type;
    inst.props =
      !type.defaultProps && !('ref' in node.memoizedProps)
        ? node.memoizedProps
        : resolveClassComponentProps(type, node.memoizedProps);
  }
}

export function releaseInProgressVersionOnCommit(
  instance: FiberInstance,
  node: Fiber,
  current: Fiber,
): void {
  const inProgress = instance.inProgress;
  if (inProgress === null) {
    return;
  }
  if (
    inProgress === node ||
    (node.flags & PerformedWork) !== NoFlags ||
    node.memoizedState !== current.memoizedState ||
    (node.memoizedProps !== current.memoizedProps &&
      // These record the new props even when they decide not to render, and
      // nothing about them changes when they don't. For everything else,
      // new props mean a new render.
      node.tag !== ClassComponent &&
      node.tag !== MemoComponent &&
      node.tag !== SimpleMemoComponent)
  ) {
    instance.inProgress = null;
  } else {
    // This node didn't change, but a new version of it only gets committed
    // when something below it did. The version's own render is still good;
    // its children have to be checked against what was committed.
    instance.inProgressSubtreeIsStale = true;
  }
}
