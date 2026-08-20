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
