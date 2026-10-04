/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import invariant from 'invariant';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';

it('only marks non-computed object properties as shorthand', () => {
  const result = runBabelPluginReactCompiler(
    `function Component(props) {
      const key = props.key;
      return {
        computed: {[key]: key},
        shorthand: {key},
      };
    }`,
    'test.js',
    'flow',
    {compilationMode: 'all'},
    true,
  );
  invariant(result.ast != null, 'Expected the transformed AST');

  const properties: Array<t.ObjectProperty> = [];
  t.traverseFast(result.ast, node => {
    if (
      t.isObjectProperty(node) &&
      t.isIdentifier(node.key, {name: 'key'}) &&
      t.isIdentifier(node.value, {name: 'key'})
    ) {
      properties.push(node);
    }
  });

  expect(
    properties.map(property => ({
      computed: property.computed,
      shorthand: property.shorthand,
    })),
  ).toEqual([
    {computed: true, shorthand: false},
    {computed: false, shorthand: true},
  ]);
});
