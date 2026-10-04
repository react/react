import React from 'react';
import {renderToPipeableStream} from 'react-dom/server';

import App from '../src/components/App.js';
import {resetFeedReveal} from '../src/components/NestedParentExit.js';
import {resetPageReveal} from '../src/components/Page.js';
import {resetNestedReveal} from '../src/components/NestedReveal.js';

let assets;
if (process.env.NODE_ENV === 'development') {
  // Use the bundle from create-react-app's server in development mode.
  assets = {
    'main.js': '/static/js/bundle.js',
    // 'main.css': '',
  };
} else {
  assets = require('../build/asset-manifest.json').files;
}

export default function render(url, res) {
  // Force resuspend on every load
  resetFeedReveal();
  resetPageReveal();
  resetNestedReveal();
  res.socket.on('error', error => {
    // Log fatal errors
    console.error('Fatal', error);
  });
  let didError = false;
  const {pipe, abort} = renderToPipeableStream(
    <App assets={assets} initialURL={url} />,
    {
      bootstrapScripts: [assets['main.js']],
      onShellReady() {
        // If something errored before we started streaming, we set the error code appropriately.
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-type', 'text/html');
        pipe(res);
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
    }
  );
  // Abandon and switch to client rendering after 5 seconds.
  // Try lowering this to see the client recover.
  setTimeout(abort, 5000);
}
