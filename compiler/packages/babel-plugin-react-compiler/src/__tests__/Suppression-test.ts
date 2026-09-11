/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import {findProgramSuppressions} from '../Entrypoint/Suppression';
import {escapeStringRegexp} from '../Utils/utils';

function makeLineComment(value: string): t.Comment {
  return {
    type: 'CommentLine',
    value,
    start: 0,
    end: value.length,
    loc: null,
  } as unknown as t.Comment;
}

describe('findProgramSuppressions', () => {
  it('does not treat a longer rule sharing a prefix as a suppression', () => {
    // Regression test for https://github.com/facebook/react/issues/37413
    const comment = makeLineComment(
      ' eslint-disable-next-line react-hooks/rules-of-hooks-extra',
    );
    const suppressions = findProgramSuppressions(
      [comment],
      ['react-hooks/rules-of-hooks'],
      false,
    );
    expect(suppressions).toEqual([]);
  });

  it('still matches the exact configured rule name', () => {
    const comment = makeLineComment(
      ' eslint-disable-next-line react-hooks/rules-of-hooks',
    );
    const suppressions = findProgramSuppressions(
      [comment],
      ['react-hooks/rules-of-hooks'],
      false,
    );
    expect(suppressions.length).toBe(1);
  });

  it('matches the exact configured rule name when followed by another rule', () => {
    const comment = makeLineComment(
      ' eslint-disable-next-line react-hooks/rules-of-hooks, other-rule',
    );
    const suppressions = findProgramSuppressions(
      [comment],
      ['react-hooks/rules-of-hooks'],
      false,
    );
    expect(suppressions.length).toBe(1);
  });

  it('does not treat "." in the configured rule name as a regex wildcard', () => {
    // Regression test for https://github.com/facebook/react/issues/37413
    const comment = makeLineComment(
      ' eslint-disable-next-line my-plugin/reactXrule',
    );
    const suppressions = findProgramSuppressions(
      [comment],
      ['my-plugin/react.rule'],
      false,
    );
    expect(suppressions).toEqual([]);
  });

  it('matches when the configured rule name contains a literal "."', () => {
    const comment = makeLineComment(
      ' eslint-disable-next-line my-plugin/react.rule',
    );
    const suppressions = findProgramSuppressions(
      [comment],
      ['my-plugin/react.rule'],
      false,
    );
    expect(suppressions.length).toBe(1);
  });
});

describe('escapeStringRegexp', () => {
  it('escapes regex special characters so they are matched literally', () => {
    expect(escapeStringRegexp('my-plugin/react.rule')).toBe(
      'my-plugin/react\\.rule',
    );
    expect(new RegExp(escapeStringRegexp('a.b')).test('axb')).toBe(false);
    expect(new RegExp(escapeStringRegexp('a.b')).test('a.b')).toBe(true);
  });
});
