/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber, FiberRoot} from './ReactInternalTypes';
import type {
  UpdateQueue as HookQueue,
  Update as HookUpdate,
} from './ReactFiberHooks';
import type {
  SharedQueue as ClassQueue,
  Update as ClassUpdate,
} from './ReactFiberClassUpdateQueue';
import type {Lane, Lanes} from './ReactFiberLane';
import type {OffscreenInstance} from './ReactFiberOffscreenComponent';

import {
  warnAboutUpdateOnNotYetMountedFiberInDEV,
  throwIfInfiniteUpdateLoopDetected,
  getWorkInProgressRoot,
  isAlreadyRendering,
} from './ReactFiberWorkLoop';
import {getPreviousVersion} from './ReactFiberInstance';
import {
  invalidateInProgressVersion,
  markInProgressSubtreeStale,
} from './ReactFiberResuming';
import {NoLane, NoLanes, mergeLanes, markHiddenUpdate} from './ReactFiberLane';
import {NoFlags, Placement, Hydrating} from './ReactFiberFlags';
import {HostComponent, HostRoot, OffscreenComponent} from './ReactWorkTags';
import {OffscreenVisible} from './ReactFiberOffscreenComponent';

export type ConcurrentUpdate = {
  next: ConcurrentUpdate,
  lane: Lane,
};

type ConcurrentQueue = {
  pending: ConcurrentUpdate | null,
};

// If a render is in progress, and we receive an update from a concurrent event,
// we wait until the current render is over (either finished or interrupted)
// before adding it to the fiber/hook queue. Push to this array so we can
// access the queue, fiber, update, et al later.
const concurrentQueues: Array<any> = [];
let concurrentQueuesIndex = 0;

let concurrentlyUpdatedLanes: Lanes = NoLanes;

export function finishQueueingConcurrentUpdates(): void {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;

  concurrentlyUpdatedLanes = NoLanes;

  let i = 0;
  while (i < endIndex) {
    // A commit may have happened since the update was enqueued, in which case
    // the fiber it was enqueued on has been replaced by a newer version.
    const enqueuedFiber: Fiber = concurrentQueues[i];
    const fiber: Fiber = enqueuedFiber.instance.current;
    if (
      fiber !== enqueuedFiber &&
      enqueuedFiber.tag === HostComponent &&
      fiber.memoizedState === null
    ) {
      // A host component became stateful (see ensureFormComponentIsStateful)
      // after the version that replaced it was cloned. Its hooks were
      // installed outside of the render phase, so they're carried over here.
      fiber.memoizedState = enqueuedFiber.memoizedState;
    }
    concurrentQueues[i++] = null;
    const queue: ConcurrentQueue = concurrentQueues[i];
    concurrentQueues[i++] = null;
    const update: ConcurrentUpdate = concurrentQueues[i];
    concurrentQueues[i++] = null;
    const lane: Lane = concurrentQueues[i];
    concurrentQueues[i++] = null;

    // $FlowFixMe[invalid-compare]
    if (queue !== null && update !== null) {
      const pending = queue.pending;
      if (pending === null) {
        // This is the first update. Create a circular list.
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }

    if (lane !== NoLane) {
      markUpdateLaneFromFiberToRoot(fiber, update, lane, true);
    }
  }
}

export function getConcurrentlyUpdatedLanes(): Lanes {
  return concurrentlyUpdatedLanes;
}

function enqueueUpdate(
  fiber: Fiber,
  queue: ConcurrentQueue | null,
  update: ConcurrentUpdate | null,
  lane: Lane,
) {
  // Don't update the `childLanes` on the return path yet. If we already in
  // the middle of rendering, wait until after it has completed.
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;

  concurrentlyUpdatedLanes = mergeLanes(concurrentlyUpdatedLanes, lane);

  // The fiber's `lane` field is used in some places to check if any work is
  // scheduled, to perform an eager bailout, so we need to update it immediately.
  // TODO: We should probably move this to the "shared" queue instead.
  fiber.lanes = mergeLanes(fiber.lanes, lane);
}

export function enqueueConcurrentHookUpdate<S, A>(
  fiber: Fiber,
  queue: HookQueue<S, A>,
  update: HookUpdate<S, A>,
  lane: Lane,
): FiberRoot | null {
  const concurrentQueue: ConcurrentQueue = queue as any;
  const concurrentUpdate: ConcurrentUpdate = update as any;
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
  return getRootForUpdatedFiber(fiber);
}

export function enqueueConcurrentHookUpdateAndEagerlyBailout<S, A>(
  fiber: Fiber,
  queue: HookQueue<S, A>,
  update: HookUpdate<S, A>,
): void {
  // This function is used to queue an update that doesn't need a rerender. The
  // only reason we queue it is in case there's a subsequent higher priority
  // update that causes it to be rebased.
  const lane = NoLane;
  const concurrentQueue: ConcurrentQueue = queue as any;
  const concurrentUpdate: ConcurrentUpdate = update as any;
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);

  // Usually we can rely on the upcoming render phase to process the concurrent
  // queue. However, since this is a bail out, we're not scheduling any work
  // here. So the update we just queued will leak until something else happens
  // to schedule work (if ever).
  //
  // Check if we're currently in the middle of rendering or committing a tree,
  // and if not, process the queue immediately to prevent a leak. During a
  // commit the queue is processed once the finished tree has become current.
  const isConcurrentlyRendering = getWorkInProgressRoot() !== null;
  if (!isConcurrentlyRendering && !isAlreadyRendering()) {
    finishQueueingConcurrentUpdates();
  }
}

