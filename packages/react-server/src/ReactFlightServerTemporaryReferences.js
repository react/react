/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  TEMPORARY_REFERENCE_TAG,
  createOpaqueTemporaryReference,
} from 'shared/ReactFlightOpaqueReferences';

export opaque type TemporaryReferenceSet = WeakMap<
  TemporaryReference<any>,
  string,
>;

// eslint-disable-next-line no-unused-vars
export interface TemporaryReference<T> {}

export function createTemporaryReferenceSet(): TemporaryReferenceSet {
  return new WeakMap();
}

export function isOpaqueTemporaryReference(reference: Object): boolean {
  return reference.$$typeof === TEMPORARY_REFERENCE_TAG;
}

export function resolveTemporaryReference<T>(
  temporaryReferences: TemporaryReferenceSet,
  temporaryReference: TemporaryReference<T>,
): void | string {
  return temporaryReferences.get(temporaryReference);
}

export function createTemporaryReference<T>(
  temporaryReferences: TemporaryReferenceSet,
  id: string,
): TemporaryReference<T> {
  const wrapper: TemporaryReference<T> =
    createOpaqueTemporaryReference() as any;
  registerTemporaryReference(temporaryReferences, wrapper, id);
  return wrapper;
}

export function registerTemporaryReference(
  temporaryReferences: TemporaryReferenceSet,
  object: TemporaryReference<any>,
  id: string,
): void {
  temporaryReferences.set(object, id);
}
