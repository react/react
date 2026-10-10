/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes';
import type {TemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';
import type {EncodeFormActionCallback} from 'react-client/src/ReactFlightReplyClient';
import type {Result} from 'shared/ReactFlightResult';
import type {ClientManifest} from '../server/ReactFlightServerConfigWebpackBundler';
import type {
  ServerConsumerModuleMap,
  ModuleLoading,
  ServerManifest,
} from 'react-client/src/ReactFlightClientConfig';
import {
  createResponse,
  readResult,
  stopReading,
  addResponseCleanup,
} from 'react-client/src/ReactFlightResultClient';
import {
  isClientReference,
  resolveClientReferenceMetadata,
} from '../server/ReactFlightServerConfigWebpackBundler';

type Options = {
  clientManifest: ClientManifest,
  serverConsumerManifest: {
    moduleMap: ServerConsumerModuleMap,
    moduleLoading: ModuleLoading,
    serverModuleMap: null | ServerManifest,
  },
  nonce?: string,
  findSourceMapURL?: (string, string) => null | string,
  environmentName?: string, // DEV-only
  encodeFormAction?: EncodeFormActionCallback,
  temporaryReferences?: TemporaryReferenceSet,
  onError?: mixed => ?string,
  signal?: AbortSignal,
  unstable_allowPartialStream?: boolean,
};

export function createFromResult<T>(
  result: Result<T>,
  options: Options,
): Thenable<T> {
  const manifest = options.serverConsumerManifest;
  const clientManifest = options.clientManifest;
  const response = createResponse(
    result,
    manifest.moduleMap,
    manifest.serverModuleMap,
    manifest.moduleLoading,
    value => {
      if (!isClientReference(value)) {
        return null;
      }
      return resolveClientReferenceMetadata(
        clientManifest,
        value as any,
      ) as any;
    },
    noServerCall,
    options.encodeFormAction,
    options.nonce,
    options.temporaryReferences,
    options.onError,
    options.unstable_allowPartialStream === true,
    __DEV__ ? options.findSourceMapURL : undefined,
    __DEV__ ? options.environmentName : undefined,
  );
  const signal = options.signal;
  if (signal !== undefined) {
    const onAbort = () => stopReading(response, signal.reason);
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, {once: true});
      addResponseCleanup(response, () =>
        signal.removeEventListener('abort', onAbort),
      );
    }
  }
  return readResult(response, result);
}

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. This would create a fetch waterfall. Try to use a Server Component to pass data to Client Components instead.',
  );
}
