/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('connectToDevTools', () => {
  let connectToDevTools;
  let hook;

  beforeEach(() => {
    jest.resetModules();
    delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    const backend = require('react-devtools-core/src/backend');
    backend.initialize();
    connectToDevTools = backend.connectToDevTools;
    hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  });

  afterEach(() => {
    jest.clearAllTimers();
    delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  });

  function createWebSocket(): WebSocket {
    return {
      CLOSED: 3,
      OPEN: 1,
      readyState: 1,
      send: jest.fn(),
    } as any as WebSocket;
  }

  it('shuts down cleanly when the WebSocket closes', () => {
    const websocket = createWebSocket();
    const onShutdown = jest.fn();
    const unsubscribe = hook.sub('shutdown', onShutdown);

    try {
      connectToDevTools({websocket});
      websocket.onopen();
      websocket.readyState = websocket.CLOSED;
      websocket.onclose();
      jest.runAllTimers();

      expect(onShutdown).toHaveBeenCalledTimes(1);
      expect(global.consoleWarnMock).not.toHaveBeenCalledWith(
        'Bridge was already shutdown.',
      );
    } finally {
      unsubscribe();
    }
  });
});
