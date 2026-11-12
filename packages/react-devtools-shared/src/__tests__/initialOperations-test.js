/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let hook;
let packets;
let roots;
let containers;
let shutdown;

function initialize(profiling = false) {
  const {installHook} = require('react-devtools-shared/src/hook');
  const {
    getDefaultComponentFilters,
  } = require('react-devtools-shared/src/utils');
  hook = installHook(global, getDefaultComponentFilters(), null, profiling);
  packets = [];
  hook.on('operations', packet => packets.push(packet));
  React = require('react');
  ReactDOM = require('react-dom');
  ReactDOMClient = require('react-dom/client');
}

function createRoot() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = ReactDOMClient.createRoot(container);
  roots.push(root);
  return {root, container};
}

function render(root, element) {
  React.act(() => ReactDOM.flushSync(() => root.render(element)));
}

function getRenderer() {
  return hook.rendererInterfaces.get(1);
}

beforeEach(() => {
  // The shared setup connects a frontend. This suite exercises the earlier
  // lifecycle where the hook is installed but no frontend has connected yet.
  if (global.agent != null) {
    global.agent.emit('shutdown');
  }
  delete global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  jest.resetModules();
  global.__TEST__ = true;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  roots = [];
  containers = [];
  shutdown = null;
});

afterEach(() => {
  React.act(() => roots.forEach(root => root.unmount()));
  containers.forEach(container => container.remove());
  if (shutdown !== null) {
    shutdown();
  }
  delete global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
});

[10, 100].forEach(commits => {
  // @reactVersion >= 19.0
  it(`sends only the current tree after ${commits} commits before connection`, () => {
    initialize();
    const {root, container} = createRoot();
    function Child({value}) {
      return <span>{value}</span>;
    }
    for (let i = 0; i < commits; i++) {
      render(root, <Child key={i} value={i} />);
    }
    expect(container.textContent).toBe(String(commits - 1));
    expect(packets).toHaveLength(0);
    getRenderer().flushInitialOperations();
    expect(packets).toHaveLength(1);
    render(root, <Child key="next" value="next" />);
    expect(packets).toHaveLength(2);
  });
});

// @reactVersion >= 19.0
it('does not replay roots that unmounted before connection', () => {
  initialize();
  const {root} = createRoot();
  render(root, <span />);
  React.act(() => root.unmount());
  roots = [];
  getRenderer().flushInitialOperations();
  expect(packets).toHaveLength(0);
});

// @reactVersion >= 19.0
it('sends the current tree for each live root', () => {
  initialize();
  const first = createRoot();
  const second = createRoot();
  function Child() {
    return <span />;
  }
  for (let i = 0; i < 10; i++) {
    render(first.root, <Child key={i} />);
    render(second.root, <Child key={i} />);
  }
  getRenderer().flushInitialOperations();
  expect(packets).toHaveLength(2);
  render(first.root, <Child key="next" />);
  render(second.root, <Child key="next" />);
  expect(packets).toHaveLength(4);
});

// @reactVersion >= 19.0
it('keeps all commits when profiling starts before the first commit', () => {
  initialize(true);
  const {root} = createRoot();
  function Child() {
    return <span />;
  }
  for (let i = 0; i < 5; i++) {
    render(root, <Child key={i} />);
  }
  getRenderer().stopProfiling();
  getRenderer().flushInitialOperations();
  expect(packets).toHaveLength(5);
  const data = getRenderer().getProfilingData();
  expect(data.dataForRoots).toHaveLength(1);
  expect(data.dataForRoots[0].commitData).toHaveLength(5);
});

// @reactVersion >= 19.0
it('snapshots the current tree when profiling starts before connection', () => {
  initialize();
  const {root} = createRoot();
  function Child() {
    return <span />;
  }
  for (let i = 0; i < 10; i++) {
    render(root, <Child key={i} />);
  }
  getRenderer().startProfiling(false);
  for (let i = 0; i < 5; i++) {
    render(root, <Child key={i} />);
  }
  getRenderer().stopProfiling();
  // These operations are needed to bring the frontend from the profiling
  // snapshot to the current tree even though recording has stopped.
  render(root, <Child key="after profiling" />);
  getRenderer().flushInitialOperations();
  expect(packets).toHaveLength(7);
  expect(
    getRenderer().getProfilingData().dataForRoots[0].commitData,
  ).toHaveLength(5);
});

function connect() {
  const Bridge = require('react-devtools-shared/src/bridge').default;
  const Store = require('react-devtools-shared/src/devtools/store').default;
  const Agent = require('react-devtools-shared/src/backend/agent').default;
  const {initBackend} = require('react-devtools-shared/src/backend');
  let listener;
  global.devtoolsJestTestScheduler = callback => setTimeout(callback, 0);
  const bridge = new Bridge({
    listen(callback) {
      listener = callback;
      return () => {};
    },
    send(event, payload) {
      listener({event, payload});
    },
  });
  const store = new Store(bridge);
  const agent = new Agent(bridge);
  shutdown = initBackend(hook, agent, global, false);
  React.act(() => jest.runAllTimers());
  return store;
}

