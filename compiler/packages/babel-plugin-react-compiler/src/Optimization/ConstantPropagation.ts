/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {isValidIdentifier} from '@babel/types';
import {CompilerError} from '../CompilerError';
import {
  GeneratedSource,
  GotoVariant,
  HIRFunction,
  IdentifierId,
  Instruction,
  InstructionValue,
  LoadGlobal,
  Phi,
  Place,
  Primitive,
  assertConsistentIdentifiers,
  assertTerminalSuccessorsExist,
  makePropertyLiteral,
  markInstructionIds,
  markPredecessors,
  mergeConsecutiveBlocks,
  reversePostorderBlocks,
} from '../HIR';
import {
  removeDeadDoWhileStatements,
  removeUnnecessaryTryCatch,
  removeUnreachableForUpdates,
} from '../HIR/HIRBuilder';
import {eliminateRedundantPhi} from '../SSA';

/*
 * Applies constant propagation/folding to the given function. The approach is
 * [Sparse Conditional Constant Propagation](https://en.wikipedia.org/wiki/Sparse_conditional_constant_propagation):
 * we use abstract interpretation to record known constant values for identifiers,
 * with lack of a value indicating that the identifier does not have a
 * known constant value.
 *
 * Instructions which can be compile-time evaluated *and* whose operands are known constants
 * are replaced with the resulting constant value. For example a BinaryExpression
 * where the left value is known to be `1` and the right value is known to be `2`
 * can be replaced with a `Constant 3` instruction.
 *
 * This pass also exploits the use of SSA form, tracking the constant values of
 * local variables. For example, in `let x = 4; let y = x + 1` we know that
 * `x = 4` in the binary expression and can replace the binary expression with
 * `Constant 5`.
 *
 * This pass also visits conditionals (currently only IfTerminal) and can prune
 * unreachable branches when the condition is a known truthy/falsey constant. The
 * pass uses fixpoint iteration, looping until no additional updates can be
 * performed. This allows the compiler to find cases where once one conditional is pruned,
 * other values become constant, allowing subsequent conditionals to be pruned and so on.
 */
export function constantPropagation(fn: HIRFunction): void {
  const constants: Constants = new Map();
  constantPropagationImpl(fn, constants);
}

function constantPropagationImpl(fn: HIRFunction, constants: Constants): void {
  while (true) {
    const haveTerminalsChanged = applyConstantPropagation(fn, constants);
    if (!haveTerminalsChanged) {
      break;
    }
    /*
     * If terminals have changed then blocks may have become newly unreachable.
     * Re-run minification of the graph (incl reordering instruction ids)
     */
    reversePostorderBlocks(fn.body);
    removeUnreachableForUpdates(fn.body);
    removeDeadDoWhileStatements(fn.body);
    removeUnnecessaryTryCatch(fn.body);
    markInstructionIds(fn.body);
    markPredecessors(fn.body);

    // Now that predecessors are updated, prune phi operands that can never be reached
    for (const [, block] of fn.body.blocks) {
      for (const phi of block.phis) {
        for (const [predecessor] of phi.operands) {
          if (!block.preds.has(predecessor)) {
            phi.operands.delete(predecessor);
          }
        }
      }
    }
    /*
     * By removing some phi operands, there may be phis that were not previously
     * redundant but now are
     */
    eliminateRedundantPhi(fn);
    /*
     * Finally, merge together any blocks that are now guaranteed to execute
     * consecutively
     */
    mergeConsecutiveBlocks(fn);

    assertConsistentIdentifiers(fn);
    assertTerminalSuccessorsExist(fn);
  }
}

