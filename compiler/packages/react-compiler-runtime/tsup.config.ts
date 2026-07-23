/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {readFile, writeFile} from 'node:fs/promises';
import {defineConfig} from 'tsup';

async function copyLegacyCommonJSOutput() {
  const source = './dist/index.cjs';
  const sourceMap = './dist/index.cjs.map';
  const legacy = './dist/index.js';
  const legacyMap = './dist/index.js.map';

  const [sourceText, sourceMapText] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(sourceMap, 'utf8'),
  ]);

  await Promise.all([
    writeFile(
      legacy,
      sourceText.replace(
        '//# sourceMappingURL=index.cjs.map',
        '//# sourceMappingURL=index.js.map',
      ),
    ),
    writeFile(legacyMap, sourceMapText),
  ]);
}

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  external: ['react'],
  splitting: false,
  sourcemap: true,
  dts: false,
  bundle: true,
  format: ['cjs', 'esm'],
  outExtension({format}) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
  platform: 'node',
  target: 'es2015',
  onSuccess: copyLegacyCommonJSOutput,
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
