/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const {ReactVersion} = require('../../../ReactVersions');

const virtualId = '\0shared/ReactVersion';

function reactVersion() {
  const version = process.env.REACT_BUILD_VERSION || ReactVersion;
  return {
    name: 'scripts/rollup/plugins/react-version-plugin',
    resolveId(importee) {
      return importee === 'shared/ReactVersion' ? virtualId : null;
    },
    load(id) {
      return id === virtualId
        ? `export default ${JSON.stringify(version)};`
        : null;
    },
  };
}

module.exports = reactVersion;
