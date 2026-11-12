/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {encode} from '@jridgewell/sourcemap-codec';
import {symbolicateSource} from 'react-devtools-shared/src/symbolicateSource';

// Generated line 2, column 5 maps to original line 10, column 6 (all 1-based).
function createSourceMap(sources: Array<string>) {
  return {
    version: 3,
    sources,
    names: [],
    // [generatedColumn, sourceIndex, originalLine, originalColumn], 0-based
    mappings: encode([[], [[4, 0, 9, 5]]]),
  };
}

function toDataURL(sourceMap: Object): string {
  return 'data:application/json;base64,' + btoa(JSON.stringify(sourceMap));
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
});
