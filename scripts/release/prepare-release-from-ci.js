#!/usr/bin/env node

'use strict';

const {join} = require('path');
const {addDefaultParamValue, handleError} = require('./utils');

const {
  downloadBuildArtifacts,
} = require('./shared-commands/download-build-artifacts');
const parseParams = require('./shared-commands/parse-params');
const printPrereleaseSummary = require('./shared-commands/print-prerelease-summary');
const testPackagingFixture = require('./shared-commands/test-packaging-fixture');

const run = async () => {
  try {
    addDefaultParamValue(null, '--commit', 'main');

    const params = await parseParams();
    params.cwd = join(__dirname, '..', '..');

    await downloadBuildArtifacts({
      commit: params.commit,
      releaseChannel: params.releaseChannel ?? process.env.RELEASE_CHANNEL,
    });

    if (!params.skipTests) {
      await testPackagingFixture(params);
    }

    const isLatestRelease = params.releaseChannel === 'latest';
    await printPrereleaseSummary(params, isLatestRelease);
  } catch (error) {
    handleError(error);
  }
};

run();
