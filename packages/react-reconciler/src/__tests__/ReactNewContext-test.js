/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React = require('react');
let useContext;
let ReactNoop;
let Scheduler;
let gen;
let waitForAll;
let waitFor;
let waitForThrow;
let assertConsoleErrorDev;

describe('ReactNewContext', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    useContext = React.useContext;
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    gen = require('random-seed');

    ({
      waitForAll,
      waitFor,
      waitForThrow,
      assertConsoleErrorDev,
    } = require('internal-test-utils'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function Text(props) {
    Scheduler.log(props.text);
    return <span prop={props.text} />;
  }

  function span(prop) {
    return {type: 'span', children: [], prop, hidden: false};
  }

  function readContext(Context) {
    const dispatcher =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H;
    return dispatcher.readContext(Context);
  }

  // Note: This is based on a similar component we use in www. We can delete
  // once the extra div wrapper is no longer necessary.
  function LegacyHiddenDiv({children, mode}) {
    return (
      <div hidden={mode === 'hidden'}>
        <React.unstable_LegacyHidden
          mode={mode === 'hidden' ? 'unstable-defer-without-hiding' : mode}>
          {children}
        </React.unstable_LegacyHidden>
      </div>
    );
  }

  // We have several ways of reading from context. sharedContextTests runs
  // a suite of tests for a given context consumer implementation.
  sharedContextTests('Context.Consumer', Context => Context.Consumer);
  sharedContextTests(
    'useContext inside function component',
    Context =>
      function Consumer(props) {
        const contextValue = useContext(Context);
        const render = props.children;
        return render(contextValue);
      },
  );
  sharedContextTests('useContext inside forwardRef component', Context =>
    React.forwardRef(function Consumer(props, ref) {
      const contextValue = useContext(Context);
      const render = props.children;
      return render(contextValue);
    }),
  );
  sharedContextTests('useContext inside memoized function component', Context =>
    React.memo(function Consumer(props) {
      const contextValue = useContext(Context);
      const render = props.children;
      return render(contextValue);
    }),
  );
  sharedContextTests(
    'readContext(Context) inside class component',
    Context =>
      class Consumer extends React.Component {
        render() {
          const contextValue = readContext(Context);
          const render = this.props.children;
          return render(contextValue);
        }
      },
  );
  sharedContextTests(
    'readContext(Context) inside pure class component',
    Context =>
      class Consumer extends React.PureComponent {
        render() {
          const contextValue = readContext(Context);
          const render = this.props.children;
          return render(contextValue);
        }
      },
  );

  function sharedContextTests(label, getConsumer) {
    describe(`reading context with ${label}`, () => {
      it('simple mount and update', async () => {
        const Context = React.createContext(1);
        const Consumer = getConsumer(Context);

        const Indirection = React.Fragment;

        function App(props) {
          return (
            <Context.Provider value={props.value}>
              <Indirection>
                <Indirection>
                  <Consumer>
                    {value => <span prop={'Result: ' + value} />}
                  </Consumer>
                </Indirection>
              </Indirection>
            </Context.Provider>
          );
        }

        ReactNoop.render(<App value={2} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 2" />);

        // Update
        ReactNoop.render(<App value={3} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 3" />);
      });

      it('propagates through shouldComponentUpdate false', async () => {
        const Context = React.createContext(1);
        const ContextConsumer = getConsumer(Context);

        function Provider(props) {
          Scheduler.log('Provider');
          return (
            <Context.Provider value={props.value}>
              {props.children}
            </Context.Provider>
          );
        }

        function Consumer(props) {
          Scheduler.log('Consumer');
          return (
            <ContextConsumer>
              {value => {
                Scheduler.log('Consumer render prop');
                return <span prop={'Result: ' + value} />;
              }}
            </ContextConsumer>
          );
        }

        class Indirection extends React.Component {
          shouldComponentUpdate() {
            return false;
          }
          render() {
            Scheduler.log('Indirection');
            return this.props.children;
          }
        }

        function App(props) {
          Scheduler.log('App');
          return (
            <Provider value={props.value}>
              <Indirection>
                <Indirection>
                  <Consumer />
                </Indirection>
              </Indirection>
            </Provider>
          );
        }

        ReactNoop.render(<App value={2} />);
        await waitForAll([
          'App',
          'Provider',
          'Indirection',
          'Indirection',
          'Consumer',
          'Consumer render prop',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 2" />);

        // Update
        ReactNoop.render(<App value={3} />);
        await waitForAll(['App', 'Provider', 'Consumer render prop']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 3" />);
      });

      it('consumers bail out if context value is the same', async () => {
        const Context = React.createContext(1);
        const ContextConsumer = getConsumer(Context);

        function Provider(props) {
          Scheduler.log('Provider');
          return (
            <Context.Provider value={props.value}>
              {props.children}
            </Context.Provider>
          );
        }

        function Consumer(props) {
          Scheduler.log('Consumer');
          return (
            <ContextConsumer>
              {value => {
                Scheduler.log('Consumer render prop');
                return <span prop={'Result: ' + value} />;
              }}
            </ContextConsumer>
          );
        }

        class Indirection extends React.Component {
          shouldComponentUpdate() {
            return false;
          }
          render() {
            Scheduler.log('Indirection');
            return this.props.children;
          }
        }

        function App(props) {
          Scheduler.log('App');
          return (
            <Provider value={props.value}>
              <Indirection>
                <Indirection>
                  <Consumer />
                </Indirection>
              </Indirection>
            </Provider>
          );
        }

        ReactNoop.render(<App value={2} />);
        await waitForAll([
          'App',
          'Provider',
          'Indirection',
          'Indirection',
          'Consumer',
          'Consumer render prop',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 2" />);

        // Update with the same context value
        ReactNoop.render(<App value={2} />);
        await waitForAll([
          'App',
          'Provider',
          // Don't call render prop again
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 2" />);
      });

      it('nested providers', async () => {
        const Context = React.createContext(1);
        const Consumer = getConsumer(Context);

        function Provider(props) {
          return (
            <Consumer>
              {contextValue => (
                // Multiply previous context value by 2, unless prop overrides
                <Context.Provider value={props.value || contextValue * 2}>
                  {props.children}
                </Context.Provider>
              )}
            </Consumer>
          );
        }

        class Indirection extends React.Component {
          shouldComponentUpdate() {
            return false;
          }
          render() {
            return this.props.children;
          }
        }

        function App(props) {
          return (
            <Provider value={props.value}>
              <Indirection>
                <Provider>
                  <Indirection>
                    <Provider>
                      <Indirection>
                        <Consumer>
                          {value => <span prop={'Result: ' + value} />}
                        </Consumer>
                      </Indirection>
                    </Provider>
                  </Indirection>
                </Provider>
              </Indirection>
            </Provider>
          );
        }

        ReactNoop.render(<App value={2} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 8" />);

        // Update
        ReactNoop.render(<App value={3} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: 12" />);
      });

      it('should provide the correct (default) values to consumers outside of a provider', async () => {
        const FooContext = React.createContext({value: 'foo-initial'});
        const BarContext = React.createContext({value: 'bar-initial'});
        const FooConsumer = getConsumer(FooContext);
        const BarConsumer = getConsumer(BarContext);

        const Verify = ({actual, expected}) => {
          expect(expected).toBe(actual);
          return null;
        };

        ReactNoop.render(
          <>
            <BarContext.Provider value={{value: 'bar-updated'}}>
              <BarConsumer>
                {({value}) => <Verify actual={value} expected="bar-updated" />}
              </BarConsumer>

              <FooContext.Provider value={{value: 'foo-updated'}}>
                <FooConsumer>
                  {({value}) => (
                    <Verify actual={value} expected="foo-updated" />
                  )}
                </FooConsumer>
              </FooContext.Provider>
            </BarContext.Provider>

            <FooConsumer>
              {({value}) => <Verify actual={value} expected="foo-initial" />}
            </FooConsumer>
            <BarConsumer>
              {({value}) => <Verify actual={value} expected="bar-initial" />}
            </BarConsumer>
          </>,
        );
        await waitForAll([]);
      });

      it('multiple consumers in different branches', async () => {
        const Context = React.createContext(1);
        const Consumer = getConsumer(Context);

        function Provider(props) {
          return (
            <Context.Consumer>
              {contextValue => (
                // Multiply previous context value by 2, unless prop overrides
                <Context.Provider value={props.value || contextValue * 2}>
                  {props.children}
                </Context.Provider>
              )}
            </Context.Consumer>
          );
        }

        class Indirection extends React.Component {
          shouldComponentUpdate() {
            return false;
          }
          render() {
            return this.props.children;
          }
        }

        function App(props) {
          return (
            <Provider value={props.value}>
              <Indirection>
                <Indirection>
                  <Provider>
                    <Consumer>
                      {value => <span prop={'Result: ' + value} />}
                    </Consumer>
                  </Provider>
                </Indirection>
                <Indirection>
                  <Consumer>
                    {value => <span prop={'Result: ' + value} />}
                  </Consumer>
                </Indirection>
              </Indirection>
            </Provider>
          );
        }

        ReactNoop.render(<App value={2} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Result: 4" />
            <span prop="Result: 2" />
          </>,
        );

        // Update
        ReactNoop.render(<App value={3} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Result: 6" />
            <span prop="Result: 3" />
          </>,
        );

        // Another update
        ReactNoop.render(<App value={4} />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Result: 8" />
            <span prop="Result: 4" />
          </>,
        );
      });

      it('compares context values with Object.is semantics', async () => {
        const Context = React.createContext(1);
        const ContextConsumer = getConsumer(Context);

        function Provider(props) {
          Scheduler.log('Provider');
          return (
            <Context.Provider value={props.value}>
              {props.children}
            </Context.Provider>
          );
        }

        function Consumer(props) {
          Scheduler.log('Consumer');
          return (
            <ContextConsumer>
              {value => {
                Scheduler.log('Consumer render prop');
                return <span prop={'Result: ' + value} />;
              }}
            </ContextConsumer>
          );
        }

        class Indirection extends React.Component {
          shouldComponentUpdate() {
            return false;
          }
          render() {
            Scheduler.log('Indirection');
            return this.props.children;
          }
        }

        function App(props) {
          Scheduler.log('App');
          return (
            <Provider value={props.value}>
              <Indirection>
                <Indirection>
                  <Consumer />
                </Indirection>
              </Indirection>
            </Provider>
          );
        }

        ReactNoop.render(<App value={NaN} />);
        await waitForAll([
          'App',
          'Provider',
          'Indirection',
          'Indirection',
          'Consumer',
          'Consumer render prop',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: NaN" />);

        // Update
        ReactNoop.render(<App value={NaN} />);
        await waitForAll([
          'App',
          'Provider',
          // Consumer should not re-render again
          // 'Consumer render prop',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Result: NaN" />);
      });

      it('context unwinds when interrupted', async () => {
        const Context = React.createContext('Default');
        const ContextConsumer = getConsumer(Context);

        function Consumer(props) {
          return (
            <ContextConsumer>
              {value => <span prop={'Result: ' + value} />}
            </ContextConsumer>
          );
        }

        function BadRender() {
          throw new Error('Bad render');
        }

        class ErrorBoundary extends React.Component {
          state = {error: null};
          componentDidCatch(error) {
            this.setState({error});
          }
          render() {
            if (this.state.error) {
              return null;
            }
            return this.props.children;
          }
        }

        function App(props) {
          return (
            <>
              <Context.Provider value="Does not unwind">
                <ErrorBoundary>
                  <Context.Provider value="Unwinds after BadRender throws">
                    <BadRender />
                  </Context.Provider>
                </ErrorBoundary>
                <Consumer />
              </Context.Provider>
            </>
          );
        }

        ReactNoop.render(<App value="A" />);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(
          // The second provider should use the default value.
          <span prop="Result: Does not unwind" />,
        );
      });

      it("does not re-render if there's an update in a child", async () => {
        const Context = React.createContext(0);
        const Consumer = getConsumer(Context);

        let child;
        class Child extends React.Component {
          state = {step: 0};
          render() {
            Scheduler.log('Child');
            return (
              <span
                prop={`Context: ${this.props.context}, Step: ${this.state.step}`}
              />
            );
          }
        }

        function App(props) {
          return (
            <Context.Provider value={props.value}>
              <Consumer>
                {value => {
                  Scheduler.log('Consumer render prop');
                  return <Child ref={inst => (child = inst)} context={value} />;
                }}
              </Consumer>
            </Context.Provider>
          );
        }

        // Initial mount
        ReactNoop.render(<App value={1} />);
        await waitForAll(['Consumer render prop', 'Child']);
        expect(ReactNoop).toMatchRenderedOutput(
          <span prop="Context: 1, Step: 0" />,
        );

        child.setState({step: 1});
        await waitForAll(['Child']);
        expect(ReactNoop).toMatchRenderedOutput(
          <span prop="Context: 1, Step: 1" />,
        );
      });

      it('consumer bails out if value is unchanged and something above bailed out', async () => {
        const Context = React.createContext(0);
        const Consumer = getConsumer(Context);

        function renderChildValue(value) {
          Scheduler.log('Consumer');
          return <span prop={value} />;
        }

        function ChildWithInlineRenderCallback() {
          Scheduler.log('ChildWithInlineRenderCallback');
          // Note: we are intentionally passing an inline arrow. Don't refactor.
          return <Consumer>{value => renderChildValue(value)}</Consumer>;
        }

        function ChildWithCachedRenderCallback() {
          Scheduler.log('ChildWithCachedRenderCallback');
          return <Consumer>{renderChildValue}</Consumer>;
        }

        class PureIndirection extends React.PureComponent {
          render() {
            Scheduler.log('PureIndirection');
            return (
              <>
                <ChildWithInlineRenderCallback />
                <ChildWithCachedRenderCallback />
              </>
            );
          }
        }

        class App extends React.Component {
          render() {
            Scheduler.log('App');
            return (
              <Context.Provider value={this.props.value}>
                <PureIndirection />
              </Context.Provider>
            );
          }
        }

        // Initial mount
        ReactNoop.render(<App value={1} />);
        await waitForAll([
          'App',
          'PureIndirection',
          'ChildWithInlineRenderCallback',
          'Consumer',
          'ChildWithCachedRenderCallback',
          'Consumer',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop={1} />
            <span prop={1} />
          </>,
        );

        // Update (bailout)
        ReactNoop.render(<App value={1} />);
        await waitForAll(['App']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop={1} />
            <span prop={1} />
          </>,
        );

        // Update (no bailout)
        ReactNoop.render(<App value={2} />);
        await waitForAll(['App', 'Consumer', 'Consumer']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop={2} />
            <span prop={2} />
          </>,
        );
      });

      // @gate enableLegacyHidden
      it("context consumer doesn't bail out inside hidden subtree", async () => {
        const Context = React.createContext('dark');
        const Consumer = getConsumer(Context);

        function App({theme}) {
          return (
            <Context.Provider value={theme}>
              <LegacyHiddenDiv mode="hidden">
                <Consumer>{value => <Text text={value} />}</Consumer>
              </LegacyHiddenDiv>
            </Context.Provider>
          );
        }

        ReactNoop.render(<App theme="dark" />);
        await waitForAll(['dark']);
        expect(ReactNoop.getChildrenAsJSX()).toEqual(
          <div hidden={true}>
            <span prop="dark" />
          </div>,
        );

        ReactNoop.render(<App theme="light" />);
        await waitForAll(['light']);
        expect(ReactNoop.getChildrenAsJSX()).toEqual(
          <div hidden={true}>
            <span prop="light" />
          </div>,
        );
      });

      // This is a regression case for https://github.com/facebook/react/issues/12389.
      it('does not run into an infinite loop', async () => {
        const Context = React.createContext(null);
        const Consumer = getConsumer(Context);

        class App extends React.Component {
          renderItem(id) {
            return (
              <span key={id}>
                <Consumer>{() => <span>inner</span>}</Consumer>
                <span>outer</span>
              </span>
            );
          }
          renderList() {
            const list = [1, 2].map(id => this.renderItem(id));
            if (this.props.reverse) {
              list.reverse();
            }
            return list;
          }
          render() {
            return (
              <Context.Provider value={{}}>
                {this.renderList()}
              </Context.Provider>
            );
          }
        }

        ReactNoop.render(<App reverse={false} />);
        await waitForAll([]);
        ReactNoop.render(<App reverse={true} />);
        await waitForAll([]);
        ReactNoop.render(<App reverse={false} />);
        await waitForAll([]);
      });

      // This is a regression case for https://github.com/facebook/react/issues/12686
      it('does not skip some siblings', async () => {
        const Context = React.createContext(0);
        const ContextConsumer = getConsumer(Context);

        class App extends React.Component {
          state = {
            step: 0,
          };

          render() {
            Scheduler.log('App');
            return (
              <Context.Provider value={this.state.step}>
                <StaticContent />
                {this.state.step > 0 && <Indirection />}
              </Context.Provider>
            );
          }
        }

        class StaticContent extends React.PureComponent {
          render() {
            return (
              <>
                <>
                  <span prop="static 1" />
                  <span prop="static 2" />
                </>
              </>
            );
          }
        }

        class Indirection extends React.PureComponent {
          render() {
            return (
              <ContextConsumer>
                {value => {
                  Scheduler.log('Consumer');
                  return <span prop={value} />;
                }}
              </ContextConsumer>
            );
          }
        }

        // Initial mount
        let inst;
        ReactNoop.render(<App ref={ref => (inst = ref)} />);
        await waitForAll(['App']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="static 1" />
            <span prop="static 2" />
          </>,
        );
        // Update the first time
        inst.setState({step: 1});
        await waitForAll(['App', 'Consumer']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="static 1" />
            <span prop="static 2" />
            <span prop={1} />
          </>,
        );
        // Update the second time
        inst.setState({step: 2});
        await waitForAll(['App', 'Consumer']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="static 1" />
            <span prop="static 2" />
            <span prop={2} />
          </>,
        );
      });
    });
  }

  describe('Context.Provider', () => {
    it('warns if no value prop provided', async () => {
      const Context = React.createContext();

      ReactNoop.render(
        <Context.Provider anyPropNameOtherThanValue="value could be anything" />,
      );

      await waitForAll([]);
      assertConsoleErrorDev([
        'The `value` prop is required for the `<Context.Provider>`. Did you misspell it or forget to pass it?',
      ]);
    });

    it('warns if multiple renderers concurrently render the same context', async () => {
      spyOnDev(console, 'error').mockImplementation(() => {});
      const Context = React.createContext(0);

      function Foo(props) {
        Scheduler.log('Foo');
        return null;
      }

      function App(props) {
        return (
          <Context.Provider value={props.value}>
            <Foo />
            <Foo />
          </Context.Provider>
        );
      }

      React.startTransition(() => {
        ReactNoop.render(<App value={1} />);
      });
      // Render past the Provider, but don't commit yet
      await waitFor(['Foo']);

      // Get a new copy of ReactNoop
      jest.resetModules();
      React = require('react');
      ReactNoop = require('react-noop-renderer');
      Scheduler = require('scheduler');
      const InternalTestUtils = require('internal-test-utils');
      waitForAll = InternalTestUtils.waitForAll;
      waitFor = InternalTestUtils.waitFor;

      // Render the provider again using a different renderer
      ReactNoop.render(<App value={1} />);
      await waitForAll(['Foo', 'Foo']);

      if (__DEV__) {
        expect(console.error.mock.calls[0][0]).toContain(
          'Detected multiple renderers concurrently rendering the same ' +
            'context provider. This is currently unsupported',
        );
      }
    });

    it('does not warn if multiple renderers use the same context sequentially', async () => {
      spyOnDev(console, 'error');
      const Context = React.createContext(0);

      function Foo(props) {
        Scheduler.log('Foo');
        return null;
      }

      function App(props) {
        return (
          <Context.Provider value={props.value}>
            <Foo />
            <Foo />
          </Context.Provider>
        );
      }

      React.startTransition(() => {
        ReactNoop.render(<App value={1} />);
      });
      await waitForAll(['Foo', 'Foo']);

      // Get a new copy of ReactNoop
      jest.resetModules();
      React = require('react');
      ReactNoop = require('react-noop-renderer');
      Scheduler = require('scheduler');
      const InternalTestUtils = require('internal-test-utils');
      waitForAll = InternalTestUtils.waitForAll;
      waitFor = InternalTestUtils.waitFor;

      // Render the provider again using a different renderer
      ReactNoop.render(<App value={1} />);
      await waitForAll(['Foo', 'Foo']);

      if (__DEV__) {
        expect(console.error).not.toHaveBeenCalled();
      }
    });

    it('provider bails out if children and value are unchanged (like sCU)', async () => {
      const Context = React.createContext(0);

      function Child() {
        Scheduler.log('Child');
        return <span prop="Child" />;
      }

      const children = <Child />;

      function App(props) {
        Scheduler.log('App');
        return (
          <Context.Provider value={props.value}>{children}</Context.Provider>
        );
      }

      // Initial mount
      ReactNoop.render(<App value={1} />);
      await waitForAll(['App', 'Child']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Child" />);

      // Update
      ReactNoop.render(<App value={1} />);
      await waitForAll([
        'App',
        // Child does not re-render
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Child" />);
    });

    // @gate !disableLegacyContext
    it('provider does not bail out if legacy context changed above', async () => {
      const Context = React.createContext(0);

      function Child() {
        Scheduler.log('Child');
        return <span prop="Child" />;
      }

      const children = <Child />;

      class LegacyProvider extends React.Component {
        static childContextTypes = {
          legacyValue: () => {},
        };
        state = {legacyValue: 1};
        getChildContext() {
          return {legacyValue: this.state.legacyValue};
        }
        render() {
          Scheduler.log('LegacyProvider');
          return this.props.children;
        }
      }

      class App extends React.Component {
        state = {value: 1};
        render() {
          Scheduler.log('App');
          return (
            <Context.Provider value={this.state.value}>
              {this.props.children}
            </Context.Provider>
          );
        }
      }

      const legacyProviderRef = React.createRef();
      const appRef = React.createRef();

      // Initial mount
      ReactNoop.render(
        <LegacyProvider ref={legacyProviderRef}>
          <App ref={appRef} value={1}>
            {children}
          </App>
        </LegacyProvider>,
      );
      await waitForAll(['LegacyProvider', 'App', 'Child']);
      assertConsoleErrorDev([
        'LegacyProvider uses the legacy childContextTypes API which will soon be removed. ' +
          'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
          '    in LegacyProvider (at **)',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Child" />);

      // Update App with same value (should bail out)
      appRef.current.setState({value: 1});
      await waitForAll(['App']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Child" />);

      // Update LegacyProvider (should not bail out)
      legacyProviderRef.current.setState({value: 1});
      await waitForAll(['LegacyProvider', 'App', 'Child']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Child" />);

      // Update App with same value (should bail out)
      appRef.current.setState({value: 1});
      await waitForAll(['App']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Child" />);
    });
  });

  describe('Context.Consumer', () => {
    it('warns if child is not a function', async () => {
      spyOnDev(console, 'error').mockImplementation(() => {});
      const Context = React.createContext(0);
      ReactNoop.render(<Context.Consumer />);
      await waitForThrow('is not a function');
      if (__DEV__) {
        expect(console.error.mock.calls[0][0]).toContain(
          'A context consumer was rendered with multiple children, or a child ' +
            "that isn't a function",
        );
      }
    });

    it('can read other contexts inside consumer render prop', async () => {
      const FooContext = React.createContext(0);
      const BarContext = React.createContext(0);

      function FooAndBar() {
        return (
          <FooContext.Consumer>
            {foo => {
              const bar = readContext(BarContext);
              return <Text text={`Foo: ${foo}, Bar: ${bar}`} />;
            }}
          </FooContext.Consumer>
        );
      }

      class Indirection extends React.Component {
        shouldComponentUpdate() {
          return false;
        }
        render() {
          return this.props.children;
        }
      }

      function App(props) {
        return (
          <FooContext.Provider value={props.foo}>
            <BarContext.Provider value={props.bar}>
              <Indirection>
                <FooAndBar />
              </Indirection>
            </BarContext.Provider>
          </FooContext.Provider>
        );
      }

      ReactNoop.render(<App foo={1} bar={1} />);
      await waitForAll(['Foo: 1, Bar: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Foo: 1, Bar: 1" />);

      // Update foo
      ReactNoop.render(<App foo={2} bar={1} />);
      await waitForAll(['Foo: 2, Bar: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Foo: 2, Bar: 1" />);

      // Update bar
      ReactNoop.render(<App foo={2} bar={2} />);
      await waitForAll(['Foo: 2, Bar: 2']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Foo: 2, Bar: 2" />);
    });

    // Context consumer bails out on propagating "deep" updates when `value` hasn't changed.
    // However, it doesn't bail out from rendering if the component above it re-rendered anyway.
    // If we bailed out on referential equality, it would be confusing that you
    // can call this.setState(), but an autobound render callback "blocked" the update.
    // https://github.com/facebook/react/pull/12470#issuecomment-376917711
    it('consumer does not bail out if there were no bailouts above it', async () => {
      const Context = React.createContext(0);
      const Consumer = Context.Consumer;

      class App extends React.Component {
        state = {
          text: 'hello',
        };

        renderConsumer = context => {
          Scheduler.log('App#renderConsumer');
          return <span prop={this.state.text} />;
        };

        render() {
          Scheduler.log('App');
          return (
            <Context.Provider value={this.props.value}>
              <Consumer>{this.renderConsumer}</Consumer>
            </Context.Provider>
          );
        }
      }

      // Initial mount
      let inst;
      ReactNoop.render(<App value={1} ref={ref => (inst = ref)} />);
      await waitForAll(['App', 'App#renderConsumer']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="hello" />);

      // Update
      inst.setState({text: 'goodbye'});
      await waitForAll(['App', 'App#renderConsumer']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="goodbye" />);
    });
  });

  describe('readContext', () => {
    // Unstable changedBits API was removed. Port this test to context selectors
    // once that exists.
    // @gate FIXME
    it('can read the same context multiple times in the same function', async () => {
      const Context = React.createContext({foo: 0, bar: 0, baz: 0}, (a, b) => {
        let result = 0;
        if (a.foo !== b.foo) {
          result |= 0b001;
        }
        if (a.bar !== b.bar) {
          result |= 0b010;
        }
        if (a.baz !== b.baz) {
          result |= 0b100;
        }
        return result;
      });

      function Provider(props) {
        return (
          <Context.Provider
            value={{foo: props.foo, bar: props.bar, baz: props.baz}}>
            {props.children}
          </Context.Provider>
        );
      }

      function FooAndBar() {
        const {foo} = readContext(Context, 0b001);
        const {bar} = readContext(Context, 0b010);
        return <Text text={`Foo: ${foo}, Bar: ${bar}`} />;
      }

      function Baz() {
        const {baz} = readContext(Context, 0b100);
        return <Text text={'Baz: ' + baz} />;
      }

      class Indirection extends React.Component {
        shouldComponentUpdate() {
          return false;
        }
        render() {
          return this.props.children;
        }
      }

      function App(props) {
        return (
          <Provider foo={props.foo} bar={props.bar} baz={props.baz}>
            <Indirection>
              <Indirection>
                <FooAndBar />
              </Indirection>
              <Indirection>
                <Baz />
              </Indirection>
            </Indirection>
          </Provider>
        );
      }

      ReactNoop.render(<App foo={1} bar={1} baz={1} />);
      await waitForAll(['Foo: 1, Bar: 1', 'Baz: 1']);
      expect(ReactNoop).toMatchRenderedOutput([
        <span prop="Foo: 1, Bar: 1" />,
        <span prop="Baz: 1" />,
      ]);

      // Update only foo
      ReactNoop.render(<App foo={2} bar={1} baz={1} />);
      await waitForAll(['Foo: 2, Bar: 1']);
      expect(ReactNoop).toMatchRenderedOutput([
        <span prop="Foo: 2, Bar: 1" />,
        <span prop="Baz: 1" />,
      ]);

      // Update only bar
      ReactNoop.render(<App foo={2} bar={2} baz={1} />);
      await waitForAll(['Foo: 2, Bar: 2']);
      expect(ReactNoop).toMatchRenderedOutput([
        <span prop="Foo: 2, Bar: 2" />,
        <span prop="Baz: 1" />,
      ]);

      // Update only baz
      ReactNoop.render(<App foo={2} bar={2} baz={2} />);
      await waitForAll(['Baz: 2']);
      expect(ReactNoop).toMatchRenderedOutput([
        <span prop="Foo: 2, Bar: 2" />,
        <span prop="Baz: 2" />,
      ]);
    });

    // Context consumer bails out on propagating "deep" updates when `value` hasn't changed.
    // However, it doesn't bail out from rendering if the component above it re-rendered anyway.
    // If we bailed out on referential equality, it would be confusing that you
    // can call this.setState(), but an autobound render callback "blocked" the update.
    // https://github.com/facebook/react/pull/12470#issuecomment-376917711
    it('does not bail out if there were no bailouts above it', async () => {
      const Context = React.createContext(0);

      class Consumer extends React.Component {
        render() {
          const contextValue = readContext(Context);
          return this.props.children(contextValue);
        }
      }

      class App extends React.Component {
        state = {
          text: 'hello',
        };

        renderConsumer = context => {
          Scheduler.log('App#renderConsumer');
          return <span prop={this.state.text} />;
        };

        render() {
          Scheduler.log('App');
          return (
            <Context.Provider value={this.props.value}>
              <Consumer>{this.renderConsumer}</Consumer>
            </Context.Provider>
          );
        }
      }

      // Initial mount
      let inst;
      ReactNoop.render(<App value={1} ref={ref => (inst = ref)} />);
      await waitForAll(['App', 'App#renderConsumer']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="hello" />);

      // Update
      inst.setState({text: 'goodbye'});
      await waitForAll(['App', 'App#renderConsumer']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="goodbye" />);
    });

    it('warns when reading context inside render phase class setState updater', async () => {
      const ThemeContext = React.createContext('light');

      class Cls extends React.Component {
        state = {};
        render() {
          this.setState(() => {
            readContext(ThemeContext);
          });
          return null;
        }
      }

      ReactNoop.render(<Cls />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'Cannot update during an existing state transition (such as within `render`). ' +
          'Render methods should be a pure function of props and state.\n' +
          '    in Cls (at **)',
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, ' +
          'but not inside Hooks like useReducer() or useMemo().\n' +
          '    in Cls (at **)',
      ]);
    });
  });

  describe('useContext', () => {
    it('throws when used in a class component', async () => {
      const Context = React.createContext(0);
      class Foo extends React.Component {
        render() {
          return useContext(Context);
        }
      }
      ReactNoop.render(<Foo />);
      await waitForThrow(
        'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen' +
          ' for one of the following reasons:\n' +
          '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
          '2. You might be breaking the Rules of Hooks\n' +
          '3. You might have more than one copy of React in the same app\n' +
          'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
      );
    });

    it('warns when passed a consumer', async () => {
      const Context = React.createContext(0);
      function Foo() {
        return useContext(Context.Consumer);
      }
      ReactNoop.render(<Foo />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'Calling useContext(Context.Consumer) is not supported and will cause bugs. ' +
          'Did you mean to call useContext(Context) instead?\n' +
          '    in Foo (at **)',
      ]);
    });

    // Context consumer bails out on propagating "deep" updates when `value` hasn't changed.
    // However, it doesn't bail out from rendering if the component above it re-rendered anyway.
    // If we bailed out on referential equality, it would be confusing that you
    // can call this.setState(), but an autobound render callback "blocked" the update.
    // https://github.com/facebook/react/pull/12470#issuecomment-376917711
    it('does not bail out if there were no bailouts above it', async () => {
      const Context = React.createContext(0);

      function Consumer({children}) {
        const contextValue = useContext(Context);
        return children(contextValue);
      }

      class App extends React.Component {
        state = {
          text: 'hello',
        };

        renderConsumer = context => {
          Scheduler.log('App#renderConsumer');
          return <span prop={this.state.text} />;
        };

        render() {
          Scheduler.log('App');
          return (
            <Context.Provider value={this.props.value}>
              <Consumer>{this.renderConsumer}</Consumer>
            </Context.Provider>
          );
        }
      }

      // Initial mount
      let inst;
      ReactNoop.render(<App value={1} ref={ref => (inst = ref)} />);
      await waitForAll(['App', 'App#renderConsumer']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="hello" />);

      // Update
      inst.setState({text: 'goodbye'});
      await waitForAll(['App', 'App#renderConsumer']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="goodbye" />);
    });
  });

  it('unwinds after errors in complete phase', async () => {
    const Context = React.createContext(0);

    // This is a regression test for stack misalignment
    // caused by unwinding the context from wrong point.
    ReactNoop.render(
      <errorInCompletePhase>
        <Context.Provider value={null} />
      </errorInCompletePhase>,
    );
    await waitForThrow('Error in host config.');

    ReactNoop.render(
      <Context.Provider value={10}>
        <Context.Consumer>{value => <span prop={value} />}</Context.Consumer>
      </Context.Provider>,
    );
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop={10} />);
  });

  describe('fuzz test', () => {
    const contextKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    const FLUSH_ALL = 'FLUSH_ALL';
    function flushAll() {
      return {
        type: FLUSH_ALL,
        toString() {
          return `flushAll()`;
        },
      };
    }

    const FLUSH = 'FLUSH';
    function flush(unitsOfWork) {
      return {
        type: FLUSH,
        unitsOfWork,
        toString() {
          return `flush(${unitsOfWork})`;
        },
      };
    }

    const UPDATE = 'UPDATE';
    function update(key, value) {
      return {
        type: UPDATE,
        key,
        value,
        toString() {
          return `update('${key}', ${value})`;
        },
      };
    }

    function randomInteger(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function randomAction() {
      switch (randomInteger(0, 3)) {
        case 0:
          return flushAll();
        case 1:
          return flush(randomInteger(0, 500));
        case 2:
          const key = contextKeys[randomInteger(0, contextKeys.length)];
          const value = randomInteger(1, 10);
          return update(key, value);
        default:
          throw new Error('Switch statement should be exhaustive');
      }
    }

    function randomActions(n) {
      const actions = [];
      for (let i = 0; i < n; i++) {
        actions.push(randomAction());
      }
      return actions;
    }

    function ContextSimulator(maxDepth) {
      const contexts = new Map(
        contextKeys.map(key => {
          const Context = React.createContext(0);
          Context.displayName = 'Context' + key;
          return [key, Context];
        }),
      );

      class ConsumerTree extends React.Component {
        shouldComponentUpdate() {
          return false;
        }
        render() {
          Scheduler.log();
          if (this.props.depth >= this.props.maxDepth) {
            return null;
          }
          const consumers = [0, 1, 2].map(i => {
            const randomKey =
              contextKeys[
                this.props.rand.intBetween(0, contextKeys.length - 1)
              ];
            const Context = contexts.get(randomKey);
            return (
              <Context.Consumer key={i}>
                {value => (
                  <>
                    <span prop={`${randomKey}:${value}`} />
                    <ConsumerTree
                      rand={this.props.rand}
                      depth={this.props.depth + 1}
                      maxDepth={this.props.maxDepth}
                    />
                  </>
                )}
              </Context.Consumer>
            );
          });
          return consumers;
        }
      }

      function Root(props) {
        return contextKeys.reduceRight(
          (children, key) => {
            const Context = contexts.get(key);
            const value = props.values[key];
            return (
              <Context.Provider value={value}>{children}</Context.Provider>
            );
          },
          <ConsumerTree
            rand={props.rand}
            depth={0}
            maxDepth={props.maxDepth}
          />,
        );
      }

      const initialValues = contextKeys.reduce(
        (result, key, i) => ({...result, [key]: i + 1}),
        {},
      );

      function assertConsistentTree(expectedValues = {}) {
        const jsx = ReactNoop.getChildrenAsJSX();
        const children = jsx === null ? [] : jsx.props.children;
        children.forEach(child => {
          const text = child.props.prop;
          const key = text[0];
          const value = parseInt(text[2], 10);
          const expectedValue = expectedValues[key];
          if (expectedValue === undefined) {
            // If an expected value was not explicitly passed to this function,
            // use the first occurrence.
            expectedValues[key] = value;
          } else if (value !== expectedValue) {
            throw new Error(
              `Inconsistent value! Expected: ${key}:${expectedValue}. Actual: ${text}`,
            );
          }
        });
      }

      function simulate(seed, actions) {
        const rand = gen.create(seed);
        let finalExpectedValues = initialValues;
        function updateRoot() {
          ReactNoop.render(
            <Root
              maxDepth={maxDepth}
              rand={rand}
              values={finalExpectedValues}
            />,
          );
        }
        updateRoot();

        actions.forEach(action => {
          switch (action.type) {
            case FLUSH_ALL:
              Scheduler.unstable_flushAllWithoutAsserting();
              break;
            case FLUSH:
              Scheduler.unstable_flushNumberOfYields(action.unitsOfWork);
              break;
            case UPDATE:
              finalExpectedValues = {
                ...finalExpectedValues,
                [action.key]: action.value,
              };
              updateRoot();
              break;
            default:
              throw new Error('Switch statement should be exhaustive');
          }
          assertConsistentTree();
        });

        Scheduler.unstable_flushAllWithoutAsserting();
        assertConsistentTree(finalExpectedValues);
      }

      return {simulate};
    }

    it('hard-coded tests', () => {
      const {simulate} = ContextSimulator(5);
      simulate('randomSeed', [flush(3), update('A', 4)]);
    });

    it('generated tests', () => {
      const {simulate} = ContextSimulator(5);

      const LIMIT = 100;
      for (let i = 0; i < LIMIT; i++) {
        const seed = Math.random().toString(36).slice(2, 7);
        const actions = randomActions(5);
        try {
          simulate(seed, actions);
        } catch (error) {
          console.error(`
Context fuzz tester error! Copy and paste the following line into the test suite:
  simulate('${seed}', ${actions.join(', ')});
`);
          throw error;
        }
      }
    });
  });

  it('should treat Context as Context.Provider', async () => {
    const BarContext = React.createContext({value: 'bar-initial'});
    expect(BarContext.Provider).toBe(BarContext);

    function Component() {
      return (
        <BarContext value={{value: 'bar-updated'}}>
          <BarContext.Consumer>
            {({value}) => <span prop={value} />}
          </BarContext.Consumer>
        </BarContext>
      );
    }

    ReactNoop.render(<Component />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="bar-updated" />);
  });
});
