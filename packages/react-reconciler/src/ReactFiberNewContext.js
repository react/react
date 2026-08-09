/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {
  Fiber,
  ContextDependency,
  Dependencies,
} from './ReactInternalTypes';
import type {StackCursor} from './ReactFiberStack';
import type {Lanes} from './ReactFiberLane';
import type {TransitionStatus} from './ReactFiberConfig';
import type {Hook} from './ReactFiberHooks';

import {isPrimaryRenderer, HostTransitionContext} from './ReactFiberConfig';
import {createCursor, push, pop} from './ReactFiberStack';
import {
  ContextProvider,
  DehydratedFragment,
  SuspenseComponent,
} from './ReactWorkTags';
import {NoLanes, isSubsetOfLanes, mergeLanes} from './ReactFiberLane';
import {
  NoFlags,
  DidPropagateContext,
  NeedsPropagation,
} from './ReactFiberFlags';

import is from 'shared/objectIs';
import {getHostTransitionProvider} from './ReactFiberHostContext';

const valueCursor: StackCursor<mixed> = createCursor(null);

let rendererCursorDEV: StackCursor<Object | null>;
if (__DEV__) {
  rendererCursorDEV = createCursor(null);
}
let renderer2CursorDEV: StackCursor<Object | null>;
if (__DEV__) {
  renderer2CursorDEV = createCursor(null);
}

let rendererSigil;
if (__DEV__) {
  // Use this to detect multiple renderers using the same context
  rendererSigil = {};
}

let currentlyRenderingFiber: Fiber | null = null;
let lastContextDependency: ContextDependency<mixed> | null = null;

let isDisallowedContextReadInDEV: boolean = false;

export function resetContextDependencies(): void {
  // This is called right before React yields execution, to ensure `readContext`
  // cannot be called outside the render phase.
  currentlyRenderingFiber = null;
  lastContextDependency = null;
  if (__DEV__) {
    isDisallowedContextReadInDEV = false;
  }
}

export function enterDisallowedContextReadInDEV(): void {
  if (__DEV__) {
    isDisallowedContextReadInDEV = true;
  }
}

export function exitDisallowedContextReadInDEV(): void {
  if (__DEV__) {
    isDisallowedContextReadInDEV = false;
  }
}

export function pushProvider<T>(
  providerFiber: Fiber,
  context: ReactContext<T>,
  nextValue: T,
): void {
  // $FlowFixMe[constant-condition]
  if (isPrimaryRenderer) {
    push(valueCursor, context._currentValue, providerFiber);

    context._currentValue = nextValue;
    if (__DEV__) {
      push(rendererCursorDEV, context._currentRenderer, providerFiber);

      if (
        context._currentRenderer !== undefined &&
        context._currentRenderer !== null &&
        context._currentRenderer !== rendererSigil
      ) {
        console.error(
          'Detected multiple renderers concurrently rendering the ' +
            'same context provider. This is currently unsupported.',
        );
      }
      context._currentRenderer = rendererSigil;
    }
  } else {
    push(valueCursor, context._currentValue2, providerFiber);

    context._currentValue2 = nextValue;
    if (__DEV__) {
      push(renderer2CursorDEV, context._currentRenderer2, providerFiber);

      if (
        context._currentRenderer2 !== undefined &&
        context._currentRenderer2 !== null &&
        context._currentRenderer2 !== rendererSigil
      ) {
        console.error(
          'Detected multiple renderers concurrently rendering the ' +
            'same context provider. This is currently unsupported.',
        );
      }
      context._currentRenderer2 = rendererSigil;
    }
  }
}

export function popProvider(
  context: ReactContext<any>,
  providerFiber: Fiber,
): void {
  const currentValue = valueCursor.current;

  // $FlowFixMe[constant-condition]
  if (isPrimaryRenderer) {
    context._currentValue = currentValue;
    if (__DEV__) {
      const currentRenderer = rendererCursorDEV.current;
      pop(rendererCursorDEV, providerFiber);
      context._currentRenderer = currentRenderer;
    }
  } else {
    context._currentValue2 = currentValue;
    if (__DEV__) {
      const currentRenderer2 = renderer2CursorDEV.current;
      pop(renderer2CursorDEV, providerFiber);
      context._currentRenderer2 = currentRenderer2;
    }
  }

  pop(valueCursor, providerFiber);
}

