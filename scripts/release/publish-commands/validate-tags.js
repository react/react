#!/usr/bin/env node

'use strict';

const {readJson} = require('fs-extra');
const {join} = require('path');
const theme = require('../theme');

const run = async ({cwd, packages, tag}) => {
  // All canaries share a version number, so it's okay to check any of them.
  const arbitraryPackageName = packages[0];
  const packageJSONPath = join(
    cwd,
    'build',
    'node_modules',
    arbitraryPackageName,
    'package.json'
  );
  const {version} = await readJson(packageJSONPath);

  const isExperimentalVersion = version.indexOf('experimental') !== -1;
  if (version.indexOf('-') !== -1) {
    // Prerelease: canary or experimental.
    if (tag === 'latest' || tag === 'backport') {
      console.log(
        theme`{error Prerelease} {version ${version}} {error cannot be tagged as} {tag ${tag}}`
      );
      process.exit(1);
    }
    if (tag === 'experimental' && !isExperimentalVersion) {
      console.log(
        theme`{error Canary release} {version ${version}} {error cannot be tagged as} {tag experimental}`
      );
      process.exit(1);
    }
    if (tag === 'canary' && isExperimentalVersion) {
      console.log(
        theme`{error Experimental release} {version ${version}} {error cannot be tagged as} {tag canary}`
      );
      process.exit(1);
    }
  } else {
    // Semver stable: must publish under @latest or @backport.
    if (tag !== 'latest' && tag !== 'backport') {
      console.log(
        theme`{error Stable release} {version ${version}} {error must be tagged as} {tag latest} {error or} {tag backport}`
      );
      process.exit(1);
    }
  }
};

module.exports = run;
