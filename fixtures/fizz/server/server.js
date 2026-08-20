/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const babelRegister = require('@babel/register');
babelRegister({
  ignore: [/[\\\/](build|server\/server|node_modules)[\\\/]/],
  presets: [['react-app', {runtime: 'automatic'}]],
  plugins: ['@babel/transform-modules-commonjs'],
});

const express = require('express');
const compress = require('compression');
const {readFileSync} = require('fs');
const path = require('path');
const renderToString = require('./render-to-string');
const renderToStream = require('./render-to-stream');
const renderToBuffer = require('./render-to-buffer');
const {JS_BUNDLE_DELAY} = require('./delays');

const PORT = process.env.PORT || 4000;
const app = express();

app.use(compress());
app.get(
  '/',
  handleErrors(async function (req, res) {
    await waitForWebpack();
    renderToStream(req.url, res);
  })
);
app.get(
  '/string',
  handleErrors(async function (req, res) {
    await waitForWebpack();
    renderToString(req.url, res);
  })
);
app.get(
  '/stream',
  handleErrors(async function (req, res) {
    await waitForWebpack();
    renderToStream(req.url, res);
  })
);
app.get(
  '/buffer',
  handleErrors(async function (req, res) {
    await waitForWebpack();
    renderToBuffer(req.url, res);
  })
);
app.use(express.static('build'));
app.use(express.static('public'));

app
  .listen(PORT, () => {
    console.log(`Listening at ${PORT}...`);
  })
  .on('error', function (error) {
    if (error.syscall !== 'listen') {
      throw error;
    }
    const isPipe = portOrPipe => Number.isNaN(portOrPipe);
    const bind = isPipe(PORT) ? 'Pipe ' + PORT : 'Port ' + PORT;
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

function handleErrors(fn) {
  return async function (req, res, next) {
    try {
      return await fn(req, res);
    } catch (x) {
      next(x);
    }
  };
}

async function waitForWebpack() {
  while (true) {
    try {
      readFileSync(path.resolve(__dirname, '../build/main.js'));
      return;
    } catch (err) {
      console.log(
        'Could not find webpack build output. Will retry in a second...'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
