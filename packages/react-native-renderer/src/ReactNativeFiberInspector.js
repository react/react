/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {TouchedViewDataAtPoint, InspectorData} from './ReactNativeTypes';

import {
  findCurrentHostFiber,
  findCurrentFiberUsingSlowPath,
} from 'react-reconciler/src/ReactFiberTreeReflection';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import {HostComponent} from 'react-reconciler/src/ReactWorkTags';
// Module provided by RN:
import {getNodeFromPublicInstance} from 'react-native/react-private-interface';
import {getNodeFromInternalInstanceHandle} from './ReactNativePublicCompat';
import {getStackByFiberInDevAndProd} from 'react-reconciler/src/ReactFiberComponentStack';

let getInspectorDataForInstance: (
  closestInstance: Fiber | null,
) => InspectorData;

if (__DEV__) {
  const emptyObject = Object.freeze({});

  // $FlowFixMe[missing-local-annot]
  const createHierarchy = function (fiberHierarchy) {
    return fiberHierarchy.map(fiber => ({
      name: getComponentNameFromType(fiber.type),
      getInspectorData: () => {
        return {
          props: getHostProps(fiber),
          measure: callback => {
            const hostFiber = findCurrentHostFiber(fiber);
            const node =
              hostFiber != null &&
              hostFiber.stateNode !== null &&
              hostFiber.stateNode.node;

            if (node) {
              nativeFabricUIManager.measure(node, callback);
            }
          },
        };
      },
    }));
  };

  const getHostProps = function (fiber: Fiber) {
    const host = findCurrentHostFiber(fiber);
    if (host) {
      return host.memoizedProps || emptyObject;
    }
    return emptyObject;
  };

  getInspectorDataForInstance = function (
    closestInstance: Fiber | null,
  ): InspectorData {
    // Handle case where user clicks outside of ReactNative
    if (!closestInstance) {
      return {
        hierarchy: [],
        props: emptyObject,
        selectedIndex: null,
        componentStack: '',
      };
    }

    const fiber = findCurrentFiberUsingSlowPath(closestInstance);
    if (fiber === null) {
      // Might not be currently mounted.
      return {
        hierarchy: [],
        props: emptyObject,
        selectedIndex: null,
        componentStack: '',
      };
    }
    const fiberHierarchy = getOwnerHierarchy(fiber);
    const instance = lastNonHostInstance(fiberHierarchy);
    const hierarchy = createHierarchy(fiberHierarchy);
    const props = getHostProps(instance);
    const selectedIndex = fiberHierarchy.indexOf(instance);
    const componentStack = getStackByFiberInDevAndProd(fiber);

    return {
      closestInstance: instance,
      hierarchy,
      props,
      selectedIndex,
      componentStack,
    };
  };

  const getOwnerHierarchy = function (instance: Fiber) {
    const hierarchy: Array<$FlowFixMe> = [];
    traverseOwnerTreeUp(hierarchy, instance);
    return hierarchy;
  };

  // $FlowFixMe[missing-local-annot]
  const lastNonHostInstance = function (hierarchy) {
    for (let i = hierarchy.length - 1; i > 1; i--) {
      const instance = hierarchy[i];

      if (instance.tag !== HostComponent) {
        return instance;
      }
    }
    return hierarchy[0];
  };

  const traverseOwnerTreeUp = function (
    hierarchy: Array<$FlowFixMe>,
    instance: Fiber,
  ): void {
    hierarchy.unshift(instance);
    const owner = instance._debugOwner;
    if (owner != null && typeof owner.tag === 'number') {
      traverseOwnerTreeUp(hierarchy, owner as any);
    } else {
      // TODO: Traverse Server Components owners.
    }
  };
}

function getInspectorDataForViewAtPoint(
  inspectedView: Object,
  locationX: number,
  locationY: number,
  callback: (viewData: TouchedViewDataAtPoint) => mixed,
): void {
  if (__DEV__) {
    let closestInstance = null;

    const fabricNode = getNodeFromPublicInstance(inspectedView);
    if (fabricNode) {
      // For Fabric we can look up the instance handle directly and measure it.
      nativeFabricUIManager.findNodeAtPoint(
        fabricNode,
        locationX,
        locationY,
        internalInstanceHandle => {
          const node =
            internalInstanceHandle != null
              ? getNodeFromInternalInstanceHandle(internalInstanceHandle)
              : null;
          if (internalInstanceHandle == null || node == null) {
            callback({
              pointerY: locationY,
              frame: {left: 0, top: 0, width: 0, height: 0},
              ...getInspectorDataForInstance(closestInstance),
            });
            return;
          }

          closestInstance =
            internalInstanceHandle.stateNode.canonical.internalInstanceHandle;
          const closestPublicInstance =
            internalInstanceHandle.stateNode.canonical.publicInstance;

          // Note: this is deprecated and we want to remove it ASAP. Keeping it here for React DevTools compatibility for now.
          const nativeViewTag =
            internalInstanceHandle.stateNode.canonical.nativeTag;

          nativeFabricUIManager.measure(
            node,
            (x, y, width, height, pageX, pageY) => {
              const inspectorData =
                getInspectorDataForInstance(closestInstance);
              callback({
                ...inspectorData,
                pointerY: locationY,
                frame: {left: pageX, top: pageY, width, height},
                touchedViewTag: nativeViewTag,
                closestPublicInstance,
              });
            },
          );
        },
      );
    } else {
      console.error(
        'getInspectorDataForViewAtPoint expects to receive a host component',
      );

      return;
    }
  } else {
    throw new Error(
      'getInspectorDataForViewAtPoint() is not available in production.',
    );
  }
}

export {getInspectorDataForInstance, getInspectorDataForViewAtPoint};
