/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {RuleTester} from 'eslint';
import {allRules} from '../src/shared/ReactCompiler';

const ESLintTesterV8 = require('eslint-v8').RuleTester;

/**
 * A string template tag that removes padding from the left side of multi-line strings
 * @param {Array} strings array of code strings (only one expected)
 */
function normalizeIndent(strings: TemplateStringsArray): string {
  const codeLines = strings[0]?.split('\n') ?? [];
  const leftPadding = codeLines[1]?.match(/\s+/)![0] ?? '';
  return codeLines.map(line => line.slice(leftPadding.length)).join('\n');
}

type CompilerTestCases = {
  valid: RuleTester.ValidTestCase[];
  invalid: RuleTester.InvalidTestCase[];
};

const tests: CompilerTestCases = {
  valid: [
    // ===========================================
    // Tests for mayContainReactCode heuristic with Flow syntax
    // Files that should be SKIPPED (no React-like function names)
    // These contain code that WOULD trigger errors if compiled,
    // but since the heuristic skips them, no errors are reported.
    // ===========================================
    {
      name: '[Heuristic/Flow] Skips files with only lowercase utility functions',
      filename: 'utils.js',
      code: normalizeIndent`
        function helper(obj) {
          obj.key = 'value';
          return obj;
        }
      `,
    },
    {
      name: '[Heuristic/Flow] Skips lowercase arrow functions even with mutations',
      filename: 'helpers.js',
      code: normalizeIndent`
        const processData = (input) => {
          input.modified = true;
          return input;
        };
      `,
    },
    {
      name: '[Heuristic/Flow] Skips lowercase variable initialized with call expression wrapping a function',
      filename: 'utils.js',
      // Lowercase name means the heuristic skips this file entirely,
      // even though the init is a call expression wrapping a function.
      code: normalizeIndent`
        const helper = someWrapper(function(obj) {
          obj.key = 'value';
          return obj;
        });
      `,
    },
  ],
  invalid: [
    // ===========================================
    // Tests for mayContainReactCode heuristic with Flow component/hook syntax
    // These use Flow's component/hook declarations which should be detected
    // ===========================================
    {
      name: '[Heuristic/Flow] Compiles Flow component declaration - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        component MyComponent(a: {key: string}) {
          a.key = 'value';
          return <div />;
        }
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles exported Flow component declaration - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        export component MyComponent(a: {key: string}) {
          a.key = 'value';
          return <div />;
        }
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles default exported Flow component declaration - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        export default component MyComponent(a: {key: string}) {
          a.key = 'value';
          return <div />;
        }
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles Flow hook declaration - detects argument mutation',
      filename: 'hooks.js',
      code: normalizeIndent`
        hook useMyHook(a: {key: string}) {
          a.key = 'value';
          return a;
        }
      `,
      errors: [
        {
          message: /Modifying component props or hook arguments/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles exported Flow hook declaration - detects argument mutation',
      filename: 'hooks.js',
      code: normalizeIndent`
        export hook useMyHook(a: {key: string}) {
          a.key = 'value';
          return a;
        }
      `,
      errors: [
        {
          message: /Modifying component props or hook arguments/,
        },
      ],
    },
    // ===========================================
    // Tests for HOC-wrapped components (memo, forwardRef, etc.) with Flow parser
    // The heuristic must unwrap one level of CallExpression to detect these.
    // Regression tests for: const Comp = memo(function Comp() {...}) being
    // silently skipped while an equivalent plain function declaration was compiled.
    // ===========================================
    {
      name: '[Heuristic/Flow] Compiles memo-wrapped named function expression - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        const MyComponent = memo(function MyComponent({a}) {
          a.key = 'value';
          return <div />;
        });
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles memo-wrapped arrow function - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        const MyComponent = memo(({a}) => {
          a.key = 'value';
          return <div />;
        });
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles React.memo-wrapped function expression - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        const MyComponent = React.memo(function MyComponent({a}) {
          a.key = 'value';
          return <div />;
        });
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles forwardRef-wrapped function expression - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        const MyComponent = forwardRef(function MyComponent({a}, ref) {
          a.key = 'value';
          return <div ref={ref} />;
        });
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic/Flow] Compiles exported memo-wrapped component - detects prop mutation',
      filename: 'component.js',
      code: normalizeIndent`
        export const MyComponent = memo(function MyComponent({a}) {
          a.key = 'value';
          return <div />;
        });
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
  ],
};

const eslintTester = new ESLintTesterV8({
  parser: require.resolve('hermes-eslint'),
  parserOptions: {
    sourceType: 'module',
    enableExperimentalComponentSyntax: true,
  },
});
eslintTester.run('react-compiler', allRules['immutability'].rule, tests);
