/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {exec} from 'child-process-promise';
import {readFileSync} from 'fs';
import path from 'path';
import {rimrafSync} from 'rimraf';

describe('ignoreList source map extension', () => {
  jest.setTimeout(60 * 1000);

  const pathToExtensionsPackage = path.resolve(__dirname, '..', '..');
  const pathToChromeExtensionBuild = path.join(
    pathToExtensionsPackage,
    'chrome/build',
  );
  const pathToSourceMap = path.resolve(
    pathToChromeExtensionBuild,
    'unpacked/build/react_devtools_backend_compact.js.map',
  );

  afterAll(() => {
    rimrafSync(pathToChromeExtensionBuild);
  });

  describe('for dev builds', () => {
    it('should not ignore list anything', async () => {
      await exec('yarn build:chrome:local', {
        cwd: pathToExtensionsPackage,
      });

      const sourceMapJSON = readFileSync(pathToSourceMap);
      const sourceMap = JSON.parse(sourceMapJSON);

      const {ignoreList} = sourceMap;
      expect(ignoreList).toEqual([]);
    });
  });

  describe('for production builds', function () {
    it('should include every source', async () => {
      await exec('yarn build:chrome', {cwd: pathToExtensionsPackage});

      const sourceMapJSON = readFileSync(pathToSourceMap);
      const sourceMap = JSON.parse(sourceMapJSON);

      const {sources, ignoreList} = sourceMap;

      expect(sources.length).toBe(ignoreList.length);
    });
  });
});
