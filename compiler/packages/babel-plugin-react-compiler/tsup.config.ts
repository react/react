/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  external: ['@babel/types'],
  splitting: false,
  sourcemap: false,
  dts: false,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  /*
   * The compiler runs in Node, and needs Node 16.6+ at runtime (it uses
   * Array.prototype.at). Targeting Node 16 keeps syntax that every supported
   * Node version runs natively (generators with yield*, private class members,
   * object spread) instead of lowering it to slower helpers.
   */
  target: 'node16',
  banner: {
    js: `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @lightSyntaxTransform
 * @noflow
 * @nolint
 * @preventMunge
 * @preserve-invariant-messages
 */`,
  },
});
