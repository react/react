/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This is a DevTools fork of ReactFiberComponentStack.
// This fork enables DevTools to use the same "native" component stack format,
// while still maintaining support for multiple renderer versions
// (which use different values for ReactTypeOfWork).

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {CurrentDispatcherRef, WorkTagMap} from '../types';

import type {ReactComponentInfo} from 'shared/ReactTypes';

import {
  describeBuiltInComponentFrame,
  describeFunctionComponentFrame,
  describeClassComponentFrame,
  describeDebugInfoFrame,
} from '../shared/DevToolsComponentStackFrame';

import {formatOwnerStack} from '../shared/DevToolsOwnerStack';

export function describeFiber(
  workTagMap: WorkTagMap,
  workInProgress: Fiber,
  currentDispatcherRef: CurrentDispatcherRef,
): string {
  const {
    HostHoistable,
    HostSingleton,
    HostComponent,
    LazyComponent,
    SuspenseComponent,
    SuspenseListComponent,
    FunctionComponent,
    IndeterminateComponent,
    SimpleMemoComponent,
    ForwardRef,
    ClassComponent,
    ViewTransitionComponent,
    ActivityComponent,
  } = workTagMap;

  switch (workInProgress.tag) {
    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      return describeBuiltInComponentFrame(workInProgress.type);
    case LazyComponent:
      // TODO: When we support Thenables as component types we should rename this.
      return describeBuiltInComponentFrame('Lazy');
    case SuspenseComponent:
      return describeBuiltInComponentFrame('Suspense');
    case SuspenseListComponent:
      return describeBuiltInComponentFrame('SuspenseList');
    case ViewTransitionComponent:
      return describeBuiltInComponentFrame('ViewTransition');
    case ActivityComponent:
      return describeBuiltInComponentFrame('Activity');
    case FunctionComponent:
    case IndeterminateComponent:
    case SimpleMemoComponent:
      return describeFunctionComponentFrame(
        workInProgress.type,
        currentDispatcherRef,
      );
    case ForwardRef:
      return describeFunctionComponentFrame(
        workInProgress.type.render,
        currentDispatcherRef,
      );
    case ClassComponent:
      return describeClassComponentFrame(
        workInProgress.type,
        currentDispatcherRef,
      );
    default:
      return '';
  }
}

export function getStackByFiberInDevAndProd(
  workTagMap: WorkTagMap,
  workInProgress: Fiber,
  currentDispatcherRef: CurrentDispatcherRef,
): string {
  try {
    let info = '';
    let node: Fiber = workInProgress;
    do {
      info += describeFiber(workTagMap, node, currentDispatcherRef);
      // Add any Server Component stack frames in reverse order.
      const debugInfo = node._debugInfo;
      if (debugInfo) {
        for (let i = debugInfo.length - 1; i >= 0; i--) {
          const entry = debugInfo[i];
          if (typeof entry.name === 'string') {
            info += describeDebugInfoFrame(entry.name, entry.env);
          }
        }
      }
      // $FlowFixMe[incompatible-type] we bail out when we get a null
      node = node.return;
    } while (node);
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}

export function getSourceLocationByFiber(
  workTagMap: WorkTagMap,
  fiber: Fiber,
  currentDispatcherRef: CurrentDispatcherRef,
): null | string {
  // This is like getStackByFiberInDevAndProd but just the first stack frame.
  try {
    const info = describeFiber(workTagMap, fiber, currentDispatcherRef);
    if (info !== '') {
      return info.slice(1); // skip the leading newline
    }
  } catch (x) {
    console.error(x);
  }
  return null;
}

export function supportsConsoleTasks(fiber: Fiber): boolean {
  // If this Fiber supports native console.createTask then we are already running
  // inside a native async stack trace if it's active - meaning the DevTools is open.
  // Ideally we'd detect if this task was created while the DevTools was open or not.
  return !!fiber._debugTask;
}

export function supportsOwnerStacks(fiber: Fiber): boolean {
  // If this Fiber supports owner stacks then it'll have the _debugStack field.
  // It might be null but that still means we should use the owner stack logic.
  return fiber._debugStack !== undefined;
}

export function getOwnerStackByFiberInDev(
  workTagMap: WorkTagMap,
  workInProgress: Fiber,
  currentDispatcherRef: CurrentDispatcherRef,
): string {
  const {
    HostHoistable,
    HostSingleton,
    HostText,
    HostComponent,
    SuspenseComponent,
    SuspenseListComponent,
    ViewTransitionComponent,
    ActivityComponent,
  } = workTagMap;
  try {
    let info = '';

    if (workInProgress.tag === HostText) {
      // Text nodes never have an owner/stack because they're not created through JSX.
      // We use the parent since text nodes are always created through a host parent.
      workInProgress = workInProgress.return as any;
    }

    // The owner stack of the current fiber will be where it was created, i.e. inside its owner.
    // There's no actual name of the currently executing component. Instead, that is available
    // on the regular stack that's currently executing. However, for built-ins there is no such
    // named stack frame and it would be ignored as being internal anyway. Therefore we add
    // add one extra frame just to describe the "current" built-in component by name.
    switch (workInProgress.tag) {
      case HostHoistable:
      case HostSingleton:
      case HostComponent:
        info += describeBuiltInComponentFrame(workInProgress.type);
        break;
      case SuspenseComponent:
        info += describeBuiltInComponentFrame('Suspense');
        break;
      case SuspenseListComponent:
        info += describeBuiltInComponentFrame('SuspenseList');
        break;
      case ViewTransitionComponent:
        info += describeBuiltInComponentFrame('ViewTransition');
        break;
      case ActivityComponent:
        info += describeBuiltInComponentFrame('Activity');
        break;
    }

    let owner: void | null | Fiber | ReactComponentInfo = workInProgress;

    while (owner) {
      if (typeof owner.tag === 'number') {
        const fiber: Fiber = owner as any;
        owner = fiber._debugOwner;
        let debugStack: void | null | string | Error = fiber._debugStack;
        // If we don't actually print the stack if there is no owner of this JSX element.
        // In a real app it's typically not useful since the root app is always controlled
        // by the framework. These also tend to have noisy stacks because they're not rooted
        // in a React render but in some imperative bootstrapping code. It could be useful
        // if the element was created in module scope. E.g. hoisted. We could add a single
        // stack frame for context for example but it doesn't say much if that's a wrapper.
        if (owner && debugStack) {
          if (typeof debugStack !== 'string') {
            debugStack = formatOwnerStack(debugStack);
          }
          if (debugStack !== '') {
            info += '\n' + debugStack;
          }
        }
      } else if (owner.debugStack != null) {
        // Server Component
        const ownerStack: Error = owner.debugStack;
        owner = owner.owner;
        if (owner && ownerStack) {
          info += '\n' + formatOwnerStack(ownerStack);
        }
      } else {
        break;
      }
    }
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}
