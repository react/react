/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactClientValue} from 'react-server/src/ReactFlightServer';
import type {ImportMetadata} from '../shared/ReactFlightImportMetadata';

import type {
  ClientReference,
  ServerReference,
} from '../ReactFlightParcelReferences';

export type {ClientReference, ServerReference};

export type ClientManifest = null;
export type ServerReferenceId = string;
export type ClientReferenceMetadata = ImportMetadata;
export type ClientReferenceKey = string;

export {
  isClientReference,
  isServerReference,
} from '../ReactFlightParcelReferences';

export function getClientReferenceKey(
  reference: ClientReference<any>,
): ClientReferenceKey {
  return reference.$$id + '#' + reference.$$name;
}

export function resolveClientReferenceMetadata<T>(
  config: ClientManifest,
  clientReference: ClientReference<T>,
): ClientReferenceMetadata {
  if (clientReference.$$importMap) {
    return [
      clientReference.$$id,
      clientReference.$$name,
      clientReference.$$bundles,
      clientReference.$$importMap,
    ];
  }

  return [
    clientReference.$$id,
    clientReference.$$name,
    clientReference.$$bundles,
  ];
}

export function getServerReferenceId<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): ServerReferenceId {
  return serverReference.$$id;
}

export function getServerReferenceBoundArguments<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): null | Array<ReactClientValue> {
  return serverReference.$$bound;
}

export function getServerReferenceLocation<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): void | Error {
  return serverReference.$$location;
}
