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
    {
      name: 'Basic example',
      filename: 'test.tsx',
      code: normalizeIndent`
        function Button(props) {
          return null;
        }
      `,
    },
    {
      name: 'Repro for hooks as normal values',
      filename: 'test.tsx',
      code: normalizeIndent`
        function Button(props) {
          const scrollview = React.useRef<ScrollView>(null);
          return <Button thing={scrollview} />;
        }
      `,
    },
    // ===========================================
    // Tests for mayContainReactCode heuristic
    // Files that should be SKIPPED (no React-like function names)
    // These contain code that WOULD trigger errors if compiled,
    // but since the heuristic skips them, no errors are reported.
    // ===========================================
    {
      name: '[Heuristic] Skips files with only lowercase utility functions',
      filename: 'utils.ts',
      // This mutates an argument, which would be flagged in a component/hook,
      // but this file is skipped because there are no React-like function names
      code: normalizeIndent`
        function helper(obj) {
          obj.key = 'value';
          return obj;
        }
      `,
    },
    {
      name: '[Heuristic] Skips lowercase arrow functions even with mutations',
      filename: 'helpers.ts',
      // Would be flagged if compiled, but skipped due to lowercase name
      code: normalizeIndent`
        const processData = (input) => {
          input.modified = true;
          return input;
        };
      `,
    },
  ],
  invalid: [
    {
      name: 'Mutating useState value',
      filename: 'test.tsx',
      code: `
        import { useState } from 'react';
        function Component(props) {
          // typescript syntax that hermes-parser doesn't understand yet
          const x: \`foo\${1}\` = 'foo1';
          const [state, setState] = useState({a: 0});
          state.a = 1;
          return <div>{props.foo}</div>;
        }
      `,
      errors: [
        {
          message: /Modifying a value returned from 'useState\(\)'/,
          line: 7,
        },
      ],
    },
    // ===========================================
    // Tests for mayContainReactCode heuristic
    // Files that SHOULD be compiled (have React-like function names)
    // These contain violations to prove compilation happens.
    // ===========================================
    {
      name: '[Heuristic] Compiles PascalCase function declaration - detects prop mutation',
      filename: 'component.tsx',
      code: normalizeIndent`
        function MyComponent({a}) {
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
      name: '[Heuristic] Compiles PascalCase arrow function - detects prop mutation',
      filename: 'component.tsx',
      code: normalizeIndent`
        const MyComponent = ({a}) => {
          a.key = 'value';
          return <div />;
        };
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic] Compiles PascalCase function expression - detects prop mutation',
      filename: 'component.tsx',
      code: normalizeIndent`
        const MyComponent = function({a}) {
          a.key = 'value';
          return <div />;
        };
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic] Compiles exported function declaration - detects prop mutation',
      filename: 'component.tsx',
      code: normalizeIndent`
        export function MyComponent({a}) {
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
      name: '[Heuristic] Compiles exported arrow function - detects prop mutation',
      filename: 'component.tsx',
      code: normalizeIndent`
        export const MyComponent = ({a}) => {
          a.key = 'value';
          return <div />;
        };
      `,
      errors: [
        {
          message: /Modifying component props/,
        },
      ],
    },
    {
      name: '[Heuristic] Compiles default exported function - detects prop mutation',
      filename: 'component.tsx',
      code: normalizeIndent`
        export default function MyComponent({a}) {
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
  ],
};

const eslintTester = new ESLintTesterV8({
  parser: require.resolve('@typescript-eslint/parser-v5'),
});
eslintTester.run('react-compiler', allRules['immutability'].rule, tests);
