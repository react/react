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
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
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

  it('throws if a DevTools hook is already installed', () => {
    // A hook was already installed on globalThis in beforeEach.
    expect(() => installFacade()).toThrow(
      /React DevTools global hook is already installed/,
    );
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

  describe('getOwnersStack', () => {
    let getOwnersStack;
    let getComponentTree;

    beforeEach(() => {
      const tools = createTools(facade);
      getOwnersStack = tools.getOwnersStack;
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

      const result = getOwnersStack(child.uid);
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
      const result = getOwnersStack(app.uid);
      expect(typeof result.stack).toBe('string');
    });

    it('returns error for non-existent uid', () => {
      const result = getOwnersStack('r9999');
      expect(result.error).toMatch(/Component not found/);
    });
  });

  describe('getOwnersBranch', () => {
    let getOwnersBranch;
    let getComponentTree;

    beforeEach(() => {
      const tools = createTools(facade);
      getOwnersBranch = tools.getOwnersBranch;
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

      const owners = getOwnersBranch(child.uid);
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
      const owners = getOwnersBranch(child.uid);

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

      const owners = getOwnersBranch(child.uid);
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
      const owners = getOwnersBranch(app.uid);
      expect(owners).toEqual([]);
    });

    it('returns error for non-existent uid', () => {
      const result = getOwnersBranch('r9999');
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
      const owners = getOwnersBranch(gc.uid);
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
      const info = getComponentByUid(widget.uid);

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
      const info = getComponentByUid(themed.uid);
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
      const info = getComponentByUid(plain.uid);
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
      const info = getComponentByUid(myClass.uid);
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
      const info = getComponentByUid(div.uid);
      expect(info.hooks).toBeUndefined();
    });
  });
});
