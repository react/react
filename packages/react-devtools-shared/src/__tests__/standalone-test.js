/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('standalone server connections', () => {
  let connectionListener: (socket: any) => void;
  let onDisconnected;
  let server;
  let websocketModule: string;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('http', () => ({
      createServer: () => ({
        on: jest.fn(),
        listen: jest.fn(),
        close: jest.fn(),
      }),
    }));
    websocketModule = require.resolve('ws', {
      paths: [require.resolve('react-devtools-core/src/standalone')],
    });
    jest.doMock(websocketModule, () => ({
      Server: class {
        on(event, listener) {
          if (event === 'connection') {
            connectionListener = listener;
          }
        }
        close() {}
      },
    }));
    jest.doMock('react-dom', () => ({flushSync: callback => callback()}));
    jest.doMock('react-dom/client', () => ({
      createRoot: () => ({render: jest.fn(), unmount: jest.fn()}),
    }));
    jest.doMock('react-devtools-shared/src/devtools/store', () => jest.fn());
    jest.doMock('react-devtools-shared/src/devtools/storeErrorLogger', () => ({
      subscribeToStoreErrors: jest.fn(),
    }));
    jest.doMock('react-devtools-shared/src/devtools/views/DevTools', () =>
      jest.fn(),
    );
    jest.doMock(
      'react-devtools-shared/src/registerDevToolsEventLogger',
      () => ({
        registerDevToolsEventLogger: jest.fn(),
      }),
    );
    const standalone = require('react-devtools-core/src/standalone').default;
    onDisconnected = jest.fn();
    standalone.setContentDOMNode(document.createElement('div'));
    standalone.setDisconnectedCallback(onDisconnected);
    server = standalone.startServer();
  });

  afterEach(() => {
    server.close();
    jest.clearAllTimers();
    [
      'http',
      websocketModule,
      'react-dom',
      'react-dom/client',
      'react-devtools-shared/src/devtools/store',
      'react-devtools-shared/src/devtools/storeErrorLogger',
      'react-devtools-shared/src/devtools/views/DevTools',
      'react-devtools-shared/src/registerDevToolsEventLogger',
    ].forEach(name => {
      jest.dontMock(name);
    });
  });

  function connect() {
    const socket = {close: jest.fn()};
    connectionListener(socket);
    jest.runOnlyPendingTimers();
    return socket;
  }

  it('ignores a replaced socket closing after the new client connects', () => {
    const previous = connect();
    const current = connect();
    expect(previous.close).toHaveBeenCalledTimes(1);

    previous.onclose();
    expect(onDisconnected).not.toHaveBeenCalled();

    connect();
    expect(current.close).toHaveBeenCalledTimes(1);
  });

  it('ignores errors from replaced sockets but still handles the current close', () => {
    const previous = connect();
    const current = connect();

    previous.onerror(new Error('The old connection failed'));
    expect(onDisconnected).not.toHaveBeenCalled();

    current.onclose();
    expect(onDisconnected).toHaveBeenCalledTimes(1);
  });

  it('still disconnects when the active socket errors', () => {
    const current = connect();
    const error = new Error('The active connection failed');
    current.onerror(error);
    expect(onDisconnected).toHaveBeenCalledTimes(1);
    expect(global.consoleErrorMock).toHaveBeenCalledWith(
      '[React DevTools]',
      'Error with websocket connection',
      error,
    );
  });
});
