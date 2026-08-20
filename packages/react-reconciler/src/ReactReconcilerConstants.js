/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// These are semi-public constants exposed to any third-party renderers.
// Only expose the minimal subset necessary to implement a host config.

export {
  NoEventPriority,
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
} from './ReactEventPriorities';
export {ConcurrentRoot, LegacyRoot} from './ReactRootTags';
