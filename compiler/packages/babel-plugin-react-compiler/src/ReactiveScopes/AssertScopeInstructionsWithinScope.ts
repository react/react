/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {visitReactiveFunction} from '.';
import {CompilerError} from '..';
import {
  InstructionId,
  Place,
  ReactiveFunction,
  ReactiveScopeBlock,
  ScopeId,
} from '../HIR';
import {getPlaceScope} from '../HIR/HIR';
import {ReactiveFunctionVisitor} from './visitors';

/*
 * Internal validation pass that checks all the instructions involved in creating
 * values for a given scope are within the corresponding ReactiveScopeBlock. Errors
 * in HIR/ReactiveFunction structure and alias analysis could theoretically create
 * a structure such as:
 *
 * Function
 *    LabelTerminal
 *     Instruction in scope 0
 *    Instruction in scope 0
 *
 * Because ReactiveScopeBlocks are closed when their surrounding block ends, this
 * structure would create reactive scopes as follows:
 *
 * Function
 *    LabelTerminal
 *      ReactiveScopeBlock scope=0
 *        Instruction in scope 0
 *    Instruction in scope 0
 *
 * This pass asserts we didn't accidentally end up with such a structure, as a guard
 * against compiler coding mistakes in earlier passes.
 */
export function assertScopeInstructionsWithinScopes(
  fn: ReactiveFunction,
): void {
  const existingScopes = new Set<ScopeId>();
  visitReactiveFunction(fn, new FindAllScopesVisitor(), existingScopes);
  visitReactiveFunction(
    fn,
    new CheckInstructionsAgainstScopesVisitor(),
    existingScopes,
  );
}

class FindAllScopesVisitor extends ReactiveFunctionVisitor<Set<ScopeId>> {
  override visitScope(block: ReactiveScopeBlock, state: Set<ScopeId>): void {
    this.traverseScope(block, state);
    state.add(block.scope.id);
  }
}

class CheckInstructionsAgainstScopesVisitor extends ReactiveFunctionVisitor<
  Set<ScopeId>
> {
  activeScopes: Set<ScopeId> = new Set();

  override visitPlace(
    id: InstructionId,
    place: Place,
    state: Set<ScopeId>,
  ): void {
    const scope = getPlaceScope(id, place);
    if (
      scope !== null &&
      // is there a scope for this at all, or did we end up pruning this scope?
      state.has(scope.id) &&
      /*
       * if the scope exists somewhere, it must be active or else this is a straggler
       * instruction
       */
      !this.activeScopes.has(scope.id)
    ) {
      CompilerError.invariant(false, {
        reason:
          'Encountered an instruction that should be part of a scope, but where that scope has already completed',
        description: `Instruction [${id}] is part of scope @${scope.id}, but that scope has already completed`,
        loc: place.loc,
      });
    }
  }

  override visitScope(block: ReactiveScopeBlock, state: Set<ScopeId>): void {
    this.activeScopes.add(block.scope.id);
    this.traverseScope(block, state);
    this.activeScopes.delete(block.scope.id);
  }
}
