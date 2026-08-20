/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const inlinedHostConfigs = require('../shared/inlinedHostConfigs');
const flowVersion = require('../../package.json').devDependencies['flow-bin'];

const configTemplate = fs
  .readFileSync(__dirname + '/config/flowconfig')
  .toString();

// stores all forks discovered during config generation
const allForks = new Set();
// maps forked file to the base path containing it and it's forks (it's parent)
const forkedFiles = new Map();

function findForks(file) {
  const basePath = path.join(file, '..');
  const forksPath = path.join(basePath, 'forks');
  const forks = fs.readdirSync(path.join('packages', forksPath));
  forks.forEach(f => allForks.add('forks/' + f));
  forkedFiles.set(file, basePath);
  return basePath;
}

function addFork(forks, renderer, file) {
  let basePath = forkedFiles.get(file);
  if (!basePath) {
    basePath = findForks(file);
  }

  const baseFilename = file.slice(basePath.length + 1);

  const parts = renderer.split('-');
  while (parts.length) {
    const candidate = `forks/${baseFilename}.${parts.join('-')}.js`;
    if (allForks.has(candidate)) {
      forks.set(candidate, `${baseFilename}$$`);
      return;
    }
    parts.pop();
  }
  throw new Error(`Cannot find fork for ${file} for renderer ${renderer}`);
}

function writeConfig(
  renderer,
  rendererInfo,
  isServerSupported,
  isFlightSupported,
) {
  const folder = __dirname + '/' + renderer;
  mkdirp.sync(folder);

  isFlightSupported =
    isFlightSupported === true ||
    (isServerSupported && isFlightSupported !== false);

  const serverRenderer = isServerSupported ? renderer : 'custom';
  const flightRenderer = isFlightSupported ? renderer : 'custom';

  const ignoredPaths = [];

  inlinedHostConfigs.forEach(otherRenderer => {
    if (otherRenderer === rendererInfo) {
      return;
    }
    otherRenderer.paths.forEach(otherPath => {
      if (rendererInfo.paths.indexOf(otherPath) !== -1) {
        return;
      }
      ignoredPaths.push(`.*/packages/${otherPath}`);
    });
  });

  const forks = new Map();
  addFork(forks, renderer, 'react-reconciler/src/ReactFiberConfig');
  addFork(forks, serverRenderer, 'react-server/src/ReactServerStreamConfig');
  addFork(forks, serverRenderer, 'react-server/src/ReactFizzConfig');
  addFork(forks, flightRenderer, 'react-server/src/ReactFlightServerConfig');
  addFork(forks, flightRenderer, 'react-client/src/ReactFlightClientConfig');
  forks.set(
    'react-devtools-shared/src/config/DevToolsFeatureFlags.default',
    'react-devtools-feature-flags',
  );

  allForks.forEach(fork => {
    if (!forks.has(fork)) {
      ignoredPaths.push(`.*/packages/.*/${fork}`);
    }
  });

  let moduleMappings = '';
  forks.forEach((source, target) => {
    moduleMappings += `module.name_mapper='${source.slice(
      source.lastIndexOf('/') + 1,
    )}' -> '${target}'\n`;
  });

  const config = configTemplate
    .replace('%REACT_RENDERER_FLOW_OPTIONS%', moduleMappings.trim())
    .replace('%REACT_RENDERER_FLOW_IGNORES%', ignoredPaths.join('\n'))
    .replace('%FLOW_VERSION%', flowVersion);

  const disclaimer = `
# ---------------------------------------------------------------#
# NOTE: this file is generated.                                  #
# If you want to edit it, open ./scripts/flow/config/flowconfig. #
# Then run Yarn for changes to take effect.                      #
# ---------------------------------------------------------------#
  `.trim();

  const configFile = folder + '/.flowconfig';
  let oldConfig;
  try {
    oldConfig = fs.readFileSync(configFile).toString();
  } catch (err) {
    oldConfig = null;
  }
  const newConfig = `
${disclaimer}
${config}
${disclaimer}
`.trim();

  if (newConfig !== oldConfig) {
    fs.writeFileSync(configFile, newConfig);
    console.log(chalk.dim('Wrote a Flow config to ' + configFile));
  }
}

// Write multiple configs in different folders
// so that we can run those checks in parallel if we want.
inlinedHostConfigs.forEach(rendererInfo => {
  if (rendererInfo.isFlowTyped) {
    writeConfig(
      rendererInfo.shortName,
      rendererInfo,
      rendererInfo.isServerSupported,
      rendererInfo.isFlightSupported,
    );
  }
});
