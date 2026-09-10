/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Set_intersect} from '../Utils/utils';

/**
 * A `ReadonlySet` that counts calls to `.has()` so tests can assert on how
 * many membership checks were performed against it.
 */
class CountingSet<T> implements ReadonlySet<T> {
  #inner: Set<T>;
  hasCallCount: number = 0;

  constructor(values: Iterable<T>) {
    this.#inner = new Set(values);
  }

  has(value: T): boolean {
    this.hasCallCount++;
    return this.#inner.has(value);
  }

  get size(): number {
    return this.#inner.size;
  }

  forEach(
    callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void,
    thisArg?: any,
  ): void {
    this.#inner.forEach((value, value2) => callbackfn(value, value2, this), thisArg);
  }

  entries(): IterableIterator<[T, T]> {
    return this.#inner.entries();
  }

  keys(): IterableIterator<T> {
    return this.#inner.keys();
  }

  values(): IterableIterator<T> {
    return this.#inner.values();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#inner[Symbol.iterator]();
  }
}

describe('Set_intersect', () => {
  it('returns the intersection of the given sets', () => {
    const a = new Set([1, 2, 3, 4]);
    const b = new Set([2, 3, 4, 5]);
    const c = new Set([3, 4, 5, 6]);

    expect(Set_intersect([a, b, c])).toEqual(new Set([3, 4]));
  });

  it('returns an empty set when any input is empty', () => {
    expect(Set_intersect([new Set([1, 2]), new Set()])).toEqual(new Set());
  });

  it('returns a copy of the input when given a single set', () => {
    const a = new Set([1, 2, 3]);
    const result = Set_intersect([a]);
    expect(result).toEqual(a);
    expect(result).not.toBe(a);
  });

  it('preserves the first set iteration order in the result, regardless of remaining set order', () => {
    const first = new Set(['c', 'a', 'b']);
    const second = new Set(['a', 'b', 'c']);
    expect([...Set_intersect([first, second])]).toEqual(['c', 'a', 'b']);
  });

  it('probes remaining sets smallest-first, minimizing checks against a large predecessor set', () => {
    const SIZE = 10_000;
    const range = Array.from({length: SIZE}, (_, i) => i);
    // A large first set that we iterate over.
    const first = new Set(range);
    // A large second set supplied *before* the tiny third set. Under the
    // naive "supplied order" strategy every element of `first` would be
    // checked against this large set before ever reaching the tiny set.
    const large = new CountingSet(range);
    // A tiny set that excludes almost everything in `first`. If we probe
    // smallest-first, most elements should short-circuit here without ever
    // touching `large`.
    const tiny = new CountingSet([1, 2]);

    const result = Set_intersect([first, large, tiny]);

    expect(result).toEqual(new Set([1, 2]));
    // Every element of `first` is checked against the smallest set first.
    expect(tiny.hasCallCount).toBe(first.size);
    // Only elements that survive the tiny-set check (i.e. members of
    // `tiny`) should ever be checked against the large set.
    expect(large.hasCallCount).toBe(2);
    expect(large.hasCallCount).toBeLessThan(tiny.hasCallCount);
  });
});
