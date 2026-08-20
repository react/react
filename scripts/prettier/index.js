/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Based on similar script in Jest
// https://github.com/facebook/jest/blob/a7acc5ae519613647ff2c253dd21933d6f94b47f/scripts/prettier.js

const chalk = require('chalk');
const glob = require('glob');
const prettier = require('prettier');
const fs = require('fs');
const path = require('path');
const listChangedFiles = require('../shared/listChangedFiles');
const prettierConfigPath = require.resolve('../../.prettierrc');

const mode = process.argv[2] || 'check';
const shouldWrite = mode === 'write' || mode === 'write-changed';
const onlyChanged = mode === 'check-changed' || mode === 'write-changed';

const changedFiles = onlyChanged ? listChangedFiles() : null;

const prettierIgnoreFilePath = path.join(
  __dirname,
  '..',
  '..',
  '.prettierignore'
);
const prettierIgnore = fs.readFileSync(prettierIgnoreFilePath, {
  encoding: 'utf8',
});
const ignoredPathsListedInPrettierIgnore = prettierIgnore
  .toString()
  .replace(/\r\n/g, '\n')
  .split('\n')
  .filter(line => !!line && !line.startsWith('#'));

const ignoredPathsListedInPrettierIgnoreInGlobFormat =
  ignoredPathsListedInPrettierIgnore.map(ignoredPath => {
    const existsAndDirectory =
      fs.existsSync(ignoredPath) && fs.lstatSync(ignoredPath).isDirectory();

    if (existsAndDirectory) {
      return path.join(ignoredPath, '/**');
    }

    return ignoredPath;
  });

const files = glob
  .sync('**/*.{js,jsx,ts,tsx}', {
    ignore: [
      '**/*.d.ts',
      '**/node_modules/**',
      '**/cjs/**',
      '**/dist/**',
      '**/__snapshots__/**',
      'packages/**/*.ts', // runtime prettier uses Flow parser
      ...ignoredPathsListedInPrettierIgnoreInGlobFormat,
    ],
  })
  .filter(f => !onlyChanged || changedFiles.has(f));

if (!files.length) {
  process.exit(0);
}

async function main() {
  let didWarn = false;
  let didError = false;

  await Promise.all(
    files.map(async file => {
      const options = await prettier.resolveConfig(file, {
        config: prettierConfigPath,
      });
      try {
        const input = fs.readFileSync(file, 'utf8');
        if (shouldWrite) {
          const output = await prettier.format(input, options);
          if (output !== input) {
            fs.writeFileSync(file, output, 'utf8');
          }
        } else {
          const isFormatted = await prettier.check(input, options);
          if (!isFormatted) {
            if (!didWarn) {
              console.log(
                '\n' +
                  chalk.red(
                    `  This project uses prettier to format all JavaScript code.\n`
                  ) +
                  chalk.dim(`    Please run `) +
                  chalk.reset('yarn prettier-all') +
                  chalk.dim(
                    ` and add changes to files listed below to your commit:`
                  ) +
                  `\n\n`
              );
              didWarn = true;
            }
            console.log(file);
          }
        }
      } catch (error) {
        didError = true;
        console.log('\n\n' + error.message);
        console.log(file);
      }
    })
  );
  if (didWarn || didError) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
