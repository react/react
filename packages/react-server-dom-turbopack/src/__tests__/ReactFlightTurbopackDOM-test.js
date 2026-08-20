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

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

let act;
let serverAct;
let use;
let clientExports;
let clientExportsESM;
let turbopackMap;
let Stream;
let React;
let ReactDOMClient;
let ReactServerDOMServer;
let ReactServerDOMClient;
let Suspense;
let ErrorBoundary;

describe('ReactFlightTurbopackDOM', () => {
  beforeEach(() => {
    // For this first reset we are going to load the dom-node version of react-server-dom-turbopack/server
    // This can be thought of as essentially being the React Server Components scope with react-server
    // condition
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.node'),
    );
    jest.mock('react', () => require('react/react.react-server'));

    const TurbopackMock = require('./utils/TurbopackMock');
    clientExports = TurbopackMock.clientExports;
    clientExportsESM = TurbopackMock.clientExportsESM;
    turbopackMap = TurbopackMock.turbopackMap;

    ReactServerDOMServer = require('react-server-dom-turbopack/server');

    // This reset is to load modules for the SSR/Browser scope.
    jest.resetModules();
    __unmockReact();
    act = require('internal-test-utils').act;
    Stream = require('stream');
    React = require('react');
    use = React.use;
    Suspense = React.Suspense;
    ReactDOMClient = require('react-dom/client');
    ReactServerDOMClient = require('react-server-dom-turbopack/client');

    ErrorBoundary = class extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      render() {
        if (this.state.hasError) {
          return this.props.fallback(this.state.error);
        }
        return this.props.children;
      }
    };
  });

  function getTestStream() {
    const writable = new Stream.PassThrough();
    const readable = new ReadableStream({
      start(controller) {
        writable.on('data', chunk => {
          controller.enqueue(chunk);
        });
        writable.on('end', () => {
          controller.close();
        });
      },
    });
    return {
      readable,
      writable,
    };
  }

  it('should resolve HTML using Node streams', async () => {
    function Text({children}) {
      return <span>{children}</span>;
    }
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>world</Text>
        </div>
      );
    }

    function App() {
      const model = {
        html: <HTML />,
      };
      return model;
    }

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<App />, turbopackMap),
    );
    pipe(writable);
    const response = ReactServerDOMClient.createFromReadableStream(readable);
    const model = await response;
    expect(model).toEqual({
      html: (
        <div>
          <span>hello</span>
          <span>world</span>
        </div>
      ),
    });
  });

  it('should resolve the root', async () => {
    // Model
    function Text({children}) {
      return <span>{children}</span>;
    }
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>world</Text>
        </div>
      );
    }
    function RootModel() {
      return {
        html: <HTML />,
      };
    }

    // View
    function Message({response}) {
      return <section>{use(response).html}</section>;
    }
    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Message response={response} />
        </Suspense>
      );
    }

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(<RootModel />, turbopackMap),
    );
    pipe(writable);
    const response = ReactServerDOMClient.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe(
      '<section><div><span>hello</span><span>world</span></div></section>',
    );
  });

  it('should unwrap async module references', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule({text}) {
      return 'Async: ' + text;
    });

    const AsyncModule2 = Promise.resolve({
      exportName: 'Module',
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const AsyncModuleRef = await clientExports(AsyncModule);
    const AsyncModuleRef2 = await clientExports(AsyncModule2);

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        <AsyncModuleRef text={AsyncModuleRef2.exportName} />,
        turbopackMap,
      ),
    );
    pipe(writable);
    const response = ReactServerDOMClient.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Async: Module</p>');
  });

  it('should unwrap async ESM module references', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule({text}) {
      return 'Async: ' + text;
    });

    const AsyncModule2 = Promise.resolve({
      exportName: 'Module',
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <Suspense fallback={<h1>Loading...</h1>}>
          <Print response={response} />
        </Suspense>
      );
    }

    const AsyncModuleRef = await clientExportsESM(AsyncModule);
    const AsyncModuleRef2 = await clientExportsESM(AsyncModule2);

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        <AsyncModuleRef text={AsyncModuleRef2.exportName} />,
        turbopackMap,
      ),
    );
    pipe(writable);
    const response = ReactServerDOMClient.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });
    expect(container.innerHTML).toBe('<p>Async: Module</p>');
  });

  it('should error when a bundler uses async ESM modules with createClientModuleProxy', async () => {
    const AsyncModule = Promise.resolve(function AsyncModule() {
      return 'This should not be rendered';
    });

    function Print({response}) {
      return <p>{use(response)}</p>;
    }

    function App({response}) {
      return (
        <ErrorBoundary
          fallback={error => (
            <p>
              {__DEV__ ? error.message + ' + ' : null}
              {error.digest}
            </p>
          )}>
          <Suspense fallback={<h1>Loading...</h1>}>
            <Print response={response} />
          </Suspense>
        </ErrorBoundary>
      );
    }

    const AsyncModuleRef = await clientExportsESM(AsyncModule, {
      forceClientModuleProxy: true,
    });

    const {writable, readable} = getTestStream();
    const {pipe} = await serverAct(() =>
      ReactServerDOMServer.renderToPipeableStream(
        <AsyncModuleRef />,
        turbopackMap,
        {
          onError(error) {
            return __DEV__ ? 'a dev digest' : `digest(${error.message})`;
          },
        },
      ),
    );
    pipe(writable);
    const response = ReactServerDOMClient.createFromReadableStream(readable);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App response={response} />);
    });

    const errorMessage = `The module "${Object.keys(turbopackMap).at(0)}" is marked as an async ESM module but was loaded as a CJS proxy. This is probably a bug in the React Server Components bundler.`;

    expect(container.innerHTML).toBe(
      __DEV__
        ? `<p>${errorMessage} + a dev digest</p>`
        : `<p>digest(${errorMessage})</p>`,
    );
  });
});
