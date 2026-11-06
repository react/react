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
  StackTraceView,
  StackTraceGroup,
  useInferredName,
  beginSourceSelection,
  clearSourceCaches;

beforeEach(() => {
  jest.resetModules();
  jest.useRealTimers();
  jest.doMock('scheduler', () => jest.requireActual('scheduler'));
  jest.doMock('../devtools/views/Components/TreeContext', () => ({
    TreeStateContext: require('react').createContext({inspectedElementID: 1}),
  }));
  // Opening Chrome resources and native tooltip positioning are external boundaries.
  jest.doMock('../devtools/views/useOpenResource', () => () => [
    false,
    () => {},
  ]);
  jest.doMock(
    '../devtools/views/Components/reach-ui/tooltip',
    () =>
      ({children}) =>
        children,
  );
  jest.doMock('../devtools/views/Components/StackTraceView.css', () => ({
    CallSite: 'CallSite',
    IgnoredCallSite: 'IgnoredCallSite',
    ElementBadges: 'ElementBadges',
  }));
  React = require('react');
  ({createRoot} = require('react-dom/client'));
  ({flushSync} = require('react-dom'));
  FetchContext =
    require('../devtools/views/Components/FetchFileWithCachingContext').default;
  ({TreeStateContext} = require('../devtools/views/Components/TreeContext'));
  StackTraceView =
    require('../devtools/views/Components/StackTraceView').default;
  StackTraceGroup =
    require('../devtools/views/Components/StackTraceGroup').default;
  useInferredName = require('../devtools/views/useInferredName').default;
  ({beginSourceSelection, clearSourceCaches} = require('../symbolicateSource'));
});

const wait = () => new Promise(resolve => setTimeout(resolve, 20));
async function eventually(assertion) {
  let error;
  for (let i = 0; i < 60; i++) {
    try {
      assertion();
      return;
    } catch (e) {
      error = e;
    }
    await wait();
  }
  throw error;
}
const frame = (name, file) => [name, 'https://example.com/' + file, 1, 1];
const sourceMap = (name, ignored = false) =>
  JSON.stringify({
    version: 3,
    sources: ['original.js'],
    names: [name],
    mappings: 'AAAAA',
    ignoreList: ignored ? [0] : [],
  });
const script = 'a();\n//# sourceMappingURL=app.map';
function Name({stack}) {
  const name = useInferredName({
    awaited: {name: 'Promise', stack},
    stack: null,
  });
  return <div>{name}</div>;
}

