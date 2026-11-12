#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (
  version == null ||
  !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    version
  )
) {
  console.error('Usage: update-rust-crate-version.js <semver>');
  process.exit(1);
}

const manifestPath = path.join(__dirname, '..', 'Cargo.toml');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const packageVersionMatch = manifest.match(
  /\[workspace\.package\]\nversion = "([^"]+)"/
);

if (packageVersionMatch == null) {
  throw new Error('Could not find the workspace package version');
}

const currentVersion = packageVersionMatch[1];
const internalDependencyPattern = new RegExp(
  `(react_compiler(?:_[a-z_]+)? = \\{ version = ")${currentVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}("[^\\n]+\\})`,
  'g'
);
const internalDependencies = manifest.match(internalDependencyPattern) ?? [];

if (internalDependencies.length !== 11) {
  throw new Error(
    `Expected 11 versioned internal dependencies, found ${internalDependencies.length}`
  );
}

const updatedManifest = manifest
  .replace(
    `[workspace.package]\nversion = "${currentVersion}"`,
    `[workspace.package]\nversion = "${version}"`
  )
  .replace(internalDependencyPattern, `$1${version}$2`);

fs.writeFileSync(manifestPath, updatedManifest);
