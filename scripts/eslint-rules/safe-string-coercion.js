/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

function isEmptyLiteral(node) {
  return (
    node.type === 'Literal' &&
    typeof node.value === 'string' &&
    node.value === ''
  );
}

function isStringLiteral(node) {
  return (
    // TaggedTemplateExpressions can return non-strings
    (node.type === 'TemplateLiteral' &&
      node.parent.type !== 'TaggedTemplateExpression') ||
    (node.type === 'Literal' && typeof node.value === 'string')
  );
}

// Symbols and Temporal.* objects will throw when using `'' + value`, but that
// pattern can be faster than `String(value)` because JS engines can optimize
// `+` better in some cases. Therefore, in perf-sensitive production codepaths
// we require using `'' + value` for string coercion. The only exception is prod
// error handling code, because it's bad to crash while assembling an error
// message or call stack! Also, error-handling code isn't usually perf-critical.
//
// Non-production codepaths (tests, devtools extension, build tools, etc.)
// should use `String(value)` because it will never crash and the (small) perf
// difference doesn't matter enough for non-prod use cases.
//
// This rule assists enforcing these guidelines:
// * `'' + value` is flagged with a message to remind developers to add a DEV
//   check from shared/CheckStringCoercion.js to make sure that the user gets a
//   clear error message in DEV is the coercion will throw. These checks are not
//   needed if throwing is not possible, e.g. if the value is already known to
//   be a string or number.
// * `String(value)` is flagged only if the `isProductionUserAppCode` option
//   is set. Set this option for prod code files, and don't set it for non-prod
//   files.

const ignoreKeys = [
  'range',
  'raw',
  'parent',
  'loc',
  'start',
  'end',
  '_babelType',
  'leadingComments',
  'trailingComments',
];
function astReplacer(key, value) {
  return ignoreKeys.includes(key) ? undefined : value;
}

/**
 * Simplistic comparison between AST node. Only the following patterns are
 * supported because that's almost all (all?) usage in React:
 * - Identifiers, e.g. `foo`
 * - Member access, e.g. `foo.bar`
 * - Array access with numeric literal, e.g. `foo[0]`
 */
function isEquivalentCode(node1, node2) {
  return (
    JSON.stringify(node1, astReplacer) === JSON.stringify(node2, astReplacer)
  );
}

