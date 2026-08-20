/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  ReactiveFunction,
  ReactiveScopeBlock,
  ReactiveStatement,
} from '../HIR/HIR';
import {
  ReactiveFunctionTransform,
  Transformed,
  visitReactiveFunction,
} from './visitors';

/*
 * Removes *all* reactive scopes. Intended for experimentation only, to allow
 * accurately removing memoization using the compiler pipeline to get a baseline
 * for performance of a product without memoization applied.
 */
export function pruneAllReactiveScopes(fn: ReactiveFunction): void {
  visitReactiveFunction(fn, new Transform(), undefined);
}

class Transform extends ReactiveFunctionTransform<void> {
  override transformScope(
    scopeBlock: ReactiveScopeBlock,
    state: void,
  ): Transformed<ReactiveStatement> {
    this.visitScope(scopeBlock, state);
    return {kind: 'replace-many', value: scopeBlock.instructions};
  }
}