export function enqueueConcurrentClassUpdate<State>(
  fiber: Fiber,
  queue: ClassQueue<State>,
  update: ClassUpdate<State>,
  lane: Lane,
): FiberRoot | null {
  const concurrentQueue: ConcurrentQueue = queue as any;
  const concurrentUpdate: ConcurrentUpdate = update as any;
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
  return getRootForUpdatedFiber(fiber);
}

export function enqueueConcurrentRenderForLane(
  fiber: Fiber,
  lane: Lane,
): FiberRoot | null {
  enqueueUpdate(fiber, null, null, lane);
  return getRootForUpdatedFiber(fiber);
}

// Calling this function outside this module should only be done for backwards
// compatibility and should always be accompanied by a warning.
export function unsafe_markUpdateLaneFromFiberToRoot(
  sourceFiber: Fiber,
  lane: Lane,
): FiberRoot | null {
  // NOTE: For Hyrum's Law reasons, if an infinite update loop is detected, it
  // should throw before `markUpdateLaneFromFiberToRoot` is called. But this is
  // undefined behavior and we can change it if we need to; it just so happens
  // that, at the time of this writing, there's an internal product test that
  // happens to rely on this.
  const root = getRootForUpdatedFiber(sourceFiber);
  if (sourceFiber.instance.current !== sourceFiber) {
    // This is a work-in-progress fiber (legacy Suspense marking a fiber that
    // didn't complete). The render that's in progress decides what happens to
    // the lane, so only its tree is marked.
    markUpdateLaneFromFiberToRoot(sourceFiber, null, lane, false);
  } else {
    // This is the committed version of the fiber. Mark the committed tree so
    // that, if the render hasn't visited this fiber yet, it knows there's work
    // when it does. If the render has already visited it, the update can only
    // be processed by the next render, which clones whatever this one commits.
    // Queue the lane so that it gets marked on that tree too (or on this one
    // again, if this render is thrown away).
    markUpdateLaneFromFiberToRoot(sourceFiber, null, lane, true);
    enqueueUpdate(sourceFiber, null, null, lane);
  }
  return root;
}

