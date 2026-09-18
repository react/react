/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactStackTrace} from 'shared/ReactTypes';

import type {
  AsyncSequence,
  IONode,
  PromiseNode,
  UnresolvedPromiseNode,
  AwaitNode,
  UnresolvedAwaitNode,
} from './ReactFlightAsyncSequence';

import {
  IO_NODE,
  PROMISE_NODE,
  UNRESOLVED_PROMISE_NODE,
  AWAIT_NODE,
  UNRESOLVED_AWAIT_NODE,
} from './ReactFlightAsyncSequence';
import {resolveOwner} from './flight/ReactFlightCurrentOwner';
import {resolveRequest, isAwaitInUserspace} from './ReactFlightServer';
import {createHook, executionAsyncId, AsyncResource} from 'async_hooks';
import {enableAsyncDebugInfo} from 'shared/ReactFeatureFlags';
import {parseStackTracePrivate} from './ReactFlightServerConfig';

// $FlowFixMe[method-unbinding]
const getAsyncId = AsyncResource.prototype.asyncId;

const pendingOperations: Map<number, AsyncSequence> =
  __DEV__ && enableAsyncDebugInfo ? new Map() : (null as any);

// Keep the last resolved await as a workaround for async functions missing data.
let lastRanAwait: null | AwaitNode = null;

function resolvePromiseOrAwaitNode(
  unresolvedNode: UnresolvedAwaitNode | UnresolvedPromiseNode,
  endTime: number,
): AwaitNode | PromiseNode {
  const resolvedNode: AwaitNode | PromiseNode = unresolvedNode as any;
  resolvedNode.tag = (
    unresolvedNode.tag === UNRESOLVED_PROMISE_NODE ? PROMISE_NODE : AWAIT_NODE
  ) as any;
  resolvedNode.end = endTime;
  return resolvedNode;
}

const emptyStack: ReactStackTrace = [];

