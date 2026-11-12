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

    // Using a Bridge after shutdown is a lifecycle error.
    wall.send.mockClear();
    expect(() => bridge.send('should not send')).toThrow(
      'Cannot send a message through a Bridge that has been shut down.',
    );
    expect(() => bridge.addListener('event', () => {})).toThrow(
      'Cannot add a listener through a Bridge that has been shut down.',
    );
    expect(() => bridge.emit('event')).toThrow(
      'Cannot emit an event through a Bridge that has been shut down.',
    );
    expect(() => bridge.shutdown()).toThrow(
      'Cannot shut down through a Bridge that has been shut down.',
    );
    jest.runAllTimers();
    expect(wall.send).not.toHaveBeenCalled();
  });

  // @reactVersion >=16.0
  it('validates messages received from the wall', () => {
    let wallListener: ((message: mixed) => void) | null = null;
    const wall = {
      listen: jest.fn(listener => {
        wallListener = listener;
        return () => {};
      }),
      send: jest.fn(),
    };
    const bridge = new Bridge(wall);
    const listener = jest.fn();
    bridge.addListener('event', listener);

    const dispatch = (message: mixed) => {
      if (wallListener === null) {
        throw new Error('Expected the Bridge to subscribe to the wall.');
      }
      wallListener(message);
    };

    // Walls may share their transport with unrelated or legacy messages.
    dispatch(null);
    dispatch({type: 'event'});
    expect(listener).not.toHaveBeenCalled();

    expect(() => dispatch({event: 123})).toThrow(
      'Bridge event names must be non-empty strings.',
    );
    expect(() => dispatch({event: ''})).toThrow(
      'Bridge event names must be non-empty strings.',
    );

    dispatch({event: 'event', payload: 123});
    expect(listener).toHaveBeenCalledWith(123);
  });

  // @reactVersion >=16.0
  it('requires Wall.listen to return a cleanup function', () => {
    expect(
      () =>
        new Bridge({
          listen: () => undefined,
          send: jest.fn(),
        }),
    ).toThrow('Wall.listen() must return an unlisten function.');
  });

  // @reactVersion >=16.0
  it('flushes pending messages when wall cleanup throws', () => {
    const expectedError = new Error('Failed to unsubscribe');
    const wall = {
      listen: jest.fn(() => () => {
        throw expectedError;
      }),
      send: jest.fn(),
    };
    const bridge = new Bridge(wall);

    bridge.send('update', 'value');
    expect(() => bridge.shutdown()).toThrow(expectedError);
    expect(wall.send).toHaveBeenCalledWith('update', 'value');
    expect(wall.send).toHaveBeenCalledWith('shutdown', undefined);
  });
});
