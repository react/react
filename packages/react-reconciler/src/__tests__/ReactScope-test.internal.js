/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactFeatureFlags;
let ReactDOMServer;
let act;

describe('ReactScope', () => {
  beforeEach(() => {
    jest.resetModules();
    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableScopeAPI = true;
    React = require('react');

    const InternalTestUtils = require('internal-test-utils');
    act = InternalTestUtils.act;
  });

  describe('ReactDOM', () => {
    let ReactDOMClient;
    let container;

    beforeEach(() => {
      ReactDOMClient = require('react-dom/client');
      ReactDOMServer = require('react-dom/server');
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
      container = null;
    });

    // @gate enableScopeAPI
    it('DO_NOT_USE_queryAllNodes() works as intended', async () => {
      const testScopeQuery = (type, props) => true;
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <TestScope ref={scopeRef}>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
            <a ref={aRef}>A</a>
          </TestScope>
        ) : (
          <TestScope ref={scopeRef}>
            <a ref={aRef}>A</a>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
          </TestScope>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test toggle={true} />);
      });

      let nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(nodes).toEqual([divRef.current, spanRef.current, aRef.current]);
      await act(() => {
        root.render(<Test toggle={false} />);
      });

      nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(nodes).toEqual([aRef.current, divRef.current, spanRef.current]);
      await act(() => {
        root.render(null);
      });

      expect(scopeRef.current).toBe(null);
    });

    // @gate enableScopeAPI
    it('DO_NOT_USE_queryAllNodes() provides the correct host instance', async () => {
      const testScopeQuery = (type, props) => type === 'div';
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <TestScope ref={scopeRef}>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
            <a ref={aRef}>A</a>
          </TestScope>
        ) : (
          <TestScope ref={scopeRef}>
            <a ref={aRef}>A</a>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
          </TestScope>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test toggle={true} />);
      });

      let nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(nodes).toEqual([divRef.current]);
      let filterQuery = (type, props, instance) =>
        instance === spanRef.current || testScopeQuery(type, props);
      nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(filterQuery);
      expect(nodes).toEqual([divRef.current, spanRef.current]);
      filterQuery = (type, props, instance) =>
        [spanRef.current, aRef.current].includes(instance) ||
        testScopeQuery(type, props);
      nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(filterQuery);
      expect(nodes).toEqual([divRef.current, spanRef.current, aRef.current]);
      await act(() => {
        root.render(<Test toggle={false} />);
      });

      filterQuery = (type, props, instance) =>
        [spanRef.current, aRef.current].includes(instance) ||
        testScopeQuery(type, props);
      nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(filterQuery);
      expect(nodes).toEqual([aRef.current, divRef.current, spanRef.current]);
      await act(() => {
        root.render(null);
      });

      expect(scopeRef.current).toBe(null);
    });

    // @gate enableScopeAPI
    it('DO_NOT_USE_queryFirstNode() works as intended', async () => {
      const testScopeQuery = (type, props) => true;
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <TestScope ref={scopeRef}>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
            <a ref={aRef}>A</a>
          </TestScope>
        ) : (
          <TestScope ref={scopeRef}>
            <a ref={aRef}>A</a>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
          </TestScope>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test toggle={true} />);
      });

      let node = scopeRef.current.DO_NOT_USE_queryFirstNode(testScopeQuery);
      expect(node).toEqual(divRef.current);
      await act(() => {
        root.render(<Test toggle={false} />);
      });

      node = scopeRef.current.DO_NOT_USE_queryFirstNode(testScopeQuery);
      expect(node).toEqual(aRef.current);
      await act(() => {
        root.render(null);
      });

      expect(scopeRef.current).toBe(null);
    });

    // @gate enableScopeAPI
    it('containsNode() works as intended', async () => {
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();
      const outerSpan = React.createRef();
      const emRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <div>
            <span ref={outerSpan}>SPAN</span>
            <TestScope ref={scopeRef}>
              <div ref={divRef}>DIV</div>
              <span ref={spanRef}>SPAN</span>
              <a ref={aRef}>A</a>
            </TestScope>
            <em ref={emRef}>EM</em>
          </div>
        ) : (
          <div>
            <TestScope ref={scopeRef}>
              <a ref={aRef}>A</a>
              <div ref={divRef}>DIV</div>
              <span ref={spanRef}>SPAN</span>
              <em ref={emRef}>EM</em>
            </TestScope>
            <span ref={outerSpan}>SPAN</span>
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test toggle={true} />);
      });

      expect(scopeRef.current.containsNode(divRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(spanRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(aRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(outerSpan.current)).toBe(false);
      expect(scopeRef.current.containsNode(emRef.current)).toBe(false);
      await act(() => {
        root.render(<Test toggle={false} />);
      });

      expect(scopeRef.current.containsNode(divRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(spanRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(aRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(outerSpan.current)).toBe(false);
      expect(scopeRef.current.containsNode(emRef.current)).toBe(true);
      await act(() => {
        root.render(<Test toggle={true} />);
      });

      expect(scopeRef.current.containsNode(emRef.current)).toBe(false);
    });

    // @gate enableScopeAPI
    it('scopes support server-side rendering and hydration', async () => {
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();

      function Test({toggle}) {
        return (
          <div>
            <TestScope ref={scopeRef}>
              <div ref={divRef}>DIV</div>
              <span ref={spanRef}>SPAN</span>
              <a ref={aRef}>A</a>
            </TestScope>
            <div>Outside content!</div>
          </div>
        );
      }
      const html = ReactDOMServer.renderToString(<Test />);
      expect(html).toBe(
        '<div><div>DIV</div><span>SPAN</span><a>A</a><div>Outside content!</div></div>',
      );
      container.innerHTML = html;
      await act(() => {
        ReactDOMClient.hydrateRoot(container, <Test />);
      });
      const testScopeQuery = (type, props) => true;
      const nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(nodes).toEqual([divRef.current, spanRef.current, aRef.current]);
    });

    // @gate enableScopeAPI
    it('getChildContextValues() works as intended', async () => {
      const TestContext = React.createContext();
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <TestScope ref={scopeRef}>
            <TestContext.Provider value={1} />
          </TestScope>
        ) : (
          <TestScope ref={scopeRef}>
            <TestContext.Provider value={1} />
            <TestContext.Provider value={2} />
          </TestScope>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Test toggle={true} />);
      });

      let nodes = scopeRef.current.getChildContextValues(TestContext);
      expect(nodes).toEqual([1]);
      await act(() => {
        root.render(<Test toggle={false} />);
      });

      nodes = scopeRef.current.getChildContextValues(TestContext);
      expect(nodes).toEqual([1, 2]);
      await act(() => {
        root.render(null);
      });

      expect(scopeRef.current).toBe(null);
    });

    // @gate enableScopeAPI
    it('correctly works with suspended boundaries that are hydrated', async () => {
      let suspend = false;
      let resolve;
      const promise = new Promise(resolvePromise => (resolve = resolvePromise));
      const ref = React.createRef();
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const testScopeQuery = (type, props) => true;

      function Child() {
        if (suspend) {
          throw promise;
        } else {
          return 'Hello';
        }
      }

      function App() {
        return (
          <div>
            <TestScope ref={scopeRef}>
              <React.Suspense fallback="Loading...">
                <span ref={ref}>
                  <Child />
                </span>
              </React.Suspense>
            </TestScope>
          </div>
        );
      }

      // First we render the final HTML. With the streaming renderer
      // this may have suspense points on the server but here we want
      // to test the completed HTML. Don't suspend on the server.
      suspend = false;
      const finalHTML = ReactDOMServer.renderToString(<App />);

      const container2 = document.createElement('div');
      container2.innerHTML = finalHTML;

      const span = container2.getElementsByTagName('span')[0];

      // On the client we don't have all data yet but we want to start
      // hydrating anyway.
      suspend = true;
      await act(() => ReactDOMClient.hydrateRoot(container2, <App />));

      // This should not cause a runtime exception, see:
      // https://github.com/facebook/react/pull/18184
      scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(ref.current).toBe(null);

      // Resolving the promise should continue hydration
      suspend = false;
      await act(async () => {
        resolve();
        await promise;
      });

      // We should now have hydrated with a ref on the existing span.
      expect(ref.current).toBe(span);
    });
  });

  describe('ReactTestRenderer', () => {
    let ReactTestRenderer;

    beforeEach(() => {
      ReactTestRenderer = require('react-test-renderer');
    });

    // @gate enableScopeAPI
    it('DO_NOT_USE_queryAllNodes() works as intended', async () => {
      const testScopeQuery = (type, props) => true;
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <TestScope ref={scopeRef}>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
            <a ref={aRef}>A</a>
          </TestScope>
        ) : (
          <TestScope ref={scopeRef}>
            <a ref={aRef}>A</a>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
          </TestScope>
        );
      }

      let renderer;
      await act(
        () =>
          (renderer = ReactTestRenderer.create(<Test toggle={true} />, {
            createNodeMock: element => {
              return element;
            },
            unstable_isConcurrent: true,
          })),
      );
      let nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(nodes).toEqual([divRef.current, spanRef.current, aRef.current]);
      await act(() => renderer.update(<Test toggle={false} />));
      nodes = scopeRef.current.DO_NOT_USE_queryAllNodes(testScopeQuery);
      expect(nodes).toEqual([aRef.current, divRef.current, spanRef.current]);
    });

    // @gate enableScopeAPI
    it('DO_NOT_USE_queryFirstNode() works as intended', async () => {
      const testScopeQuery = (type, props) => true;
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <TestScope ref={scopeRef}>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
            <a ref={aRef}>A</a>
          </TestScope>
        ) : (
          <TestScope ref={scopeRef}>
            <a ref={aRef}>A</a>
            <div ref={divRef}>DIV</div>
            <span ref={spanRef}>SPAN</span>
          </TestScope>
        );
      }

      let renderer;
      await act(
        () =>
          (renderer = ReactTestRenderer.create(<Test toggle={true} />, {
            createNodeMock: element => {
              return element;
            },
            unstable_isConcurrent: true,
          })),
      );
      let node = scopeRef.current.DO_NOT_USE_queryFirstNode(testScopeQuery);
      expect(node).toEqual(divRef.current);
      await act(() => renderer.update(<Test toggle={false} />));

      node = scopeRef.current.DO_NOT_USE_queryFirstNode(testScopeQuery);
      expect(node).toEqual(aRef.current);
    });

    // @gate enableScopeAPI
    it('containsNode() works as intended', async () => {
      const TestScope = React.unstable_Scope;
      const scopeRef = React.createRef();
      const divRef = React.createRef();
      const spanRef = React.createRef();
      const aRef = React.createRef();
      const outerSpan = React.createRef();
      const emRef = React.createRef();

      function Test({toggle}) {
        return toggle ? (
          <div>
            <span ref={outerSpan}>SPAN</span>
            <TestScope ref={scopeRef}>
              <div ref={divRef}>DIV</div>
              <span ref={spanRef}>SPAN</span>
              <a ref={aRef}>A</a>
            </TestScope>
            <em ref={emRef}>EM</em>
          </div>
        ) : (
          <div>
            <TestScope ref={scopeRef}>
              <a ref={aRef}>A</a>
              <div ref={divRef}>DIV</div>
              <span ref={spanRef}>SPAN</span>
              <em ref={emRef}>EM</em>
            </TestScope>
            <span ref={outerSpan}>SPAN</span>
          </div>
        );
      }

      let renderer;
      await act(
        () =>
          (renderer = ReactTestRenderer.create(<Test toggle={true} />, {
            createNodeMock: element => {
              return element;
            },
            unstable_isConcurrent: true,
          })),
      );
      expect(scopeRef.current.containsNode(divRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(spanRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(aRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(outerSpan.current)).toBe(false);
      expect(scopeRef.current.containsNode(emRef.current)).toBe(false);
      await act(() => renderer.update(<Test toggle={false} />));
      expect(scopeRef.current.containsNode(divRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(spanRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(aRef.current)).toBe(true);
      expect(scopeRef.current.containsNode(outerSpan.current)).toBe(false);
      expect(scopeRef.current.containsNode(emRef.current)).toBe(true);
      await act(() => renderer.update(<Test toggle={true} />));
      expect(scopeRef.current.containsNode(emRef.current)).toBe(false);
    });
  });
});
