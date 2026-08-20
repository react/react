/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const {resolve} = require('path');

function resolveFeatureFlags(target) {
  let flagsPath;
  switch (target) {
    case 'inline':
    case 'shell':
    case 'fusebox':
      flagsPath = 'DevToolsFeatureFlags.default';
      break;
    case 'core/backend-oss':
    case 'core/standalone-oss':
      flagsPath = 'DevToolsFeatureFlags.core-oss';
      break;
    case 'core/backend-fb':
    case 'core/standalone-fb':
      flagsPath = 'DevToolsFeatureFlags.core-fb';
      break;
    case 'extension-oss':
      flagsPath = 'DevToolsFeatureFlags.extension-oss';
      break;
    case 'extension-fb':
      flagsPath = 'DevToolsFeatureFlags.extension-fb';
      break;
    default:
      console.error(`Invalid target "${target}"`);
      process.exit(1);
  }

  return resolve(__dirname, 'src/config/', flagsPath);
}

module.exports = {
  resolveFeatureFlags,
};
