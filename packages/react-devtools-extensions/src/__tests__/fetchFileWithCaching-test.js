/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// JSDOM does not provide the browser's UTF-8 decoder.
beforeEach(() => {
  jest.useRealTimers();
  global.TextDecoder = require('util').TextDecoder;
});

describe('fetchFileWithCaching', () => {
  let fetchFileWithCaching;
  let harEntries;
  let resources;
  let runtimeListeners;
  let sentMessages;
  let previousIsChrome;
  let navigationListeners;
  let requestListeners;
  let editListeners;
  let failPageFetch;

  function createChromeMock() {
    return {
      devtools: {
        inspectedWindow: {
          tabId: 1,
          onResourceContentCommitted: {
            addListener: fn => editListeners.add(fn),
          },
          getResources: jest.fn(callback => callback(resources)),
        },
        network: {
          onNavigated: {addListener: fn => navigationListeners.add(fn)},
          onRequestFinished: {addListener: fn => requestListeners.add(fn)},
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
        sendMessage: jest.fn(message => {
          sentMessages.push(message);
          if (failPageFetch)
            Promise.resolve().then(() => {
              Array.from(runtimeListeners).forEach(listener =>
                listener({
                  source: 'react-devtools-background',
                  payload: {
                    type: 'fetch-file-with-cache-error',
                    requestID: message.payload.requestID,
                    url: message.payload.url,
                    value: null,
                  },
                }),
              );
            });
        }),
      },
    };
  }

  function latestRequestID(url) {
    return sentMessages
      .slice()
      .reverse()
      .find(message => message.payload.url === url).payload.requestID;
  }

  function respondFromPage(url, value) {
    const message = {
      source: 'react-devtools-background',
      payload: {
        type: 'fetch-file-with-cache-complete',
        url,
        value,
        requestID: latestRequestID(url),
      },
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
    navigationListeners = new Set();
    requestListeners = new Set();
    editListeners = new Set();
    failPageFetch = false;

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

  it('reads the latest matching HAR entry after a reload', async () => {
    const first = harEntry('https://example.com/app.js', 'first');
    const second = harEntry('https://example.com/app.js', 'second');
    harEntries = [first, second];

    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('second');

    expect(first.getContent).not.toHaveBeenCalled();
    expect(second.getContent).toHaveBeenCalledTimes(1);
    expect(sentMessages).toEqual([]);
  });

  it('falls back to fetching from the page when the file is not in the HAR', async () => {
    harEntries = [harEntry('https://example.com/other.js', 'other')];

    const promise = fetchFileWithCaching('https://example.com/app.js');
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].payload).toEqual({
      type: 'fetch-file-with-cache',
      requestID: expect.any(String),
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
    expect(chrome.devtools.inspectedWindow.getResources).not.toHaveBeenCalled();
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
    for (let i = 0; i < 10; i++) await Promise.resolve();
    Array.from(runtimeListeners).forEach(listener =>
      listener({
        source: 'react-devtools-background',
        payload: {
          type: 'fetch-file-with-cache-error',
          requestID: latestRequestID('https://example.com/app.js'),
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

  it('uses the HAR without enumerating inspected window resources', async () => {
    resources = [
      {
        url: 'https://example.com/app.js',
        getContent: callback => callback('resource content'),
      },
    ];
    harEntries = [harEntry('https://example.com/app.js', 'har content')];

    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('har content');
    expect(chrome.devtools.inspectedWindow.getResources).not.toHaveBeenCalled();
  });
  it.each([
    'data:application/json;charset=utf-8;base64,' +
      Buffer.from('{"name":"中文组件"}').toString('base64'),
    'data:application/json,' + encodeURIComponent('{"name":"中文组件"}'),
  ])('decodes inline maps without invoking Chrome APIs: %s', async url => {
    await expect(fetchFileWithCaching(url)).resolves.toBe(
      '{"name":"中文组件"}',
    );
    expect(chrome.devtools.network.getHAR).not.toHaveBeenCalled();
    expect(chrome.devtools.inspectedWindow.getResources).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
  });

  it('rejects malformed inline data without falling back to the page', async () => {
    await expect(
      fetchFileWithCaching('data:application/json;base64,@@@'),
    ).rejects.toThrow();
    expect(sentMessages).toEqual([]);
    expect(chrome.devtools.network.getHAR).not.toHaveBeenCalled();
  });

  it('uses resources when the latest HAR body is unavailable', async () => {
    failPageFetch = true;
    harEntries = [harEntry('https://example.com/app.js', null)];
    resources = [
      {
        url: 'https://example.com/app.js',
        getContent: callback => callback('resource content'),
      },
    ];
    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('resource content');
    expect(sentMessages).toHaveLength(1);
  });

  it('decodes base64 HAR bodies as UTF-8', async () => {
    const entry = harEntry('https://example.com/app.js', null);
    entry.getContent = callback =>
      callback(Buffer.from('中文源码').toString('base64'), 'base64');
    harEntries = [entry];
    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('中文源码');
  });

  it.each(['navigation', 'request', 'edit'])(
    'invalidates source mapping on %s',
    async event => {
      const {
        symbolicateSourceWithCache,
      } = require('react-devtools-shared/src/symbolicateSource');
      const url = 'https://example.com/app.js';
      const mapURL = url + '.map';
      const script = 'function f(){}\n//# sourceMappingURL=app.js.map';
      const makeMap = name =>
        JSON.stringify({
          version: 3,
          sources: [name],
          names: [],
          mappings: 'AAAA',
        });
      harEntries = [
        harEntry(url, script),
        harEntry(mapURL, makeMap('before.js')),
      ];
      await expect(
        symbolicateSourceWithCache(fetchFileWithCaching, url, 1, 1),
      ).resolves.toEqual({
        location: ['', 'https://example.com/before.js', 1, 1],
        ignored: false,
      });
      harEntries = [
        harEntry(url, script),
        harEntry(mapURL, makeMap('after.js')),
      ];
      const listeners =
        event === 'navigation'
          ? navigationListeners
          : event === 'request'
            ? requestListeners
            : editListeners;
      listeners.forEach(fn =>
        fn(
          event === 'navigation' ? url : {request: {url}, url, type: 'script'},
        ),
      );
      await expect(
        symbolicateSourceWithCache(fetchFileWithCaching, url, 1, 1),
      ).resolves.toEqual({
        location: ['', 'https://example.com/after.js', 1, 1],
        ignored: false,
      });
    },
  );
  it('uses committed source content instead of an older HAR body', async () => {
    const url = 'https://example.com/app.js';
    harEntries = [harEntry(url, 'old content')];
    editListeners.forEach(fn => fn({url}, 'edited content'));
    await expect(fetchFileWithCaching(url)).resolves.toBe('edited content');
    navigationListeners.forEach(fn => fn(url));
    await expect(fetchFileWithCaching(url)).resolves.toBe('old content');
  });

  it('shares a HAR enumeration across concurrent different URLs', async () => {
    harEntries = [
      harEntry('https://example.com/a.js', 'a'),
      harEntry('https://example.com/b.js', 'b'),
    ];
    await expect(
      Promise.all([
        fetchFileWithCaching('https://example.com/a.js'),
        fetchFileWithCaching('https://example.com/b.js'),
      ]),
    ).resolves.toEqual(['a', 'b']);
    expect(chrome.devtools.network.getHAR).toHaveBeenCalledTimes(1);
    expect(chrome.devtools.inspectedWindow.getResources).not.toHaveBeenCalled();
  });

  it('falls back to resource contents when getContent returns an empty unavailable HAR body', async () => {
    failPageFetch = true;
    const url = 'https://example.com/app.js';
    harEntries = [harEntry(url, '')];
    resources = [{url, getContent: callback => callback('resource content')}];
    await expect(fetchFileWithCaching(url)).resolves.toBe('resource content');
  });
  it('enumerates resources once for a serialized multi-file owner stack', async () => {
    failPageFetch = true;
    const {
      symbolicateSourceWithCache,
    } = require('react-devtools-shared/src/symbolicateSource');
    const inline =
      'data:application/json,' +
      encodeURIComponent(
        JSON.stringify({
          version: 3,
          sources: ['original.js'],
          names: [],
          mappings: 'AAAA',
        }),
      );
    resources = Array.from({length: 6}, (_, i) => ({
      url: `https://example.com/owner${i}.js`,
      getContent: callback => callback('a();\n//# sourceMappingURL=' + inline),
    }));
    const results = await Promise.all(
      resources.map(resource =>
        symbolicateSourceWithCache(fetchFileWithCaching, resource.url, 1, 1),
      ),
    );
    expect(results.map(result => result.location[1])).toEqual(
      Array(6).fill('https://example.com/original.js'),
    );
    expect(chrome.devtools.inspectedWindow.getResources).toHaveBeenCalledTimes(
      1,
    );
  });

  it('does not restart current symbolication when an unrelated lazy script finishes', async () => {
    const {
      getSourceCacheVersion,
      symbolicateSourceWithCache,
    } = require('react-devtools-shared/src/symbolicateSource');
    const url = 'https://example.com/app.js';
    harEntries = [
      harEntry(
        url,
        'a();\n//# sourceMappingURL=data:application/json,' +
          encodeURIComponent(
            JSON.stringify({
              version: 3,
              sources: ['original.js'],
              names: [],
              mappings: 'AAAA',
            }),
          ),
      ),
    ];
    const inline =
      harEntries[0].response.content.text.split('sourceMappingURL=')[1];
    harEntries.push(
      harEntry(
        inline,
        JSON.stringify({
          version: 3,
          sources: ['original.js'],
          names: [],
          mappings: 'AAAA',
        }),
      ),
    );
    await symbolicateSourceWithCache(fetchFileWithCaching, url, 1, 1);
    const version = getSourceCacheVersion();
    requestListeners.forEach(fn =>
      fn({
        request: {url: 'https://example.com/unrelated.js'},
        response: {content: {mimeType: 'text/javascript'}},
      }),
    );
    expect(getSourceCacheVersion()).toBe(version);
    expect(
      (await symbolicateSourceWithCache(fetchFileWithCaching, url, 1, 1))
        .location[1],
    ).toBe('https://example.com/original.js');
  });

  it('refreshes a cached resource inventory when a new script is missing', async () => {
    failPageFetch = true;
    resources = [
      {url: 'https://example.com/a.js', getContent: callback => callback('a')},
    ];
    await expect(
      fetchFileWithCaching('https://example.com/a.js'),
    ).resolves.toBe('a');
    resources = [
      ...resources,
      {
        url: 'https://example.com/lazy.js',
        getContent: callback => callback('lazy'),
      },
    ];
    await expect(
      fetchFileWithCaching('https://example.com/lazy.js'),
    ).resolves.toBe('lazy');
  });

  it('reads ordinary HTTP source from the page cache without the blocking resource inventory', async () => {
    const {
      getSourceCacheVersion,
    } = require('react-devtools-shared/src/symbolicateSource');
    const version = getSourceCacheVersion();
    const url = 'https://example.com/app.js';
    const pending = fetchFileWithCaching(url);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    requestListeners.forEach(fn =>
      fn({request: {url}, response: {content: {mimeType: 'text/javascript'}}}),
    );
    respondFromPage(url, 'cached script');
    await expect(pending).resolves.toBe('cached script');
    expect(chrome.devtools.inspectedWindow.getResources).not.toHaveBeenCalled();
    expect(getSourceCacheVersion()).toBe(version);
  });
  it('cancels old page reads and isolates same-URL replies after navigation', async () => {
    const url = 'https://example.com/app.js';
    const old = fetchFileWithCaching(url);
    const oldSettled = old.catch(() => null);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const oldID = sentMessages[0].payload.requestID;
    navigationListeners.forEach(listener => listener(url));
    const current = fetchFileWithCaching(url);
    let currentSettled = false;
    current.then(() => {
      currentSettled = true;
    });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(sentMessages).toHaveLength(2);
    const currentID = sentMessages[1].payload.requestID;
    expect(currentID).not.toBe(oldID);
    Array.from(runtimeListeners).forEach(listener =>
      listener({
        source: 'react-devtools-background',
        payload: {
          type: 'fetch-file-with-cache-complete',
          url,
          value: 'old script',
          requestID: oldID,
        },
      }),
    );
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(currentSettled).toBe(false);
    Array.from(runtimeListeners).forEach(listener =>
      listener({
        source: 'react-devtools-background',
        payload: {
          type: 'fetch-file-with-cache-complete',
          url,
          value: 'new script',
          requestID: currentID,
        },
      }),
    );
    expect(await current).toBe('new script');
    expect(await oldSettled).toBeNull();
    expect(runtimeListeners.size).toBe(0);
  });

  it('carries the page-read identity through the background and content script', async () => {
    const {
      handleDevToolsPageMessage,
      handleFetchResourceContentScriptMessage,
    } = require('../background/messageHandlers');
    const originalFetch = global.fetch;
    global.fetch = async () => ({ok: true, text: async () => 'current body'});
    try {
      require('../contentScripts/fileFetcher');
      chrome.tabs = {
        sendMessage: (tabID, message) => {
          Array.from(runtimeListeners).forEach(listener => listener(message));
          return Promise.resolve();
        },
      };
      chrome.runtime.sendMessage = message => {
        if (message.source === 'devtools-page')
          handleDevToolsPageMessage(message);
        else if (
          message.source === 'react-devtools-fetch-resource-content-script'
        )
          handleFetchResourceContentScriptMessage(message);
        else
          Array.from(runtimeListeners).forEach(listener => listener(message));
      };
      const messages = [];
      runtimeListeners.add(message => messages.push(message));
      await expect(
        fetchFileWithCaching('https://example.com/app.js'),
      ).resolves.toBe('current body');
      const request = messages.find(
        message => message.source === 'devtools-page',
      );
      const reply = messages.find(
        message => message.source === 'react-devtools-background',
      );
      expect(request.payload.requestID).toEqual(expect.any(String));
      expect(reply.payload.requestID).toBe(request.payload.requestID);
    } finally {
      global.fetch = originalFetch;
    }
  });
  it('falls back to debugger resources when the content script is unavailable', async () => {
    const {
      handleDevToolsPageMessage,
    } = require('../background/messageHandlers');
    chrome.tabs = {sendMessage: () => Promise.reject(new Error('No receiver'))};
    chrome.runtime.sendMessage = message => {
      if (message.source === 'devtools-page')
        handleDevToolsPageMessage(message);
      else Array.from(runtimeListeners).forEach(listener => listener(message));
    };
    resources = [
      {
        url: 'https://example.com/app.js',
        getContent: callback => callback('debugger source'),
      },
    ];
    await expect(
      fetchFileWithCaching('https://example.com/app.js'),
    ).resolves.toBe('debugger source');
    expect(runtimeListeners.size).toBe(0);
  });

  it('bounds page reads without replies and removes their listeners', async () => {
    jest.useFakeTimers();
    resources = [
      {
        url: 'https://example.com/app.js',
        getContent: callback => callback('debugger source'),
      },
    ];
    const task = fetchFileWithCaching('https://example.com/app.js');
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(runtimeListeners.size).toBe(1);
    jest.advanceTimersByTime(5000);
    await expect(task).resolves.toBe('debugger source');
    expect(runtimeListeners.size).toBe(0);
  });
});
