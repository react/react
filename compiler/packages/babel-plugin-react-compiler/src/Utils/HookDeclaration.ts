/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';

export type HookDeclaration = t.FunctionDeclaration & {
  __hookDeclaration: boolean;
};

export function isHookDeclaration(
  node: t.FunctionDeclaration,
): node is HookDeclaration {
  return Object.prototype.hasOwnProperty.call(node, '__hookDeclaration');
}

export function parseHookDeclaration(
  node: t.FunctionDeclaration,
): HookDeclaration | null {
  return isHookDeclaration(node) ? node : null;
}
