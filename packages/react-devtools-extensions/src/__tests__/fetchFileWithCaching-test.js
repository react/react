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

  it('should share pending lookups between concurrent fetches', async () => {
    global.__IS_CHROME__ = true;
    setUp({
      resources: [
        {
          url: 'http://localhost:3000/a.js',
          type: 'script',
          getContent: cb => cb('// a.js'),
        },
      ],
      harEntries: [
        {
          request: {url: 'http://localhost:3000/b.js'},
          getContent: cb => cb('// b.js'),
        },
        {
          request: {url: 'http://localhost:3000/c.js'},
          getContent: cb => cb('// c.js'),
        },
      ],
    });

    expect(
      await Promise.all([
        fetchFileWithCaching('http://localhost:3000/a.js'),
        fetchFileWithCaching('http://localhost:3000/b.js'),
        fetchFileWithCaching('http://localhost:3000/c.js'),
      ]),
    ).toEqual(['// a.js', '// b.js', '// c.js']);
    expect(chrome.devtools.inspectedWindow.getResources).toHaveBeenCalledTimes(
      1,
    );
    expect(chrome.devtools.network.getHAR).toHaveBeenCalledTimes(1);

    // Later fetches see an up-to-date list.
    await fetchFileWithCaching('http://localhost:3000/a.js');
    expect(chrome.devtools.inspectedWindow.getResources).toHaveBeenCalledTimes(
      2,
    );
  });
});
