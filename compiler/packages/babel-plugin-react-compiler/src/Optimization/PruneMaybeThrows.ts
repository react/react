/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  BlockId,
  GeneratedSource,
  HIRFunction,
  Instruction,
  assertConsistentIdentifiers,
  assertTerminalSuccessorsExist,
  mergeConsecutiveBlocks,
  reversePostorderBlocks,
} from '../HIR';
import {
  markInstructionIds,
  removeDeadDoWhileStatements,
  removeUnnecessaryTryCatch,
  removeUnreachableForUpdates,
} from '../HIR/HIRBuilder';
import {printPlace} from '../HIR/PrintHIR';

/**
 * This pass updates `maybe-throw` terminals for blocks that can provably *never* throw,
 * nulling out the handler to indicate that control will always continue. Note that
 * rewriting to a `goto` disrupts the structure of the HIR, making it more difficult to
 * reconstruct an ast during BuildReactiveFunction. Preserving the maybe-throw makes the
 * continuations clear, while nulling out the handler tells us that control cannot flow
 * to the handler.
 *
 * For now the analysis is very conservative, and only affects blocks with primitives or
 * array/object literals. Even a variable reference could throw bc of the TDZ.
 */
export function pruneMaybeThrows(fn: HIRFunction): void {
  const terminalMapping = pruneMaybeThrowsImpl(fn);
  if (terminalMapping) {
    /*
     * If terminals have changed then blocks may have become newly unreachable.
     * Re-run minification of the graph (incl reordering instruction ids)
     */
    reversePostorderBlocks(fn.body);
    removeUnreachableForUpdates(fn.body);
    removeDeadDoWhileStatements(fn.body);
    removeUnnecessaryTryCatch(fn.body);
    markInstructionIds(fn.body);
    mergeConsecutiveBlocks(fn);

    // Rewrite phi operands to reference the updated predecessor blocks
    for (const [, block] of fn.body.blocks) {
      for (const phi of block.phis) {
        for (const [predecessor, operand] of phi.operands) {
          if (!block.preds.has(predecessor)) {
            const mappedTerminal = terminalMapping.get(predecessor);
            CompilerError.invariant(mappedTerminal != null, {
              reason: `Expected non-existing phi operand's predecessor to have been mapped to a new terminal`,
              description: `Could not find mapping for predecessor bb${predecessor} in block bb${
                block.id
              } for phi ${printPlace(phi.place)}`,
              loc: GeneratedSource,
            });
            phi.operands.delete(predecessor);
            phi.operands.set(mappedTerminal, operand);
          }
        }
      }
    }

    assertConsistentIdentifiers(fn);
    assertTerminalSuccessorsExist(fn);
  }
}

function pruneMaybeThrowsImpl(fn: HIRFunction): Map<BlockId, BlockId> | null {
  const terminalMapping = new Map<BlockId, BlockId>();
  for (const [_, block] of fn.body.blocks) {
    const terminal = block.terminal;
    if (terminal.kind !== 'maybe-throw') {
      continue;
    }
    const canThrow = block.instructions.some(instr =>
      instructionMayThrow(instr),
    );
    if (!canThrow) {
      const source = terminalMapping.get(block.id) ?? block.id;
      terminalMapping.set(terminal.continuation, source);
      terminal.handler = null;
    }
  }
  return terminalMapping.size > 0 ? terminalMapping : null;
}

function instructionMayThrow(instr: Instruction): boolean {
  switch (instr.value.kind) {
    case 'Primitive':
    case 'ArrayExpression':
    case 'ObjectExpression': {
      return false;
    }
    default: {
      return true;
    }
  }
}
