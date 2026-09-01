/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {NodePath} from '@babel/traverse';

/*
 * Trigger an exhaustivess check in TypeScript and throw at runtime.
 *
 * Example:
 *
 * ```ts
 * enum ErrorCode = {
 *    E0001 = "E0001",
 *    E0002 = "E0002"
 * }
 *
 * switch (code) {
 *    case ErrorCode.E0001:
 *      // ...
 *    default:
 *      assertExhaustive(code, "Unhandled error code");
 * }
 * ```
 */
export function assertExhaustive(_: never, errorMsg: string): never {
  throw new Error(errorMsg);
}

// Modifies @param array in place, retaining only the items where the predicate returns true.
export function retainWhere<T>(
  array: Array<T>,
  predicate: (item: T, index: number) => boolean,
): void {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < array.length; readIndex++) {
    const item = array[readIndex];
    if (predicate(item, readIndex) === true) {
      array[writeIndex++] = item;
    }
  }
  array.length = writeIndex;
}

export function retainWhere_Set<T>(
  items: Set<T>,
  predicate: (item: T) => boolean,
): void {
  for (const item of items) {
    if (!predicate(item)) {
      items.delete(item);
    }
  }
}

export function getOrInsertWith<U, V>(
  m: Map<U, V>,
  key: U,
  makeDefault: () => V,
): V {
  if (m.has(key)) {
    return m.get(key) as V;
  } else {
    const defaultValue = makeDefault();
    m.set(key, defaultValue);
    return defaultValue;
  }
}

export function getOrInsertDefault<U, V>(
  m: Map<U, V>,
  key: U,
  defaultValue: V,
): V {
  if (m.has(key)) {
    return m.get(key) as V;
  } else {
    m.set(key, defaultValue);
    return defaultValue;
  }
}
export function Set_equal<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

export function Set_union<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
  const union = new Set<T>(a);
  for (const item of b) {
    union.add(item);
  }
  return union;
}

export function Set_intersect<T>(sets: Array<ReadonlySet<T>>): Set<T> {
  if (sets.length === 0 || sets.some(s => s.size === 0)) {
    return new Set();
  } else if (sets.length === 1) {
    return new Set(sets[0]);
  }
  const result: Set<T> = new Set();
  const first = sets[0];
  outer: for (const e of first) {
    for (let i = 1; i < sets.length; i++) {
      if (!sets[i].has(e)) {
        continue outer;
      }
    }
    result.add(e);
  }
  return result;
}

/**
 * @returns `true` if `a` is a superset of `b`.
 */
export function Set_isSuperset<T>(
  a: ReadonlySet<T>,
  b: ReadonlySet<T>,
): boolean {
  for (const v of b) {
    if (!a.has(v)) {
      return false;
    }
  }
  return true;
}

export function Iterable_some<T>(
  iter: Iterable<T>,
  pred: (item: T) => boolean,
): boolean {
  for (const item of iter) {
    if (pred(item)) {
      return true;
    }
  }
  return false;
}

export function nonNull<T extends NonNullable<U>, U>(
  value: T | null | undefined,
): value is T {
  return value != null;
}

export function Set_filter<T>(
  source: ReadonlySet<T>,
  fn: (arg: T) => boolean,
): Set<T> {
  const result = new Set<T>();
  for (const entry of source) {
    if (fn(entry)) {
      result.add(entry);
    }
  }
  return result;
}

export function hasNode<T>(
  input: NodePath<T | null | undefined>,
): input is NodePath<NonNullable<T>> {
  /*
   * Internal babel is on an older version that does not have hasNode (v7.17)
   * See https://github.com/babel/babel/pull/13940/files for impl
   * https://github.com/babel/babel/blob/5ebab544af2f1c6fc6abdaae6f4e5426975c9a16/packages/babel-traverse/src/path/index.ts#L128-L130
   */
  return input.node != null;
}

export function hasOwnProperty<T>(
  obj: T,
  key: string | number | symbol,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
