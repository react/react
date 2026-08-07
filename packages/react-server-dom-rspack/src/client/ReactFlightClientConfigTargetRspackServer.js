/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {preinitScriptForSSR} from 'react-client/src/ReactFlightClientConfig';

export type ModuleLoading = null | {
  prefix: string,
  crossOrigin?: 'use-credentials' | '',
};

export function prepareDestinationWithChunks(
  moduleLoading: ModuleLoading,
  // Chunks are double-indexed [..., idx, filenamex, idy, filenamey, ...]
  chunks: Array<string>,
  nonce: ?string,
) {
  if (moduleLoading !== null) {
    for (let i = 1; i < chunks.length; i += 2) {
      preinitScriptForSSR(
        moduleLoading.prefix + chunks[i],
        nonce,
        moduleLoading.crossOrigin,
      );
    }
  }
}
