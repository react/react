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
  external: [
    '@babel/core',
    'hermes-parser',
    'zod',
    'zod/v4',
    'zod-validation-error',
    'zod-validation-error/v4',
  ],
  splitting: false,
  sourcemap: false,
  dts: false,
  bundle: true,
  format: 'cjs',
  platform: 'node',
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
 */

"use no memo";`,
  },
});
