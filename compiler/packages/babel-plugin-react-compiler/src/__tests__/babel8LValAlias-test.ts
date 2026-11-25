/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createRequire} from 'module';
import type {NodePath as BabelNodePath} from '@babel/traverse';
import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';

/*
 * Resolve @babel/traverse from @babel/core's module context so that the patched
 * NodePath is the implementation transformFromAstSync actually traverses with.
 */
const requireFromBabelCore = createRequire(require.resolve('@babel/core'));
const {NodePath}: typeof import('@babel/traverse') =
  requireFromBabelCore('@babel/traverse');

/**
 * Babel 8 removed AssignmentPattern and RestElement from the LVal alias. This
 * repo pins Babel 7, whose LVal still contains both, so removing those types
 * from isLVal() for the duration of a call exercises the Babel 8 contract
 * without adding a second Babel version to the dependency tree.
 */
function withoutLValTypes<T>(types: Array<string>, fn: () => T): T {
  const real = NodePath.prototype.isLVal;
  NodePath.prototype.isLVal = function (
    this: BabelNodePath,
    ...args: Parameters<typeof real>
  ): boolean {
    if (this.node != null && types.includes(this.node.type)) {
      return false;
    }
    return real.apply(this, args);
  } as typeof real;
  try {
    return fn();
  } finally {
    NodePath.prototype.isLVal = real;
  }
}

const REMOVED_FROM_LVAL_IN_BABEL_8 = ['AssignmentPattern', 'RestElement'];

function compile(source: string): string {
  const result = runBabelPluginReactCompiler(source, 'test.js', 'flow', {
    compilationMode: 'all',
    panicThreshold: 'all_errors',
  });
  return result.code!;
}

const cases: Array<[string, string]> = [
  [
    'parameter default',
    'function Component({a = 1}) { return <div>{a}</div>; }',
  ],
  [
    'renamed parameter default',
    'function Component({a: b = 1}) { return <div>{b}</div>; }',
  ],
  [
    'nested parameter default',
    'function Component({a: {b = 1}}) { return <div>{b}</div>; }',
  ],
  [
    'default alongside rest',
    'function Component({a = 1, ...rest}) { return <div>{a}{rest.x}</div>; }',
  ],
  [
    'variable destructuring default',
    'function Component(props) { const {a = 1} = props; return <div>{a}</div>; }',
  ],
  [
    'destructuring assignment default',
    'function Component(props) { let a; ({a = 1} = props); return <div>{a}</div>; }',
  ],
  [
    'destructuring without a default',
    'function Component({a}) { return <div>{a}</div>; }',
  ],
];

describe('Babel 8 LVal alias', () => {
  /*
   * Guards the cases below against passing vacuously: if the patched prototype
   * is not the one the plugin traverses with, narrowing Identifier - which
   * lowerAssignment reaches through the same isLVal() check - has no effect
   * and this test fails.
   */
  it('reaches the NodePath instances the compiler traverses', () => {
    const source = 'function Component({a}) { return <div>{a}</div>; }';
    expect(() => compile(source)).not.toThrow();
    expect(() =>
      withoutLValTypes(['Identifier'], () => compile(source)),
    ).toThrow();
  });

  it.each(cases)('compiles %s', (_name, source) => {
    expect(
      withoutLValTypes(REMOVED_FROM_LVAL_IN_BABEL_8, () => compile(source)),
    ).toContain('_c(');
  });

  it.each(cases)('emits identical output for %s', (_name, source) => {
    expect(
      withoutLValTypes(REMOVED_FROM_LVAL_IN_BABEL_8, () => compile(source)),
    ).toEqual(compile(source));
  });
});
