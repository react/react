/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('Bridge', () => {
  let Bridge;

  beforeEach(() => {
    Bridge = require('react-devtools-shared/src/bridge').default;
  });

  // @reactVersion >=16.0
  it('should shutdown properly', () => {
    const wall = {
      listen: jest.fn(() => () => {}),
      send: jest.fn(),
    };
    const bridge = new Bridge(wall);
    const shutdownCallback = jest.fn();
    bridge.addListener('shutdown', shutdownCallback);

    // Check that we're wired up correctly.
    bridge.send('reloadAppForProfiling');
    jest.runAllTimers();
    expect(wall.send).toHaveBeenCalledWith('reloadAppForProfiling', undefined);

    // Should flush pending messages and then shut down.
    wall.send.mockClear();
    bridge.send('update', '1');
    bridge.send('update', '2');
    bridge.shutdown();
    jest.runAllTimers();
    expect(wall.send).toHaveBeenCalledWith('update', '1');
    expect(wall.send).toHaveBeenCalledWith('update', '2');
    expect(wall.send).toHaveBeenCalledWith('shutdown', undefined);
    expect(shutdownCallback).toHaveBeenCalledTimes(1);

    // Verify that the Bridge doesn't send messages after shutdown.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    wall.send.mockClear();
    bridge.send('should not send');
    jest.runAllTimers();
    expect(wall.send).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      'Cannot send message "should not send" through a Bridge that has been shutdown.',
    );
  });
});
