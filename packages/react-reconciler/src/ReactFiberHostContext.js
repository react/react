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
import type {
  Container,
  HostContext,
  TransitionStatus,
} from './ReactFiberConfig';
import type {Hook} from './ReactFiberHooks';

import {
  getChildHostContext,
  getRootHostContext,
  HostTransitionContext,
  NotPendingTransition,
  isPrimaryRenderer,
} from './ReactFiberConfig';
import {createCursor, push, pop} from './ReactFiberStack';

const contextStackCursor: StackCursor<HostContext | null> = createCursor(null);
const contextFiberStackCursor: StackCursor<Fiber | null> = createCursor(null);
const rootInstanceStackCursor: StackCursor<Container | null> =
  createCursor(null);

// Represents the nearest host transition provider (in React DOM, a <form />)
// NOTE: Since forms cannot be nested, and this feature is only implemented by
// React DOM, we don't technically need this to be a stack. It could be a single
// module variable instead.
const hostTransitionProviderCursor: StackCursor<Fiber | null> =
  createCursor(null);

function requiredContext<Value>(c: Value | null): Value {
  if (__DEV__) {
    if (c === null) {
      console.error(
        'Expected host context to exist. This error is likely caused by a bug ' +
          'in React. Please file an issue.',
      );
    }
  }
  return c as any;
}

function getCurrentRootHostContainer(): null | Container {
  return rootInstanceStackCursor.current;
}

function getRootHostContainer(): Container {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  return rootInstance;
}

export function getHostTransitionProvider(): Fiber | null {
  return hostTransitionProviderCursor.current;
}

function pushHostContainer(fiber: Fiber, nextRootInstance: Container): void {
  // Push current root instance onto the stack;
  // This allows us to reset root when portals are popped.
  push(rootInstanceStackCursor, nextRootInstance, fiber);
  // Track the context and the Fiber that provided it.
  // This enables us to pop only Fibers that provide unique contexts.
  push(contextFiberStackCursor, fiber, fiber);

  // Finally, we need to push the host context to the stack.
  // However, we can't just call getRootHostContext() and push it because
  // we'd have a different number of entries on the stack depending on
  // whether getRootHostContext() throws somewhere in renderer code or not.
  // So we push an empty value first. This lets us safely unwind on errors.
  push(contextStackCursor, null, fiber);
  const nextRootContext = getRootHostContext(nextRootInstance);
  // Now that we know this function doesn't throw, replace it.
  pop(contextStackCursor, fiber);
  push(contextStackCursor, nextRootContext, fiber);
}

function popHostContainer(fiber: Fiber) {
  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
  pop(rootInstanceStackCursor, fiber);
}

function getHostContext(): HostContext {
  const context = requiredContext(contextStackCursor.current);
  return context;
}

function pushHostContext(fiber: Fiber): void {
  const stateHook: Hook | null = fiber.memoizedState;
  if (stateHook !== null) {
    // Propagate the current state to all the descendents.
    // We use Context as an implementation detail for this.
    //
    // NOTE: This assumes that there cannot be nested transition providers,
    // because the only renderer that implements this feature is React DOM,
    // and forms cannot be nested. If we did support nested providers, then
    // we would need to push a context value even for host fibers that
    // haven't been upgraded yet.
    const transitionStatus: TransitionStatus = stateHook.memoizedState;
    // $FlowFixMe[constant-condition]
    if (isPrimaryRenderer) {
      HostTransitionContext._currentValue = transitionStatus;
    } else {
      HostTransitionContext._currentValue2 = transitionStatus;
    }

    // Only provide context if this fiber has been upgraded by a host
    // transition. We use the same optimization for regular host context below.
    push(hostTransitionProviderCursor, fiber, fiber);
  }

  const context: HostContext = requiredContext(contextStackCursor.current);
  const nextContext = getChildHostContext(context, fiber.type);

  // Don't push this Fiber's context unless it's unique.
  if (context !== nextContext) {
    // Track the context and the Fiber that provided it.
    // This enables us to pop only Fibers that provide unique contexts.
    push(contextFiberStackCursor, fiber, fiber);
    push(contextStackCursor, nextContext, fiber);
  }
}

function popHostContext(fiber: Fiber): void {
  if (contextFiberStackCursor.current === fiber) {
    // Do not pop unless this Fiber provided the current context.
    // pushHostContext() only pushes Fibers that provide unique contexts.
    pop(contextStackCursor, fiber);
    pop(contextFiberStackCursor, fiber);
  }

  if (hostTransitionProviderCursor.current === fiber) {
    // Do not pop unless this Fiber provided the current context. This is mostly
    // a performance optimization, but conveniently it also prevents a potential
    // data race where a host provider is upgraded (i.e. memoizedState becomes
    // non-null) during a concurrent event. This is a bit of a flaw in the way
    // we upgrade host components, but because we're accounting for it here, it
    // should be fine.
    pop(hostTransitionProviderCursor, fiber);

    // When popping the transition provider, we reset the context value back
    // to `NotPendingTransition`. We can do this because you're not allowed to nest forms. If
    // we allowed for multiple nested host transition providers, then we'd
    // need to reset this to the parent provider's status.
    // $FlowFixMe[constant-condition]
    if (isPrimaryRenderer) {
      HostTransitionContext._currentValue = NotPendingTransition;
    } else {
      HostTransitionContext._currentValue2 = NotPendingTransition;
    }
  }
}

export {
  getHostContext,
  getCurrentRootHostContainer,
  getRootHostContainer,
  popHostContainer,
  popHostContext,
  pushHostContainer,
  pushHostContext,
};
