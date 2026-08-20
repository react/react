/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Files that are transformed and can use ES6/Flow/JSX.
const esNextPaths = [
  // Internal forwarding modules
  'packages/*/*.js',
  'packages/*/esm/*.js',
  'packages/use-sync-external-store/shim/**/*.js',
  'packages/use-sync-external-store/with-selector/**/*.js',
  // Source files
  'packages/*/src/**/*.js',
  'packages/dom-event-testing-library/**/*.js',
  'packages/shared/**/*.js',
  // Shims and Flow environment
  'scripts/flow/*.js',
  'scripts/rollup/shims/**/*.js',
];

// Files that we distribute on npm that should be ES5-only.
const es5Paths = ['packages/*/npm/**/*.js'];

module.exports = {
  esNextPaths,
  es5Paths,
};
