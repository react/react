/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Node} from './ReactNativeTypes';
import type {ElementRef, ElementType} from 'react';
import type {PublicInstance} from 'react-native/react-private-interface';

// Modules provided by RN:
import {
  getNodeFromPublicInstance,
  getNativeTagFromPublicInstance,
  getInternalInstanceHandleFromPublicInstance,
} from 'react-native/react-private-interface';

import {
  findHostInstance,
  findHostInstanceWithWarning,
} from 'react-reconciler/src/ReactFiberReconciler';
import {doesFiberContain} from 'react-reconciler/src/ReactFiberTreeReflection';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import {
  current as currentOwner,
  isRendering,
} from 'react-reconciler/src/ReactCurrentFiber';

export function findHostInstance_DEPRECATED<TElementType: ElementType>(
  componentOrHandle: ?(ElementRef<TElementType> | number),
): ?PublicInstance {
  if (__DEV__) {
    const owner = currentOwner;
    if (owner !== null && isRendering && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findNodeHandle inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentNameFromType(owner.type) || 'A component',
        );
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }

  if (componentOrHandle == null) {
    return null;
  }

  // For compatibility with Fabric instances
  if (
    componentOrHandle.canonical &&
    componentOrHandle.canonical.publicInstance
  ) {
    // $FlowExpectedError[incompatible-type] Can't refine componentOrHandle as a Fabric instance
    return componentOrHandle.canonical.publicInstance;
  }

  let hostInstance;
  if (__DEV__) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      'findHostInstance_DEPRECATED',
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }

  // findHostInstance handles legacy vs. Fabric differences correctly
  // $FlowFixMe[incompatible-exact] we need to fix the definition of `HostComponent` to use NativeMethods as an interface, not as a type.
  // $FlowFixMe[incompatible-type]
  return hostInstance;
}

export function findNodeHandle(componentOrHandle: any): ?number {
  if (__DEV__) {
    const owner = currentOwner;
    if (owner !== null && isRendering && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          '%s is accessing findNodeHandle inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentNameFromType(owner.type) || 'A component',
        );
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }

  if (componentOrHandle == null) {
    return null;
  }

  if (typeof componentOrHandle === 'number') {
    // Already a node handle
    return componentOrHandle;
  }

  // For compatibility with Fabric instances
  if (
    componentOrHandle.canonical != null &&
    componentOrHandle.canonical.nativeTag != null
  ) {
    return componentOrHandle.canonical.nativeTag;
  }

  // For compatibility with Fabric public instances
  const nativeTag = getNativeTagFromPublicInstance(componentOrHandle);
  if (nativeTag) {
    return nativeTag;
  }

  let hostInstance;
  if (__DEV__) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      'findNodeHandle',
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }

  if (hostInstance == null) {
    // $FlowFixMe[incompatible-type] Flow limitation in refining an opaque type
    return hostInstance;
  }

  // $FlowFixMe[incompatible-type] Necessary when running Flow on the legacy renderer
  return getNativeTagFromPublicInstance(hostInstance);
}

export function dispatchCommand(
  handle: any,
  command: string,
  args: Array<any>,
) {
  const node = getNodeFromPublicInstance(handle);

  if (node != null) {
    nativeFabricUIManager.dispatchCommand(node, command, args);
  } else {
    if (__DEV__) {
      console.error(
        "dispatchCommand was called with a ref that isn't a " +
          'native component. Use React.forwardRef to get access to the underlying native component',
      );
    }
  }
}

export function sendAccessibilityEvent(handle: any, eventType: string) {
  const node = getNodeFromPublicInstance(handle);

  if (node != null) {
    nativeFabricUIManager.sendAccessibilityEvent(node, eventType);
  } else {
    if (__DEV__) {
      console.error(
        "sendAccessibilityEvent was called with a ref that isn't a " +
          'native component. Use React.forwardRef to get access to the underlying native component',
      );
    }
  }
}

export function getNodeFromInternalInstanceHandle(
  internalInstanceHandle: mixed,
): ?Node {
  return (
    // $FlowExpectedError[incompatible-type] internalInstanceHandle is opaque but we need to make an exception here.
    internalInstanceHandle &&
    // $FlowExpectedError[incompatible-type]
    internalInstanceHandle.stateNode &&
    // $FlowExpectedError[incompatible-use]
    internalInstanceHandle.stateNode.node
  );
}

export function isChildPublicInstance(
  parentInstance: PublicInstance,
  childInstance: PublicInstance,
): boolean {
  if (__DEV__) {
    const parentInternalInstanceHandle =
      // $FlowExpectedError[incompatible-call] Type for parentInstance should have been PublicInstance from ReactFiberConfigFabric.
      getInternalInstanceHandleFromPublicInstance(parentInstance);
    const childInternalInstanceHandle =
      // $FlowExpectedError[incompatible-call] Type for childInstance should have been PublicInstance from ReactFiberConfigFabric.
      getInternalInstanceHandleFromPublicInstance(childInstance);

    if (
      parentInternalInstanceHandle != null &&
      childInternalInstanceHandle != null
    ) {
      return doesFiberContain(
        parentInternalInstanceHandle,
        childInternalInstanceHandle,
      );
    }

    return false;
  } else {
    throw new Error('isChildPublicInstance() is not available in production.');
  }
}
