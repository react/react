/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactDebugInfo} from './ReactTypes';

export type ReactElement = {
  $$typeof: any,
  type: any,
  key: any,
  ref: any,
  props: any,
  // __DEV__ or for string refs
  _owner: any,

  // __DEV__
  _store: {validated: 0 | 1 | 2, ...}, // 0: not validated, 1: validated, 2: force fail
  _debugInfo: null | ReactDebugInfo,
  _debugStack: Error,
  _debugTask: null | ConsoleTask,
};
