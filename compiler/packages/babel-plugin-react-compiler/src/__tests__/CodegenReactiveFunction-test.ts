/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformFromAstSync} from '@babel/core';
import * as BabelParser from '@babel/parser';
import * as t from '@babel/types';
import type {NodePath} from '@babel/traverse';
import invariant from 'invariant';
import BabelPluginReactCompiler from '../Babel/BabelPlugin';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {LoggerEvent} from '../Entrypoint';
import type {EnvironmentConfig} from '../HIR';

function compileAst(
  ast: t.File,
  source: string,
  environment: Partial<EnvironmentConfig> = {},
  beforeCompile?: (program: t.Program) => void,
): t.File {
  const events: Array<LoggerEvent> = [];
  const result = transformFromAstSync(ast, source, {
    filename: 'test.tsx',
    ast: true,
    configFile: false,
    babelrc: false,
    plugins: [
      {
        visitor: {
          Program(path: NodePath<t.Program>): void {
            beforeCompile?.(path.node);
          },
        },
      },
      [
        BabelPluginReactCompiler,
        {
          compilationMode: 'all',
          panicThreshold: 'all_errors',
          environment,
          logger: {
            logEvent: (_filename: string | null, event: LoggerEvent): void => {
              events.push(event);
            },
          },
        },
      ],
    ],
  });
  invariant(result?.ast != null, 'Expected the transformed AST');
  expect(events.some(event => event.kind === 'CompileSuccess')).toBe(true);
  return result.ast;
}

describe.each([
  {
    name: 'expressions, declarations, casts, and nested functions',
    source: `function Component(props) {
      const value = props.value as number;
      const [first, ...rest] = props.items;
      const read = () => props.read?.(value);
      return [value + first, {rest}, read()];
    }`,
    environment: {},
  },
  {
    name: 'outlined JSX, attributes, and children',
    source: `function Component({items}) {
      return items.map(item => (
        <View value={item} label="中文">
          <Child value={item}>text</Child>
        </View>
      ));
    }`,
    environment: {enableJsxOutlining: true},
  },
  {
    name: 'guarded hook calls',
    source: `function Component(props) {
      const value = useValue(props.value);
      return value + props.other;
    }`,
    environment: {
      enableEmitHookGuards: {
        source: 'react-compiler-runtime',
        importSpecifierName: '$dispatcherGuard',
      },
    },
  },
])('source offsets for $name', ({source, environment}) => {
  it.each(['original', 'shifted', 'absent', 'mixed'])(
    'preserves each emitted source location when offsets are %s',
    offsets => {
      const original = BabelParser.parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
      const locations = new Map<
        t.SourceLocation,
        {start: t.Node['start']; end: t.Node['end']; loc: t.SourceLocation}
      >();
      let index = 0;
      let originalFunctions = 0;
      const prepare = (program: t.Program): void => {
        t.traverseFast(program, node => {
          if (t.isFunction(node)) {
            originalFunctions++;
          }
          if (node.loc == null) {
            return;
          }
          if (offsets === 'absent') {
            delete node.start;
            delete node.end;
          } else if (offsets === 'shifted') {
            if (node.start != null) {
              node.start += 100;
            }
            if (node.end != null) {
              node.end += 200;
            }
          } else if (offsets === 'mixed') {
            switch (index++ % 3) {
              case 0:
                delete node.start;
                break;
              case 1:
                node.end = null;
                break;
              case 2:
                if (node.start != null) {
                  node.start += 100;
                }
                delete node.end;
                break;
            }
          }
          locations.set(node.loc, {
            start: node.start,
            end: node.end,
            loc: {...node.loc},
          });
        });
      };
      const result = compileAst(original, source, environment, prepare);
      let locatedNodes = 0;
      let compiledFunctions = 0;
      t.traverseFast(result, node => {
        if (t.isFunction(node)) {
          compiledFunctions++;
        }
        const expected = node.loc != null ? locations.get(node.loc) : undefined;
        if (expected != null) {
          locatedNodes++;
          expect(node.loc).toEqual(expected.loc);
          expect(node.start).toBe(expected.start);
          expect(node.end).toBe(expected.end);
          expect(Object.prototype.hasOwnProperty.call(node, 'start')).toBe(
            expected.start !== undefined,
          );
          expect(Object.prototype.hasOwnProperty.call(node, 'end')).toBe(
            expected.end !== undefined,
          );
        }
      });
      expect(locatedNodes).toBeGreaterThan(10);
      if (environment.enableJsxOutlining) {
        expect(compiledFunctions).toBeGreaterThan(originalFunctions);
      }
    },
  );
});

