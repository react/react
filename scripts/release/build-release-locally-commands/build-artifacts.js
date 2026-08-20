#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const {join} = require('path');
const {logPromise} = require('../utils');
const shell = require('shelljs');

const run = async ({cwd, dry, tempDirectory}) => {
  const defaultOptions = {
    cwd: tempDirectory,
  };

  await exec('yarn install', defaultOptions);
  await exec('yarn build -- --extract-errors', defaultOptions);

  const tempNodeModulesPath = join(tempDirectory, 'build', 'node_modules');
  const buildPath = join(cwd, 'build');

  shell.cp('-r', tempNodeModulesPath, buildPath);
};

module.exports = async params => {
  return logPromise(run(params), 'Building artifacts', 600000);
};
