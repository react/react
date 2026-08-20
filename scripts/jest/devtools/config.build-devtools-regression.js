'use strict';

const semver = require('semver');

const NODE_MODULES_DIR =
  process.env.RELEASE_CHANNEL === 'stable' ? 'oss-stable' : 'oss-experimental';

const REACT_VERSION = process.env.REACT_VERSION;

const moduleNameMapper = {};
const setupFiles = [];

// We only want to add these if we are in a regression test, IE if there
// is a REACT_VERSION specified
if (REACT_VERSION) {
  // React version 16.5 has a schedule package instead of a scheduler
  // package, so we need to rename them accordingly
  if (semver.satisfies(REACT_VERSION, '16.5')) {
    moduleNameMapper[`^schedule$`] =
      `<rootDir>/build/${NODE_MODULES_DIR}/schedule`;
    moduleNameMapper['^schedule/tracing$'] =
      `<rootDir>/build/${NODE_MODULES_DIR}/schedule/tracing-profiling`;
  }

  // react-dom/client is only in v18.0.0 and up, so we
  // map it to react-dom instead
  if (semver.satisfies(REACT_VERSION, '<18.0')) {
    moduleNameMapper['^react-dom/client$'] =
      `<rootDir>/build/${NODE_MODULES_DIR}/react-dom`;
  }

  setupFiles.push(require.resolve('./setupTests.build-devtools-regression'));
}

module.exports = {
  moduleNameMapper,
  setupFiles,
};
