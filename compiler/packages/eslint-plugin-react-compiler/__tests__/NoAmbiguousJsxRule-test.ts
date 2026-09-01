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
import {normalizeIndent, testRule, makeTestCaseError} from './shared-utils';
import {allRules} from '../src/rules/ReactCompilerRule';

testRule(
  'no ambiguous JSX rule',
  allRules[getRuleForCategory(ErrorCategory.ErrorBoundaries).name].rule,
  {
    valid: [],
    invalid: [
      {
        name: 'JSX in try blocks are warned against',
        code: normalizeIndent`
      function Component(props) {
        let el;
        try {
          el = <Child />;
        } catch {
          return null;
        }
        return el;
      }
    `,
        errors: [makeTestCaseError('Avoid constructing JSX within try/catch')],
      },
    ],
  },
);
