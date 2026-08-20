#!/usr/bin/env node

'use strict';

const {exec, execSync} = require('child_process');
const {readFileSync, writeFileSync} = require('fs');
const {join} = require('path');
const shell = require('shelljs');
const main = async buildId => {
  const root = join(__dirname, buildId);
  const buildPath = join(root, 'build');

  execSync(`node ${join(root, './build')}`, {
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });
  shell.cp(join(root, 'now.json'), join(buildPath, 'now.json'));
  const file = readFileSync(join(root, 'now.json'));
  const json = JSON.parse(file);
  const alias = json.alias[0];

  const commit = execSync('git rev-parse HEAD').toString().trim().slice(0, 7);

  let date = new Date();
  date = `${date.toLocaleDateString()} – ${date.toLocaleTimeString()}`;

  const installationInstructions =
    buildId === 'chrome'
      ? readFileSync(join(__dirname, 'deploy.chrome.html'))
      : readFileSync(join(__dirname, 'deploy.firefox.html'));

  let html = readFileSync(join(__dirname, 'deploy.html')).toString();
  html = html.replace(/%commit%/g, commit);
  html = html.replace(/%date%/g, date);
  html = html.replace(/%installation%/, installationInstructions);

  writeFileSync(join(buildPath, 'index.html'), html);

  await exec(`now deploy && now alias ${alias}`, {
    cwd: buildPath,
    stdio: 'inherit',
  });

  console.log(`Deployed to https://${alias}.now.sh`);
};

module.exports = main;
