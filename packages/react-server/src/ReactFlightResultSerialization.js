/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Input} from './ReactFlightResultSerializationServer';
import type {ReactClientValue} from './ReactFlightResultServer';
import type {Result} from 'shared/ReactFlightResult';
import {getRoot} from 'shared/ReactFlightResult';

export function createInput(result: Result<ReactClientValue>): Input {
  return {root: getRoot(result)};
}
