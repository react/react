/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '../CompilerError';
import {GeneratedSource} from '../HIR';
import {
  DeclarationId,
  Identifier,
  InstructionId,
  Place,
  PrunedReactiveScopeBlock,
  ReactiveFunction,
  ReactiveScope,
  ReactiveInstruction,
  ReactiveScopeBlock,
  ReactiveValue,
  ScopeId,
  SpreadPattern,
  promoteTemporary,
  promoteTemporaryJsxTag,
  IdentifierId,
} from '../HIR/HIR';
import {ReactiveFunctionVisitor, visitReactiveFunction} from './visitors';
import {eachInstructionValueLValue, eachPatternOperand} from '../HIR/visitors';

/**
 * Phase 2: Promote identifiers which are used in a place that requires a named variable.
 */
class PromoteTemporaries extends ReactiveFunctionVisitor<State> {
  override visitScope(scopeBlock: ReactiveScopeBlock, state: State): void {
    for (const dep of scopeBlock.scope.dependencies) {
      const {identifier} = dep;
      if (identifier.name == null) {
        promoteIdentifier(identifier, state);
      }
    }
    /*
     * This is technically optional. We could prune ReactiveScopes
     * whose outputs are not used in another computation or return
     * value.
     * Many of our current test fixtures do not return a value, so
     * it is better for now to promote (and memoize) every output.
     */
    for (const [, declaration] of scopeBlock.scope.declarations) {
      if (declaration.identifier.name == null) {
        promoteIdentifier(declaration.identifier, state);
      }
    }
    this.traverseScope(scopeBlock, state);
  }

  override visitPrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: State,
  ): void {
    for (const [, declaration] of scopeBlock.scope.declarations) {
      if (
        declaration.identifier.name == null &&
        state.pruned.get(declaration.identifier.declarationId)
          ?.usedOutsideScope === true
      ) {
        promoteIdentifier(declaration.identifier, state);
      }
    }
    this.traversePrunedScope(scopeBlock, state);
  }

  override visitParam(place: Place, state: State): void {
    if (place.identifier.name === null) {
      promoteIdentifier(place.identifier, state);
    }
  }

  override visitValue(
    id: InstructionId,
    value: ReactiveValue,
    state: State,
  ): void {
    this.traverseValue(id, value, state);
    if (value.kind === 'FunctionExpression' || value.kind === 'ObjectMethod') {
      this.visitHirFunction(value.loweredFunc.func, state);
    }
  }

  override visitReactiveFunctionValue(
    _id: InstructionId,
    _dependencies: Array<Place>,
    fn: ReactiveFunction,
    state: State,
  ): void {
    for (const operand of fn.params) {
      const place = operand.kind === 'Identifier' ? operand : operand.place;
      if (place.identifier.name === null) {
        promoteIdentifier(place.identifier, state);
      }
    }
    visitReactiveFunction(fn, this, state);
  }
}

/**
 * Phase 3: Now that identifiers which need promotion are promoted, find and promote
 * all other Identifier instances of each promoted DeclarationId.
 */
class PromoteAllInstancedOfPromotedTemporaries extends ReactiveFunctionVisitor<State> {
  override visitPlace(_id: InstructionId, place: Place, state: State): void {
    if (
      place.identifier.name === null &&
      state.promoted.has(place.identifier.declarationId)
    ) {
      promoteIdentifier(place.identifier, state);
    }
  }
  override visitLValue(
    _id: InstructionId,
    _lvalue: Place,
    _state: State,
  ): void {
    this.visitPlace(_id, _lvalue, _state);
  }
  traverseScopeIdentifiers(scope: ReactiveScope, state: State): void {
    for (const [, decl] of scope.declarations) {
      if (
        decl.identifier.name === null &&
        state.promoted.has(decl.identifier.declarationId)
      ) {
        promoteIdentifier(decl.identifier, state);
      }
    }
    for (const dep of scope.dependencies) {
      if (
        dep.identifier.name === null &&
        state.promoted.has(dep.identifier.declarationId)
      ) {
        promoteIdentifier(dep.identifier, state);
      }
    }
    for (const reassignment of scope.reassignments) {
      if (
        reassignment.name === null &&
        state.promoted.has(reassignment.declarationId)
      ) {
        promoteIdentifier(reassignment, state);
      }
    }
  }
  override visitScope(scope: ReactiveScopeBlock, state: State): void {
    this.traverseScope(scope, state);
    this.traverseScopeIdentifiers(scope.scope, state);
  }
  override visitPrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: State,
  ): void {
    this.traversePrunedScope(scopeBlock, state);
    this.traverseScopeIdentifiers(scopeBlock.scope, state);
  }
  override visitReactiveFunctionValue(
    _id: InstructionId,
    _dependencies: Array<Place>,
    fn: ReactiveFunction,
    state: State,
  ): void {
    visitReactiveFunction(fn, this, state);
  }
}

