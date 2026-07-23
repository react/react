/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  FulfilledThenable,
  RejectedThenable,
  Thenable,
} from 'shared/ReactTypes';

import type {ImportMetadata} from '../shared/ReactFlightImportMetadata';

import {ID, NAME} from '../shared/ReactFlightImportMetadata';

export type ServerManifest = BundlerConfig;
export type SSRModuleMap = null;
export type ModuleLoading = null;
export type ServerConsumerModuleMap = BundlerConfig;
export type ServerReferenceId = string;

// flight client module loading implemented on user land
type BundlerConfig = {
  load: (id: string) => Promise<any>,
};

export opaque type ClientReferenceMetadata = ImportMetadata;

// eslint-disable-next-line no-unused-vars
export opaque type ClientReference<T> = [
  /* id */ string,
  /* name */ string,
  /* promise */ Thenable<any> | null,
  /* bundlerConfig */ BundlerConfig,
];

export function prepareDestinationForModule(
  moduleLoading: ModuleLoading,
  nonce: ?string,
  metadata: ClientReferenceMetadata,
) {}

export function resolveClientReference<T>(
  bundlerConfig: ServerConsumerModuleMap,
  metadata: ClientReferenceMetadata,
): ClientReference<T> {
  return [metadata[ID], metadata[NAME], null, bundlerConfig];
}

export function resolveServerReference<T>(
  bundlerConfig: ServerManifest,
  ref: ServerReferenceId,
): ClientReference<T> {
  const idx = ref.lastIndexOf('#');
  const id = ref.slice(0, idx);
  const name = ref.slice(idx + 1);
  return [id, name, null, bundlerConfig];
}

const asyncModuleCache: Map<string, Thenable<any>> = new Map();

export function preloadModule<T>(
  metadata: ClientReference<T>,
): null | Thenable<any> {
  const bundlerConfig = metadata[3];
  // cache same module id for build.
  if (!__DEV__) {
    const existingPromise = asyncModuleCache.get(metadata[ID]);
    if (existingPromise) {
      metadata[2] = existingPromise;
      if (existingPromise.status === 'fulfilled') {
        return null;
      }
      return existingPromise;
    }
  }
  const promise = bundlerConfig.load(metadata[ID]);
  promise.then(
    value => {
      const fulfilledThenable: FulfilledThenable<mixed> = (promise: any);
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = value;
    },
    reason => {
      const rejectedThenable: RejectedThenable<mixed> = (promise: any);
      rejectedThenable.status = 'rejected';
      rejectedThenable.reason = reason;
    },
  );
  metadata[2] = promise;
  if (!__DEV__) {
    asyncModuleCache.set(metadata[ID], promise);
  }
  return promise;
}

export function requireModule<T>(metadata: ClientReference<T>): T {
  const promise = metadata[2];
  if (promise) {
    if (promise.status === 'fulfilled') {
      return promise.value[metadata[NAME]];
    }
    if (promise.status === 'rejected') {
      throw promise.reason;
    }
  }
  throw new Error('invalid reference');
}
