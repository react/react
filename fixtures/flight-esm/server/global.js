'use strict';

// This is a server to host CDN distributed resources like module source files and SSR

const path = require('path');
const url = require('url');

const fs = require('fs').promises;
const compress = require('compression');
const chalk = require('chalk');
const express = require('express');
const http = require('http');
const React = require('react');

const {renderToPipeableStream} = require('react-dom/server');
const {createFromNodeStream} = require('react-server-dom-esm/client');

const moduleBasePath = new URL('../src', url.pathToFileURL(__filename)).href;

const app = express();

app.use(compress());

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      resolve(res);
    });
    req.on('error', e => {
      reject(e);
    });
    body.pipe(req);
  });
}

app.all('/', async function (req, res, next) {
  // Proxy the request to the regional server.
  const proxiedHeaders = {
    'X-Forwarded-Host': req.hostname,
    'X-Forwarded-For': req.ips,
    'X-Forwarded-Port': 3000,
    'X-Forwarded-Proto': req.protocol,
  };
  // Proxy other headers as desired.
  if (req.get('rsc-action')) {
    proxiedHeaders['Content-type'] = req.get('Content-type');
    proxiedHeaders['rsc-action'] = req.get('rsc-action');
  } else if (req.get('Content-type')) {
    proxiedHeaders['Content-type'] = req.get('Content-type');
  }

  const promiseForData = request(
    {
      host: '127.0.0.1',
      port: 3001,
      method: req.method,
      path: '/',
      headers: proxiedHeaders,
    },
    req
  );

  if (req.accepts('text/html')) {
    try {
      const rscResponse = await promiseForData;
      const moduleBaseURL = '/src';

      // For HTML, we're a "client" emulator that runs the client code,
      // so we start by consuming the RSC payload. This needs the local file path
      // to load the source files from as well as the URL path for preloads.

      let root;
      let Root = () => {
        if (root) {
          return React.use(root);
        }

        return React.use(
          (root = createFromNodeStream(
            rscResponse,
            moduleBasePath,
            moduleBaseURL
          ))
        );
      };
      // Render it into HTML by resolving the client components
      res.set('Content-type', 'text/html');
      const {pipe} = renderToPipeableStream(React.createElement(Root), {
        importMap: {
          imports: {
            react: 'https://esm.sh/react@experimental?pin=v124&dev',
            'react-dom': 'https://esm.sh/react-dom@experimental?pin=v124&dev',
            'react-dom/': 'https://esm.sh/react-dom@experimental&pin=v124&dev/',
            'react-server-dom-esm/client':
              '/node_modules/react-server-dom-esm/esm/react-server-dom-esm-client.browser.development.js',
          },
        },
        bootstrapModules: ['/src/index.js'],
      });
      pipe(res);
    } catch (e) {
      console.error(`Failed to SSR: ${e.stack}`);
      res.statusCode = 500;
      res.end();
    }
  } else {
    try {
      const rscResponse = await promiseForData;

      // For other request, we pass-through the RSC payload.
      res.set('Content-type', 'text/x-component');
      rscResponse.on('data', data => {
        res.write(data);
        res.flush();
      });
      rscResponse.on('end', data => {
        res.end();
      });
    } catch (e) {
      console.error(`Failed to proxy request: ${e.stack}`);
      res.statusCode = 500;
      res.end();
    }
  }
});

app.use(express.static('public'));
app.use('/src', express.static('src'));
app.use(
  '/node_modules/react-server-dom-esm/esm',
  express.static('node_modules/react-server-dom-esm/esm')
);

if (process.env.NODE_ENV === 'development') {
  app.get('/source-maps', async function (req, res, next) {
    // Proxy the request to the regional server.
    const proxiedHeaders = {
      'X-Forwarded-Host': req.hostname,
      'X-Forwarded-For': req.ips,
      'X-Forwarded-Port': 3000,
      'X-Forwarded-Proto': req.protocol,
    };

    const promiseForData = request(
      {
        host: '127.0.0.1',
        port: 3001,
        method: req.method,
        path: req.originalUrl,
        headers: proxiedHeaders,
      },
      req
    );

    try {
      const rscResponse = await promiseForData;
      res.set('Content-type', 'application/json');
      rscResponse.on('data', data => {
        res.write(data);
        res.flush();
      });
      rscResponse.on('end', data => {
        res.end();
      });
    } catch (e) {
      console.error(`Failed to proxy request: ${e.stack}`);
      res.statusCode = 500;
      res.end();
    }
  });
}

app.listen(3000, () => {
  console.log('Global Fizz/Webpack Server listening on port 3000...');
});

app.on('error', function (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error('port 3000 requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('Port 3000 is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});
