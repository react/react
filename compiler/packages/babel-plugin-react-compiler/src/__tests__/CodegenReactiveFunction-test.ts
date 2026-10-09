/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformFromAstSync} from '@babel/core';
import * as BabelParser from '@babel/parser';
import * as t from '@babel/types';
import invariant from 'invariant';
import BabelPluginReactCompiler from '../Babel/BabelPlugin';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {LoggerEvent} from '../Entrypoint';

it.each(['shifted', 'absent'])(
  'preserves source offsets when they are %s',
  offsets => {
    const source = 'function Component(x) { return x + 1; }';
    const original = BabelParser.parse(source, {sourceType: 'module'});
    t.traverseFast(original, node => {
      for (const field of ['start', 'end'] as const) {
        const offset = node[field];
        if (offsets === 'absent') {
          delete node[field];
        } else if (offset != null) {
          node[field] = offset + 1;
        }
      }
    });
    const range = (
      ast: t.Node,
    ): {start: t.Node['start']; end: t.Node['end']; loc: t.Node['loc']} => {
      const expressions: Array<t.BinaryExpression> = [];
      t.traverseFast(ast, node => {
        if (t.isBinaryExpression(node, {operator: '+'})) {
          expressions.push(node);
        }
      });
      expect(expressions).toHaveLength(1);
      const {start, end, loc} = expressions[0];
      return {start, end, loc};
    };
    const expected = range(original);
    const events: Array<LoggerEvent> = [];
    const result = transformFromAstSync(original, source, {
      filename: 'test.js',
      ast: true,
      configFile: false,
      babelrc: false,
      plugins: [
        [
          BabelPluginReactCompiler,
          {
            compilationMode: 'all',
            panicThreshold: 'all_errors',
            logger: {
              logEvent: (_filename: string | null, event: LoggerEvent) =>
                events.push(event),
            },
          },
        ],
      ],
    });
    invariant(result?.ast != null, 'Expected the transformed AST');
    expect(events.some(event => event.kind === 'CompileSuccess')).toBe(true);
    expect(range(result.ast)).toEqual(expected);
  },
);

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
