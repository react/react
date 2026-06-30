/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const TOOL_NAMES = [
  'react_get_component_tree',
  'react_get_component_by_uid',
  'react_get_component_by_dom_element',
  'react_find_components',
  'react_get_component_source',
  'react_get_owner_stack_trace',
  'react_get_owner_stack',
  'react_start_profiling',
  'react_stop_profiling',
  'react_get_trace_overview',
  'react_get_commit_report',
];

let register;
let facade;
let toolGroup;
let unregister;
let React;
let ReactDOMClient;
let act;
let container;

// Look up a registered tool by name.
function getTool(name) {
  return toolGroup.tools.find(tool => tool.name === name);
}

// Dispatch chrome-devtools-mcp's discovery event and return the tool group the
// page responds with (synchronously). The tools are built lazily in the
// handler, so discovery is what actually constructs them.
function discover() {
  let group = null;
  const event = new CustomEvent('devtoolstooldiscovery');
  // $FlowFixMe[prop-missing] chrome-devtools-mcp attaches respondWith
  event.respondWith = responded => {
    group = responded;
  };
  window.dispatchEvent(event);
  return group;
}

describe('react-devtools-cdt-mcp', () => {
  beforeEach(() => {
    jest.resetModules();
    global.IS_REACT_ACT_ENVIRONMENT = true;

    delete globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    delete globalThis.__dtmcp;

    // register() installs the facade BEFORE React so the hook captures the
    // first commit, then registers the discovery listener (tools are built
    // lazily when chrome-devtools-mcp discovers them).
    register = require('../DevToolsCdtMcp').register;
    const result = register();
    facade = result.facade;
    unregister = result.unregister;

    // Obtain the tool group the way chrome-devtools-mcp does.
    toolGroup = discover();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = React.act;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Remove the discovery listener so it does not accumulate on the shared
    // jsdom window across tests.
    unregister();
    document.body.removeChild(container);
    container = null;
  });

  it('installs the DevTools hook on register', () => {
    expect(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe(facade.hook);
  });

  it('does not install any tool globals (chrome-devtools-mcp owns __dtmcp)', () => {
    expect(globalThis.__REACT_TOOLS__).toBeUndefined();
    expect(globalThis.__dtmcp).toBeUndefined();
  });

  it('builds a "react" tool group exposing every facade tool', () => {
    expect(toolGroup.name).toBe('react');
    expect(typeof toolGroup.description).toBe('string');
    expect(toolGroup.description.length).toBeGreaterThan(0);
    expect(toolGroup.tools.map(tool => tool.name)).toEqual(TOOL_NAMES);

    toolGroup.tools.forEach(tool => {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe('object');
      expect(typeof tool.execute).toBe('function');
    });
  });

  it('declares JSON-Schema input with required params', () => {
    expect(getTool('react_get_component_tree').inputSchema).toEqual({
      type: 'object',
      properties: {
        depth: {type: 'number', description: expect.any(String)},
        rootUid: {type: 'string', description: expect.any(String)},
      },
    });
    expect(getTool('react_get_component_by_uid').inputSchema).toEqual({
      type: 'object',
      properties: {
        uid: {type: 'string', description: expect.any(String)},
        includeHooks: {type: 'boolean', description: expect.any(String)},
      },
      required: ['uid'],
    });
    expect(getTool('react_get_component_by_dom_element').inputSchema).toEqual({
      type: 'object',
      properties: {
        element: {
          type: 'object',
          'x-mcp-type': 'HTMLElement',
          description: expect.any(String),
        },
      },
      required: ['element'],
    });
    expect(getTool('react_find_components').inputSchema).toEqual({
      type: 'object',
      properties: {
        name: {type: 'string', description: expect.any(String)},
        rootUid: {type: 'string', description: expect.any(String)},
        page: {type: 'number', description: expect.any(String)},
        pageSize: {type: 'number', description: expect.any(String)},
      },
      required: ['name'],
    });
    expect(getTool('react_start_profiling').inputSchema).toEqual({
      type: 'object',
      properties: {
        traceName: {type: 'string', description: expect.any(String)},
      },
    });
    expect(getTool('react_get_commit_report').inputSchema).toEqual({
      type: 'object',
      properties: {
        traceName: {type: 'string', description: expect.any(String)},
        commitIndex: {type: 'number', description: expect.any(String)},
      },
      required: ['traceName', 'commitIndex'],
    });
    expect(getTool('react_stop_profiling').inputSchema).toEqual({
      type: 'object',
      properties: {},
    });
  });

  it('react_get_component_tree returns the component tree', () => {
    function App() {
      return <div>hello</div>;
    }

    act(() => {
      ReactDOMClient.createRoot(container).render(<App />);
    });

    const result = getTool('react_get_component_tree').execute({});
    // Uids are assigned deterministically as fibers are first encountered. A
    // fiber's first child is assigned before the fiber itself, so App (the host
    // root's first child) is r0, the host root is r1, and the div is r2.
    expect(result).toEqual({
      nodes: [
        {
          uid: 'r1',
          type: 'root',
          name: 'createRoot()',
          key: null,
          firstChild: 'r0',
          nextSibling: null,
        },
        {
          uid: 'r0',
          type: 'function',
          name: 'App',
          key: null,
          firstChild: 'r2',
          nextSibling: null,
        },
        {
          uid: 'r2',
          type: 'host',
          name: 'div',
          key: null,
          firstChild: null,
          nextSibling: null,
        },
      ],
    });
  });

  it('react_find_components maps args and returns paginated results', () => {
    function Card() {
      return <div>card</div>;
    }
    function App() {
      return (
        <div>
          <Card key="a" />
          <Card key="b" />
        </div>
      );
    }

    act(() => {
      ReactDOMClient.createRoot(container).render(<App />);
    });

    const result = getTool('react_find_components').execute({name: 'Card'});
    // Matches are assigned in result order during row building: Card "a" is r0
    // (its div r1) and Card "b" is r2 (its div r3).
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      totalCount: 2,
      totalPages: 1,
      results: [
        {
          uid: 'r0',
          type: 'function',
          name: 'Card',
          key: 'a',
          firstChild: 'r1',
          nextSibling: null,
        },
        {
          uid: 'r2',
          type: 'function',
          name: 'Card',
          key: 'b',
          firstChild: 'r3',
          nextSibling: null,
        },
      ],
    });
  });

  it('react_get_component_by_uid returns props and hooks when requested', () => {
    function Counter() {
      const [count] = React.useState(3);
      return <div>{count}</div>;
    }

    act(() => {
      ReactDOMClient.createRoot(container).render(<Counter title="hi" />);
    });

    const result = getTool('react_get_component_tree').execute({});
    const tree = result.nodes;
    // Counter is the host root's first child, so it is r0 (host root r1, the
    // div r2).
    expect(tree).toEqual([
      {
        uid: 'r1',
        type: 'root',
        name: 'createRoot()',
        key: null,
        firstChild: 'r0',
        nextSibling: null,
      },
      {
        uid: 'r0',
        type: 'function',
        name: 'Counter',
        key: null,
        firstChild: 'r2',
        nextSibling: null,
      },
      {
        uid: 'r2',
        type: 'host',
        name: 'div',
        key: null,
        firstChild: null,
        nextSibling: null,
      },
    ]);

    const counter = tree.find(n => n.name === 'Counter');
    expect(counter.uid).toBe('r0');

    const info = getTool('react_get_component_by_uid').execute({
      uid: counter.uid,
      includeHooks: true,
    });
    expect(info).toEqual({
      uid: 'r0',
      type: 'function',
      name: 'Counter',
      props: {title: 'hi'},
      hooks: [{id: 0, name: 'State', value: 3, subHooks: []}],
    });

    const infoWithoutHooks = getTool('react_get_component_by_uid').execute({
      uid: counter.uid,
    });
    expect(infoWithoutHooks).toEqual({
      uid: 'r0',
      type: 'function',
      name: 'Counter',
      props: {title: 'hi'},
    });
  });

  it('react_get_component_by_dom_element returns the DOM element component', () => {
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
    const tree = getTool('react_get_component_tree').execute({}).nodes;
    const host = tree.find(n => n.name === 'button');
    const wrapper = tree.find(n => n.name === 'Wrapper');
    const result = getTool('react_get_component_by_dom_element').execute({
      element: button,
    });

    expect(result.uid).toBe(host.uid);
    expect(result.uid).not.toBe(wrapper.uid);
    expect(result).toMatchObject({
      type: 'host',
      name: 'button',
      props: {className: 'action'},
    });
  });

  it('react_get_component_by_dom_element returns DOM-oriented errors', () => {
    expect(getTool('react_get_component_by_dom_element').execute({})).toEqual({
      error: 'DOM element is required',
    });

    act(() => {
      ReactDOMClient.createRoot(container).render(<div className="host" />);
    });

    const unmanaged = document.createElement('span');
    expect(
      getTool('react_get_component_by_dom_element').execute({
        element: unmanaged,
      }),
    ).toEqual({error: 'DOM element is not managed by React'});
  });

  it('returns tool errors as a raw payload', () => {
    const result = getTool('react_get_component_by_uid').execute({
      uid: 'r9999',
    });
    expect(result).toEqual({error: 'Component not found: "r9999"'});
  });

  it('serializes Error tool payloads with causes', () => {
    const {buildToolGroup} = require('../DevToolsCdtMcp');
    const group = buildToolGroup({
      getComponentByUid: () => ({
        error: new Error('Failed to inspect hooks.', {
          cause: new Error('Cannot inspect hooks'),
        }),
      }),
    });
    const tool = group.tools.find(
      item => item.name === 'react_get_component_by_uid',
    );

    expect(tool.execute({uid: 'r0', includeHooks: true})).toEqual({
      error: 'Failed to inspect hooks. Cause: Cannot inspect hooks',
    });
  });

  it('profiling tools record and report commits through the integration', () => {
    function Counter({count}) {
      return <div>{'Count: ' + count}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    act(() => {
      root.render(<Counter count={0} />);
    });

    expect(
      getTool('react_start_profiling').execute({traceName: 'trace'}),
    ).toEqual({
      status: 'started',
      traceName: 'trace',
    });

    act(() => {
      root.render(<Counter count={1} />);
    });

    expect(getTool('react_stop_profiling').execute({})).toEqual({
      status: 'stopped',
      traceName: 'trace',
      commits: 1,
    });

    const overview = getTool('react_get_trace_overview').execute({
      traceName: 'trace',
    });
    expect(overview).toHaveLength(1);
    expect(overview[0].commit).toBe(0);

    // The commit report lists the fibers that rendered, sorted by actualDuration
    // descending, with uids assigned in commit-walk order: the host root r0
    // (widest duration), then Counter r1, then the div r2. Durations are
    // timing-dependent, so assert identity (uid/name/type) only.
    const report = getTool('react_get_commit_report').execute({
      traceName: 'trace',
      commitIndex: 0,
    });
    expect(
      report.components.map(c => ({
        uid: c.uid,
        name: c.name,
        type: c.type,
      })),
    ).toEqual([
      {uid: 'r0', name: 'createRoot()', type: 'root'},
      {uid: 'r1', name: 'Counter', type: 'function'},
      {uid: 'r2', name: 'div', type: 'host'},
    ]);
  });

  it('responds synchronously to discovery with the react tool group', () => {
    const discovered = discover();
    expect(discovered).not.toBe(null);
    expect(discovered.name).toBe('react');
    expect(discovered.tools.map(tool => tool.name)).toEqual(TOOL_NAMES);
  });

  it('builds the tool group lazily and memoizes it across discoveries', () => {
    // Repeated discovery returns the same instance, so component uids stay
    // stable across calls.
    expect(discover()).toBe(discover());
  });

  it('unregister removes the discovery listener', () => {
    unregister();
    // No listener responds, so chrome-devtools-mcp would discover nothing.
    expect(discover()).toBe(null);
  });

  it('tools are callable via window.__dtmcp.executeTool', async () => {
    function App() {
      return <div>hello</div>;
    }
    act(() => {
      ReactDOMClient.createRoot(container).render(<App />);
    });

    // Reproduce chrome-devtools-mcp's exact discovery + execution wiring.
    const event = new CustomEvent('devtoolstooldiscovery');
    // $FlowFixMe[prop-missing] chrome-devtools-mcp attaches respondWith
    event.respondWith = group => {
      globalThis.__dtmcp = {
        toolGroup: group,
        executeTool: async (toolName, args) => {
          const tool = group.tools.find(t => t.name === toolName);
          return tool.execute(args);
        },
      };
    };
    window.dispatchEvent(event);

    const result = await globalThis.__dtmcp.executeTool(
      'react_get_component_tree',
      {},
    );
    // Same deterministic uids as the direct react_get_component_tree path:
    // App r0, host root r1, div r2.
    expect(result).toEqual({
      nodes: [
        {
          uid: 'r1',
          type: 'root',
          name: 'createRoot()',
          key: null,
          firstChild: 'r0',
          nextSibling: null,
        },
        {
          uid: 'r0',
          type: 'function',
          name: 'App',
          key: null,
          firstChild: 'r2',
          nextSibling: null,
        },
        {
          uid: 'r2',
          type: 'host',
          name: 'div',
          key: null,
          firstChild: null,
          nextSibling: null,
        },
      ],
    });
  });
});
