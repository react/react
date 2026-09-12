/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {parse} from '@babel/parser';

import {findProgramSuppressions} from '../Entrypoint/Suppression';

describe('ESLint suppression rule matching', () => {
  function findSuppressions(comment: string, ruleName: string) {
    const ast = parse(`// ${comment}\n`);
    return findProgramSuppressions(ast.comments ?? [], [ruleName], false);
  }

  it('does not match a longer rule name with the configured rule as a prefix', () => {
    expect(
      findSuppressions(
        'eslint-disable-next-line react-hooks/rules-of-hooks-extra',
        'react-hooks/rules-of-hooks',
      ),
    ).toHaveLength(0);
  });

  it('treats regular expression characters in rule names literally', () => {
    expect(
      findSuppressions(
        'eslint-disable-next-line my-plugin/reactXrule',
        'my-plugin/react.rule',
      ),
    ).toHaveLength(0);
    expect(
      findSuppressions(
        'eslint-disable-next-line my-plugin/react.rule',
        'my-plugin/react.rule',
      ),
    ).toHaveLength(1);
  });
});