describe('source enrichment without UI suspension', () => {
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
  const render = (children, fetch, id = 1) => {
    beginSourceSelection(fetch, id);
    flushSync(() =>
      root.render(
        <FetchContext.Provider value={fetch}>
          <TreeStateContext.Provider value={{inspectedElementID: id}}>
            <React.Suspense fallback={<div>waiting for source</div>}>
              {children}
            </React.Suspense>
          </TreeStateContext.Provider>
        </FetchContext.Provider>,
      ),
    );
  };
  it('renders raw frames immediately while map contents are pending', async () => {
    let release;
    const pending = new Promise(resolve => {
      release = resolve;
    });
    const fetch = async url => (url.endsWith('.map') ? pending : script);
    render(
      <StackTraceView
        stack={[frame('raw', 'app.js')]}
        environmentName={null}
        showIgnoreList={false}
      />,
      fetch,
    );
    expect(container.textContent).toContain('raw @ app.js:1');
    expect(container.textContent).not.toContain('waiting for source');
    release(sourceMap('mapped'));
    await eventually(() =>
      expect(container.textContent).toContain('raw @ original.js:1'),
    );
  });
  it('infers the final library call before the first nonignored frame', async () => {
    const stack = [
      frame('raw', 'internal1.js'),
      frame('loadData', 'internal2.js'),
      frame('caller', 'app.js'),
    ];
    render(<Name stack={stack} />, async url =>
      url.endsWith('.map')
        ? sourceMap('', url.includes('internal'))
        : 'a();\n//# sourceMappingURL=' +
          url.split('/').pop().replace('.js', '.map'),
    );
    expect(container.textContent).toBe('raw');
    await eventually(() => expect(container.textContent).toBe('loadData'));
  });
  it('keeps the environment badge on the final nonignored frame', async () => {
    const stack = [
      frame('app', 'app.js'),
      frame('library', 'lib.js'),
      ['', '', 0, 0],
    ];
    render(
      <StackTraceView
        stack={stack}
        environmentName="Server"
        showIgnoreList={false}
      />,
      async url => {
        if (url === '') return null;
        if (url.endsWith('.map'))
          return sourceMap(
            url.includes('lib') ? 'libraryMapped' : 'appMapped',
            url.includes('lib'),
          );
        return (
          'a();\n//# sourceMappingURL=' +
          (url.includes('lib') ? 'lib.map' : 'app.map')
        );
      },
    );
    await eventually(() => {
      const badge = Array.from(
        container.querySelectorAll('.ElementBadges'),
      ).find(node => node.textContent === 'Server');
      expect(badge).toBeDefined();
      expect(badge.parentElement.textContent).toContain('app @ original.js');
    });
  });
  function Group({stack, onRender}) {
    const stacks = React.useMemo(() => [stack], [stack]);
    return (
      <StackTraceGroup stacks={stacks}>
        {showIgnoreList => {
          if (onRender) onRender();
          return (
            <StackTraceView
              stack={stack}
              environmentName="Server"
              showIgnoreList={showIgnoreList}
            />
          );
        }}
      </StackTraceGroup>
    );
  }
  it('adds the ignore toggle after parsing and toggles hidden frames', async () => {
    let release;
    const pending = new Promise(resolve => {
      release = resolve;
    });
    const stack = [frame('library', 'app.js')];
    render(<Group stack={stack} />, async url =>
      url.endsWith('.map') ? pending : script,
    );
    expect(container.textContent).toContain('library @ app.js:1');
    expect(container.querySelector('button')).toBeNull();
    release(sourceMap('', true));
    await eventually(() =>
      expect(container.querySelector('button').textContent).toBe(
        'Show ignore-listed frames',
      ),
    );
    const row = container.querySelector('.IgnoredCallSite');
    expect(row.classList.contains('CallSite')).toBe(false);
    flushSync(() => container.querySelector('button').click());
    expect(container.querySelector('button').textContent).toBe(
      'Hide ignore-listed frames',
    );
    expect(
      container
        .querySelector('.IgnoredCallSite')
        .classList.contains('CallSite'),
    ).toBe(true);
  });
  it('never applies a delayed result from a previous selection', async () => {
    let release;
    const pending = new Promise(resolve => {
      release = resolve;
    });
    const fetch = async url =>
      url.endsWith('old.js')
        ? pending
        : url.endsWith('.map')
          ? sourceMap('')
          : script;
    render(<Group stack={[frame('old', 'old.js')]} />, fetch, 1);
    await wait();
    render(<Group stack={[frame('new', 'new.js')]} />, fetch, 2);
    expect(container.textContent).toContain('new @ new.js:1');
    await eventually(() =>
      expect(container.textContent).toContain('new @ original.js:1'),
    );
    release(script);
    await wait();
    expect(container.textContent).not.toContain('old @');
  });
  it('coalesces repeated successful frames into one group update', async () => {
    let renders = 0;
    const stack = Array.from({length: 100}, () => frame('raw', 'app.js'));
    render(<Group stack={stack} onRender={() => renders++} />, async url =>
      url.endsWith('.map') ? sourceMap('') : script,
    );
    const initial = renders;
    await eventually(() =>
      expect(container.textContent).toContain('original.js:1'),
    );
    expect(container.querySelectorAll('.CallSite')).toHaveLength(100);
    expect(renders - initial).toBe(1);
  });
  it('does not repaint a long group for dropped or failed frames', async () => {
    let renders = 0;
    const stack = Array.from({length: 100}, (_, i) =>
      frame('raw', 'file' + i + '.js'),
    );
    render(
      <Group stack={stack} onRender={() => renders++} />,
      async () => null,
    );
    const initial = renders;
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(container.querySelectorAll('.CallSite')).toHaveLength(100);
    expect(renders).toBe(initial);
  });
  it('refreshes the group after a source edit without reselecting it', async () => {
    let original = 'first.js';
    const fetch = async url =>
      url.endsWith('.map')
        ? JSON.stringify({
            version: 3,
            sources: [original],
            names: [],
            mappings: 'AAAA',
          })
        : script;
    render(<Group stack={[frame('raw', 'app.js')]} />, fetch);
    await eventually(() =>
      expect(container.textContent).toContain('first.js:1'),
    );
    original = 'edited.js';
    flushSync(() => clearSourceCaches());
    expect(container.textContent).toContain('app.js:1');
    await eventually(() =>
      expect(container.textContent).toContain('edited.js:1'),
    );
  });
});
