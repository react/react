/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {HookSourceLocationKey} from 'react-devtools-shared/src/frontend/types';
import type {HookSource} from 'react-debug-tools/src/ReactDebugHooks';

export function getHookSourceLocationKey({
  fileName,
  lineNumber,
  columnNumber,
}: HookSource): HookSourceLocationKey {
  if (fileName == null || lineNumber == null || columnNumber == null) {
    throw Error('Hook source code location not found.');
  }
  return `${fileName}:${lineNumber}:${columnNumber}`;
}
