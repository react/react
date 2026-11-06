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
  /**
   * Maps each object literal to the identifiers of its statically-known property
   * values, so that reads like `handlers.onClick` can be traced back to the
   * function assigned to that property.
   */
  const objectProperties: Map<
    IdentifierId,
    Map<string, IdentifierId>
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

  /**
   * Records whether `loweredFunc` is a function with known mutations, associating
   * that fact with `lvalue`. Handles both function expressions and object methods,
   * which are otherwise the same for the purposes of this check.
   */
  function recordKnownMutability(
    lvalue: Place,
    loweredFunc: HIRFunction,
  ): void {
    if (loweredFunc.aliasingEffects == null) {
      return;
    }
    const context = new Set(loweredFunc.context.map(p => p.identifier.id));
    effects: for (const effect of loweredFunc.aliasingEffects) {
      switch (effect.kind) {
        case 'Mutate':
        case 'MutateTransitive': {
          const knownMutation = contextMutationEffects.get(
            effect.value.identifier.id,
          );
          if (knownMutation != null) {
            contextMutationEffects.set(lvalue.identifier.id, knownMutation);
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
            contextMutationEffects.set(lvalue.identifier.id, knownMutation);
          }
          break;
        }
      }
    }
  }

  /**
   * Copies the known-mutability of `from` to `into` for values which alias each
   * other without an intervening instruction, ie through locals and properties.
   */
  function propagateAlias(from: IdentifierId, into: IdentifierId): void {
    const effect = contextMutationEffects.get(from);
    if (effect != null) {
      contextMutationEffects.set(into, effect);
    }
    const properties = objectProperties.get(from);
    if (properties != null) {
      objectProperties.set(into, properties);
    }
  }

  /**
   * Returns the identifier of the value stored in a statically-known property of
   * an object literal, if the object is known to be such a literal.
   */
  function getObjectPropertyValue(
    object: IdentifierId,
    property: string,
  ): IdentifierId | null {
    const properties = objectProperties.get(object);
    if (properties == null) {
      return null;
    }
    return properties.get(property) ?? null;
  }

  for (const block of fn.body.blocks.values()) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      switch (value.kind) {
        case 'LoadLocal': {
          propagateAlias(value.place.identifier.id, lvalue.identifier.id);
          break;
        }
        case 'StoreLocal': {
          propagateAlias(value.value.identifier.id, lvalue.identifier.id);
          propagateAlias(
            value.value.identifier.id,
            value.lvalue.place.identifier.id,
          );
          break;
        }
        case 'FunctionExpression':
        case 'ObjectMethod': {
          recordKnownMutability(lvalue, value.loweredFunc.func);
          break;
        }
        case 'ObjectExpression': {
          const properties: Map<string, IdentifierId> = new Map();
          for (const property of value.properties) {
            if (
              property.kind === 'ObjectProperty' &&
              property.key.kind !== 'computed'
            ) {
              properties.set(
                String(property.key.name),
                property.place.identifier.id,
              );
            }
          }
          objectProperties.set(lvalue.identifier.id, properties);
          for (const operand of eachInstructionValueOperand(value)) {
            visitOperand(operand);
          }
          break;
        }
        case 'PropertyLoad': {
          const propertyValue = getObjectPropertyValue(
            value.object.identifier.id,
            String(value.property),
          );
          if (propertyValue != null) {
            propagateAlias(propertyValue, lvalue.identifier.id);
          }
          for (const operand of eachInstructionValueOperand(value)) {
            visitOperand(operand);
          }
          break;
        }
        case 'Destructure': {
          /**
           * `const {onClick} = handlers` aliases the function stored in the
           * `onClick` property of `handlers`.
           */
          if (value.lvalue.pattern.kind === 'ObjectPattern') {
            for (const property of value.lvalue.pattern.properties) {
              if (
                property.kind === 'ObjectProperty' &&
                property.key.kind !== 'computed'
              ) {
                const propertyValue = getObjectPropertyValue(
                  value.value.identifier.id,
                  String(property.key.name),
                );
                if (propertyValue != null) {
                  propagateAlias(propertyValue, property.place.identifier.id);
                }
              }
            }
          }
          for (const operand of eachInstructionValueOperand(value)) {
            visitOperand(operand);
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
