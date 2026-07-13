/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  BlockId,
  Effect,
  GeneratedSource,
  HIRFunction,
  Instruction,
  Place,
} from './HIR';
import {markPredecessors} from './HIRBuilder';
import {terminalFallthrough, terminalHasFallthrough} from './visitors';

/*
 * Merges sequences of blocks that will always execute consecutively —
 * ie where the predecessor always transfers control to the successor
 * (ie ends in a goto) and where the predecessor is the only predecessor
 * for that successor (ie, there is no other way to reach the successor).
 *
 * Note that this pass leaves value/loop blocks alone because they cannot
 * be merged without breaking the structure of the high-level terminals
 * that reference them.
 */
export function mergeConsecutiveBlocks(fn: HIRFunction): void {
  const merged = new MergedBlocks();
  const fallthroughBlocks = new Set<BlockId>();
  for (const [, block] of fn.body.blocks) {
    const fallthrough = terminalFallthrough(block.terminal);
    if (fallthrough !== null) {
      fallthroughBlocks.add(fallthrough);
    }

    for (const instr of block.instructions) {
      if (
        instr.value.kind === 'FunctionExpression' ||
        instr.value.kind === 'ObjectMethod'
      ) {
        mergeConsecutiveBlocks(instr.value.loweredFunc.func);
      }
    }

    if (
      // Can only merge blocks with a single predecessor
      block.preds.size !== 1 ||
      // Value blocks cannot merge
      block.kind !== 'block' ||
      // Merging across fallthroughs could move the predecessor out of its block scope
      fallthroughBlocks.has(block.id)
    ) {
      continue;
    }
    const originalPredecessorId = Array.from(block.preds)[0]!;
    const predecessorId = merged.get(originalPredecessorId);
    const predecessor = fn.body.blocks.get(predecessorId);
    CompilerError.invariant(predecessor !== undefined, {
      reason: `Expected predecessor ${predecessorId} to exist`,
      loc: GeneratedSource,
    });
    if (predecessor.terminal.kind !== 'goto' || predecessor.kind !== 'block') {
      /*
       * The predecessor is not guaranteed to transfer control to this block,
       * they aren't consecutive.
       */
      continue;
    }

    // Replace phis in the merged block with canonical assignments to the single operand value
    for (const phi of block.phis) {
      CompilerError.invariant(phi.operands.size === 1, {
        reason: `Found a block with a single predecessor but where a phi has multiple (${phi.operands.size}) operands`,
        loc: GeneratedSource,
      });
      const operand = Array.from(phi.operands.values())[0]!;
      const lvalue: Place = {
        kind: 'Identifier',
        identifier: phi.place.identifier,
        effect: Effect.ConditionallyMutate,
        reactive: false,
        loc: GeneratedSource,
      };
      const instr: Instruction = {
        id: predecessor.terminal.id,
        lvalue: {...lvalue},
        value: {
          kind: 'LoadLocal',
          place: {...operand},
          loc: GeneratedSource,
        },
        effects: [{kind: 'Alias', from: {...operand}, into: {...lvalue}}],
        loc: GeneratedSource,
      };
      predecessor.instructions.push(instr);
    }

    predecessor.instructions.push(...block.instructions);
    predecessor.terminal = block.terminal;
    merged.merge(block.id, predecessorId);
    fn.body.blocks.delete(block.id);
  }
  for (const [, block] of fn.body.blocks) {
    for (const phi of block.phis) {
      for (const [predecessorId, operand] of phi.operands) {
        const mapped = merged.get(predecessorId);
        if (mapped !== predecessorId) {
          phi.operands.delete(predecessorId);
          phi.operands.set(mapped, operand);
        }
      }
    }
  }
  markPredecessors(fn.body);
  for (const [, {terminal}] of fn.body.blocks) {
    if (terminalHasFallthrough(terminal)) {
      terminal.fallthrough = merged.get(terminal.fallthrough);
    }
  }
}

class MergedBlocks {
  #map: Map<BlockId, BlockId> = new Map();

  // Record that @param block was merged into @param into.
  merge(block: BlockId, into: BlockId): void {
    const target = this.get(into);
    this.#map.set(block, target);
  }

  /*
   * Get the id of the block that @param block has been merged into.
   * This is transitive, in the case that eg @param block was merged
   * into a block which later merged into another block.
   */
  get(block: BlockId): BlockId {
    let current = block;
    while (this.#map.has(current)) {
      current = this.#map.get(current) ?? current;
    }
    return current;
  }
}
