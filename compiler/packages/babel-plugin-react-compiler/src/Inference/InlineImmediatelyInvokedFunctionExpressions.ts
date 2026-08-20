/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  BasicBlock,
  BlockId,
  Environment,
  FunctionExpression,
  GeneratedSource,
  GotoTerminal,
  GotoVariant,
  HIRFunction,
  IdentifierId,
  InstructionKind,
  LabelTerminal,
  Place,
  isStatementBlockKind,
  makeInstructionId,
  mergeConsecutiveBlocks,
  promoteTemporary,
  reversePostorderBlocks,
} from '../HIR';
import {
  createTemporaryPlace,
  markInstructionIds,
  markPredecessors,
} from '../HIR/HIRBuilder';
import {eachInstructionValueOperand} from '../HIR/visitors';
import {retainWhere} from '../Utils/utils';

/*
 * Inlines immediately invoked function expressions (IIFEs) to allow more fine-grained memoization
 * of the values they produce.
 *
 * Example:
 *
 * ```
 * const x = (() => {
 *    const x = [];
 *    x.push(foo());
 *    return x;
 * })();
 *
 * =>
 *
 * bb0:
 *     // placeholder for the result, all return statements will assign here
 *    let t0;
 *    // Label allows using a goto (break) to exit out of the body
 *    Label block=bb1 fallthrough=bb2
 * bb1:
 *    // code within the function expression
 *    const x0 = [];
 *    x0.push(foo());
 *    // return is replaced by assignment to the result variable...
 *    t0 = x0;
 *    // ...and a goto to the code after the function expression invocation
 *    Goto bb2
 * bb2:
 *    // code after the IIFE call
 *    const x = t0;
 * ```
 *
 * The implementation relies on HIR's ability to support labeled blocks:
 * - We terminate the basic block just prior to the CallExpression of the IIFE
 *    with a LabelTerminal whose fallback is the code following the CallExpression.
 *    Just prior to the terminal we also create a named temporary variable which
 *    will hold the result.
 * - We then inline the contents of the function "in between" (conceptually) those
 *    two blocks.
 * - All return statements in the original function expression are replaced with a
 *    StoreLocal to the temporary we allocated before plus a Goto to the fallthrough
 *    block (code following the CallExpression).
 *
 * Note that if the inliined function has only one return, we avoid the labeled block
 * and fully inline the code. The original return is replaced with an assignmen to the
 * IIFE's call expression lvalue.
 */
