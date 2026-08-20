#!/usr/bin/env node

'use strict';

const chromeLaunch = require('chrome-launch');
const {resolve} = require('path');
const {argv} = require('yargs');

const EXTENSION_PATH = resolve('./chrome/build/unpacked');
const START_URL = argv.url || 'https://react.dev/';

chromeLaunch(START_URL, {
  args: [
    // Load the React DevTools extension
    `--load-extension=${EXTENSION_PATH}`,

    // Automatically open DevTools window
    '--auto-open-devtools-for-tabs',

    // Remembers previous session settings (e.g. DevTools size/position)
    '--user-data-dir=./.tempUserDataDir',
  ],
});
