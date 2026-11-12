/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/traverse';
import * as t from '@babel/types';
import {CompilerDiagnostic, ErrorCategory} from '..';
import {CodegenFunction} from '../ReactiveScopes';
import {Environment} from '../HIR/Environment';

/**
 * IMPORTANT: This validation is only intended for use in unit tests.
 * It is not intended for use in production.
 *
 * This validation is used to ensure that the generated AST has proper source locations
 * for "important" original nodes.
 *
 * There's one big gotcha with this validation: it only works if the "important" original nodes
 * are not optimized away by the compiler.
 *
 * When that scenario happens, we should just update the fixture to not include a node that has no
 * corresponding node in the generated AST due to being completely removed during compilation.
 */

/**
 * Some common node types that are important for coverage tracking.
 * Based on istanbul-lib-instrument + some other common nodes we expect to be present in the generated AST.
 *
 * Note: For VariableDeclaration, VariableDeclarator, and Identifier, we enforce stricter validation
 * that requires both the source location AND node type to match in the generated AST. This ensures
 * that variable declarations maintain their structural integrity through compilation.
 */
const IMPORTANT_INSTRUMENTED_TYPES = new Set([
  'ArrowFunctionExpression',
  'AssignmentPattern',
  'ObjectMethod',
  'ExpressionStatement',
  'BreakStatement',
  'ContinueStatement',
  'ReturnStatement',
  'ThrowStatement',
  'TryStatement',
  'VariableDeclarator',
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchStatement',
  'SwitchCase',
  'WithStatement',
  'FunctionDeclaration',
  'FunctionExpression',
  'LabeledStatement',
  'ConditionalExpression',
  'LogicalExpression',

  /**
   * Note: these aren't important for coverage tracking,
   * but we still want to track them to ensure we aren't regressing them when
   * we fix the source location tracking for other nodes.
   */
  'VariableDeclaration',
  'Identifier',
]);

/**
 * Check if a node is a manual memoization call that the compiler optimizes away.
 * These include useMemo and useCallback calls, which are intentionally removed
 * by the DropManualMemoization pass.
 */
function isManualMemoization(node: t.Node): boolean {
  // Check if this is a useMemo/useCallback call expression
  if (t.isCallExpression(node)) {
    const callee = node.callee;
    if (t.isIdentifier(callee)) {
      return callee.name === 'useMemo' || callee.name === 'useCallback';
    }
    if (
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property) &&
      t.isIdentifier(callee.object)
    ) {
      return (
        callee.object.name === 'React' &&
        (callee.property.name === 'useMemo' ||
          callee.property.name === 'useCallback')
      );
    }
  }

  return false;
}

/**
 * Create a location key for comparison. We compare by line/column/source,
 * not by object identity.
 */
function locationKey(loc: t.SourceLocation): string {
  return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
}

/**
 * Validates that important source locations from the original code are preserved
 * in the generated AST. This ensures that Istanbul coverage instrumentation can
 * properly map back to the original source code.
 *
 * The validator:
 * 1. Collects locations from "important" nodes in the original AST (those that
 *    Istanbul instruments for coverage tracking)
 * 2. Exempts known compiler optimizations (useMemo/useCallback removal)
 * 3. Verifies that all important locations appear somewhere in the generated AST
 *
 * Missing locations can cause Istanbul to fail to track coverage for certain
 * code paths, leading to inaccurate coverage reports.
 */
