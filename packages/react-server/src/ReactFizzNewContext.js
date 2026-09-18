/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';

import {isPrimaryRenderer} from './ReactFizzConfig';

let rendererSigil;
if (__DEV__) {
  // Use this to detect multiple renderers using the same context
  rendererSigil = {};
}

// Used to store the parent path of all context overrides in a shared linked list.
// Forming a reverse tree.
type ContextNode<T> = {
  parent: null | ContextNode<any>,
  depth: number, // Short hand to compute the depth of the tree at this node.
  context: ReactContext<T>,
  parentValue: T,
  value: T,
};

// The structure of a context snapshot is an implementation of this file.
// Currently, it's implemented as tracking the current active node.
export opaque type ContextSnapshot = null | ContextNode<any>;

export const rootContextSnapshot: ContextSnapshot = null;

// We assume that this runtime owns the "current" field on all ReactContext instances.
// This global (actually thread local) state represents what state all those "current",
// fields are currently in.
let currentActiveSnapshot: ContextSnapshot = null;

function popNode(prev: ContextNode<any>): void {
  // $FlowFixMe[constant-condition]
  if (isPrimaryRenderer) {
    prev.context._currentValue = prev.parentValue;
  } else {
    prev.context._currentValue2 = prev.parentValue;
  }
}

function pushNode(next: ContextNode<any>): void {
  // $FlowFixMe[constant-condition]
  if (isPrimaryRenderer) {
    next.context._currentValue = next.value;
  } else {
    next.context._currentValue2 = next.value;
  }
}

function popToNearestCommonAncestor(
  prev: ContextNode<any>,
  next: ContextNode<any>,
): void {
  if (prev === next) {
    // We've found a shared ancestor. We don't need to pop nor reapply this one or anything above.
  } else {
    popNode(prev);
    const parentPrev = prev.parent;
    const parentNext = next.parent;
    if (parentPrev === null) {
      if (parentNext !== null) {
        throw new Error(
          'The stacks must reach the root at the same time. This is a bug in React.',
        );
      }
    } else {
      if (parentNext === null) {
        throw new Error(
          'The stacks must reach the root at the same time. This is a bug in React.',
        );
      }

      popToNearestCommonAncestor(parentPrev, parentNext);
    }

    // On the way back, we push the new ones that weren't common.
    pushNode(next);
  }
}

function popAllPrevious(prev: ContextNode<any>): void {
  popNode(prev);
  const parentPrev = prev.parent;
  if (parentPrev !== null) {
    popAllPrevious(parentPrev);
  }
}

function pushAllNext(next: ContextNode<any>): void {
  const parentNext = next.parent;
  if (parentNext !== null) {
    pushAllNext(parentNext);
  }
  pushNode(next);
}

function popPreviousToCommonLevel(
  prev: ContextNode<any>,
  next: ContextNode<any>,
): void {
  popNode(prev);
  const parentPrev = prev.parent;

  if (parentPrev === null) {
    throw new Error(
      'The depth must equal at least at zero before reaching the root. This is a bug in React.',
    );
  }

  if (parentPrev.depth === next.depth) {
    // We found the same level. Now we just need to find a shared ancestor.
    popToNearestCommonAncestor(parentPrev, next);
  } else {
    // We must still be deeper.
    popPreviousToCommonLevel(parentPrev, next);
  }
}

function popNextToCommonLevel(
  prev: ContextNode<any>,
  next: ContextNode<any>,
): void {
  const parentNext = next.parent;

  if (parentNext === null) {
    throw new Error(
      'The depth must equal at least at zero before reaching the root. This is a bug in React.',
    );
  }

  if (prev.depth === parentNext.depth) {
    // We found the same level. Now we just need to find a shared ancestor.
    popToNearestCommonAncestor(prev, parentNext);
  } else {
    // We must still be deeper.
    popNextToCommonLevel(prev, parentNext);
  }
  pushNode(next);
}

// Perform context switching to the new snapshot.
// To make it cheap to read many contexts, while not suspending, we make the switch eagerly by
// updating all the context's current values. That way reads, always just read the current value.
// At the cost of updating contexts even if they're never read by this subtree.
export function switchContext(newSnapshot: ContextSnapshot): void {
  // The basic algorithm we need to do is to pop back any contexts that are no longer on the stack.
  // We also need to update any new contexts that are now on the stack with the deepest value.
  // The easiest way to update new contexts is to just reapply them in reverse order from the
  // perspective of the backpointers. To avoid allocating a lot when switching, we use the stack
  // for that. Therefore this algorithm is recursive.
  // 1) First we pop which ever snapshot tree was deepest. Popping old contexts as we go.
  // 2) Then we find the nearest common ancestor from there. Popping old contexts as we go.
  // 3) Then we reapply new contexts on the way back up the stack.
  const prev = currentActiveSnapshot;
  const next = newSnapshot;
  if (prev !== next) {
    if (prev === null) {
      // $FlowFixMe[incompatible-type]: This has to be non-null since it's not equal to prev.
      pushAllNext(next);
    } else if (next === null) {
      popAllPrevious(prev);
    } else if (prev.depth === next.depth) {
      popToNearestCommonAncestor(prev, next);
    } else if (prev.depth > next.depth) {
      popPreviousToCommonLevel(prev, next);
    } else {
      popNextToCommonLevel(prev, next);
    }
    currentActiveSnapshot = next;
  }
}

export function pushProvider<T>(
  context: ReactContext<T>,
  nextValue: T,
): ContextSnapshot {
  let prevValue;
  // $FlowFixMe[constant-condition]
  if (isPrimaryRenderer) {
    prevValue = context._currentValue;
    context._currentValue = nextValue;
    if (__DEV__) {
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
    prevValue = context._currentValue2;
    context._currentValue2 = nextValue;
    if (__DEV__) {
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
  const prevNode = currentActiveSnapshot;
  const newNode: ContextNode<T> = {
    parent: prevNode,
    depth: prevNode === null ? 0 : prevNode.depth + 1,
    context: context,
    parentValue: prevValue,
    value: nextValue,
  };
  currentActiveSnapshot = newNode;
  return newNode;
}

export function popProvider<T>(context: ReactContext<T>): ContextSnapshot {
  const prevSnapshot = currentActiveSnapshot;

  if (prevSnapshot === null) {
    throw new Error(
      'Tried to pop a Context at the root of the app. This is a bug in React.',
    );
  }

  if (__DEV__) {
    if (prevSnapshot.context !== context) {
      console.error(
        'The parent context is not the expected context. This is probably a bug in React.',
      );
    }
  }
  // $FlowFixMe[constant-condition]
  if (isPrimaryRenderer) {
    const value = prevSnapshot.parentValue;
    prevSnapshot.context._currentValue = value;
    if (__DEV__) {
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
    const value = prevSnapshot.parentValue;
    prevSnapshot.context._currentValue2 = value;
    if (__DEV__) {
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
  return (currentActiveSnapshot = prevSnapshot.parent);
}

export function getActiveContext(): ContextSnapshot {
  return currentActiveSnapshot;
}

export function readContext<T>(context: ReactContext<T>): T {
  // $FlowFixMe[constant-condition]
  const value = isPrimaryRenderer
    ? context._currentValue
    : context._currentValue2;
  return value;
}
