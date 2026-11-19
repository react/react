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
  isStableType,
  isUseRefType,
  Identifier,
} from '../HIR/HIR';
import {eachPatternOperand} from '../HIR/visitors';
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

    /*
     * Stable values destructured in the scope, such as the setter of
     * `const [state, setState] = useState()`, keep their identity even though
     * the scope is not memoized. The type alone is not enough: a value such as
     * `cond ? setState : fn` has the setter's type too.
     */
    const stableDestructures = new Set<IdentifierId>();
    for (const stmt of scopeBlock.instructions) {
      if (
        stmt.kind === 'instruction' &&
        stmt.instruction.value.kind === 'Destructure'
      ) {
        for (const place of eachPatternOperand(
          stmt.instruction.value.lvalue.pattern,
        )) {
          if (isStableType(place.identifier)) {
            stableDestructures.add(place.identifier.id);
          }
        }
      }
    }

    for (const [id, decl] of scopeBlock.scope.declarations) {
      if (
        !isPrimitiveType(decl.identifier) &&
        !isStableRefType(decl.identifier, state) &&
        !stableDestructures.has(id)
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
