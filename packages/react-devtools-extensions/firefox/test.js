#!/usr/bin/env node

'use strict';

const {spawn} = require('child_process');
const {Finder} = require('firefox-profile');
const {resolve} = require('path');
const {argv} = require('yargs');

const EXTENSION_PATH = resolve('./firefox/build/unpacked');
const START_URL = argv.url || 'https://react.dev/';

const firefoxVersion = process.env.WEB_EXT_FIREFOX;

function runWebExt(options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('web-ext', ['run', ...options], {
      stdio: 'inherit',
    });

    child.on('error', rejectPromise);
    child.on('close', code => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`web-ext run exited with code ${code}`));
      }
    });
  });
}

const getFirefoxProfileName = () => {
  // Keys are pulled from https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#--firefox
  // and profile names from https://searchfox.org/mozilla-central/source/toolkit/profile/xpcshell/head.js#96
  switch (firefoxVersion) {
    case 'firefox':
      return 'default-release';
    case 'beta':
      return 'default-beta';
    case 'nightly':
      return 'default-nightly';
    case 'firefoxdeveloperedition':
      return 'dev-edition-default';
    default:
      // Fall back to using the default Firefox profile for testing purposes.
      // This prevents users from having to re-login-to sites before testing.
      return 'default';
  }
};

const main = async () => {
  const finder = new Finder();

  const findPathPromise = new Promise((resolvePromise, rejectPromise) => {
    finder.getPath(getFirefoxProfileName(), (error, profile) => {
      if (error) {
        rejectPromise(error);
      } else {
        resolvePromise(profile);
      }
    });
  });

  const options = [
    `--source-dir=${EXTENSION_PATH}`,
    `--start-url=${START_URL}`,
    '--browser-console',
  ];

  try {
    const path = await findPathPromise;
    options.push(`--firefox-profile=${path}`);
  } catch (err) {
    console.warn('Could not find default profile, using temporary profile.');
  }

  try {
    await runWebExt(options);
  } catch (err) {
    console.error('`web-ext run` failed', err);
  }
};

main();
