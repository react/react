/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {NodePath, PluginObj} from '@babel/core';
import {transformFromAstSync} from '@babel/core';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type {parseConfigPragmaForTests as ParseConfigPragma} from 'babel-plugin-react-compiler/src/Utils/TestUtils';
import {parseInput} from './compiler.js';
import {
  PARSE_CONFIG_PRAGMA_IMPORT,
  BABEL_PLUGIN_SRC,
  BABEL_PLUGIN_RUST_SRC,
} from './constants.js';

type CompileSuccess = {kind: 'success'};
type CompileParseError = {kind: 'parse_error'; message: string};
type CompileErrors = {
  kind: 'errors';
  errors: Array<{category: string; reason: string; description: string | null}>;
};
type CompileResult = CompileSuccess | CompileParseError | CompileErrors;

/**
 * Compile code and extract error information
 */
function compileAndGetError(
  code: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
  plugin: PluginObj,
  parseConfigPragmaFn: typeof ParseConfigPragma,
): CompileResult {
  let ast: t.File;
  try {
    ast = parseInput(code, filename, language, sourceType);
  } catch (e: unknown) {
    return {kind: 'parse_error', message: (e as Error).message};
  }

  const firstLine = code.substring(0, code.indexOf('\n'));
  const config = parseConfigPragmaFn(firstLine, {compilationMode: 'all'});
  const options = {
    ...config,
    environment: {
      ...config.environment,
    },
    logger: {
      logEvent: () => {},
      debugLogIRs: () => {},
    },
    enableReanimatedCheck: false,
  };

  try {
    transformFromAstSync(ast, code, {
      filename: '/' + filename,
      highlightCode: false,
      retainLines: true,
      compact: true,
      plugins: [[plugin, options]],
      sourceType: 'module',
      ast: false,
      cloneInputAst: true,
      configFile: false,
      babelrc: false,
    });
    return {kind: 'success'};
  } catch (e: unknown) {
    const error = e as Error & {
      details?: Array<{
        category: string;
        reason: string;
        description: string | null;
      }>;
    };
    // Check if this is a CompilerError with details
    if (error.details && error.details.length > 0) {
      return {
        kind: 'errors',
        errors: error.details.map(detail => ({
          category: detail.category,
          reason: detail.reason,
          description: detail.description,
        })),
      };
    }
    // Fallback for other errors - use error name/message
    return {
      kind: 'errors',
      errors: [
        {
          category: error.name ?? 'Error',
          reason: error.message,
          description: null,
        },
      ],
    };
  }
}

/**
 * Check if two compile errors match
 */