export function scheduleContextWorkOnParentPath(
  parent: Fiber | null,
  renderLanes: Lanes,
  propagationRoot: Fiber,
) {
  // Update the child lanes of all the ancestors, including the alternates.
  let node = parent;
  while (node !== null) {
    const alternate = node.alternate;
    if (!isSubsetOfLanes(node.childLanes, renderLanes)) {
      node.childLanes = mergeLanes(node.childLanes, renderLanes);
      if (alternate !== null) {
        alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
      }
    } else if (
      alternate !== null &&
      !isSubsetOfLanes(alternate.childLanes, renderLanes)
    ) {
      alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
    } else {
      // Neither alternate was updated.
      // Normally, this would mean that the rest of the
      // ancestor path already has sufficient priority.
      // However, this is not necessarily true inside offscreen
      // or fallback trees because childLanes may be inconsistent
      // with the surroundings. This is why we continue the loop.
    }
    if (node === propagationRoot) {
      break;
    }
    node = node.return;
  }
  if (__DEV__) {
    if (node !== propagationRoot) {
      console.error(
        'Expected to find the propagation root when scheduling context work. ' +
          'This error is likely caused by a bug in React. Please file an issue.',
      );
    }
  }
}

export function propagateContextChange<T>(
  workInProgress: Fiber,
  context: ReactContext<T>,
  renderLanes: Lanes,
): void {
  // TODO: This path is only used by Cache components. Update
  // lazilyPropagateParentContextChanges to look for Cache components so they
  // can take advantage of lazy propagation.
  const forcePropagateEntireTree = true;
  propagateContextChanges(
    workInProgress,
    [context],
    renderLanes,
    forcePropagateEntireTree,
  );
}

function propagateContextChanges<T>(
  workInProgress: Fiber,
  contexts: Array<any>,
  renderLanes: Lanes,
  forcePropagateEntireTree: boolean,
): void {
  let fiber = workInProgress.child;
  if (fiber !== null) {
    // Set the return pointer of the child to the work-in-progress fiber.
    fiber.return = workInProgress;
  }
  while (fiber !== null) {
    let nextFiber;

    // Visit this fiber.
    const list = fiber.dependencies;
    if (list !== null) {
      nextFiber = fiber.child;

      let dep = list.firstContext;
      findChangedDep: while (dep !== null) {
        // Assigning these to constants to help Flow
        const dependency = dep;
        const consumer = fiber;
        findContext: for (let i = 0; i < contexts.length; i++) {
          const context: ReactContext<T> = contexts[i];
          // Check if the context matches.
          // $FlowFixMe[invalid-compare]
          if (dependency.context === context) {
            // Match! Schedule an update on this fiber.

            // In the lazy implementation, don't mark a dirty flag on the
            // dependency itself. Not all changes are propagated, so we can't
            // rely on the propagation function alone to determine whether
            // something has changed; the consumer will check. In the future, we
            // could add back a dirty flag as an optimization to avoid double
            // checking, but until we have selectors it's not really worth
            // the trouble.
            consumer.lanes = mergeLanes(consumer.lanes, renderLanes);
            const alternate = consumer.alternate;
            if (alternate !== null) {
              alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
            }
            scheduleContextWorkOnParentPath(
              consumer.return,
              renderLanes,
              workInProgress,
            );

            if (!forcePropagateEntireTree) {
              // During lazy propagation, when we find a match, we can defer
              // propagating changes to the children, because we're going to
              // visit them during render. We should continue propagating the
              // siblings, though
              nextFiber = null;
            }

            // Since we already found a match, we can stop traversing the
            // dependency list.
            break findChangedDep;
          }
        }
        dep = dependency.next;
      }
    } else if (fiber.tag === DehydratedFragment) {
      // If a dehydrated suspense boundary is in this subtree, we don't know
      // if it will have any context consumers in it. The best we can do is
      // mark it as having updates.
      const parentSuspense = fiber.return;

      if (parentSuspense === null) {
        throw new Error(
          'We just came from a parent so we must have had a parent. This is a bug in React.',
        );
      }

      parentSuspense.lanes = mergeLanes(parentSuspense.lanes, renderLanes);
      const alternate = parentSuspense.alternate;
      if (alternate !== null) {
        alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
      }
      // This is intentionally passing this fiber as the parent
      // because we want to schedule this fiber as having work
      // on its children. We'll use the childLanes on
      // this fiber to indicate that a context has changed.
      scheduleContextWorkOnParentPath(
        parentSuspense,
        renderLanes,
        workInProgress,
      );
      nextFiber = null;
    } else if (
      fiber.tag === SuspenseComponent &&
      fiber.memoizedState !== null &&
      fiber.memoizedState.dehydrated === null
    ) {
      // This is a client-rendered Suspense boundary that is currently
      // showing its fallback. The primary children may include context
      // consumers, but their fibers may not exist in the tree — during
      // initial mount, if the primary children suspended, their fibers
      // were discarded since there was no current tree to preserve them.
      // We can't walk into the primary tree to find consumers, so
      // conservatively mark the Suspense boundary itself for retry.
      // When it re-renders, it will re-mount the primary children,
      // which will read the updated context value.
      fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
      const alternate = fiber.alternate;
      if (alternate !== null) {
        alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
      }
      scheduleContextWorkOnParentPath(
        fiber.return,
        renderLanes,
        workInProgress,
      );
      // The primary children's fibers may not exist in the tree (they
      // were discarded on initial mount if they suspended). However, the
      // fallback children ARE in the committed tree and visible to the
      // user. We need to continue propagating into the fallback subtree
      // so that its context consumers are marked for re-render.
      //
      // The fiber structure is:
      //   SuspenseComponent
      //     → child: OffscreenComponent (primary, hidden)
      //       → sibling: FallbackFragment
      //
      // Skip the primary (hidden) subtree and jump to the fallback.
      const primaryChildFragment = fiber.child;
      if (primaryChildFragment !== null) {
        nextFiber = primaryChildFragment.sibling;
      } else {
        nextFiber = null;
      }
    } else {
      // Traverse down.
      nextFiber = fiber.child;
    }

    if (nextFiber !== null) {
      // Set the return pointer of the child to the work-in-progress fiber.
      nextFiber.return = fiber;
    } else {
      // No child. Traverse to next sibling.
      nextFiber = fiber;
      while (nextFiber !== null) {
        if (nextFiber === workInProgress) {
          // We're back to the root of this subtree. Exit.
          nextFiber = null;
          break;
        }
        const sibling = nextFiber.sibling;
        if (sibling !== null) {
          // Set the return pointer of the sibling to the work-in-progress fiber.
          sibling.return = nextFiber.return;
          nextFiber = sibling;
          break;
        }
        // No more siblings. Traverse up.
        nextFiber = nextFiber.return;
      }
    }
    fiber = nextFiber;
  }
}

