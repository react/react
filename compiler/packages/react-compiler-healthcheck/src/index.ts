/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {glob} from 'fast-glob';
import * as fs from 'fs/promises';
import ora from 'ora';
import yargs from 'yargs/yargs';
import libraryCompatCheck from './checks/libraryCompat';
import reactCompilerCheck from './checks/reactCompiler';
import strictModeCheck from './checks/strictMode';

async function main() {
  const argv = yargs(process.argv.slice(2))
    .scriptName('healthcheck')
    .usage('$ npx healthcheck <src>')
    .option('src', {
      description: 'glob expression matching src files to compile',
      type: 'string',
      default: '**/+(*.{js,mjs,jsx,ts,tsx}|package.json)',
    })
    .parseSync();

  const spinner = ora('Checking').start();
  let src = argv.src;

  const globOptions = {
    onlyFiles: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/__e2e__/**',
    ],
  };

  for (const path of await glob(src, globOptions)) {
    const source = await fs.readFile(path, 'utf-8');
    spinner.text = `Checking ${path}`;
    reactCompilerCheck.run(source, path);
    strictModeCheck.run(source, path);
    libraryCompatCheck.run(source, path);
  }
  spinner.stop();

  reactCompilerCheck.report();
  strictModeCheck.report();
  libraryCompatCheck.report();
}

main();
