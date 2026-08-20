/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.WritableStream =
  require('web-streams-polyfill/ponyfill/es6').WritableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

let clientExports;
let React;
let ReactDOMClient;
let ReactServerDOMServer;
let ReactServerDOMClient;
let ReactServer;
let ReactServerScheduler;
let act;
let serverAct;
let turbopackMap;
let use;

describe('ReactFlightTurbopackDOMBrowser', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactServerScheduler = require('scheduler');
    patchMessageChannel(ReactServerScheduler);
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');

    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.browser'),
    );
    const TurbopackMock = require('./utils/TurbopackMock');
    clientExports = TurbopackMock.clientExports;
    turbopackMap = TurbopackMock.turbopackMap;

    ReactServerDOMServer = require('react-server-dom-turbopack/server.browser');

    __unmockReact();
    jest.resetModules();

    ({act} = require('internal-test-utils'));
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
    use = React.use;
  });

  function createDelayedStream(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            controller.close();
          } else {
            // Artificially delay between enqueuing chunks.
            await new Promise(resolve => setTimeout(resolve));
            controller.enqueue(value);
          }
        }
      },
    });
  }

  function normalizeCodeLocInfo(str) {
    return (
      str &&
      str.replace(/^ +(?:at|in) ([\S]+)[^\n]*/gm, function (m, name) {
        return '    in ' + name + (/\d/.test(m) ? ' (at **)' : '');
      })
    );
  }

  it('should resolve HTML using W3C streams', async () => {
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

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);
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

  it('does not close the response early when using a fast debug channel', async () => {
    function Component() {
      return <div>Hi</div>;
    }

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Component />, turbopackMap, {
        debugChannel: {
          writable: new WritableStream({
            write(chunk) {
              debugReadableStreamController.enqueue(chunk);
            },
            close() {
              debugReadableStreamController.close();
            },
          }),
        },
      }),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(
      // Create a delayed stream to simulate that the RSC stream might be
      // transported slower than the debug channel, which must not lead to a
      // `Connection closed` error in the Flight client.
      createDelayedStream(rscStream),
      {
        debugChannel: {readable: debugReadableStream},
      },
    );

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('<div>Hi</div>');
  });

  it('can transport debug info through a dedicated debug channel', async () => {
    let ownerStack;

    const ClientComponent = clientExports(() => {
      ownerStack = React.captureOwnerStack ? React.captureOwnerStack() : null;
      return <p>Hi</p>;
    });

    function App() {
      return ReactServer.createElement(
        ReactServer.Suspense,
        null,
        ReactServer.createElement(ClientComponent, null),
      );
    }

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        ReactServer.createElement(App, null),
        turbopackMap,
        {
          debugChannel: {
            writable: new WritableStream({
              write(chunk) {
                debugReadableStreamController.enqueue(chunk);
              },
              close() {
                debugReadableStreamController.close();
              },
            }),
          },
        },
      ),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      replayConsoleLogs: true,
      debugChannel: {
        readable: debugReadableStream,
        // Explicitly not defining a writable side here. Its presence was
        // previously used as a condition to wait for referenced debug chunks.
      },
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    if (__DEV__) {
      expect(normalizeCodeLocInfo(ownerStack)).toBe('\n    in App (at **)');
    }

    expect(container.innerHTML).toBe('<p>Hi</p>');
  });
});
