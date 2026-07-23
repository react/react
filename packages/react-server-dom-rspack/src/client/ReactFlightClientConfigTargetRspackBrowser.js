/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type ModuleLoading = null;

export function prepareDestinationWithChunks(
  moduleLoading: ModuleLoading,
  chunks: mixed,
  nonce: ?string,
) {
  // In the browser we don't need to prepare our destination since the browser is the Destination
}
