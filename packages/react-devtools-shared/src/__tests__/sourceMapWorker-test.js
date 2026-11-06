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

const mapText = JSON.stringify({
  version: 3,
  sources: ['original.js'],
  names: [],
  mappings: 'AAAA;AACA',
});

describe('source map worker processor', () => {
  let parser;
  beforeEach(() => {
    jest.resetModules();
    parser = require('../sourceMapWorker');
  });
  it('scans script annotations and decodes UTF-8 inline maps', () => {
    const text = JSON.stringify({
      version: 3,
      sources: ['中文.js'],
      names: [],
      mappings: 'AAAA',
    });
    const inline =
      'data:application/json;base64,' + Buffer.from(text).toString('base64');
    const url = parser.getSourceMapURL(
      'https://example.com/app.js',
      'function a(){}\n//# sourceMappingURL=' + inline,
    );
    expect(url).toBe(inline);
    expect(parser.loadSourceMap('a', url)).toBe(true);
    expect(parser.resolveSource('a', 1, 1)).toEqual({
      sourceURL: '中文.js',
      line: 1,
      column: 0,
      ignored: false,
    });
  });
  it('keeps large inline maps inside the worker and returns small metadata', () => {
    const inline = 'data:application/json,' + encodeURIComponent(mapText);
    const result = parser.prepareSourceMap(
      'a',
      'https://example.com/app.js',
      'a();\n//# sourceMappingURL=' + inline,
    );
    expect(result).toEqual({sourceMapURL: 'data:', loaded: true});
    expect(parser.resolveSource('a', 1, 1).sourceURL).toBe('original.js');
  });
  it('scans a data URL script in the worker', () => {
    const script =
      'data:text/javascript;base64,' +
      Buffer.from(
        'a();\n//# sourceMappingURL=https://example.com/app.map',
      ).toString('base64');
    expect(parser.getSourceMapURL(script, script)).toBe(
      'https://example.com/app.map',
    );
  });
  it('handles percent encoded inline maps and external references', () => {
    expect(
      parser.getSourceMapURL(
        'https://example.com/app.js',
        'a();\n//# sourceMappingURL=../app.map',
      ),
    ).toBe('https://example.com/app.map');
    expect(
      parser.loadSourceMap(
        'a',
        'data:application/json,' + encodeURIComponent(mapText),
      ),
    ).toBe(true);
    expect(parser.resolveSource('a', 2, 1).line).toBe(2);
  });
  it('returns no mapping for malformed input and missing annotations', () => {
    expect(parser.getSourceMapURL('bundle.js', 'a();')).toBe(null);
    expect(parser.loadSourceMap('a', '{broken')).toBe(false);
    expect(parser.loadSourceMap('a', 'data:application/json;base64,%%')).toBe(
      false,
    );
    expect(() => parser.resolveSource('missing', 1, 1)).toThrow();
  });
  it('bounds decoded map memory and retains recently used maps', () => {
    for (let i = 0; i < 50; i++) parser.loadSourceMap(String(i), mapText);
    parser.resolveSource('0', 1, 1);
    parser.loadSourceMap('50', mapText);
    expect(parser.resolveSource('0', 1, 1).sourceURL).toBe('original.js');
    expect(() => parser.resolveSource('1', 1, 1)).toThrow();
  });
});

