/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  convertHoistedLValueKind,
  IdentifierId,
  InstructionId,
  InstructionKind,
  Place,
  ReactiveFunction,
  ReactiveInstruction,
  ReactiveScopeBlock,
  ReactiveStatement,
} from '../HIR';
import {empty, Stack} from '../Utils/Stack';
import {
  ReactiveFunctionTransform,
  Transformed,
  visitReactiveFunction,
} from './visitors';

/*
 * Prunes DeclareContexts lowered for HoistedConsts, and transforms any references back to its
 * original instruction kind.
 *
 * Also detects and bails out on context variables which are:
 * - function declarations, which are hoisted by JS engines to the nearest block scope
 * - referenced before they are defined (i.e. having a `DeclareContext HoistedConst`)
 * - declared
 *
 * This is because React Compiler converts a `function foo()` function declaration to
 * 1. a `let foo;` declaration before reactive memo blocks
 * 2. a `foo = function foo() {}` assignment within the block
 *
 * This means references before the assignment are invalid (see fixture
 * error.todo-functiondecl-hoisting)
 */
export function pruneHoistedContexts(fn: ReactiveFunction): void {
  visitReactiveFunction(fn, new Visitor(), {
    activeScopes: empty(),
    uninitialized: new Map(),
  });
}

type VisitorState = {
  activeScopes: Stack<Set<IdentifierId>>;
  uninitialized: Map<
    IdentifierId,
    | {
        kind: 'unknown-kind';
      }
    | {
        kind: 'func';
        definition: Place | null;
      }
  >;
};

class Visitor extends ReactiveFunctionTransform<VisitorState> {
  override visitScope(scope: ReactiveScopeBlock, state: VisitorState): void {
    state.activeScopes = state.activeScopes.push(
      new Set(scope.scope.declarations.keys()),
    );
    /**
     * Add declared but not initialized / assigned variables. This may include
     * function declarations that escape the memo block.
     */
    for (const decl of scope.scope.declarations.values()) {
      state.uninitialized.set(decl.identifier.id, {kind: 'unknown-kind'});
    }
    this.traverseScope(scope, state);
    state.activeScopes.pop();
    for (const decl of scope.scope.declarations.values()) {
      state.uninitialized.delete(decl.identifier.id);
    }
  }
  override visitPlace(
    _id: InstructionId,
    place: Place,
    state: VisitorState,
  ): void {
    const maybeHoistedFn = state.uninitialized.get(place.identifier.id);
    if (
      maybeHoistedFn?.kind === 'func' &&
      maybeHoistedFn.definition !== place
    ) {
      CompilerError.throwTodo({
        reason: '[PruneHoistedContexts] Rewrite hoisted function references',
        loc: place.loc,
      });
    }
  }
  override transformInstruction(
    instruction: ReactiveInstruction,
    state: VisitorState,
  ): Transformed<ReactiveStatement> {
    /**
     * Remove hoisted declarations to preserve TDZ
     */
    if (instruction.value.kind === 'DeclareContext') {
      const maybeNonHoisted = convertHoistedLValueKind(
        instruction.value.lvalue.kind,
      );
      if (maybeNonHoisted != null) {
        if (
          maybeNonHoisted === InstructionKind.Function &&
          state.uninitialized.has(instruction.value.lvalue.place.identifier.id)
        ) {
          state.uninitialized.set(
            instruction.value.lvalue.place.identifier.id,
            {
              kind: 'func',
              definition: null,
            },
          );
        }
        return {kind: 'remove'};
      }
    }
    if (
      instruction.value.kind === 'StoreContext' &&
      instruction.value.lvalue.kind !== InstructionKind.Reassign
    ) {
      /**
       * Rewrite StoreContexts let/const that will be pre-declared in
       * codegen to reassignments.
       */
      const lvalueId = instruction.value.lvalue.place.identifier.id;
      const isDeclaredByScope = state.activeScopes.find(scope =>
        scope.has(lvalueId),
      );
      if (isDeclaredByScope) {
        if (
          instruction.value.lvalue.kind === InstructionKind.Let ||
          instruction.value.lvalue.kind === InstructionKind.Const
        ) {
          instruction.value.lvalue.kind = InstructionKind.Reassign;
        } else if (instruction.value.lvalue.kind === InstructionKind.Function) {
          const maybeHoistedFn = state.uninitialized.get(lvalueId);
          if (maybeHoistedFn != null) {
            CompilerError.invariant(maybeHoistedFn.kind === 'func', {
              reason: '[PruneHoistedContexts] Unexpected hoisted function',
              loc: instruction.loc,
            });
            maybeHoistedFn.definition = instruction.value.lvalue.place;
            /**
             * References to hoisted functions are now "safe" as variable assignments
             * have finished.
             */
            state.uninitialized.delete(lvalueId);
          }
        } else {
          CompilerError.throwTodo({
            reason: '[PruneHoistedContexts] Unexpected kind',
            description: `(${instruction.value.lvalue.kind})`,
            loc: instruction.loc,
          });
        }
      }
    }

    this.visitInstruction(instruction, state);
    return {kind: 'keep'};
  }
}
