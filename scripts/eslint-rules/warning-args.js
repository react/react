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
const existingErrorMap = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../error-codes/codes.json'))
);
const messages = new Set();
Object.keys(existingErrorMap).forEach(key =>
  messages.add(existingErrorMap[key])
);

/**
 * The warning() function takes format strings as its second
 * argument.
 */

module.exports = {
  meta: {
    schema: [],
  },
  create(context) {
    // we also allow literal strings and concatenated literal strings
    function getLiteralString(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
      } else if (node.type === 'BinaryExpression' && node.operator === '+') {
        const l = getLiteralString(node.left);
        const r = getLiteralString(node.right);
        if (l !== null && r !== null) {
          return l + r;
        }
      }
      return null;
    }

    return {
      CallExpression: function (node) {
        // This could be a little smarter by checking context.getScope() to see
        // how warning/invariant was defined.
        const isWarning =
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === 'error' ||
            node.callee.property.name === 'warn');
        if (!isWarning) {
          return;
        }
        const name = 'console.' + node.callee.property.name;
        if (node.arguments.length < 1) {
          context.report(node, '{{name}} takes at least one argument', {
            name,
          });
          return;
        }
        const format = getLiteralString(node.arguments[0]);
        if (format === null) {
          context.report(
            node,
            'The first argument to {{name}} must be a string literal',
            {name}
          );
          return;
        }
        if (
          (format.length < 10 || /^[s\W]*$/.test(format)) &&
          format !== '%s\n\n%s\n'
        ) {
          context.report(
            node,
            'The {{name}} format should be able to uniquely identify this ' +
              'warning. Please, use a more descriptive format than: {{format}}',
            {name, format}
          );
          return;
        }
        // count the number of formatting substitutions, plus the first two args
        const expectedNArgs = (format.match(/%[so]/g) || []).length + 1;
        if (node.arguments.length !== expectedNArgs) {
          context.report(
            node,
            'Expected {{expectedNArgs}} arguments in call to {{name}} based on ' +
              'the number of "%s" substitutions, but got {{length}}',
            {
              expectedNArgs: expectedNArgs,
              name,
              length: node.arguments.length,
            }
          );
        }
      },
    };
  },
};
