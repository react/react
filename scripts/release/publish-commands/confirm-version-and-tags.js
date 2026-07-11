#!/usr/bin/env node

'use strict';

const {readJson} = require('fs-extra');
const {join} = require('path');
const theme = require('../theme');

const run = async ({cwd, packages, tag}) => {
  console.log(
    theme`{spinnerSuccess ✓} You are about the publish the following packages under the tag {tag ${tag}}:`
  );

  for (let i = 0; i < packages.length; i++) {
    const packageName = packages[i];
    const packageJSONPath = join(
      cwd,
      'build/node_modules',
      packageName,
      'package.json'
    );
    const packageJSON = await readJson(packageJSONPath);
    console.log(
      `::group::${theme`{package ${packageName}} {version ${packageJSON.version}}`}`
    );
    console.log(packageJSON);
    console.log('::endgroup::');
  }
};

module.exports = run;
