/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {NodePath} from '@babel/core';
import type * as t from '@babel/types';

/**
 * Quick check: does this program contain any functions with names that
 * could be React components (capitalized) or hooks (useXxx)?
 *
 * This is intentionally loose — Rust handles the precise detection.
 * We just want to avoid serializing files that definitely have no
 * React functions (e.g., pure utility modules, CSS-in-JS, configs).
 */
export function hasReactLikeFunctions(program: NodePath<t.Program>): boolean {
  let found = false;
  program.traverse({
    // Skip classes — their methods are not compiled
    ClassDeclaration(path) {
      path.skip();
    },
    ClassExpression(path) {
      path.skip();
    },

    FunctionDeclaration(path) {
      if (found) return;
      const name = path.node.id?.name;
      if (
        (name && isReactLikeName(name)) ||
        hasOptInDirective(path.node) ||
        isComponentOrHookDeclaration(path.node)
      ) {
        found = true;
        path.stop();
      }
    },
    FunctionExpression(path) {
      if (found) return;
      const idName = path.node.id?.name;
      const inferredName = inferFunctionName(path);
      if (
        (idName && isReactLikeName(idName)) ||
        (inferredName && isReactLikeName(inferredName)) ||
        isInsideMemoOrForwardRef(path) ||
        hasOptInDirective(path.node)
      ) {
        found = true;
        path.stop();
      }
    },
    ArrowFunctionExpression(path) {
      if (found) return;
      const name = inferFunctionName(path);
      if (
        (name && isReactLikeName(name)) ||
        isInsideMemoOrForwardRef(path) ||
        hasOptInDirective(path.node)
      ) {
        found = true;
        path.stop();
      }
    },
  });
  return found;
}

/**
 * Check if a function expression/arrow is the first argument of
 * React.memo(), React.forwardRef(), memo(), or forwardRef().
 */
function isInsideMemoOrForwardRef(
  path: NodePath<t.FunctionExpression | t.ArrowFunctionExpression>,
): boolean {
  const parent = path.parentPath;
  if (parent == null || !parent.isCallExpression()) return false;
  const callExpr = parent.node as t.CallExpression;
  // Must be the first argument
  if (callExpr.arguments[0] !== path.node) return false;
  const callee = callExpr.callee;
  // Direct calls: memo(...) or forwardRef(...)
  if (
    callee.type === 'Identifier' &&
    (callee.name === 'memo' || callee.name === 'forwardRef')
  ) {
    return true;
  }
  // Member expression calls: React.memo(...) or React.forwardRef(...)
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'React' &&
    callee.property.type === 'Identifier' &&
    (callee.property.name === 'memo' || callee.property.name === 'forwardRef')
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a function has an opt-in directive ('use memo' or 'use forget')
 * in its body, indicating it should be compiled in annotation mode.
 */
function hasOptInDirective(
  node:
    | t.FunctionDeclaration
    | t.FunctionExpression
    | t.ArrowFunctionExpression,
): boolean {
  if (node.body.type !== 'BlockStatement') return false;
  return node.body.directives.some(
    d => d.value.value === 'use memo' || d.value.value === 'use forget',
  );
}

function isReactLikeName(name: string): boolean {
  return /^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name);
}

function isComponentOrHookDeclaration(node: t.FunctionDeclaration): boolean {
  return (
    Object.prototype.hasOwnProperty.call(node, '__componentDeclaration') ||
    Object.prototype.hasOwnProperty.call(node, '__hookDeclaration')
  );
}

/**
 * Infer the name of an anonymous function expression from its parent
 * (e.g., `const Foo = () => {}` → 'Foo').
 */
function inferFunctionName(
  path: NodePath<t.FunctionExpression | t.ArrowFunctionExpression>,
): string | null {
  const parent = path.parentPath;
  if (parent == null) return null;
  if (
    parent.isVariableDeclarator() &&
    parent.get('init').node === path.node &&
    parent.get('id').isIdentifier()
  ) {
    return (parent.get('id').node as t.Identifier).name;
  }
  if (
    parent.isAssignmentExpression() &&
    parent.get('right').node === path.node &&
    parent.get('left').isIdentifier()
  ) {
    return (parent.get('left').node as t.Identifier).name;
  }
  return null;
}
