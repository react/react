/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const url = require('url');
const Module = require('module');

let webpackModuleIdx = 0;
let webpackChunkIdx = 0;
const webpackServerModules = {};
const webpackClientModules = {};
const webpackErroredModules = {};
const webpackServerMap = {};
const webpackClientMap = {};
const webpackChunkMap = {};
global.__webpack_chunk_load__ = function (id) {
  return webpackChunkMap[id];
};
global.__webpack_require__ = function (id) {
  if (webpackErroredModules[id]) {
    throw webpackErroredModules[id];
  }
  return webpackClientModules[id] || webpackServerModules[id];
};
global.__webpack_get_script_filename__ = function (id) {
  return id;
};

const previousCompile = Module.prototype._compile;

const register = require('react-server-dom-webpack/node-register');
// Register node compile
register();

const nodeCompile = Module.prototype._compile;

if (previousCompile === nodeCompile) {
  throw new Error(
    'Expected the Node loader to register the _compile extension',
  );
}

Module.prototype._compile = previousCompile;

const Server = require('react-server-dom-webpack/server');
const registerClientReference = Server.registerClientReference;
const createClientModuleProxy = Server.createClientModuleProxy;

exports.webpackMap = webpackClientMap;
exports.webpackModules = webpackClientModules;
exports.webpackServerMap = webpackServerMap;
exports.moduleLoading = {
  prefix: '/',
};

exports.clientModuleError = function clientModuleError(moduleError) {
  const idx = '' + webpackModuleIdx++;
  webpackErroredModules[idx] = moduleError;
  const path = url.pathToFileURL(idx).href;
  webpackClientMap[path] = {
    id: idx,
    chunks: [],
    name: '*',
  };
  const mod = new Module();
  nodeCompile.call(mod, '"use client"', idx);
  return mod.exports;
};

exports.clientExports = function clientExports(
  moduleExports,
  chunkId,
  chunkFilename,
  blockOnChunk,
) {
  const chunks = [];
  if (chunkId) {
    chunks.push(chunkId, chunkFilename);

    if (blockOnChunk) {
      webpackChunkMap[chunkId] = blockOnChunk;
    }
  }
  const idx = '' + webpackModuleIdx++;
  webpackClientModules[idx] = moduleExports;
  const path = url.pathToFileURL(idx).href;
  webpackClientMap[path] = {
    id: idx,
    chunks,
    name: '*',
  };
  // We only add this if this test is testing ESM compat.
  if ('__esModule' in moduleExports) {
    webpackClientMap[path + '#'] = {
      id: idx,
      chunks,
      name: '',
    };
  }
  if (typeof moduleExports.then === 'function') {
    moduleExports.then(
      asyncModuleExports => {
        for (const name in asyncModuleExports) {
          webpackClientMap[path + '#' + name] = {
            id: idx,
            chunks,
            name: name,
          };
        }
      },
      () => {},
    );
  }
  if ('split' in moduleExports) {
    // If we're testing module splitting, we encode this name in a separate module id.
    const splitIdx = '' + webpackModuleIdx++;
    webpackClientModules[splitIdx] = {
      s: moduleExports.split,
    };
    webpackClientMap[path + '#split'] = {
      id: splitIdx,
      chunks,
      name: 's',
    };
  }
  const mod = new Module();
  nodeCompile.call(mod, '"use client"', idx);
  return mod.exports;
};

exports.clientExportsESM = function clientExportsESM(
  moduleExports,
  options?: {forceClientModuleProxy?: boolean} = {},
) {
  const chunks = [];
  const idx = '' + webpackModuleIdx++;
  webpackClientModules[idx] = moduleExports;
  const path = url.pathToFileURL(idx).href;

  const createClientReferencesForExports = ({exports, async}) => {
    webpackClientMap[path] = {
      id: idx,
      chunks,
      name: '*',
      async: true,
    };

    if (options.forceClientModuleProxy) {
      return createClientModuleProxy(path);
    }

    if (typeof exports === 'object') {
      const references = {};

      for (const name in exports) {
        const id = path + '#' + name;
        webpackClientMap[path + '#' + name] = {
          id: idx,
          chunks,
          name: name,
          async,
        };
        references[name] = registerClientReference(() => {}, id, name);
      }

      return references;
    }

    return registerClientReference(() => {}, path, '*');
  };

  if (
    moduleExports &&
    typeof moduleExports === 'object' &&
    typeof moduleExports.then === 'function'
  ) {
    return moduleExports.then(
      asyncModuleExports =>
        createClientReferencesForExports({
          exports: asyncModuleExports,
          async: true,
        }),
      () => {},
    );
  }

  return createClientReferencesForExports({exports: moduleExports});
};

// This tests server to server references. There's another case of client to server references.
exports.serverExports = function serverExports(moduleExports, blockOnChunk) {
  const idx = '' + webpackModuleIdx++;
  webpackServerModules[idx] = moduleExports;
  const path = url.pathToFileURL(idx).href;

  const chunks = [];
  if (blockOnChunk) {
    const chunkId = webpackChunkIdx++;
    webpackChunkMap[chunkId] = blockOnChunk;
    chunks.push(chunkId);
  }
  webpackServerMap[path] = {
    id: idx,
    chunks: chunks,
    name: '*',
  };
  // We only add this if this test is testing ESM compat.
  if ('__esModule' in moduleExports) {
    webpackServerMap[path + '#'] = {
      id: idx,
      chunks: [],
      name: '',
    };
  }
  if ('split' in moduleExports) {
    // If we're testing module splitting, we encode this name in a separate module id.
    const splitIdx = '' + webpackModuleIdx++;
    webpackServerModules[splitIdx] = {
      s: moduleExports.split,
    };
    webpackServerMap[path + '#split'] = {
      id: splitIdx,
      chunks: [],
      name: 's',
    };
  }
  const mod = new Module();
  mod.exports = moduleExports;
  nodeCompile.call(mod, '"use server"', idx);
  return mod.exports;
};
