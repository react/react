/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-ignore-line
import {Linter} from '../../../node_modules/eslint/lib/linter';
// @ts-ignore-line
import * as HermesESLint from 'hermes-eslint';
// @ts-ignore-line
import {NoUseBeforeDefineRule} from '../..';

const ESLINT_CONFIG: Linter.Config = {
  parser: 'hermes-eslint',
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'custom-no-use-before-define': [
      'error',
      {variables: false, functions: false},
    ],
  },
};

/**
 * Post-codegen pass to validate that the generated code does not introduce bugs.
 * Note that the compiler currently incorrectly reorders code in some cases: this
 * step detects this using ESLint's no-use-before-define rule at its strictest
 * setting.
 */
export default function validateNoUseBeforeDefine(
  source: string,
): Array<{line: number; column: number; message: string}> | null {
  const linter = new Linter();
  linter.defineParser('hermes-eslint', HermesESLint);
  linter.defineRule('custom-no-use-before-define', NoUseBeforeDefineRule);
  return linter.verify(source, ESLINT_CONFIG);
}
