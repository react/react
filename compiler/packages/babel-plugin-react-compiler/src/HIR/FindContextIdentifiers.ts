/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {NodePath} from '@babel/traverse';
import type * as t from '@babel/types';
import {CompilerError} from '../CompilerError';
import {getOrInsertDefault} from '../Utils/utils';
import {GeneratedSource} from './HIR';

type IdentifierInfo = {
  reassigned: boolean;
  reassignedByInnerFn: boolean;
  referencedByInnerFn: boolean;
};
const DEFAULT_IDENTIFIER_INFO: IdentifierInfo = {
  reassigned: false,
  reassignedByInnerFn: false,
  referencedByInnerFn: false,
};

type BabelFunction =
  | NodePath<t.FunctionDeclaration>
  | NodePath<t.FunctionExpression>
  | NodePath<t.ArrowFunctionExpression>
  | NodePath<t.ObjectMethod>;
type FindContextIdentifierState = {
  currentFn: Array<BabelFunction>;
  identifiers: Map<t.Identifier, IdentifierInfo>;
};

const withFunctionScope = {
  enter: function (
    path: BabelFunction,
    state: FindContextIdentifierState,
  ): void {
    state.currentFn.push(path);
  },
  exit: function (_: BabelFunction, state: FindContextIdentifierState): void {
    state.currentFn.pop();
  },
};

export function findContextIdentifiers(
  func: NodePath<t.Function>,
): Set<t.Identifier> {
  const state: FindContextIdentifierState = {
    currentFn: [],
    identifiers: new Map(),
  };

  func.traverse<FindContextIdentifierState>(
    {
      FunctionDeclaration: withFunctionScope,
      FunctionExpression: withFunctionScope,
      ArrowFunctionExpression: withFunctionScope,
      ObjectMethod: withFunctionScope,
      AssignmentExpression(
        path: NodePath<t.AssignmentExpression>,
        state: FindContextIdentifierState,
      ): void {
        const left = path.get('left');
        if (left.isLVal()) {
          const currentFn = state.currentFn.at(-1) ?? null;
          handleAssignment(currentFn, state.identifiers, left);
        } else {
          /**
           * OptionalMemberExpressions as the left side of an AssignmentExpression are Stage 1 and
           * not supported by React Compiler yet.
           */
          CompilerError.throwTodo({
            reason: `Unsupported syntax on the left side of an AssignmentExpression`,
            description: `Expected an LVal, got: ${left.type}`,
            loc: left.node.loc ?? null,
          });
        }
      },
      UpdateExpression(
        path: NodePath<t.UpdateExpression>,
        state: FindContextIdentifierState,
      ): void {
        const argument = path.get('argument');
        const currentFn = state.currentFn.at(-1) ?? null;
        if (argument.isLVal()) {
          handleAssignment(currentFn, state.identifiers, argument);
        }
      },
      Identifier(
        path: NodePath<t.Identifier>,
        state: FindContextIdentifierState,
      ): void {
        const currentFn = state.currentFn.at(-1) ?? null;
        if (path.isReferencedIdentifier()) {
          handleIdentifier(currentFn, state.identifiers, path);
        }
      },
    },
    state,
  );

  const result = new Set<t.Identifier>();
  for (const [id, info] of state.identifiers.entries()) {
    if (info.reassignedByInnerFn) {
      result.add(id);
    } else if (info.reassigned && info.referencedByInnerFn) {
      result.add(id);
    }
  }
  return result;
}

function handleIdentifier(
  currentFn: BabelFunction | null,
  identifiers: Map<t.Identifier, IdentifierInfo>,
  path: NodePath<t.Identifier>,
): void {
  const name = path.node.name;
  const binding = path.scope.getBinding(name);
  if (binding == null) {
    return;
  }
  const identifier = getOrInsertDefault(identifiers, binding.identifier, {
    ...DEFAULT_IDENTIFIER_INFO,
  });

  if (currentFn != null) {
    const bindingAboveLambdaScope = currentFn.scope.parent.getBinding(name);

    if (binding === bindingAboveLambdaScope) {
      identifier.referencedByInnerFn = true;
    }
  }
}

function handleAssignment(
  currentFn: BabelFunction | null,
  identifiers: Map<t.Identifier, IdentifierInfo>,
  lvalPath: NodePath<t.LVal>,
): void {
  /*
   * Find all reassignments to identifiers declared outside of currentFn
   * This closely follows destructuring assignment assumptions and logic in BuildHIR
   */
  const lvalNode = lvalPath.node;
  switch (lvalNode.type) {
    case 'Identifier': {
      const path = lvalPath as NodePath<t.Identifier>;
      const name = path.node.name;
      const binding = path.scope.getBinding(name);
      if (binding == null) {
        break;
      }
      const state = getOrInsertDefault(identifiers, binding.identifier, {
        ...DEFAULT_IDENTIFIER_INFO,
      });
      state.reassigned = true;

      if (currentFn != null) {
        const bindingAboveLambdaScope = currentFn.scope.parent.getBinding(name);

        if (binding === bindingAboveLambdaScope) {
          state.reassignedByInnerFn = true;
        }
      }
      break;
    }
    case 'ArrayPattern': {
      const path = lvalPath as NodePath<t.ArrayPattern>;
      for (const element of path.get('elements')) {
        if (nonNull(element)) {
          handleAssignment(currentFn, identifiers, element);
        }
      }
      break;
    }
    case 'ObjectPattern': {
      const path = lvalPath as NodePath<t.ObjectPattern>;
      for (const property of path.get('properties')) {
        if (property.isObjectProperty()) {
          const valuePath = property.get('value');
          CompilerError.invariant(valuePath.isLVal(), {
            reason: `[FindContextIdentifiers] Expected object property value to be an LVal, got: ${valuePath.type}`,
            loc: valuePath.node.loc ?? GeneratedSource,
          });
          handleAssignment(currentFn, identifiers, valuePath);
        } else {
          CompilerError.invariant(property.isRestElement(), {
            reason: `[FindContextIdentifiers] Invalid assumptions for babel types.`,
            loc: property.node.loc ?? GeneratedSource,
          });
          handleAssignment(currentFn, identifiers, property);
        }
      }
      break;
    }
    case 'AssignmentPattern': {
      const path = lvalPath as NodePath<t.AssignmentPattern>;
      const left = path.get('left');
      handleAssignment(currentFn, identifiers, left);
      break;
    }
    case 'RestElement': {
      const path = lvalPath as NodePath<t.RestElement>;
      handleAssignment(currentFn, identifiers, path.get('argument'));
      break;
    }
    case 'MemberExpression': {
      // Interior mutability (not a reassign)
      break;
    }
    default: {
      CompilerError.throwTodo({
        reason: `[FindContextIdentifiers] Cannot handle Object destructuring assignment target ${lvalNode.type}`,
        description: null,
        loc: lvalNode.loc ?? GeneratedSource,
        suggestions: null,
      });
    }
  }
}

function nonNull<T extends NonNullable<t.Node>>(
  t: NodePath<T | null>,
): t is NodePath<T> {
  return t.node != null;
}
