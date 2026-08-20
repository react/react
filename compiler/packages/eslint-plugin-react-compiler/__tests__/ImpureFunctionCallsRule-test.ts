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
  'no impure function calls rule',
  allRules[getRuleForCategory(ErrorCategory.Purity).name].rule,
  {
    valid: [],
    invalid: [
      {
        name: 'Known impure function calls are caught',
        code: normalizeIndent`
      function Component() {
        const date = Date.now();
        const now = performance.now();
        const rand = Math.random();
        return <Foo date={date} now={now} rand={rand} />;
      }
    `,
        errors: [
          makeTestCaseError('Cannot call impure function during render'),
          makeTestCaseError('Cannot call impure function during render'),
          makeTestCaseError('Cannot call impure function during render'),
        ],
      },
    ],
  },
);
