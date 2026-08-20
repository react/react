/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ModuleLoading} from './ReactFlightClientConfigBundlerParcel';
import {preinitModuleForSSR} from 'react-client/src/ReactFlightClientConfig';

export function prepareDestinationWithChunks(
  moduleLoading: ModuleLoading,
  bundles: Array<string>,
  nonce: ?string,
) {
  for (let i = 0; i < bundles.length; i++) {
    preinitModuleForSSR(parcelRequire.meta.publicUrl + bundles[i], nonce);
  }
}
