/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {execSync} = require('child_process');
const {existsSync, readFileSync} = require('fs');
const {resolve} = require('path');

const GITHUB_URL = 'https://github.com/facebook/react';

function getGitCommit() {
  try {
    return execSync('git show -s --no-show-signature --format=%h')
      .toString()
      .trim();
  } catch (error) {
    // Mozilla runs this command from a git archive.
    // In that context, there is no Git context.
    // Using the commit hash specified to download-experimental-build.js script as a fallback.

    // Try to read from build/COMMIT_SHA file
    const commitShaPath = resolve(__dirname, '..', '..', 'build', 'COMMIT_SHA');
    if (!existsSync(commitShaPath)) {
      throw new Error(
        'Could not find build/COMMIT_SHA file. Did you run scripts/release/download-experimental-build.js script?',
      );
    }

    try {
      const commitHash = readFileSync(commitShaPath, 'utf8').trim();
      // Return short hash (first 7 characters) to match abbreviated commit hash format
      return commitHash.slice(0, 7);
    } catch (readError) {
      throw new Error(
        `Failed to read build/COMMIT_SHA file: ${readError.message}`,
      );
    }
  }
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
