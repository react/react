/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

function installRspackTestManifest() {
  const previousManifest = global.__rspack_rsc_manifest__;
  const previousRequire = global.__webpack_require__;
  const previousChunkLoad = global.__webpack_chunk_load__;
  const modules = new Map();
  let moduleLoadCount = 0;

  global.__webpack_require__ = moduleId => {
    moduleLoadCount++;
    const moduleRecord = modules.get(moduleId);
    if (moduleRecord.error !== undefined) {
      throw moduleRecord.error;
    }
    return moduleRecord.exports;
  };
  global.__webpack_chunk_load__ = () => Promise.resolve();
  global.__rspack_rsc_manifest__ = {
    clientManifest: {},
    serverManifest: {},
    serverConsumerModuleMap: null,
    moduleLoading: null,
    entryJsFiles: [],
    entryCssFiles: {},
  };

  return {
    getModuleLoadCount() {
      return moduleLoadCount;
    },

    registerServerAction(actionId, action) {
      const moduleId = 'server-action:' + actionId;
      const exportName = 'action';
      modules.set(moduleId, {
        exports: {[exportName]: action},
      });
      global.__rspack_rsc_manifest__.serverManifest[actionId] = {
        id: moduleId,
        chunks: [],
        name: exportName,
      };
    },

    registerErroredServerAction(actionId, error) {
      const moduleId = 'server-action:' + actionId;
      modules.set(moduleId, {error});
      global.__rspack_rsc_manifest__.serverManifest[actionId] = {
        id: moduleId,
        chunks: [],
        name: 'action',
      };
    },

    restore() {
      global.__rspack_rsc_manifest__ = previousManifest;
      global.__webpack_require__ = previousRequire;
      global.__webpack_chunk_load__ = previousChunkLoad;
    },
  };
}

exports.installRspackTestManifest = installRspackTestManifest;
