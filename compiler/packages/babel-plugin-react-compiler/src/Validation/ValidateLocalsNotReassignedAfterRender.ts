/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic, CompilerError, Effect} from '..';
import {ErrorCategory} from '../CompilerError';
import {Environment} from '../HIR/Environment';
import {HIRFunction, IdentifierId, Place} from '../HIR';
import {
  eachInstructionLValue,
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {getFunctionCallSignature} from '../Inference/InferMutationAliasingEffects';

/**
 * Validates that local variables cannot be reassigned after render.
 * This prevents a category of bugs in which a closure captures a
 * binding from one render but does not update
 */
export function validateLocalsNotReassignedAfterRender(fn: HIRFunction): void {
  const contextVariables = new Set<IdentifierId>();
  const reassignment = getContextReassignment(
    fn,
    contextVariables,
    false,
    false,
    fn.env,
  );
  if (reassignment !== null) {
    const variable =
      reassignment.identifier.name != null &&
      reassignment.identifier.name.kind === 'named'
        ? `\`${reassignment.identifier.name.value}\``
        : 'variable';
    fn.env.recordError(
      CompilerDiagnostic.create({
        category: ErrorCategory.Immutability,
        reason: 'Cannot reassign variable after render completes',
        description: `Reassigning ${variable} after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead`,
      }).withDetails({
        kind: 'error',
        loc: reassignment.loc,
        message: `Cannot reassign ${variable} after render completes`,
      }),
    );
  }
}

function getContextReassignment(
  fn: HIRFunction,
  contextVariables: Set<IdentifierId>,
  isFunctionExpression: boolean,
  isAsync: boolean,
  env: Environment,
): Place | null {
  const reassigningFunctions = new Map<IdentifierId, Place>();
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'FunctionExpression':
        case 'ObjectMethod': {
          let reassignment = getContextReassignment(
            value.loweredFunc.func,
            contextVariables,
            true,
            isAsync || value.loweredFunc.func.async,
            env,
          );
          if (reassignment === null) {
            // If the function itself doesn't reassign, does one of its dependencies?
            for (const operand of eachInstructionValueOperand(value)) {
              const reassignmentFromOperand = reassigningFunctions.get(
                operand.identifier.id,
              );
              if (reassignmentFromOperand !== undefined) {
                reassignment = reassignmentFromOperand;
                break;
              }
            }
          }
          // if the function or its depends reassign, propagate that fact on the lvalue
          if (reassignment !== null) {
            if (isAsync || value.loweredFunc.func.async) {
              const variable =
                reassignment.identifier.name !== null &&
                reassignment.identifier.name.kind === 'named'
                  ? `\`${reassignment.identifier.name.value}\``
                  : 'variable';
              env.recordError(
                CompilerDiagnostic.create({
                  category: ErrorCategory.Immutability,
                  reason: 'Cannot reassign variable in async function',
                  description:
                    'Reassigning a variable in an async function can cause inconsistent behavior on subsequent renders. Consider using state instead',
                }).withDetails({
                  kind: 'error',
                  loc: reassignment.loc,
                  message: `Cannot reassign ${variable}`,
                }),
              );
              return null;
            }
            reassigningFunctions.set(lvalue.identifier.id, reassignment);
          }
          break;
        }
        case 'StoreLocal': {
          const reassignment = reassigningFunctions.get(
            value.value.identifier.id,
          );
          if (reassignment !== undefined) {
            reassigningFunctions.set(
              value.lvalue.place.identifier.id,
              reassignment,
            );
            reassigningFunctions.set(lvalue.identifier.id, reassignment);
          }
          break;
        }
        case 'LoadLocal': {
          const reassignment = reassigningFunctions.get(
            value.place.identifier.id,
          );
          if (reassignment !== undefined) {
            reassigningFunctions.set(lvalue.identifier.id, reassignment);
          }
          break;
        }
        case 'DeclareContext': {
          if (!isFunctionExpression) {
            contextVariables.add(value.lvalue.place.identifier.id);
          }
          break;
        }
        case 'StoreContext': {
          if (isFunctionExpression) {
            if (contextVariables.has(value.lvalue.place.identifier.id)) {
              return value.lvalue.place;
            }
          } else {
            /*
             * We only track reassignments of variables defined in the outer
             * component or hook.
             */
            contextVariables.add(value.lvalue.place.identifier.id);
          }
          const reassignment = reassigningFunctions.get(
            value.value.identifier.id,
          );
          if (reassignment !== undefined) {
            reassigningFunctions.set(
              value.lvalue.place.identifier.id,
              reassignment,
            );
            reassigningFunctions.set(lvalue.identifier.id, reassignment);
          }
          break;
        }
        default: {
          let operands = eachInstructionValueOperand(value);
          // If we're calling a function that doesn't let its arguments escape, only test the callee
          if (value.kind === 'CallExpression') {
            const signature = getFunctionCallSignature(
              fn.env,
              value.callee.identifier.type,
            );
            if (signature?.noAlias) {
              operands = [value.callee];
            }
          } else if (value.kind === 'MethodCall') {
            const signature = getFunctionCallSignature(
              fn.env,
              value.property.identifier.type,
            );
            if (signature?.noAlias) {
              operands = [value.receiver, value.property];
            }
          } else if (value.kind === 'TaggedTemplateExpression') {
            const signature = getFunctionCallSignature(
              fn.env,
              value.tag.identifier.type,
            );
            if (signature?.noAlias) {
              operands = [value.tag];
            }
          }
          for (const operand of operands) {
            CompilerError.invariant(operand.effect !== Effect.Unknown, {
              reason: `Expected effects to be inferred prior to ValidateLocalsNotReassignedAfterRender`,
              loc: operand.loc,
            });
            const reassignment = reassigningFunctions.get(
              operand.identifier.id,
            );
            if (reassignment !== undefined) {
              /*
               * Functions that reassign local variables are inherently mutable and are unsafe to pass
               * to a place that expects a frozen value. Propagate the reassignment upward.
               */
              if (operand.effect === Effect.Freeze) {
                return reassignment;
              } else {
                /*
                 * If the operand is not frozen but it does reassign, then the lvalues
                 * of the instruction could also be reassigning
                 */
                for (const lval of eachInstructionLValue(instr)) {
                  reassigningFunctions.set(lval.identifier.id, reassignment);
                }
              }
            }
          }
          break;
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      const reassignment = reassigningFunctions.get(operand.identifier.id);
      if (reassignment !== undefined) {
        return reassignment;
      }
    }
  }
  return null;
}
