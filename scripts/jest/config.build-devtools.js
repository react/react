'use strict';

const {readdirSync, statSync} = require('fs');
const {join} = require('path');
const baseConfig = require('./config.base');
const devtoolsRegressionConfig = require('./devtools/config.build-devtools-regression');

const NODE_MODULES_DIR =
  process.env.RELEASE_CHANNEL === 'stable' ? 'oss-stable' : 'oss-experimental';

// Find all folders in packages/* with package.json
const packagesRoot = join(__dirname, '..', '..', 'packages');
const packages = readdirSync(packagesRoot).filter(dir => {
  if (dir.charAt(0) === '.') {
    return false;
  }
  if (dir.includes('react-devtools')) {
    return false;
  }
  if (dir === 'internal-test-utils') {
    // This is an internal package used only for testing. It's OK to read
    // from source.
    // TODO: Maybe let's have some convention for this?
    return false;
  }
  const packagePath = join(packagesRoot, dir, 'package.json');
  let stat;
  try {
    stat = statSync(packagePath);
  } catch (err) {
    return false;
  }
  return stat.isFile();
});

// Create a module map to point React packages to the build output
const moduleNameMapper = {};

moduleNameMapper['react-devtools-feature-flags'] =
  '<rootDir>/packages/react-devtools-shared/src/config/DevToolsFeatureFlags.default';

// Map packages to bundles
packages.forEach(name => {
  // Root entry point
  moduleNameMapper[`^${name}$`] = `<rootDir>/build/${NODE_MODULES_DIR}/${name}`;
  // Named entry points
  moduleNameMapper[`^${name}\/([^\/]+)$`] =
    `<rootDir>/build/${NODE_MODULES_DIR}/${name}/$1`;
});

// Allow tests to import shared code (e.g. feature flags, getStackByFiberInDevAndProd)
moduleNameMapper['^shared/([^/]+)$'] = '<rootDir>/packages/shared/$1';
moduleNameMapper['^react-reconciler/([^/]+)$'] =
  '<rootDir>/packages/react-reconciler/$1';

module.exports = Object.assign({}, baseConfig, {
  // Redirect imports to the compiled bundles
  moduleNameMapper: {
    ...devtoolsRegressionConfig.moduleNameMapper,
    ...moduleNameMapper,
  },
  // Don't run bundle tests on -test.internal.* files
  testPathIgnorePatterns: ['/node_modules/', '-test.internal.js$'],
  // Exclude the build output from transforms
  transformIgnorePatterns: [
    '/node_modules/(?!(rbush|quickselect)/)',
    '<rootDir>/build/',
    '/__compiled__/',
    '/__untransformed__/',
  ],
  testRegex: 'packages/react-devtools(-(.+))?/.+/__tests__/[^]+.test.js$',
  snapshotSerializers: [
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/dehydratedValueSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/hookSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/inspectedElementSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/profilingSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/storeSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/timelineDataSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/treeContextStateSerializer.js'
    ),
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/__serializers__/numberToFixedSerializer.js'
    ),
  ],
  setupFiles: [
    ...baseConfig.setupFiles,
    ...devtoolsRegressionConfig.setupFiles,
    require.resolve('./setupTests.build.js'),
    require.resolve('./devtools/setupEnv.js'),
  ],
  setupFilesAfterEnv: [
    require.resolve(
      '../../packages/react-devtools-shared/src/__tests__/setupTests.js'
    ),
  ],
});
