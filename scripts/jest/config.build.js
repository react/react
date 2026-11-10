'use strict';

const {readdirSync, statSync} = require('fs');
const {join} = require('path');
const baseConfig = require('./config.base');

process.env.IS_BUILD = true;

const NODE_MODULES_DIR =
  process.env.RELEASE_CHANNEL === 'stable' ? 'oss-stable' : 'oss-experimental';

// Find all folders in packages/* with package.json
const packagesRoot = join(__dirname, '..', '..', 'packages');
const packages = readdirSync(packagesRoot).filter(dir => {
  if (dir === 'internal-test-utils') {
    // This is an internal package used only for testing. It's OK to read
    // from source.
    // TODO: Maybe let's have some convention for this?
    return false;
  }
  if (dir.charAt(0) === '.') {
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

// Allow bundle tests to read (but not write!) default feature flags.
// This lets us determine whether we're running in different modes
// without making relevant tests internal-only.
moduleNameMapper['^shared/ReactFeatureFlags'] =
  `<rootDir>/packages/shared/forks/ReactFeatureFlags.readonly`;

// Map packages to bundles
packages.forEach(name => {
  // Root entry point
  moduleNameMapper[`^${name}$`] = `<rootDir>/build/${NODE_MODULES_DIR}/${name}`;
  // Named entry points
  moduleNameMapper[`^${name}\/([^\/]+)$`] =
    `<rootDir>/build/${NODE_MODULES_DIR}/${name}/$1`;
});

moduleNameMapper['use-sync-external-store/shim/with-selector'] =
  `<rootDir>/build/${NODE_MODULES_DIR}/use-sync-external-store/shim/with-selector`;
moduleNameMapper['use-sync-external-store/shim/index.native'] =
  `<rootDir>/build/${NODE_MODULES_DIR}/use-sync-external-store/shim/index.native`;

module.exports = Object.assign({}, baseConfig, {
  // Redirect imports to the compiled bundles
  moduleNameMapper,
  modulePathIgnorePatterns: [
    ...baseConfig.modulePathIgnorePatterns,
    'packages/react-devtools-extensions',
    'packages/react-devtools-facade',
    'packages/react-devtools-shared',
    'packages/react-devtools-cdt-mcp',
  ],
  // Don't run bundle tests on -test.internal.* files
  testPathIgnorePatterns: ['/node_modules/', '-test.internal.js$'],
  // Exclude the build output from transforms
  transformIgnorePatterns: ['/node_modules/', '<rootDir>/build/'],
  setupFiles: [
    ...baseConfig.setupFiles,
    require.resolve('./setupTests.build.js'),
  ],
});
