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
  ImportMetadata,
  ImportManifestEntry,
} from '../shared/ReactFlightImportMetadata';

import type {
  ClientReference,
  ServerReference,
} from '../ReactFlightRspackReferences';
import type {ServerManifest} from 'react-client/src/forks/ReactFlightClientConfig.dom-edge-rspack';

export type {ClientReference, ServerReference};

export type ClientManifest = {
  [id: string]: ClientReferenceManifestEntry,
};

export type ServerReferenceId = string;

export type ClientReferenceMetadata = ImportMetadata;
export opaque type ClientReferenceManifestEntry = ImportManifestEntry;

export type ClientReferenceKey = string;

export type BoundArgsEncryption<T> = {
  encrypt: (actionId: string, ...args: Array<any>) => Promise<T>,
  decrypt: (
    actionId: string,
    payloadPromise: Promise<T>,
  ) => Promise<Array<any>>,
};

export type ServerEntry<T> = {
  ...T,
  resource: string,
  entryJsFiles: Array<string>,
  entryCssFiles: Array<string>,
  ...
};

export {
  isClientReference,
  isServerReference,
} from '../ReactFlightRspackReferences';

export function getClientReferenceKey(
  reference: ClientReference<any>,
): ClientReferenceKey {
  return reference.$$async ? reference.$$id + '#async' : reference.$$id;
}

export function resolveClientReferenceMetadata<T>(
  config: ClientManifest,
  clientReference: ClientReference<T>,
): ClientReferenceMetadata {
  const modulePath = clientReference.$$id;
  let name = '';
  let resolvedModuleData = config[modulePath];
  if (resolvedModuleData) {
    // The potentially aliased name.
    name = resolvedModuleData.name;
  } else {
    // We didn't find this specific export name but we might have the * export
    // which contains this name as well.
    // TODO: It's unfortunate that we now have to parse this string. We should
    // probably go back to encoding path and name separately on the client reference.
    const idx = modulePath.lastIndexOf('#');
    if (idx !== -1) {
      name = modulePath.slice(idx + 1);
      resolvedModuleData = config[modulePath.slice(0, idx)];
    }
    if (!resolvedModuleData) {
      throw new Error(
        'Could not find the module "' +
          modulePath +
          '" in the React Client Manifest. ' +
          'This is probably a bug in the React Server Components bundler.',
      );
    }
  }
  if (resolvedModuleData.async === true && clientReference.$$async === true) {
    throw new Error(
      'The module "' +
        modulePath +
        '" is marked as an async ESM module but was loaded as a CJS proxy. ' +
        'This is probably a bug in the React Server Components bundler.',
    );
  }
  if (resolvedModuleData.async === true || clientReference.$$async === true) {
    return [resolvedModuleData.id, resolvedModuleData.chunks, name, 1];
  } else {
    return [resolvedModuleData.id, resolvedModuleData.chunks, name];
  }
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

const defaultStrategy: BoundArgsEncryption<any> = {
  encrypt: (_actionId: string, ...args: any[]) => Promise.resolve(args),
  decrypt: (_actionId: string, payloadPromise: Promise<any>) => payloadPromise,
};

let currentStrategy = defaultStrategy;

export function setServerActionBoundArgsEncryption<T>(
  strategy: BoundArgsEncryption<T>,
) {
  currentStrategy = strategy;
}

export function encryptServerActionBoundArgs(
  actionId: string,
  ...args: any[]
): Promise<> {
  return currentStrategy.encrypt(actionId, ...args);
}

export function decryptServerActionBoundArgs(
  actionId: string,
  encryptedPromise: Promise<any>,
): Promise<any> {
  return currentStrategy.decrypt(actionId, encryptedPromise);
}

declare const __rspack_rsc_manifest__: {
  entryJsFiles: Array<string>,
  entryCssFiles: {[resourceId: string]: Array<string>, ...},
  serverManifest: ServerManifest,
};

export function loadServerAction(actionId: string): Function {
  const actionModId = __rspack_rsc_manifest__.serverManifest[actionId].id;

  if (!actionModId) {
    throw new Error(
      `Failed to find Server Action "${actionId}". This request might be from an older or newer deployment.`,
    );
  }

  const moduleExports = __webpack_require__(actionModId);
  const fn = moduleExports[actionId];
  if (typeof fn !== 'function') {
    throw new Error('Server actions must be functions');
  }
  return fn;
}

export function createServerEntry<T>(
  value: T,
  resource: string,
): ServerEntry<T> {
  const entryJsFiles = __rspack_rsc_manifest__.entryJsFiles || [];
  const entryCssFiles = __rspack_rsc_manifest__.entryCssFiles[resource] || [];
  if (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null)
  ) {
    // $FlowFixMe: We're dynamically adding properties to create ServerEntry
    Object.assign(value, {
      resource,
      entryJsFiles,
      entryCssFiles,
    });
  }
  // $FlowFixMe: After Object.assign, value conforms to ServerEntry<T>
  return (value: ServerEntry<T>);
}

// This function ensures that all the exported values are valid server actions,
// during the runtime. By definition all actions are required to be async
// functions, but here we can only check that they are functions.
export function ensureServerActions(actions: any[]) {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (typeof action !== 'function') {
      throw new Error(
        `A "use server" file can only export async functions, found ${typeof action}.`,
      );
    }
  }
}
