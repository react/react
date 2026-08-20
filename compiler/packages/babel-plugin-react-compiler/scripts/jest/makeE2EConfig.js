/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = function makeE2EConfig(displayName, useForget) {
  return {
    displayName,
    testEnvironment: 'jsdom',
    rootDir: '../../src',
    testMatch: ['**/*.e2e.(js|tsx)'],
    modulePathIgnorePatterns: [
      // ignore snapshots from the opposite forget configuration
      useForget ? '.*\\.no-forget\\.snap$' : '.*\\.with-forget\\.snap$',
      // ignore snapshots from the main project
      '.*\\.ts\\.snap$',
    ],
    globals: {
      __FORGET__: useForget,
    },
    snapshotResolver: useForget
      ? '<rootDir>/../scripts/jest/snapshot-resolver-with-forget.js'
      : '<rootDir>/../scripts/jest/snapshot-resolver-no-forget.js',

    transform: {
      '\\.[tj]sx?$': useForget
        ? '<rootDir>/../scripts/jest/transform-with-forget'
        : '<rootDir>/../scripts/jest/transform-no-forget',
    },
    transformIgnorePatterns: ['/node_modules/'],
  };
};
