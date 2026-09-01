/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {HIRFunction, MutableRange, Place} from './HIR';
import {
  eachInstructionLValue,
  eachInstructionOperand,
  eachTerminalOperand,
} from './visitors';
import {CompilerError} from '..';
import {printPlace} from './PrintHIR';

/*
 * Checks that all mutable ranges in the function are well-formed, with
 * start === end === 0 OR end > start.
 */
export function assertValidMutableRanges(fn: HIRFunction): void {
  for (const [, block] of fn.body.blocks) {
    for (const phi of block.phis) {
      visit(phi.place, `phi for block bb${block.id}`);
      for (const [pred, operand] of phi.operands) {
        visit(operand, `phi predecessor bb${pred} for block bb${block.id}`);
      }
    }
    for (const instr of block.instructions) {
      for (const operand of eachInstructionLValue(instr)) {
        visit(operand, `instruction [${instr.id}]`);
      }
      for (const operand of eachInstructionOperand(instr)) {
        visit(operand, `instruction [${instr.id}]`);
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      visit(operand, `terminal [${block.terminal.id}]`);
    }
  }
}

function visit(place: Place, description: string): void {
  validateMutableRange(place, place.identifier.mutableRange, description);
  if (place.identifier.scope !== null) {
    validateMutableRange(place, place.identifier.scope.range, description);
  }
}

function validateMutableRange(
  place: Place,
  range: MutableRange,
  description: string,
): void {
  CompilerError.invariant(
    (range.start === 0 && range.end === 0) || range.end > range.start,
    {
      reason: `Invalid mutable range: [${range.start}:${range.end}]`,
      description: `${printPlace(place)} in ${description}`,
      loc: place.loc,
    },
  );
}
