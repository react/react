/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {execSync} = require('child_process');
const {readFileSync} = require('fs');
const {resolve} = require('path');

const GITHUB_URL = 'https://github.com/facebook/react';
const GIT_COMMIT_HASH_LENGTH = 10;

function shortenCommitHash(commitHash) {
  return commitHash.trim().slice(0, GIT_COMMIT_HASH_LENGTH);
}

function getGitCommit() {
  const commitHash = execSync(
    'git show -s --no-show-signature --format=%H',
  ).toString();
  return shortenCommitHash(commitHash);
}

function getVersionString(packageVersion = null) {
  if (packageVersion == null) {
    packageVersion = JSON.parse(
      readFileSync(
        resolve(__dirname, '..', 'react-devtools-core', './package.json'),
      ),
    ).version;
  }

  const commit = getGitCommit();

  return `${packageVersion}-${commit}`;
}

module.exports = {
  GITHUB_URL,
  getGitCommit,
  getVersionString,
};
