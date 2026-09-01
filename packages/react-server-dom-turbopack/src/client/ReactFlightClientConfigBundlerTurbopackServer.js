/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactDebugInfo} from 'shared/ReactTypes';

import type {Chunk} from '../shared/ReactFlightImportMetadata';

export function loadChunk(filename: Chunk): Promise<mixed> {
  return __turbopack_load_by_url__(filename);
}

export function addChunkDebugInfo(
  target: ReactDebugInfo,
  filename: string,
): void {
  // We don't emit any debug info on the server since we assume the loading
  // of the bundle is insignificant on the server.
}