type JsxExpressionTags = Set<DeclarationId>;
type State = {
  tags: JsxExpressionTags;
  promoted: Set<DeclarationId>;
  pruned: Map<
    DeclarationId,
    {activeScopes: Array<ScopeId>; usedOutsideScope: boolean}
  >; // true if referenced within another scope, false if only accessed outside of scopes
};

/**
 * Phase 1: checks for pruned variables which need to be promoted, as well as
 * usage of identifiers as jsx tags, which need to be promoted differently
 */
class CollectPromotableTemporaries extends ReactiveFunctionVisitor<State> {
  activeScopes: Array<ScopeId> = [];

  override visitPlace(_id: InstructionId, place: Place, state: State): void {
    if (
      this.activeScopes.length !== 0 &&
      state.pruned.has(place.identifier.declarationId)
    ) {
      const prunedPlace = state.pruned.get(place.identifier.declarationId)!;
      if (prunedPlace.activeScopes.indexOf(this.activeScopes.at(-1)!) === -1) {
        prunedPlace.usedOutsideScope = true;
      }
    }
  }

  override visitValue(
    id: InstructionId,
    value: ReactiveValue,
    state: State,
  ): void {
    this.traverseValue(id, value, state);
    if (value.kind === 'JsxExpression' && value.tag.kind === 'Identifier') {
      state.tags.add(value.tag.identifier.declarationId);
    }
  }

  override visitPrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: State,
  ): void {
    for (const [_id, decl] of scopeBlock.scope.declarations) {
      state.pruned.set(decl.identifier.declarationId, {
        activeScopes: [...this.activeScopes],
        usedOutsideScope: false,
      });
    }
    this.visitBlock(scopeBlock.instructions, state);
  }

  override visitScope(scopeBlock: ReactiveScopeBlock, state: State): void {
    this.activeScopes.push(scopeBlock.scope.id);
    this.traverseScope(scopeBlock, state);
    this.activeScopes.pop();
  }
}

type InterState = Map<IdentifierId, [Identifier, boolean]>;
class PromoteInterposedTemporaries extends ReactiveFunctionVisitor<InterState> {
  #promotable: State;
  #consts: Set<IdentifierId> = new Set();
  #globals: Set<IdentifierId> = new Set();

  /*
   * Unpromoted temporaries will be emitted at their use sites rather than as separate
   * declarations. However, this causes errors if an interposing temporary has been
   * promoted, or if an interposing instruction has had its lvalues deleted, because such
   * temporaries will be emitted as separate statements, which can effectively cause
   * code to be reordered, and when that code has side effects that changes program behavior.
   * This visitor promotes temporarties that have such interposing instructions to preserve
   * source ordering.
   */
  constructor(promotable: State, params: Array<Place | SpreadPattern>) {
    super();
    params.forEach(param => {
      switch (param.kind) {
        case 'Identifier':
          this.#consts.add(param.identifier.id);
          break;
        case 'Spread':
          this.#consts.add(param.place.identifier.id);
          break;
      }
    });
    this.#promotable = promotable;
  }

