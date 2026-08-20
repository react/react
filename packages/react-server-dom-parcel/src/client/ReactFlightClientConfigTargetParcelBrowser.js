/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ModuleLoading} from './ReactFlightClientConfigBundlerParcel';

export function prepareDestinationWithChunks(
  moduleLoading: ModuleLoading,
  bundles: Array<string>,
  nonce: ?string,
) {
  // In the browser we don't need to prepare our destination since the browser is the Destination
}
