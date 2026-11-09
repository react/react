/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {ReactVersion: reactVersion} = require('../../ReactVersions');

const versions = {
  'packages/react/package.json': require('../../packages/react/package.json')
    .version,
  'packages/react-dom/package.json':
    require('../../packages/react-dom/package.json').version,
  'packages/react-test-renderer/package.json':
    require('../../packages/react-test-renderer/package.json').version,
};

let allVersionsMatch = true;
Object.keys(versions).forEach(function (name) {
  const version = versions[name];
  if (version !== reactVersion) {
    allVersionsMatch = false;
    console.log(
      '%s version does not match ReactVersions.js. Expected %s, saw %s.',
      name,
      reactVersion,
      version
    );
  }
});

if (!allVersionsMatch) {
  process.exit(1);
}
