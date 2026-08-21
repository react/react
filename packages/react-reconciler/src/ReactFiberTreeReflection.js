/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import {getPreviousVersion} from './ReactFiberInstance';
import type {
  Container,
  Instance,
  TextInstance,
  ActivityInstance,
  SuspenseInstance,
} from './ReactFiberConfig';
import type {ActivityState} from './ReactFiberActivityComponent';
import type {SuspenseState} from './ReactFiberSuspenseComponent';

import {
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostRoot,
  HostPortal,
  HostText,
  ActivityComponent,
  SuspenseComponent,
  OffscreenComponent,
  Fragment,
} from './ReactWorkTags';
import {NoFlags, Placement, Hydrating} from './ReactFiberFlags';
import {enableFragmentRefsTextNodes} from 'shared/ReactFeatureFlags';

export function getNearestMountedFiber(fiber: Fiber): null | Fiber {
  let node = fiber;
  let nearestMounted: null | Fiber = fiber;
  // If there is no previous version, this might be a new tree that isn't
  // inserted yet. If it is, then it will have a pending insertion effect on it.
  let nextNode: Fiber = node;
  while (nextNode && getPreviousVersion(nextNode) === null) {
    node = nextNode;
    if ((node.flags & (Placement | Hydrating)) !== NoFlags) {
      // This is an insertion or in-progress hydration. The nearest possible
      // mounted fiber is the parent but we need to continue to figure out
      // if that one is still mounted.
      nearestMounted = node.return;
    }
    // $FlowFixMe[incompatible-type] we bail out when we get a null
    nextNode = node.return;
  }
  // After we've reached a fiber that was committed before, go the rest of the
  // way to see if the tree is still mounted. If it's not, its return pointer
  // will be disconnected.
  while (node.return) {
    node = node.return;
  }
  if (node.tag === HostRoot) {
    // TODO: Check if this was a nested HostRoot when used with
    // renderContainerIntoSubtree.
    return nearestMounted;
  }
  // If we didn't hit the root, that means that we're in an disconnected tree
  // that has been unmounted.
  return null;
}

export function getSuspenseInstanceFromFiber(
  fiber: Fiber,
): null | SuspenseInstance {
  if (fiber.tag === SuspenseComponent) {
    let suspenseState: SuspenseState | null = fiber.memoizedState;
    if (suspenseState === null) {
      const current = getPreviousVersion(fiber);
      if (current !== null) {
        suspenseState = current.memoizedState;
      }
    }
    if (suspenseState !== null) {
      return suspenseState.dehydrated;
    }
  }
  return null;
}

export function getActivityInstanceFromFiber(
  fiber: Fiber,
): null | ActivityInstance {
  if (fiber.tag === ActivityComponent) {
    let activityState: ActivityState | null = fiber.memoizedState;
    if (activityState === null) {
      const current = getPreviousVersion(fiber);
      if (current !== null) {
        activityState = current.memoizedState;
      }
    }
    if (activityState !== null) {
      return activityState.dehydrated;
    }
  }
  // TODO: Implement this on ActivityComponent.
  return null;
}

export function getContainerFromFiber(fiber: Fiber): null | Container {
  return fiber.tag === HostRoot
    ? (fiber.stateNode.containerInfo as Container)
    : null;
}

// Returns the committed version of the fiber's node, or null if the node
// hasn't been inserted yet. Throws if it has been unmounted.
export function findCurrentFiberUsingSlowPath(fiber: Fiber): Fiber | null {
  const current = fiber.instance.current;
  const nearestMounted = getNearestMountedFiber(current);

  if (nearestMounted === null) {
    throw new Error('Unable to find node on an unmounted component.');
  }

  if (nearestMounted !== current) {
    return null;
  }
  return current;
}

export function findCurrentHostFiber(parent: Fiber): Fiber | null {
  const currentParent = findCurrentFiberUsingSlowPath(parent);
  return currentParent !== null
    ? findCurrentHostFiberImpl(currentParent)
    : null;
}

