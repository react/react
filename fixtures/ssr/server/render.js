import React from 'react';
import {renderToPipeableStream} from 'react-dom/server';
import {Writable} from 'stream';

import App from '../src/components/App';

let assets;
if (process.env.NODE_ENV === 'development') {
  // Use the bundle from create-react-app's server in development mode.
  assets = {
    'main.js': '/static/js/bundle.js',
    'main.css': '',
  };
} else {
  assets = require('../build/asset-manifest.json');
}

class ThrottledWritable extends Writable {
  constructor(destination) {
    super();
    this.destination = destination;
    this.delay = 10;
  }

  _write(chunk, encoding, callback) {
    let o = 0;
    const write = () => {
      this.destination.write(chunk.slice(o, o + 100), encoding, x => {
        o += 100;
        if (o < chunk.length) {
          setTimeout(write, this.delay);
        } else {
          callback(x);
        }
      });
    };
    setTimeout(write, this.delay);
  }

  _final(callback) {
    setTimeout(() => {
      this.destination.end(callback);
    }, this.delay);
  }
}

export default function render(url, res) {
  res.socket.on('error', error => {
    // Log fatal errors
    console.error('Fatal', error);
  });
  let didError = false;
  const {pipe, abort} = renderToPipeableStream(<App assets={assets} />, {
    bootstrapScripts: [assets['main.js']],
    progressiveChunkSize: 1024,
    onShellReady() {
      // If something errored before we started streaming, we set the error code appropriately.
      res.statusCode = didError ? 500 : 200;
      res.setHeader('Content-type', 'text/html');
      // To test the actual chunks taking time to load over the network, we throttle
      // the stream a bit.
      const throttledResponse = new ThrottledWritable(res);
      pipe(throttledResponse);
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
  });
  // Abandon and switch to client rendering after 5 seconds.
  // Try lowering this to see the client recover.
  setTimeout(abort, 5000);
}
