#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const electron = require('electron');
const spawn = require('cross-spawn');
const argv = process.argv.slice(2);
const pkg = require('./package.json');

async function notifyIfUpdateIsAvailable() {
  const updateNotifier = (await import('update-notifier')).default;

  // Notify if there's an update in 7 days' interval
  const notifier = updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24 * 7,
  });

  if (notifier.update) {
    const updateMsg =
      `Update available ${notifier.update.current} -> ${notifier.update.latest}` +
      '\nTo update:' +
      '\n"npm i [-g] react-devtools" or "yarn add react-devtools"';
    notifier.notify({defer: false, message: updateMsg});
  }
}

function startDevTools() {
  const result = spawn.sync(electron, [require.resolve('./app')].concat(argv), {
    stdio: 'ignore',
  });

  process.exit(result.status);
}

notifyIfUpdateIsAvailable().then(startDevTools, startDevTools);
