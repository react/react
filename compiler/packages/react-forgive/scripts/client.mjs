/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const entryPoint = path.join(__dirname, '../client/src/extension.ts');
export const outfile = path.join(__dirname, '../dist/extension.js');
export const config = {
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  external: ['vscode'],
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

`,
  },
};
