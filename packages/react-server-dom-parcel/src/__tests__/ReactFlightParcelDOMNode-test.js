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

let parcelModules;
let React;
let ReactDOMServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let use;
let serverAct;

describe('ReactFlightParcelDOMNode', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Parcel resolves Client References through its runtime, a global that
    // its bundles install. The modules it knows are registered per test.
    parcelModules = {};
    const parcelRequire = id => parcelModules[id];
    parcelRequire.load = () => Promise.resolve();
    parcelRequire.extendImportMap = () => {};
    parcelRequire.meta = {publicUrl: '/prefix/', devServer: null};
    global.parcelRequire = parcelRequire;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-parcel/server', () =>
      require('react-server-dom-parcel/server.node'),
    );
    require('react');
    ReactServerDOMServer = require('react-server-dom-parcel/server');

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-parcel/server');
    jest.mock('react-server-dom-parcel/client', () =>
      jest.requireActual('react-server-dom-parcel/client.node'),
    );

    React = require('react');
    ReactDOMServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-parcel/client');
    Stream = require('stream');
    use = React.use;
  });

  afterEach(() => {
    delete global.parcelRequire;
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

  it('renders a Result in process for SSR', async () => {
    function ClientComponent({label}) {
      return <span>{label}</span>;
    }
    parcelModules['client-module'] = {ClientComponent};
    const ClientComponentReference = ReactServerDOMServer.createClientReference(
      'client-module',
      'ClientComponent',
      ['path/to/chunk.js'],
    );

    let renders = 0;
    async function App() {
      renders++;
      await 1;
      return <ClientComponentReference label="Client Component" />;
    }

    const result = ReactServerDOMServer.renderToResult(<App />);
    // The same Result serves the HTML render and the hydration stream.
    let response;
    function ClientRoot() {
      if (!response) {
        response = ReactServerDOMClient.createFromResult(result);
      }
      return use(response);
    }
    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(<ClientRoot />),
    );
    const readable = new Stream.PassThrough();
    await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(result).pipe(readable),
    );
    expect(await readResult(ssrStream)).toEqual(
      '<script src="/prefix/path/to/chunk.js" type="module" async=""></script><span>Client Component</span>',
    );
    const hydration = await ReactServerDOMClient.createFromNodeStream(readable);
    expect(hydration.props.label).toBe('Client Component');
    expect(renders).toBe(1);
  });
});
