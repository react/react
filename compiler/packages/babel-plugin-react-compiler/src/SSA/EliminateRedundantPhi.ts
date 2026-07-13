/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {
  BlockId,
  GeneratedSource,
  HIRFunction,
  Identifier,
  Place,
} from '../HIR/HIR';
import {
  eachInstructionLValue,
  eachInstructionOperand,
  eachTerminalOperand,
} from '../HIR/visitors';

const DEBUG = false;

/*
 * Pass to eliminate redundant phi nodes:
 * - all operands are the same identifier, ie `x2 = phi(x1, x1, x1)`.
 * - all operands are the same identifier *or* the output of the phi, ie `x2 = phi(x1, x2, x1, x2)`.
 *
 * In both these cases, the phi is eliminated and all usages of the phi identifier
 * are replaced with the other operand (ie in both cases above, all usages of `x2` are replaced with `x1` .
 *
 * The algorithm is inspired by that in https://pp.ipd.kit.edu/uploads/publikationen/braun13cc.pdf
 * but modified to reduce passes over the CFG. We visit the blocks in reverse postorder. Each time a redundant
 * phi is encountered we add a mapping (eg x2 -> x1) to a rewrite table. Subsequent instructions, terminals,
 * and phis rewrite all their identifiers based on this table. The algorithm loops over the CFG repeatedly
 * until there are no new rewrites: for a CFG without back-edges it completes in a single pass.
 */
export function eliminateRedundantPhi(
  fn: HIRFunction,
  sharedRewrites?: Map<Identifier, Identifier>,
): void {
  const ir = fn.body;
  const rewrites: Map<Identifier, Identifier> =
    sharedRewrites != null ? sharedRewrites : new Map();

  /*
   * Whether or the CFG has a back-edge (a loop). We determine this dynamically
   * during the first iteration over the CFG by recording which blocks were already
   * visited, and checking if a block has any predecessors that weren't visited yet.
   * Because blocks are in reverse postorder, the only time this can occur is a loop.
   */
  let hasBackEdge = false;
  const visited: Set<BlockId> = new Set();

  /*
   * size tracks the number of rewrites at the beginning of each iteration, so we can
   * compare to see if any new rewrites were added in that iteration.
   */
  let size = rewrites.size;
  do {
    size = rewrites.size;
    for (const [blockId, block] of ir.blocks) {
      /*
       * On the first iteration of the loop check for any back-edges.
       * if there aren't any then there won't be a second iteration
       */
      if (!hasBackEdge) {
        for (const predId of block.preds) {
          if (!visited.has(predId)) {
            hasBackEdge = true;
          }
        }
      }
      visited.add(blockId);

      // Find any redundant phis
      phis: for (const phi of block.phis) {
        // Remap phis in case operands are from eliminated phis
        phi.operands.forEach((place, _) => rewritePlace(place, rewrites));
        // Find if the phi can be eliminated
        let same: Identifier | null = null;
        for (const [_, operand] of phi.operands) {
          if (
            (same !== null && operand.identifier.id === same.id) ||
            operand.identifier.id === phi.place.identifier.id
          ) {
            /*
             * This operand is the same as the phi or is the same as the
             * previous non-phi operands
             */
            continue;
          } else if (same !== null) {
            /*
             * There are multiple operands not equal to the phi itself,
             * this phi can't be eliminated.
             */
            continue phis;
          } else {
            // First non-phi operand
            same = operand.identifier;
          }
        }
        CompilerError.invariant(same !== null, {
          reason: 'Expected phis to be non-empty',
          loc: GeneratedSource,
        });
        rewrites.set(phi.place.identifier, same);
        block.phis.delete(phi);
      }

      // Rewrite all instruction lvalues and operands
      for (const instr of block.instructions) {
        for (const place of eachInstructionLValue(instr)) {
          rewritePlace(place, rewrites);
        }
        for (const place of eachInstructionOperand(instr)) {
          rewritePlace(place, rewrites);
        }

        if (
          instr.value.kind === 'FunctionExpression' ||
          instr.value.kind === 'ObjectMethod'
        ) {
          const {context} = instr.value.loweredFunc.func;
          for (const place of context) {
            rewritePlace(place, rewrites);
          }

          /*
           * recursive call to:
           * - eliminate phi nodes in child node
           * - propagate rewrites, which may have changed between iterations
           */
          eliminateRedundantPhi(instr.value.loweredFunc.func, rewrites);
        }
      }

      // Rewrite all terminal operands
      const {terminal} = block;
      for (const place of eachTerminalOperand(terminal)) {
        rewritePlace(place, rewrites);
      }
    }
    /*
     * We only need to loop if there were newly eliminated phis in this iteration
     * *and* the CFG has loops. If there are no loops, then all eliminated phis
     * have already propagated forwards since we visit in reverse postorder.
     */
  } while (rewrites.size > size && hasBackEdge);

  if (DEBUG) {
    for (const [, block] of ir.blocks) {
      for (const phi of block.phis) {
        CompilerError.invariant(!rewrites.has(phi.place.identifier), {
          reason: '[EliminateRedundantPhis]: rewrite not complete',
          loc: phi.place.loc,
        });
        for (const [, operand] of phi.operands) {
          CompilerError.invariant(!rewrites.has(operand.identifier), {
            reason: '[EliminateRedundantPhis]: rewrite not complete',
            loc: phi.place.loc,
          });
        }
      }
    }
  }
}

function rewritePlace(
  place: Place,
  rewrites: Map<Identifier, Identifier>,
): void {
  const rewrite = rewrites.get(place.identifier);
  if (rewrite != null) {
    place.identifier = rewrite;
  }
}
