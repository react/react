/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

let clientExports;
let turbopackMap;
let turbopackModules;
let React;
let ReactDOMServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let use;
let serverAct;
let assertConsoleErrorDev;

const CHUNK_PREFIX = '/assets/chunks/';
const CHUNK_SUFFIX = '.js?dpl=dpl_abc123';

describe('ReactFlightTurbopackChunkAffixes', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.node'),
    );
    ReactServerDOMServer = require('react-server-dom-turbopack/server');

    const TurbopackMock = require('./utils/TurbopackMock');
    clientExports = TurbopackMock.clientExports;
    turbopackMap = TurbopackMock.turbopackMap;
    turbopackModules = TurbopackMock.turbopackModules;

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-turbopack/server');
    jest.mock('react-server-dom-turbopack/client', () =>
      require('react-server-dom-turbopack/client.node'),
    );

    React = require('react');
    ReactDOMServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
    Stream = require('stream');
    use = React.use;
  });

  function readResult(stream) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const writable = new Stream.PassThrough();
      writable.setEncoding('utf8');
      writable.on('data', chunk => {
        buffer += chunk;
      });
      writable.on('error', error => {
        reject(error);
      });
      writable.on('end', () => {
        resolve(buffer);
      });
      stream.pipe(writable);
    });
  }

  function setup() {
    function ClientComponent() {
      return <span>Client Component</span>;
    }
    // The Client build may not have the same IDs as the Server bundles for the
    // same component.
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      CHUNK_PREFIX + 'client-abc123' + CHUNK_SUFFIX,
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);

    // In the SSR bundle this module won't exist. We simulate this by deleting
    // it and providing a translation from the client metadata to the SSR
    // metadata.
    const clientId = turbopackMap[ClientComponentOnTheClient.$$id].id;
    delete turbopackModules[clientId];
    const ssrMetadata = turbopackMap[ClientComponentOnTheServer.$$id];
    const translationMap = {
      [clientId]: {
        '*': ssrMetadata,
      },
    };

    function App() {
      return <ClientComponentOnTheClient />;
    }

    return {App, translationMap};
  }

  it('loads client components through reassembled chunk URLs', async () => {
    const {App, translationMap} = setup();

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap, {
        chunkLoading: {prefix: CHUNK_PREFIX, suffix: CHUNK_SUFFIX},
      }),
    );
    const readable = new Stream.PassThrough();
    stream.pipe(readable);

    let response;
    function ClientRoot() {
      if (!response) {
        response = ReactServerDOMClient.createFromNodeStream(readable, {
          moduleMap: translationMap,
          moduleLoading: {prefix: CHUNK_PREFIX, suffix: CHUNK_SUFFIX},
        });
      }
      return use(response);
    }

    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(<ClientRoot />),
    );
    const result = await readResult(ssrStream);
    // The chunk preload carries the reassembled URL: the affixes were
    // stripped on the wire and restored by the consumer.
    expect(result).toEqual(
      '<script src="' +
        CHUNK_PREFIX +
        'client-abc123' +
        CHUNK_SUFFIX +
        '" async=""></script><span>Client Component</span>',
    );
  });

  it('emits the chunk filename without its affixes in the payload', async () => {
    const {App} = setup();

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap, {
        chunkLoading: {prefix: CHUNK_PREFIX, suffix: CHUNK_SUFFIX},
      }),
    );
    const readable = new Stream.PassThrough();
    stream.pipe(readable);
    const payload = await readResult(readable);
    expect(payload).toContain('"client-abc123"');
    expect(payload).not.toContain(CHUNK_PREFIX);
    expect(payload).not.toContain(CHUNK_SUFFIX);
  });

  it('emits full chunk filenames when no affixes are declared', async () => {
    const {App} = setup();

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap),
    );
    const readable = new Stream.PassThrough();
    stream.pipe(readable);
    const payload = await readResult(readable);
    expect(payload).toContain(
      JSON.stringify(CHUNK_PREFIX + 'client-abc123' + CHUNK_SUFFIX),
    );
  });

  it('warns for a chunk that does not match the declared affixes', async () => {
    const {App} = setup();

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap, {
        chunkLoading: {prefix: '/elsewhere/', suffix: CHUNK_SUFFIX},
      }),
    );
    const readable = new Stream.PassThrough();
    stream.pipe(readable);
    await readResult(readable);
    assertConsoleErrorDev(
      [
        'A chunk filename "' +
          CHUNK_PREFIX +
          'client-abc123' +
          CHUNK_SUFFIX +
          '" does not match the declared chunkLoading prefix "/elsewhere/" ' +
          'and suffix "' +
          CHUNK_SUFFIX +
          '". Every chunk must match, or the client would reconstruct a ' +
          'wrong URL for it.',
      ],
      {withoutStack: true},
    );
  });
});
