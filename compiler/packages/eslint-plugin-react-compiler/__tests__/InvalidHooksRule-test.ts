/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  ErrorCategory,
  getRuleForCategory,
} from 'babel-plugin-react-compiler/src/CompilerError';
import {normalizeIndent, makeTestCaseError, testRule} from './shared-utils';
import {allRules} from '../src/rules/ReactCompilerRule';

testRule(
  'rules-of-hooks',
  allRules[getRuleForCategory(ErrorCategory.Hooks).name].rule,
  {
    valid: [
      {
        name: 'Basic example',
        code: normalizeIndent`
        function Component() {
          useHook();
          return <div>Hello world</div>;
        }
      `,
      },
      {
        name: 'Violation with Flow suppression',
        code: `
      // Valid since error already suppressed with flow.
      function useHook() {
        if (cond) {
          // $FlowFixMe[react-rule-hook]
          useConditionalHook();
        }
      }
    `,
      },
      {
        // OK because invariants are only meant for the compiler team's consumption
        name: '[Invariant] Defined after use',
        code: normalizeIndent`
        function Component(props) {
          let y = function () {
            m(x);
          };

          let x = { a };
          m(x);
          return y;
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
        name: 'Simple violation',
        code: normalizeIndent`
      function useConditional() {
        if (cond) {
          useConditionalHook();
        }
      }
    `,
        errors: [
          makeTestCaseError(
            'Hooks must always be called in a consistent order',
          ),
        ],
      },
      {
        name: 'Multiple diagnostics within the same function are surfaced',
        code: normalizeIndent`
        function useConditional() {
          cond ?? useConditionalHook();
          props.cond && useConditionalHook();
          return <div>Hello world</div>;
        }`,
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
  },
);
