/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('fetchFileWithCaching', () => {
  let fetchFileWithCaching;
  let messageListeners;
  let navigationListener;
  let unloadListener;
  let sendMessage;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllTimers();

    messageListeners = new Set();
    navigationListener = null;
    unloadListener = null;
    sendMessage = jest.fn();

    global.__IS_CHROME__ = false;
    global.__IS_EDGE__ = false;
    global.__IS_FIREFOX__ = false;
    global.chrome = {
      devtools: {
        inspectedWindow: {
          tabId: 1,
        },
        network: {
          getHAR: jest.fn(callback => callback({entries: []})),
          onNavigated: {
            addListener: jest.fn(listener => {
              navigationListener = listener;
            }),
          },
        },
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(listener => messageListeners.add(listener)),
          removeListener: jest.fn(listener =>
            messageListeners.delete(listener),
          ),
        },
        sendMessage,
      },
    };

    const addEventListener = jest
      .spyOn(window, 'addEventListener')
      .mockImplementation((type, listener) => {
        if (type === 'beforeunload') {
          unloadListener = listener;
        }
      });

    fetchFileWithCaching = require('../main/fetchFileWithCaching').default;
    addEventListener.mockRestore();
  });

  afterEach(() => {
    jest.clearAllTimers();
    delete global.chrome;
  });

  function dispatchMessage(type, url, value) {
    messageListeners.forEach(listener => {
      listener({
        source: 'react-devtools-background',
        payload: {type, url, value},
      });
    });
  }

  it('reuses one pending request and removes its listener after success', async () => {
    const first = fetchFileWithCaching('https://example.com/source.js');
    const second = fetchFileWithCaching('https://example.com/source.js');

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(messageListeners.size).toBe(1);

    dispatchMessage(
      'fetch-file-with-cache-complete',
      'https://example.com/source.js',
      'source',
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      'source',
      'source',
    ]);
    expect(messageListeners.size).toBe(0);
    expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1);
  });

  it('settles only the request matching a response URL', async () => {
    const first = fetchFileWithCaching('https://example.com/first.js');
    const second = fetchFileWithCaching('https://example.com/second.js');
    let secondStatus = 'pending';
    const secondResult = second.then(
      value => {
        secondStatus = 'resolved';
        return value;
      },
      error => {
        secondStatus = 'rejected';
        throw error;
      },
    );

    dispatchMessage(
      'fetch-file-with-cache-complete',
      'https://example.com/first.js',
      'first source',
    );

    await expect(first).resolves.toBe('first source');
    expect(secondStatus).toBe('pending');
    expect(messageListeners.size).toBe(1);

    const error = new Error('second failed');
    dispatchMessage(
      'fetch-file-with-cache-error',
      'https://example.com/second.js',
      error,
    );

    await expect(secondResult).rejects.toBe(error);
    expect(messageListeners.size).toBe(0);
  });

  it('rejects every request on navigation and permits later requests', async () => {
    const first = fetchFileWithCaching('https://example.com/first.js');
    const second = fetchFileWithCaching('https://example.com/second.js');
    const firstResult = first.catch(error => error);
    const secondResult = second.catch(error => error);

    navigationListener();

    await expect(firstResult).resolves.toEqual(
      expect.objectContaining({message: expect.stringContaining('navigated')}),
    );
    await expect(secondResult).resolves.toEqual(
      expect.objectContaining({message: expect.stringContaining('navigated')}),
    );
    expect(messageListeners.size).toBe(0);

    const retry = fetchFileWithCaching('https://example.com/first.js');
    expect(sendMessage).toHaveBeenCalledTimes(3);
    dispatchMessage(
      'fetch-file-with-cache-complete',
      'https://example.com/first.js',
      'retry source',
    );
    await expect(retry).resolves.toBe('retry source');
  });

  it('rejects pending requests when DevTools unloads', async () => {
    const request = fetchFileWithCaching('https://example.com/source.js');
    const result = request.catch(error => error);

    unloadListener();

    await expect(result).resolves.toEqual(
      expect.objectContaining({message: expect.stringContaining('Aborted')}),
    );
    expect(messageListeners.size).toBe(0);
  });

  it('times out, removes its listener, and permits a retry', async () => {
    const request = fetchFileWithCaching('https://example.com/source.js');
    const result = request.catch(error => error);

    jest.advanceTimersByTime(60_000);

    await expect(result).resolves.toEqual(
      expect.objectContaining({message: expect.stringContaining('Timed out')}),
    );
    expect(messageListeners.size).toBe(0);

    dispatchMessage(
      'fetch-file-with-cache-complete',
      'https://example.com/source.js',
      'late source',
    );

    const retry = fetchFileWithCaching('https://example.com/source.js');
    expect(sendMessage).toHaveBeenCalledTimes(2);
    dispatchMessage(
      'fetch-file-with-cache-complete',
      'https://example.com/source.js',
      'retry source',
    );
    await expect(retry).resolves.toBe('retry source');
  });

  it('cleans up immediately if sending the request throws', async () => {
    const error = new Error('Extension context invalidated');
    sendMessage.mockImplementationOnce(() => {
      throw error;
    });

    await expect(
      fetchFileWithCaching('https://example.com/source.js'),
    ).rejects.toBe(error);
    expect(messageListeners.size).toBe(0);

    const retry = fetchFileWithCaching('https://example.com/source.js');
    expect(sendMessage).toHaveBeenCalledTimes(2);
    dispatchMessage(
      'fetch-file-with-cache-complete',
      'https://example.com/source.js',
      'retry source',
    );
    await expect(retry).resolves.toBe('retry source');
  });
});
