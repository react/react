#!/usr/bin/env node

'use strict';

const {join} = require('path');
const {getPublicPackages, handleError} = require('./utils');
const theme = require('./theme');

const confirmVersionAndTags = require('./publish-commands/confirm-version-and-tags');
const parseParams = require('./publish-commands/parse-params');
const publishToNPM = require('./publish-commands/publish-to-npm');
const validateTags = require('./publish-commands/validate-tags');
const validateSkipPackages = require('./publish-commands/validate-skip-packages');

const run = async () => {
  try {
    const params = parseParams();

    const isExperimental = params.tag === 'experimental';

    params.cwd = join(__dirname, '..', '..');
    params.packages = await getPublicPackages(isExperimental);

    if (params.onlyPackages.length > 0 && params.skipPackages.length > 0) {
      console.error(
        '--onlyPackages and --skipPackages cannot be used together'
      );
      process.exit(1);
    }

    if (params.onlyPackages.length > 0) {
      params.packages = params.packages.filter(packageName => {
        return params.onlyPackages.includes(packageName);
      });
    }

    // Pre-filter any skipped packages to simplify the following commands.
    // As part of doing this we can also validate that none of the skipped packages were misspelled.
    params.skipPackages.forEach(packageName => {
      const index = params.packages.indexOf(packageName);
      if (index < 0) {
        console.log(
          theme`Invalid skip package {package ${packageName}} specified.`
        );
        process.exit(1);
      } else {
        params.packages.splice(index, 1);
      }
    });

    await validateTags(params);
    await confirmVersionAndTags(params);
    await validateSkipPackages(params);
    // npm ownership / whoami no longer applies — OIDC trusted publishing
    // verifies the publisher via the registry's per-package config, not via a
    // logged-in npm user.

    const packageNames = params.packages;

    let failed = false;
    for (let i = 0; i < packageNames.length; i++) {
      try {
        const packageName = packageNames[i];
        await publishToNPM(params, packageName, null);
      } catch (error) {
        failed = true;
        console.error(error.message);
        console.log();
        console.log(
          theme.error`Publish failed. Will attempt to publish remaining packages.`
        );
      }
    }
    if (failed) {
      console.log(theme.error`One or more packages failed to publish.`);
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
};

run();
