/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerDiagnostic, Effect} from '..';
import {ErrorCategory} from '../CompilerError';
import {
  HIRFunction,
  IdentifierId,
  isRefOrRefLikeMutableType,
  Place,
} from '../HIR';
import {
  eachInstructionValueOperand,
  eachTerminalOperand,
} from '../HIR/visitors';
import {AliasingEffect} from '../Inference/AliasingEffects';

/**
 * Validates that functions with known mutations (ie due to types) cannot be passed
 * where a frozen value is expected. Example:
 *
 * ```
 * function Component() {
 *   const cache = new Map();
 *   const onClick = () => {
 *     cache.set(...);
 *   }
 *   useHook(onClick); // ERROR: cannot pass a mutable value
 *   return <Foo onClick={onClick} /> // ERROR: cannot pass a mutable value
 * }
 * ```
 *
 * Because `onClick` function mutates `cache` when called, `onClick` is equivalent to a mutable
 * variables. But unlike other mutables values like an array, the receiver of the function has
 * no way to avoid mutation — for example, a function can receive an array and choose not to mutate
 * it, but there's no way to know that a function is mutable and avoid calling it.
 *
 * This pass detects functions with *known* mutations (Store or Mutate, not ConditionallyMutate)
 * that are passed where a frozen value is expected and rejects them.
 */
export function validateNoFreezingKnownMutableFunctions(fn: HIRFunction): void {
  const contextMutationEffects: Map<
    IdentifierId,
    Extract<AliasingEffect, {kind: 'Mutate'} | {kind: 'MutateTransitive'}>
  > = new Map();

  function visitOperand(operand: Place): void {
    if (operand.effect === Effect.Freeze) {
      const effect = contextMutationEffects.get(operand.identifier.id);
      if (effect != null) {
        const place = effect.value;
        const variable =
          place != null &&
          place.identifier.name != null &&
          place.identifier.name.kind === 'named'
            ? `\`${place.identifier.name.value}\``
            : 'a local variable';
        fn.env.recordError(
          CompilerDiagnostic.create({
            category: ErrorCategory.Immutability,
            reason: 'Cannot modify local variables after render completes',
            description: `This argument is a function which may reassign or mutate ${variable} after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead`,
          })
            .withDetails({
              kind: 'error',
              loc: operand.loc,
              message: `This function may (indirectly) reassign or modify ${variable} after render`,
            })
            .withDetails({
              kind: 'error',
              loc: effect.value.loc,
              message: `This modifies ${variable}`,
            }),
        );
      }
    }
  }

  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'LoadLocal': {
          const effect = contextMutationEffects.get(value.place.identifier.id);
          if (effect != null) {
            contextMutationEffects.set(lvalue.identifier.id, effect);
          }
          break;
        }
        case 'StoreLocal': {
          const effect = contextMutationEffects.get(value.value.identifier.id);
          if (effect != null) {
            contextMutationEffects.set(lvalue.identifier.id, effect);
            contextMutationEffects.set(
              value.lvalue.place.identifier.id,
              effect,
            );
          }
          break;
        }
        case 'FunctionExpression': {
          if (value.loweredFunc.func.aliasingEffects != null) {
            const context = new Set(
              value.loweredFunc.func.context.map(p => p.identifier.id),
            );
            effects: for (const effect of value.loweredFunc.func
              .aliasingEffects) {
              switch (effect.kind) {
                case 'Mutate':
                case 'MutateTransitive': {
                  const knownMutation = contextMutationEffects.get(
                    effect.value.identifier.id,
                  );
                  if (knownMutation != null) {
                    contextMutationEffects.set(
                      lvalue.identifier.id,
                      knownMutation,
                    );
                  } else if (
                    context.has(effect.value.identifier.id) &&
                    !isRefOrRefLikeMutableType(effect.value.identifier.type)
                  ) {
                    contextMutationEffects.set(lvalue.identifier.id, effect);
                    break effects;
                  }
                  break;
                }
                case 'MutateConditionally':
                case 'MutateTransitiveConditionally': {
                  const knownMutation = contextMutationEffects.get(
                    effect.value.identifier.id,
                  );
                  if (knownMutation != null) {
                    contextMutationEffects.set(
                      lvalue.identifier.id,
                      knownMutation,
                    );
                  }
                  break;
                }
              }
            }
          }
          break;
        }
        default: {
          for (const operand of eachInstructionValueOperand(value)) {
            visitOperand(operand);
          }
        }
      }
    }
    for (const operand of eachTerminalOperand(block.terminal)) {
      visitOperand(operand);
    }
  }
}