export function lazilyPropagateParentContextChanges(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
): boolean {
  const forcePropagateEntireTree = false;
  return propagateParentContextChanges(
    current,
    workInProgress,
    renderLanes,
    forcePropagateEntireTree,
  );
}

// Used for propagating a deferred tree (Suspense, Offscreen). We must propagate
// to the entire subtree, because we won't revisit it until after the current
// render has completed, at which point we'll have lost track of which providers
// have changed.
export function propagateParentContextChangesToDeferredTree(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const forcePropagateEntireTree = true;
  propagateParentContextChanges(
    current,
    workInProgress,
    renderLanes,
    forcePropagateEntireTree,
  );
}

function propagateParentContextChanges(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
  forcePropagateEntireTree: boolean,
): boolean {
  // Collect all the parent providers that changed. Since this is usually small
  // number, we use an Array instead of Set.
  let contexts = null;
  let parent: null | Fiber = workInProgress;
  let isInsidePropagationBailout = false;
  while (parent !== null) {
    if (!isInsidePropagationBailout) {
      if ((parent.flags & NeedsPropagation) !== NoFlags) {
        isInsidePropagationBailout = true;
      } else if ((parent.flags & DidPropagateContext) !== NoFlags) {
        break;
      }
    }

    if (parent.tag === ContextProvider) {
      const currentParent = parent.alternate;

      if (currentParent === null) {
        throw new Error('Should have a current fiber. This is a bug in React.');
      }

      const oldProps = currentParent.memoizedProps;
      if (oldProps !== null) {
        const context: ReactContext<any> = parent.type;
        const newProps = parent.pendingProps;
        const newValue = newProps.value;

        const oldValue = oldProps.value;

        if (!is(newValue, oldValue)) {
          if (contexts !== null) {
            contexts.push(context);
          } else {
            contexts = [context];
          }
        }
      }
    } else if (parent === getHostTransitionProvider()) {
      // During a host transition, a host component can act like a context
      // provider. E.g. in React DOM, this would be a <form />.
      const currentParent = parent.alternate;
      if (currentParent === null) {
        throw new Error('Should have a current fiber. This is a bug in React.');
      }

      const oldStateHook: Hook = currentParent.memoizedState;
      const oldState: TransitionStatus = oldStateHook.memoizedState;

      const newStateHook: Hook = parent.memoizedState;
      const newState: TransitionStatus = newStateHook.memoizedState;

      // This uses regular equality instead of Object.is because we assume that
      // host transition state doesn't include NaN as a valid type.
      if (oldState !== newState) {
        if (contexts !== null) {
          contexts.push(HostTransitionContext);
        } else {
          contexts = [HostTransitionContext];
        }
      }
    }
    parent = parent.return;
  }

  if (contexts !== null) {
    // If there were any changed providers, search through the children and
    // propagate their changes.
    propagateContextChanges(
      workInProgress,
      contexts,
      renderLanes,
      forcePropagateEntireTree,
    );
  }

  // This is an optimization so that we only propagate once per subtree. If a
  // deeply nested child bails out, and it calls this propagation function, it
  // uses this flag to know that the remaining ancestor providers have already
  // been propagated.
  //
  // NOTE: This optimization is only necessary because we sometimes enter the
  // begin phase of nodes that don't have any work scheduled on them —
  // specifically, the siblings of a node that _does_ have scheduled work. The
  // siblings will bail out and call this function again, even though we already
  // propagated content changes to it and its subtree. So we use this flag to
  // mark that the parent providers already propagated.
  //
  // Unfortunately, though, we need to ignore this flag when we're inside a
  // tree whose context propagation was deferred — that's what the
  // `NeedsPropagation` flag is for.
  //
  // If we could instead bail out before entering the siblings' begin phase,
  // then we could remove both `DidPropagateContext` and `NeedsPropagation`.
  // Consider this as part of the next refactor to the fiber tree structure.
  workInProgress.flags |= DidPropagateContext;
  return contexts !== null;
}

