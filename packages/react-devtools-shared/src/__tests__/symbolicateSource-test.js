/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {encode} from '@jridgewell/sourcemap-codec';

global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Generated line 1, column 1 maps to original line 5, column 3, and
// generated line 2, column 5 maps to original line 10, column 6 (all 1-based).
function createSourceMap(sources: Array<string>) {
  return {
    version: 3,
    sources,
    names: [],
    // [generatedColumn, sourceIndex, originalLine, originalColumn], 0-based
    mappings: encode([[[0, 0, 4, 2]], [[4, 0, 9, 5]]]),
  };
}

function toDataURL(sourceMap: Object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(sourceMap));
  return 'data:application/json;base64,' + btoa(String.fromCharCode(...bytes));
}

function createScript(sourceMappingURL: string): string {
  return `const a = 1;\nfoo(a);\n//# sourceMappingURL=${sourceMappingURL}`;
}

// Serves files by URL. Like the extension, it can also "fetch" data: URLs.
function createFetchFileWithCaching(files: {[url: string]: string}) {
  return jest.fn((url: string) => {
    if (url.startsWith('data:')) {
      return Promise.resolve(atob(url.slice(url.indexOf(',') + 1)));
    }
    if (files[url] !== undefined) {
      return Promise.resolve(files[url]);
    }
    return Promise.reject(new Error(`Not found: ${url}`));
  });
}

describe('symbolicateSource', () => {
  let preloadSymbolicatedStack;
  let symbolicateSource;
  let symbolicateSourceWithCache;

  beforeEach(() => {
    jest.resetModules();
    ({
      preloadSymbolicatedStack,
      symbolicateSource,
      symbolicateSourceWithCache,
    } = require('react-devtools-shared/src/symbolicateSource'));
  });

  it('should resolve relative sources against the source map URL', async () => {
    const fetchFileWithCaching = createFetchFileWithCaching({
      'http://localhost:3000/assets/index.js': createScript('index.js.map'),
      'http://localhost:3000/assets/index.js.map': JSON.stringify(
        createSourceMap(['../src/App.tsx']),
      ),
    });

    expect(
      await symbolicateSource(
        fetchFileWithCaching,
        'http://localhost:3000/assets/index.js',
        2,
        5,
      ),
    ).toEqual({
      location: ['', 'http://localhost:3000/src/App.tsx', 10, 6],
      ignored: false,
    });
  });

  it('should resolve relative sources of inline source maps against the script URL', async () => {
    // This is how Vite serves modules in development.
    const fetchFileWithCaching = createFetchFileWithCaching({
      'http://localhost:3000/src/App.tsx': createScript(
        toDataURL(createSourceMap(['App.tsx'])),
      ),
    });

    expect(
      await symbolicateSource(
        fetchFileWithCaching,
        'http://localhost:3000/src/App.tsx',
        2,
        5,
      ),
    ).toEqual({
      location: ['', 'http://localhost:3000/src/App.tsx', 10, 6],
      ignored: false,
    });
  });

  it('should decode inline source maps instead of fetching them', async () => {
    const fetchFileWithCaching = createFetchFileWithCaching({
      'http://localhost:3000/src/App.tsx': createScript(
        toDataURL(createSourceMap(['App.tsx'])),
      ),
    });

    await symbolicateSource(
      fetchFileWithCaching,
      'http://localhost:3000/src/App.tsx',
      2,
      5,
    );

    expect(fetchFileWithCaching.mock.calls).toEqual([
      ['http://localhost:3000/src/App.tsx'],
    ]);
  });

  it('should decode UTF-8 in inline source maps', async () => {
    const fetchFileWithCaching = createFetchFileWithCaching({
      'http://localhost:3000/src/App.tsx': createScript(
        toDataURL(createSourceMap(['Ünïcødé.tsx'])),
      ),
    });

    expect(
      await symbolicateSource(
        fetchFileWithCaching,
        'http://localhost:3000/src/App.tsx',
        2,
        5,
      ),
    ).toEqual({
      location: [
        '',
        new URL('Ünïcødé.tsx', 'http://localhost:3000/src/').toString(),
        10,
        6,
      ],
      ignored: false,
    });
  });

  it('should fetch and parse a file once for all of its frames', async () => {
    const fetchFileWithCaching = createFetchFileWithCaching({
      'http://localhost:3000/assets/index.js': createScript('index.js.map'),
      'http://localhost:3000/assets/index.js.map': JSON.stringify(
        createSourceMap(['../src/App.tsx']),
      ),
    });

    expect(
      await Promise.all([
        symbolicateSourceWithCache(
          fetchFileWithCaching,
          'http://localhost:3000/assets/index.js',
          1,
          1,
        ),
        symbolicateSourceWithCache(
          fetchFileWithCaching,
          'http://localhost:3000/assets/index.js',
          2,
          5,
        ),
      ]),
    ).toEqual([
      {
        location: ['', 'http://localhost:3000/src/App.tsx', 5, 3],
        ignored: false,
      },
      {
        location: ['', 'http://localhost:3000/src/App.tsx', 10, 6],
        ignored: false,
      },
    ]);
    expect(fetchFileWithCaching.mock.calls).toEqual([
      ['http://localhost:3000/assets/index.js'],
      ['http://localhost:3000/assets/index.js.map'],
    ]);
  });

  it('should start loading every file of a preloaded stack at once', () => {
    const fetchFileWithCaching = createFetchFileWithCaching({});

    preloadSymbolicatedStack(fetchFileWithCaching, [
      ['a', 'http://localhost:3000/a.js', 1, 1, 0, 0, false],
      ['b', 'http://localhost:3000/b.js', 1, 1, 0, 0, false],
      ['c', 'http://localhost:3000/a.js', 2, 5, 0, 0, false],
    ]);

    expect(fetchFileWithCaching.mock.calls).toEqual([
      ['http://localhost:3000/a.js'],
      ['http://localhost:3000/b.js'],
    ]);
  });
});
