/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const execFileSync = require('child_process').execFileSync;

const exec = (command, args) => {
  console.log('> ' + [command].concat(args).join(' '));
  const options = {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
  };
  return execFileSync(command, args, options);
};

const isGit = () => {
  try {
    const wt = execGitCmd(['rev-parse', '--is-inside-work-tree']);
    return wt.length > 0 && wt[0] === 'true';
  } catch (_e) {
    return false;
  }
};

const isSl = () => {
  try {
    execSlCmd(['whereami']);
    return true;
  } catch (_e) {
    return false;
  }
};

const execGitCmd = args => exec('git', args).trim().toString().split('\n');
const execSlCmd = args => exec('sl', args).trim().toString().split('\n');

const listChangedFiles = () => {
  if (isGit()) {
    const mergeBase = execGitCmd(['merge-base', 'HEAD', 'main']);
    return new Set([
      ...execGitCmd([
        'diff',
        '--name-only',
        '--diff-filter=ACMRTUB',
        mergeBase,
      ]),
      ...execGitCmd(['ls-files', '--others', '--exclude-standard']),
    ]);
  } else if (isSl()) {
    const mergeBase = execSlCmd(['log', '-r', 'last(public() & ::.)'])[0]
      .trim()
      .split(/\s+/)[1];
    return new Set(execSlCmd(['status', '--no-status', '--rev', mergeBase]));
  }
  throw new Error('Not a git or sl repo');
};

module.exports = listChangedFiles;