function findCurrentHostFiberImpl(node: Fiber): Fiber | null {
  // Next we'll drill down this component to find the first HostComponent/Text.
  const tag = node.tag;
  if (
    tag === HostComponent ||
    tag === HostHoistable ||
    tag === HostSingleton ||
    tag === HostText
  ) {
    return node;
  }

  let child = node.child;
  while (child !== null) {
    const match = findCurrentHostFiberImpl(child);
    if (match !== null) {
      return match;
    }
    child = child.sibling;
  }

  return null;
}

export function findCurrentHostFiberWithNoPortals(parent: Fiber): Fiber | null {
  const currentParent = findCurrentFiberUsingSlowPath(parent);
  return currentParent !== null
    ? findCurrentHostFiberWithNoPortalsImpl(currentParent)
    : null;
}

function findCurrentHostFiberWithNoPortalsImpl(node: Fiber): Fiber | null {
  // Next we'll drill down this component to find the first HostComponent/Text.
  const tag = node.tag;
  if (
    tag === HostComponent ||
    tag === HostHoistable ||
    tag === HostSingleton ||
    tag === HostText
  ) {
    return node;
  }

  let child = node.child;
  while (child !== null) {
    if (child.tag !== HostPortal) {
      const match = findCurrentHostFiberWithNoPortalsImpl(child);
      if (match !== null) {
        return match;
      }
    }
    child = child.sibling;
  }

  return null;
}

export function isFiberSuspenseAndTimedOut(fiber: Fiber): boolean {
  const memoizedState = fiber.memoizedState;
  return (
    fiber.tag === SuspenseComponent &&
    memoizedState !== null &&
    memoizedState.dehydrated === null
  );
}

export function doesFiberContain(
  parentFiber: Fiber,
  childFiber: Fiber,
): boolean {
  let node: null | Fiber = childFiber;
  const parentInstance = parentFiber.instance;
  while (node !== null) {
    if (node.instance === parentInstance) {
      return true;
    }
    node = node.return;
  }
  return false;
}

export function traverseFragmentInstancesAndTextInstances<A, B, C>(
  fragmentFiber: Fiber,
  fn: (Fiber, A, B, C) => boolean,
  a: A,
  b: B,
  c: C,
): void {
  traverseVisibleInstancesAndTextInstances(
    fragmentFiber.child,
    false,
    fn,
    a,
    b,
    c,
  );
}

export function traverseFragmentInstancesAndTextInstancesDeeply<A, B, C>(
  fragmentFiber: Fiber,
  fn: (Fiber, A, B, C) => boolean,
  a: A,
  b: B,
  c: C,
): void {
  traverseVisibleInstancesAndTextInstances(
    fragmentFiber.child,
    true,
    fn,
    a,
    b,
    c,
  );
}

function traverseVisibleInstancesAndTextInstances<A, B, C>(
  child: Fiber | null,
  searchWithinHosts: boolean,
  fn: (Fiber, A, B, C) => boolean,
  a: A,
  b: B,
  c: C,
): boolean {
  while (child !== null) {
    const isHostNode =
      child.tag === HostComponent ||
      child.tag === HostSingleton ||
      (enableFragmentRefsTextNodes && child.tag === HostText);
    if (isHostNode && fn(child, a, b, c)) {
      return true;
    } else if (
      child.tag === OffscreenComponent &&
      child.memoizedState !== null
    ) {
      // Skip hidden subtrees
    } else {
      if (
        (searchWithinHosts ||
          (child.tag !== HostComponent && child.tag !== HostSingleton)) &&
        traverseVisibleInstancesAndTextInstances(
          child.child,
          searchWithinHosts,
          fn,
          a,
          b,
          c,
        )
      ) {
        return true;
      }
    }
    child = child.sibling;
  }
  return false;
}

export function getFragmentParentInstanceOrContainerFiber(
  fiber: Fiber,
): null | Fiber {
  let parent = fiber.return;
  while (parent !== null) {
    if (
      parent.tag === HostRoot ||
      parent.tag === HostComponent ||
      parent.tag === HostSingleton
    ) {
      return parent;
    }
    parent = parent.return;
  }

  return null;
}

