/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {PublicInstance} from './ReactNativePrivateInterface';

export default function createPublicTextInstance(
  internalInstanceHandle: mixed,
): PublicInstance {
  return {
    __internalInstanceHandle: internalInstanceHandle,
  };
}