function errorsMatch(a: CompileErrors, b: CompileResult): boolean {
  if (b.kind !== 'errors') {
    return false;
  }
  if (a.errors.length !== b.errors.length) {
    return false;
  }
  for (let i = 0; i < a.errors.length; i++) {
    if (
      a.errors[i].category !== b.errors[i].category ||
      a.errors[i].reason !== b.errors[i].reason ||
      a.errors[i].description !== b.errors[i].description
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Convert AST to code string
 */
function astToCode(ast: t.File): string {
  return generate(ast).code;
}

/**
 * Clone an AST node deeply
 */
function cloneAst(ast: t.File): t.File {
  return t.cloneNode(ast, true);
}

/**
 * Generic generator that yields ASTs with one item removed at a time from a
 * per-node collection (e.g. statements in a block, arguments in a call,
 * properties in an object). `matches` selects the nodes that own a
 * collection; `getCollection` returns that node's mutable array. Items are
 * removed from the end of each collection towards the start, and each
 * matching node (by traversal order) is visited in turn.
 */
function* removeCollectionItems(
  ast: t.File,
  matches: (node: t.Node) => boolean,
  getCollection: (node: t.Node) => Array<unknown>,
): Generator<t.File> {
  const sites: Array<{siteIndex: number; count: number}> = [];
  let siteIndex = 0;
  t.traverseFast(ast, node => {
    if (matches(node)) {
      const count = getCollection(node).length;
      if (count > 0) {
        sites.push({siteIndex, count});
      }
      siteIndex++;
    }
  });

  for (const {siteIndex: targetSiteIdx, count} of sites) {
    for (let itemIdx = count - 1; itemIdx >= 0; itemIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (matches(node)) {
          const collection = getCollection(node);
          if (idx === targetSiteIdx && itemIdx < collection.length) {
            collection.splice(itemIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generic generator that yields ASTs with a single matching node replaced by
 * some derived replacement (e.g. a conditional expression replaced by its
 * test, consequent, or alternate). `visitorKey` is the Babel visitor key for
 * the node type to target; `getReplacement` computes the replacement node
 * for a given match, or returns null/undefined to skip that match (e.g. an
 * absent `alternate`).
 */
function* simplifyByReplacement<TNode extends t.Node>(
  ast: t.File,
  visitorKey: string,
  getReplacement: (node: TNode) => t.Node | null | undefined,
): Generator<t.File> {
  let count = 0;
  traverse(ast, {
    [visitorKey](_path: NodePath<TNode>) {
      count++;
    },
  });

  for (let targetIdx = 0; targetIdx < count; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      [visitorKey](path: NodePath<TNode>) {
        if (modified) return;
        if (idx === targetIdx) {
          const replacement = getReplacement(path.node);
          if (replacement != null) {
            path.replaceWith(replacement);
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that yields ASTs with statements removed one at a time
 */
function* removeStatements(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isBlockStatement(node) || t.isProgram(node),
    node => (node as t.BlockStatement | t.Program).body,
  );
}

/**
 * Generator that yields ASTs with call arguments removed one at a time
 */
function* removeCallArguments(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isCallExpression(node),
    node => (node as t.CallExpression).arguments,
  );
}

/**
 * Generator that yields ASTs with function parameters removed one at a time
 */
function* removeFunctionParameters(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isFunction(node),
    node => (node as t.Function).params,
  );
}

/**
 * Generator that removes array elements one at a time
 */
function* removeArrayElements(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isArrayExpression(node),
    node => (node as t.ArrayExpression).elements,
  );
}

/**
 * Generator that removes JSX element attributes (props) one at a time
 */
function* removeJSXAttributes(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isJSXOpeningElement(node),
    node => (node as t.JSXOpeningElement).attributes,
  );
}

/**
 * Generator that removes JSX element children one at a time
 */
function* removeJSXChildren(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isJSXElement(node),
    node => (node as t.JSXElement).children,
  );
}

/**
 * Generator that removes JSX fragment children one at a time
 */
function* removeJSXFragmentChildren(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isJSXFragment(node),
    node => (node as t.JSXFragment).children,
  );
}

/**
 * Generator that removes object properties one at a time
 */
function* removeObjectProperties(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isObjectExpression(node),
    node => (node as t.ObjectExpression).properties,
  );
}

/**
 * Generator that removes elements from array destructuring patterns one at a time
 */
function* removeArrayPatternElements(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isArrayPattern(node),
    node => (node as t.ArrayPattern).elements,
  );
}

/**
 * Generator that removes properties from object destructuring patterns one at a time
 */
function* removeObjectPatternProperties(ast: t.File): Generator<t.File> {
  yield* removeCollectionItems(
    ast,
    node => t.isObjectPattern(node),
    node => (node as t.ObjectPattern).properties,
  );
}

/**
 * Generator that simplifies call expressions by replacing them with their arguments.
 * For single argument: foo(x) -> x
 * For multiple arguments: foo(x, y) -> [x, y]
 */
function* simplifyCallExpressions(ast: t.File): Generator<t.File> {
  // Count call expressions with arguments
  let callCount = 0;
  t.traverseFast(ast, node => {
    if (t.isCallExpression(node) && node.arguments.length > 0) {
      callCount++;
    }
  });

  // For each call, try replacing with arguments
  for (let targetIdx = 0; targetIdx < callCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      CallExpression(path) {
        if (modified) return;
        if (path.node.arguments.length > 0 && idx === targetIdx) {
          const args = path.node.arguments;
          // Filter to only Expression arguments (not SpreadElement)
          const exprArgs = args.filter((arg): arg is t.Expression =>
            t.isExpression(arg),
          );
          if (exprArgs.length === 0) {
            idx++;
            return;
          }
          if (exprArgs.length === 1) {
            // Single argument: replace call with the argument
            path.replaceWith(exprArgs[0]);
          } else {
            // Multiple arguments: replace call with array of arguments
            path.replaceWith(t.arrayExpression(exprArgs));
          }
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Also try replacing with each individual argument for multi-arg calls
  for (let targetIdx = 0; targetIdx < callCount; targetIdx++) {
    // First, find the arg count for this call
    let argCount = 0;
    let currentIdx = 0;
    t.traverseFast(ast, node => {
      if (t.isCallExpression(node) && node.arguments.length > 0) {
        if (currentIdx === targetIdx) {
          argCount = node.arguments.length;
        }
        currentIdx++;
      }
    });

    // Try replacing with each argument individually
    for (let argIdx = 0; argIdx < argCount; argIdx++) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      traverse(cloned, {
        CallExpression(path) {
          if (modified) return;
          if (path.node.arguments.length > 0 && idx === targetIdx) {
            const arg = path.node.arguments[argIdx];
            if (t.isExpression(arg)) {
              path.replaceWith(arg);
              modified = true;
            }
          }
          idx++;
        },
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies conditional expressions (a ? b : c) -> a, b, or c
 */
function* simplifyConditionals(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.ConditionalExpression>(
    ast,
    'ConditionalExpression',
    n => n.test,
  );
  yield* simplifyByReplacement<t.ConditionalExpression>(
    ast,
    'ConditionalExpression',
    n => n.consequent,
  );
  yield* simplifyByReplacement<t.ConditionalExpression>(
    ast,
    'ConditionalExpression',
    n => n.alternate,
  );
}

/**
 * Generator that simplifies logical expressions (a && b) -> a or b
 */
function* simplifyLogicalExpressions(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.LogicalExpression>(
    ast,
    'LogicalExpression',
    n => n.left,
  );
  yield* simplifyByReplacement<t.LogicalExpression>(
    ast,
    'LogicalExpression',
    n => n.right,
  );
}

/**
 * Generator that simplifies optional chains (a?.b) -> a.b
 */
function* simplifyOptionalChains(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.OptionalMemberExpression>(
    ast,
    'OptionalMemberExpression',
    n => t.memberExpression(n.object, n.property, n.computed),
  );
  yield* simplifyByReplacement<t.OptionalCallExpression>(
    ast,
    'OptionalCallExpression',
    n =>
      t.isExpression(n.callee) ? t.callExpression(n.callee, n.arguments) : null,
  );
}

/**
 * Generator that simplifies await expressions: await expr -> expr
 */
function* simplifyAwaitExpressions(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.AwaitExpression>(
    ast,
    'AwaitExpression',
    n => n.argument,
  );
}

/**
 * Generator that simplifies if statements:
 * - Replace with test expression (as expression statement)
 * - Replace with consequent block
 * - Replace with alternate block (if present)
 */
function* simplifyIfStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.IfStatement>(ast, 'IfStatement', n =>
    t.expressionStatement(n.test),
  );
  yield* simplifyByReplacement<t.IfStatement>(
    ast,
    'IfStatement',
    n => n.consequent,
  );
  yield* simplifyByReplacement<t.IfStatement>(
    ast,
    'IfStatement',
    n => n.alternate,
  );
}

/**
 * Generator that simplifies switch statements:
 * - Replace with discriminant expression
 * - Replace with each case's consequent statements
 */
function* simplifySwitchStatements(ast: t.File): Generator<t.File> {
  // Count switch statements
  let switchCount = 0;
  t.traverseFast(ast, node => {
    if (t.isSwitchStatement(node)) {
      switchCount++;
    }
  });

  yield* simplifyByReplacement<t.SwitchStatement>(ast, 'SwitchStatement', n =>
    t.expressionStatement(n.discriminant),
  );

  // For each switch, try replacing with each case's body
  for (let targetIdx = 0; targetIdx < switchCount; targetIdx++) {
    // Find case count for this switch
    let caseCount = 0;
    let currentIdx = 0;
    t.traverseFast(ast, node => {
      if (t.isSwitchStatement(node)) {
        if (currentIdx === targetIdx) {
          caseCount = node.cases.length;
        }
        currentIdx++;
      }
    });

    for (let caseIdx = 0; caseIdx < caseCount; caseIdx++) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      traverse(cloned, {
        SwitchStatement(path) {
          if (modified) return;
          if (idx === targetIdx) {
            const switchCase = path.node.cases[caseIdx];
            if (switchCase && switchCase.consequent.length > 0) {
              path.replaceWithMultiple(switchCase.consequent);
              modified = true;
            }
          }
          idx++;
        },
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies while statements:
 * - Replace with test expression
 * - Replace with body
 */
function* simplifyWhileStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.WhileStatement>(ast, 'WhileStatement', n =>
    t.expressionStatement(n.test),
  );
  yield* simplifyByReplacement<t.WhileStatement>(
    ast,
    'WhileStatement',
    n => n.body,
  );
}

/**
 * Generator that simplifies do-while statements:
 * - Replace with test expression
 * - Replace with body
 */
function* simplifyDoWhileStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.DoWhileStatement>(ast, 'DoWhileStatement', n =>
    t.expressionStatement(n.test),
  );
  yield* simplifyByReplacement<t.DoWhileStatement>(
    ast,
    'DoWhileStatement',
    n => n.body,
  );
}

/**
 * Generator that simplifies for statements:
 * - Replace with init (if expression)
 * - Replace with test expression
 * - Replace with update expression
 * - Replace with body
 */
function* simplifyForStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.ForStatement>(ast, 'ForStatement', n => {
    if (!n.init) return null;
    return t.isExpression(n.init) ? t.expressionStatement(n.init) : n.init;
  });
  yield* simplifyByReplacement<t.ForStatement>(ast, 'ForStatement', n =>
    n.test ? t.expressionStatement(n.test) : null,
  );
  yield* simplifyByReplacement<t.ForStatement>(ast, 'ForStatement', n =>
    n.update ? t.expressionStatement(n.update) : null,
  );
  yield* simplifyByReplacement<t.ForStatement>(
    ast,
    'ForStatement',
    n => n.body,
  );
}

/**
 * Generator that simplifies for-in statements:
 * - Replace with left (variable declaration or expression)
 * - Replace with right expression
 * - Replace with body
 */
function* simplifyForInStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.ForInStatement>(ast, 'ForInStatement', n =>
    t.isExpression(n.left) ? t.expressionStatement(n.left) : n.left,
  );
  yield* simplifyByReplacement<t.ForInStatement>(ast, 'ForInStatement', n =>
    t.expressionStatement(n.right),
  );
  yield* simplifyByReplacement<t.ForInStatement>(
    ast,
    'ForInStatement',
    n => n.body,
  );
}

/**
 * Generator that simplifies for-of statements:
 * - Replace with left (variable declaration or expression)
 * - Replace with right expression
 * - Replace with body
 */
function* simplifyForOfStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.ForOfStatement>(ast, 'ForOfStatement', n =>
    t.isExpression(n.left) ? t.expressionStatement(n.left) : n.left,
  );
  yield* simplifyByReplacement<t.ForOfStatement>(ast, 'ForOfStatement', n =>
    t.expressionStatement(n.right),
  );
  yield* simplifyByReplacement<t.ForOfStatement>(
    ast,
    'ForOfStatement',
    n => n.body,
  );
}

/**
 * Generator that simplifies variable declarations by removing init expressions.
 * let x = expr; -> let x;
 * var x = expr; -> var x;
 * Note: const without init is invalid, so we skip const declarations.
 */
function* simplifyVariableDeclarations(ast: t.File): Generator<t.File> {
  // Collect all variable declarators with init expressions (excluding const)
  const declaratorSites: Array<{declIndex: number}> = [];
  let declIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isVariableDeclaration(node) && node.kind !== 'const') {
      for (const declarator of node.declarations) {
        if (declarator.init) {
          declaratorSites.push({declIndex});
          declIndex++;
        }
      }
    }
  });

  // Try removing init from each declarator
  for (const {declIndex: targetDeclIdx} of declaratorSites) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    t.traverseFast(cloned, node => {
      if (modified) return;
      if (t.isVariableDeclaration(node) && node.kind !== 'const') {
        for (const declarator of node.declarations) {
          if (declarator.init) {
            if (idx === targetDeclIdx) {
              declarator.init = null;
              modified = true;
              return;
            }
            idx++;
          }
        }
      }
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies try/catch/finally statements:
 * - Replace with try block contents
 * - Replace with catch block contents (if present)
 * - Replace with finally block contents (if present)
 */
function* simplifyTryStatements(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.TryStatement>(
    ast,
    'TryStatement',
    n => n.block,
  );
  yield* simplifyByReplacement<t.TryStatement>(ast, 'TryStatement', n =>
    n.handler ? n.handler.body : null,
  );
  yield* simplifyByReplacement<t.TryStatement>(
    ast,
    'TryStatement',
    n => n.finalizer,
  );
}

/**
 * Generator that simplifies single-statement block statements:
 * { statement } -> statement
 */
function* simplifySingleStatementBlocks(ast: t.File): Generator<t.File> {
  // Count block statements with exactly one statement
  let blockCount = 0;
  t.traverseFast(ast, node => {
    if (t.isBlockStatement(node) && node.body.length === 1) {
      blockCount++;
    }
  });

  for (let targetIdx = 0; targetIdx < blockCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      BlockStatement(path) {
        if (modified) return;
        if (path.node.body.length === 1 && idx === targetIdx) {
          // Don't unwrap blocks that require BlockStatement syntax
          if (
            t.isFunction(path.parent) ||
            t.isCatchClause(path.parent) ||
            t.isClassMethod(path.parent) ||
            t.isObjectMethod(path.parent) ||
            t.isTryStatement(path.parent)
          ) {
            idx++;
            return;
          }
          path.replaceWith(path.node.body[0]);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that replaces single-element arrays with the element itself
 */
function* simplifySingleElementArrays(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.ArrayExpression>(ast, 'ArrayExpression', n => {
    if (n.elements.length !== 1) return null;
    const elem = n.elements[0];
    return t.isExpression(elem) ? elem : null;
  });
}

/**
 * Generator that replaces single-property objects with the property value.
 * For regular properties: {key: value} -> value
 * For computed properties: {[key]: value} -> key (also try value)
 */
function* simplifySinglePropertyObjects(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.ObjectExpression>(
    ast,
    'ObjectExpression',
    n => {
      if (n.properties.length !== 1) return null;
      const prop = n.properties[0];
      return t.isObjectProperty(prop) && t.isExpression(prop.value)
        ? prop.value
        : null;
    },
  );

  // For computed properties, also try replacing with key
  yield* simplifyByReplacement<t.ObjectExpression>(
    ast,
    'ObjectExpression',
    n => {
      if (n.properties.length !== 1) return null;
      const prop = n.properties[0];
      return t.isObjectProperty(prop) &&
        prop.computed &&
        t.isExpression(prop.key)
        ? prop.key
        : null;
    },
  );
}

/**
 * Generator that simplifies assignment expressions (a = b) -> a or b
 */
function* simplifyAssignmentExpressions(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.AssignmentExpression>(
    ast,
    'AssignmentExpression',
    n => (t.isExpression(n.left) ? n.left : null),
  );
  yield* simplifyByReplacement<t.AssignmentExpression>(
    ast,
    'AssignmentExpression',
    n => n.right,
  );
}

/**
 * Generator that simplifies binary expressions (a + b) -> a or b
 */
function* simplifyBinaryExpressions(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.BinaryExpression>(
    ast,
    'BinaryExpression',
    n => n.left,
  );
  yield* simplifyByReplacement<t.BinaryExpression>(
    ast,
    'BinaryExpression',
    n => n.right,
  );
}

/**
 * Generator that simplifies member expressions (obj.value) -> obj
 * For computed expressions: obj[key] -> obj or key
 */
function* simplifyMemberExpressions(ast: t.File): Generator<t.File> {
  yield* simplifyByReplacement<t.MemberExpression>(
    ast,
    'MemberExpression',
    n => n.object,
  );

  // For computed expressions, also try replacing with key
  yield* simplifyByReplacement<t.MemberExpression>(
    ast,
    'MemberExpression',
    n => {
      if (!n.computed) return null;
      return t.isExpression(n.property) ? n.property : null;
    },
  );
}

/**
 * Helper to collect all unique identifier names in the AST
 */
function collectUniqueIdentifierNames(ast: t.File): Set<string> {
  const names = new Set<string>();
  t.traverseFast(ast, node => {
    if (t.isIdentifier(node)) {
      names.add(node.name);
    }
  });
  return names;
}

/**
 * Helper to rename all occurrences of an identifier throughout the AST
 */
function renameAllIdentifiers(
  ast: t.File,
  oldName: string,
  newName: string,
): boolean {
  let modified = false;
  t.traverseFast(ast, node => {
    if (t.isIdentifier(node) && node.name === oldName) {
      node.name = newName;
      modified = true;
    }
  });
  return modified;
}

/**
 * Generator that simplifies identifiers by removing "on" prefix.
 * onClick -> Click
 */
function* simplifyIdentifiersRemoveOnPrefix(ast: t.File): Generator<t.File> {
  const names = collectUniqueIdentifierNames(ast);

  for (const name of names) {
    // Check if name starts with "on" followed by uppercase letter
    if (
      name.length > 2 &&
      name.startsWith('on') &&
      name[2] === name[2].toUpperCase()
    ) {
      const newName = name.slice(2);
      // Skip if the new name would conflict with an existing identifier
      if (names.has(newName)) {
        continue;
      }
      const cloned = cloneAst(ast);
      if (renameAllIdentifiers(cloned, name, newName)) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies identifiers by removing "Ref" suffix.
 * inputRef -> input
 */
function* simplifyIdentifiersRemoveRefSuffix(ast: t.File): Generator<t.File> {
  const names = collectUniqueIdentifierNames(ast);

  for (const name of names) {
    // Check if name ends with "Ref" and has more characters before it
    if (name.length > 3 && name.endsWith('Ref')) {
      const newName = name.slice(0, -3);
      // Skip if the new name would conflict with an existing identifier
      if (names.has(newName)) {
        continue;
      }
      // Skip if new name would be empty or just whitespace
      if (newName.length === 0) {
        continue;
      }
      const cloned = cloneAst(ast);
      if (renameAllIdentifiers(cloned, name, newName)) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that rewrites "ref" identifier to "ref_" to avoid conflicts.
 */
function* simplifyIdentifiersRenameRef(ast: t.File): Generator<t.File> {
  const names = collectUniqueIdentifierNames(ast);

  if (names.has('ref')) {
    // Only rename if ref_ doesn't already exist
    if (!names.has('ref_')) {
      const cloned = cloneAst(ast);
      if (renameAllIdentifiers(cloned, 'ref', 'ref_')) {
        yield cloned;
      }
    }
  }
}

/**
 * All simplification strategies in order of priority (coarse to fine)
 */
const simplificationStrategies = [
  {name: 'removeStatements', generator: removeStatements},
  {name: 'removeCallArguments', generator: removeCallArguments},
  {name: 'removeFunctionParameters', generator: removeFunctionParameters},
  {name: 'removeArrayElements', generator: removeArrayElements},
  {name: 'removeObjectProperties', generator: removeObjectProperties},
  {name: 'removeArrayPatternElements', generator: removeArrayPatternElements},
  {
    name: 'removeObjectPatternProperties',
    generator: removeObjectPatternProperties,
  },
  {name: 'removeJSXAttributes', generator: removeJSXAttributes},
  {name: 'removeJSXChildren', generator: removeJSXChildren},
  {name: 'removeJSXFragmentChildren', generator: removeJSXFragmentChildren},
  {name: 'simplifyCallExpressions', generator: simplifyCallExpressions},
  {name: 'simplifyConditionals', generator: simplifyConditionals},
  {name: 'simplifyLogicalExpressions', generator: simplifyLogicalExpressions},
  {name: 'simplifyBinaryExpressions', generator: simplifyBinaryExpressions},
  {
    name: 'simplifyAssignmentExpressions',
    generator: simplifyAssignmentExpressions,
  },
  {name: 'simplifySingleElementArrays', generator: simplifySingleElementArrays},
  {
    name: 'simplifySinglePropertyObjects',
    generator: simplifySinglePropertyObjects,
  },
  {name: 'simplifyMemberExpressions', generator: simplifyMemberExpressions},
  {name: 'simplifyOptionalChains', generator: simplifyOptionalChains},
  {name: 'simplifyAwaitExpressions', generator: simplifyAwaitExpressions},
  {name: 'simplifyIfStatements', generator: simplifyIfStatements},
  {name: 'simplifySwitchStatements', generator: simplifySwitchStatements},
  {name: 'simplifyWhileStatements', generator: simplifyWhileStatements},
  {name: 'simplifyDoWhileStatements', generator: simplifyDoWhileStatements},
  {name: 'simplifyForStatements', generator: simplifyForStatements},
  {name: 'simplifyForInStatements', generator: simplifyForInStatements},
  {name: 'simplifyForOfStatements', generator: simplifyForOfStatements},
  {
    name: 'simplifyVariableDeclarations',
    generator: simplifyVariableDeclarations,
  },
  {name: 'simplifyTryStatements', generator: simplifyTryStatements},
  {
    name: 'simplifySingleStatementBlocks',
    generator: simplifySingleStatementBlocks,
  },
  {
    name: 'simplifyIdentifiersRemoveOnPrefix',
    generator: simplifyIdentifiersRemoveOnPrefix,
  },
  {
    name: 'simplifyIdentifiersRemoveRefSuffix',
    generator: simplifyIdentifiersRemoveRefSuffix,
  },
  {
    name: 'simplifyIdentifiersRenameRef',
    generator: simplifyIdentifiersRenameRef,
  },
];

type MinimizeResult =
  | {kind: 'success'}
  | {kind: 'minimal'}
  | {kind: 'minimized'; source: string};

/**
 * Core minimization loop that attempts to reduce the input source code
 * while preserving the compiler error.
 */
export function minimize(
  input: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
  useRust: boolean = false,
): MinimizeResult {
  // Load the compiler plugin
  const pluginSrc = useRust ? BABEL_PLUGIN_RUST_SRC : BABEL_PLUGIN_SRC;
  const importedCompilerPlugin = require(pluginSrc) as Record<string, unknown>;
  const BabelPluginReactCompiler = importedCompilerPlugin[
    'default'
  ] as PluginObj;
  const parseConfigPragmaForTests = importedCompilerPlugin[
    PARSE_CONFIG_PRAGMA_IMPORT
  ] as typeof ParseConfigPragma;

  // Get the initial error
  const initialResult = compileAndGetError(
    input,
    filename,
    language,
    sourceType,
    BabelPluginReactCompiler,
    parseConfigPragmaForTests,
  );

  if (initialResult.kind === 'success') {
    return {kind: 'success'};
  }

  if (initialResult.kind === 'parse_error') {
    return {kind: 'success'};
  }

  const targetError = initialResult;

  // Parse the initial AST
  let currentAst = parseInput(input, filename, language, sourceType);
  let currentCode = input;
  let changed = true;
  let iterations = 0;
  const maxIterations = 1000; // Safety limit

  process.stdout.write('\nMinimizing');

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Try each simplification strategy
    for (const strategy of simplificationStrategies) {
      const generator = strategy.generator(currentAst);

      for (const candidateAst of generator) {
        let candidateCode: string;
        try {
          candidateCode = astToCode(candidateAst);
        } catch {
          // If code generation fails, skip this candidate
          continue;
        }

        const result = compileAndGetError(
          candidateCode,
          filename,
          language,
          sourceType,
          BabelPluginReactCompiler,
          parseConfigPragmaForTests,
        );

        if (errorsMatch(targetError, result)) {
          // This simplification preserves the error, keep it
          currentAst = candidateAst;
          currentCode = candidateCode;
          changed = true;
          process.stdout.write('.');
          break; // Restart from the beginning with the new AST
        }
      }

      if (changed) {
        break; // Restart the outer loop
      }
    }
  }

  console.log('\n');

  // Check if any minimization was achieved
  if (currentCode === input) {
    return {kind: 'minimal'};
  }

  return {kind: 'minimized', source: currentCode};
}

/**
 * Compile code with a given plugin and return the output code (or error string).
 */
function compileAndGetOutput(
  code: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
  plugin: PluginObj,
  parseConfigPragmaFn: typeof ParseConfigPragma,
): string | null {
  let ast: t.File;
  try {
    ast = parseInput(code, filename, language, sourceType);
  } catch {
    return null;
  }

  const firstLine = code.substring(0, code.indexOf('\n'));
  const config = parseConfigPragmaFn(firstLine, {compilationMode: 'all'});
  const options = {
    ...config,
    environment: {
      ...config.environment,
    },
    logger: {
      logEvent: () => {},
      debugLogIRs: () => {},
    },
    enableReanimatedCheck: false,
  };

  try {
    const result = transformFromAstSync(ast, code, {
      filename: '/' + filename,
      highlightCode: false,
      retainLines: true,
      compact: true,
      plugins: [[plugin, options]],
      sourceType: 'module',
      ast: false,
      cloneInputAst: true,
      configFile: false,
      babelrc: false,
    });
    return result?.code ?? null;
  } catch (e: unknown) {
    return `ERROR: ${(e as Error).message}`;
  }
}

type MinimizeRustDeltaResult =
  | {kind: 'no_delta'}
  | {kind: 'minimal'}
  | {kind: 'minimized'; source: string};

/**
 * Core minimization loop that attempts to reduce the input source code
 * while preserving a delta (difference in output) between the TS and Rust compilers.
 */
export function minimizeRustDelta(
  input: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
): MinimizeRustDeltaResult {
  // Load both compiler plugins
  const importedTsPlugin = require(BABEL_PLUGIN_SRC) as Record<string, unknown>;
  const importedRustPlugin = require(BABEL_PLUGIN_RUST_SRC) as Record<
    string,
    unknown
  >;
  const tsPlugin = importedTsPlugin['default'] as PluginObj;
  const rustPlugin = importedRustPlugin['default'] as PluginObj;
  const parseConfigPragmaForTests = importedTsPlugin[
    PARSE_CONFIG_PRAGMA_IMPORT
  ] as typeof ParseConfigPragma;

  // Helper: check if TS and Rust outputs differ for given code
  function hasDelta(code: string): boolean {
    const tsOutput = compileAndGetOutput(
      code,
      filename,
      language,
      sourceType,
      tsPlugin,
      parseConfigPragmaForTests,
    );
    const rustOutput = compileAndGetOutput(
      code,
      filename,
      language,
      sourceType,
      rustPlugin,
      parseConfigPragmaForTests,
    );
    // Both null (e.g. parse error) means no delta
    if (tsOutput == null && rustOutput == null) return false;
    return tsOutput !== rustOutput;
  }

  // Verify the initial input has a delta
  if (!hasDelta(input)) {
    return {kind: 'no_delta'};
  }

  // Parse the initial AST
  let currentAst = parseInput(input, filename, language, sourceType);
  let currentCode = input;
  let changed = true;
  let iterations = 0;
  const maxIterations = 1000;

  process.stdout.write('\nMinimizing');

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const strategy of simplificationStrategies) {
      const generator = strategy.generator(currentAst);

      for (const candidateAst of generator) {
        let candidateCode: string;
        try {
          candidateCode = astToCode(candidateAst);
        } catch {
          continue;
        }

        if (hasDelta(candidateCode)) {
          currentAst = candidateAst;
          currentCode = candidateCode;
          changed = true;
          process.stdout.write('.');
          break;
        }
      }

      if (changed) {
        break;
      }
    }
  }

  console.log('\n');

  if (currentCode === input) {
    return {kind: 'minimal'};
  }

  return {kind: 'minimized', source: currentCode};
}
