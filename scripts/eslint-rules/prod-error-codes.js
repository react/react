/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const fs = require('fs');
const path = require('path');
const errorMap = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../error-codes/codes.json'))
);
const errorMessages = new Set();
Object.keys(errorMap).forEach(key => errorMessages.add(errorMap[key]));

function nodeToErrorTemplate(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  } else if (node.type === 'BinaryExpression' && node.operator === '+') {
    const l = nodeToErrorTemplate(node.left);
    const r = nodeToErrorTemplate(node.right);
    return l + r;
  } else if (node.type === 'TemplateLiteral') {
    let elements = [];
    for (let i = 0; i < node.quasis.length; i++) {
      const elementNode = node.quasis[i];
      if (elementNode.type !== 'TemplateElement') {
        throw new Error('Unsupported type ' + node.type);
      }
      elements.push(elementNode.value.cooked);
    }
    return elements.join('%s');
  } else {
    return '%s';
  }
}

module.exports = {
  meta: {
    schema: [],
  },
  create(context) {
    function ErrorCallExpression(node) {
      const errorMessageNode = node.arguments[0];
      if (errorMessageNode === undefined) {
        return;
      }
      const errorMessage = nodeToErrorTemplate(errorMessageNode);
      if (errorMessage === 'react-stack-top-frame') {
        // This is a special case for generating stack traces.
        return;
      }
      if (errorMessages.has(errorMessage)) {
        return;
      }
      context.report({
        node,
        message:
          'Error message does not have a corresponding production error code. Add ' +
          'the following message to codes.json so it can be stripped ' +
          'from the production builds:\n\n' +
          errorMessage,
      });
    }

    return {
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Error') {
          ErrorCallExpression(node);
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Error') {
          ErrorCallExpression(node);
        }
      },
    };
  },
};
