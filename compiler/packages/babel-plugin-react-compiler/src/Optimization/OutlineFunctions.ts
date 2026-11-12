/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {HIRFunction, IdentifierId} from '../HIR';
import {BasicBlock, BlockId, HIR} from '../HIR/HIR';
import {mapTerminalSuccessors} from '../HIR/visitors';

export function outlineFunctions(
  fn: HIRFunction,
  fbtOperands: Set<IdentifierId>,
): void {
  /*
   * Outlining hoists the function to module scope, where it is created exactly
   * once, so every evaluation of the original function expression yields the
   * same object. That is only unobservable when the expression is evaluated at
   * most once per render. Otherwise two distinct calls return a shared function:
   * `function makeHandler() { return () => 1 }` compiles the arrow to a single
   * `_temp`, so `makeHandler() === makeHandler()` becomes true and state stored
   * on the result leaks between calls.
   *
   * We therefore only outline functions declared in the body of the function
   * being compiled, which runs at most once per render, and skip functions
   * declared inside a loop, which run once per iteration. We intentionally do
   * not recurse into nested functions, since their bodies may run any number of
   * times both per render and across renders.
   */
  const blocksInCycles = findBlocksInCycles(fn.body);

  for (const [blockId, block] of fn.body.blocks) {
    if (blocksInCycles.has(blockId)) {
      continue;
    }

    for (const instr of block.instructions) {
      const {value, lvalue} = instr;

      if (
        value.kind === 'FunctionExpression' &&
        value.loweredFunc.func.context.length === 0 &&
        // TODO: handle outlining named functions
        value.loweredFunc.func.id === null &&
        !fbtOperands.has(lvalue.identifier.id)
      ) {
        const loweredFunc = value.loweredFunc.func;

        const id = fn.env.generateGloballyUniqueIdentifierName(
          loweredFunc.id ?? loweredFunc.nameHint,
        );
        loweredFunc.id = id.value;

        fn.env.outlineFunction(loweredFunc, null);
        instr.value = {
          kind: 'LoadGlobal',
          binding: {
            kind: 'Global',
            name: id.value,
          },
          loc: value.loc,
        };
      }
    }
  }
}

/**
 * Returns the blocks that can execute more than once, ie the blocks that are
 * part of a cycle in the control-flow graph.
 */
function findBlocksInCycles(body: HIR): Set<BlockId> {
  const blocksInCycles = new Set<BlockId>();

  for (const [blockId, block] of body.blocks) {
    // A block executes more than once if and only if it can reach itself.
    const visited = new Set<BlockId>();
    const stack = getSuccessors(block);
    while (stack.length !== 0) {
      const next = stack.pop()!;
      if (next === blockId) {
        blocksInCycles.add(blockId);
        break;
      }
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      const successor = body.blocks.get(next);
      if (successor !== undefined) {
        stack.push(...getSuccessors(successor));
      }
    }
  }

  return blocksInCycles;
}

/**
 * Collects every block that the terminal refers to, including pseudo-successors
 * such as fallthroughs. Using the full set keeps the cycle detection
 * conservative (we would rather skip outlining than hoist a function out of a
 * loop) and matches `each_terminal_all_successors` in the Rust port.
 */
function getSuccessors(block: BasicBlock): Array<BlockId> {
  const successors = new Set<BlockId>();
  mapTerminalSuccessors(block.terminal, successor => {
    successors.add(successor);
    return successor;
  });
  return Array.from(successors);
}
