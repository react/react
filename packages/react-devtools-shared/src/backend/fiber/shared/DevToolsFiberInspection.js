/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactComponentInfo, ReactDebugInfo} from 'shared/ReactTypes';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {WorkTagMap} from '../../types';
import type {Rect} from '../../types';

// $FlowFixMe[method-unbinding]
const toString = Object.prototype.toString;

export function isError(object: mixed): boolean {
  return toString.call(object) === '[object Error]';
}

export function getFiberFlags(fiber: Fiber): number {
  // The name of this field changed from "effectTag" to "flags"
  return fiber.flags !== undefined ? fiber.flags : (fiber as any).effectTag;
}

export function rootSupportsProfiling(root: any): boolean {
  if (root.memoizedInteractions != null) {
    // v16 builds include this field for the scheduler/tracing API.
    return true;
  } else if (
    root.current != null &&
    root.current.hasOwnProperty('treeBaseDuration')
  ) {
    // The scheduler/tracing API was removed in v17 though
    // so we need to check a non-root Fiber.
    return true;
  } else {
    return false;
  }
}

export function isErrorBoundary(workTagMap: WorkTagMap, fiber: Fiber): boolean {
  const {tag, type} = fiber;

  switch (tag) {
    case workTagMap.ClassComponent:
    case workTagMap.IncompleteClassComponent:
      const instance = fiber.stateNode;
      return (
        typeof type.getDerivedStateFromError === 'function' ||
        (instance !== null && typeof instance.componentDidCatch === 'function')
      );
    default:
      return false;
  }
}

export function getSecondaryEnvironmentName(
  debugInfo: ?ReactDebugInfo,
  index: number,
): null | string {
  if (debugInfo != null) {
    const componentInfo: ReactComponentInfo = debugInfo[index] as any;
    for (let i = index + 1; i < debugInfo.length; i++) {
      const debugEntry = debugInfo[i];
      if (typeof debugEntry.env === 'string') {
        // If the next environment is different then this component was the boundary
        // and it changed before entering the next component. So we assign this
        // component a secondary environment.
        return componentInfo.env !== debugEntry.env ? debugEntry.env : null;
      }
    }
  }
  return null;
}

export function areEqualRects(
  a: null | Array<Rect>,
  b: null | Array<Rect>,
): boolean {
  if (a === null) {
    return b === null;
  }
  if (b === null) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const aRect = a[i];
    const bRect = b[i];
    if (
      aRect.x !== bRect.x ||
      aRect.y !== bRect.y ||
      aRect.width !== bRect.width ||
      aRect.height !== bRect.height
    ) {
      return false;
    }
  }
  return true;
}
