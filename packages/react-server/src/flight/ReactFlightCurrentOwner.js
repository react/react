/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactComponentInfo} from 'shared/ReactTypes';

import {
  supportsComponentStorage,
  componentStorage,
} from '../ReactFlightServerConfig';

let currentOwner: ReactComponentInfo | null = null;

export function setCurrentOwner(componentInfo: null | ReactComponentInfo) {
  currentOwner = componentInfo;
}

export function resolveOwner(): null | ReactComponentInfo {
  if (currentOwner) return currentOwner;
  // $FlowFixMe[constant-condition]
  if (supportsComponentStorage) {
    const owner = componentStorage.getStore();
    if (owner) return owner;
  }
  return null;
}