  override visitPlace(
    _id: InstructionId,
    place: Place,
    state: InterState,
  ): void {
    const promo = state.get(place.identifier.id);
    if (promo) {
      const [identifier, needsPromotion] = promo;
      if (
        needsPromotion &&
        identifier.name === null &&
        !this.#consts.has(identifier.id)
      ) {
        /*
         * If the identifier hasn't been promoted but is marked as needing
         * promotion by the logic in `visitInstruction`, and we've seen a
         * use of it after said marking, promote it
         */
        promoteIdentifier(identifier, this.#promotable);
      }
    }
  }

  override visitInstruction(
    instruction: ReactiveInstruction,
    state: InterState,
  ): void {
    for (const lval of eachInstructionValueLValue(instruction.value)) {
      CompilerError.invariant(lval.identifier.name != null, {
        reason:
          'PromoteInterposedTemporaries: Assignment targets not expected to be temporaries',
        loc: instruction.loc,
      });
    }

    switch (instruction.value.kind) {
      case 'CallExpression':
      case 'MethodCall':
      case 'Await':
      case 'PropertyStore':
      case 'PropertyDelete':
      case 'ComputedStore':
      case 'ComputedDelete':
      case 'PostfixUpdate':
      case 'PrefixUpdate':
      case 'StoreLocal':
      case 'StoreContext':
      case 'StoreGlobal':
      case 'Destructure': {
        let constStore = false;

        if (
          (instruction.value.kind === 'StoreContext' ||
            instruction.value.kind === 'StoreLocal') &&
          (instruction.value.lvalue.kind === 'Const' ||
            instruction.value.lvalue.kind === 'HoistedConst')
        ) {
          /*
           * If an identifier is const, we don't need to worry about it
           * being mutated between being loaded and being used
           */
          this.#consts.add(instruction.value.lvalue.place.identifier.id);
          constStore = true;
        }
        if (
          instruction.value.kind === 'Destructure' &&
          (instruction.value.lvalue.kind === 'Const' ||
            instruction.value.lvalue.kind === 'HoistedConst')
        ) {
          [...eachPatternOperand(instruction.value.lvalue.pattern)].forEach(
            ident => this.#consts.add(ident.identifier.id),
          );
          constStore = true;
        }
        if (instruction.value.kind === 'MethodCall') {
          // Treat property of method call as constlike so we don't promote it.
          this.#consts.add(instruction.value.property.identifier.id);
        }

        super.visitInstruction(instruction, state);
        if (
          !constStore &&
          (instruction.lvalue == null ||
            instruction.lvalue.identifier.name != null)
        ) {
          /*
           * If we've stripped the lvalue or promoted the lvalue, then we will emit this instruction
           * as a statement in codegen.
           *
           * If this instruction will be emitted directly as a statement rather than as a temporary
           * during codegen, then it can interpose between the defs and the uses of other temporaries.
           * Since this instruction could potentially mutate those defs, it's not safe to relocate
           * the definition of those temporaries to after this instruction. Mark all those temporaries
           * as needing promotion, but don't promote them until we actually see them being used.
           */
          for (const [key, [ident, _]] of state.entries()) {
            state.set(key, [ident, true]);
          }
        }
        if (instruction.lvalue && instruction.lvalue.identifier.name === null) {
          // Add this instruction's lvalue to the state, initially not marked as needing promotion
          state.set(instruction.lvalue.identifier.id, [
            instruction.lvalue.identifier,
            false,
          ]);
        }
        break;
      }
      case 'DeclareContext':
      case 'DeclareLocal': {
        if (
          instruction.value.lvalue.kind === 'Const' ||
          instruction.value.lvalue.kind === 'HoistedConst'
        ) {
          this.#consts.add(instruction.value.lvalue.place.identifier.id);
        }
        super.visitInstruction(instruction, state);
        break;
      }
      case 'LoadContext':
      case 'LoadLocal': {
        if (instruction.lvalue && instruction.lvalue.identifier.name === null) {
          if (this.#consts.has(instruction.value.place.identifier.id)) {
            this.#consts.add(instruction.lvalue.identifier.id);
          }
          state.set(instruction.lvalue.identifier.id, [
            instruction.lvalue.identifier,
            false,
          ]);
        }
        super.visitInstruction(instruction, state);
        break;
      }
      case 'PropertyLoad':
      case 'ComputedLoad': {
        if (instruction.lvalue) {
          if (this.#globals.has(instruction.value.object.identifier.id)) {
            this.#globals.add(instruction.lvalue.identifier.id);
            this.#consts.add(instruction.lvalue.identifier.id);
          }
          if (instruction.lvalue.identifier.name === null) {
            state.set(instruction.lvalue.identifier.id, [
              instruction.lvalue.identifier,
              false,
            ]);
          }
        }
        super.visitInstruction(instruction, state);
        break;
      }
      case 'LoadGlobal': {
        instruction.lvalue &&
          this.#globals.add(instruction.lvalue.identifier.id);
        super.visitInstruction(instruction, state);
        break;
      }
      default: {
        super.visitInstruction(instruction, state);
      }
    }
  }
}

export function promoteUsedTemporaries(fn: ReactiveFunction): void {
  const state: State = {
    tags: new Set(),
    promoted: new Set(),
    pruned: new Map(),
  };
  visitReactiveFunction(fn, new CollectPromotableTemporaries(), state);
  for (const operand of fn.params) {
    const place = operand.kind === 'Identifier' ? operand : operand.place;
    if (place.identifier.name === null) {
      promoteIdentifier(place.identifier, state);
    }
  }
  visitReactiveFunction(fn, new PromoteTemporaries(), state);

  visitReactiveFunction(
    fn,
    new PromoteInterposedTemporaries(state, fn.params),
    new Map(),
  );
  visitReactiveFunction(
    fn,
    new PromoteAllInstancedOfPromotedTemporaries(),
    state,
  );
}

function promoteIdentifier(identifier: Identifier, state: State): void {
  CompilerError.invariant(identifier.name === null, {
    reason:
      'promoteTemporary: Expected to be called only for temporary variables',
    loc: GeneratedSource,
  });
  if (state.tags.has(identifier.declarationId)) {
    promoteTemporaryJsxTag(identifier);
  } else {
    promoteTemporary(identifier);
  }
  state.promoted.add(identifier.declarationId);
}
