/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

describe('symbolicateSource file cache', () => {
  let symbolicateSource;
  let clearSourceCaches;
  let files;
  let fetchFile;
  const scriptURL = 'https://example.com/app.js';
  const mapURL = scriptURL + '.map';
  const makeMap = name =>
    JSON.stringify({
      version: 3,
      sources: [name],
      names: [],
      mappings: 'AAAA;AACA',
    });
  beforeEach(() => {
    jest.resetModules();
    ({symbolicateSource, clearSourceCaches} = require('../symbolicateSource'));
    files = {
      [scriptURL]:
        'function a(){}\nfunction b(){}\n//# sourceMappingURL=app.js.map',
      [mapURL]: makeMap('original.js'),
    };
    fetchFile = jest.fn(async url => files[url]);
  });
  it('reuses file loading and map decoding for different locations', async () => {
    const first = await symbolicateSource(fetchFile, scriptURL, 1, 1);
    const second = await symbolicateSource(fetchFile, scriptURL, 2, 1);
    expect(first.location).toEqual([
      '',
      'https://example.com/original.js',
      1,
      1,
    ]);
    expect(second.location).toEqual([
      '',
      'https://example.com/original.js',
      2,
      1,
    ]);
    expect(fetchFile.mock.calls).toEqual([[scriptURL], [mapURL]]);
  });
  it('reads scripts without maps once across different frame positions', async () => {
    files[scriptURL] = 'function a(){}';
    for (let line = 1; line <= 8; line++) {
      await expect(
        symbolicateSource(fetchFile, scriptURL, line, 1),
      ).resolves.toBeNull();
    }
    expect(fetchFile).toHaveBeenCalledTimes(1);
    files[scriptURL] += '\n//# sourceMappingURL=app.js.map';
    clearSourceCaches();
    expect(
      (await symbolicateSource(fetchFile, scriptURL, 1, 1)).location[1],
    ).toBe('https://example.com/original.js');
  });
  it('shares file loading between concurrent locations', async () => {
    const results = await Promise.all([
      symbolicateSource(fetchFile, scriptURL, 1, 1),
      symbolicateSource(fetchFile, scriptURL, 2, 1),
    ]);
    expect(results.map(r => r.location[2])).toEqual([1, 2]);
    expect(fetchFile.mock.calls).toEqual([[scriptURL], [mapURL]]);
  });
  it('reloads a changed map after cache invalidation', async () => {
    await symbolicateSource(fetchFile, scriptURL, 1, 1);
    files[mapURL] = makeMap('updated.js');
    clearSourceCaches();
    const result = await symbolicateSource(fetchFile, scriptURL, 1, 1);
    expect(result.location[1]).toBe('https://example.com/updated.js');
  });
  it('keeps caches separate for different file providers', async () => {
    await symbolicateSource(fetchFile, scriptURL, 1, 1);
    const otherFetch = async url =>
      url === mapURL ? makeMap('other.js') : files[url];
    const result = await symbolicateSource(otherFetch, scriptURL, 1, 1);
    expect(result.location[1]).toBe('https://example.com/other.js');
  });
  it('retries failed file loads', async () => {
    const script = files[scriptURL];
    delete files[scriptURL];
    await expect(symbolicateSource(fetchFile, scriptURL, 1, 1)).resolves.toBe(
      null,
    );
    files[scriptURL] = script;
    expect(
      (await symbolicateSource(fetchFile, scriptURL, 1, 1)).location[2],
    ).toBe(1);
  });
  it('resolves relative original sources from inline maps against the script URL', async () => {
    const inline =
      'data:application/json;base64,' +
      Buffer.from(makeMap('original.js')).toString('base64');
    files[scriptURL] = 'function a(){}\n//# sourceMappingURL=' + inline;
    files[inline] = makeMap('original.js');
    const result = await symbolicateSource(fetchFile, scriptURL, 1, 1);
    expect(result.location[1]).toBe('https://example.com/original.js');
  });

  it('decodes a shared map once for different frame locations', async () => {
    const consumer = jest.spyOn(
      require('../hooks/SourceMapConsumer'),
      'default',
    );
    await symbolicateSource(fetchFile, scriptURL, 1, 1);
    await symbolicateSource(fetchFile, scriptURL, 2, 1);
    expect(consumer).toHaveBeenCalledTimes(1);
    consumer.mockRestore();
  });
  it.each([
    'app.js.map',
    './app.js.map',
    '/app.js.map',
    'https://example.com/app.js.map',
  ])('preserves external map URL resolution: %s', async annotation => {
    files[scriptURL] = 'function a(){}\n//# sourceMappingURL=' + annotation;
    expect(
      (await symbolicateSource(fetchFile, scriptURL, 1, 1)).location[1],
    ).toBe('https://example.com/original.js');
  });
  it('gracefully handles an invalid base URL and relative map', async () => {
    files['bundle.js'] = 'function a(){}\n//# sourceMappingURL=bundle.js.map';
    await expect(symbolicateSource(fetchFile, 'bundle.js', 1, 1)).resolves.toBe(
      null,
    );
  });
  it('resolves an absolute map even when the script base URL is invalid', async () => {
    files['bundle.js'] =
      'function a(){}\n//# sourceMappingURL=https://example.com/app.js.map';
    expect(
      (await symbolicateSource(fetchFile, 'bundle.js', 1, 1)).location[1],
    ).toBe('https://example.com/original.js');
  });
});
