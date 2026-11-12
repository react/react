#!/usr/bin/env node

'use strict';

const commandLineArgs = require('command-line-args');
const {splitCommaParams} = require('../utils');

const paramDefinitions = [
  {
    name: 'dry',
    type: Boolean,
    description: 'Dry run command without actually publishing to NPM.',
    defaultValue: false,
  },
  {
    name: 'tag',
    type: String,
    description:
      'NPM dist-tag to attach at publish time. OIDC trusted publishing ' +
      'authorizes a single tag per publish, so only one value is accepted ' +
      '— passing comma-separated tags or repeating --tag is rejected.',
  },
  {
    name: 'onlyPackages',
    type: String,
    multiple: true,
    description: 'Packages to include in publishing',
    defaultValue: [],
  },
  {
    name: 'skipPackages',
    type: String,
    multiple: true,
    description: 'Packages to exclude from publishing',
    defaultValue: [],
  },
];

module.exports = () => {
  const params = commandLineArgs(paramDefinitions);
  splitCommaParams(params.skipPackages);
  splitCommaParams(params.onlyPackages);

  // Single-tag invariant. `command-line-args` already collapses multiple
  // --tag occurrences to the last value (since `multiple` is not set), but it
  // happily accepts `--tag a,b` as the literal string "a,b". Reject that
  // here so the failure is loud and obvious instead of being deferred to a
  // later "Unsupported tag" message that doesn't explain the cause.
  if (params.tag == null || params.tag === '') {
    console.error('--tag is required and must be a single dist-tag.');
    process.exit(1);
  }
  if (params.tag.includes(',') || params.tag.includes(' ')) {
    console.error('Only a single --tag is allowed, got: "' + params.tag + '"');
    process.exit(1);
  }
  switch (params.tag) {
    case 'latest':
    case 'canary':
    case 'experimental':
    case 'backport':
    case 'alpha':
    case 'beta':
    case 'rc':
      break;
    default:
      console.error('Unsupported tag: "' + params.tag + '"');
      process.exit(1);
  }

  return params;
};
