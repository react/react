/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('events', () => {
  let dispatcher;

  beforeEach(() => {
    const EventEmitter = require('../events').default;

    dispatcher = new EventEmitter();
  });

  it('can dispatch an event with no listeners', () => {
    dispatcher.emit('event', 123);
  });

  it('handles a listener being attached multiple times', () => {
    const callback = jest.fn();

    dispatcher.addListener('event', callback);
    dispatcher.addListener('event', callback);

    dispatcher.emit('event', 123);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(123);
  });

  it('notifies all attached listeners of events', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    dispatcher.addListener('event', callback1);
    dispatcher.addListener('event', callback2);
    dispatcher.addListener('other-event', callback3);
    dispatcher.emit('event', 123);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledWith(123);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith(123);
    expect(callback3).not.toHaveBeenCalled();
  });

  it('calls later listeners before re-throwing if an earlier one throws', () => {
    const callbackThatThrows = jest.fn(() => {
      throw Error('expected');
    });
    const callback = jest.fn();

    dispatcher.addListener('event', callbackThatThrows);
    dispatcher.addListener('event', callback);

    expect(() => {
      dispatcher.emit('event', 123);
    }).toThrow('expected');

    expect(callbackThatThrows).toHaveBeenCalledTimes(1);
    expect(callbackThatThrows).toHaveBeenCalledWith(123);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(123);
  });

  it('preserves the first thrown value and reports later errors', () => {
    const laterError = new Error('later error');
    const errorHandler = jest.fn(event => {
      event.preventDefault();
    });
    const firstCallback = jest.fn(() => {
      // This verifies that the emitter preserves any legal thrown value.
      // eslint-disable-next-line no-throw-literal
      throw null;
    });
    const secondCallback = jest.fn(() => {
      throw laterError;
    });
    const thirdCallback = jest.fn();

    dispatcher.addListener('event', firstCallback);
    dispatcher.addListener('event', secondCallback);
    dispatcher.addListener('event', thirdCallback);

    let caughtValue = undefined;
    window.addEventListener('error', errorHandler);
    try {
      dispatcher.emit('event', 123);
    } catch (error) {
      caughtValue = error;
    } finally {
      window.removeEventListener('error', errorHandler);
    }

    expect(caughtValue).toBe(null);
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        error: laterError,
        message: 'later error',
      }),
    );
    expect(thirdCallback).toHaveBeenCalledWith(123);
  });

  it('removes attached listeners', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    dispatcher.addListener('event', callback1);
    dispatcher.addListener('other-event', callback2);
    dispatcher.removeListener('event', callback1);
    dispatcher.emit('event', 123);
    expect(callback1).not.toHaveBeenCalled();
    dispatcher.emit('other-event', 123);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith(123);
  });

  it('removes all listeners', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    dispatcher.addListener('event', callback1);
    dispatcher.addListener('event', callback2);
    dispatcher.addListener('other-event', callback3);
    dispatcher.removeAllListeners();
    dispatcher.emit('event', 123);
    dispatcher.emit('other-event', 123);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
    expect(callback3).not.toHaveBeenCalled();
  });

  it('should call the initial listeners even if others are added or removed during a dispatch', () => {
    const callback1 = jest.fn(() => {
      dispatcher.removeListener('event', callback2);
      dispatcher.addListener('event', callback3);
    });
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    dispatcher.addListener('event', callback1);
    dispatcher.addListener('event', callback2);

    dispatcher.emit('event', 123);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledWith(123);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith(123);
    expect(callback3).not.toHaveBeenCalled();

    dispatcher.emit('event', 456);
    expect(callback1).toHaveBeenCalledTimes(2);
    expect(callback1).toHaveBeenCalledWith(456);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback3).toHaveBeenCalledTimes(1);
    expect(callback3).toHaveBeenCalledWith(456);
  });
});
