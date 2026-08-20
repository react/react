'use strict';

const {join} = require('path');

async function build(reactPath, asyncCopyTo) {
  // copy the UMD bundles
  await asyncCopyTo(
    join(reactPath, 'build', 'dist', 'react.production.js'),
    join(__dirname, 'react.production.js')
  );
  await asyncCopyTo(
    join(reactPath, 'build', 'dist', 'react-dom.production.js'),
    join(__dirname, 'react-dom.production.js')
  );
}

module.exports = build;
