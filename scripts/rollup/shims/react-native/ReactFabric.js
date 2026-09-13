/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noformat
 * @nolint
 * @flow
 */

'use strict';

import {BatchedBridge} from 'react-native/react-private-interface';

import type {ReactFabricType} from './ReactNativeTypes';

let ReactFabric: ReactFabricType;

if (__DEV__) {
  ReactFabric = require('../implementations/ReactFabric-dev');
} else {
  ReactFabric = require('../implementations/ReactFabric-prod');
}

global.RN$stopSurface = ReactFabric.stopSurface;

if (global.RN$Bridgeless !== true) {
  BatchedBridge.registerCallableModule('ReactFabric', ReactFabric);
}

export default ReactFabric;
