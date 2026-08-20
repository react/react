/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as BabelCore from '@babel/core';
import {NodePath} from '@babel/core';
import * as t from '@babel/types';

export default function AnnotateReactCodeBabelPlugin(
  _babel: typeof BabelCore,
): BabelCore.PluginObj {
  return {
    name: 'annotate-react-code',
    visitor: {
      Program(prog): void {
        annotate(prog);
      },
    },
  };
}

function annotate(program: NodePath<t.Program>): void {
  function traverseFn(fn: BabelFn): void {
    if (!shouldVisit(fn)) {
      return;
    }

    fn.skip();

    const body = fn.node.body;
    if (t.isBlockStatement(body)) {
      body.body.unshift(buildTypeOfReactForget());
    }
  }

  program.traverse({
    FunctionDeclaration: traverseFn,
    FunctionExpression: traverseFn,
    ArrowFunctionExpression: traverseFn,
  });
}

function shouldVisit(fn: BabelFn): boolean {
  return (
    // Component declarations are known components
    (fn.isFunctionDeclaration() && isComponentDeclaration(fn.node)) ||
    // Otherwise check if this is a component or hook-like function
    isComponentOrHookLike(fn)
  );
}

function buildTypeOfReactForget(): t.Statement {
  // typeof globalThis[Symbol.for("react_forget")]
  return t.expressionStatement(
    t.unaryExpression(
      'typeof',
      t.memberExpression(
        t.identifier('globalThis'),
        t.callExpression(
          t.memberExpression(
            t.identifier('Symbol'),
            t.identifier('for'),
            false,
            false,
          ),
          [t.stringLiteral('react_forget')],
        ),
        true,
        false,
      ),
      true,
    ),
  );
}

/**
 * COPIED FROM babel-plugin-react-compiler/src/Entrypoint/BabelUtils.ts
 */
type ComponentDeclaration = t.FunctionDeclaration & {
  __componentDeclaration: boolean;
};

type BabelFn =
  | NodePath<t.FunctionDeclaration>
  | NodePath<t.FunctionExpression>
  | NodePath<t.ArrowFunctionExpression>;

export function isComponentDeclaration(
  node: t.FunctionDeclaration,
): node is ComponentDeclaration {
  return Object.prototype.hasOwnProperty.call(node, '__componentDeclaration');
}

/*
 * Adapted from the ESLint rule at
 * https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/RulesOfHooks.js#L90-L103
 */
function isComponentOrHookLike(
  node: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
): boolean {
  const functionName = getFunctionName(node);
  // Check if the name is component or hook like:
  if (functionName !== null && isComponentName(functionName)) {
    return (
      // As an added check we also look for hook invocations or JSX
      callsHooksOrCreatesJsx(node) &&
      /*
       * and avoid helper functions that take more than one argument
       * helpers are _usually_ named with lowercase, but some code may
       * violate this rule
       */
      node.get('params').length <= 1
    );
  } else if (functionName !== null && isHook(functionName)) {
    // Hooks have hook invocations or JSX, but can take any # of arguments
    return callsHooksOrCreatesJsx(node);
  }

  /*
   * Otherwise for function or arrow function expressions, check if they
   * appear as the argument to React.forwardRef() or React.memo():
   */
  if (node.isFunctionExpression() || node.isArrowFunctionExpression()) {
    if (isForwardRefCallback(node) || isMemoCallback(node)) {
      // As an added check we also look for hook invocations or JSX
      return callsHooksOrCreatesJsx(node);
    } else {
      return false;
    }
  }
  return false;
}

function isHookName(s: string): boolean {
  return /^use[A-Z0-9]/.test(s);
}

/*
 * We consider hooks to be a hook name identifier or a member expression
 * containing a hook name.
 */

function isHook(path: NodePath<t.Expression | t.PrivateName>): boolean {
  if (path.isIdentifier()) {
    return isHookName(path.node.name);
  } else if (
    path.isMemberExpression() &&
    !path.node.computed &&
    isHook(path.get('property'))
  ) {
    const obj = path.get('object').node;
    const isPascalCaseNameSpace = /^[A-Z].*/;
    return obj.type === 'Identifier' && isPascalCaseNameSpace.test(obj.name);
  } else {
    return false;
  }
}

