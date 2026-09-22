/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {renderToPipeableStream} from 'react-dom/server';
import App from '../src/App';
import {ABORT_DELAY} from './delays';

// In a real setup, you'd read it from webpack build stats.
let assets = {
  'main.js': '/main.js',
  'main.css': '/main.css',
};

module.exports = function render(url, res) {
  // The new wiring is a bit more involved.
  res.socket.on('error', error => {
    console.error('Fatal', error);
  });
  let didError = false;
  let didFinish = false;
  const {pipe, abort} = renderToPipeableStream(
    <App
      assets={assets}
      delay={
        new Promise(resolve => {
          setTimeout(resolve, 5000);
        })
      }
    />,
    {
      bootstrapScripts: [assets['main.js']],
      onAllReady() {
        // Full completion.
        // You can use this for SSG or crawlers.
        didFinish = true;
      },
      onShellReady() {
        // If something errored before we started streaming, we set the error code appropriately.
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-type', 'text/html');
        setImmediate(() => pipe(res));
      },
      onShellError(x) {
        // Something errored before we could complete the shell so we emit an alternative shell.
        res.statusCode = 500;
        res.send('<!doctype><p>Error</p>');
      },
      onError(x) {
        didError = true;
        console.error(x);
      },
      progressiveChunkSize: 1024,
    }
  );
  // Abandon and switch to client rendering if enough time passes.
  // Try lowering this to see the client recover.
  setTimeout(() => {
    if (!didFinish) {
      abort();
    }
  }, ABORT_DELAY);
};
