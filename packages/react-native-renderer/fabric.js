/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactFabricType} from './src/ReactNativeTypes';
import * as ReactFabric from './src/ReactFabric';
// Assert that the exports line up with the type we're going to expose.
ReactFabric as ReactFabricType;

export * from './src/ReactFabric';
