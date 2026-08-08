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
import {createHook, executionAsyncId} from 'async_hooks';
import {promiseHooks} from 'v8';
import {enableAsyncDebugInfo} from 'shared/ReactFeatureFlags';
import {parseStackTracePrivate} from './ReactFlightServerConfig';

// Promises are tracked by the Promise instance itself using V8's promise
// hooks which pass us the instances directly. This way a tracking node lives
// exactly as long as the Promise it describes is still reachable, without us
// having to observe when the Promise is garbage collected.
const pendingPromises: WeakMap<Promise<any>, AsyncSequence> = __DEV__ &&
enableAsyncDebugInfo
  ? new WeakMap()
  : (null as any);

const pendingOperations: Map<number, AsyncSequence> =
  __DEV__ && enableAsyncDebugInfo ? new Map() : (null as any);

// The stack of Promises whose continuations are currently executing.
// The equivalent of executionAsyncId() for the V8 promise hooks.
const executingPromises: Array<Promise<any>> =
  __DEV__ && enableAsyncDebugInfo ? [] : (null as any);

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

function getCurrentOperation(): void | AsyncSequence {
  // If we're executing within a Promise continuation, that Promise is the
  // current execution context. Otherwise, we're in a non-Promise resource's
  // callback (e.g. a timer or socket) tracked by async_hooks.
  if (executingPromises.length > 0) {
    return pendingPromises.get(executingPromises[executingPromises.length - 1]);
  }
  return pendingOperations.get(executionAsyncId());
}

function createAwaitNode(
  promise: Promise<any>,
  trigger: AsyncSequence,
): UnresolvedAwaitNode {
  // If the thing we're waiting on is another Await we still track that sequence
  // so that we can later pick the best stack trace in user space.
  let stack = null;
  let promiseRef: WeakRef<Promise<any>>;
  if (
    trigger.stack !== null &&
    (trigger.tag === AWAIT_NODE || trigger.tag === UNRESOLVED_AWAIT_NODE)
  ) {
    // We already had a stack for an await. In a chain of awaits we'll only need one good stack.
    // We mark it with an empty stack to signal to any await on this await that we have a stack.
    stack = emptyStack;
    if ((promise as any)._debugInfo !== undefined) {
      // We may need to forward this debug info at the end so we need to retain this promise.
      promiseRef = new WeakRef(promise);
    } else {
      // Otherwise, we can just refer to the inner one since that's the one we'll log anyway.
      promiseRef = trigger.promise;
    }
  } else {
    promiseRef = new WeakRef(promise);
    const request = resolveRequest();
    if (request === null) {
      // We don't collect stacks for awaits that weren't in the scope of a specific render.
    } else {
      stack = parseHookStackTrace(new Error(), 2);
      if (stack !== null && !isAwaitInUserspace(request, stack)) {
        // If this await was not done directly in user space, then clear the stack. We won't use it
        // anyway. This lets future awaits on this await know that we still need to get their stacks
        // until we find one in user space.
        stack = null;
      }
    }
  }
  const current = getCurrentOperation();
  return {
    tag: UNRESOLVED_AWAIT_NODE,
    owner: resolveOwner(),
    stack: stack,
    start: performance.now(),
    end: -1.1, // set when resolved.
    promise: promiseRef,
    awaited: trigger, // The thing we're awaiting on. Might get overrriden when we resolve.
    previous: current === undefined ? null : current, // The path that led us here.
  } as UnresolvedAwaitNode;
}

function createPromiseNode(
  promise: Promise<any>,
  trigger: void | AsyncSequence,
): UnresolvedPromiseNode {
  const owner = resolveOwner();
  return {
    tag: UNRESOLVED_PROMISE_NODE,
    owner: owner,
    stack: owner === null ? null : parseHookStackTrace(new Error(), 2),
    start: performance.now(),
    end: -1.1, // Set when we resolve.
    promise: new WeakRef(promise),
    awaited:
      trigger === undefined
        ? null // It might get overridden when we resolve.
        : trigger,
    previous: null,
  } as UnresolvedPromiseNode;
}

