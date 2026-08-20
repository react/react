/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  PublicInstance,
  PublicRootInstance,
} from './ReactNativePrivateInterface';

export default function createPublicInstance(
  tag: number,
  viewConfig: mixed,
  internalInstanceHandle: mixed,
  rootPublicInstance: PublicRootInstance | null,
): PublicInstance {
  return {
    __nativeTag: tag,
    __internalInstanceHandle: internalInstanceHandle,
    __rootPublicInstance: rootPublicInstance,
  };
}