// Initialize the tracing of async operations.
// We do this globally since the async work can potentially eagerly
// start before the first request and once requests start they can interleave.
// In theory we could enable and disable using a ref count of active requests
// but given that typically this is just a live server, it doesn't really matter.
export function initAsyncDebugInfo(): void {
  if (__DEV__ && enableAsyncDebugInfo) {
    createHook({
      init(
        asyncId: number,
        type: string,
        triggerAsyncId: number,
        resource: any,
      ): void {
        const trigger = pendingOperations.get(triggerAsyncId);
        let node: AsyncSequence;
        if (type === 'PROMISE') {
          const currentAsyncId = executionAsyncId();
          if (currentAsyncId !== triggerAsyncId) {
            // When you call .then() on a native Promise, or await/Promise.all() a thenable,
            // then this intermediate Promise is created. We use this as our await point
            if (trigger === undefined) {
              // We don't track awaits on things that started outside our tracked scope.
              return;
            }
            // If the thing we're waiting on is another Await we still track that sequence
            // so that we can later pick the best stack trace in user space.
            let stack = null;
            let promiseRef: WeakRef<Promise<any>>;
            if (
              trigger.stack !== null &&
              (trigger.tag === AWAIT_NODE ||
                trigger.tag === UNRESOLVED_AWAIT_NODE)
            ) {
              // We already had a stack for an await. In a chain of awaits we'll only need one good stack.
              // We mark it with an empty stack to signal to any await on this await that we have a stack.
              stack = emptyStack;
              if (resource._debugInfo !== undefined) {
                // We may need to forward this debug info at the end so we need to retain this promise.
                promiseRef = new WeakRef(resource as Promise<any>);
              } else {
                // Otherwise, we can just refer to the inner one since that's the one we'll log anyway.
                promiseRef = trigger.promise;
              }
            } else {
              promiseRef = new WeakRef(resource as Promise<any>);
              const request = resolveRequest();
              if (request === null) {
                // We don't collect stacks for awaits that weren't in the scope of a specific render.
              } else {
                stack = parseStackTracePrivate(new Error(), 5);
                if (stack !== null && !isAwaitInUserspace(request, stack)) {
                  // If this await was not done directly in user space, then clear the stack. We won't use it
                  // anyway. This lets future awaits on this await know that we still need to get their stacks
                  // until we find one in user space.
                  stack = null;
                }
              }
            }
            const current = pendingOperations.get(currentAsyncId);
            node = {
              tag: UNRESOLVED_AWAIT_NODE,
              owner: resolveOwner(),
              stack: stack,
              start: performance.now(),
              end: -1.1, // set when resolved.
              promise: promiseRef,
              awaited: trigger, // The thing we're awaiting on. Might get overrriden when we resolve.
              previous: current === undefined ? null : current, // The path that led us here.
            } as UnresolvedAwaitNode;
          } else {
            const owner = resolveOwner();
            node = {
              tag: UNRESOLVED_PROMISE_NODE,
              owner: owner,
              stack:
                owner === null ? null : parseStackTracePrivate(new Error(), 5),
              start: performance.now(),
              end: -1.1, // Set when we resolve.
              promise: new WeakRef(resource as Promise<any>),
              awaited:
                trigger === undefined
                  ? null // It might get overridden when we resolve.
                  : trigger,
              previous: null,
            } as UnresolvedPromiseNode;
          }
        } else if (
          // bound-anonymous-fn is the default name for snapshots and .bind() without a name.
          // This isn't I/O by itself but likely just a continuation. If the bound function
          // has a name, we might treat it as I/O but we can't tell the difference.
          type === 'bound-anonymous-fn' ||
          // queueMicroTask, process.nextTick and setImmediate aren't considered new I/O
          // for our purposes but just continuation of existing I/O.
          type === 'Microtask' ||
          type === 'TickObject' ||
          type === 'Immediate'
        ) {
          // Treat the trigger as the node to carry along the sequence.
          // For "bound-anonymous-fn" this will be the callsite of the .bind() which may not
          // be the best if the callsite of the .run() call is within I/O which should be
          // tracked. It might be better to track the execution context of "before()" as the
          // execution context for anything spawned from within the run(). Basically as if
          // it wasn't an AsyncResource at all.
          if (trigger === undefined) {
            return;
          }
          node = trigger;
        } else {
          // New I/O
          if (trigger === undefined) {
            // We have begun a new I/O sequence.
            const owner = resolveOwner();
            node = {
              tag: IO_NODE,
              owner: owner,
              stack:
                owner === null ? parseStackTracePrivate(new Error(), 3) : null,
              start: performance.now(),
              end: -1.1, // Only set when pinged.
              promise: null,
              awaited: null,
              previous: null,
            } as IONode;
          } else if (
            trigger.tag === AWAIT_NODE ||
            trigger.tag === UNRESOLVED_AWAIT_NODE
          ) {
            // We have begun a new I/O sequence after the await.
            const owner = resolveOwner();
            node = {
              tag: IO_NODE,
              owner: owner,
              stack:
                owner === null ? parseStackTracePrivate(new Error(), 3) : null,
              start: performance.now(),
              end: -1.1, // Only set when pinged.
              promise: null,
              awaited: null,
              previous: trigger,
            } as IONode;
          } else {
            // Otherwise, this is just a continuation of the same I/O sequence.
            node = trigger;
          }
        }
        pendingOperations.set(asyncId, node);
      },
      before(asyncId: number): void {
        const node = pendingOperations.get(asyncId);
        if (node !== undefined) {
          switch (node.tag) {
            case IO_NODE: {
              lastRanAwait = null;
              // Log the end time when we resolved the I/O.
              const ioNode: IONode = node as any;
              if (ioNode.end < 0) {
                ioNode.end = performance.now();
              } else {
                // This can happen more than once if it's a recurring resource like a connection.
                // Even for single events like setTimeout, this can happen three times due to ticks
                // and microtasks each running its own scope.
                // To preserve each operation's separate end time, we create a clone of the IO node.
                // Any pre-existing reference will refer to the first resolution and any new resolutions
                // will refer to the new node.
                const clonedNode: IONode = {
                  tag: IO_NODE,
                  owner: ioNode.owner,
                  stack: ioNode.stack,
                  start: ioNode.start,
                  end: performance.now(),
                  promise: ioNode.promise,
                  awaited: ioNode.awaited,
                  previous: ioNode.previous,
                };
                pendingOperations.set(asyncId, clonedNode);
              }
              break;
            }
            case UNRESOLVED_AWAIT_NODE: {
              // If we begin before we resolve, that means that this is actually already resolved but
              // the promiseResolve hook is called at the end of the execution. So we track the time
              // in the before call instead.
              // $FlowFixMe[incompatible-type]
              lastRanAwait = resolvePromiseOrAwaitNode(node, performance.now());
              break;
            }
            case AWAIT_NODE: {
              lastRanAwait = node;
              break;
            }
            case UNRESOLVED_PROMISE_NODE: {
              // We typically don't expected Promises to have an execution scope since only the awaits
              // have a then() callback. However, this can happen for native async functions. The last
              // piece of code that executes the return after the last await has the execution context
              // of the Promise.
              const resolvedNode = resolvePromiseOrAwaitNode(
                node,
                performance.now(),
              );
              // We are missing information about what this was unblocked by but we can guess that it
              // was whatever await we ran last since this will continue in a microtask after that.
              // This is not perfect because there could potentially be other microtasks getting in
              // between.
              resolvedNode.previous = lastRanAwait;
              lastRanAwait = null;
              break;
            }
            default: {
              lastRanAwait = null;
            }
          }
        }
      },

      promiseResolve(asyncId: number): void {
        const node = pendingOperations.get(asyncId);
        if (node !== undefined) {
          let resolvedNode: AwaitNode | PromiseNode;
          switch (node.tag) {
            case UNRESOLVED_AWAIT_NODE:
            case UNRESOLVED_PROMISE_NODE: {
              resolvedNode = resolvePromiseOrAwaitNode(node, performance.now());
              break;
            }
            case AWAIT_NODE:
            case PROMISE_NODE: {
              // We already resolved this in the before hook.
              resolvedNode = node;
              break;
            }
            default:
              // eslint-disable-next-line react-internal/prod-error-codes
              throw new Error(
                'A Promise should never be an IO_NODE. This is a bug in React.',
              );
          }
          const currentAsyncId = executionAsyncId();
          if (asyncId !== currentAsyncId) {
            // If the promise was not resolved by itself, then that means that
            // the trigger that we originally stored wasn't actually the dependency.
            // Instead, the current execution context is what ultimately unblocked it.
            const awaited = pendingOperations.get(currentAsyncId);
            if (resolvedNode.tag === PROMISE_NODE) {
              // For a Promise we just override the await. We're not interested in
              // what created the Promise itself.
              resolvedNode.awaited = awaited === undefined ? null : awaited;
            } else {
              // For an await, there's really two things awaited here. It's the trigger
              // that .then() was called on but there seems to also be something else
              // in the .then() callback that blocked the returned Promise from resolving
              // immediately. We create a fork node which essentially represents an await
              // of the Promise returned from the .then() callback. That Promise was blocked
              // on the original awaited thing which we stored as "previous".
              if (awaited !== undefined) {
                const clonedNode: AwaitNode = {
                  tag: AWAIT_NODE,
                  owner: resolvedNode.owner,
                  stack: resolvedNode.stack,
                  start: resolvedNode.start,
                  end: resolvedNode.end,
                  promise: resolvedNode.promise,
                  awaited: resolvedNode.awaited,
                  previous: resolvedNode.previous,
                };
                // We started awaiting on the callback when the original .then() resolved.
                resolvedNode.start = resolvedNode.end;
                // It resolved now. We could use the end time of "awaited" maybe.
                resolvedNode.end = performance.now();
                resolvedNode.previous = clonedNode;
                resolvedNode.awaited = awaited;
              }
            }
          }
        }
      },

      destroy(asyncId: number): void {
        // If we needed the meta data from this operation we should have already
        // extracted it or it should be part of a chain of triggers.
        pendingOperations.delete(asyncId);
      },
    }).enable();
  }
}

