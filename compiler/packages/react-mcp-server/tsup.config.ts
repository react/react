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
  external: [],
  splitting: false,
  sourcemap: false,
  dts: false,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2022',
  banner: {
    js: `#!/usr/bin/env node

/**
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
