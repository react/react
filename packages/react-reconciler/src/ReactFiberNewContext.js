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
import {isSubsetOfLanes, mergeLanes} from './ReactFiberLane';
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

// A set of contexts whose provider value changed, as an immutable linked list
// so that results for nested fibers can share structure.
type ChangedContexts = {
  context: ReactContext<mixed>,
  next: ChangedContexts | null,
};

// Memoized results of `propagateParentContextChanges` walking the return path.
// An entry for fiber F is the list of changed providers found by walking from
// F (inclusive) towards the root, following the same NeedsPropagation /
// DidPropagateContext rules as the walk itself, or `null` if there are none.
// Because those rules depend on whether the walk had already passed a
// NeedsPropagation fiber by the time it reached F, there is one map for each
// of the two states. Only (possible) provider fibers get entries: they are
// what makes return paths long in practice, and skipping everything else
// keeps the maps small and means trees without providers never touch them.
//
// Entries are only ever created for strict ancestors of the fiber currently
// being begun. Within a single uninterrupted begin sequence such a fiber's
// pendingProps, its alternate's memoizedProps and its NeedsPropagation /
// DidPropagateContext flags no longer change, so neither does the entry. The
// memo is dropped whenever that stops being true: when the work loop yields,
// finishes, or unwinds (resetContextDependencies), and when it re-enters the
// begin phase for a fiber that was already begun (resetContextPropagationMemo
// from the work loop). Missing entries only cost a longer walk.
let propagationMemoOutside: Map<Fiber, ChangedContexts | null> | null = null;
let propagationMemoInside: Map<Fiber, ChangedContexts | null> | null = null;
// The result for the return fiber of the last walk (whatever its tag), kept
// inline because consecutive walks overwhelmingly start from siblings.
let lastReturnFiber: Fiber | null = null;
let lastReturnFiberIsInside: boolean = false;
let lastReturnFiberContexts: ChangedContexts | null = null;

// Scratch buffers for the provider fibers visited by a single walk before it
// reaches a memoized ancestor, the root, or a DidPropagateContext boundary.
const MAX_DEPTH = 0x3fffffff;
const visitedFibers: Array<Fiber | null> = [];
const visitedContexts: Array<ReactContext<mixed> | null> = [];

export function resetContextPropagationMemo(): void {
  propagationMemoOutside = null;
  propagationMemoInside = null;
  lastReturnFiber = null;
  lastReturnFiberContexts = null;
}

export function resetContextDependencies(): void {
  // This is called right before React yields execution, to ensure `readContext`
  // cannot be called outside the render phase.
  currentlyRenderingFiber = null;
  lastContextDependency = null;
  resetContextPropagationMemo();
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
  const contexts: ChangedContexts = {
    context: context as any as ReactContext<mixed>,
    next: null,
  };
  propagateContextChanges(
    workInProgress,
    contexts,
    renderLanes,
    forcePropagateEntireTree,
  );
}

