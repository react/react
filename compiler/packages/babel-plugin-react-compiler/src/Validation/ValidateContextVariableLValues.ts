/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic, CompilerError} from '..';
import {ErrorCategory} from '../CompilerError';
import {Environment} from '../HIR/Environment';
import {HIRFunction, IdentifierId, Place} from '../HIR';
import {printPlace} from '../HIR/PrintHIR';
import {eachInstructionValueLValue, eachPatternOperand} from '../HIR/visitors';

/**
 * Validates that all store/load references to a given named identifier align with the
 * "kind" of that variable (normal variable or context variable). For example, a context
 * variable may not be loaded/stored with regular StoreLocal/LoadLocal/Destructure instructions.
 */
export function validateContextVariableLValues(fn: HIRFunction): void {
  const identifierKinds: IdentifierKinds = new Map();
  validateContextVariableLValuesImpl(fn, identifierKinds, fn.env);
}

function validateContextVariableLValuesImpl(
  fn: HIRFunction,
  identifierKinds: IdentifierKinds,
  env: Environment,
): void {
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {value} = instr;
      switch (value.kind) {
        case 'DeclareContext':
        case 'StoreContext': {
          visit(identifierKinds, value.lvalue.place, 'context', env);
          break;
        }
        case 'LoadContext': {
          visit(identifierKinds, value.place, 'context', env);
          break;
        }
        case 'StoreLocal':
        case 'DeclareLocal': {
          visit(identifierKinds, value.lvalue.place, 'local', env);
          break;
        }
        case 'LoadLocal': {
          visit(identifierKinds, value.place, 'local', env);
          break;
        }
        case 'PostfixUpdate':
        case 'PrefixUpdate': {
          visit(identifierKinds, value.lvalue, 'local', env);
          break;
        }
        case 'Destructure': {
          for (const lvalue of eachPatternOperand(value.lvalue.pattern)) {
            visit(identifierKinds, lvalue, 'destructure', env);
          }
          break;
        }
        case 'ObjectMethod':
        case 'FunctionExpression': {
          validateContextVariableLValuesImpl(
            value.loweredFunc.func,
            identifierKinds,
            env,
          );
          break;
        }
        default: {
          for (const _ of eachInstructionValueLValue(value)) {
            fn.env.recordError(
              CompilerDiagnostic.create({
                category: ErrorCategory.Todo,
                reason:
                  'ValidateContextVariableLValues: unhandled instruction variant',
                description: `Handle '${value.kind} lvalues`,
              }).withDetails({
                kind: 'error',
                loc: value.loc,
                message: null,
              }),
            );
          }
        }
      }
    }
  }
}

type IdentifierKinds = Map<
  IdentifierId,
  {place: Place; kind: 'local' | 'context' | 'destructure'}
>;

function visit(
  identifiers: IdentifierKinds,
  place: Place,
  kind: 'local' | 'context' | 'destructure',
  env: Environment,
): void {
  const prev = identifiers.get(place.identifier.id);
  if (prev !== undefined) {
    const wasContext = prev.kind === 'context';
    const isContext = kind === 'context';
    if (wasContext !== isContext) {
      if (prev.kind === 'destructure' || kind === 'destructure') {
        env.recordError(
          CompilerDiagnostic.create({
            category: ErrorCategory.Todo,
            reason: `Support destructuring of context variables`,
            description: null,
          }).withDetails({
            kind: 'error',
            loc: kind === 'destructure' ? place.loc : prev.place.loc,
            message: null,
          }),
        );
        return;
      }

      CompilerError.invariant(false, {
        reason:
          'Expected all references to a variable to be consistently local or context references',
        description: `Identifier ${printPlace(place)} is referenced as a ${kind} variable, but was previously referenced as a ${prev.kind} variable`,
        message: `this is ${prev.kind}`,
        loc: place.loc,
      });
    }
  }
  identifiers.set(place.identifier.id, {place, kind});
}
