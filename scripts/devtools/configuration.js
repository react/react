'use strict';

const {join} = require('path');

const PACKAGE_PATHS = [
  'packages/react-devtools/package.json',
  'packages/react-devtools-core/package.json',
  'packages/react-devtools-inline/package.json',
];

const MANIFEST_PATHS = [
  'packages/react-devtools-extensions/chrome/manifest.json',
  'packages/react-devtools-extensions/edge/manifest.json',
  'packages/react-devtools-extensions/firefox/manifest.json',
];

const NPM_PACKAGES = [
  'react-devtools',
  'react-devtools-core',
  'react-devtools-inline',
];

const CHANGELOG_PATH = 'packages/react-devtools/CHANGELOG.md';

const PULL_REQUEST_BASE_URL = 'https://github.com/facebook/react/pull/';

const RELEASE_SCRIPT_TOKEN = '<!-- RELEASE_SCRIPT_TOKEN -->';

const ROOT_PATH = join(__dirname, '..', '..');

const DRY_RUN = process.argv.includes('--dry');

const BUILD_METADATA_TEMP_DIRECTORY = join(__dirname, '.build-metadata');

module.exports = {
  BUILD_METADATA_TEMP_DIRECTORY,
  CHANGELOG_PATH,
  DRY_RUN,
  MANIFEST_PATHS,
  NPM_PACKAGES,
  PACKAGE_PATHS,
  PULL_REQUEST_BASE_URL,
  RELEASE_SCRIPT_TOKEN,
  ROOT_PATH,
};
