/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('fetchFileWithCaching', () => {
  let chrome;
  let fetchFileWithCaching;

  function createChrome({harEntries = []}: {harEntries?: Array<Object>}) {
    return {
      runtime: {
        onMessage: {addListener: jest.fn(), removeListener: jest.fn()},
        sendMessage: jest.fn(),
      },
      devtools: {
        inspectedWindow: {tabId: 1, getResources: jest.fn(cb => cb([]))},
        network: {getHAR: jest.fn(cb => cb({entries: harEntries}))},
      },
    };
  }

  function setUp(options: {harEntries?: Array<Object>}) {
    jest.resetModules();
    chrome = createChrome(options);
    global.chrome = chrome;
    fetchFileWithCaching =
      require('react-devtools-extensions/src/main/fetchFileWithCaching').default;
  }

  afterEach(() => {
    delete global.chrome;
  });

  it('should not fetch from the page when the file is in the HAR', async () => {
    setUp({
      harEntries: [
        {
          request: {url: 'http://localhost:3000/main.js'},
          getContent: cb => cb('// main.js'),
        },
      ],
    });

    expect(await fetchFileWithCaching('http://localhost:3000/main.js')).toBe(
      '// main.js',
    );
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('should fetch from the page when the file is not in the HAR', async () => {
    setUp({harEntries: []});

    void fetchFileWithCaching('http://localhost:3000/main.js');
    await Promise.resolve();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      source: 'devtools-page',
      payload: {
        type: 'fetch-file-with-cache',
        tabId: 1,
        url: 'http://localhost:3000/main.js',
      },
    });
  });
});
