/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const {
  parse,
  SimpleTraverser: {traverse},
} = require('hermes-parser');
const fs = require('fs');
const through = require('through2');
const gs = require('glob-stream');

const {evalStringConcat} = require('../shared/evalToString');

const warnings = new Set();

function transform(file, enc, cb) {
  fs.readFile(file.path, 'utf8', function (err, source) {
    if (err) {
      cb(err);
      return;
    }

    let ast;
    try {
      ast = parse(source);
    } catch (error) {
      console.error('Failed to parse source file:', file.path);
      throw error;
    }

    traverse(ast, {
      enter() {},
      leave(node) {
        if (node.type !== 'CallExpression') {
          return;
        }
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'console' &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'warn' || callee.property.name === 'error')
        ) {
          // warning messages can be concatenated (`+`) at runtime, so here's
          // a trivial partial evaluator that interprets the literal value
          try {
            const warningMsgLiteral = evalStringConcat(node.arguments[0]);
            warnings.add(warningMsgLiteral);
          } catch {
            // Silently skip over this call. We have a lint rule to enforce
            // that all calls are extractable, so if this one fails, assume
            // it's intentional.
          }
        }
      },
    });

    cb(null);
  });
}

gs([
  'packages/**/*.js',
  '!packages/*/npm/**/*.js',
  '!packages/react-devtools*/**/*.js',
  '!**/__tests__/**/*.js',
  '!**/__mocks__/**/*.js',
  '!**/node_modules/**/*.js',
]).pipe(
  through.obj(transform, cb => {
    const warningsArray = Array.from(warnings);
    warningsArray.sort();
    process.stdout.write(
      `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @noformat
 * @oncall react_core
 */

export default ${JSON.stringify(warningsArray, null, 2)};
`
    );
    cb();
  })
);
