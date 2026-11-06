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

// Where the Server Components render finds its Client Modules, and where the
// HTML render loads them from: a separate build whose files are served from
// the module base URL.
const moduleBasePath = 'file:///app/src/';
const moduleRootPath = 'file:///app/build/';
const moduleBaseURL = '/build/';

let esmModules;
let React;
let ReactDOMServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Stream;
let use;
let serverAct;

describe('ReactFlightESMDOMNode', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-esm/server', () =>
      require('react-server-dom-esm/server.node'),
    );
    require('react');
    ReactServerDOMServer = require('react-server-dom-esm/server');

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-esm/server');
    // Jest can't import() a module by URL, so the modules the client loads
    // are registered per test instead.
    esmModules = {};
    jest.mock(
      'react-server-dom-esm/src/client/ReactFlightClientConfigBundlerESM',
      () => ({
        ...jest.requireActual(
          'react-server-dom-esm/src/client/ReactFlightClientConfigBundlerESM',
        ),
        preloadModule() {
          return null;
        },
        requireModule(metadata) {
          return esmModules[metadata.specifier][metadata.name];
        },
      }),
    );
    jest.mock('react-server-dom-esm/client', () =>
      jest.requireActual('react-server-dom-esm/client.node'),
    );

    React = require('react');
    ReactDOMServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-esm/client');
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

  // The built client imports modules by URL, which Jest cannot do without
  // --experimental-vm-modules; only the source build can be stubbed.
  // @gate source
  it('renders a Result in process for SSR', async () => {
    function ClientComponent({label}) {
      return <span>{label}</span>;
    }
    esmModules[moduleRootPath + 'Client.js'] = {ClientComponent};
    const ClientComponentReference =
      ReactServerDOMServer.registerClientReference(
        function () {},
        moduleBasePath + 'Client.js',
        'ClientComponent',
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
        response = ReactServerDOMClient.createFromResult(
          result,
          moduleRootPath,
          moduleBaseURL,
          {clientManifest: moduleBasePath},
        );
      }
      return use(response);
    }
    const ssrStream = await serverAct(() =>
      ReactDOMServer.renderToPipeableStream(<ClientRoot />),
    );
    const readable = new Stream.PassThrough();
    await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(result, moduleBasePath).pipe(
        readable,
      ),
    );
    expect(await readResult(ssrStream)).toEqual(
      '<script src="/build/Client.js" type="module" async=""></script><span>Client Component</span>',
    );
    const hydration = await ReactServerDOMClient.createFromNodeStream(
      readable,
      moduleRootPath,
      moduleBaseURL,
    );
    expect(hydration.props.label).toBe('Client Component');
    expect(renders).toBe(1);
  });
});
