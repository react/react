/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {parse} from '@babel/parser';
import traverse, {NodePath} from '@babel/traverse';
import * as t from '@babel/types';

import {
  filterSuppressionsThatAffectFunction,
  findProgramSuppressions,
} from '../Entrypoint/Suppression';

describe('ESLint suppressions', () => {
  it('stops a block suppression at its matching enable comment', () => {
    const ast = parse(`
      /* eslint-disable react-hooks/rules-of-hooks */
      function Suppressed() {}
      /* eslint-enable react-hooks/rules-of-hooks */
      function Enabled() {}
    `);
    const functions: Array<NodePath<t.Function>> = [];
    traverse(ast, {
      FunctionDeclaration(path) {
        functions.push(path);
      },
    });

    const suppressions = findProgramSuppressions(
      ast.comments ?? [],
      ['react-hooks/rules-of-hooks'],
      false,
    );

    expect(suppressions).toHaveLength(1);
    expect(suppressions[0].enableComment?.value).toContain('eslint-enable');
    expect(
      filterSuppressionsThatAffectFunction(suppressions, functions[0]),
    ).toHaveLength(1);
    expect(
      filterSuppressionsThatAffectFunction(suppressions, functions[1]),
    ).toHaveLength(0);
  });
});
