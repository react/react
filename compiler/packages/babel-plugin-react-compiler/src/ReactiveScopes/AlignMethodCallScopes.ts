/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  HIRFunction,
  IdentifierId,
  ReactiveScope,
  makeInstructionId,
} from '../HIR';
import DisjointSet from '../Utils/DisjointSet';

/**
 * Ensures that method call instructions have scopes such that either:
 * - Both the MethodCall and its property have the same scope
 * - OR neither has a scope
 */
export function alignMethodCallScopes(fn: HIRFunction): void {
  const scopeMapping = new Map<IdentifierId, ReactiveScope | null>();
  const mergedScopes = new DisjointSet<ReactiveScope>();

  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const {lvalue, value} = instr;
      if (value.kind === 'MethodCall') {
        const lvalueScope = lvalue.identifier.scope;
        const propertyScope = value.property.identifier.scope;
        if (lvalueScope !== null) {
          if (propertyScope !== null) {
            // Both have a scope: merge the scopes
            mergedScopes.union([lvalueScope, propertyScope]);
          } else {
            /*
             * Else the call itself has a scope but not the property,
             * record that this property should be in this scope
             */
            scopeMapping.set(value.property.identifier.id, lvalueScope);
          }
        } else if (propertyScope !== null) {
          // else this property does not need a scope
          scopeMapping.set(value.property.identifier.id, null);
        }
      } else if (
        value.kind === 'FunctionExpression' ||
        value.kind === 'ObjectMethod'
      ) {
        alignMethodCallScopes(value.loweredFunc.func);
      }
    }
  }

  mergedScopes.forEach((scope, root) => {
    if (scope === root) {
      return;
    }
    root.range.start = makeInstructionId(
      Math.min(scope.range.start, root.range.start),
    );
    root.range.end = makeInstructionId(
      Math.max(scope.range.end, root.range.end),
    );
  });

  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      const mappedScope = scopeMapping.get(instr.lvalue.identifier.id);
      if (mappedScope !== undefined) {
        instr.lvalue.identifier.scope = mappedScope;
      } else if (instr.lvalue.identifier.scope !== null) {
        const mergedScope = mergedScopes.find(instr.lvalue.identifier.scope);
        if (mergedScope != null) {
          instr.lvalue.identifier.scope = mergedScope;
        }
      }
    }
  }
}