export function inlineImmediatelyInvokedFunctionExpressions(
  fn: HIRFunction,
): void {
  // Track all function expressions that are assigned to a temporary
  const functions = new Map<IdentifierId, FunctionExpression>();
  // Functions that are inlined
  const inlinedFunctions = new Set<IdentifierId>();

  /*
   * Iterate the *existing* blocks from the outer component to find IIFEs
   * and inline them. During iteration we will modify `fn` (by inlining the CFG
   * of IIFEs) so we explicitly copy references to just the original
   * function's blocks first. As blocks are split to make room for IIFE calls,
   * the split portions of the blocks will be added to this queue.
   */
  const queue = Array.from(fn.body.blocks.values());
  queue: for (const block of queue) {
    /*
     * We can't handle labels inside expressions yet, so we don't inline IIFEs if they are in an
     * expression block.
     */
    if (isStatementBlockKind(block.kind)) {
      for (let ii = 0; ii < block.instructions.length; ii++) {
        const instr = block.instructions[ii]!;
        switch (instr.value.kind) {
          case 'FunctionExpression': {
            if (instr.lvalue.identifier.name === null) {
              functions.set(instr.lvalue.identifier.id, instr.value);
            }
            break;
          }
          case 'CallExpression': {
            if (instr.value.args.length !== 0) {
              // We don't support inlining when there are arguments
              continue;
            }
            const body = functions.get(instr.value.callee.identifier.id);
            if (body === undefined) {
              // Not invoking a local function expression, can't inline
              continue;
            }

            if (
              body.loweredFunc.func.params.length > 0 ||
              body.loweredFunc.func.async ||
              body.loweredFunc.func.generator
            ) {
              // Can't inline functions with params, or async/generator functions
              continue;
            }

            // We know this function is used for an IIFE and can prune it later
            inlinedFunctions.add(instr.value.callee.identifier.id);

            // Create a new block which will contain code following the IIFE call
            const continuationBlockId = fn.env.nextBlockId;
            const continuationBlock: BasicBlock = {
              id: continuationBlockId,
              instructions: block.instructions.slice(ii + 1),
              kind: block.kind,
              phis: new Set(),
              preds: new Set(),
              terminal: block.terminal,
            };
            fn.body.blocks.set(continuationBlockId, continuationBlock);

            /*
             * Trim the original block to contain instructions up to (but not including)
             * the IIFE
             */
            block.instructions.length = ii;

            if (hasSingleExitReturnTerminal(body.loweredFunc.func)) {
              block.terminal = {
                kind: 'goto',
                block: body.loweredFunc.func.body.entry,
                id: block.terminal.id,
                loc: block.terminal.loc,
                variant: GotoVariant.Break,
              } as GotoTerminal;
              for (const block of body.loweredFunc.func.body.blocks.values()) {
                if (block.terminal.kind === 'return') {
                  block.instructions.push({
                    id: makeInstructionId(0),
                    loc: block.terminal.loc,
                    lvalue: instr.lvalue,
                    value: {
                      kind: 'LoadLocal',
                      loc: block.terminal.loc,
                      place: block.terminal.value,
                    },
                    effects: null,
                  });
                  block.terminal = {
                    kind: 'goto',
                    block: continuationBlockId,
                    id: block.terminal.id,
                    loc: block.terminal.loc,
                    variant: GotoVariant.Break,
                  } as GotoTerminal;
                }
              }
              for (const [id, block] of body.loweredFunc.func.body.blocks) {
                block.preds.clear();
                fn.body.blocks.set(id, block);
              }
            } else {
              /*
               * To account for multiple returns within the lambda, we treat the lambda
               * as if it were a single labeled statement, and replace all returns with gotos
               * to the label fallthrough.
               */
              const newTerminal: LabelTerminal = {
                block: body.loweredFunc.func.body.entry,
                id: makeInstructionId(0),
                kind: 'label',
                fallthrough: continuationBlockId,
                loc: block.terminal.loc,
              };
              block.terminal = newTerminal;

              // We store the result in the IIFE temporary
              const result = instr.lvalue;

              // Declare the IIFE temporary
              declareTemporary(fn.env, block, result);

              // Promote the temporary with a name as we require this to persist
              if (result.identifier.name == null) {
                promoteTemporary(result.identifier);
              }

              /*
               * Rewrite blocks from the lambda to replace any `return` with a
               * store to the result and `goto` the continuation block
               */
              for (const [id, block] of body.loweredFunc.func.body.blocks) {
                block.preds.clear();
                rewriteBlock(fn.env, block, continuationBlockId, result);
                fn.body.blocks.set(id, block);
              }
            }

            /*
             * Ensure we visit the continuation block, since there may have been
             * sequential IIFEs that need to be visited.
             */
            queue.push(continuationBlock);
            continue queue;
          }
          default: {
            for (const place of eachInstructionValueOperand(instr.value)) {
              // Any other use of a function expression means it isn't an IIFE
              functions.delete(place.identifier.id);
            }
          }
        }
      }
    }
  }

  if (inlinedFunctions.size !== 0) {
    // Remove instructions that define lambdas which we inlined
    for (const block of fn.body.blocks.values()) {
      retainWhere(
        block.instructions,
        instr => !inlinedFunctions.has(instr.lvalue.identifier.id),
      );
    }

    /*
     * If terminals have changed then blocks may have become newly unreachable.
     * Re-run minification of the graph (incl reordering instruction ids)
     */
    reversePostorderBlocks(fn.body);
    markInstructionIds(fn.body);
    markPredecessors(fn.body);
    mergeConsecutiveBlocks(fn);
  }
}

/**
 * Returns true if the function has a single exit terminal (throw/return) which is a return
 */
function hasSingleExitReturnTerminal(fn: HIRFunction): boolean {
  let hasReturn = false;
  let exitCount = 0;
  for (const [, block] of fn.body.blocks) {
    if (block.terminal.kind === 'return' || block.terminal.kind === 'throw') {
      hasReturn ||= block.terminal.kind === 'return';
      exitCount++;
    }
  }
  return exitCount === 1 && hasReturn;
}

/*
 * Rewrites the block so that all `return` terminals are replaced:
 * * Add a StoreLocal <returnValue> = <terminal.value>
 * * Replace the terminal with a Goto to <returnTarget>
 */
function rewriteBlock(
  env: Environment,
  block: BasicBlock,
  returnTarget: BlockId,
  returnValue: Place,
): void {
  const {terminal} = block;
  if (terminal.kind !== 'return') {
    return;
  }
  block.instructions.push({
    id: makeInstructionId(0),
    loc: terminal.loc,
    lvalue: createTemporaryPlace(env, terminal.loc),
    value: {
      kind: 'StoreLocal',
      lvalue: {kind: InstructionKind.Reassign, place: {...returnValue}},
      value: terminal.value,
      type: null,
      loc: terminal.loc,
    },
    effects: null,
  });
  block.terminal = {
    kind: 'goto',
    block: returnTarget,
    id: makeInstructionId(0),
    variant: GotoVariant.Break,
    loc: block.terminal.loc,
  };
}

function declareTemporary(
  env: Environment,
  block: BasicBlock,
  result: Place,
): void {
  block.instructions.push({
    id: makeInstructionId(0),
    loc: GeneratedSource,
    lvalue: createTemporaryPlace(env, result.loc),
    value: {
      kind: 'DeclareLocal',
      lvalue: {
        place: result,
        kind: InstructionKind.Let,
      },
      type: null,
      loc: result.loc,
    },
    effects: null,
  });
}
