/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/core';
import * as t from '@babel/types';
import {CompilerError} from '../CompilerError';
import {GeneratedSource} from '../HIR';
import {ProgramContext} from './Imports';
import {ExternalFunction} from '..';

/**
 * Gating rewrite for function declarations which are referenced before their
 * declaration site.
 *
 * ```js
 * // original
 * export default React.memo(Foo);
 * function Foo() { ... }
 *
 * // React compiler optimized + gated
 * import {gating} from 'myGating';
 * export default React.memo(Foo);
 * const gating_result = gating();  <- inserted
 * function Foo_optimized() {}      <- inserted
 * function Foo_unoptimized() {}    <- renamed from Foo
 * function Foo() {                 <- inserted function, which can be hoisted by JS engines
 *   if (gating_result) return Foo_optimized();
 *   else return Foo_unoptimized();
 * }
 * ```
 */
function insertAdditionalFunctionDeclaration(
  fnPath: NodePath<t.FunctionDeclaration>,
  compiled: t.FunctionDeclaration,
  programContext: ProgramContext,
  gatingFunctionIdentifierName: string,
): void {
  const originalFnName = fnPath.node.id;
  const originalFnParams = fnPath.node.params;
  const compiledParams = fnPath.node.params;
  /**
   * Note that other than `export default function() {}`, all other function
   * declarations must have a binding identifier. Since default exports cannot
   * be referenced, it's safe to assume that all function declarations passed
   * here will have an identifier.
   * https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions
   */
  CompilerError.invariant(originalFnName != null && compiled.id != null, {
    reason:
      'Expected function declarations that are referenced elsewhere to have a named identifier',
    loc: fnPath.node.loc ?? GeneratedSource,
  });
  CompilerError.invariant(originalFnParams.length === compiledParams.length, {
    reason:
      'Expected React Compiler optimized function declarations to have the same number of parameters as source',
    loc: fnPath.node.loc ?? GeneratedSource,
  });

  const gatingCondition = t.identifier(
    programContext.newUid(`${gatingFunctionIdentifierName}_result`),
  );
  const unoptimizedFnName = t.identifier(
    programContext.newUid(`${originalFnName.name}_unoptimized`),
  );
  const optimizedFnName = t.identifier(
    programContext.newUid(`${originalFnName.name}_optimized`),
  );
  /**
   * Step 1: rename existing functions
   */
  compiled.id.name = optimizedFnName.name;
  fnPath.get('id').replaceInline(unoptimizedFnName);

  /**
   * Step 2: insert new function declaration
   */
  const newParams: Array<t.Identifier | t.RestElement> = [];
  const genNewArgs: Array<() => t.Identifier | t.SpreadElement> = [];
  for (let i = 0; i < originalFnParams.length; i++) {
    const argName = `arg${i}`;
    if (originalFnParams[i].type === 'RestElement') {
      newParams.push(t.restElement(t.identifier(argName)));
      genNewArgs.push(() => t.spreadElement(t.identifier(argName)));
    } else {
      newParams.push(t.identifier(argName));
      genNewArgs.push(() => t.identifier(argName));
    }
  }
  // insertAfter called in reverse order of how nodes should appear in program
  fnPath.insertAfter(
    t.functionDeclaration(
      originalFnName,
      newParams,
      t.blockStatement([
        t.ifStatement(
          gatingCondition,
          t.returnStatement(
            t.callExpression(
              compiled.id,
              genNewArgs.map(fn => fn()),
            ),
          ),
          t.returnStatement(
            t.callExpression(
              unoptimizedFnName,
              genNewArgs.map(fn => fn()),
            ),
          ),
        ),
      ]),
    ),
  );
  fnPath.insertBefore(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        gatingCondition,
        t.callExpression(t.identifier(gatingFunctionIdentifierName), []),
      ),
    ]),
  );
  fnPath.insertBefore(compiled);
}
export function insertGatedFunctionDeclaration(
  fnPath: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
  compiled:
    | t.FunctionDeclaration
    | t.ArrowFunctionExpression
    | t.FunctionExpression,
  programContext: ProgramContext,
  gating: ExternalFunction,
  referencedBeforeDeclaration: boolean,
): void {
  const gatingImportedName = programContext.addImportSpecifier(gating).name;
  if (referencedBeforeDeclaration && fnPath.isFunctionDeclaration()) {
    CompilerError.invariant(compiled.type === 'FunctionDeclaration', {
      reason: 'Expected compiled node type to match input type',
      description: `Got ${compiled.type} but expected FunctionDeclaration`,
      loc: fnPath.node.loc ?? GeneratedSource,
    });
    insertAdditionalFunctionDeclaration(
      fnPath,
      compiled,
      programContext,
      gatingImportedName,
    );
  } else {
    const gatingExpression = t.conditionalExpression(
      t.callExpression(t.identifier(gatingImportedName), []),
      buildFunctionExpression(compiled),
      buildFunctionExpression(fnPath.node),
    );

    /*
     * Convert function declarations to named variables *unless* this is an
     * `export default function ...` since `export default const ...` is
     * not supported. For that case we fall through to replacing w the raw
     * conditional expression
     */
    if (
      fnPath.parentPath.node.type !== 'ExportDefaultDeclaration' &&
      fnPath.node.type === 'FunctionDeclaration' &&
      fnPath.node.id != null
    ) {
      fnPath.replaceWith(
        t.variableDeclaration('const', [
          t.variableDeclarator(fnPath.node.id, gatingExpression),
        ]),
      );
    } else if (
      fnPath.parentPath.node.type === 'ExportDefaultDeclaration' &&
      fnPath.node.type !== 'ArrowFunctionExpression' &&
      fnPath.node.id != null
    ) {
      fnPath.insertAfter(
        t.exportDefaultDeclaration(t.identifier(fnPath.node.id.name)),
      );
      fnPath.parentPath.replaceWith(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(fnPath.node.id.name),
            gatingExpression,
          ),
        ]),
      );
    } else {
      fnPath.replaceWith(gatingExpression);
    }
  }
}

function buildFunctionExpression(
  node:
    | t.FunctionDeclaration
    | t.ArrowFunctionExpression
    | t.FunctionExpression,
): t.ArrowFunctionExpression | t.FunctionExpression {
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
  ) {
    return node;
  } else {
    const fn: t.FunctionExpression = {
      type: 'FunctionExpression',
      async: node.async,
      generator: node.generator,
      loc: node.loc ?? null,
      id: node.id ?? null,
      params: node.params,
      body: node.body,
    };
    return fn;
  }
}
