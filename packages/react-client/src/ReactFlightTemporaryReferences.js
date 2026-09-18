/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

interface Reference {}

export opaque type TemporaryReferenceSet = Map<string, Reference | symbol>;

export function createTemporaryReferenceSet(): TemporaryReferenceSet {
  return new Map();
}

export function writeTemporaryReference(
  set: TemporaryReferenceSet,
  reference: string,
  object: Reference | symbol,
): void {
  set.set(reference, object);
}

export function readTemporaryReference<T>(
  set: TemporaryReferenceSet,
  reference: string,
): T {
  return set.get(reference) as any;
}
