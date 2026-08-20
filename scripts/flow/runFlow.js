/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const chalk = require('chalk');
const {spawn} = require('child_process');
const fs = require('fs');

// TODO: This generates all the renderer configs at once. Originally this was
// to allow the possibility of running multiple Flow processes in parallel, but
// that never happened. If we did, we'd probably do this in CI, anyway, and run
// on multiple machines. So instead we could remove this intermediate step and
// generate only the config for the specified renderer.
require('./createFlowConfigs');

async function runFlow(renderer, args) {
  return new Promise(resolve => {
    let cmd = __dirname + '/../../node_modules/.bin/flow';
    if (process.platform === 'win32') {
      cmd = cmd.replace(/\//g, '\\') + '.cmd';
    }

    // Copy renderer flowconfig file to the root of the project so that it
    // works with editor integrations. This means that the Flow config used by
    // the editor will correspond to the last renderer you checked.
    const srcPath =
      process.cwd() + '/scripts/flow/' + renderer + '/.flowconfig';
    const srcStat = fs.statSync(__dirname + '/config/flowconfig');
    const destPath = './.flowconfig';
    if (fs.existsSync(destPath)) {
      const oldConfig = String(fs.readFileSync(destPath));
      const newConfig = String(fs.readFileSync(srcPath));
      if (oldConfig !== newConfig) {
        // Use the mtime to detect if the file was manually edited. If so,
        // log an error.
        const destStat = fs.statSync(destPath);
        if (destStat.mtimeMs - srcStat.mtimeMs > 1) {
          console.error(
            chalk.red(
              'Detected manual changes to .flowconfig, which is a generated ' +
                'file. These changes have been discarded.\n\n' +
                'To change the Flow config, edit the template in ' +
                'scripts/flow/config/flowconfig. Then run this command again.\n',
            ),
          );
        }
        fs.unlinkSync(destPath);
        fs.copyFileSync(srcPath, destPath);
        // Set the mtime of the copied file to be same as the original file,
        // so that the above check works.
        fs.utimesSync(destPath, srcStat.atime, srcStat.mtime);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
      fs.utimesSync(destPath, srcStat.atime, srcStat.mtime);
    }

    console.log(
      'Running Flow on the ' + chalk.yellow(renderer) + ' renderer...',
    );

    spawn(cmd, args, {
      // Allow colors to pass through:
      stdio: 'inherit',
    }).on('close', function (code) {
      if (code !== 0) {
        console.error(
          'Flow failed for the ' + chalk.red(renderer) + ' renderer',
        );
        console.log();
        process.exit(code);
      } else {
        console.log(
          'Flow passed for the ' + chalk.green(renderer) + ' renderer',
        );
        resolve();
      }
    });
  });
}

module.exports = runFlow;
