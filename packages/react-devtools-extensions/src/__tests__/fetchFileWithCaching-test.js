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

  type Options = {
    harEntries?: Array<Object>,
    resources?: Array<Object>,
  };

  function createChrome({harEntries = [], resources = []}: Options) {
    return {
      runtime: {
        onMessage: {addListener: jest.fn(), removeListener: jest.fn()},
        sendMessage: jest.fn(),
      },
      devtools: {
        inspectedWindow: {
          tabId: 1,
          getResources: jest.fn(cb => cb(resources)),
        },
        network: {getHAR: jest.fn(cb => cb({entries: harEntries}))},
      },
    };
  }

  function setUp(options: Options) {
    jest.resetModules();
    chrome = createChrome(options);
    global.chrome = chrome;
    fetchFileWithCaching =
      require('react-devtools-extensions/src/main/fetchFileWithCaching').default;
  }

  afterEach(() => {
    delete global.chrome;
    global.__IS_CHROME__ = false;
  });

  it('should read scripts from the page resources', async () => {
    global.__IS_CHROME__ = true;
    setUp({
      resources: [
        {
          url: 'http://localhost:3000/main.js',
          type: 'script',
          getContent: cb => cb('// main.js'),
        },
      ],
    });

    expect(await fetchFileWithCaching('http://localhost:3000/main.js')).toBe(
      '// main.js',
    );
    expect(chrome.devtools.network.getHAR).not.toHaveBeenCalled();
  });

  it('should not read source-mapped originals from the page resources', async () => {
    global.__IS_CHROME__ = true;
    setUp({
      resources: [
        {
          url: 'http://localhost:3000/src/App.tsx',
          type: 'sm-script',
          getContent: cb => cb('export default function App() {}'),
        },
      ],
      harEntries: [
        {
          request: {url: 'http://localhost:3000/src/App.tsx'},
          getContent: cb => cb('// compiled App.tsx'),
        },
      ],
    });

    expect(
      await fetchFileWithCaching('http://localhost:3000/src/App.tsx'),
    ).toBe('// compiled App.tsx');
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
