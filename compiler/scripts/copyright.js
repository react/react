/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs');
const glob = require('glob');

const META_COPYRIGHT_COMMENT_BLOCK =
  `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */`.trim() + '\n\n';

const files = glob.sync('**/*.{js,ts,tsx,jsx,rs}', {
  ignore: [
    '**/dist/**',
    '**/node_modules/**',
    '**/tests/fixtures/**',
    '**/__tests__/fixtures/**',
  ],
});

const updatedFiles = new Map();
let hasErrors = false;
files.forEach(file => {
  try {
    const result = processFile(file);
    if (result != null) {
      updatedFiles.set(file, result);
    }
  } catch (e) {
    console.error(e);
    hasErrors = true;
  }
});
if (hasErrors) {
  console.error('Update failed');
  process.exit(1);
} else {
  for (const [file, source] of updatedFiles) {
    fs.writeFileSync(file, source, 'utf8');
  }
  console.log('Update complete');
}

function processFile(file) {
  if (fs.lstatSync(file).isDirectory()) {
    return;
  }
  let source = fs.readFileSync(file, 'utf8');

  if (source.indexOf(META_COPYRIGHT_COMMENT_BLOCK) === 0) {
    return null;
  }
  if (/^\/\*\*/.test(source)) {
    source = source.replace(/\/\*\*[^\/]+\/\s+/, META_COPYRIGHT_COMMENT_BLOCK);
  } else {
    source = `${META_COPYRIGHT_COMMENT_BLOCK}${source}`;
  }
  return source;
}
