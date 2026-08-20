#!/usr/bin/env node

'use strict';

const commandLineArgs = require('command-line-args');
const theme = require('../theme');

const paramDefinitions = [
  {
    name: 'build',
    type: String,
    description:
      'CI build ID corresponding to the "process_artifacts_combined" task.',
    defaultValue: null,
  },
  {
    name: 'commit',
    type: String,
    description:
      'GitHub commit SHA. When provided, automatically finds corresponding CI build.',
    defaultValue: null,
  },
  {
    name: 'skipTests',
    type: Boolean,
    description: 'Skip automated fixture tests.',
    defaultValue: false,
  },
  {
    name: 'releaseChannel',
    alias: 'r',
    type: String,
    description: 'Release channel (stable, experimental, or latest)',
  },
  {
    name: 'allowBrokenCI',
    type: Boolean,
    description:
      'Continue even if CI is failing. Useful if you need to debug a broken build.',
    defaultValue: false,
  },
];

module.exports = async () => {
  const params = commandLineArgs(paramDefinitions);

  const channel = params.releaseChannel;
  if (
    channel !== 'experimental' &&
    channel !== 'stable' &&
    channel !== 'rc' &&
    channel !== 'latest'
  ) {
    console.error(
      theme.error`Invalid release channel (-r) "${channel}". Must be "stable", "experimental", "rc", or "latest".`
    );
    process.exit(1);
  }

  if (params.commit === null) {
    console.error(theme.error`A --commit param must be specified.`);
    process.exit(1);
  }

  return params;
};
