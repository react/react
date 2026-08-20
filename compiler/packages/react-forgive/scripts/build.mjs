#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as esbuild from 'esbuild';
import yargs from 'yargs';
import * as Server from './server.mjs';
import * as Client from './client.mjs';
import path from 'path';
import {fileURLToPath} from 'url';

const IS_DEV = process.env.NODE_ENV === 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = yargs(process.argv.slice(2))
  .choices('t', ['client', 'server'])
  .options('w', {
    alias: 'watch',
    default: false,
    type: 'boolean',
  })
  .parse();

async function main() {
  if (argv.w) {
    const serverCtx = await esbuild.context(Server.config);
    const clientCtx = await esbuild.context(Client.config);
    await Promise.all([serverCtx.watch(), clientCtx.watch()]);
    console.log('watching for changes...');
  } else {
    switch (argv.t) {
      case 'server': {
        await esbuild.build({
          sourcemap: IS_DEV,
          minify: IS_DEV === false,
          ...Server.config,
        });
        break;
      }
      case 'client': {
        await esbuild.build({
          sourcemap: IS_DEV,
          minify: IS_DEV === false,
          ...Client.config,
        });
        break;
      }
    }
  }
}

main();
