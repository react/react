/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactComponentInfo, ReactAsyncInfo} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';

import {
  describeBuiltInComponentFrame,
  describeFunctionComponentFrame,
  describeClassComponentFrame,
  describeDebugInfoFrame,
} from 'shared/ReactComponentStackFrame';

import {
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
} from 'shared/ReactSymbols';

import {enableViewTransition} from 'shared/ReactFeatureFlags';

import {formatOwnerStack} from 'shared/ReactOwnerStackFrames';

export type ComponentStackNode = {
  parent: null | ComponentStackNode,
  type:
    | symbol
    | string
    | Function
    | LazyComponent<any, any>
    | ReactComponentInfo
    | ReactAsyncInfo,
  owner?: null | ReactComponentInfo | ComponentStackNode, // DEV only
  stack?: null | string | Error, // DEV only
};

function shouldConstruct(Component: any) {
  return Component.prototype && Component.prototype.isReactComponent;
}

function describeComponentStackByType(
  type:
    | symbol
    | string
    | Function
    | LazyComponent<any, any>
    | ReactComponentInfo,
): string {
  if (typeof type === 'string') {
    return describeBuiltInComponentFrame(type);
  }
  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      return describeClassComponentFrame(type);
    } else {
      return describeFunctionComponentFrame(type);
    }
  }
  // $FlowFixMe[invalid-compare]
  if (typeof type === 'object' && type !== null) {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE: {
        return describeFunctionComponentFrame((type as any).render);
      }
      case REACT_MEMO_TYPE: {
        return describeFunctionComponentFrame((type as any).type);
      }
      case REACT_LAZY_TYPE: {
        const lazyComponent: LazyComponent<any, any> = type as any;
        const payload = lazyComponent._payload;
        const init = lazyComponent._init;
        try {
          type = init(payload);
        } catch (x) {
          // TODO: When we support Thenables as component types we should rename this.
          return describeBuiltInComponentFrame('Lazy');
        }
        return describeComponentStackByType(type);
      }
    }
    if (typeof type.name === 'string') {
      return describeDebugInfoFrame(type.name, type.env, type.debugLocation);
    }
  }
  switch (type) {
    case REACT_SUSPENSE_LIST_TYPE: {
      return describeBuiltInComponentFrame('SuspenseList');
    }
    case REACT_SUSPENSE_TYPE: {
      return describeBuiltInComponentFrame('Suspense');
    }
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition) {
        return describeBuiltInComponentFrame('ViewTransition');
      }
  }
  return '';
}

export function getStackByComponentStackNode(
  componentStack: ComponentStackNode,
): string {
  try {
    let info = '';
    let node: ComponentStackNode = componentStack;
    do {
      info += describeComponentStackByType(node.type);
      // $FlowFixMe[incompatible-type] we bail out when we get a null
      node = node.parent;
    } while (node);
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}

function describeFunctionComponentFrameWithoutLineNumber(fn: Function): string {
  // We use this because we don't actually want to describe the line of the component
  // but just the component name.
  const name = fn ? fn.displayName || fn.name : '';
  return name ? describeBuiltInComponentFrame(name) : '';
}

export function getOwnerStackByComponentStackNodeInDev(
  componentStack: ComponentStackNode,
): string {
  if (!__DEV__) {
    return '';
  }
  try {
    let info = '';

    // The owner stack of the current component will be where it was created, i.e. inside its owner.
    // There's no actual name of the currently executing component. Instead, that is available
    // on the regular stack that's currently executing. However, for built-ins there is no such
    // named stack frame and it would be ignored as being internal anyway. Therefore we add
    // add one extra frame just to describe the "current" built-in component by name.
    // Similarly, if there is no owner at all, then there's no stack frame so we add the name
    // of the root component to the stack to know which component is currently executing.
    if (typeof componentStack.type === 'string') {
      info += describeBuiltInComponentFrame(componentStack.type);
    } else if (typeof componentStack.type === 'function') {
      if (!componentStack.owner) {
        // Only if we have no other data about the callsite do we add
        // the component name as the single stack frame.
        info += describeFunctionComponentFrameWithoutLineNumber(
          componentStack.type,
        );
      }
    } else {
      if (!componentStack.owner) {
        info += describeComponentStackByType(componentStack.type);
      }
    }

    let owner: void | null | ComponentStackNode | ReactComponentInfo =
      componentStack;

    while (owner) {
      let ownerStack: ?string = null;
      if (owner.debugStack != null) {
        // Server Component
        // TODO: Should we stash this somewhere for caching purposes?
        ownerStack = formatOwnerStack(owner.debugStack);
        owner = owner.owner;
      } else {
        // Client Component
        const node: ComponentStackNode = owner as any;
        if (node.stack != null) {
          if (typeof node.stack !== 'string') {
            ownerStack = node.stack = formatOwnerStack(node.stack);
          } else {
            ownerStack = node.stack;
          }
        }
        owner = owner.owner;
      }
      // If we don't actually print the stack if there is no owner of this JSX element.
      // In a real app it's typically not useful since the root app is always controlled
      // by the framework. These also tend to have noisy stacks because they're not rooted
      // in a React render but in some imperative bootstrapping code. It could be useful
      // if the element was created in module scope. E.g. hoisted. We could add a a single
      // stack frame for context for example but it doesn't say much if that's a wrapper.
      if (owner && ownerStack) {
        info += '\n' + ownerStack;
      }
    }
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}