// @reactVersion >= 19.0
it('populates a late frontend Store and keeps subsequent updates consistent', () => {
  initialize();
  const {root} = createRoot();
  function Child() {
    return <span />;
  }
  for (let i = 0; i < 20; i++) {
    render(root, <Child key={i} />);
  }
  const store = connect();
  expect(packets).toHaveLength(1);
  expect(store.roots).toHaveLength(1);
  expect(store.numElements).toBe(1);
  expect(store.getElementAtIndex(0)).toMatchObject({
    displayName: 'Child',
    key: '19',
  });
  render(root, <Child key="next" />);
  React.act(() => jest.runAllTimers());
  expect(store.numElements).toBe(1);
  expect(store.getElementAtIndex(0)).toMatchObject({
    displayName: 'Child',
    key: 'next',
  });
});

// @reactVersion >= 19.0
it('preserves diagnostics captured during render and passive effects before connection', () => {
  initialize();
  const {root} = createRoot();
  function Child() {
    // Exercise the same renderer callbacks invoked by the hook's patched
    // console without depending on console formatting in this lifecycle test.
    getRenderer().onErrorOrWarning('warn', ['render warning']);
    React.useEffect(() => {
      getRenderer().onErrorOrWarning('error', ['passive error']);
    }, []);
    return <span />;
  }
  render(root, <Child />);
  const store = connect();
  expect(store.getElementAtIndex(0).displayName).toBe('Child');
  const id = store.getElementAtIndex(0).id;
  expect(store.getErrorAndWarningCountForElementID(id)).toEqual({
    warningCount: 1,
    errorCount: 1,
  });
  const inspected = getRenderer().inspectElement(1, id, null, true);
  expect(inspected.value.warnings).toEqual([['render warning', 1]]);
  expect(inspected.value.errors).toEqual([['passive error', 1]]);
});

// @reactVersion >= 19.0
it('does not mount a root with no children until it renders visible content', () => {
  initialize();
  const {root} = createRoot();
  render(root, <></>);
  const store = connect();
  expect(store.roots).toHaveLength(0);
  function Child() {
    return <span />;
  }
  render(root, <Child />);
  React.act(() => jest.runAllTimers());
  expect(store.numElements).toBe(1);
  expect(store.getElementAtIndex(0).displayName).toBe('Child');
});

// @reactVersion >= 19.0
it('can start profiling while an unconnected root has no children', () => {
  initialize();
  const {root} = createRoot();
  render(root, <></>);
  getRenderer().startProfiling(false);
  function Child() {
    return <span />;
  }
  render(root, <Child />);
  getRenderer().stopProfiling();
  const store = connect();
  expect(store.numElements).toBe(1);
  expect(
    getRenderer().getProfilingData().dataForRoots[0].commitData,
  ).toHaveLength(1);
});

// @reactVersion >= 19.0
it('mounts a suspended current tree and handles its later reveal', () => {
  initialize();
  const {root} = createRoot();
  let suspend = false;
  const never = new Promise(() => {});
  function Child() {
    if (suspend) {
      throw never;
    }
    return <span>content</span>;
  }
  function Fallback() {
    return <span>loading</span>;
  }
  function App() {
    return (
      <React.Suspense fallback={<Fallback />}>
        <Child />
      </React.Suspense>
    );
  }
  render(root, <App />);
  suspend = true;
  render(root, <App />);
  const store = connect();
  const names = () =>
    Array.from(
      {length: store.numElements},
      (_, index) => store.getElementAtIndex(index).displayName,
    );
  expect(names()).toContain('Fallback');
  suspend = false;
  render(root, <App />);
  React.act(() => jest.runAllTimers());
  expect(names()).toContain('Child');
  expect(names()).not.toContain('Fallback');
});

// @reactVersion >= 19.0
it('applies component filters when a frontend connects after earlier commits', () => {
  initialize();
  const {root} = createRoot();
  function Child() {
    return <span />;
  }
  function Parent() {
    return <Child />;
  }
  for (let i = 0; i < 5; i++) {
    render(root, <Parent key={i} />);
  }
  const {
    ComponentFilterDisplayName,
  } = require('react-devtools-shared/src/frontend/types');
  const filters = [
    ...require('react-devtools-shared/src/utils').getDefaultComponentFilters(),
    {
      type: ComponentFilterDisplayName,
      isEnabled: true,
      isValid: true,
      value: 'Child',
    },
  ];
  require('react-devtools-shared/src/utils').setSavedComponentFilters(filters);
  getRenderer().updateComponentFilters(filters);
  const store = connect();
  expect(store.numElements).toBe(1);
  expect(store.getElementAtIndex(0).displayName).toBe('Parent');
});
