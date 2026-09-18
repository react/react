/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FragmentInstanceType} from './ReactFiberConfig';
import type {Fiber} from './ReactInternalTypes';

import {
  HostRoot,
  HostComponent,
  HostSingleton,
  HostText,
  Fragment,
} from './ReactWorkTags';
import {
  supportsSingletons,
  commitNewChildToFragmentInstance,
  deleteChildFromFragmentInstance,
} from './ReactFiberConfig';
import {enableFragmentRefsTextNodes} from 'shared/ReactFeatureFlags';

export function commitNewChildToFragmentInstances(
  fiber: Fiber,
  parentFragmentInstances: null | Array<FragmentInstanceType>,
): void {
  if (
    (fiber.tag !== HostComponent &&
      fiber.tag !== HostSingleton &&
      !(enableFragmentRefsTextNodes && fiber.tag === HostText)) ||
    // Only run fragment insertion effects for initial insertions
    fiber.alternate !== null ||
    parentFragmentInstances === null
  ) {
    return;
  }
  for (let i = 0; i < parentFragmentInstances.length; i++) {
    const fragmentInstance = parentFragmentInstances[i];
    commitNewChildToFragmentInstance(fiber.stateNode, fragmentInstance);
  }
}

export function commitFragmentInstanceInsertionEffects(fiber: Fiber): void {
  let parent = fiber.return;
  while (parent !== null) {
    if (isFragmentInstanceParent(parent)) {
      const fragmentInstance: FragmentInstanceType = parent.stateNode;
      commitNewChildToFragmentInstance(fiber.stateNode, fragmentInstance);
    }

    if (isFragmentInstanceHostBoundary(parent)) {
      return;
    }

    parent = parent.return;
  }
}

export function commitFragmentInstanceDeletionEffects(fiber: Fiber): void {
  let parent = fiber.return;
  while (parent !== null) {
    if (isFragmentInstanceParent(parent)) {
      const fragmentInstance: FragmentInstanceType = parent.stateNode;
      deleteChildFromFragmentInstance(fiber.stateNode, fragmentInstance);
    }

    if (isFragmentInstanceHostBoundary(parent)) {
      return;
    }

    parent = parent.return;
  }
}

export function getParentFragmentInstances(
  fiber: Fiber,
): null | Array<FragmentInstanceType> {
  let parentFragmentInstances = null;
  let parent = fiber.return;
  while (parent !== null) {
    if (isFragmentInstanceParent(parent)) {
      const fragmentInstance: FragmentInstanceType = parent.stateNode;
      if (parentFragmentInstances === null) {
        parentFragmentInstances = [fragmentInstance];
      } else {
        parentFragmentInstances.push(fragmentInstance);
      }
    }
    if (isFragmentInstanceHostBoundary(parent)) {
      break;
    }
    parent = parent.return;
  }
  return parentFragmentInstances;
}

// HostPortal / HostHoistable are host parents for placement, but not for
// fragment instance ancestry — commit bookkeeping walks past them so it
// matches getFragmentParentInstanceOrContainerFiber. HostSingleton is a
// fragment host boundary (and a collected child) even when it is not a
// placement scope.
function isFragmentInstanceHostBoundary(fiber: Fiber): boolean {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    // $FlowFixMe[constant-condition]
    (supportsSingletons ? fiber.tag === HostSingleton : false)
  );
}

function isFragmentInstanceParent(fiber: Fiber): boolean {
  return fiber && fiber.tag === Fragment && fiber.stateNode !== null;
}