it('keeps node offsets distinct when source nodes share a Babel location', () => {
  const source = 'function Component(x, y) { return [x + y, x - y]; }';
  const original = BabelParser.parse(source, {sourceType: 'module'});
  const result = compileAst(original, source, {}, program => {
    const expressions: Array<t.BinaryExpression> = [];
    t.traverseFast(program, node => {
      if (t.isBinaryExpression(node)) {
        expressions.push(node);
      }
    });
    expect(expressions).toHaveLength(2);
    invariant(
      expressions[0].loc != null,
      'Expected the parsed source location',
    );
    expressions[1].loc = expressions[0].loc;
    expressions[0].start = 100;
    expressions[0].end = 110;
    delete expressions[1].start;
    expressions[1].end = null;
  });
  const ranges: Array<unknown> = [];
  t.traverseFast(result, node => {
    if (t.isBinaryExpression(node) && ['+', '-'].includes(node.operator)) {
      ranges.push({operator: node.operator, start: node.start, end: node.end});
    }
  });
  expect(ranges).toEqual([
    {operator: '+', start: 100, end: 110},
    {operator: '-', start: undefined, end: null},
  ]);
});

it('leaves generated expressions without offsets when their source has no loc', () => {
  const source = 'function Component(x) { return x + 1; }';
  const original = BabelParser.parse(source, {sourceType: 'module'});
  t.traverseFast(original, node => {
    if (t.isBinaryExpression(node)) {
      delete node.loc;
    }
  });
  const result = compileAst(original, source);
  const expressions: Array<t.BinaryExpression> = [];
  t.traverseFast(result, node => {
    if (t.isBinaryExpression(node, {operator: '+'})) {
      expressions.push(node);
    }
  });
  expect(expressions).toHaveLength(1);
  expect(expressions[0].loc).toBeUndefined();
  expect(expressions[0].start).toBeUndefined();
  expect(expressions[0].end).toBeUndefined();
});

describe.each([
  ['function declaration', 'function Component(x) { return x + 1; }'],
  ['function expression', 'const Component = function(x) { return x + 1; };'],
  ['arrow function', 'const Component = x => x + 1;'],
])('source offsets for %s', (_kind, source) => {
  it.each(['original', 'shifted', 'absent'])(
    'preserves source offsets when they are %s',
    offsets => {
      const original = BabelParser.parse(source, {sourceType: 'module'});
      t.traverseFast(original, node => {
        for (const field of ['start', 'end'] as const) {
          const offset = node[field];
          if (offsets === 'absent') {
            delete node[field];
          } else if (offsets === 'shifted' && offset != null) {
            node[field] = offset + 1;
          }
        }
      });
      const range = (
        ast: t.Node,
      ): Array<{
        type: t.Node['type'];
        start: t.Node['start'];
        end: t.Node['end'];
        loc: t.Node['loc'];
      }> => {
        const nodes: Array<t.Node> = [];
        t.traverseFast(ast, node => {
          if (
            t.isFunction(node) ||
            t.isBinaryExpression(node, {operator: '+'})
          ) {
            nodes.push(node);
          }
        });
        expect(nodes).toHaveLength(2);
        return nodes.map(({type, start, end, loc}) => ({
          type,
          start,
          end,
          loc,
        }));
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
                logEvent: (
                  _filename: string | null,
                  event: LoggerEvent,
                ): void => {
                  events.push(event);
                },
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
});

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