export function fiberIsPortaledIntoHost(fiber: Fiber): boolean {
  let foundPortalParent = false;
  let parent = fiber.return;
  while (parent !== null) {
    if (parent.tag === HostPortal) {
      foundPortalParent = true;
    }
    if (
      parent.tag === HostRoot ||
      parent.tag === HostComponent ||
      parent.tag === HostSingleton
    ) {
      break;
    }
    parent = parent.return;
  }
  return foundPortalParent;
}

export function getFragmentPortalContainerInfo(fiber: Fiber): null | Container {
  let parent = fiber.return;
  while (parent !== null) {
    if (parent.tag === HostPortal) {
      return parent.stateNode.containerInfo as Container;
    }
    if (
      parent.tag === HostRoot ||
      parent.tag === HostComponent ||
      parent.tag === HostSingleton
    ) {
      break;
    }
    parent = parent.return;
  }
  return null;
}

export function getFragmentInstanceOrTextInstanceSiblings(
  fiber: Fiber,
): [Fiber | null, Fiber | null] {
  const result: [Fiber | null, Fiber | null] = [null, null];
  const parentHostFiber = getFragmentParentInstanceOrContainerFiber(fiber);
  if (parentHostFiber === null) {
    return result;
  }

  findFragmentInstanceOrTextInstanceSiblings(
    result,
    fiber,
    parentHostFiber.child,
    {foundSelf: false},
  );
  return result;
}

/**
 * Only collects HostText with enableFragmentRefsTextNodes enabled. Otherwise, only collects HostComponent.
 * Returns true once the following host sibling has been found.
 */
function findFragmentInstanceOrTextInstanceSiblings(
  result: [Fiber | null, Fiber | null],
  self: Fiber,
  child: null | Fiber,
  state: {foundSelf: boolean},
): boolean {
  while (child !== null) {
    if (child === self) {
      // Shared across recursive calls so ancestors can keep scanning for
      // following host siblings after a nested empty fragment.
      state.foundSelf = true;
      child = child.sibling;
      continue;
    }
    if (
      child.tag === HostComponent ||
      child.tag === HostSingleton ||
      (enableFragmentRefsTextNodes && child.tag === HostText)
    ) {
      if (state.foundSelf) {
        result[1] = child;
        return true;
      } else {
        result[0] = child;
      }
    } else if (
      child.tag === OffscreenComponent &&
      child.memoizedState !== null
    ) {
      // Skip hidden subtrees
    } else {
      if (
        findFragmentInstanceOrTextInstanceSiblings(
          result,
          self,
          child.child,
          state,
        )
      ) {
        return true;
      }
    }
    child = child.sibling;
  }
  return false;
}

export function getInstanceFromHostFiber<
  I: Instance | TextInstance | Container,
>(fiber: Fiber): I {
  switch (fiber.tag) {
    case HostComponent:
    case HostSingleton:
    case HostText:
      return fiber.stateNode;
    case HostRoot:
      return fiber.stateNode.containerInfo;
    default:
      throw new Error('Expected to find a host node. This is a bug in React.');
  }
}

let searchTarget = null;
let searchBoundary = null;
function pushSearchTarget(target: null | Fiber): void {
  searchTarget = target;
}
function popSearchTarget(): null | Fiber {
  return searchTarget;
}
function pushSearchBoundary(value: null | Fiber): void {
  searchBoundary = value;
}
function popSearchBoundary(): null | Fiber {
  return searchBoundary;
}

export function getNextSiblingInstanceOrTextInstanceFiber(
  fiber: Fiber,
): null | Fiber {
  traverseVisibleInstancesAndTextInstances(
    fiber.sibling,
    false,
    findNextSibling,
  );
  const sibling = popSearchTarget();
  pushSearchTarget(null);
  return sibling;
}

function findNextSibling(child: Fiber): boolean {
  pushSearchTarget(child);
  return true;
}

export function isFiberContainedByFragment(
  fiber: Fiber,
  fragmentFiber: Fiber,
): boolean {
  let current: Fiber | null = fiber;
  while (current !== null) {
    if (
      current.tag === Fragment &&
      current.instance === fragmentFiber.instance
    ) {
      return true;
    }
    current = current.return;
  }
  return false;
}

