/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const cp = require('child_process');
const util = require('util');

function execHelper(command, options, streamStdout = false) {
  return new Promise((resolve, reject) => {
    const proc = cp.exec(command, options, (error, stdout) =>
      error ? reject(error) : resolve(stdout.trim())
    );
    if (streamStdout) {
      proc.stdout.pipe(process.stdout);
    }
  });
}

function _spawn(command, args, options, cb) {
  const child = cp.spawn(command, args, options);
  child.on('close', exitCode => {
    cb(null, exitCode);
  });
  return child;
}
const spawnHelper = util.promisify(_spawn);

async function getDateStringForCommit(commit) {
  let dateString = await execHelper(
    `git show -s --no-show-signature --format=%cd --date=format:%Y%m%d ${commit}`
  );

  // On CI environment, this string is wrapped with quotes '...'s
  if (dateString.startsWith("'")) {
    dateString = dateString.slice(1, 9);
  }

  return dateString;
}

module.exports = {
  execHelper,
  spawnHelper,
  getDateStringForCommit,
};
