/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

'use strict';

const {rollup} = require('rollup');
const vm = require('vm');
const reactVersion = require('../plugins/react-version-plugin');
const {ReactVersion} = require('../../../ReactVersions');

describe('virtual ReactVersion', () => {
  const originalBuildVersion = process.env.REACT_BUILD_VERSION;
  const originalRegressionVersion = process.env.REACT_VERSION;

  beforeEach(() => {
    delete process.env.REACT_BUILD_VERSION;
    delete process.env.REACT_VERSION;
  });

  afterEach(() => {
    if (originalBuildVersion === undefined) {
      delete process.env.REACT_BUILD_VERSION;
    } else {
      process.env.REACT_BUILD_VERSION = originalBuildVersion;
    }
    if (originalRegressionVersion === undefined) {
      delete process.env.REACT_VERSION;
    } else {
      process.env.REACT_VERSION = originalRegressionVersion;
    }
  });

  async function bundleVersion() {
    const bundle = await rollup({
      input: 'fixture',
      plugins: [
        reactVersion(),
        {
          name: 'fixture',
          resolveId(id) {
            return id === 'fixture' || id === 'unrelated' ? id : null;
          },
          load(id) {
            if (id === 'fixture') {
              return `
                import version from 'shared/ReactVersion';
                export {marker} from 'unrelated';
                export {version};
              `;
            }
            return id === 'unrelated' ? 'export const marker = 42;' : null;
          },
        },
      ],
    });
    try {
      const {output} = await bundle.generate({format: 'cjs'});
      const exports = {};
      vm.runInNewContext(output[0].code, {exports});
      return exports;
    } finally {
      await bundle.close();
    }
  }

  it('only resolves the exact specifier and loads its private ID', () => {
    const plugin = reactVersion();
    const id = plugin.resolveId('shared/ReactVersion');
    expect(id.startsWith('\0')).toBe(true);
    expect(plugin.load(id)).toBe(
      `export default ${JSON.stringify(ReactVersion)};`
    );
    expect(plugin.resolveId('shared/ReactVersion.js')).toBe(null);
    expect(plugin.resolveId('./ReactVersion')).toBe(null);
    expect(plugin.resolveId('shared/ReactSymbols')).toBe(null);
    expect(plugin.load('shared/ReactVersion')).toBe(null);
    expect(plugin.load('unrelated')).toBe(null);
  });

  it('bundles the canonical version without affecting other modules', async () => {
    expect(await bundleVersion()).toEqual({version: ReactVersion, marker: 42});
  });

  it('serializes a build override as a string', async () => {
    const version = '19.3.0-test-"quoted"-\\-\n';
    process.env.REACT_BUILD_VERSION = version;
    expect(await bundleVersion()).toEqual({version, marker: 42});
  });

  it('keeps the regression test version separate from the build version', async () => {
    process.env.REACT_VERSION = '18.2.0';
    expect((await bundleVersion()).version).toBe(ReactVersion);
  });
});