export function checkIfContextChanged(
  currentDependencies: Dependencies,
): boolean {
  // Iterate over the current dependencies to see if something changed. This
  // only gets called if props and state has already bailed out, so it's a
  // relatively uncommon path, except at the root of a changed subtree.
  // Alternatively, we could move these comparisons into `readContext`, but
  // that's a much hotter path, so I think this is an appropriate trade off.
  let dependency = currentDependencies.firstContext;
  while (dependency !== null) {
    const context = dependency.context;
    // $FlowFixMe[constant-condition]
    const newValue = isPrimaryRenderer
      ? context._currentValue
      : context._currentValue2;
    const oldValue = dependency.memoizedValue;
    if (!is(newValue, oldValue)) {
      return true;
    }
    dependency = dependency.next;
  }
  return false;
}

export function prepareToReadContext(
  workInProgress: Fiber,
  renderLanes: Lanes,
): void {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;

  const dependencies = workInProgress.dependencies;
  if (dependencies !== null) {
    // Reset the work-in-progress list
    dependencies.firstContext = null;
  }
}

export function readContext<T>(context: ReactContext<T>): T {
  if (__DEV__) {
    // This warning would fire if you read context inside a Hook like useMemo.
    // Unlike the class check below, it's not enforced in production for perf.
    if (isDisallowedContextReadInDEV) {
      console.error(
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, but not ' +
          'inside Hooks like useReducer() or useMemo().',
      );
    }
  }
  return readContextForConsumer(currentlyRenderingFiber, context);
}

export function readContextDuringReconciliation<T>(
  consumer: Fiber,
  context: ReactContext<T>,
  renderLanes: Lanes,
): T {
  if (currentlyRenderingFiber === null) {
    prepareToReadContext(consumer, renderLanes);
  }
  return readContextForConsumer(consumer, context);
}

function readContextForConsumer<T>(
  consumer: Fiber | null,
  context: ReactContext<T>,
): T {
  // $FlowFixMe[constant-condition]
  const value = isPrimaryRenderer
    ? context._currentValue
    : context._currentValue2;

  const contextItem = {
    context: context as any as ReactContext<mixed>,
    memoizedValue: value,
    next: null,
  };

  if (lastContextDependency === null) {
    if (consumer === null) {
      throw new Error(
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, but not ' +
          'inside Hooks like useReducer() or useMemo().',
      );
    }

    // This is the first dependency for this component. Create a new list.
    // $FlowFixMe[incompatible-type]
    lastContextDependency = contextItem;
    consumer.dependencies = __DEV__
      ? // $FlowFixMe[incompatible-type]
        {
          lanes: NoLanes,
          firstContext: contextItem,
          _debugThenableState: null,
        }
      : // $FlowFixMe[incompatible-type]
        {
          lanes: NoLanes,
          firstContext: contextItem,
        };
    consumer.flags |= NeedsPropagation;
  } else {
    // Append a new context item.
    // $FlowFixMe[incompatible-type]
    lastContextDependency = lastContextDependency.next = contextItem;
  }
  return value;
}
