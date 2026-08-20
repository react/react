/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  BlockId,
  GeneratedSource,
  HIRFunction,
  computePostDominatorTree,
} from '.';
import {CompilerError} from '..';

export function computeUnconditionalBlocks(fn: HIRFunction): Set<BlockId> {
  // Construct the set of blocks that is always reachable from the entry block.
  const unconditionalBlocks = new Set<BlockId>();
  const dominators = computePostDominatorTree(fn, {
    /*
     * Hooks must only be in a consistent order for executions that return normally,
     * so we opt-in to viewing throw as a non-exit node.
     */
    includeThrowsAsExitNode: false,
  });
  const exit = dominators.exit;
  let current: BlockId | null = fn.body.entry;
  while (current !== null && current !== exit) {
    CompilerError.invariant(!unconditionalBlocks.has(current), {
      reason:
        'Internal error: non-terminating loop in ComputeUnconditionalBlocks',
      loc: GeneratedSource,
    });
    unconditionalBlocks.add(current);
    current = dominators.get(current);
  }
  return unconditionalBlocks;
}
