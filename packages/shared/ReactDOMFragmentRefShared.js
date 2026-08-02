/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Shared logic for Fragment Ref operations for DOM and Fabric configs
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';

import {getNextSiblingInstanceOrTextInstanceFiber} from 'react-reconciler/src/ReactFiberTreeReflection';

export function compareDocumentPositionForEmptyFragment<TPublicInstance>(
  fragmentFiber: Fiber,
  parentHostInstance: TPublicInstance,
  otherNode: TPublicInstance,
  getPublicInstance: (fiber: Fiber) => TPublicInstance,
): number {
  let result;
  // If the fragment has no children, we can use the parent and
  // siblings to determine a position.
  // $FlowFixMe[incompatible-use] Fabric PublicInstance is opaque
  // $FlowFixMe[prop-missing]
  const parentResult = parentHostInstance.compareDocumentPosition(otherNode);
  result = parentResult;
  if (parentHostInstance === otherNode) {
    result = Node.DOCUMENT_POSITION_CONTAINS;
  } else {
    if (parentResult & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      // otherNode is one of the fragment's siblings. Use the next
      // sibling to determine if its preceding or following.
      const nextSiblingFiber =
        getNextSiblingInstanceOrTextInstanceFiber(fragmentFiber);
      if (nextSiblingFiber === null) {
        result = Node.DOCUMENT_POSITION_PRECEDING;
      } else {
        const nextSiblingInstance = getPublicInstance(nextSiblingFiber);
        const nextSiblingResult =
          // $FlowFixMe[incompatible-use] Fabric PublicInstance is opaque
          // $FlowFixMe[prop-missing]
          nextSiblingInstance.compareDocumentPosition(otherNode);
        if (
          nextSiblingResult === 0 ||
          nextSiblingResult & Node.DOCUMENT_POSITION_FOLLOWING
        ) {
          result = Node.DOCUMENT_POSITION_FOLLOWING;
        } else {
          result = Node.DOCUMENT_POSITION_PRECEDING;
        }
      }
    }
  }

  result |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  return result;
}