export function isFragmentContainedByFiber(
  fragmentFiber: Fiber,
  otherFiber: Fiber,
): boolean {
  let current: Fiber | null = fragmentFiber;
  const fiberHostParent: Fiber | null =
    getFragmentParentInstanceOrContainerFiber(fragmentFiber);
  while (current !== null) {
    if (
      (current.tag === HostComponent ||
        current.tag === HostRoot ||
        current.tag === HostSingleton) &&
      fiberHostParent !== null &&
      current.instance === fiberHostParent.instance
    ) {
      return true;
    }
    current = current.return;
  }
  return false;
}

export function isFiberPreceding(fiber: Fiber, otherFiber: Fiber): boolean {
  const commonAncestor = getLowestCommonAncestor(
    fiber,
    otherFiber,
    getParentForFragmentAncestors,
  );
  if (commonAncestor === null) {
    return false;
  }
  traverseVisibleInstancesAndTextInstances(
    commonAncestor,
    true,
    isFiberPrecedingCheck,
    otherFiber,
    fiber,
  );
  const target = popSearchTarget();
  pushSearchTarget(null);
  return target !== null;
}

function isFiberPrecedingCheck(
  child: Fiber,
  target: Fiber,
  boundary: Fiber,
): boolean {
  if (child === boundary) {
    return true;
  }
  if (child === target) {
    pushSearchTarget(child);
    return true;
  }
  return false;
}

export function isFiberFollowing(fiber: Fiber, otherFiber: Fiber): boolean {
  const commonAncestor = getLowestCommonAncestor(
    fiber,
    otherFiber,
    getParentForFragmentAncestors,
  );
  if (commonAncestor === null) {
    return false;
  }
  traverseVisibleInstancesAndTextInstances(
    commonAncestor,
    true,
    isFiberFollowingCheck,
    otherFiber,
    fiber,
  );
  const target = popSearchTarget();
  pushSearchTarget(null);
  pushSearchBoundary(null);
  return target !== null;
}

function isFiberFollowingCheck(
  child: Fiber,
  target: Fiber,
  boundary: Fiber,
): boolean {
  if (child === boundary) {
    pushSearchBoundary(child);
    return false;
  }
  if (child === target) {
    // The target is only following if we already found the boundary.
    if (popSearchBoundary() !== null) {
      pushSearchTarget(child);
    }
    return true;
  }
  return false;
}

function getParentForFragmentAncestors(inst: Fiber | null): Fiber | null {
  if (inst === null) {
    return null;
  }
  do {
    inst = inst === null ? null : inst.return;
  } while (
    inst &&
    inst.tag !== HostComponent &&
    inst.tag !== HostSingleton &&
    inst.tag !== HostRoot
  );
  if (inst) {
    return inst;
  }
  return null;
}

/**
 * Return the lowest common ancestor of A and B, or null if they are in
 * different trees.
 */
export function getLowestCommonAncestor(
  instA: Fiber,
  instB: Fiber,
  getParent: (inst: Fiber | null) => Fiber | null,
): Fiber | null {
  let nodeA: null | Fiber = instA;
  let nodeB: null | Fiber = instB;
  let depthA = 0;
  for (let tempA: null | Fiber = nodeA; tempA; tempA = getParent(tempA)) {
    depthA++;
  }
  let depthB = 0;
  for (let tempB: null | Fiber = nodeB; tempB; tempB = getParent(tempB)) {
    depthB++;
  }

  // If A is deeper, crawl up.
  while (depthA - depthB > 0) {
    nodeA = getParent(nodeA);
    depthA--;
  }

  // If B is deeper, crawl up.
  while (depthB - depthA > 0) {
    nodeB = getParent(nodeB);
    depthB--;
  }

  // Walk in lockstep until we find a match.
  let depth = depthA;
  while (depth--) {
    if (
      nodeA === nodeB ||
      (nodeA !== null && nodeB !== null && nodeA.instance === nodeB.instance)
    ) {
      return nodeA;
    }
    nodeA = getParent(nodeA);
    nodeB = getParent(nodeB);
  }
  return null;
}
