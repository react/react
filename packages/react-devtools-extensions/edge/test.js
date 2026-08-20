#!/usr/bin/env node

'use strict';

const open = require('open');
const os = require('os');
const osName = require('os-name');
const {resolve} = require('path');
const {argv} = require('yargs');

const EXTENSION_PATH = resolve('./edge/build/unpacked');
const START_URL = argv.url || 'https://react.dev/';

const extargs = `--load-extension=${EXTENSION_PATH}`;

const osname = osName(os.platform());
let appname;

if (osname && osname.toLocaleLowerCase().startsWith('windows')) {
  appname = 'msedge';
} else if (osname && osname.toLocaleLowerCase().startsWith('mac')) {
  appname = 'Microsoft Edge';
} else if (osname && osname.toLocaleLowerCase().startsWith('linux')) {
  //Coming soon
}

if (appname) {
  (async () => {
    await open(START_URL, {app: [appname, extargs]});
  })();
}
