'use strict';

const path = require('path');
const url = require('url');
const fs = require('fs');

const clientModules = {};
const clientManifest = {};
const ssrModuleMap = {};
let moduleIdx = 0;

function registerClientModule(modulePath) {
  const id = String(moduleIdx++);
  const chunkId = 'chunk-' + id;
  const absPath = path.resolve(__dirname, modulePath);
  const actualExports = require(absPath);
  clientModules[id] = actualExports;

  const href = url.pathToFileURL(absPath).href;
  clientManifest[href] = {id, chunks: [chunkId, absPath], name: '*'};
  ssrModuleMap[id] = {'*': {id, chunks: [chunkId, absPath], name: '*'}};
}

// Auto-register all 'use client' components by scanning src/
const srcDirs = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'src/components'),
];
for (const dir of srcDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(dir, file);
    const source = fs.readFileSync(filePath, 'utf-8');
    if (
      source.trimStart().startsWith("'use client'") ||
      source.trimStart().startsWith('"use client"')
    ) {
      registerClientModule(filePath);
    }
  }
}

global.__webpack_require__ = function (id) {
  if (clientModules[id]) {
    return clientModules[id];
  }
  throw new Error('Unknown module: ' + id);
};
global.__webpack_chunk_load__ = function () {
  return new Promise(function (resolve) {
    setImmediate(resolve);
  });
};

const ssrManifest = {
  moduleMap: ssrModuleMap,
  moduleLoading: null,
  serverModuleMap: null,
};

module.exports = {clientManifest, ssrManifest};
