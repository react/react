/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable, ReactDebugInfo} from 'shared/ReactTypes';

import type {ImportMetadata} from '../shared/ReactFlightImportMetadata';

import {
  ID,
  NAME,
  BUNDLES,
  IMPORT_MAP,
} from '../shared/ReactFlightImportMetadata';
import {prepareDestinationWithChunks} from 'react-client/src/ReactFlightClientConfig';

import hasOwnProperty from 'shared/hasOwnProperty';

export type ServerManifest = {
  [string]: Array<string>,
};
export type SSRModuleMap = null;
export type ModuleLoading = null;
export type ServerConsumerModuleMap = null;
export type ServerReferenceId = string;

export opaque type ClientReferenceMetadata = ImportMetadata;

// eslint-disable-next-line no-unused-vars
export opaque type ClientReference<T> = ImportMetadata;

export function prepareDestinationForModule(
  moduleLoading: ModuleLoading,
  nonce: ?string,
  metadata: ClientReferenceMetadata,
) {
  prepareDestinationWithChunks(moduleLoading, metadata[BUNDLES], nonce);
}

export function resolveClientReference<T>(
  bundlerConfig: null,
  metadata: ClientReferenceMetadata,
): ClientReference<T> {
  // Reference is already resolved during the build.
  return metadata;
}

export function resolveServerReference<T>(
  bundlerConfig: ServerManifest,
  ref: ServerReferenceId,
): ClientReference<T> {
  const idx = ref.lastIndexOf('#');
  const id = ref.slice(0, idx);
  const name = ref.slice(idx + 1);
  const bundles = bundlerConfig[id];
  if (!bundles) {
    throw new Error('Invalid server action: ' + ref);
  }
  return [id, name, bundles];
}

export function preloadModule<T>(
  metadata: ClientReference<T>,
): null | Thenable<any> {
  if (metadata[IMPORT_MAP]) {
    parcelRequire.extendImportMap(metadata[IMPORT_MAP]);
  }

  if (metadata[BUNDLES].length === 0) {
    return null;
  }

  return Promise.all(metadata[BUNDLES].map(url => parcelRequire.load(url)));
}

export function requireModule<T>(metadata: ClientReference<T>): T {
  const moduleExports = parcelRequire(metadata[ID]);
  if (hasOwnProperty.call(moduleExports, metadata[NAME])) {
    return moduleExports[metadata[NAME]];
  }
  return undefined as any;
}

export function getModuleDebugInfo<T>(
  metadata: ClientReference<T>,
): null | ReactDebugInfo {
  // TODO
  return null;
}
