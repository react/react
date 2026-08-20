/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  normalizeIndent,
  testRule,
  makeTestCaseError,
  TestRecommendedRules,
} from './shared-utils';
import {RuleTester as ESLintTester} from 'eslint';
import {allRules, recommendedRules} from '../src/rules/ReactCompilerRule';
import {configs} from '../src/index';
import type {Rule} from 'eslint';

/**
 * Check if the Rust compiler native module is available.
 * Tests in this file are skipped if the module is not built.
 */
let rustAvailable = false;
try {
  require('babel-plugin-react-compiler-rust');
  rustAvailable = true;
} catch {
  rustAvailable = false;
}

const describeIfRust = rustAvailable ? describe : describe.skip;

/**
 * Aggregates all recommended rules but passes __unstable_useRustCompiler
 * to each rule via the options.
 */
const TestRecommendedRulesRust: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Test recommended rules with Rust backend',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [{type: 'object', additionalProperties: true}],
  },
  create(context) {
    for (const ruleConfig of Object.values(
      configs.recommended.plugins['react-compiler'].rules,
    )) {
      const listener = ruleConfig.rule.create(context);
      if (Object.entries(listener).length !== 0) {
        throw new Error('TODO: handle rules that return listeners to eslint');
      }
    }
    return {};
  },
};

function testRuleWithRust(
  name: string,
  rule: Rule.RuleModule,
  tests: {
    valid: ESLintTester.ValidTestCase[];
    invalid: ESLintTester.InvalidTestCase[];
  },
): void {
  const eslintTester = new ESLintTester({
    // @ts-ignore[2353] - outdated types
    parser: require.resolve('hermes-eslint'),
    parserOptions: {
      ecmaVersion: 2015,
      sourceType: 'module',
      enableExperimentalComponentSyntax: true,
    },
  });

  // Inject __unstable_useRustCompiler into all test cases
  const withRust = (
    cases: ESLintTester.ValidTestCase[],
  ): ESLintTester.ValidTestCase[] =>
    cases.map(tc => ({
      ...tc,
      options: [{...(tc.options?.[0] ?? {}), __unstable_useRustCompiler: true}],
    }));

  const withRustInvalid = (
    cases: ESLintTester.InvalidTestCase[],
  ): ESLintTester.InvalidTestCase[] =>
    cases.map(tc => ({
      ...tc,
      options: [{...(tc.options?.[0] ?? {}), __unstable_useRustCompiler: true}],
    }));

  eslintTester.run(name, rule, {
    valid: withRust(tests.valid),
    invalid: withRustInvalid(tests.invalid),
  });
}

describeIfRust('Rust backend', () => {
  testRuleWithRust('rust-backend-recommended', TestRecommendedRulesRust, {
    valid: [
      {
        name: 'Basic component compiles without errors',
        code: normalizeIndent`
          function Component(props) {
            return <div>{props.text}</div>;
          }
        `,
      },
      {
        name: 'Component with hooks compiles without errors',
        code: normalizeIndent`
          import {useState} from 'react';
          function Component(props) {
            const [state, setState] = useState(0);
            return <div onClick={() => setState(state + 1)}>{state}</div>;
          }
        `,
      },
      {
        name: "Classes don't throw",
        code: normalizeIndent`
          class Foo {
            #bar() {}
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'Conditional hook call detected by Rust backend',
        code: normalizeIndent`
          function Component() {
            const result = cond ?? useConditionalHook();
            return <div>{result}</div>;
          }
        `,
        errors: [
          makeTestCaseError(
            'Hooks must always be called in a consistent order',
          ),
        ],
      },
      {
        name: 'Multiple diagnostics detected by Rust backend',
        code: normalizeIndent`
          function useConditional1() {
            'use memo';
            return cond ?? useConditionalHook();
          }
          function useConditional2(props) {
            'use memo';
            return props.cond && useConditionalHook();
          }
        `,
        errors: [
          makeTestCaseError(
            'Hooks must always be called in a consistent order',
          ),
          makeTestCaseError(
            'Hooks must always be called in a consistent order',
          ),
        ],
      },
    ],
  });
});
