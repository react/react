/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {FiberRoot} from './ReactInternalTypes';
import type {RootState} from './ReactFiberRoot';

// This is imported by the event replaying implementation in React DOM. It's
// in a separate file to break a circular dependency between the renderer and
// the reconciler.
export function isRootDehydrated(root: FiberRoot): boolean {
  const currentState: RootState = root.current.memoizedState;
  return currentState.isDehydrated;
}
