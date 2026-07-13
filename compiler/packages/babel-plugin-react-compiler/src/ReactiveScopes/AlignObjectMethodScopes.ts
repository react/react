/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CompilerError} from '..';
import {
  GeneratedSource,
  HIRFunction,
  Identifier,
  ReactiveScope,
  makeInstructionId,
} from '../HIR';
import {eachInstructionValueOperand} from '../HIR/visitors';
import DisjointSet from '../Utils/DisjointSet';

/**
 * Align scopes of object method values to that of their enclosing object expressions.
 * To produce a well-formed JS program in Codegen, object methods and object expressions
 * must be in the same ReactiveBlock as object method definitions must be inlined.
 */

function findScopesToMerge(fn: HIRFunction): DisjointSet<ReactiveScope> {
  const objectMethodDecls: Set<Identifier> = new Set();
  const mergeScopesBuilder = new DisjointSet<ReactiveScope>();

  for (const [_, block] of fn.body.blocks) {
    for (const {lvalue, value} of block.instructions) {
      if (value.kind === 'ObjectMethod') {
        objectMethodDecls.add(lvalue.identifier);
      } else if (value.kind === 'ObjectExpression') {
        for (const operand of eachInstructionValueOperand(value)) {
          if (objectMethodDecls.has(operand.identifier)) {
            const operandScope = operand.identifier.scope;
            const lvalueScope = lvalue.identifier.scope;

            CompilerError.invariant(
              operandScope != null && lvalueScope != null,
              {
                reason:
                  'Internal error: Expected all ObjectExpressions and ObjectMethods to have non-null scope.',
                loc: GeneratedSource,
              },
            );
            mergeScopesBuilder.union([operandScope, lvalueScope]);
          }
        }
      }
    }
  }
  return mergeScopesBuilder;
}

export function alignObjectMethodScopes(fn: HIRFunction): void {
  // Handle inner functions: we assume that Scopes are disjoint across functions
  for (const [_, block] of fn.body.blocks) {
    for (const {value} of block.instructions) {
      if (
        value.kind === 'ObjectMethod' ||
        value.kind === 'FunctionExpression'
      ) {
        alignObjectMethodScopes(value.loweredFunc.func);
      }
    }
  }

  const scopeGroupsMap = findScopesToMerge(fn).canonicalize();
  /**
   * Step 1: Merge affected scopes to their canonical root.
   */
  for (const [scope, root] of scopeGroupsMap) {
    if (scope !== root) {
      root.range.start = makeInstructionId(
        Math.min(scope.range.start, root.range.start),
      );
      root.range.end = makeInstructionId(
        Math.max(scope.range.end, root.range.end),
      );
    }
  }

  /**
   * Step 2: Repoint identifiers whose scopes were merged.
   */
  for (const [_, block] of fn.body.blocks) {
    for (const {
      lvalue: {identifier},
    } of block.instructions) {
      if (identifier.scope != null) {
        const root = scopeGroupsMap.get(identifier.scope);
        if (root != null) {
          identifier.scope = root;
        }
        // otherwise, this identifier's scope was not affected by this pass
      }
    }
  }
}
