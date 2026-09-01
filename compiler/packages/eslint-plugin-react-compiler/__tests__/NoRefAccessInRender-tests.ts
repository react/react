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
  'no ref access in render rule',
  allRules[getRuleForCategory(ErrorCategory.Refs).name].rule,
  {
    valid: [],
    invalid: [
      {
        name: 'validate against simple ref access in render',
        code: normalizeIndent`
      function Component(props) {
        const ref = useRef(null);
        const value = ref.current;
        return value;
      }
    `,
        errors: [makeTestCaseError('Cannot access refs during render')],
      },
    ],
  },
);
