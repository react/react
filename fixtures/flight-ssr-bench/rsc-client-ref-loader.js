'use strict';

const url = require('url');

// Webpack loader that runs in the RSC compilation.
// When a module starts with 'use client', it replaces the entire source
// with a client module proxy. This makes the RSC renderer serialize a
// client reference into the Flight stream instead of rendering the component.
module.exports = function rscClientRefLoader(source) {
  const trimmed = source.trimStart();
  if (
    trimmed.startsWith("'use client'") ||
    trimmed.startsWith('"use client"')
  ) {
    const href = url.pathToFileURL(this.resourcePath).href;
    return [
      `const { createClientModuleProxy } = require('react-server-dom-webpack/server');`,
      `module.exports = createClientModuleProxy(${JSON.stringify(href)});`,
    ].join('\n');
  }
  return source;
};