describe('worker symbolication integration', () => {
  let resolver;
  let parser;
  let listeners;
  let broken;
  let gate;
  const scriptURL = 'https://example.com/app.js';
  const files = {
    [scriptURL]:
      'a();\n//# sourceMappingURL=data:application/json,' +
      encodeURIComponent(mapText),
  };
  const fetchFile = async url => {
    if (!(url in files)) throw Error('inline map must not be fetched');
    return files[url];
  };
  beforeEach(() => {
    jest.resetModules();
    resolver = require('../symbolicateSource');
    parser = require('../sourceMapWorker');
    listeners = {};
    broken = false;
    gate = null;
    resolver.setSourceMapWorkerFactory(() => ({
      addEventListener(name, fn) {
        listeners[name] = fn;
      },
      terminate() {},
      async prepareSourceMap(...args) {
        if (gate) await gate;
        if (broken) throw Error('worker failed');
        return parser.prepareSourceMap(...args);
      },
      async loadSourceMap(...args) {
        return parser.loadSourceMap(...args);
      },
      async resolveSource(...args) {
        return parser.resolveSource(...args);
      },
    }));
    resolver.beginSourceSelection(fetchFile, 1);
  });
  it('maps different locations through the processor without fetching inline data', async () => {
    expect(
      (await resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 1, 1))
        .location,
    ).toEqual(['', 'https://example.com/original.js', 1, 1]);
    expect(
      (await resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 2, 1))
        .location[2],
    ).toBe(2);
  });
  it('settles a failed worker and permits a fresh request', async () => {
    broken = true;
    await expect(
      resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 1, 1),
    ).resolves.toBe(null);
    broken = false;
    expect(
      (await resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 1, 1))
        .location[2],
    ).toBe(1);
  });
  it('cancels a worker error or obsolete selection without hanging promises', async () => {
    let release;
    gate = new Promise(r => {
      release = r;
    });
    const old = resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 1, 1);
    await new Promise(resolve => setTimeout(resolve, 0));
    for (let i = 0; i < 12; i++) await Promise.resolve();
    resolver.beginSourceSelection(fetchFile, 2);
    await expect(old).resolves.toBe(null);
    gate = null;
    const current = await resolver.symbolicateSourceWithCache(
      fetchFile,
      scriptURL,
      2,
      1,
    );
    expect(current.location[2]).toBe(2);
    release();
  });
  it('settles requests when the worker crashes', async () => {
    gate = new Promise(() => {});
    const old = resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 1, 1);
    await new Promise(resolve => setTimeout(resolve, 0));
    for (let i = 0; i < 12; i++) await Promise.resolve();
    listeners.error();
    await expect(old).resolves.toBe(null);
  });
  it('preempts obsolete position lookups that may decode indexed sections', async () => {
    let release;
    let delay = false;
    const pending = new Promise(resolve => {
      release = resolve;
    });
    const prepare = jest.fn(async (...args) =>
      parser.prepareSourceMap(...args),
    );
    const terminate = jest.fn();
    const factory = jest.fn(() => ({
      addEventListener() {},
      terminate,
      prepareSourceMap: prepare,
      async resolveSource(...args) {
        if (delay) await pending;
        return parser.resolveSource(...args);
      },
    }));
    resolver.setSourceMapWorkerFactory(factory);
    resolver.beginSourceSelection(fetchFile, 1);
    const first = resolver.symbolicateSourceWithCache(
      fetchFile,
      scriptURL,
      1,
      1,
    );
    await first;
    delay = true;
    const old = resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 2, 1);
    await new Promise(resolve => setTimeout(resolve, 0));
    for (let i = 0; i < 12; i++) await Promise.resolve();
    resolver.beginSourceSelection(fetchFile, 2);
    await expect(old).resolves.toBe(null);
    delay = false;
    const next = resolver.symbolicateSourceWithCache(
      fetchFile,
      scriptURL,
      2,
      1,
    );
    release();
    expect((await next).location[2]).toBe(2);
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(
      resolver.symbolicateSourceWithCache(fetchFile, scriptURL, 1, 1),
    ).toBe(first);
  });
  it('keeps decoded maps alive after an unmappable frame RPC error', async () => {
    const prepare = jest.fn(async (...args) =>
      parser.prepareSourceMap(...args),
    );
    const terminate = jest.fn();
    resolver.setSourceMapWorkerFactory(() => ({
      addEventListener() {},
      terminate,
      prepareSourceMap: prepare,
      async resolveSource(...args) {
        return parser.resolveSource(...args);
      },
    }));
    await resolver.symbolicateSource(fetchFile, scriptURL, 1, 1);
    expect(
      await resolver.symbolicateSource(fetchFile, scriptURL, 999, 1),
    ).toBeNull();
    expect(
      (await resolver.symbolicateSource(fetchFile, scriptURL, 2, 1))
        .location[2],
    ).toBe(2);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(terminate).not.toHaveBeenCalled();
  });

  it('reloads only an evicted map while keeping the worker alive', async () => {
    const prepare = jest.fn(async (...args) =>
      parser.prepareSourceMap(...args),
    );
    const terminate = jest.fn();
    resolver.setSourceMapWorkerFactory(() => ({
      addEventListener() {},
      terminate,
      prepareSourceMap: prepare,
      async resolveSource(...args) {
        return parser.resolveSource(...args);
      },
    }));
    await resolver.symbolicateSource(fetchFile, scriptURL, 1, 1);
    for (let i = 0; i < 50; i++) parser.loadSourceMap('other-' + i, mapText);
    expect(
      await resolver.symbolicateSource(fetchFile, scriptURL, 2, 1),
    ).toBeNull();
    const retried = await resolver.symbolicateSource(
      fetchFile,
      scriptURL,
      2,
      1,
    );
    expect(retried).not.toBeNull();
    expect(retried.location[2]).toBe(2);
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(terminate).not.toHaveBeenCalled();
  });
});

// These tests exercise real asynchronous resource and UI scheduling.
beforeEach(() => jest.useRealTimers());
