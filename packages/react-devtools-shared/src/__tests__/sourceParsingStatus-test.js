/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

let React,
  createRoot,
  flushSync,
  SourceParsingStatus,
  FetchContext,
  TreeStateContext,
  beginSourceSelection,
  clearSourceCaches,
  symbolicateSourceWithCache;

beforeEach(() => {
  jest.resetModules();
  jest.useRealTimers();
  jest.doMock('scheduler', () => jest.requireActual('scheduler'));
  jest.doMock('../devtools/views/Components/TreeContext', () => ({
    TreeStateContext: require('react').createContext({inspectedElementID: 1}),
  }));
  React = require('react');
  ({createRoot} = require('react-dom/client'));
  ({flushSync} = require('react-dom'));
  SourceParsingStatus =
    require('../devtools/views/Components/SourceParsingStatus').default;
  FetchContext =
    require('../devtools/views/Components/FetchFileWithCachingContext').default;
  ({TreeStateContext} = require('../devtools/views/Components/TreeContext'));
  ({
    beginSourceSelection,
    clearSourceCaches,
    symbolicateSourceWithCache,
  } = require('../symbolicateSource'));
});

const wait = () => new Promise(resolve => setTimeout(resolve, 20));
const deferred = () => {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return {promise, resolve};
};
const script = 'a();\n//# sourceMappingURL=app.map';
const map = JSON.stringify({
  version: 3,
  sources: ['original.js'],
  names: [],
  mappings: 'AAAA',
});
async function eventually(check) {
  let error;
  for (let i = 0; i < 60; i++) {
    try {
      check();
      return;
    } catch (e) {
      error = e;
    }
    await wait();
  }
  throw error;
}

