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
  suffix?: string,
  crossOrigin?: 'use-credentials' | '',
};

export function prepareDestinationWithChunks(
  moduleLoading: ModuleLoading,
  // Chunks are single-indexed filenames
  chunks: Array<string>,
  nonce: ?string,
) {
  if (moduleLoading !== null) {
    for (let i = 0; i < chunks.length; i++) {
      preinitScriptForSSR(
        moduleLoading.prefix +
          chunks[i] +
          (moduleLoading.suffix != null ? moduleLoading.suffix : ''),
        nonce,
        moduleLoading.crossOrigin,
      );
    }
  }
}
