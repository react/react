/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Instance, TextInstance} from './ReactFiberConfigFabric';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';

// `node` is typed incorrectly here. The proper type should be `PublicInstance`.
// This is ok in DOM because they types are interchangeable, but in React Native
// they aren't.
function getInstanceFromNode(node: Instance | TextInstance): Fiber | null {
  const instance: Instance = node as $FlowFixMe; // In React Native, node is never a text instance

  if (
    instance.canonical != null &&
    instance.canonical.internalInstanceHandle != null
  ) {
    return instance.canonical.internalInstanceHandle;
  }

  // $FlowFixMe[incompatible-type] DevTools incorrectly passes a fiber in React Native.
  return node;
}

export {getInstanceFromNode as getClosestInstanceFromNode};