function applyConstantPropagation(
  fn: HIRFunction,
  constants: Constants,
): boolean {
  let hasChanges = false;
  for (const [, block] of fn.body.blocks) {
    /*
     * Initialize phi values if all operands have the same known constant value.
     * Note that this analysis uses a single-pass only, so it will never fill in
     * phi values for blocks that have a back-edge.
     */
    for (const phi of block.phis) {
      let value = evaluatePhi(phi, constants);
      if (value !== null) {
        constants.set(phi.place.identifier.id, value);
      }
    }

    for (let i = 0; i < block.instructions.length; i++) {
      if (block.kind === 'sequence' && i === block.instructions.length - 1) {
        /*
         * evaluating the last value of a value block can break order of evaluation,
         * skip these instructions
         */
        continue;
      }
      const instr = block.instructions[i]!;
      const value = evaluateInstruction(constants, instr);
      if (value !== null) {
        constants.set(instr.lvalue.identifier.id, value);
      }
    }

    const terminal = block.terminal;
    switch (terminal.kind) {
      case 'if': {
        const testValue = read(constants, terminal.test);
        if (testValue !== null && testValue.kind === 'Primitive') {
          hasChanges = true;
          const targetBlockId = testValue.value
            ? terminal.consequent
            : terminal.alternate;
          block.terminal = {
            kind: 'goto',
            variant: GotoVariant.Break,
            block: targetBlockId,
            id: terminal.id,
            loc: terminal.loc,
          };
        }
        break;
      }
      default: {
        // no-op
      }
    }
  }

  return hasChanges;
}

function evaluatePhi(phi: Phi, constants: Constants): Constant | null {
  let value: Constant | null = null;
  for (const [, operand] of phi.operands) {
    const operandValue = constants.get(operand.identifier.id) ?? null;
    // did not find a constant, can't constant propogate
    if (operandValue === null) {
      return null;
    }

    /*
     * first iteration of the loop, let's store the operand and continue
     * looping.
     */
    if (value === null) {
      value = operandValue;
      continue;
    }

    // found different kinds of constants, can't constant propogate
    if (operandValue.kind !== value.kind) {
      return null;
    }

    switch (operandValue.kind) {
      case 'Primitive': {
        CompilerError.invariant(value.kind === 'Primitive', {
          reason: 'value kind expected to be Primitive',
          loc: GeneratedSource,
        });

        // different constant values, can't constant propogate
        if (operandValue.value !== value.value) {
          return null;
        }
        break;
      }
      case 'LoadGlobal': {
        CompilerError.invariant(value.kind === 'LoadGlobal', {
          reason: 'value kind expected to be LoadGlobal',
          loc: GeneratedSource,
        });

        // different global values, can't constant propogate
        if (operandValue.binding.name !== value.binding.name) {
          return null;
        }
        break;
      }
      default:
        return null;
    }
  }

  return value;
}