/*
 * Checks if the node is a React component name. React component names must
 * always start with an uppercase letter.
 */

function isComponentName(path: NodePath<t.Expression>): boolean {
  return path.isIdentifier() && /^[A-Z]/.test(path.node.name);
}
/*
 * Checks if the node is a callback argument of forwardRef. This render function
 * should follow the rules of hooks.
 */

function isForwardRefCallback(path: NodePath<t.Expression>): boolean {
  return !!(
    path.parentPath.isCallExpression() &&
    path.parentPath.get('callee').isExpression() &&
    isReactAPI(path.parentPath.get('callee'), 'forwardRef')
  );
}

/*
 * Checks if the node is a callback argument of React.memo. This anonymous
 * functional component should follow the rules of hooks.
 */

function isMemoCallback(path: NodePath<t.Expression>): boolean {
  return (
    path.parentPath.isCallExpression() &&
    path.parentPath.get('callee').isExpression() &&
    isReactAPI(path.parentPath.get('callee'), 'memo')
  );
}

function isReactAPI(
  path: NodePath<t.Expression | t.PrivateName | t.V8IntrinsicIdentifier>,
  functionName: string,
): boolean {
  const node = path.node;
  return (
    (node.type === 'Identifier' && node.name === functionName) ||
    (node.type === 'MemberExpression' &&
      node.object.type === 'Identifier' &&
      node.object.name === 'React' &&
      node.property.type === 'Identifier' &&
      node.property.name === functionName)
  );
}

function callsHooksOrCreatesJsx(node: NodePath<t.Node>): boolean {
  let invokesHooks = false;
  let createsJsx = false;
  node.traverse({
    JSX() {
      createsJsx = true;
    },
    CallExpression(call) {
      const callee = call.get('callee');
      if (callee.isExpression() && isHook(callee)) {
        invokesHooks = true;
      }
    },
  });

  return invokesHooks || createsJsx;
}

/*
 * Gets the static name of a function AST node. For function declarations it is
 * easy. For anonymous function expressions it is much harder. If you search for
 * `IsAnonymousFunctionDefinition()` in the ECMAScript spec you'll find places
 * where JS gives anonymous function expressions names. We roughly detect the
 * same AST nodes with some exceptions to better fit our use case.
 */

function getFunctionName(
  path: NodePath<
    t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  >,
): NodePath<t.Expression> | null {
  if (path.isFunctionDeclaration()) {
    const id = path.get('id');
    if (id.isIdentifier()) {
      return id;
    }
    return null;
  }
  let id: NodePath<t.LVal | t.Expression | t.PrivateName> | null = null;
  const parent = path.parentPath;
  if (parent.isVariableDeclarator() && parent.get('init').node === path.node) {
    // const useHook = () => {};
    id = parent.get('id');
  } else if (
    parent.isAssignmentExpression() &&
    parent.get('right').node === path.node &&
    parent.get('operator') === '='
  ) {
    // useHook = () => {};
    id = parent.get('left');
  } else if (
    parent.isProperty() &&
    parent.get('value').node === path.node &&
    !parent.get('computed') &&
    parent.get('key').isLVal()
  ) {
    /*
     * {useHook: () => {}}
     * {useHook() {}}
     */
    id = parent.get('key');
  } else if (
    parent.isAssignmentPattern() &&
    parent.get('right').node === path.node &&
    !parent.get('computed')
  ) {
    /*
     * const {useHook = () => {}} = {};
     * ({useHook = () => {}} = {});
     *
     * Kinda clowny, but we'd said we'd follow spec convention for
     * `IsAnonymousFunctionDefinition()` usage.
     */
    id = parent.get('left');
  }
  if (id !== null && (id.isIdentifier() || id.isMemberExpression())) {
    return id;
  } else {
    return null;
  }
}
