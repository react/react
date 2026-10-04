'use strict';

const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  modulePathIgnorePatterns: [
    ...baseConfig.modulePathIgnorePatterns,
    'packages/react-devtools-extensions',
    'packages/react-devtools-facade',
    'packages/react-devtools-shared',
    'packages/react-devtools-cdt-mcp',
    'ReactIncrementalPerf',
    'ReactIncrementalUpdatesMinimalism',
    'ReactIncrementalTriangle',
    'ReactIncrementalReflection',
    'forwardRef',
  ],
  // RN configs should not run react-dom tests.
  // There are many other tests that use react-dom
  // and for those we will use the www entrypoint,
  // but those tests should be migrated to Noop renderer.
  testPathIgnorePatterns: [
    'node_modules',
    'packages/react-dom',
    'packages/react-server-dom-webpack',
  ],
  setupFiles: [
    ...baseConfig.setupFiles,
    require.resolve('./setupTests.xplat.js'),
    require.resolve('./setupHostConfigs.js'),
  ],
});
