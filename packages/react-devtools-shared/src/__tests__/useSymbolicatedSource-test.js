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
  FetchContext,
  TreeStateContext,
  useSymbolicatedSource,
  beginSourceSelection,
  clearSourceCaches;

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
  FetchContext =
    require('../devtools/views/Components/FetchFileWithCachingContext').default;
  ({TreeStateContext} = require('../devtools/views/Components/TreeContext'));
  useSymbolicatedSource =
    require('../devtools/views/Components/useSymbolicatedSource').default;
  ({beginSourceSelection, clearSourceCaches} = require('../symbolicateSource'));
});

const wait = () => new Promise(resolve => setTimeout(resolve, 20));

describe('non-suspending source links', () => {
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
  function View({source}) {
    const mapped = useSymbolicatedSource(source);
    return (
      <div>rendered by: {mapped === null ? source[1] : mapped.location[1]}</div>
    );
  }
  const map = name =>
    JSON.stringify({version: 3, sources: [name], names: [], mappings: 'AAAA'});
  const script = 'a();\n//# sourceMappingURL=app.map';
  const render = (source, fetch, id) => {
    beginSourceSelection(fetch, id);
    flushSync(() =>
      root.render(
        <FetchContext.Provider value={fetch}>
          <TreeStateContext.Provider value={{inspectedElementID: id}}>
            <View source={source} />
          </TreeStateContext.Provider>
        </FetchContext.Provider>,
      ),
    );
  };
  it('shows the original frame immediately and updates it after parsing', async () => {
    let release;
    const pending = new Promise(r => {
      release = r;
    });
    const fetch = async url => (url.endsWith('.map') ? pending : script);
    render(['a', 'https://example.com/app.js', 1, 1], fetch, 1);
    expect(container.textContent).toBe(
      'rendered by: https://example.com/app.js',
    );
    release(map('original.js'));
    await wait();
    expect(container.textContent).toBe(
      'rendered by: https://example.com/original.js',
    );
  });
  it('refreshes an unchanged frame after source caches invalidate', async () => {
    let original = 'first.js';
    const fetch = async url => (url.endsWith('.map') ? map(original) : script);
    render(['a', 'https://example.com/app.js', 1, 1], fetch, 1);
    await wait();
    expect(container.textContent).toBe(
      'rendered by: https://example.com/first.js',
    );
    original = 'edited.js';
    flushSync(() => clearSourceCaches());
    await wait();
    expect(container.textContent).toBe(
      'rendered by: https://example.com/edited.js',
    );
  });
  it('keeps the new component visible when an old parse finishes later', async () => {
    let release;
    const pending = new Promise(r => {
      release = r;
    });
    const fetch = async url =>
      url === 'https://example.com/old.js'
        ? pending
        : url.endsWith('.map')
          ? map('new-original.js')
          : script;
    render(['a', 'https://example.com/old.js', 1, 1], fetch, 1);
    await wait();
    render(['b', 'https://example.com/new.js', 1, 1], fetch, 2);
    expect(container.textContent).toBe(
      'rendered by: https://example.com/new.js',
    );
    await wait();
    release(script);
    await wait();
    expect(container.textContent).toBe(
      'rendered by: https://example.com/new-original.js',
    );
  });
  it('does not repaint a long raw stack for null or dropped results', async () => {
    const fetch = async () => null;
    let renders = 0;
    function Frame({index}) {
      const source = [
        'frame',
        'https://example.com/file' + index + '.js',
        1,
        1,
      ];
      const mapped = useSymbolicatedSource(source);
      renders++;
      return <span>{mapped === null ? source[1] : mapped.location[1]}</span>;
    }
    beginSourceSelection(fetch, 1);
    flushSync(() =>
      root.render(
        <FetchContext.Provider value={fetch}>
          <TreeStateContext.Provider value={{inspectedElementID: 1}}>
            {Array.from({length: 100}, (_, index) => (
              <Frame key={index} index={index} />
            ))}
          </TreeStateContext.Provider>
        </FetchContext.Provider>,
      ),
    );
    const initialRenders = renders;
    await wait();
    expect(container.querySelectorAll('span')).toHaveLength(100);
    expect(renders).toBe(initialRenders);
  });
});
