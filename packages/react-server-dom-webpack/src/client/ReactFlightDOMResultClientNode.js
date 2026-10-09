/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes';
import type {Result} from 'shared/ReactFlightResult';
import type {ClientManifest} from '../server/ReactFlightServerConfigWebpackBundler';
import type {
  ServerConsumerModuleMap,
  ModuleLoading,
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
    serverModuleMap: null,
  },
  nonce?: string,
  onError?: mixed => ?string,
  signal?: AbortSignal,
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
    options.nonce,
    options.onError,
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