describe('source parsing status indicator', () => {
  let root, container;
  beforeEach(() => {
    clearSourceCaches();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    clearSourceCaches();
  });
  const render = (fetch, id = 1) =>
    flushSync(() =>
      root.render(
        <FetchContext.Provider value={fetch}>
          <TreeStateContext.Provider value={{inspectedElementID: id}}>
            <SourceParsingStatus />
          </TreeStateContext.Provider>
        </FetchContext.Provider>,
      ),
    );
  it('shows pending while reading and complete only after mapping settles', async () => {
    const gate = deferred();
    const fetch = async url => (url.endsWith('.map') ? gate.promise : script);
    beginSourceSelection(fetch, 1);
    render(fetch);
    const task = symbolicateSourceWithCache(
      fetch,
      'https://example.com/app.js',
      1,
      1,
    );
    await eventually(() =>
      expect(container.textContent).toBe('Resolving source maps · 1 remaining'),
    );
    gate.resolve(map);
    await task;
    await eventually(() =>
      expect(container.textContent).toBe('Source parsing complete'),
    );
  });
  it('keeps unavailable mappings visible as raw positions after completion', async () => {
    const fetch = async () => null;
    beginSourceSelection(fetch, 1);
    render(fetch);
    await symbolicateSourceWithCache(
      fetch,
      'https://example.com/no-map.js',
      1,
      1,
    );
    await eventually(() =>
      expect(container.textContent).toBe(
        'Source parsing complete · 1 unmapped/skipped attempts',
      ),
    );
  });
  it('counts overflow and explains it without falsely claiming a successful map', async () => {
    const gate = deferred();
    const fetch = async url => (url.endsWith('.map') ? map : gate.promise);
    beginSourceSelection(fetch, 1);
    render(fetch);
    const tasks = Array.from({length: 40}, (_, i) =>
      symbolicateSourceWithCache(
        fetch,
        'https://example.com/' + i + '.js',
        1,
        1,
      ),
    );
    await eventually(() =>
      expect(container.textContent).toContain('Resolving source maps'),
    );
    gate.resolve(script);
    await Promise.all(tasks);
    await eventually(() =>
      expect(container.textContent).toBe(
        'Source parsing complete · 7 unmapped/skipped attempts',
      ),
    );
    expect(container.firstChild.title).toContain('Queue overflow attempts: 7');
  });
  it('does not display an obsolete selection completion over a new pending selection', async () => {
    const oldGate = deferred();
    const newGate = deferred();
    const fetch = async url =>
      url.endsWith('.map')
        ? map
        : url.endsWith('old.js')
          ? oldGate.promise
          : newGate.promise;
    beginSourceSelection(fetch, 1);
    render(fetch);
    const old = symbolicateSourceWithCache(
      fetch,
      'https://example.com/old.js',
      1,
      1,
    );
    await wait();
    beginSourceSelection(fetch, 2);
    render(fetch, 2);
    const current = symbolicateSourceWithCache(
      fetch,
      'https://example.com/new.js',
      1,
      1,
    );
    oldGate.resolve(script);
    await old;
    await eventually(() =>
      expect(container.textContent).toBe('Resolving source maps · 1 remaining'),
    );
    newGate.resolve(script);
    await current;
    await eventually(() =>
      expect(container.textContent).toBe('Source parsing complete'),
    );
  });
  it('restarts progress after invalidation and reports cached results without new pending work', async () => {
    let gate = null;
    const fetch = async url =>
      url.endsWith('.map') ? (gate === null ? map : gate.promise) : script;
    beginSourceSelection(fetch, 1);
    render(fetch);
    await symbolicateSourceWithCache(fetch, 'https://example.com/app.js', 1, 1);
    await eventually(() =>
      expect(container.textContent).toBe('Source parsing complete'),
    );
    await symbolicateSourceWithCache(fetch, 'https://example.com/app.js', 1, 1);
    expect(container.textContent).toBe('Source parsing complete');
    gate = deferred();
    clearSourceCaches();
    const task = symbolicateSourceWithCache(
      fetch,
      'https://example.com/app.js',
      1,
      1,
    );
    await eventually(() =>
      expect(container.textContent).toBe('Resolving source maps · 1 remaining'),
    );
    gate.resolve(map);
    await task;
    await eventually(() =>
      expect(container.textContent).toBe('Source parsing complete'),
    );
  });
  it('does not label a frontend without a reader as successfully completed', () => {
    render(null);
    expect(container.textContent).toBe('Source parsing unavailable');
  });
  it('labels priority rescue failures as task attempts rather than remaining raw frames', async () => {
    const gate = deferred();
    const fetch = async url => (url.endsWith('.map') ? map : gate.promise);
    beginSourceSelection(fetch, 1);
    render(fetch);
    const tasks = Array.from({length: 40}, (_, i) =>
      symbolicateSourceWithCache(
        fetch,
        'https://example.com/' + i + '.js',
        1,
        1,
      ),
    );
    tasks.push(
      symbolicateSourceWithCache(
        fetch,
        'https://example.com/39.js',
        1,
        1,
        true,
      ),
    );
    gate.resolve(script);
    await Promise.all(tasks);
    await eventually(() =>
      expect(container.textContent).toBe(
        'Source parsing complete · 8 unmapped/skipped attempts',
      ),
    );
    expect(container.firstChild.title).toContain(
      'Retries at the same position count as separate attempts',
    );
  });
  it('describes an earlier failed attempt honestly after a successful retry', async () => {
    let available = false;
    const fetch = async url =>
      url.endsWith('.map') ? map : available ? script : null;
    beginSourceSelection(fetch, 1);
    render(fetch);
    await symbolicateSourceWithCache(fetch, 'https://example.com/app.js', 1, 1);
    available = true;
    const result = await symbolicateSourceWithCache(
      fetch,
      'https://example.com/app.js',
      1,
      1,
    );
    expect(result.location[1]).toBe('https://example.com/original.js');
    await eventually(() =>
      expect(container.textContent).toBe(
        'Source parsing complete · 1 unmapped/skipped attempts',
      ),
    );
    expect(container.firstChild.title).toContain('Mapped attempts: 1');
  });
});