function isDescendant(node, maybeParentNode) {
  let parent = node.parent;
  while (parent) {
    if (!parent) {
      return false;
    }
    if (parent === maybeParentNode) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function isSafeTypeofExpression(originalValueNode, node) {
  if (node.type === 'BinaryExpression') {
    // Example: typeof foo === 'string'
    if (node.operator !== '===') {
      return false;
    }
    const {left, right} = node;

    // left must be `typeof original`
    if (left.type !== 'UnaryExpression' || left.operator !== 'typeof') {
      return false;
    }
    if (!isEquivalentCode(left.argument, originalValueNode)) {
      return false;
    }
    // right must be a literal value of a safe type
    const safeTypes = ['string', 'number', 'boolean', 'undefined', 'bigint'];
    if (right.type !== 'Literal' || !safeTypes.includes(right.value)) {
      return false;
    }
    return true;
  } else if (node.type === 'LogicalExpression') {
    // Examples:
    // * typeof foo === 'string' && typeof foo === 'number
    // * typeof foo === 'string' && someOtherTest
    if (node.operator === '&&') {
      return (
        isSafeTypeofExpression(originalValueNode, node.left) ||
        isSafeTypeofExpression(originalValueNode, node.right)
      );
    } else if (node.operator === '||') {
      return (
        isSafeTypeofExpression(originalValueNode, node.left) &&
        isSafeTypeofExpression(originalValueNode, node.right)
      );
    }
  }
  return false;
}

/**
  Returns true if the code is inside an `if` block that validates the value
  excludes symbols and objects. Examples:
  * if (typeof value === 'string') { }
  * if (typeof value === 'string' || typeof value === 'number') { }
  * if (typeof value === 'string' || someOtherTest) { }

  @param - originalValueNode Top-level expression to test. Kept unchanged during
  recursion.
  @param - node Expression to test at current recursion level. Will be undefined
  on non-recursive call.
*/
function isInSafeTypeofBlock(originalValueNode, node) {
  if (!node) {
    node = originalValueNode;
  }
  let parent = node.parent;
  while (parent) {
    if (!parent) {
      return false;
    }
    // Normally, if the parent block is inside a type-safe `if` statement,
    // then all child code is also type-safe. But there's a quirky case we
    // need to defend against:
    //   if (typeof obj === 'string') { } else if (typeof obj === 'object') {'' + obj}
    //   if (typeof obj === 'string') { } else {'' + obj}
    // In that code above, the `if` block is safe, but the `else` block is
    // unsafe and should report. But the AST parent of the `else` clause is the
    // `if` statement. This is the one case where the parent doesn't confer
    // safety onto the child. The code below identifies that case and keeps
    // moving up the tree until we get out of the `else`'s parent `if` block.
    // This ensures that we don't use any of these "parents" (really siblings)
    // to confer safety onto the current node.
    if (
      parent.type === 'IfStatement' &&
      !isDescendant(originalValueNode, parent.alternate)
    ) {
      const test = parent.test;
      if (isSafeTypeofExpression(originalValueNode, test)) {
        return true;
      }
    }
    parent = parent.parent;
  }
}

const missingDevCheckMessage =
  'Missing DEV check before this string coercion.' +
  ' Check should be in this format:\n' +
  '  if (__DEV__) {\n' +
  '    checkXxxxxStringCoercion(value);\n' +
  '  }';

const prevStatementNotDevCheckMessage =
  'The statement before this coercion must be a DEV check in this format:\n' +
  '  if (__DEV__) {\n' +
  '    checkXxxxxStringCoercion(value);\n' +
  '  }';

/**
 * Does this node have an "is coercion safe?" DEV check
 * in the same block?
 */
function hasCoercionCheck(node) {
  // find the containing statement
  let topOfExpression = node;
  while (!topOfExpression.parent.body) {
    topOfExpression = topOfExpression.parent;
    if (!topOfExpression) {
      return 'Cannot find top of expression.';
    }
  }
  const containingBlock = topOfExpression.parent.body;
  const index = containingBlock.indexOf(topOfExpression);
  if (index <= 0) {
    return missingDevCheckMessage;
  }
  const prev = containingBlock[index - 1];

  // The previous statement is expected to be like this:
  //   if (__DEV__) {
  //     checkFormFieldValueStringCoercion(foo);
  //   }
  // where `foo` must be equivalent to `node` (which is the
  // mixed value being coerced to a string).
  if (
    prev.type !== 'IfStatement' ||
    prev.test.type !== 'Identifier' ||
    prev.test.name !== '__DEV__'
  ) {
    return prevStatementNotDevCheckMessage;
  }
  let maybeCheckNode = prev.consequent;
  if (maybeCheckNode.type === 'BlockStatement') {
    const body = maybeCheckNode.body;
    if (body.length === 0) {
      return prevStatementNotDevCheckMessage;
    }
    if (body.length !== 1) {
      return (
        'Too many statements in DEV block before this coercion.' +
        ' Expected only one (the check function call). ' +
        prevStatementNotDevCheckMessage
      );
    }
    maybeCheckNode = body[0];
  }

  if (maybeCheckNode.type !== 'ExpressionStatement') {
    return (
      'The DEV block before this coercion must only contain an expression. ' +
      prevStatementNotDevCheckMessage
    );
  }

  const call = maybeCheckNode.expression;
  if (
    call.type !== 'CallExpression' ||
    call.callee.type !== 'Identifier' ||
    !/^check(\w+?)StringCoercion$/.test(call.callee.name) ||
    !call.arguments.length
  ) {
    // `maybeCheckNode` should be a call of a function named checkXXXStringCoercion
    return (
      'Missing or invalid check function call before this coercion.' +
      ' Expected: call of a function like checkXXXStringCoercion. ' +
      prevStatementNotDevCheckMessage
    );
  }

  const same = isEquivalentCode(call.arguments[0], node);
  if (!same) {
    return (
      'Value passed to the check function before this coercion' +
      ' must match the value being coerced.'
    );
  }
}

function isOnlyAddingStrings(node) {
  if (node.operator !== '+') {
    return;
  }
  if (isStringLiteral(node.left) && isStringLiteral(node.right)) {
    // It's always safe to add string literals
    return true;
  }
  if (node.left.type === 'BinaryExpression' && isStringLiteral(node.right)) {
    return isOnlyAddingStrings(node.left);
  }
}

function checkBinaryExpression(context, node) {
  if (isOnlyAddingStrings(node)) {
    return;
  }

  if (
    node.operator === '+' &&
    (isEmptyLiteral(node.left) || isEmptyLiteral(node.right))
  ) {
    let valueToTest = isEmptyLiteral(node.left) ? node.right : node.left;
    if (
      (valueToTest.type === 'TypeCastExpression' ||
        valueToTest.type === 'AsExpression') &&
      valueToTest.expression
    ) {
      valueToTest = valueToTest.expression;
    }

    if (
      valueToTest.type === 'Identifier' &&
      ['i', 'idx', 'lineNumber'].includes(valueToTest.name)
    ) {
      // Common non-object variable names are assumed to be safe
      return;
    }
    if (
      valueToTest.type === 'UnaryExpression' ||
      valueToTest.type === 'UpdateExpression'
    ) {
      // Any unary expression will return a non-object, non-symbol type.
      return;
    }
    if (isInSafeTypeofBlock(valueToTest)) {
      // The value is inside an if (typeof...) block that ensures it's safe
      return;
    }
    const coercionCheckMessage = hasCoercionCheck(valueToTest);
    if (!coercionCheckMessage) {
      // The previous statement is a correct check function call, so no report.
      return;
    }

    context.report({
      node,
      message:
        coercionCheckMessage +
        '\n' +
        "Using `'' + value` or `value + ''` is fast to coerce strings, but may throw." +
        ' For prod code, add a DEV check from shared/CheckStringCoercion immediately' +
        ' before this coercion.' +
        ' For non-prod code and prod error handling, use `String(value)` instead.',
    });
  }
}

function coerceWithStringConstructor(context, node) {
  const isProductionUserAppCode =
    context.options[0] && context.options[0].isProductionUserAppCode;
  if (isProductionUserAppCode && node.callee.name === 'String') {
    context.report(
      node,
      "For perf-sensitive coercion, avoid `String(value)`. Instead, use `'' + value`." +
        ' Precede it with a DEV check from shared/CheckStringCoercion' +
        ' unless Symbol and Temporal.* values are impossible.' +
        ' For non-prod code and prod error handling, use `String(value)` and disable this rule.'
    );
  }
}

module.exports = {
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          isProductionUserAppCode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    return {
      BinaryExpression: node => checkBinaryExpression(context, node),
      CallExpression: node => coerceWithStringConstructor(context, node),
    };
  },
};
