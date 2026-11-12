/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {HooksNode, HooksTree} from 'react-debug-tools/src/ReactDebugHooks';
import type {WorkTagMap} from '../../types';

import {getFiberFlags} from './DevToolsFiberInspection';
import is from 'shared/objectIs';

export function getContextChanged(prevFiber: Fiber, nextFiber: Fiber): boolean {
  let prevContext =
    prevFiber.dependencies && prevFiber.dependencies.firstContext;
  let nextContext =
    nextFiber.dependencies && nextFiber.dependencies.firstContext;

  while (prevContext && nextContext) {
    // Note this only works for versions of React that support this key (e.v. 18+)
    // For older versions, there's no good way to read the current context value after render has completed.
    // This is because React maintains a stack of context values during render,
    // but by the time DevTools is called, render has finished and the stack is empty.
    if (prevContext.context !== nextContext.context) {
      // If the order of context has changed, then the later context values might have
      // changed too but the main reason it rerendered was earlier. Either an earlier
      // context changed value but then we would have exited already. If we end up here
      // it's because a state or props change caused the order of contexts used to change.
      // So the main cause is not the contexts themselves.
      return false;
    }
    if (!is(prevContext.memoizedValue, nextContext.memoizedValue)) {
      return true;
    }

    prevContext = prevContext.next;
    nextContext = nextContext.next;
  }
  return false;
}

export function didStatefulHookChange(
  prev: HooksNode,
  next: HooksNode,
): boolean {
  // Detect the shape of useState() / useReducer() / useTransition() / useSyncExternalStore() / useActionState()
  const isStatefulHook =
    prev.isStateEditable === true ||
    prev.name === 'SyncExternalStore' ||
    prev.name === 'Transition' ||
    prev.name === 'ActionState' ||
    prev.name === 'FormState';

  // Compare the values to see if they changed
  if (isStatefulHook) {
    return prev.value !== next.value;
  }

  return false;
}

export function getChangedHooksIndices(
  prevHooks: HooksTree | null,
  nextHooks: HooksTree | null,
): null | Array<number> {
  if (prevHooks == null || nextHooks == null) {
    return null;
  }

  const indices: Array<number> = [];
  let index = 0;

  function traverse(prevTree: HooksTree, nextTree: HooksTree): void {
    for (let i = 0; i < prevTree.length; i++) {
      const prevHook = prevTree[i];
      const nextHook = nextTree[i];

      if (prevHook.subHooks.length > 0 && nextHook.subHooks.length > 0) {
        traverse(prevHook.subHooks, nextHook.subHooks);
        continue;
      }

      if (didStatefulHookChange(prevHook, nextHook)) {
        indices.push(index);
      }

      index++;
    }
  }

  traverse(prevHooks, nextHooks);
  return indices;
}

export function getChangedKeys(prev: any, next: any): null | Array<string> {
  if (prev == null || next == null) {
    return null;
  }

  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changedKeys = [];
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const key of keys) {
    if (prev[key] !== next[key]) {
      changedKeys.push(key);
    }
  }

  return changedKeys;
}

/**
 * Returns true iff nextFiber actually performed any work and produced an update.
 * For generic components, like Function or Class components, prevFiber is not considered.
 */
export function didFiberRender(
  workTagMap: WorkTagMap,
  prevFiber: Fiber,
  nextFiber: Fiber,
): boolean {
  switch (nextFiber.tag) {
    case workTagMap.ClassComponent:
    case workTagMap.FunctionComponent:
    case workTagMap.ContextConsumer:
    case workTagMap.MemoComponent:
    case workTagMap.SimpleMemoComponent:
    case workTagMap.ForwardRef:
      // For types that execute user code, we check PerformedWork effect.
      // We don't reflect bailouts (either referential or sCU) in DevTools.
      // TODO: This flag is a leaked implementation detail. Once we start
      // releasing DevTools in lockstep with React, we should import a
      // function from the reconciler instead.
      const PerformedWork = 0b000000000000000000000000001;
      return (getFiberFlags(nextFiber) & PerformedWork) === PerformedWork;
    // Note: ContextConsumer only gets PerformedWork effect in 16.3.3+
    // so it won't get highlighted with React 16.3.0 to 16.3.2.
    default:
      // For host components and other types, we compare inputs
      // to determine whether something is an update.
      return (
        prevFiber.memoizedProps !== nextFiber.memoizedProps ||
        prevFiber.memoizedState !== nextFiber.memoizedState ||
        prevFiber.ref !== nextFiber.ref
      );
  }
}
