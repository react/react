'use strict';

const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  modulePathIgnorePatterns: [
    ...baseConfig.modulePathIgnorePatterns,
    'packages/react-devtools-extensions',
    'packages/react-devtools-facade',
    'packages/react-devtools-shared',
    'packages/react-devtools-cdt-mcp',
  ],
  setupFiles: [
    ...baseConfig.setupFiles,
    require.resolve('./setupTests.www.js'),
    require.resolve('./setupHostConfigs.js'),
  ],
});
