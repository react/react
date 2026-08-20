/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const {evalStringAndTemplateConcat} = require('../shared/evalToString');
const invertObject = require('./invertObject');
const helperModuleImports = require('@babel/helper-module-imports');

const errorMap = invertObject(
  JSON.parse(fs.readFileSync(__dirname + '/codes.json', 'utf-8'))
);

const SEEN_SYMBOL = Symbol('transform-error-messages.seen');

module.exports = function (babel) {
  const t = babel.types;

  function ErrorCallExpression(path, file) {
    // Turns this code:
    //
    // new Error(`A ${adj} message that contains ${noun}`);
    //
    // or this code (no constructor):
    //
    // Error(`A ${adj} message that contains ${noun}`);
    //
    // into this:
    //
    // Error(formatProdErrorMessage(ERR_CODE, adj, noun));
    const node = path.node;
    if (node[SEEN_SYMBOL]) {
      return;
    }
    node[SEEN_SYMBOL] = true;

    const errorMsgNode = node.arguments[0];
    if (errorMsgNode === undefined) {
      return;
    }

    const errorMsgExpressions = [];
    const errorMsgLiteral = evalStringAndTemplateConcat(
      errorMsgNode,
      errorMsgExpressions
    );

    if (errorMsgLiteral === 'react-stack-top-frame') {
      // This is a special case for generating stack traces.
      return;
    }

    let prodErrorId = errorMap[errorMsgLiteral];
    if (prodErrorId === undefined) {
      // There is no error code for this message. Add an inline comment
      // that flags this as an unminified error. This allows the build
      // to proceed, while also allowing a post-build linter to detect it.
      //
      // Outputs:
      //   /* FIXME (minify-errors-in-prod): Unminified error message in production build! */
      //   /* <expected-error-format>"A % message that contains %"</expected-error-format> */
      //   if (!condition) {
      //     throw Error(`A ${adj} message that contains ${noun}`);
      //   }

      let leadingComments = [];

      const statementParent = path.getStatementParent();
      let nextPath = path;
      while (true) {
        let nextNode = nextPath.node;
        if (nextNode.leadingComments) {
          leadingComments.push(...nextNode.leadingComments);
        }
        if (nextPath === statementParent) {
          break;
        }
        nextPath = nextPath.parentPath;
      }

      if (leadingComments !== undefined) {
        for (let i = 0; i < leadingComments.length; i++) {
          // TODO: Since this only detects one of many ways to disable a lint
          // rule, we should instead search for a custom directive (like
          // no-minify-errors) instead of ESLint. Will need to update our lint
          // rule to recognize the same directive.
          const commentText = leadingComments[i].value;
          if (
            commentText.includes(
              'eslint-disable-next-line react-internal/prod-error-codes'
            )
          ) {
            return;
          }
        }
      }

      statementParent.addComment(
        'leading',
        `! <expected-error-format>"${errorMsgLiteral}"</expected-error-format>`
      );
      statementParent.addComment(
        'leading',
        '! FIXME (minify-errors-in-prod): Unminified error message in production build!'
      );
      return;
    }
    prodErrorId = parseInt(prodErrorId, 10);

    // Import formatProdErrorMessage
    const formatProdErrorMessageIdentifier = helperModuleImports.addDefault(
      path,
      'shared/formatProdErrorMessage',
      {nameHint: 'formatProdErrorMessage'}
    );

    // Outputs:
    //   formatProdErrorMessage(ERR_CODE, adj, noun);
    const prodMessage = t.callExpression(formatProdErrorMessageIdentifier, [
      t.numericLiteral(prodErrorId),
      ...errorMsgExpressions,
    ]);

    // Outputs:
    // Error(formatProdErrorMessage(ERR_CODE, adj, noun));
    const newErrorCall = t.callExpression(t.identifier('Error'), [
      prodMessage,
      ...node.arguments.slice(1),
    ]);
    newErrorCall[SEEN_SYMBOL] = true;
    path.replaceWith(newErrorCall);
  }

  return {
    visitor: {
      NewExpression(path, file) {
        if (path.get('callee').isIdentifier({name: 'Error'})) {
          ErrorCallExpression(path, file);
        }
      },

      CallExpression(path, file) {
        if (path.get('callee').isIdentifier({name: 'Error'})) {
          ErrorCallExpression(path, file);
          return;
        }
      },
    },
  };
};
