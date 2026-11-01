/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import {it} from 'node:test';
import * as BabelParser from '@babel/parser';
import * as t from '@babel/types';
import {
  assertSourceOffsetRanges,
  collectSourceOffsetRanges,
} from '../source-locations';

it('checks expression offsets across the output tree', () => {
  const ast = BabelParser.parse('function Component(x) { return x + 1; }');
  const originalRanges = collectSourceOffsetRanges(ast);
  t.traverseFast(ast, node => {
    if (t.isBinaryExpression(node) && node.start != null) node.start++;
  });
  assert.throws(
    () => assertSourceOffsetRanges(ast, originalRanges),
    /Invalid source offsets for BinaryExpression/,
  );
});

it('rejects reversed ranges even when indices match', () => {
  const ast = BabelParser.parseExpression('x + 1');
  t.traverseFast(ast, node => {
    if (t.isBinaryExpression(node) && node.loc != null) {
      node.start = node.loc.start.index = 10;
      node.end = node.loc.end.index = 5;
    }
  });
  assert.throws(
    () => assertSourceOffsetRanges(ast, new Set()),
    /Invalid source offsets for BinaryExpression/,
  );
});

it('checks range order even without location indices', () => {
  const ast = t.identifier('x');
  ast.start = 10;
  ast.end = 5;
  assert.throws(
    () => assertSourceOffsetRanges(ast, new Set()),
    /Invalid source offsets for Identifier/,
  );
});

it('accepts original shifted expression offsets and rejects subsequent changes', () => {
  const ast = BabelParser.parseExpression('x + 1');
  assert(ast.start != null && ast.end != null);
  ast.start += 100;
  ast.end += 100;
  const originalRanges = collectSourceOffsetRanges(ast);
  assertSourceOffsetRanges(ast, originalRanges);
  ast.start++;
  assert.throws(
    () => assertSourceOffsetRanges(ast, originalRanges),
    /Invalid source offsets for BinaryExpression/,
  );
});

it('does not fill absent or partial raw offsets from location indices', () => {
  const ast = BabelParser.parseExpression('x + 1');
  delete ast.start;
  const end = ast.end;
  assertSourceOffsetRanges(ast, new Set());
  assert.equal(ast.start, undefined);
  assert.equal(ast.end, end);
  delete ast.end;
  assertSourceOffsetRanges(ast, new Set());
  assert.equal(ast.start, undefined);
  assert.equal(ast.end, undefined);
});
