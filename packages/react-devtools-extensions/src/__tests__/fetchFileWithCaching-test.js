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
  let harEntries;
  let resources;
  let runtimeListeners;
  let sentMessages;
  let previousIsChrome;

  function createChromeMock() {
    return {
      devtools: {
        inspectedWindow: {
          tabId: 1,
          getResources: jest.fn(callback => callback(resources)),
        },
        network: {
          getHAR: jest.fn(callback => callback({entries: harEntries})),
        },
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(listener => runtimeListeners.add(listener)),
          removeListener: jest.fn(listener =>
            runtimeListeners.delete(listener),
          ),
        },
        sendMessage: jest.fn(message => sentMessages.push(message)),
      },
    };
  }

  function respondFromPage(url, value) {
    const message = {
      source: 'react-devtools-background',
      payload: {type: 'fetch-file-with-cache-complete', url, value},
    };
    Array.from(runtimeListeners).forEach(listener => listener(message));
  }

  function harEntry(url, content) {
    return {
      request: {url},
      response: {content: {text: content}},
      getContent: jest.fn(callback => callback(content)),
    };
  }

  beforeEach(() => {
    jest.resetModules();

    harEntries = [];
    resources = [];
    runtimeListeners = new Set();
    sentMessages = [];

    global.chrome = createChromeMock();
    previousIsChrome = global.__IS_CHROME__;
    global.__IS_CHROME__ = true;

    fetchFileWithCaching =
      require('react-devtools-extensions/src/main/fetchFileWithCaching').default;
  });

  afterEach(() => {
    global.__IS_CHROME__ = previousIsChrome;
    delete global.chrome;
  });

  it('does not also fetch from the page when the file is in the HAR', async () => {
    harEntries = [harEntry('https://example.com/app.js', 'har content')];

    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('har content');

    expect(sentMessages).toEqual([]);
  });

  it('reads only the first matching HAR entry', async () => {
    const first = harEntry('https://example.com/app.js', 'first');
    const second = harEntry('https://example.com/app.js', 'second');
    harEntries = [first, second];

    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('first');

    expect(first.getContent).toHaveBeenCalledTimes(1);
    expect(second.getContent).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
  });

  it('falls back to fetching from the page when the file is not in the HAR', async () => {
    harEntries = [harEntry('https://example.com/other.js', 'other')];

    const promise = fetchFileWithCaching('https://example.com/app.js');
    await Promise.resolve();

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].payload).toEqual({
      type: 'fetch-file-with-cache',
      tabId: 1,
      url: 'https://example.com/app.js',
    });

    respondFromPage('https://example.com/app.js', 'page content');
    await expect(promise).resolves.toBe('page content');
  });

  it('shares one lookup between concurrent requests for the same URL', async () => {
    harEntries = [harEntry('https://example.com/app.js', 'har content')];

    const results = await Promise.all([
      fetchFileWithCaching('https://example.com/app.js'),
      fetchFileWithCaching('https://example.com/app.js'),
      fetchFileWithCaching('https://example.com/app.js'),
    ]);

    expect(results).toEqual(['har content', 'har content', 'har content']);
    expect(chrome.devtools.inspectedWindow.getResources).toHaveBeenCalledTimes(
      1,
    );
    expect(chrome.devtools.network.getHAR).toHaveBeenCalledTimes(1);
  });

  it('does not keep settled requests around', async () => {
    harEntries = [harEntry('https://example.com/app.js', 'v1')];
    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('v1');

    harEntries = [harEntry('https://example.com/app.js', 'v2')];
    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('v2');

    expect(chrome.devtools.network.getHAR).toHaveBeenCalledTimes(2);
  });

  it('does not keep failed requests around', async () => {
    const promise = fetchFileWithCaching('https://example.com/app.js');
    await Promise.resolve();
    Array.from(runtimeListeners).forEach(listener =>
      listener({
        source: 'react-devtools-background',
        payload: {
          type: 'fetch-file-with-cache-error',
          url: 'https://example.com/app.js',
          value: null,
        },
      }),
    );
    await expect(promise).rejects.toBe(null);

    harEntries = [harEntry('https://example.com/app.js', 'recovered')];
    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('recovered');
  });

  it('prefers inspected window resources over the HAR', async () => {
    resources = [
      {
        url: 'https://example.com/app.js',
        getContent: callback => callback('resource content'),
      },
    ];
    harEntries = [harEntry('https://example.com/app.js', 'har content')];

    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('resource content');
    expect(chrome.devtools.network.getHAR).not.toHaveBeenCalled();
  });
});
