/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */
'use strict';

describe('shallowEqual', () => {
  let shallowEqual;

  beforeEach(() => {
    jest.resetModules();
    shallowEqual = require('shared/shallowEqual').default;
  });

  it('returns true for the same reference', () => {
    const obj = {a: 1};
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('treats +0 and -0 as different (Object.is semantics)', () => {
    expect(shallowEqual(+0, -0)).toBe(false);
    expect(shallowEqual({a: +0}, {a: -0})).toBe(false);
  });

  it('treats NaN as equal to NaN (Object.is semantics)', () => {
    expect(shallowEqual(NaN, NaN)).toBe(true);
    expect(shallowEqual({a: NaN}, {a: NaN})).toBe(true);
  });

  it('returns false when either argument is null or a non-object', () => {
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual({}, 'a')).toBe(false);
    expect(shallowEqual(1, {})).toBe(false);
  });

  it('returns true for two objects with the same keys and values', () => {
    expect(shallowEqual({a: 1, b: 2}, {a: 1, b: 2})).toBe(true);
  });

  it('returns false when key counts differ', () => {
    expect(shallowEqual({a: 1}, {a: 1, b: 2})).toBe(false);
    expect(shallowEqual({a: 1, b: 2}, {a: 1})).toBe(false);
  });

  it('returns false when values differ for the same key', () => {
    expect(shallowEqual({a: 1}, {a: 2})).toBe(false);
  });

  it('returns false when keys differ but counts match', () => {
    expect(shallowEqual({a: 1, b: 2}, {a: 1, c: 2})).toBe(false);
  });

  it('only inspects own enumerable string keys, not the prototype chain', () => {
    const proto = {inherited: 'should-be-ignored'};
    const a = Object.create(proto);
    a.own = 1;
    const b = Object.create(proto);
    b.own = 1;
    expect(shallowEqual(a, b)).toBe(true);

    // A prototype-only property must not satisfy a missing own property on B.
    const aWithExtra = Object.create(proto);
    aWithExtra.own = 1;
    aWithExtra.extra = 2;
    const bMissingExtra = Object.create({...proto, extra: 2});
    bMissingExtra.own = 1;
    expect(shallowEqual(aWithExtra, bMissingExtra)).toBe(false);
  });

  it('handles null-prototype objects', () => {
    const a = Object.create(null);
    a.x = 1;
    const b = Object.create(null);
    b.x = 1;
    expect(shallowEqual(a, b)).toBe(true);

    b.y = 2;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it('treats two empty objects as equal', () => {
    expect(shallowEqual({}, {})).toBe(true);
    expect(shallowEqual(Object.create(null), Object.create(null))).toBe(true);
  });
});
