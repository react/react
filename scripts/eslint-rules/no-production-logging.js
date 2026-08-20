/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

module.exports = {
  meta: {
    fixable: 'code',
    schema: [],
  },
  create: function (context) {
    function isInDEVBlock(node) {
      let done = false;
      while (!done) {
        let parent = node.parent;
        if (!parent) {
          return false;
        }
        if (
          parent.type === 'IfStatement' &&
          node === parent.consequent &&
          parent.test.type === 'Identifier' &&
          // This is intentionally strict so we can
          // see blocks of DEV-only code at once.
          parent.test.name === '__DEV__'
        ) {
          return true;
        }
        node = parent;
      }
    }

    function reportWrapInDEV(node) {
      context.report({
        node: node,
        message: `Wrap console.{{identifier}}() in an "if (__DEV__) {}" check`,
        data: {
          identifier: node.property.name,
        },
        fix: function (fixer) {
          return [
            fixer.insertTextBefore(node.parent, `if (__DEV__) {`),
            fixer.insertTextAfter(node.parent, '}'),
          ];
        },
      });
    }

    function reportUnexpectedConsole(node) {
      context.report({
        node: node,
        message: `Unexpected use of console`,
      });
    }

    return {
      MemberExpression: function (node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          switch (node.property.name) {
            case 'error':
            case 'warn': {
              if (!isInDEVBlock(node)) {
                reportWrapInDEV(node);
              }
              break;
            }
            default: {
              reportUnexpectedConsole(node);
              break;
            }
          }
        }
      },
    };
  },
};
