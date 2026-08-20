#!/usr/bin/env node

'use strict';

const chalk = require('chalk');
const {execSync} = require('child_process');
const {join} = require('path');
const {argv} = require('yargs');

const build = require('../build');

const main = async () => {
  const {crx} = argv;

  await build('edge');

  const cwd = join(__dirname, 'build');
  if (crx) {
    const crxPath = join(__dirname, '..', 'node_modules', '.bin', 'crx');

    execSync(`${crxPath} pack ./unpacked -o ReactDevTools.crx`, {
      cwd,
    });
  }

  console.log(chalk.green('\nThe Microsoft Edge extension has been built!'));

  console.log(chalk.green('\nTo load this extension:'));
  console.log(chalk.yellow('Navigate to edge://extensions/'));
  console.log(chalk.yellow('Enable "Developer mode"'));
  console.log(chalk.yellow('Click "LOAD UNPACKED"'));
  console.log(chalk.yellow('Select extension folder - ' + cwd + '\\unpacked'));

  console.log(chalk.green('\nYou can test this build by running:'));
  console.log(chalk.gray('\n# From the react-devtools root directory:'));
  console.log('yarn run test:edge\n');
};

main();
