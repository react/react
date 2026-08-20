/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = function makeSnapshotResolver(useForget) {
  const modeExtension = useForget ? '.with-forget' : '.no-forget';
  return {
    resolveSnapshotPath: (testPath, snapshotExtension) =>
      testPath + modeExtension + snapshotExtension,

    resolveTestPath: (snapshotFilePath, snapshotExtension) =>
      snapshotFilePath.slice(
        0,
        -modeExtension.length - snapshotExtension.length
      ),

    testPathForConsistencyCheck: 'some/__tests__/example.test.js',
  };
};