function beforeExecution(node: AsyncSequence): void {
  switch (node.tag) {
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
      const resolvedNode = resolvePromiseOrAwaitNode(node, performance.now());
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

function promiseSettled(node: AsyncSequence, selfResolved: boolean): void {
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
  if (!selfResolved) {
    // If the promise was not resolved by itself, then that means that
    // the trigger that we originally stored wasn't actually the dependency.
    // Instead, the current execution context is what ultimately unblocked it.
    const awaited = getCurrentOperation();
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

const emptyStack: ReactStackTrace = [];

// Stacks captured inside a hook callback start with our own frames, then the
// dispatch frames of the hook infrastructure, which are not a fixed depth
// (Node adds a frame when something else in the process also registered
// v8.promiseHooks). So we skip our frames by count and the dispatch frames
// by module. Only the dispatch modules: frames from other node internals
// are what classifies an await as not being in user space.
function parseHookStackTrace(
  error: Error,
  // How many of our own frames sit between the error and the hook dispatch:
  // one for the hook callback itself plus one per helper in between.
  skipFrames: number,
): null | ReactStackTrace {
  return parseStackTracePrivate(error, skipFrames, true);
}

// Initialize the tracing of async operations.
// We do this globally since the async work can potentially eagerly
// start before the first request and once requests start they can interleave.
// In theory we could enable and disable using a ref count of active requests
// but given that typically this is just a live server, it doesn't really matter.
export function initAsyncDebugInfo(): void {
  if (__DEV__ && enableAsyncDebugInfo) {
    if (promiseHooks == null) {
      // This is not a V8 runtime. Async debug info is not supported.
      return;
    }
    try {
      promiseHooks.createHook({
        init(promise: Promise<any>, parent: void | Promise<any>): void {
          let node: AsyncSequence;
          if (parent !== undefined) {
            // When you call .then() on a native Promise, or await/Promise.all() a thenable,
            // then this intermediate Promise is created. We use this as our await point.
            const trigger = pendingPromises.get(parent);
            if (trigger === undefined) {
              // We don't track awaits on things that started outside our tracked scope.
              return;
            }
            node = createAwaitNode(promise, trigger);
          } else {
            node = createPromiseNode(promise, getCurrentOperation());
          }
          pendingPromises.set(promise, node);
        },
        before(promise: Promise<any>): void {
          executingPromises.push(promise);
          const node = pendingPromises.get(promise);
          if (node !== undefined) {
            beforeExecution(node);
          }
        },
        after(promise: Promise<any>): void {
          // Normally the top of the stack but we scan defensively in case an
          // unwind was not observed.
          for (let i = executingPromises.length - 1; i >= 0; i--) {
            if (executingPromises[i] === promise) {
              executingPromises.length = i;
              return;
            }
          }
        },
        settled(promise: Promise<any>): void {
          const node = pendingPromises.get(promise);
          if (node !== undefined) {
            const executingPromise =
              executingPromises.length > 0
                ? executingPromises[executingPromises.length - 1]
                : null;
            promiseSettled(node, promise === executingPromise);
          }
        },
      });
    } catch (x) {
      // Some runtimes ship a v8 module whose promise hooks are not functional
      // (e.g. Bun). Async debug info is not supported there.
      return;
    }
    createHook({
      init(
        asyncId: number,
        type: string,
        triggerAsyncId: number,
        resource: any,
      ): void {
        if (type === 'PROMISE') {
          // Promises are tracked by the V8 promise hooks above which hand us
          // the instances themselves rather than reducing them to ids.
          return;
        }
        let trigger: void | AsyncSequence;
        if (triggerAsyncId === executionAsyncId()) {
          // Spawned by whatever we're currently executing, which may be a
          // Promise continuation that async_hooks only knows by id.
          trigger = getCurrentOperation();
        } else {
          // Spawned by another resource, such as a connection on a server handle.
          trigger = pendingOperations.get(triggerAsyncId);
        }
        let node: AsyncSequence;
        if (
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
                owner === null ? parseHookStackTrace(new Error(), 1) : null,
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
                owner === null ? parseHookStackTrace(new Error(), 1) : null,
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
          if (node.tag === IO_NODE) {
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
          } else {
            beforeExecution(node);
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
    if (executingPromises.length > 0) {
      pendingPromises.delete(executingPromises[executingPromises.length - 1]);
    } else {
      pendingOperations.delete(executionAsyncId());
    }
  }
}

export function getCurrentAsyncSequence(): null | AsyncSequence {
  if (!__DEV__ || !enableAsyncDebugInfo) {
    return null;
  }
  const currentNode = getCurrentOperation();
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
  const node = pendingPromises.get(promise);
  if (node === undefined) {
    return null;
  }
  return node;
}
