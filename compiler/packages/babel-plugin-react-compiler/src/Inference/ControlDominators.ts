/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {BlockId, computePostDominatorTree, HIRFunction, Place} from '../HIR';
import {PostDominator} from '../HIR/Dominator';

export type ControlDominators = (id: BlockId) => boolean;

/**
 * Returns an object that lazily calculates whether particular blocks are controlled
 * by values of interest. Which values matter are up to the caller.
 */
export function createControlDominators(
  fn: HIRFunction,
  isControlVariable: (place: Place) => boolean,
): ControlDominators {
  const postDominators = computePostDominatorTree(fn, {
    includeThrowsAsExitNode: false,
  });
  const postDominatorFrontierCache = new Map<BlockId, Set<BlockId>>();

  function isControlledBlock(id: BlockId): boolean {
    let controlBlocks = postDominatorFrontierCache.get(id);
    if (controlBlocks === undefined) {
      controlBlocks = postDominatorFrontier(fn, postDominators, id);
      postDominatorFrontierCache.set(id, controlBlocks);
    }
    for (const blockId of controlBlocks) {
      const controlBlock = fn.body.blocks.get(blockId)!;
      switch (controlBlock.terminal.kind) {
        case 'if':
        case 'branch': {
          if (isControlVariable(controlBlock.terminal.test)) {
            return true;
          }
          break;
        }
        case 'switch': {
          if (isControlVariable(controlBlock.terminal.test)) {
            return true;
          }
          for (const case_ of controlBlock.terminal.cases) {
            if (case_.test !== null && isControlVariable(case_.test)) {
              return true;
            }
          }
          break;
        }
      }
    }
    return false;
  }

  return isControlledBlock;
}

/*
 * Computes the post-dominator frontier of @param block. These are immediate successors of nodes that
 * post-dominate @param targetId and from which execution may not reach @param block. Intuitively, these
 * are the earliest blocks from which execution branches such that it may or may not reach the target block.
 */
function postDominatorFrontier(
  fn: HIRFunction,
  postDominators: PostDominator<BlockId>,
  targetId: BlockId,
): Set<BlockId> {
  const visited = new Set<BlockId>();
  const frontier = new Set<BlockId>();
  const targetPostDominators = postDominatorsOf(fn, postDominators, targetId);
  for (const blockId of [...targetPostDominators, targetId]) {
    if (visited.has(blockId)) {
      continue;
    }
    visited.add(blockId);
    const block = fn.body.blocks.get(blockId)!;
    for (const pred of block.preds) {
      if (!targetPostDominators.has(pred)) {
        // The predecessor does not always reach this block, we found an item on the frontier!
        frontier.add(pred);
      }
    }
  }
  return frontier;
}

function postDominatorsOf(
  fn: HIRFunction,
  postDominators: PostDominator<BlockId>,
  targetId: BlockId,
): Set<BlockId> {
  const result = new Set<BlockId>();
  const visited = new Set<BlockId>();
  const queue = [targetId];
  while (queue.length) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);
    const current = fn.body.blocks.get(currentId)!;
    for (const pred of current.preds) {
      const predPostDominator = postDominators.get(pred) ?? pred;
      if (predPostDominator === targetId || result.has(predPostDominator)) {
        result.add(pred);
      }
      queue.push(pred);
    }
  }
  return result;
}
