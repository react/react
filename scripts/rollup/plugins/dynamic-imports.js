/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

module.exports = function dynamicImports() {
  return {
    name: 'scripts/rollup/plugins/dynamic-imports',
    renderDynamicImport({targetModuleId}) {
      if (targetModuleId === null) {
        return {left: 'import(', right: ')'};
      }
      return null;
    },
  };
};
