/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const {evalStringConcat} = require('../evalToString');
const parser = require('@babel/parser');

const parse = source => parser.parse(`(${source});`).program.body[0].expression; // quick way to get an exp node

const parseAndEval = source => evalStringConcat(parse(source));

describe('evalToString', () => {
  it('should support StringLiteral', () => {
    expect(parseAndEval(`'foobar'`)).toBe('foobar');
    expect(parseAndEval(`'yowassup'`)).toBe('yowassup');
  });

  it('should support string concat (`+`)', () => {
    expect(parseAndEval(`'foo ' + 'bar'`)).toBe('foo bar');
  });

  it('should throw when it finds other types', () => {
    expect(() => parseAndEval(`'foo ' + true`)).toThrow(/Unsupported type/);
    expect(() => parseAndEval(`'foo ' + 3`)).toThrow(/Unsupported type/);
    expect(() => parseAndEval(`'foo ' + null`)).toThrow(/Unsupported type/);
    expect(() => parseAndEval(`'foo ' + undefined`)).toThrow(
      /Unsupported type/
    );
  });
});