function markUpdateLaneFromFiberToRoot(
  sourceFiber: Fiber,
  update: ConcurrentUpdate | null,
  lane: Lane,
  isCommittedTree: boolean,
): null | FiberRoot {
  // Update the source fiber's lanes
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  invalidateInProgressVersion(sourceFiber);
  // Walk the parent path to the root and update the child lanes.
  let isHidden = false;
  let parent = sourceFiber.return;
  let node = sourceFiber;
  while (parent !== null) {
    if (isCommittedTree) {
      // Return pointers of fibers in the committed tree normally point to
      // committed parents, but the render phase may have repointed one at a
      // work-in-progress parent that has since been committed or thrown away.
      parent = parent.instance.current;
    }
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    markInProgressSubtreeStale(parent);

    if (parent.tag === OffscreenComponent) {
      // Check if this offscreen boundary is currently hidden.
      //
      // The instance may be null if the Offscreen parent was unmounted. Usually
      // the parent wouldn't be reachable in that case because we disconnect
      // fibers from the tree when they are deleted. However, there's a weird
      // edge case where setState is called on a fiber that was interrupted
      // before it ever mounted. Because it never mounts, it also never gets
      // deleted. Because it never gets deleted, its return pointer never gets
      // disconnected. Which means it may be attached to a deleted Offscreen
      // parent node. (This discovery suggests it may be better for memory usage
      // if we don't attach the `return` pointer until the commit phase, though
      // in order to do that we'd need some other way to track the return
      // pointer during the initial render, like on the stack.)
      //
      // This case is always accompanied by a warning, but we still need to
      // account for it. (There may be other cases that we haven't discovered,
      // too.)
      const offscreenInstance: OffscreenInstance | null = parent.stateNode;
      if (
        offscreenInstance !== null &&
        !(offscreenInstance._visibility & OffscreenVisible)
      ) {
        isHidden = true;
      }
    }

    node = parent;
    parent = parent.return;
  }

  if (node.tag === HostRoot) {
    const root: FiberRoot = node.stateNode;
    if (isHidden && update !== null) {
      markHiddenUpdate(root, update, lane);
    }
    if (isCommittedTree) {
      // A work-in-progress tree that was cloned from this one before the
      // update was marked doesn't know about this lane. Track it on the root
      // so that it isn't dropped when that tree commits.
      root.currentTreeUpdatedLanes = mergeLanes(
        root.currentTreeUpdatedLanes,
        lane,
      );
    }
    return root;
  }
  return null;
}

function getRootForUpdatedFiber(sourceFiber: Fiber): FiberRoot | null {
  // TODO: We will detect and infinite update loop and throw even if this fiber
  // has already unmounted. This isn't really necessary but it happens to be the
  // current behavior we've used for several release cycles. Consider not
  // performing this check if the updated fiber already unmounted, since it's
  // not possible for that to cause an infinite update loop.
  throwIfInfiniteUpdateLoopDetected(false);

  // When a setState happens, we must ensure the root is scheduled. Because
  // update queues do not have a backpointer to the root, the only way to do
  // this currently is to walk up the return path. This used to not be a big
  // deal because we would have to walk up the return path to set
  // the `childLanes`, anyway, but now those two traversals happen at
  // different times.
  // TODO: Consider adding a `root` backpointer on the update queue.
  detectUpdateOnUnmountedFiber(sourceFiber, sourceFiber);
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    detectUpdateOnUnmountedFiber(sourceFiber, node);
    // See markUpdateLaneFromFiberToRoot for why this resolves the parent.
    node = parent.instance.current;
    parent = node.return;
  }
  return node.tag === HostRoot ? (node.stateNode as FiberRoot) : null;
}

function detectUpdateOnUnmountedFiber(sourceFiber: Fiber, parent: Fiber) {
  if (__DEV__) {
    const alternate = getPreviousVersion(parent);
    if (
      alternate === null &&
      (parent.flags & (Placement | Hydrating)) !== NoFlags
    ) {
      warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
    }
  }
}
