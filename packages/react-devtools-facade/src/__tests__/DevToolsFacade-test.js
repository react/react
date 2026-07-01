/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let installFacade;
let createTools;
let facade;
let React;
let ReactDOMClient;
let act;
let container;

// Profiler durations are timing-dependent: null when the build does not collect
// them, otherwise a non-negative number.
function isDuration(value) {
  return value === null || (typeof value === 'number' && value >= 0);
}

describe('react-devtools-facade', () => {
  beforeEach(() => {
    jest.resetModules();
    global.IS_REACT_ACT_ENVIRONMENT = true;

    // The hook lives on globalThis, which jsdom shares across tests in this
    // file, so a leftover hook would make installFacade() below throw. Remove
    // it for a clean slate. (The facade never installs any other global, which
    // the "does not install any tool globals" test verifies.)
    delete globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    // Install the facade BEFORE React so the hook captures the first commit.
    // Import through the package entry point to exercise the public surface.
    const facadeAPI = require('../../index');
    installFacade = facadeAPI.installFacade;
    createTools = facadeAPI.createTools;
    facade = installFacade();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = React.act;

    container = document.createElement('div');
  });

  afterEach(() => {
    jest.dontMock('react-debug-tools');
    container = null;
  });

  it('installs __REACT_DEVTOOLS_GLOBAL_HOOK__ on globalThis', () => {
    expect(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(facade.hook);
  });

  it('returns a Facade handle exposing the hook and tracked state', () => {
    expect(facade.hook).toBe(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    expect(facade.fiberRoots).toBeInstanceOf(Map);
    expect(facade.rendererInternals).toBeInstanceOf(Map);
    expect(facade.profilingState).toEqual({
      isActive: false,
      currentTraceName: null,
      traces: expect.any(Map),
      onCommit: null,
      onPostCommit: null,
    });
  });

  it('does not install any tool globals (the integrator decides those)', () => {
    expect(globalThis.__REACT_TOOLS__).toBeUndefined();
    expect(globalThis.__REACT_LLM_TOOLS__).toBeUndefined();
  });

  it('attaches to an existing hook instead of installing a second one', () => {
    // A facade hook is already installed on globalThis (beforeEach). A second
    // installFacade() attaches to it rather than throwing or replacing it — this
    // is the path taken when the React DevTools extension is present.
    const attached = installFacade();
    expect(attached.hook).toBe(facade.hook);
    expect(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(facade.hook);
  });

  it('an attached facade back-fills roots already tracked by the hook', () => {
    function App() {
      return <div>hi</div>;
    }
    act(() => {
      ReactDOMClient.createRoot(container).render(<App />);
    });

    // Attaching after the app mounted picks up the already-tracked root.
    const attached = installFacade();
    const tree = createTools(attached).getComponentTree();
    expect(tree.find(n => n.name === 'App')).toBeDefined();
  });

  it('an attached facade tracks later commits and profiles them', () => {
    function Counter({count}) {
      return <div>{'n:' + count}</div>;
    }
    const root = ReactDOMClient.createRoot(container);
    act(() => {
      root.render(<Counter count={0} />);
    });

    const tools = createTools(installFacade());
    expect(
      tools.getComponentTree().find(n => n.name === 'Counter'),
    ).toBeDefined();

    // A commit after attaching flows through the wrapped onCommitFiberRoot.
    tools.startProfiling('attached-trace');
    act(() => {
      root.render(<Counter count={1} />);
    });
    expect(tools.stopProfiling()).toEqual({
      status: 'stopped',
      traceName: 'attached-trace',
      commits: 1,
    });
  });

  it('installs onto an explicit target without touching globalThis', () => {
    const target = {};
    const localFacade = installFacade(target);

    expect(target.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(localFacade.hook);
    // The explicit-target facade is fully independent of the global one.
    expect(localFacade.hook).not.toBe(facade.hook);
    expect(localFacade.fiberRoots).not.toBe(facade.fiberRoots);
    // ...and installing onto a target does not disturb the global hook.
    expect(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(facade.hook);
  });

  it('records the renderer and its fiber root on mount', () => {
    function Greeting() {
      return <div>Hello</div>;
    }

    act(() => {
      ReactDOMClient.createRoot(container).render(<Greeting />);
    });

    // React injected a renderer: its internal constants were captured...
    expect(facade.rendererInternals.size).toBeGreaterThan(0);
    // ...and the hook recorded the committed root in facade.fiberRoots.
    let totalRoots = 0;
    facade.fiberRoots.forEach(roots => {
      totalRoots += roots.size;
    });
    expect(totalRoots).toBeGreaterThan(0);
  });

  it('removes unmounted roots from tracking', () => {
    function App() {
      return <div>hello</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    act(() => {
      root.render(<App />);
    });

    const rendererID = Array.from(facade.hook.renderers.keys())[0];
    expect(facade.hook.getFiberRoots(rendererID).size).toBeGreaterThan(0);

    act(() => {
      root.unmount();
    });

    expect(facade.hook.getFiberRoots(rendererID).size).toBe(0);
  });

  describe('getComponentTree', () => {
    let getComponentTree;

    beforeEach(() => {
      getComponentTree = createTools(facade).getComponentTree;
    });

    it('returns error when nothing is rendered', () => {
      const result = getComponentTree();
      expect(result.error).toMatch(/No mounted React roots found/);
    });

    it('returns an array of component nodes', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = getComponentTree();
      expect(Array.isArray(result)).toBe(true);
      const app = result.find(n => n.name === 'App');
      const div = result.find(n => n.name === 'div');
      // App is the root's only child; its child is the host div.
      expect(app).toEqual({
        uid: 'r0',
        type: 'function',
        name: 'App',
        key: null,
        firstChild: div.uid,
        nextSibling: null,
      });
      // A single string child ('hello') is stored as a prop, not a child fiber,
      // so the div is a leaf in the tree.
      expect(div).toEqual({
        uid: 'r2',
        type: 'host',
        name: 'div',
        key: null,
        firstChild: null,
        nextSibling: null,
      });
    });

    it('encodes firstChild and nextSibling relationships', () => {
      function Header() {
        return <h1>title</h1>;
      }
      function Footer() {
        return <footer>foot</footer>;
      }
      function App() {
        return (
          <div>
            <Header />
            <Footer />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const nodes = getComponentTree();
      const app = nodes.find(n => n.name === 'App');
      const div = nodes.find(n => n.name === 'div');
      const header = nodes.find(n => n.name === 'Header');
      const footer = nodes.find(n => n.name === 'Footer');

      // App's firstChild is div
      expect(app.firstChild).toBe(div.uid);
      // div's firstChild is Header
      expect(div.firstChild).toBe(header.uid);
      // Header's nextSibling is Footer
      expect(header.nextSibling).toBe(footer.uid);
      // Footer has no nextSibling
      expect(footer.nextSibling).toBe(null);
    });

    it('shows keys in the output', () => {
      function Item() {
        return <li>item</li>;
      }
      function List() {
        return (
          <ul>
            <Item key="a" />
            <Item key="b" />
          </ul>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<List />);
      });

      const items = getComponentTree().filter(n => n.name === 'Item');
      expect(items.map(i => i.key)).toEqual(['a', 'b']);
    });

    it('limits depth with the depth parameter', () => {
      function Child() {
        return <span>leaf</span>;
      }
      function Parent() {
        return <Child />;
      }
      function App() {
        return <Parent />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const names = snapshot => snapshot.map(n => n.name);

      // depth=0: only the root node (HostRoot)
      const shallow = getComponentTree(0);
      expect(shallow).toHaveLength(1);
      expect(shallow[0].type).toBe('root');

      // depth=1: root + App
      const d1 = getComponentTree(1);
      expect(names(d1)).toContain('App');
      expect(names(d1)).not.toContain('Parent');

      // depth=2: root + App + Parent
      const d2 = getComponentTree(2);
      expect(names(d2)).toContain('App');
      expect(names(d2)).toContain('Parent');
      expect(names(d2)).not.toContain('Child');

      const deep = getComponentTree(20);
      expect(names(deep)).toEqual(
        expect.arrayContaining(['App', 'Parent', 'Child']),
      );
    });

    it('starts from a specific node when rootUid is provided', () => {
      function Nav() {
        return <nav>nav</nav>;
      }
      function Header() {
        return <Nav />;
      }
      function Footer() {
        return <footer>foot</footer>;
      }
      function App() {
        return (
          <div>
            <Header />
            <Footer />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      // First, get the full tree to find Header's uid
      const header = getComponentTree().find(n => n.name === 'Header');
      expect(header).toBeDefined();

      // Snapshot from Header
      const sub = getComponentTree(20, header.uid);
      const names = sub.map(n => n.name);
      expect(names).toContain('Header');
      expect(names).toContain('Nav');
      // Should NOT contain App or Footer
      expect(names).not.toContain('App');
      expect(names).not.toContain('Footer');
    });

    it('returns error for non-existent rootUid', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = getComponentTree(20, 'r9999');
      expect(result.error).toMatch(/Component not found/);
    });

    it('assigns stable uids across calls', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const first = getComponentTree();
      const second = getComponentTree();
      expect(first).toEqual(second);
    });

    it('shows class components with class type', () => {
      class MyComponent extends React.Component {
        render() {
          return <div>class</div>;
        }
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<MyComponent />);
      });

      const node = getComponentTree().find(n => n.name === 'MyComponent');
      expect(node.type).toBe('class');
    });

    it('shows host components with host type', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const node = getComponentTree().find(n => n.name === 'div');
      expect(node.type).toBe('host');
    });

    it('shows Memo components with memo type', () => {
      function Inner() {
        return <span>inner</span>;
      }
      const Memoized = React.memo(Inner);

      act(() => {
        ReactDOMClient.createRoot(container).render(<Memoized />);
      });

      const node = getComponentTree().find(n => n.name === 'Memo(Inner)');
      expect(node).toBeDefined();
      expect(node.type).toBe('memo');
    });

    it('shows ForwardRef components with forwardRef type', () => {
      const FancyButton = React.forwardRef(function FancyButton(props, ref) {
        return <button ref={ref}>{props.children}</button>;
      });

      act(() => {
        ReactDOMClient.createRoot(container).render(
          <FancyButton>click</FancyButton>,
        );
      });

      const node = getComponentTree().find(
        n => n.name === 'ForwardRef(FancyButton)',
      );
      expect(node).toBeDefined();
      expect(node.type).toBe('forwardRef');
    });

    it('includes Fragment in the tree', () => {
      function A() {
        return <span>a</span>;
      }
      function B() {
        return <span>b</span>;
      }
      function App() {
        // Keyed Fragment creates a Fragment fiber
        return (
          <div>
            <React.Fragment key="group">
              <A />
              <B />
            </React.Fragment>
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const nodes = getComponentTree();
      const fragment = nodes.find(n => n.type === 'fragment');
      const a = nodes.find(n => n.name === 'A');
      const b = nodes.find(n => n.name === 'B');
      // The keyed Fragment is the div's child and parents A then B.
      expect(fragment).toEqual({
        uid: 'r3',
        type: 'fragment',
        name: 'Fragment',
        key: 'group',
        firstChild: a.uid,
        nextSibling: null,
      });
      expect(a).toEqual({
        uid: 'r4',
        type: 'function',
        name: 'A',
        key: null,
        firstChild: 'r5',
        nextSibling: b.uid,
      });
      expect(b).toEqual({
        uid: 'r6',
        type: 'function',
        name: 'B',
        key: null,
        firstChild: 'r7',
        nextSibling: null,
      });
    });

    it('includes HostRoot with type root', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const nodes = getComponentTree();
      const root = nodes.find(n => n.type === 'root');
      const app = nodes.find(n => n.name === 'App');
      // The HostRoot is the tree's entry; its only child is App.
      expect(root).toEqual({
        uid: 'r1',
        type: 'root',
        name: 'createRoot()',
        key: null,
        firstChild: app.uid,
        nextSibling: null,
      });
    });

    it('includes Suspense in the tree', () => {
      function App() {
        return (
          <React.Suspense fallback={<div>loading</div>}>
            <div>content</div>
          </React.Suspense>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const suspense = getComponentTree().find(n => n.type === 'suspense');
      // Suspense wraps its content via an internal primary/Offscreen child, so
      // firstChild is a valid uid but its exact identity is an internal detail.
      expect(suspense).toEqual({
        uid: 'r2',
        type: 'suspense',
        name: 'Suspense',
        key: null,
        firstChild: 'r3',
        nextSibling: null,
      });
    });

    it('includes Context Provider in the tree', () => {
      const MyContext = React.createContext('default');
      function App() {
        return (
          <MyContext value="test">
            <div>child</div>
          </MyContext>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const provider = getComponentTree().find(n => n.type === 'context');
      expect(provider).toEqual({
        uid: 'r2',
        type: 'context',
        name: 'Context.Provider',
        key: null,
        firstChild: 'r3',
        nextSibling: null,
      });
    });

    it('uids survive re-renders via alternate fiber handling', () => {
      function Counter({count}) {
        return <div>{'Count: ' + count}</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });

      const counter1 = getComponentTree().find(n => n.name === 'Counter');
      expect(counter1).toBeDefined();

      act(() => {
        root.render(<Counter count={1} />);
      });

      const counter2 = getComponentTree().find(n => n.name === 'Counter');
      expect(counter2).toBeDefined();
      // Same uid after re-render
      expect(counter2.uid).toBe(counter1.uid);
    });

    it('removes unmounted roots from the tree', () => {
      function App() {
        return <div>hello</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<App />);
      });

      const before = getComponentTree();
      expect(before.find(n => n.name === 'App')).toBeDefined();

      act(() => {
        root.unmount();
      });

      const after = getComponentTree();
      expect(after.error).toMatch(/No mounted React roots found/);
    });
  });

  describe('findComponents', () => {
    let findComponents;
    let getComponentTree;

    beforeEach(() => {
      const tools = createTools(facade);
      findComponents = tools.findComponents;
      getComponentTree = tools.getComponentTree;
    });

    it('finds components by name (case-insensitive substring match)', () => {
      function Header() {
        return <h1>title</h1>;
      }
      function Footer() {
        return <footer>foot</footer>;
      }
      function App() {
        return (
          <div>
            <Header />
            <Footer />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('header');
      expect(result.totalCount).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Header');
      expect(result.results[0].type).toBe('function');
      expect(result.results[0].uid).toBe('r0');
    });

    it('returns all matches when multiple components match', () => {
      function Card() {
        return <div>card</div>;
      }
      function App() {
        return (
          <div>
            <Card key="a" />
            <Card key="b" />
            <Card key="c" />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('Card');
      expect(result.totalCount).toBe(3);
      expect(result.results.map(r => r.key)).toEqual(['a', 'b', 'c']);
    });

    it('returns empty results when no components match', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('NonExistent');
      expect(result.totalCount).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('scopes search to subtree when rootUid is provided', () => {
      function Badge() {
        return <span>badge</span>;
      }
      function Sidebar() {
        return <Badge />;
      }
      function Main() {
        return <Badge />;
      }
      function App() {
        return (
          <div>
            <Sidebar />
            <Main />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      // Find Sidebar's uid
      const sidebar = getComponentTree().find(n => n.name === 'Sidebar');
      expect(sidebar).toBeDefined();

      // Search for Badge only under Sidebar
      const result = findComponents('Badge', sidebar.uid);
      expect(result.totalCount).toBe(1);
      expect(result.results[0].name).toBe('Badge');

      // Without rootUid, should find both Badges
      const allResult = findComponents('Badge');
      expect(allResult.totalCount).toBe(2);
    });

    it('paginates results with default page size of 10', () => {
      function Item() {
        return <li>item</li>;
      }
      function App() {
        const items = [];
        for (let i = 0; i < 15; i++) {
          items.push(<Item key={String(i)} />);
        }
        return <ul>{items}</ul>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const page1 = findComponents('Item');
      expect(page1.totalCount).toBe(15);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(10);
      expect(page1.totalPages).toBe(2);
      expect(page1.results).toHaveLength(10);

      const page2 = findComponents('Item', undefined, 2);
      expect(page2.page).toBe(2);
      expect(page2.results).toHaveLength(5);
    });

    it('supports custom page size', () => {
      function Item() {
        return <li>item</li>;
      }
      function App() {
        return (
          <ul>
            <Item key="0" />
            <Item key="1" />
            <Item key="2" />
            <Item key="3" />
            <Item key="4" />
          </ul>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('Item', undefined, 1, 2);
      expect(result.totalCount).toBe(5);
      expect(result.pageSize).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].key).toBe('0');
      expect(result.results[1].key).toBe('1');

      const page3 = findComponents('Item', undefined, 3, 2);
      expect(page3.results).toHaveLength(1);
      expect(page3.results[0].key).toBe('4');
    });

    it('clamps page number to valid range', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      // Page 0 should clamp to 1
      const low = findComponents('div', undefined, 0);
      expect(low.page).toBe(1);

      // Page beyond total should clamp to last page
      const high = findComponents('div', undefined, 999);
      expect(high.page).toBe(1);
    });

    it('results have same shape as tree snapshot nodes', () => {
      function Widget() {
        return <span>w</span>;
      }
      function App() {
        return <Widget />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('Widget');
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        uid: 'r0',
        type: 'function',
        name: 'Widget',
        key: null,
        firstChild: 'r1',
        nextSibling: null,
      });
    });

    it('uids are consistent with getComponentTree', () => {
      function Target() {
        return <div>target</div>;
      }
      function App() {
        return <Target />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      // Get uid from tree snapshot
      const target = getComponentTree().find(n => n.name === 'Target');
      expect(target).toBeDefined();

      // findComponents should return the same uid
      const result = findComponents('Target');
      expect(result.results[0].uid).toBe(target.uid);
    });

    it('matches host components by tag name', () => {
      function App() {
        return (
          <div>
            <span>a</span>
            <span>b</span>
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('span');
      expect(result.totalCount).toBe(2);
      expect(result.results[0].type).toBe('host');
      expect(result.results[0].name).toBe('span');
    });

    it('does not match internal nodes with null displayName', () => {
      function App() {
        return (
          <React.Fragment>
            <div>hello</div>
          </React.Fragment>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      // Fragment has null displayName in getDisplayNameForFiber,
      // so it should not appear in search results
      const fragmentResult = findComponents('Fragment');
      expect(fragmentResult.totalCount).toBe(0);
    });

    it('finds Memo components by wrapped display name', () => {
      function Inner() {
        return <span>inner</span>;
      }
      const Memoized = React.memo(Inner);
      function App() {
        return <Memoized />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      // memo(Inner) renders Inner inline (no separate FunctionComponent fiber),
      // so the only match for "Inner" is the memo wrapper "Memo(Inner)".
      const result = findComponents('Inner');
      expect(result.totalCount).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        uid: 'r0',
        type: 'memo',
        name: 'Memo(Inner)',
        key: null,
        firstChild: 'r1',
        nextSibling: null,
      });
    });

    it('returns error for non-existent rootUid in scoped search', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const result = findComponents('App', 'r9999');
      expect(result.error).toMatch(/Component not found/);
    });
  });

  describe('getComponentSource', () => {
    let getComponentSource;
    let getComponentTree;

    beforeEach(() => {
      const tools = createTools(facade);
      getComponentSource = tools.getComponentSource;
      getComponentTree = tools.getComponentTree;
    });

    it('returns {source: null} for a function component when the location is unavailable', () => {
      // The throwing trick that resolves a component's definition location does
      // not produce file positions under jsdom, so source is null here. In a
      // real browser this returns {name, fileName, line, column}.
      function Greeting() {
        return <div>Hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Greeting />);
      });

      const greeting = getComponentTree().find(n => n.name === 'Greeting');
      expect(greeting).toBeDefined();
      expect(getComponentSource(greeting.uid)).toEqual({source: null});
    });

    it('returns {source: null} for host components', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const div = getComponentTree().find(n => n.name === 'div');
      expect(div).toBeDefined();
      // Host components like div have no source location.
      expect(getComponentSource(div.uid)).toEqual({source: null});
    });

    it('returns error for non-existent uid', () => {
      const result = getComponentSource('r9999');
      expect(result.error).toMatch(/Component not found/);
    });
  });

  describe('getOwnerStackTrace', () => {
    let getOwnerStackTrace;
    let getComponentTree;

    beforeEach(() => {
      const tools = createTools(facade);
      getOwnerStackTrace = tools.getOwnerStackTrace;
      getComponentTree = tools.getComponentTree;
    });

    it('returns a stack string for a nested component', () => {
      function Child() {
        return <span>leaf</span>;
      }
      function Parent() {
        return <Child />;
      }
      function App() {
        return <Parent />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const child = getComponentTree().find(n => n.name === 'Child');
      expect(child).toBeDefined();

      const result = getOwnerStackTrace(child.uid);
      expect(typeof result.stack).toBe('string');
      // The stack should mention the owner components
      expect(result.stack).toContain('Parent');
      expect(result.stack).toContain('App');
    });

    it('returns a stack string for the root component', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const app = getComponentTree().find(n => n.name === 'App');
      const result = getOwnerStackTrace(app.uid);
      expect(typeof result.stack).toBe('string');
    });

    it('returns error for non-existent uid', () => {
      const result = getOwnerStackTrace('r9999');
      expect(result.error).toMatch(/Component not found/);
    });
  });

  describe('getOwnerStack', () => {
    let getOwnerStack;
    let getComponentTree;

    beforeEach(() => {
      const tools = createTools(facade);
      getOwnerStack = tools.getOwnerStack;
      getComponentTree = tools.getComponentTree;
    });

    it('returns owner list for a nested component', () => {
      function Child() {
        return <span>leaf</span>;
      }
      function Parent() {
        return <Child />;
      }
      function App() {
        return <Parent />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const child = getComponentTree().find(n => n.name === 'Child');
      expect(child).toBeDefined();

      const owners = getOwnerStack(child.uid);
      expect(owners).toEqual([
        {
          uid: 'r2',
          name: 'Parent',
          type: 'function',
        },
        {
          uid: 'r0',
          name: 'App',
          type: 'function',
        },
      ]);
    });

    it('each entry has uid, name, and type', () => {
      function Child() {
        return <span>leaf</span>;
      }
      function App() {
        return <Child />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const child = getComponentTree().find(n => n.name === 'Child');
      const owners = getOwnerStack(child.uid);

      expect(owners).toHaveLength(1);
      expect(owners[0].uid).toBe('r0');
      expect(owners[0].name).toBe('App');
      expect(owners[0].type).toBe('function');
    });

    it('owner uids are consistent with getComponentTree', () => {
      function Child() {
        return <span>leaf</span>;
      }
      function App() {
        return <Child />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const tree = getComponentTree();
      const child = tree.find(n => n.name === 'Child');
      const app = tree.find(n => n.name === 'App');

      const owners = getOwnerStack(child.uid);
      expect(owners[0].uid).toBe(app.uid);
    });

    it('returns empty array for root component with no owner', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const app = getComponentTree().find(n => n.name === 'App');
      const owners = getOwnerStack(app.uid);
      expect(owners).toEqual([]);
    });

    it('returns error for non-existent uid', () => {
      const result = getOwnerStack('r9999');
      expect(result.error).toMatch(/Component not found/);
    });

    it('is ordered from immediate owner to root ancestor', () => {
      function GrandChild() {
        return <span>gc</span>;
      }
      function Child() {
        return <GrandChild />;
      }
      function Parent() {
        return <Child />;
      }
      function App() {
        return <Parent />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const gc = getComponentTree().find(n => n.name === 'GrandChild');
      const owners = getOwnerStack(gc.uid);
      expect(owners).toEqual([
        {
          uid: 'r3',
          name: 'Child',
          type: 'function',
        },
        {
          uid: 'r2',
          name: 'Parent',
          type: 'function',
        },
        {
          uid: 'r0',
          name: 'App',
          type: 'function',
        },
      ]);
    });
  });

  describe('getComponentByUid', () => {
    let getComponentTree;
    let getComponentByUid;

    beforeEach(() => {
      const tools = createTools(facade);
      getComponentTree = tools.getComponentTree;
      getComponentByUid = tools.getComponentByUid;
    });

    it('returns error for non-existent uid', () => {
      const result = getComponentByUid('r9999');
      expect(result.error).toMatch(/Component not found/);
    });

    it('returns info for a function component', () => {
      function Greeting() {
        return <div>Hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Greeting />);
      });

      const greeting = getComponentTree().find(n => n.name === 'Greeting');
      expect(greeting).toBeDefined();
      const info = getComponentByUid(greeting.uid);

      expect(info.uid).toBe(greeting.uid);
      expect(info.type).toBe('function');
      expect(info.name).toBe('Greeting');
    });

    it('returns props (excluding children)', () => {
      function Button() {
        return <button>click</button>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(
          <Button text="Click me" disabled={true} />,
        );
      });

      const button = getComponentTree().find(n => n.name === 'Button');
      const info = getComponentByUid(button.uid);

      expect(info.props.text).toBe('Click me');
      expect(info.props.disabled).toBe(true);
      expect(info.props).not.toHaveProperty('children');
    });

    it('serializes function props as descriptive strings', () => {
      function Button() {
        return <button>click</button>;
      }

      function handleClick() {}

      act(() => {
        ReactDOMClient.createRoot(container).render(
          <Button onClick={handleClick} />,
        );
      });

      const button = getComponentTree().find(n => n.name === 'Button');
      const info = getComponentByUid(button.uid);

      expect(info.props.onClick).toBe('[fn handleClick]');
    });

    it('returns key when present', () => {
      function Item() {
        return <li>item</li>;
      }
      function List() {
        return (
          <ul>
            <Item key="first" />
          </ul>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<List />);
      });

      const item = getComponentTree().find(n => n.name === 'Item');
      const info = getComponentByUid(item.uid);

      expect(info.key).toBe('first');
    });

    it('returns correct type for class components', () => {
      class MyClass extends React.Component {
        render() {
          return <div>class</div>;
        }
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<MyClass />);
      });

      const myClass = getComponentTree().find(n => n.name === 'MyClass');
      expect(myClass).toBeDefined();
      const info = getComponentByUid(myClass.uid);

      expect(info.type).toBe('class');
      expect(info.name).toBe('MyClass');
    });

    it('returns correct type for host components', () => {
      function App() {
        return <div className="app" id="root" />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const div = getComponentTree().find(n => n.name === 'div');
      const info = getComponentByUid(div.uid);

      expect(info.type).toBe('host');
      expect(info.name).toBe('div');
      expect(info.props.className).toBe('app');
      expect(info.props.id).toBe('root');
    });

    it('uses uids consistent with getComponentTree', () => {
      function Header() {
        return <h1>title</h1>;
      }
      function Footer() {
        return <footer>foot</footer>;
      }
      function App() {
        return (
          <div>
            <Header />
            <Footer />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const nodes = getComponentTree();
      nodes.forEach(node => {
        const info = getComponentByUid(node.uid);
        expect(info.uid).toBe(node.uid);
      });
    });

    it('normalizes nested objects and arrays in props', () => {
      function Config() {
        return <div>config</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(
          <Config style={{color: 'red', fontSize: 14}} items={[1, 2, 3]} />,
        );
      });

      const config = getComponentTree().find(n => n.name === 'Config');
      const info = getComponentByUid(config.uid);
      expect(info.props.style).toEqual({color: 'red', fontSize: 14});
      expect(info.props.items).toEqual([1, 2, 3]);
    });

    it('normalizes symbol and undefined props', () => {
      function Widget() {
        return <div>w</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(
          <Widget sym={Symbol('test')} undef={undefined} />,
        );
      });

      const widget = getComponentTree().find(n => n.name === 'Widget');
      const info = getComponentByUid(widget.uid);
      expect(info.props.sym).toBe('[symbol]');
      expect(info.props.undef).toBe(null);
    });

    it('returns info for Memo component with correct type', () => {
      function Inner() {
        return <span>inner</span>;
      }
      const Memoized = React.memo(Inner);

      act(() => {
        ReactDOMClient.createRoot(container).render(<Memoized value={42} />);
      });

      const memo = getComponentTree().find(n => n.type === 'memo');
      expect(memo).toBeDefined();
      const info = getComponentByUid(memo.uid);
      expect(info.type).toBe('memo');
    });

    it('returns info for ForwardRef component with correct type', () => {
      const FancyInput = React.forwardRef(function FancyInput(props, ref) {
        return <input ref={ref} />;
      });

      act(() => {
        ReactDOMClient.createRoot(container).render(<FancyInput />);
      });

      const fwd = getComponentTree().find(n => n.type === 'forwardRef');
      expect(fwd).toBeDefined();
      const info = getComponentByUid(fwd.uid);
      expect(info.type).toBe('forwardRef');
    });

    it('returns no props when component has only children', () => {
      function Wrapper() {
        return <div>child</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Wrapper />);
      });

      const wrapper = getComponentTree().find(n => n.name === 'Wrapper');
      const info = getComponentByUid(wrapper.uid);
      // No props key at all (children are excluded)
      expect(info.props).toBeUndefined();
    });

    it('handles circular references in props without stack overflow', () => {
      function Widget() {
        return <div>widget</div>;
      }

      const circular = {a: 1};
      circular.self = circular;

      act(() => {
        ReactDOMClient.createRoot(container).render(<Widget data={circular} />);
      });

      const widget = getComponentTree().find(n => n.name === 'Widget');
      // Should not throw or stack overflow
      const info = getComponentByUid(widget.uid);
      expect(info.props.data.a).toBe(1);
      expect(info.props.data.self).toBe('[circular]');
    });

    it('handles deeply nested objects in props without stack overflow', () => {
      function Widget() {
        return <div>widget</div>;
      }

      // Create a very deeply nested object
      let deep = {value: 'leaf'};
      for (let i = 0; i < 200; i++) {
        deep = {nested: deep};
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Widget data={deep} />);
      });

      const widget = getComponentTree().find(n => n.name === 'Widget');
      // Should not throw or stack overflow
      const info = getComponentByUid(widget.uid);
      expect(info.props.data).toBeDefined();
    });

    it('returns the full hooks tree for a function component', () => {
      function useCounter() {
        const [c] = React.useState(0);
        return c;
      }
      function Widget() {
        const [count] = React.useState(7);
        React.useEffect(() => {}, []);
        const [obj] = React.useState({color: 'red'});
        useCounter();
        const ref = React.useRef(1);
        const memo = React.useMemo(() => 5, []);
        return (
          <div>
            {count}
            {obj.color}
            {ref.current}
            {memo}
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Widget />);
      });

      const widget = getComponentTree().find(n => n.name === 'Widget');
      const info = getComponentByUid(widget.uid, true);

      // Full structural assertion: every hook node, in order, with its id
      // (sequential per primitive hook; custom hooks are null), name, normalized
      // value (the Effect's create fn becomes '[fn]'), and subHooks.
      expect(info.hooks).toEqual([
        {id: 0, name: 'State', value: 7, subHooks: []},
        {id: 1, name: 'Effect', value: '[fn]', subHooks: []},
        {id: 2, name: 'State', value: {color: 'red'}, subHooks: []},
        {
          id: null,
          name: 'Counter',
          value: null,
          subHooks: [{id: 3, name: 'State', value: 0, subHooks: []}],
        },
        {id: 4, name: 'Ref', value: 1, subHooks: []},
        {id: 5, name: 'Memo', value: 5, subHooks: []},
      ]);
    });

    it('does not inspect hooks by default', () => {
      function Widget() {
        React.useState(7);
        return <div>widget</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Widget />);
      });

      const widget = getComponentTree().find(n => n.name === 'Widget');
      const info = getComponentByUid(widget.uid);

      expect(info.hooks).toBeUndefined();
    });

    it('returns an error when requested hook inspection fails', () => {
      jest.resetModules();
      jest.doMock('react-debug-tools', () => ({
        inspectHooksOfFiberWithoutDefaultDispatcher() {
          throw new Error('Cannot inspect hooks');
        },
      }));
      delete globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;

      const facadeAPI = require('../../index');
      const mockedFacade = facadeAPI.installFacade();
      const mockedTools = facadeAPI.createTools(mockedFacade);
      const MockedReact = require('react');
      const MockedReactDOMClient = require('react-dom/client');

      function Widget() {
        MockedReact.useState(7);
        return MockedReact.createElement('div', null, 'widget');
      }

      MockedReact.act(() => {
        MockedReactDOMClient.createRoot(container).render(
          MockedReact.createElement(Widget),
        );
      });

      const widget = mockedTools
        .getComponentTree()
        .find(node => node.name === 'Widget');
      const info = mockedTools.getComponentByUid(widget.uid, true);

      expect(info.error).toBeInstanceOf(Error);
      expect(info.error.message).toBe('Failed to inspect hooks.');
      expect(info.error.cause).toEqual(new Error('Cannot inspect hooks'));
    });

    it('captures the useContext hook with its provided value', () => {
      const ThemeContext = React.createContext('light');
      function Themed() {
        const theme = React.useContext(ThemeContext);
        const [count] = React.useState(0);
        return (
          <div>
            {theme}
            {count}
          </div>
        );
      }
      function App() {
        return (
          <ThemeContext value="dark">
            <Themed />
          </ThemeContext>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const themed = getComponentTree().find(n => n.name === 'Themed');
      const info = getComponentByUid(themed.uid, true);
      // useContext is captured as a "Context" hook holding the provider's value.
      // It does not consume a primitive hook slot, so its id is null; the
      // following useState is the first primitive hook (id 0).
      expect(info.hooks).toEqual([
        {id: null, name: 'Context', value: 'dark', subHooks: []},
        {id: 0, name: 'State', value: 0, subHooks: []},
      ]);
    });

    it('returns an empty hooks array for a function component with no hooks', () => {
      function Plain() {
        return <div>plain</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<Plain />);
      });

      const plain = getComponentTree().find(n => n.name === 'Plain');
      const info = getComponentByUid(plain.uid, true);
      expect(info.hooks).toEqual([]);
    });

    it('does not include hooks for class components', () => {
      class MyClass extends React.Component {
        render() {
          return <div>class</div>;
        }
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<MyClass />);
      });

      const myClass = getComponentTree().find(n => n.name === 'MyClass');
      const info = getComponentByUid(myClass.uid, true);
      expect(info.hooks).toBeUndefined();
    });

    it('does not include hooks for host components', () => {
      function App() {
        return <div>hello</div>;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const div = getComponentTree().find(n => n.name === 'div');
      const info = getComponentByUid(div.uid, true);
      expect(info.hooks).toBeUndefined();
    });
  });

  describe('getComponentByHostInstance', () => {
    let getComponentTree;
    let getComponentByUid;
    let getComponentByHostInstance;

    beforeEach(() => {
      const tools = createTools(facade);
      getComponentTree = tools.getComponentTree;
      getComponentByUid = tools.getComponentByUid;
      getComponentByHostInstance = tools.getComponentByHostInstance;
    });

    it('returns the host component for a DOM host element', () => {
      function Child({label}) {
        return <span className="leaf">{label}</span>;
      }
      function App() {
        return (
          <div>
            <Child label="leaf" />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const span = container.querySelector('span.leaf');
      const host = getComponentTree().find(n => n.name === 'span');
      const result = getComponentByHostInstance(span);

      expect(result).toEqual(getComponentByUid(host.uid));
      expect(result).toMatchObject({
        uid: host.uid,
        type: 'host',
        name: 'span',
        props: {className: 'leaf'},
      });
    });

    it('returns the host component rather than the tree owner', () => {
      function Wrapper({children}) {
        return <section className="wrap">{children}</section>;
      }
      function App() {
        return (
          <Wrapper>
            <button className="action">Run</button>
          </Wrapper>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const button = container.querySelector('button.action');
      const tree = getComponentTree();
      const host = tree.find(n => n.name === 'button');
      const wrapper = tree.find(n => n.name === 'Wrapper');
      const app = tree.find(n => n.name === 'App');
      const result = getComponentByHostInstance(button);

      expect(result.uid).toBe(host.uid);
      expect(result.uid).not.toBe(wrapper.uid);
      expect(result.uid).not.toBe(app.uid);
      expect(result).toMatchObject({
        type: 'host',
        name: 'button',
        props: {className: 'action'},
      });
    });

    it('keeps uids stable across re-renders via alternate fibers', () => {
      function Counter({count}) {
        return <div className="counter">{'Count: ' + count}</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });

      const div = container.querySelector('div.counter');
      const first = getComponentByHostInstance(div);

      act(() => {
        root.render(<Counter count={1} />);
      });

      const second = getComponentByHostInstance(div);
      expect(second.uid).toBe(first.uid);
      expect(second.name).toBe('div');
      expect(second.type).toBe('host');
      expect(second.props.className).toBe('counter');
    });

    it('does not walk platform parent pointers for unmanaged nested nodes', () => {
      function App() {
        return <div className="host" />;
      }

      act(() => {
        ReactDOMClient.createRoot(container).render(<App />);
      });

      const host = container.querySelector('div.host');
      const unmanagedChild = document.createElement('i');
      host.appendChild(unmanagedChild);

      expect(getComponentByHostInstance(unmanagedChild)).toEqual({
        error: 'Host instance is not managed by React',
      });
    });

    it('returns an error when no roots are mounted', () => {
      expect(getComponentByHostInstance({})).toEqual({
        error: 'No mounted React roots found',
      });
    });

    it('returns an error for null or undefined references', () => {
      expect(getComponentByHostInstance(null)).toEqual({
        error: 'Host instance is required',
      });
      expect(getComponentByHostInstance(undefined)).toEqual({
        error: 'Host instance is required',
      });
    });
  });

  describe('profiler', () => {
    let startProfiling;
    let stopProfiling;
    let getTraceOverview;
    let getCommitReport;
    let getComponentTree;
    let getComponentByUid;

    beforeEach(() => {
      const tools = createTools(facade);
      startProfiling = tools.startProfiling;
      stopProfiling = tools.stopProfiling;
      getTraceOverview = tools.getTraceOverview;
      getCommitReport = tools.getCommitReport;
      getComponentTree = tools.getComponentTree;
      getComponentByUid = tools.getComponentByUid;
    });

    it('startProfiling returns the started status and trace name', () => {
      expect(startProfiling('my-trace')).toEqual({
        status: 'started',
        traceName: 'my-trace',
      });
      stopProfiling();
    });

    it('startProfiling auto-generates a trace name when none is provided', () => {
      const result = startProfiling();
      expect(result.status).toBe('started');
      expect(result.traceName).toMatch(/^trace-\d+$/);
      stopProfiling();
    });

    it('stopProfiling reports the trace name and commit count', () => {
      startProfiling('test-trace');
      expect(stopProfiling()).toEqual({
        status: 'stopped',
        traceName: 'test-trace',
        commits: 0,
      });
    });

    it('cannot start profiling twice', () => {
      startProfiling('first');
      expect(startProfiling('second')).toEqual({
        error: 'Already profiling trace "first"',
      });
      stopProfiling();
    });

    it('cannot stop when not profiling', () => {
      expect(stopProfiling()).toEqual({error: 'Not currently profiling'});
    });

    it('records one commit per render and reports the count on stop', () => {
      function Counter({count}) {
        return <div>{'Count: ' + count}</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });

      startProfiling('render-trace');
      act(() => {
        root.render(<Counter count={1} />);
      });
      act(() => {
        root.render(<Counter count={2} />);
      });

      expect(stopProfiling()).toEqual({
        status: 'stopped',
        traceName: 'render-trace',
        commits: 2,
      });
    });

    it('getTraceOverview returns one row per commit', () => {
      function Child() {
        return <span>child</span>;
      }
      function Counter({count}) {
        return (
          <div>
            <Child />
            {count}
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });

      startProfiling('overview-trace');
      act(() => {
        root.render(<Counter count={1} />);
      });
      act(() => {
        root.render(<Counter count={2} />);
      });
      stopProfiling();

      const overview = getTraceOverview('overview-trace');
      expect(overview).toHaveLength(2);
      let previousCommittedAt = 0;
      overview.forEach((row, i) => {
        expect(row.commit).toBe(i);
        // committedAt is relative to trace start: non-negative and monotonic.
        expect(row.committedAt).toBeGreaterThanOrEqual(previousCommittedAt);
        previousCommittedAt = row.committedAt;
        // componentsChanged matches the commit report's component count.
        expect(row.componentsChanged).toBe(
          getCommitReport('overview-trace', i).components.length,
        );
        expect(isDuration(row.renderDuration)).toBe(true);
        expect(isDuration(row.layoutDuration)).toBe(true);
        expect(isDuration(row.passiveDuration)).toBe(true);
      });
    });

    it('getTraceOverview returns an error for an unknown trace', () => {
      expect(getTraceOverview('nope')).toEqual({error: 'Unknown trace "nope"'});
    });

    it('getTraceOverview returns an empty array for a trace with no commits', () => {
      startProfiling('empty-trace');
      stopProfiling();
      expect(getTraceOverview('empty-trace')).toEqual([]);
    });

    it('getCommitReport returns commit metadata and the full component set', () => {
      function Child() {
        return <span>child</span>;
      }
      function Counter({count}) {
        return (
          <div>
            <Child />
            {count}
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });

      startProfiling('detail-trace');
      act(() => {
        root.render(<Counter count={1} />);
      });
      stopProfiling();

      const report = getCommitReport('detail-trace', 0);
      expect(report.priority).toBe('Normal');
      expect(report.committedAt).toBeGreaterThanOrEqual(0);
      expect(isDuration(report.renderDuration)).toBe(true);
      expect(isDuration(report.layoutDuration)).toBe(true);
      expect(isDuration(report.passiveDuration)).toBe(true);

      // The exact set of components that rendered. Order is duration-dependent
      // (sorted descending), so compare sorted by name.
      const byName = report.components
        .map(c => ({name: c.name, type: c.type}))
        .sort((a, b) => a.name.localeCompare(b.name));
      expect(byName).toEqual([
        {name: 'Child', type: 'function'},
        {name: 'Counter', type: 'function'},
        {name: 'createRoot()', type: 'root'},
        {name: 'div', type: 'host'},
        {name: 'span', type: 'host'},
      ]);
      report.components.forEach(c => {
        expect(c.uid).toMatch(/^r\d+$/);
        expect(isDuration(c.actualDuration)).toBe(true);
        expect(isDuration(c.selfDuration)).toBe(true);
      });
    });

    it('getCommitReport sorts components by actualDuration descending', () => {
      function Child() {
        return <span>child</span>;
      }
      function Counter({count}) {
        return (
          <div>
            <Child />
            {count}
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });
      startProfiling('sort-trace');
      act(() => {
        root.render(<Counter count={1} />);
      });
      stopProfiling();

      const durations = getCommitReport('sort-trace', 0).components.map(
        c => c.actualDuration || 0,
      );
      for (let i = 1; i < durations.length; i++) {
        expect(durations[i]).toBeLessThanOrEqual(durations[i - 1]);
      }
    });

    it('getCommitReport committedAt matches getTraceOverview', () => {
      function Counter({count}) {
        return <div>{'Count: ' + count}</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });
      startProfiling('match-trace');
      act(() => {
        root.render(<Counter count={1} />);
      });
      stopProfiling();

      const overview = getTraceOverview('match-trace');
      const report = getCommitReport('match-trace', 0);
      expect(report.committedAt).toBe(overview[0].committedAt);
    });

    it('getCommitReport returns an error for an unknown trace', () => {
      expect(getCommitReport('nope', 0)).toEqual({
        error: 'Unknown trace "nope"',
      });
    });

    it('getCommitReport returns an error for an out-of-range commit index', () => {
      startProfiling('range-trace');
      stopProfiling();
      expect(getCommitReport('range-trace', 5)).toEqual({
        error: 'Commit index out of range',
      });
      expect(getCommitReport('range-trace', -1)).toEqual({
        error: 'Commit index out of range',
      });
    });

    it('does not record internal nodes like Fragment, Mode, or text', () => {
      function Child() {
        return <span>child</span>;
      }
      function App() {
        return (
          <React.StrictMode>
            <React.Fragment>
              <Child />
            </React.Fragment>
          </React.StrictMode>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<App />);
      });
      startProfiling('internal-trace');
      act(() => {
        root.render(<App />);
      });
      stopProfiling();

      const names = getCommitReport('internal-trace', 0).components.map(
        c => c.name,
      );
      expect(names).not.toContain('Fragment');
      expect(names).not.toContain('StrictMode');
      // Only named components are recorded; no Unknown/internal entries.
      names.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name).not.toBe('Unknown');
      });
    });

    it('uses uids consistent with the tree tools', () => {
      function Widget() {
        return <div>widget</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Widget />);
      });
      const widget = getComponentTree().find(n => n.name === 'Widget');

      startProfiling('uid-trace');
      act(() => {
        root.render(<Widget />);
      });
      stopProfiling();

      const report = getCommitReport('uid-trace', 0);
      const widgetEntry = report.components.find(c => c.name === 'Widget');
      expect(widgetEntry).toBeDefined();
      expect(widgetEntry.uid).toBe(widget.uid);
      // ...and the same uid resolves back through getComponentByUid.
      expect(getComponentByUid(widget.uid).name).toBe('Widget');
    });

    it('records commits across multiple independent traces', () => {
      function Counter({count}) {
        return <div>{'Count: ' + count}</div>;
      }

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(<Counter count={0} />);
      });

      startProfiling('trace-a');
      act(() => {
        root.render(<Counter count={1} />);
      });
      stopProfiling();

      startProfiling('trace-b');
      act(() => {
        root.render(<Counter count={2} />);
      });
      act(() => {
        root.render(<Counter count={3} />);
      });
      stopProfiling();

      expect(getTraceOverview('trace-a')).toHaveLength(1);
      expect(getTraceOverview('trace-b')).toHaveLength(2);
    });

    it('the hook onPostCommitFiberRoot is a no-op when not profiling', () => {
      const hook = facade.hook;
      expect(typeof hook.onPostCommitFiberRoot).toBe('function');
      expect(() => {
        hook.onPostCommitFiberRoot(0, {passiveEffectDuration: 0});
      }).not.toThrow();
    });
  });

  describe('multiple roots and renderers', () => {
    it('inject() registers a new renderer and initializes its internals', () => {
      // react-dom registered itself as a renderer when it was required. Here we
      // register a second (simulated) renderer to cover the registration
      // contract; the cross-root tests below use a single react-dom renderer.
      const before = facade.hook.renderers.size;
      const id = facade.hook.inject({
        reconcilerVersion: '18.2.0',
        version: '18.2.0',
      });
      expect(typeof id).toBe('number');
      expect(facade.hook.renderers.size).toBe(before + 1);
      expect(facade.rendererInternals.has(id)).toBe(true);
    });

    it('getComponentTree aggregates components from multiple roots', () => {
      function AppA() {
        return <div>A</div>;
      }
      function AppB() {
        return <div>B</div>;
      }

      const containerB = document.createElement('div');

      act(() => {
        ReactDOMClient.createRoot(container).render(<AppA />);
        ReactDOMClient.createRoot(containerB).render(<AppB />);
      });

      const tree = createTools(facade).getComponentTree();
      // Two roots → exactly two HostRoot nodes.
      expect(tree.filter(n => n.type === 'root')).toHaveLength(2);

      const appA = tree.find(n => n.name === 'AppA');
      const appB = tree.find(n => n.name === 'AppB');
      // Uids come from a per-call counter that spans every root, in root
      // order: root A gets r0–r2, root B gets r3–r5, so uids are
      // globally unique across roots.
      expect(appA).toEqual({
        uid: 'r0',
        type: 'function',
        name: 'AppA',
        key: null,
        firstChild: 'r2',
        nextSibling: null,
      });
      expect(appB).toEqual({
        uid: 'r3',
        type: 'function',
        name: 'AppB',
        key: null,
        firstChild: 'r5',
        nextSibling: null,
      });
    });

    it('findComponents finds matches across multiple roots', () => {
      function Shared() {
        return <span>shared</span>;
      }
      function RootA() {
        return <Shared />;
      }
      function RootB() {
        return <Shared />;
      }

      const containerB = document.createElement('div');
      act(() => {
        ReactDOMClient.createRoot(container).render(<RootA />);
        ReactDOMClient.createRoot(containerB).render(<RootB />);
      });

      const result = createTools(facade).findComponents('Shared');
      expect(result.totalCount).toBe(2);
      expect(result.results.map(r => r.name)).toEqual(['Shared', 'Shared']);
      // Globally unique uids, assigned in result order across both roots.
      expect(result.results.map(r => r.uid)).toEqual(['r0', 'r2']);
    });

    it('resolves uids from any root via getComponentByUid', () => {
      function Widget() {
        return <div>w</div>;
      }
      function RootA() {
        return <Widget />;
      }
      function RootB() {
        return <Widget />;
      }

      const containerB = document.createElement('div');
      act(() => {
        ReactDOMClient.createRoot(container).render(<RootA />);
        ReactDOMClient.createRoot(containerB).render(<RootB />);
      });

      const tools = createTools(facade);
      const widgets = tools.findComponents('Widget').results;
      expect(widgets).toHaveLength(2);
      widgets.forEach(w => {
        expect(tools.getComponentByUid(w.uid).name).toBe('Widget');
      });
    });

    it('profiling records commits from all roots', () => {
      function CounterA({count}) {
        return <div>{'A:' + count}</div>;
      }
      function CounterB({count}) {
        return <div>{'B:' + count}</div>;
      }

      const containerB = document.createElement('div');

      const rootA = ReactDOMClient.createRoot(container);
      const rootB = ReactDOMClient.createRoot(containerB);
      act(() => {
        rootA.render(<CounterA count={0} />);
        rootB.render(<CounterB count={0} />);
      });

      const tools = createTools(facade);
      tools.startProfiling('multi-root-trace');
      act(() => {
        rootA.render(<CounterA count={1} />);
      });
      act(() => {
        rootB.render(<CounterB count={1} />);
      });

      expect(tools.stopProfiling()).toEqual({
        status: 'stopped',
        traceName: 'multi-root-trace',
        commits: 2,
      });

      const overview = tools.getTraceOverview('multi-root-trace');
      expect(overview).toHaveLength(2);
      // Separate act() blocks force exactly one commit each, in order, so
      // commit 0 is rootA's re-render and commit 1 is rootB's.
      const names0 = tools
        .getCommitReport('multi-root-trace', 0)
        .components.map(c => c.name);
      const names1 = tools
        .getCommitReport('multi-root-trace', 1)
        .components.map(c => c.name);
      expect(names0).toContain('CounterA');
      expect(names0).not.toContain('CounterB');
      expect(names1).toContain('CounterB');
      expect(names1).not.toContain('CounterA');
    });
  });

  describe('with the React DevTools extension hook already installed', () => {
    // Simulate the extension: a real React DevTools hook is installed, and React
    // registers with it, before the facade attaches. Re-set up the module graph
    // so react-dom injects into this hook rather than the facade's own.
    let localContainer;

    beforeEach(() => {
      jest.resetModules();
      global.IS_REACT_ACT_ENVIRONMENT = true;
      delete globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      require('react-devtools-shared/src/hook').installHook(window, []);

      const facadeAPI = require('../../index');
      installFacade = facadeAPI.installFacade;
      createTools = facadeAPI.createTools;
      React = require('react');
      ReactDOMClient = require('react-dom/client');
      act = React.act;

      localContainer = document.createElement('div');
      document.body.appendChild(localContainer);
    });

    afterEach(() => {
      document.body.removeChild(localContainer);
      localContainer = null;
    });

    it('attaches to the extension hook and reads its component tree', () => {
      const extensionHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;

      function Child() {
        return <span>c</span>;
      }
      function App() {
        return (
          <div>
            <Child />
          </div>
        );
      }

      act(() => {
        ReactDOMClient.createRoot(localContainer).render(<App />);
      });

      const localFacade = installFacade();
      // Attached to the extension's hook rather than replacing it.
      expect(localFacade.hook).toBe(extensionHook);

      const tree = createTools(localFacade).getComponentTree();
      expect(tree.find(n => n.name === 'App')).toBeDefined();
      expect(tree.find(n => n.name === 'Child')).toBeDefined();
    });
  });
});
