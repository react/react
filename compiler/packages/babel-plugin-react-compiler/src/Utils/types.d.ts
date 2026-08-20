/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type ExtractClassProperties<C> = {
  [K in keyof C as C[K] extends Function ? never : K]: C[K];
};
