/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactClientValue} from 'react-server/src/ReactFlightServer';

import type {
  ClientReference,
  ServerReference,
} from '../ReactFlightESMReferences';

export type {ClientReference, ServerReference};

export type ClientManifest = string; // base URL on the file system

export type ServerReferenceId = string;

export type ClientReferenceMetadata = [
  string, // module path
  string, // export name
];

export type ClientReferenceKey = string;

export {
  isClientReference,
  isServerReference,
} from '../ReactFlightESMReferences';

export function getClientReferenceKey(
  reference: ClientReference<any>,
): ClientReferenceKey {
  return reference.$$id;
}

export function resolveClientReferenceMetadata<T>(
  config: ClientManifest,
  clientReference: ClientReference<T>,
): ClientReferenceMetadata {
  const baseURL: string = config;
  const id = clientReference.$$id;
  const idx = id.lastIndexOf('#');
  const exportName = id.slice(idx + 1);
  const fullURL = id.slice(0, idx);
  if (!fullURL.startsWith(baseURL)) {
    throw new Error(
      'Attempted to load a Client Module outside the hosted root.',
    );
  }
  // Relative URL
  const modulePath = fullURL.slice(baseURL.length);
  return [modulePath, exportName];
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
