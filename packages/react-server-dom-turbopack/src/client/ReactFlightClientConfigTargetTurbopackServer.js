/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {preinitScriptForSSR} from 'react-client/src/ReactFlightClientConfig';

import type {Chunk} from '../shared/ReactFlightImportMetadata';

export type ModuleLoading = null | {
  prefix: string,
  crossOrigin?: 'use-credentials' | '',
  integrity?: {+[chunkFilename: string]: string},
};

export function prepareDestinationWithChunks(
  moduleLoading: ModuleLoading,
  chunks: Array<Chunk>,
  nonce: ?string,
) {
  if (moduleLoading !== null) {
    const integrity = moduleLoading.integrity;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // A merged chunk is `[mergedChunkFilename, ...]`; preinit its own URL.
      const chunkFilename = typeof chunk === 'string' ? chunk : chunk[0];
      preinitScriptForSSR(
        moduleLoading.prefix + chunkFilename,
        nonce,
        moduleLoading.crossOrigin,
        integrity === undefined ? undefined : integrity[chunkFilename],
      );
    }
  }
}
