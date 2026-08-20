'use strict';

// This is a server to host data-local resources like databases and RSC

const path = require('path');
const url = require('url');

if (typeof fetch === 'undefined') {
  // Patch fetch for earlier Node versions.
  global.fetch = require('undici').fetch;
}

const express = require('express');
const bodyParser = require('body-parser');
const busboy = require('busboy');
const app = express();
const compress = require('compression');
const {Readable} = require('node:stream');

const nodeModule = require('node:module');

app.use(compress());

// Application

const {readFile} = require('fs').promises;

const React = require('react');

const moduleBasePath = new URL('../src', url.pathToFileURL(__filename)).href;

async function renderApp(res, returnValue) {
  const {renderToPipeableStream} = await import('react-server-dom-esm/server');
  const m = await import('../src/App.js');

  const App = m.default;
  const root = React.createElement(App);
  // For client-invoked server actions we refresh the tree and return a return value.
  const payload = returnValue ? {returnValue, root} : root;
  const {pipe} = renderToPipeableStream(payload, moduleBasePath);
  pipe(res);
}

app.get('/', async function (req, res) {
  await renderApp(res, null);
});

app.post('/', bodyParser.text(), async function (req, res) {
  const {
    renderToPipeableStream,
    decodeReply,
    decodeReplyFromBusboy,
    decodeAction,
  } = await import('react-server-dom-esm/server');
  const serverReference = req.get('rsc-action');
  if (serverReference) {
    // This is the client-side case
    const [filepath, name] = serverReference.split('#');
    const action = (await import(filepath))[name];
    // Validate that this is actually a function we intended to expose and
    // not the client trying to invoke arbitrary functions. In a real app,
    // you'd have a manifest verifying this before even importing it.
    if (action.$$typeof !== Symbol.for('react.server.reference')) {
      throw new Error('Invalid action');
    }

    let args;
    if (req.is('multipart/form-data')) {
      // Use busboy to streamingly parse the reply from form-data.
      const bb = busboy({headers: req.headers});
      const reply = decodeReplyFromBusboy(bb, moduleBasePath);
      req.pipe(bb);
      args = await reply;
    } else {
      args = await decodeReply(req.body, moduleBasePath);
    }
    const result = action.apply(null, args);
    try {
      // Wait for any mutations
      await result;
    } catch (x) {
      // We handle the error on the client
    }
    // Refresh the client and return the value
    renderApp(res, result);
  } else {
    // This is the progressive enhancement case
    const UndiciRequest = require('undici').Request;
    const fakeRequest = new UndiciRequest('http://localhost', {
      method: 'POST',
      headers: {'Content-Type': req.headers['content-type']},
      body: Readable.toWeb(req),
      duplex: 'half',
    });
    const formData = await fakeRequest.formData();
    const action = await decodeAction(formData, moduleBasePath);
    try {
      // Wait for any mutations
      await action();
    } catch (x) {
      const {setServerState} = await import('../src/ServerState.js');
      setServerState('Error: ' + x.message);
    }
    renderApp(res, null);
  }
});

app.get('/todos', function (req, res) {
  res.json([
    {
      id: 1,
      text: 'Shave yaks',
    },
    {
      id: 2,
      text: 'Eat kale',
    },
  ]);
});

if (process.env.NODE_ENV === 'development') {
  const rootDir = path.resolve(__dirname, '../');

  app.get('/source-maps', async function (req, res, next) {
    try {
      res.set('Content-type', 'application/json');
      let requestedFilePath = req.query.name;

      let isCompiledOutput = false;
      if (requestedFilePath.startsWith('file://')) {
        // We assume that if it was prefixed with file:// it's referring to the compiled output
        // and if it's a direct file path we assume it's source mapped back to original format.
        isCompiledOutput = true;
        requestedFilePath = url.fileURLToPath(requestedFilePath);
      }

      const relativePath = path.relative(rootDir, requestedFilePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        // This is outside the root directory of the app. Forbid it to be served.
        res.status = 403;
        res.write('{}');
        res.end();
        return;
      }

      const sourceMap = nodeModule.findSourceMap(requestedFilePath);
      let map;
      if (requestedFilePath.startsWith('node:')) {
        // This is a node internal. We don't include any source code for this but we still
        // generate a source map for it so that we can add it to an ignoreList automatically.
        map = {
          version: 3,
          // We use the node:// protocol convention to teach Chrome DevTools that this is
          // on a different protocol and not part of the current page.
          sources: ['node:///' + requestedFilePath.slice(5)],
          sourcesContent: ['// Node Internals'],
          mappings: 'AAAA',
          ignoreList: [0],
          sourceRoot: '',
        };
      } else if (!sourceMap || !isCompiledOutput) {
        // If a file doesn't have a source map, such as this file, then we generate a blank
        // source map that just contains the original content and segments pointing to the
        // original lines. If a line number points to uncompiled output, like if source mapping
        // was already applied we also use this path.
        const sourceContent = await readFile(requestedFilePath, 'utf8');
        const lines = sourceContent.split('\n').length;
        // We ensure to absolute
        const sourceURL = url.pathToFileURL(requestedFilePath);
        map = {
          version: 3,
          sources: [sourceURL],
          sourcesContent: [sourceContent],
          // Note: This approach to mapping each line only lets you jump to each line
          // not jump to a column within a line. To do that, you need a proper source map
          // generated for each parsed segment or add a segment for each column.
          mappings: 'AAAA' + ';AACA'.repeat(lines - 1),
          sourceRoot: '',
          // Add any node_modules to the ignore list automatically.
          ignoreList: requestedFilePath.includes('node_modules')
            ? [0]
            : undefined,
        };
      } else {
        // We always set prepareStackTrace before reading the stack so that we get the stack
        // without source maps applied. Therefore we have to use the original source map.
        // If something read .stack before we did, we might observe the line/column after
        // source mapping back to the original file. We use the isCompiledOutput check above
        // in that case.
        map = sourceMap.payload;
      }
      res.write(JSON.stringify(map));
      res.end();
    } catch (x) {
      res.status = 500;
      res.write('{}');
      res.end();
      console.error(x);
    }
  });
}

app.listen(3001, () => {
  console.log('Regional Flight Server listening on port 3001...');
});

app.on('error', function (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error('port 3001 requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('Port 3001 is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});