function propagateContextChanges(
  workInProgress: Fiber,
  contexts: ChangedContexts,
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
        let changed: ChangedContexts | null = contexts;
        findContext: while (changed !== null) {
          const context = changed.context;
          changed = changed.next;
          // Check if the context matches.
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

function isPossiblyProvider(
  fiber: Fiber,
  hostTransitionProvider: Fiber | null,
): boolean {
  return fiber.tag === ContextProvider || fiber === hostTransitionProvider;
}

// Returns the context provided by `fiber` if `fiber` is a provider whose value
// differs from the committed one, or null otherwise.
function getChangedContext(
  fiber: Fiber,
  hostTransitionProvider: Fiber | null,
): ReactContext<mixed> | null {
  if (fiber.tag === ContextProvider) {
    const current = fiber.alternate;
    if (current === null) {
      throw new Error('Should have a current fiber. This is a bug in React.');
    }
    const oldProps = current.memoizedProps;
    if (oldProps !== null) {
      const newProps = fiber.pendingProps;
      if (!is(newProps.value, oldProps.value)) {
        return fiber.type;
      }
    }
  } else if (fiber === hostTransitionProvider) {
    // During a host transition, a host component can act like a context
    // provider. E.g. in React DOM, this would be a <form />.
    //
    // NOTE: Like pushHostContext, this assumes host transition providers do
    // not nest, so the nearest one on the stack is the only one on the return
    // path and the memoized result below does not depend on which descendant
    // computed it.
    const current = fiber.alternate;
    if (current === null) {
      throw new Error('Should have a current fiber. This is a bug in React.');
    }
    const oldStateHook: Hook = current.memoizedState;
    const oldState: TransitionStatus = oldStateHook.memoizedState;
    const newStateHook: Hook = fiber.memoizedState;
    const newState: TransitionStatus = newStateHook.memoizedState;
    // This uses regular equality instead of Object.is because we assume that
    // host transition state doesn't include NaN as a valid type.
    if (oldState !== newState) {
      return HostTransitionContext as any;
    }
  }
  return null;
}

function propagateParentContextChanges(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
  forcePropagateEntireTree: boolean,
): boolean {
  // Collect all the parent providers that changed, walking from this fiber
  // towards the root.
  //
  // For any strict ancestor the portion of the result contributed by it and
  // everything above it is fixed for the rest of this begin pass (see
  // `propagationMemoOutside`), so the first walk that visits a provider
  // records that portion and later walks stop as soon as they reach a
  // provider that has already been visited. The providers visited before the
  // hit are buffered in `visitedFibers`/`visitedContexts` and memoized once
  // the suffix is known.
  //
  // `workInProgress` itself is always evaluated against its live flags and is
  // never memoized here: it receives DidPropagateContext at the end of this
  // function, which changes the answer for its descendants. Walks started by
  // its descendants will see the post-propagation flags.
  let isInsidePropagationBailout =
    (workInProgress.flags & NeedsPropagation) !== NoFlags;
  if (
    !isInsidePropagationBailout &&
    (workInProgress.flags & DidPropagateContext) !== NoFlags
  ) {
    // We already propagated from this fiber earlier in its begin phase.
    return false;
  }
  const hostTransitionProvider = getHostTransitionProvider();
  const ownContext = isPossiblyProvider(workInProgress, hostTransitionProvider)
    ? getChangedContext(workInProgress, hostTransitionProvider)
    : null;

  const returnFiber = workInProgress.return;
  const returnFiberIsInside = isInsidePropagationBailout;
  let suffix: ChangedContexts | null = null;
  let depth = 0;
  // Index into the visited buffer of the first provider that was reached
  // while already inside a NeedsPropagation subtree. Providers below this index
  // are memoized in the "outside" map, the rest in the "inside" map.
  let firstInsideDepth = isInsidePropagationBailout ? 0 : MAX_DEPTH;
  let parent: null | Fiber = returnFiber;
  if (
    parent === lastReturnFiber &&
    returnFiberIsInside === lastReturnFiberIsInside &&
    parent !== null
  ) {
    suffix = lastReturnFiberContexts;
    parent = null;
  }
  while (parent !== null) {
    if (isPossiblyProvider(parent, hostTransitionProvider)) {
      const memo = isInsidePropagationBailout
        ? propagationMemoInside
        : propagationMemoOutside;
      if (memo !== null) {
        const memoized = memo.get(parent);
        if (memoized !== undefined) {
          suffix = memoized;
          break;
        }
      }
      visitedFibers[depth] = parent;
      if (!isInsidePropagationBailout) {
        if ((parent.flags & NeedsPropagation) !== NoFlags) {
          isInsidePropagationBailout = true;
          firstInsideDepth = depth + 1;
        } else if ((parent.flags & DidPropagateContext) !== NoFlags) {
          // Everything at or above this fiber was already propagated into its
          // subtree, which includes us.
          visitedContexts[depth] = null;
          depth++;
          break;
        }
      }
      visitedContexts[depth] = getChangedContext(
        parent,
        hostTransitionProvider,
      );
      depth++;
    } else if (!isInsidePropagationBailout) {
      if ((parent.flags & NeedsPropagation) !== NoFlags) {
        isInsidePropagationBailout = true;
        firstInsideDepth = depth;
      } else if ((parent.flags & DidPropagateContext) !== NoFlags) {
        break;
      }
    }
    parent = parent.return;
  }

  // Memoize the result for every provider we visited, sharing structure with
  // the suffix we stopped at.
  let contexts: ChangedContexts | null = suffix;
  if (depth > 0) {
    let outside = propagationMemoOutside;
    let inside = propagationMemoInside;
    for (let i = depth - 1; i >= 0; i--) {
      const fiber: Fiber = visitedFibers[i] as any;
      const context = visitedContexts[i];
      visitedFibers[i] = null;
      if (context !== null) {
        contexts = {context, next: contexts};
      }
      if (i >= firstInsideDepth) {
        if (inside === null) {
          inside = propagationMemoInside = new Map();
        }
        inside.set(fiber, contexts);
      } else {
        if (outside === null) {
          outside = propagationMemoOutside = new Map();
        }
        outside.set(fiber, contexts);
      }
    }
  }
  // At this point `contexts` is the entry for the return fiber.
  lastReturnFiber = returnFiber;
  lastReturnFiberIsInside = returnFiberIsInside;
  lastReturnFiberContexts = contexts;

  if (ownContext !== null) {
    contexts = {context: ownContext, next: contexts};
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

  // Reset the work-in-progress list. The dependencies object may be shared
  // with the current fiber, so we drop the reference rather than mutate it. A
  // new object is created on the first `readContext` call.
  workInProgress.dependencies = null;
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
          firstContext: contextItem,
          _debugThenableState: null,
        }
      : // $FlowFixMe[incompatible-type]
        {
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