export function markAsyncSequenceRootTask(): void {
  if (__DEV__ && enableAsyncDebugInfo) {
    // Whatever Task we're running now is spawned by React itself to perform render work.
    // Don't track any cause beyond this task. We may still track I/O that was started outside
    // React but just not the cause of entering the render.
    pendingOperations.delete(executionAsyncId());
  }
}

export function getCurrentAsyncSequence(): null | AsyncSequence {
  if (!__DEV__ || !enableAsyncDebugInfo) {
    return null;
  }
  const currentNode = pendingOperations.get(executionAsyncId());
  if (currentNode === undefined) {
    // Nothing that we tracked led to the resolution of this execution context.
    return null;
  }
  return currentNode;
}

export function getAsyncSequenceFromPromise(
  promise: any,
): null | AsyncSequence {
  if (!__DEV__ || !enableAsyncDebugInfo) {
    return null;
  }
  // A Promise is conceptually an AsyncResource but doesn't have its own methods.
  // We use this hack to extract the internal asyncId off the Promise.
  let asyncId: void | number;
  try {
    asyncId = getAsyncId.call(promise);
  } catch (x) {
    // Ignore errors extracting the ID. We treat it as missing.
    // This could happen if our hack stops working or in the case where this is
    // a Proxy that throws such as our own ClientReference proxies.
  }
  if (asyncId === undefined) {
    return null;
  }
  const node = pendingOperations.get(asyncId);
  if (node === undefined) {
    return null;
  }
  return node;
}
