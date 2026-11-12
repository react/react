/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError, SourceLocation} from '..';
import {CompilerErrorDetail, ErrorCategory} from '../CompilerError';
import {
  ArrayExpression,
  BlockId,
  FunctionExpression,
  HIRFunction,
  IdentifierId,
  isSetStateType,
  isUseEffectHookType,
} from '../HIR';
import {
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {Environment} from '../HIR/Environment';

/**
 * Validates that useEffect is not used for derived computations which could/should
 * be performed in render.
 *
 * See https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
 *
 * Example:
 *
 * ```
 * // 🔴 Avoid: redundant state and unnecessary Effect
 * const [fullName, setFullName] = useState('');
 * useEffect(() => {
 *   setFullName(firstName + ' ' + lastName);
 * }, [firstName, lastName]);
 * ```
 *
 * Instead use:
 *
 * ```
 * // ✅ Good: calculated during rendering
 * const fullName = firstName + ' ' + lastName;
 * ```
 */
export function validateNoDerivedComputationsInEffects(fn: HIRFunction): void {
  const candidateDependencies: Map<IdentifierId, ArrayExpression> = new Map();
  const functions: Map<IdentifierId, FunctionExpression> = new Map();
  const locals: Map<IdentifierId, IdentifierId> = new Map();

  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      if (value.kind === 'LoadLocal') {
        locals.set(lvalue.identifier.id, value.place.identifier.id);
      } else if (value.kind === 'ArrayExpression') {
        candidateDependencies.set(lvalue.identifier.id, value);
      } else if (value.kind === 'FunctionExpression') {
        functions.set(lvalue.identifier.id, value);
      } else if (
        value.kind === 'CallExpression' ||
        value.kind === 'MethodCall'
      ) {
        const callee =
          value.kind === 'CallExpression' ? value.callee : value.property;
        if (
          isUseEffectHookType(callee.identifier) &&
          value.args.length === 2 &&
          value.args[0].kind === 'Identifier' &&
          value.args[1].kind === 'Identifier'
        ) {
          const effectFunction = functions.get(value.args[0].identifier.id);
          const deps = candidateDependencies.get(value.args[1].identifier.id);
          if (
            effectFunction != null &&
            deps != null &&
            deps.elements.length !== 0 &&
            deps.elements.every(element => element.kind === 'Identifier')
          ) {
            const dependencies: Array<IdentifierId> = deps.elements.map(dep => {
              CompilerError.invariant(dep.kind === 'Identifier', {
                reason: `Dependency is checked as a place above`,
                loc: value.loc,
              });
              return locals.get(dep.identifier.id) ?? dep.identifier.id;
            });
            validateEffect(
              effectFunction.loweredFunc.func,
              dependencies,
              fn.env,
            );
          }
        }
      }
    }
  }
}

function validateEffect(
  effectFunction: HIRFunction,
  effectDeps: Array<IdentifierId>,
  env: Environment,
): void {
  for (const operand of effectFunction.context) {
    if (isSetStateType(operand.identifier)) {
      continue;
    } else if (effectDeps.find(dep => dep === operand.identifier.id) != null) {
      continue;
    } else {
      // Captured something other than the effect dep or setState
      return;
    }
  }
  for (const dep of effectDeps) {
    if (
      effectFunction.context.find(operand => operand.identifier.id === dep) ==
      null
    ) {
      // effect dep wasn't actually used in the function
      return;
    }
  }

  const seenBlocks: Set<BlockId> = new Set();
  const values: Map<IdentifierId, Array<IdentifierId>> = new Map();
  for (const dep of effectDeps) {
    values.set(dep, [dep]);
  }

  const setStateLocations: Array<SourceLocation> = [];
  for (const block of effectFunction.body.blocks.values()) {
    for (const pred of block.preds) {
      if (!seenBlocks.has(pred)) {
        // skip if block has a back edge
        return;
      }
    }
    for (const phi of block.phis) {
      const aggregateDeps: Set<IdentifierId> = new Set();
      for (const operand of phi.operands.values()) {
        const deps = values.get(operand.identifier.id);
        if (deps != null) {
          for (const dep of deps) {
            aggregateDeps.add(dep);
          }
        }
      }
      if (aggregateDeps.size !== 0) {
        values.set(phi.place.identifier.id, Array.from(aggregateDeps));
      }
    }
    for (const instr of block.instructions) {
      switch (instr.value.kind) {
        case 'Primitive':
        case 'JSXText':
        case 'LoadGlobal': {
          break;
        }
        case 'LoadLocal': {
          const deps = values.get(instr.value.place.identifier.id);
          if (deps != null) {
            values.set(instr.lvalue.identifier.id, deps);
          }
          break;
        }
        case 'ComputedLoad':
        case 'PropertyLoad':
        case 'BinaryExpression':
        case 'TemplateLiteral':
        case 'CallExpression':
        case 'MethodCall': {
          const aggregateDeps: Set<IdentifierId> = new Set();
          for (const operand of eachInstructionValueOperand(instr.value)) {
            const deps = values.get(operand.identifier.id);
            if (deps != null) {
              for (const dep of deps) {
                aggregateDeps.add(dep);
              }
            }
          }
          if (aggregateDeps.size !== 0) {
            values.set(instr.lvalue.identifier.id, Array.from(aggregateDeps));
          }

          if (
            instr.value.kind === 'CallExpression' &&
            isSetStateType(instr.value.callee.identifier) &&
            instr.value.args.length === 1 &&
            instr.value.args[0].kind === 'Identifier'
          ) {
            const deps = values.get(instr.value.args[0].identifier.id);
            if (deps != null && new Set(deps).size === effectDeps.length) {
              setStateLocations.push(instr.value.callee.loc);
            } else {
              // doesn't depend on any deps
              return;
            }
          }
          break;
        }
        default: {
          return;
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      if (values.has(operand.identifier.id)) {
        //
        return;
      }
    }
    seenBlocks.add(block.id);
  }

  for (const loc of setStateLocations) {
    env.recordError(
      new CompilerErrorDetail({
        category: ErrorCategory.EffectDerivationsOfState,
        reason:
          'Values derived from props and state should be calculated during render, not in an effect. (https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state)',
        description: null,
        loc,
        suggestions: null,
      }),
    );
  }
}
