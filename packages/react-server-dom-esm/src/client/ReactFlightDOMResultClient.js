/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable, ReactCustomFormAction} from 'shared/ReactTypes';
import type {TemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';
import type {TemporaryReferenceSet as ServerTemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';
import type {Result} from 'shared/ReactFlightResult';
import type {
  ServerConsumerModuleMap,
  ModuleLoading,
} from 'react-client/src/ReactFlightClientConfig';
import type {ClientManifest} from '../server/ReactFlightServerConfigESMBundler';

import {
  createResponse,
  getRoot,
  close,
} from 'react-client/src/ReactFlightResultClient';

import {
  resolveClientReferenceMetadata,
  getServerReferenceId,
  getServerReferenceBoundArguments,
} from '../server/ReactFlightServerConfigESMBundler';
import {
  isClientReference,
  isServerReference,
} from '../ReactFlightESMReferences';
import {resolveTemporaryReference} from 'react-server/src/ReactFlightServerTemporaryReferences';

type EncodeFormActionCallback = <A>(
  id: any,
  args: Promise<A>,
) => ReactCustomFormAction;

type Options = {
  // The module base path the Server Components render used, to turn its
  // Client References into module paths relative to the module root.
  clientManifest: ClientManifest,
  nonce?: string,
  encodeFormAction?: EncodeFormActionCallback,
  temporaryReferences?: TemporaryReferenceSet,
  onError?: (error: mixed) => ?string,
  signal?: AbortSignal,
};

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

export type {Options};

// The reader is typically created while the renderer that uses it is
// running, as a page's HTML render reads the Result from a component. The
// entry point passes in a snapshot of that async context, so that hints
// emitted later, by whichever consumer runs a component, are dispatched
// into that renderer.
export function createFromResult<T>(
  result: Result<T>,
  moduleRootPath: ServerConsumerModuleMap,
  moduleBaseURL: ModuleLoading,
  options: Options,
  bindToConsumer: null | (<R>(callback: () => R) => R),
): Thenable<T> {
  const clientManifest = options.clientManifest;
  const serverTemporaryReferences: void | ServerTemporaryReferenceSet =
    result.temporaryReferences;
  const response = createResponse(
    result,
    moduleRootPath,
    null, // serverReferenceConfig
    moduleBaseURL,
    {
      isClientReference,
      resolveClientReferenceMetadata: reference =>
        resolveClientReferenceMetadata(clientManifest, reference) as any,
      isServerReference,
      getServerReferenceId: reference =>
        getServerReferenceId(clientManifest, reference),
      getServerReferenceBoundArguments: reference =>
        getServerReferenceBoundArguments(clientManifest, reference),
      resolveTemporaryReference: value =>
        serverTemporaryReferences === undefined
          ? undefined
          : resolveTemporaryReference(serverTemporaryReferences, value),
    },
    noServerCall,
    options.encodeFormAction,
    options.temporaryReferences,
    bindToConsumer,
    typeof options.nonce === 'string' ? options.nonce : undefined,
    options.onError,
  );
  const signal = options.signal;
  if (signal) {
    if (signal.aborted) {
      close(response, signal.reason);
    } else {
      const listener = () => {
        close(response, signal.reason);
        signal.removeEventListener('abort', listener);
      };
      signal.addEventListener('abort', listener);
    }
  }
  return getRoot(response);
}
