/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  IdentifierId,
  InstructionId,
  Place,
  PrunedReactiveScopeBlock,
  ReactiveFunction,
  isPrimitiveType,
  isUseRefType,
  Identifier,
} from '../HIR/HIR';
import {ReactiveFunctionVisitor, visitReactiveFunction} from './visitors';

class Visitor extends ReactiveFunctionVisitor<Set<IdentifierId>> {
  /*
   * Visitors don't visit lvalues as places by default, but we want to visit all places to
   * check for reactivity
   */
  override visitLValue(
    id: InstructionId,
    lvalue: Place,
    state: Set<IdentifierId>,
  ): void {
    this.visitPlace(id, lvalue, state);
  }

  /*
   * This visitor only infers data dependencies and does not account for control dependencies
   * where a variable may be assigned a different value based on some conditional, eg via two
   * different paths of an if statement.
   */
  override visitPlace(
    _id: InstructionId,
    place: Place,
    state: Set<IdentifierId>,
  ): void {
    if (place.reactive) {
      state.add(place.identifier.id);
    }
  }

  override visitPrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: Set<IdentifierId>,
  ): void {
    this.traversePrunedScope(scopeBlock, state);

    for (const [id, decl] of scopeBlock.scope.declarations) {
      if (
        !isPrimitiveType(decl.identifier) &&
        !isStableRefType(decl.identifier, state)
      ) {
        state.add(id);
      }
    }
  }
}
function isStableRefType(
  identifier: Identifier,
  reactiveIdentifiers: Set<IdentifierId>,
): boolean {
  return isUseRefType(identifier) && !reactiveIdentifiers.has(identifier.id);
}
/*
 * Computes a set of identifiers which are reactive, using the analysis previously performed
 * in `InferReactivePlaces`.
 */
export function collectReactiveIdentifiers(
  fn: ReactiveFunction,
): Set<IdentifierId> {
  const visitor = new Visitor();
  const state = new Set<IdentifierId>();
  visitReactiveFunction(fn, visitor, state);

  return state;
}