function evaluateInstruction(
  constants: Constants,
  instr: Instruction,
): Constant | null {
  const value = instr.value;
  switch (value.kind) {
    case 'Primitive': {
      return value;
    }
    case 'LoadGlobal': {
      return value;
    }
    case 'ComputedLoad': {
      const property = read(constants, value.property);
      if (
        property !== null &&
        property.kind === 'Primitive' &&
        ((typeof property.value === 'string' &&
          isValidIdentifier(property.value)) ||
          typeof property.value === 'number')
      ) {
        const nextValue: InstructionValue = {
          kind: 'PropertyLoad',
          loc: value.loc,
          property: makePropertyLiteral(property.value),
          object: value.object,
        };
        instr.value = nextValue;
      }
      return null;
    }
    case 'ComputedStore': {
      const property = read(constants, value.property);
      if (
        property !== null &&
        property.kind === 'Primitive' &&
        ((typeof property.value === 'string' &&
          isValidIdentifier(property.value)) ||
          typeof property.value === 'number')
      ) {
        const nextValue: InstructionValue = {
          kind: 'PropertyStore',
          loc: value.loc,
          property: makePropertyLiteral(property.value),
          object: value.object,
          value: value.value,
        };
        instr.value = nextValue;
      }
      return null;
    }
    case 'PostfixUpdate': {
      const previous = read(constants, value.value);
      if (
        previous !== null &&
        previous.kind === 'Primitive' &&
        typeof previous.value === 'number'
      ) {
        const next =
          value.operation === '++' ? previous.value + 1 : previous.value - 1;
        // Store the updated value
        constants.set(value.lvalue.identifier.id, {
          kind: 'Primitive',
          value: next,
          loc: value.loc,
        });
        // But return the value prior to the update
        return previous;
      }
      return null;
    }
    case 'PrefixUpdate': {
      const previous = read(constants, value.value);
      if (
        previous !== null &&
        previous.kind === 'Primitive' &&
        typeof previous.value === 'number'
      ) {
        const next: Primitive = {
          kind: 'Primitive',
          value:
            value.operation === '++' ? previous.value + 1 : previous.value - 1,
          loc: value.loc,
        };
        // Store and return the updated value
        constants.set(value.lvalue.identifier.id, next);
        return next;
      }
      return null;
    }
    case 'UnaryExpression': {
      switch (value.operator) {
        case '!': {
          const operand = read(constants, value.value);
          if (operand !== null && operand.kind === 'Primitive') {
            const result: Primitive = {
              kind: 'Primitive',
              value: !operand.value,
              loc: value.loc,
            };
            instr.value = result;
            return result;
          }
          return null;
        }
        case '-': {
          const operand = read(constants, value.value);
          if (
            operand !== null &&
            operand.kind === 'Primitive' &&
            typeof operand.value === 'number'
          ) {
            const result: Primitive = {
              kind: 'Primitive',
              value: operand.value * -1,
              loc: value.loc,
            };
            instr.value = result;
            return result;
          }
          return null;
        }
        default:
          return null;
      }
    }
    case 'BinaryExpression': {
      const lhsValue = read(constants, value.left);
      const rhsValue = read(constants, value.right);
      if (
        lhsValue !== null &&
        rhsValue !== null &&
        lhsValue.kind === 'Primitive' &&
        rhsValue.kind === 'Primitive'
      ) {
        const lhs = lhsValue.value;
        const rhs = rhsValue.value;
        let result: Primitive | null = null;
        switch (value.operator) {
          case '+': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs + rhs, loc: value.loc};
            } else if (typeof lhs === 'string' && typeof rhs === 'string') {
              result = {kind: 'Primitive', value: lhs + rhs, loc: value.loc};
            }
            break;
          }
          case '-': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs - rhs, loc: value.loc};
            }
            break;
          }
          case '*': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs * rhs, loc: value.loc};
            }
            break;
          }
          case '/': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs / rhs, loc: value.loc};
            }
            break;
          }
          case '|': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs | rhs, loc: value.loc};
            }
            break;
          }
          case '&': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs & rhs, loc: value.loc};
            }
            break;
          }
          case '^': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs ^ rhs, loc: value.loc};
            }
            break;
          }
          case '<<': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs << rhs, loc: value.loc};
            }
            break;
          }
          case '>>': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs >> rhs, loc: value.loc};
            }
            break;
          }
          case '>>>': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {
                kind: 'Primitive',
                value: lhs >>> rhs,
                loc: value.loc,
              };
            }
            break;
          }
          case '%': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs % rhs, loc: value.loc};
            }
            break;
          }
          case '**': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs ** rhs, loc: value.loc};
            }
            break;
          }
          case '<': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs < rhs, loc: value.loc};
            }
            break;
          }
          case '<=': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs <= rhs, loc: value.loc};
            }
            break;
          }
          case '>': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs > rhs, loc: value.loc};
            }
            break;
          }
          case '>=': {
            if (typeof lhs === 'number' && typeof rhs === 'number') {
              result = {kind: 'Primitive', value: lhs >= rhs, loc: value.loc};
            }
            break;
          }
          case '==': {
            result = {kind: 'Primitive', value: lhs == rhs, loc: value.loc};
            break;
          }
          case '===': {
            result = {kind: 'Primitive', value: lhs === rhs, loc: value.loc};
            break;
          }
          case '!=': {
            result = {kind: 'Primitive', value: lhs != rhs, loc: value.loc};
            break;
          }
          case '!==': {
            result = {kind: 'Primitive', value: lhs !== rhs, loc: value.loc};
            break;
          }
          default: {
            break;
          }
        }
        if (result !== null) {
          instr.value = result;
          return result;
        }
      }
      return null;
    }
    case 'PropertyLoad': {
      const objectValue = read(constants, value.object);
      if (objectValue !== null) {
        if (
          objectValue.kind === 'Primitive' &&
          typeof objectValue.value === 'string' &&
          value.property === 'length'
        ) {
          const result: InstructionValue = {
            kind: 'Primitive',
            value: objectValue.value.length,
            loc: value.loc,
          };
          instr.value = result;
          return result;
        }
      }
      return null;
    }
    case 'TemplateLiteral': {
      if (value.subexprs.length === 0) {
        const result: InstructionValue = {
          kind: 'Primitive',
          value: value.quasis.map(q => q.cooked).join(''),
          loc: value.loc,
        };
        instr.value = result;
        return result;
      }

      if (value.subexprs.length !== value.quasis.length - 1) {
        return null;
      }

      if (value.quasis.some(q => q.cooked === undefined)) {
        return null;
      }

      let quasiIndex = 0;
      let resultString = value.quasis[quasiIndex].cooked as string;
      ++quasiIndex;

      for (const subExpr of value.subexprs) {
        const subExprValue = read(constants, subExpr);
        if (!subExprValue || subExprValue.kind !== 'Primitive') {
          return null;
        }

        const expressionValue = subExprValue.value;
        if (
          typeof expressionValue !== 'number' &&
          typeof expressionValue !== 'string' &&
          typeof expressionValue !== 'boolean' &&
          !(typeof expressionValue === 'object' && expressionValue === null)
        ) {
          // value is not supported (function, object) or invalid (symbol), or something else
          return null;
        }

        const suffix = value.quasis[quasiIndex].cooked;
        ++quasiIndex;

        if (suffix === undefined) {
          return null;
        }

        /*
         * Spec states that concat calls ToString(argument) internally on its parameters
         * -> we don't have to implement ToString(argument) ourselves and just use the engine implementation
         * Refs:
         *  - https://tc39.es/ecma262/2024/#sec-tostring
         *  - https://tc39.es/ecma262/2024/#sec-string.prototype.concat
         *  - https://tc39.es/ecma262/2024/#sec-template-literals-runtime-semantics-evaluation
         */
        resultString = resultString.concat(expressionValue as string, suffix);
      }

      const result: InstructionValue = {
        kind: 'Primitive',
        value: resultString,
        loc: value.loc,
      };

      instr.value = result;
      return result;
    }
    case 'LoadLocal': {
      const placeValue = read(constants, value.place);
      if (placeValue !== null) {
        instr.value = placeValue;
      }
      return placeValue;
    }
    case 'StoreLocal': {
      const placeValue = read(constants, value.value);
      if (placeValue !== null) {
        constants.set(value.lvalue.place.identifier.id, placeValue);
      }
      return placeValue;
    }
    case 'ObjectMethod':
    case 'FunctionExpression': {
      constantPropagationImpl(value.loweredFunc.func, constants);
      return null;
    }
    case 'StartMemoize': {
      if (value.deps != null) {
        for (const dep of value.deps) {
          if (dep.root.kind === 'NamedLocal') {
            const placeValue = read(constants, dep.root.value);
            if (placeValue != null && placeValue.kind === 'Primitive') {
              dep.root.constant = true;
            }
          }
        }
      }
      return null;
    }
    default: {
      // TODO: handle more cases
      return null;
    }
  }
}

/*
 * Recursively read the value of a place: if it is a constant place, attempt to read
 * from that place until reaching a primitive or finding a value that is unset.
 */
function read(constants: Constants, place: Place): Constant | null {
  return constants.get(place.identifier.id) ?? null;
}

type Constant = Primitive | LoadGlobal;
type Constants = Map<IdentifierId, Constant>;
