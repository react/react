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
  'no-capitalized-calls',
  allRules[getRuleForCategory(ErrorCategory.CapitalizedCalls).name].rule,
  {
    valid: [],
    invalid: [
      {
        name: 'Simple violation',
        code: normalizeIndent`
        import Child from './Child';
        function Component() {
          return <>
            {Child()}
          </>;
        }
      `,
        errors: [
          makeTestCaseError(
            'Capitalized functions are reserved for components',
          ),
        ],
      },
      {
        name: 'Method call violation',
        code: normalizeIndent`
        import myModule from './MyModule';
        function Component() {
          return <>
            {myModule.Child()}
          </>;
        }
      `,
        errors: [
          makeTestCaseError(
            'Capitalized functions are reserved for components',
          ),
        ],
      },
      {
        name: 'Multiple diagnostics within the same function are surfaced',
        code: normalizeIndent`
        import Child1 from './Child1';
        import MyModule from './MyModule';
        function Component() {
          return <>
            {Child1()}
            {MyModule.Child2()}
          </>;
        }`,
        errors: [
          makeTestCaseError(
            'Capitalized functions are reserved for components',
          ),
          makeTestCaseError(
            'Capitalized functions are reserved for components',
          ),
        ],
      },
    ],
  },
);
