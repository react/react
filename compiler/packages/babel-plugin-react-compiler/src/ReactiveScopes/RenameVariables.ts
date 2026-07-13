/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ProgramContext} from '..';
import {CompilerError} from '../CompilerError';
import {
  DeclarationId,
  GeneratedSource,
  Identifier,
  IdentifierName,
  InstructionId,
  Place,
  PrunedReactiveScopeBlock,
  ReactiveBlock,
  ReactiveFunction,
  ReactiveScopeBlock,
  ReactiveValue,
  ValidIdentifierName,
  isPromotedJsxTemporary,
  isPromotedTemporary,
  makeIdentifierName,
} from '../HIR/HIR';
import {collectReferencedGlobals} from './CollectReferencedGlobals';
import {ReactiveFunctionVisitor, visitReactiveFunction} from './visitors';

/**
 * Ensures that each named variable in the given function has a unique name
 * that does not conflict with any other variables in the same block scope.
 * Note that the scoping is based on the final inferred blocks, not the
 * block scopes that were present in the original source. Thus variables
 * that shadowed in the original source may end up with unique names in the
 * output, if Forget would merge those two blocks into a single scope.
 *
 * Variables are renamed using their original name followed by a number,
 * starting with 0 and incrementing until a unique name is found. Eg if the
 * compiler collapses three scopes that each had their own `foo` declaration,
 * they will be renamed to `foo`, `foo0`, and `foo1`, assuming that no conflicts'
 * exist for `foo0` and `foo1`.
 *
 * For temporary values that are promoted to named variables, the starting name
 * is "T0" for values that appear in JSX tag position and "t0" otherwise. If this
 * name conflicts, the number portion increments until the name is unique (t1, t2, etc).
 *
 * Returns a Set of all the unique variable names in the function after renaming.
 */
export function renameVariables(fn: ReactiveFunction): Set<string> {
  const globals = collectReferencedGlobals(fn);
  const scopes = new Scopes(globals, fn.env.programContext);
  renameVariablesImpl(fn, new Visitor(), scopes);
  return new Set([...scopes.names, ...globals]);
}

function renameVariablesImpl(
  fn: ReactiveFunction,
  visitor: Visitor,
  scopes: Scopes,
): void {
  scopes.enter(() => {
    for (const param of fn.params) {
      if (param.kind === 'Identifier') {
        scopes.visit(param.identifier);
      } else {
        scopes.visit(param.place.identifier);
      }
    }
    visitReactiveFunction(fn, visitor, scopes);
  });
}

class Visitor extends ReactiveFunctionVisitor<Scopes> {
  override visitParam(place: Place, state: Scopes): void {
    state.visit(place.identifier);
  }
  override visitLValue(_id: InstructionId, lvalue: Place, state: Scopes): void {
    state.visit(lvalue.identifier);
  }
  override visitPlace(id: InstructionId, place: Place, state: Scopes): void {
    state.visit(place.identifier);
  }
  override visitBlock(block: ReactiveBlock, state: Scopes): void {
    state.enter(() => {
      this.traverseBlock(block, state);
    });
  }

  override visitPrunedScope(
    scopeBlock: PrunedReactiveScopeBlock,
    state: Scopes,
  ): void {
    this.traverseBlock(scopeBlock.instructions, state);
  }

  override visitScope(scope: ReactiveScopeBlock, state: Scopes): void {
    for (const [_, declaration] of scope.scope.declarations) {
      state.visit(declaration.identifier);
    }
    this.traverseScope(scope, state);
  }

  override visitValue(
    id: InstructionId,
    value: ReactiveValue,
    state: Scopes,
  ): void {
    this.traverseValue(id, value, state);
    if (value.kind === 'FunctionExpression' || value.kind === 'ObjectMethod') {
      this.visitHirFunction(value.loweredFunc.func, state);
    }
  }

  override visitReactiveFunctionValue(
    _id: InstructionId,
    _dependencies: Array<Place>,
    _fn: ReactiveFunction,
    _state: Scopes,
  ): void {
    renameVariablesImpl(_fn, this, _state);
  }
}

class Scopes {
  #seen: Map<DeclarationId, IdentifierName> = new Map();
  #stack: Array<Map<string, DeclarationId>> = [new Map()];
  #globals: Set<string>;
  #programContext: ProgramContext;
  names: Set<ValidIdentifierName> = new Set();

  constructor(globals: Set<string>, programContext: ProgramContext) {
    this.#globals = globals;
    this.#programContext = programContext;
  }

  visit(identifier: Identifier): void {
    const originalName = identifier.name;
    if (originalName === null) {
      return;
    }
    const mappedName = this.#seen.get(identifier.declarationId);
    if (mappedName !== undefined) {
      identifier.name = mappedName;
      return;
    }
    let name: string = originalName.value;
    let id = 0;
    if (isPromotedTemporary(originalName.value)) {
      name = `t${id++}`;
    } else if (isPromotedJsxTemporary(originalName.value)) {
      name = `T${id++}`;
    }
    while (this.#lookup(name) !== null || this.#globals.has(name)) {
      if (isPromotedTemporary(originalName.value)) {
        name = `t${id++}`;
      } else if (isPromotedJsxTemporary(originalName.value)) {
        name = `T${id++}`;
      } else {
        name = `${originalName.value}$${id++}`;
      }
    }
    this.#programContext.addNewReference(name);
    const identifierName = makeIdentifierName(name);
    identifier.name = identifierName;
    this.#seen.set(identifier.declarationId, identifierName);
    this.#stack.at(-1)!.set(identifierName.value, identifier.declarationId);
    this.names.add(identifierName.value);
  }

  #lookup(name: string): DeclarationId | null {
    for (let i = this.#stack.length - 1; i >= 0; i--) {
      const scope = this.#stack[i]!;
      const entry = scope.get(name);
      if (entry !== undefined) {
        return entry;
      }
    }
    return null;
  }

  enter(fn: () => void): void {
    const next = new Map();
    this.#stack.push(next);
    fn();
    const last = this.#stack.pop();
    CompilerError.invariant(last === next, {
      reason: 'Mismatch push/pop calls',
      loc: GeneratedSource,
    });
  }
}
