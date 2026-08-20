/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const rule = require('../safe-string-coercion');
const {RuleTester} = require('eslint');

RuleTester.setDefaultConfig({
  parser: require.resolve('babel-eslint'),
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
});

const ruleTester = new RuleTester();

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
const message =
  "Using `'' + value` or `value + ''` is fast to coerce strings, but may throw." +
  ' For prod code, add a DEV check from shared/CheckStringCoercion immediately' +
  ' before this coercion.' +
  ' For non-prod code and prod error handling, use `String(value)` instead.';

ruleTester.run('eslint-rules/safe-string-coercion', rule, {
  valid: [
    {
      code: 'String(obj)',
      options: [{isProductionUserAppCode: false}],
    },
    'String(obj)',
    "'a' + obj",
    `
      function getValueForAttribute(
        node,
        name,
        expected
      ) {
        if (__DEV__) {
          var value = node.getAttribute(name);
          if (__DEV__) {
            checkAttributeStringCoercion(expected, name);
          }
          if (value === '' + expected) {
            return expected;
          }
          return value;
        }
      }
    `,
    `
      if (__DEV__) { checkFormFieldValueStringCoercion (obj) }
      '' + obj;
    `,
    `
      function f(a, index) {
        if (typeof a === 'object' && a !== null && a.key != null) {
          if (__DEV__) {
            checkKeyStringCoercion(a.key);
          }
          return f('' + a.key);
        }
        return a;
      }
    `,
    "'' + i++",
    "'' + +i",
    "'' + +i",
    "+i + ''",
    "if (typeof obj === 'string') { '' + obj }",
    "if (typeof obj === 'string' || typeof obj === 'number') { '' + obj }",
    "if (typeof obj === 'string' && somethingElse) { '' + obj }",
    "if (typeof obj === 'number' && somethingElse) { '' + obj }",
    "if (typeof obj === 'bigint' && somethingElse) { '' + obj }",
    "if (typeof obj === 'undefined' && somethingElse) { '' + obj }",
    "if (typeof nextProp === 'number') { setTextContent(domElement, '' + nextProp); }",
    // These twe below are sneaky. The inner `if` is unsafe, but the outer `if`
    // ensures that the unsafe code will never be run. It's bad code, but
    // doesn't violate this rule.
    "if (typeof obj === 'string') { if (typeof obj === 'string' && obj.length) {} else {'' + obj} }",
    "if (typeof obj === 'string') if (typeof obj === 'string' && obj.length) {} else {'' + obj}",
    "'' + ''",
    "'' + '' + ''",
    "`test${foo}` + ''",
  ],
  invalid: [
    {
      code: "'' + obj",
      errors: [
        {
          message: missingDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: "obj + ''",
      errors: [
        {
          message: missingDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: 'String(obj)',
      options: [{isProductionUserAppCode: true}],
      errors: [
        {
          message:
            "For perf-sensitive coercion, avoid `String(value)`. Instead, use `'' + value`." +
            ' Precede it with a DEV check from shared/CheckStringCoercion' +
            ' unless Symbol and Temporal.* values are impossible.' +
            ' For non-prod code and prod error handling, use `String(value)` and disable this rule.',
        },
      ],
    },
    {
      code: "if (typeof obj === 'object') { '' + obj }",
      errors: [
        {
          message: missingDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: "if (typeof obj === 'string') { } else if (typeof obj === 'object') {'' + obj}",
      errors: [
        {
          message: missingDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: "if (typeof obj === 'string' && obj.length) {} else {'' + obj}",
      errors: [
        {
          message: missingDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: `
          if (__D__) { checkFormFieldValueStringCoercion (obj) }
          '' + obj;
        `,
      errors: [
        {
          message: prevStatementNotDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: `
          if (__DEV__) { checkFormFieldValueStringCoercion (obj) }
          '' + notobjj;
        `,
      errors: [
        {
          message:
            'Value passed to the check function before this coercion must match the value being coerced.' +
            '\n' +
            message,
        },
      ],
    },
    {
      code: `
          if (__DEV__) { checkFormFieldValueStringCoercion (obj) }
          // must be right before the check call
          someOtherCode();
          '' + objj;
        `,
      errors: [
        {
          message: prevStatementNotDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: `
          if (__DEV__) { chexxxxBadNameCoercion (obj) }
          '' + objj;
        `,
      errors: [
        {
          message:
            'Missing or invalid check function call before this coercion.' +
            ' Expected: call of a function like checkXXXStringCoercion. ' +
            prevStatementNotDevCheckMessage +
            '\n' +
            message,
        },
      ],
    },
    {
      code: `
          if (__DEV__) {  }
          '' + objj;
        `,
      errors: [
        {
          message: prevStatementNotDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: `
          if (__DEV__) { if (x) {} }
          '' + objj;
        `,
      errors: [
        {
          message:
            'The DEV block before this coercion must only contain an expression. ' +
            prevStatementNotDevCheckMessage +
            '\n' +
            message,
        },
      ],
    },
    {
      code: `
        if (a) {
          if (__DEV__) {
            // can't have additional code before the check call
            if (b) {
              checkKeyStringCoercion(obj);
            }
          }
          g = f( c, d + (b ? '' + obj : '') + e);
        }
      `,
      errors: [
        {
          message:
            'The DEV block before this coercion must only contain an expression. ' +
            prevStatementNotDevCheckMessage +
            '\n' +
            message,
        },
      ],
    },
    {
      code: `
        if (__DEV__) {
          checkAttributeStringCoercion(expected, name);
        }
        // DEV check should be inside the if block
        if (a && b) {
          f('' + expected);
        }
      `,
      errors: [
        {
          message: missingDevCheckMessage + '\n' + message,
        },
      ],
    },
    {
      code: `'' + obj + ''`,
      errors: [
        {message: missingDevCheckMessage + '\n' + message},
        {message: missingDevCheckMessage + '\n' + message},
      ],
    },
    {
      code: `foo\`text\` + ""`,
      errors: [{message: missingDevCheckMessage + '\n' + message}],
    },
  ],
});
