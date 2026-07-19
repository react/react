/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
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
  // If there is no alternate, this might be a new tree that isn't inserted
  // yet. If it is, then it will have a pending insertion effect on it.
  let nextNode: Fiber = node;
  while (nextNode && !nextNode.alternate) {
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
  // After we've reached an alternate, go the rest of the way to see if the
  // tree is still mounted. If it's not, its return pointer will be disconnected.
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
      const current = fiber.alternate;
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
      const current = fiber.alternate;
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

function assertIsMounted(fiber: Fiber) {
  if (getNearestMountedFiber(fiber) !== fiber) {
    throw new Error('Unable to find node on an unmounted component.');
  }
}

export function findCurrentFiberUsingSlowPath(fiber: Fiber): Fiber | null {
  const alternate = fiber.alternate;
  if (!alternate) {
    // If there is no alternate, then we only need to check if it is mounted.
    const nearestMounted = getNearestMountedFiber(fiber);

    if (nearestMounted === null) {
      throw new Error('Unable to find node on an unmounted component.');
    }

    if (nearestMounted !== fiber) {
      return null;
    }
    return fiber;
  }
  // If we have two possible branches, we'll walk backwards up to the root
  // to see what path the root points to. On the way we may hit one of the
  // special cases and we'll deal with them.
  let a: Fiber = fiber;
  let b: Fiber = alternate;
  while (true) {
    const parentA = a.return;
    if (parentA === null) {
      // We're at the root.
      break;
    }
    const parentB = parentA.alternate;
    if (parentB === null) {
      // There is no alternate. This is an unusual case. Currently, it only
      // happens when a Suspense component is hidden. An extra fragment fiber
      // is inserted in between the Suspense fiber and its children. Skip
      // over this extra fragment fiber and proceed to the next parent.
      const nextParent = parentA.return;
      if (nextParent !== null) {
        a = b = nextParent;
        continue;
      }
      // If there's no parent, we're at the root.
      break;
    }

    // If both copies of the parent fiber point to the same child, we can
    // assume that the child is current. This happens when we bailout on low
    // priority: the bailed out fiber's child reuses the current child.
    if (parentA.child === parentB.child) {
      let child = parentA.child;
      while (child) {
        if (child === a) {
          // We've determined that A is the current branch.
          assertIsMounted(parentA);
          return fiber;
        }
        if (child === b) {
          // We've determined that B is the current branch.
          assertIsMounted(parentA);
          return alternate;
        }
        child = child.sibling;
      }

      // We should never have an alternate for any mounting node. So the only
      // way this could possibly happen is if this was unmounted, if at all.
      throw new Error('Unable to find node on an unmounted component.');
    }

    if (a.return !== b.return) {
      // The return pointer of A and the return pointer of B point to different
      // fibers. We assume that return pointers never criss-cross, so A must
      // belong to the child set of A.return, and B must belong to the child
      // set of B.return.
      a = parentA;
      b = parentB;
    } else {
      // The return pointers point to the same fiber. We'll have to use the
      // default, slow path: scan the child sets of each parent alternate to see
      // which child belongs to which set.
      //
      // Search parent A's child set
      let didFindChild = false;
      let child = parentA.child;
      while (child) {
        if (child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }
        if (child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }
        child = child.sibling;
      }
      if (!didFindChild) {
        // Search parent B's child set
        child = parentB.child;
        while (child) {
          if (child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }
          if (child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }
          child = child.sibling;
        }

        if (!didFindChild) {
          throw new Error(
            'Child was not found in either parent set. This indicates a bug ' +
              'in React related to the return pointer. Please file an issue.',
          );
        }
      }
    }

    if (a.alternate !== b) {
      throw new Error(
        "Return fibers should always be each others' alternates. " +
          'This error is likely caused by a bug in React. Please file an issue.',
      );
    }
  }

  // If the root is not a host container, we're in a disconnected tree. I.e.
  // unmounted.
  if (a.tag !== HostRoot) {
    throw new Error('Unable to find node on an unmounted component.');
  }

  if (a.stateNode.current === a) {
    // We've determined that A is the current branch.
    return fiber;
  }
  // Otherwise B has to be current branch.
  return alternate;
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
  const parentFiberAlternate = parentFiber.alternate;
  while (node !== null) {
    if (node === parentFiber || node === parentFiberAlternate) {
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
        (searchWithinHosts || child.tag !== HostComponent) &&
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
  );
  return result;
}

/**
 * Only collects HostText with enableFragmentRefsTextNodes enabled. Otherwise, only collects HostComponent.
 */
function findFragmentInstanceOrTextInstanceSiblings(
  result: [Fiber | null, Fiber | null],
  self: Fiber,
  child: null | Fiber,
  foundSelf: boolean = false,
): boolean {
  while (child !== null) {
    if (child === self) {
      foundSelf = true;
      if (child.sibling) {
        child = child.sibling;
      } else {
        return true;
      }
    }
    if (
      child.tag === HostComponent ||
      (enableFragmentRefsTextNodes && child.tag === HostText)
    ) {
      if (foundSelf) {
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
          foundSelf,
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
      (current === fragmentFiber || current.alternate === fragmentFiber)
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
      (current === fiberHostParent || current.alternate === fiberHostParent)
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
    if (nodeA === nodeB || (nodeB !== null && nodeA === nodeB.alternate)) {
      return nodeA;
    }
    nodeA = getParent(nodeA);
    nodeB = getParent(nodeB);
  }
  return null;
}
