#!/usr/bin/env node

'use strict';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {access, copyFile} = require('fs/promises');
const {join} = require('path');

const packageRoot = join(__dirname, '..');

async function copyIfExists(source, target) {
  try {
    await access(source);
  } catch {
    return;
  }
  await copyFile(source, target);
}

async function main() {
  await copyIfExists(
    join(packageRoot, 'dist/index.d.ts'),
    join(packageRoot, 'dist/index.d.cts')
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
