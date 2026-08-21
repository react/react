/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber, FiberInstance} from './ReactInternalTypes';

export function createFiberInstance(fiber: Fiber): FiberInstance {
  return {current: fiber, previous: null};
}

// The version of this node that `fiber` replaces: for a work-in-progress
// fiber that's the committed version, and for the committed version it's the
// one it replaced when it was committed. Null if the node is mounting.
export function getPreviousVersion(fiber: Fiber): Fiber | null {
  const instance = fiber.instance;
  return instance.current === fiber ? instance.previous : instance.current;
}
