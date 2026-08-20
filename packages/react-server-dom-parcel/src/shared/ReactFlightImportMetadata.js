/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This is the parsed shape of the wire format which is why it is
// condensed to only the essentialy information
export type ImportMetadata = [
  // eslint does not understand Flow tuple syntax.
  /* eslint-disable */
  id: string,
  name: string,
  bundles: Array<string>,
  importMap?: {[string]: string},
  /* eslint-enable */
];

export const ID = 0;
export const NAME = 1;
export const BUNDLES = 2;
export const IMPORT_MAP = 3;