export function validateSourceLocations(
  func: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
  generatedAst: CodegenFunction,
  env: Environment,
): void {
  /*
   * Step 1: Collect important locations from the original source
   * Note: Multiple node types can share the same location (e.g. VariableDeclarator and Identifier)
   */
  const importantOriginalLocations = new Map<
    string,
    {loc: t.SourceLocation; nodeTypes: Set<string>}
  >();

  func.traverse({
    enter(path) {
      const node = path.node;

      // Only track node types that Istanbul instruments
      if (!IMPORTANT_INSTRUMENTED_TYPES.has(node.type)) {
        return;
      }

      // Skip manual memoization that the compiler intentionally removes
      if (isManualMemoization(node)) {
        return;
      }

      /*
       * Skip return statements inside arrow functions that will be simplified to expression body.
       * The compiler transforms `() => { return expr }` to `() => expr` in CodegenReactiveFunction
       */
      if (t.isReturnStatement(node) && node.argument != null) {
        const parentBody = path.parentPath;
        const parentFunc = parentBody?.parentPath;
        if (
          parentBody?.isBlockStatement() &&
          parentFunc?.isArrowFunctionExpression() &&
          parentBody.node.body.length === 1 &&
          parentBody.node.directives.length === 0
        ) {
          return;
        }
      }

      // Collect the location if it exists
      if (node.loc) {
        const key = locationKey(node.loc);
        const existing = importantOriginalLocations.get(key);
        if (existing) {
          existing.nodeTypes.add(node.type);
        } else {
          importantOriginalLocations.set(key, {
            loc: node.loc,
            nodeTypes: new Set([node.type]),
          });
        }
      }
    },
  });

  // Step 2: Collect all locations from the generated AST with their node types
  const generatedLocations = new Map<string, Set<string>>();

  function collectGeneratedLocations(node: t.Node): void {
    if (node.loc) {
      const key = locationKey(node.loc);
      const nodeTypes = generatedLocations.get(key);
      if (nodeTypes) {
        nodeTypes.add(node.type);
      } else {
        generatedLocations.set(key, new Set([node.type]));
      }
    }

    // Use Babel's VISITOR_KEYS to traverse only actual node properties
    const keys = t.VISITOR_KEYS[node.type as keyof typeof t.VISITOR_KEYS];

    if (!keys) {
      return;
    }

    for (const key of keys) {
      const value = (node as any)[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          if (t.isNode(item)) {
            collectGeneratedLocations(item);
          }
        }
      } else if (t.isNode(value)) {
        collectGeneratedLocations(value);
      }
    }
  }

  // Collect from main function body
  collectGeneratedLocations(generatedAst.body);

  // Collect from outlined functions
  for (const outlined of generatedAst.outlined) {
    collectGeneratedLocations(outlined.fn.body);
  }

  /*
   * Step 3: Validate that all important locations are preserved
   * For certain node types, also validate that the node type matches
   */
  const strictNodeTypes = new Set([
    'VariableDeclaration',
    'VariableDeclarator',
    'Identifier',
  ]);

  const reportMissingLocation = (
    loc: t.SourceLocation,
    nodeType: string,
  ): void => {
    env.recordError(
      CompilerDiagnostic.create({
        category: ErrorCategory.Todo,
        reason: 'Important source location missing in generated code',
        description:
          `Source location for ${nodeType} is missing in the generated output. This can cause coverage instrumentation ` +
          `to fail to track this code properly, resulting in inaccurate coverage reports.`,
      }).withDetails({
        kind: 'error',
        loc,
        message: null,
      }),
    );
  };

  const reportWrongNodeType = (
    loc: t.SourceLocation,
    expectedType: string,
    actualTypes: Set<string>,
  ): void => {
    env.recordError(
      CompilerDiagnostic.create({
        category: ErrorCategory.Todo,
        reason:
          'Important source location has wrong node type in generated code',
        description:
          `Source location for ${expectedType} exists in the generated output but with wrong node type(s): ${Array.from(actualTypes).join(', ')}. ` +
          `This can cause coverage instrumentation to fail to track this code properly, resulting in inaccurate coverage reports.`,
      }).withDetails({
        kind: 'error',
        loc,
        message: null,
      }),
    );
  };

  for (const [key, {loc, nodeTypes}] of importantOriginalLocations) {
    const generatedNodeTypes = generatedLocations.get(key);

    if (!generatedNodeTypes) {
      // Location is completely missing
      reportMissingLocation(loc, Array.from(nodeTypes).join(', '));
    } else {
      // Location exists, check each node type
      for (const nodeType of nodeTypes) {
        if (
          strictNodeTypes.has(nodeType) &&
          !generatedNodeTypes.has(nodeType)
        ) {
          /*
           * For strict node types, the specific node type must be present
           * Check if any generated node type is also an important original node type
           */
          const hasValidNodeType = Array.from(generatedNodeTypes).some(
            genType => nodeTypes.has(genType),
          );

          if (hasValidNodeType) {
            // At least one generated node type is valid (also in original), so this is just missing
            reportMissingLocation(loc, nodeType);
          } else {
            // None of the generated node types are in original - this is wrong node type
            reportWrongNodeType(loc, nodeType, generatedNodeTypes);
          }
        }
      }
    }
  }
}
