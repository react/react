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
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let PropTypes;
let act;
let useMemo;
let useState;
let useReducer;
let assertConsoleErrorDev;
let assertConsoleWarnDev;

describe('ReactStrictMode', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    ({
      act,
      assertConsoleErrorDev,
      assertConsoleWarnDev,
    } = require('internal-test-utils'));
    useMemo = React.useMemo;
    useState = React.useState;
    useReducer = React.useReducer;
  });

  it('should appear in the client component stack', async () => {
    function Foo() {
      return <div ariaTypo="" />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <React.StrictMode>
          <Foo />
        </React.StrictMode>,
      );
    });
    assertConsoleErrorDev([
      'Invalid ARIA attribute `ariaTypo`. ' +
        'ARIA attributes follow the pattern aria-* and must be lowercase.\n' +
        '    in div (at **)\n' +
        '    in Foo (at **)',
    ]);
  });

  it('should appear in the SSR component stack', () => {
    function Foo() {
      return <div ariaTypo="" />;
    }

    ReactDOMServer.renderToString(
      <React.StrictMode>
        <Foo />
      </React.StrictMode>,
    );
    assertConsoleErrorDev([
      'Invalid ARIA attribute `ariaTypo`. ' +
        'ARIA attributes follow the pattern aria-* and must be lowercase.\n' +
        '    in div (at **)\n' +
        '    in Foo (at **)',
    ]);
  });

  // @gate __DEV__
  // @gate !disableLegacyMode
  it('should invoke only precommit lifecycle methods twice in legacy roots', async () => {
    let log = [];
    let shouldComponentUpdate = false;
    class ClassComponent extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        log.push('getDerivedStateFromProps');
        return null;
      }
      constructor(props) {
        super(props);
        log.push('constructor');
      }
      componentDidMount() {
        log.push('componentDidMount');
      }
      componentDidUpdate() {
        log.push('componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('componentWillUnmount');
      }
      shouldComponentUpdate() {
        log.push('shouldComponentUpdate');
        return shouldComponentUpdate;
      }
      render() {
        log.push('render');
        return null;
      }
    }

    const container = document.createElement('div');
    ReactDOM.render(
      <React.StrictMode>
        <ClassComponent />
      </React.StrictMode>,
      container,
    );

    expect(log).toEqual([
      'constructor',
      'constructor',
      'getDerivedStateFromProps',
      'getDerivedStateFromProps',
      'render',
      'render',
      'componentDidMount',
    ]);

    log = [];
    shouldComponentUpdate = true;

    ReactDOM.render(
      <React.StrictMode>
        <ClassComponent />
      </React.StrictMode>,
      container,
    );
    expect(log).toEqual([
      'getDerivedStateFromProps',
      'getDerivedStateFromProps',
      'shouldComponentUpdate',
      'shouldComponentUpdate',
      'render',
      'render',
      'componentDidUpdate',
    ]);

    log = [];
    shouldComponentUpdate = false;

    ReactDOM.render(
      <React.StrictMode>
        <ClassComponent />
      </React.StrictMode>,
      container,
    );

    expect(log).toEqual([
      'getDerivedStateFromProps',
      'getDerivedStateFromProps',
      'shouldComponentUpdate',
      'shouldComponentUpdate',
    ]);
  });

  it('should invoke setState callbacks twice', async () => {
    let instance;
    class ClassComponent extends React.Component {
      state = {
        count: 1,
      };
      render() {
        instance = this;
        return null;
      }
    }

    let setStateCount = 0;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <React.StrictMode>
          <ClassComponent />
        </React.StrictMode>,
      );
    });
    await act(() => {
      instance.setState(state => {
        setStateCount++;
        return {
          count: state.count + 1,
        };
      });
    });

    // Callback should be invoked twice in DEV
    expect(setStateCount).toBe(__DEV__ ? 2 : 1);
    // But each time `state` should be the previous value
    expect(instance.state.count).toBe(2);
  });

  // @gate __DEV__
  it('double invokes useState and useReducer initializers functions', async () => {
    const log = [];

    function App() {
      React.useState(() => {
        log.push('Compute initial state count: 1');
        return 1;
      });
      React.useReducer(
        s => s,
        2,
        s => {
          log.push('Compute initial reducer count: 2');
          return s;
        },
      );

      return 3;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('3');

    expect(log).toEqual([
      'Compute initial state count: 1',
      'Compute initial state count: 1',
      'Compute initial reducer count: 2',
      'Compute initial reducer count: 2',
    ]);
  });

  // @gate !disableLegacyMode
  it('should invoke only precommit lifecycle methods twice in DEV legacy roots', async () => {
    const {StrictMode} = React;

    let log = [];
    let shouldComponentUpdate = false;

    function Root() {
      return (
        <StrictMode>
          <ClassComponent />
        </StrictMode>
      );
    }

    class ClassComponent extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        log.push('getDerivedStateFromProps');
        return null;
      }
      constructor(props) {
        super(props);
        log.push('constructor');
      }
      componentDidMount() {
        log.push('componentDidMount');
      }
      componentDidUpdate() {
        log.push('componentDidUpdate');
      }
      componentWillUnmount() {
        log.push('componentWillUnmount');
      }
      shouldComponentUpdate() {
        log.push('shouldComponentUpdate');
        return shouldComponentUpdate;
      }
      render() {
        log.push('render');
        return null;
      }
    }

    const container = document.createElement('div');
    ReactDOM.render(<Root />, container);

    if (__DEV__) {
      expect(log).toEqual([
        'constructor',
        'constructor',
        'getDerivedStateFromProps',
        'getDerivedStateFromProps',
        'render',
        'render',
        'componentDidMount',
      ]);
    } else {
      expect(log).toEqual([
        'constructor',
        'getDerivedStateFromProps',
        'render',
        'componentDidMount',
      ]);
    }

    log = [];
    shouldComponentUpdate = true;

    ReactDOM.render(<Root />, container);
    if (__DEV__) {
      expect(log).toEqual([
        'getDerivedStateFromProps',
        'getDerivedStateFromProps',
        'shouldComponentUpdate',
        'shouldComponentUpdate',
        'render',
        'render',
        'componentDidUpdate',
      ]);
    } else {
      expect(log).toEqual([
        'getDerivedStateFromProps',
        'shouldComponentUpdate',
        'render',
        'componentDidUpdate',
      ]);
    }

    log = [];
    shouldComponentUpdate = false;

    ReactDOM.render(<Root />, container);
    if (__DEV__) {
      expect(log).toEqual([
        'getDerivedStateFromProps',
        'getDerivedStateFromProps',
        'shouldComponentUpdate',
        'shouldComponentUpdate',
      ]);
    } else {
      expect(log).toEqual([
        'getDerivedStateFromProps',
        'shouldComponentUpdate',
      ]);
    }
  });

  it('should invoke setState callbacks twice in DEV', async () => {
    const {StrictMode} = React;

    let instance;
    class ClassComponent extends React.Component {
      state = {
        count: 1,
      };
      render() {
        instance = this;
        return null;
      }
    }

    let setStateCount = 0;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <StrictMode>
          <ClassComponent />
        </StrictMode>,
      );
    });
    await act(() => {
      instance.setState(state => {
        setStateCount++;
        return {
          count: state.count + 1,
        };
      });
    });

    // Callback should be invoked twice (in DEV)
    expect(setStateCount).toBe(__DEV__ ? 2 : 1);
    // But each time `state` should be the previous value
    expect(instance.state.count).toBe(2);
  });

  // @gate __DEV__
  it('double invokes useMemo functions', async () => {
    let log = [];

    function Uppercased({text}) {
      return useMemo(() => {
        const uppercased = text.toUpperCase();
        log.push('Compute toUpperCase: ' + uppercased);
        return uppercased;
      }, [text]);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    // Mount
    await act(() => {
      root.render(
        <React.StrictMode>
          <Uppercased text="hello" />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('HELLO');
    expect(log).toEqual([
      'Compute toUpperCase: HELLO',
      'Compute toUpperCase: HELLO',
    ]);

    log = [];

    // Update
    await act(() => {
      root.render(
        <React.StrictMode>
          <Uppercased text="goodbye" />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('GOODBYE');
    expect(log).toEqual([
      'Compute toUpperCase: GOODBYE',
      'Compute toUpperCase: GOODBYE',
    ]);
  });

  // @gate __DEV__
  it('double invokes useMemo functions with first result', async () => {
    let log = [];
    function Uppercased({text}) {
      const memoizedResult = useMemo(() => {
        const uppercased = text.toUpperCase();
        log.push('Compute toUpperCase: ' + uppercased);
        return {uppercased};
      }, [text]);

      // Push this to the log so we can check whether the same memoized result
      // it returned during both invocations.
      log.push(memoizedResult);

      return memoizedResult.uppercased;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    // Mount
    await act(() => {
      root.render(
        <React.StrictMode>
          <Uppercased text="hello" />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('HELLO');
    expect(log).toEqual([
      'Compute toUpperCase: HELLO',
      'Compute toUpperCase: HELLO',
      {uppercased: 'HELLO'},
      {uppercased: 'HELLO'},
    ]);

    // Even though the memoized function is invoked twice, the same object
    // is returned both times.
    expect(log[2]).toBe(log[3]);

    log = [];

    // Update
    await act(() => {
      root.render(
        <React.StrictMode>
          <Uppercased text="goodbye" />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('GOODBYE');
    expect(log).toEqual([
      'Compute toUpperCase: GOODBYE',
      'Compute toUpperCase: GOODBYE',
      {uppercased: 'GOODBYE'},
      {uppercased: 'GOODBYE'},
    ]);

    // Even though the memoized function is invoked twice, the same object
    // is returned both times.
    expect(log[2]).toBe(log[3]);
  });

  // @gate __DEV__
  it('double invokes setState updater functions', async () => {
    const log = [];

    let setCount;
    function App() {
      const [count, _setCount] = useState(0);
      setCount = _setCount;
      return count;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('0');

    await act(() => {
      setCount(() => {
        log.push('Compute count: 1');
        return 1;
      });
    });
    expect(container.textContent).toBe('1');
    expect(log).toEqual(['Compute count: 1', 'Compute count: 1']);
  });

  // @gate __DEV__
  it('double invokes reducer functions', async () => {
    const log = [];

    function reducer(prevState, action) {
      log.push('Compute new state: ' + action);
      return action;
    }

    let dispatch;
    function App() {
      const [count, _dispatch] = useReducer(reducer, 0);
      dispatch = _dispatch;
      return count;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe('0');

    await act(() => {
      dispatch(1);
    });
    expect(container.textContent).toBe('1');
    expect(log).toEqual(['Compute new state: 1', 'Compute new state: 1']);
  });
});

describe('Concurrent Mode', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
  });

  it('should warn about unsafe legacy lifecycle methods anywhere in a StrictMode tree', async () => {
    function StrictRoot() {
      return (
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
    class App extends React.Component {
      UNSAFE_componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      render() {
        return (
          <div>
            <Wrapper>
              <Foo />
            </Wrapper>
            <div>
              <Bar />
              <Foo />
            </div>
          </div>
        );
      }
    }
    function Wrapper({children}) {
      return <div>{children}</div>;
    }
    class Foo extends React.Component {
      UNSAFE_componentWillReceiveProps() {}
      render() {
        return null;
      }
    }
    class Bar extends React.Component {
      UNSAFE_componentWillReceiveProps() {}
      render() {
        return null;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<StrictRoot />));
    assertConsoleErrorDev([
      `Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.

Please update the following components: App`,
      `Using UNSAFE_componentWillReceiveProps in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state

Please update the following components: Bar, Foo`,
      `Using UNSAFE_componentWillUpdate in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.

Please update the following components: App`,
    ]);

    // Dedupe
    await act(() => root.render(<App />));
  });

  it('should coalesce warnings by lifecycle name', async () => {
    function StrictRoot() {
      return (
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
    class App extends React.Component {
      UNSAFE_componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      render() {
        return <Parent />;
      }
    }
    class Parent extends React.Component {
      componentWillMount() {}
      componentWillUpdate() {}
      componentWillReceiveProps() {}
      render() {
        return <Child />;
      }
    }
    class Child extends React.Component {
      UNSAFE_componentWillReceiveProps() {}
      render() {
        return null;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => root.render(<StrictRoot />));
    assertConsoleErrorDev([
      `Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.

Please update the following components: App`,
      `Using UNSAFE_componentWillReceiveProps in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state

Please update the following components: Child`,
      `Using UNSAFE_componentWillUpdate in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.

Please update the following components: App`,
    ]);
    assertConsoleWarnDev([
      `componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.
* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: Parent`,
      `componentWillReceiveProps has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state
* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: Parent`,
      `componentWillUpdate has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: Parent`,
    ]);
    // Dedupe
    await act(() => root.render(<StrictRoot />));
  });

  it('should warn about components not present during the initial render', async () => {
    function StrictRoot({foo}) {
      return <React.StrictMode>{foo ? <Foo /> : <Bar />}</React.StrictMode>;
    }
    class Foo extends React.Component {
      UNSAFE_componentWillMount() {}
      render() {
        return null;
      }
    }
    class Bar extends React.Component {
      UNSAFE_componentWillMount() {}
      render() {
        return null;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<StrictRoot foo={true} />));
    assertConsoleErrorDev([
      'Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n\n' +
        'Please update the following components: Foo',
    ]);

    await act(() => root.render(<StrictRoot foo={false} />));
    assertConsoleErrorDev([
      'Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move code with side effects to componentDidMount, and set initial state in the constructor.\n\n' +
        'Please update the following components: Bar',
    ]);

    // Dedupe
    await act(() => root.render(<StrictRoot foo={true} />));
    await act(() => root.render(<StrictRoot foo={false} />));
  });

  it('should also warn inside of "strict" mode trees', async () => {
    const {StrictMode} = React;

    class SyncRoot extends React.Component {
      UNSAFE_componentWillMount() {}
      UNSAFE_componentWillUpdate() {}
      UNSAFE_componentWillReceiveProps() {}
      render() {
        return (
          <StrictMode>
            <Wrapper />
          </StrictMode>
        );
      }
    }
    function Wrapper({children}) {
      return (
        <div>
          <Bar />
          <Foo />
        </div>
      );
    }
    class Foo extends React.Component {
      UNSAFE_componentWillReceiveProps() {}
      render() {
        return null;
      }
    }
    class Bar extends React.Component {
      UNSAFE_componentWillReceiveProps() {}
      render() {
        return null;
      }
    }

    const container = document.createElement('div');

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<SyncRoot />);
    });
    assertConsoleErrorDev([
      'Using UNSAFE_componentWillReceiveProps in strict mode is not recommended ' +
        'and may indicate bugs in your code. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n\n' +
        '* Move data fetching code or side effects to componentDidUpdate.\n' +
        "* If you're updating state whenever props change, " +
        'refactor your code to use memoization techniques or move it to ' +
        'static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state\n\n' +
        'Please update the following components: Bar, Foo',
    ]);

    // Dedupe
    await act(() => {
      root.render(<SyncRoot />);
    });
  });
});

describe('symbol checks', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
  });

  it('should switch from StrictMode to a Fragment and reset state', async () => {
    const {Fragment, StrictMode} = React;

    function ParentComponent({useFragment}) {
      return useFragment ? (
        <Fragment>
          <ChildComponent />
        </Fragment>
      ) : (
        <StrictMode>
          <ChildComponent />
        </StrictMode>
      );
    }

    class ChildComponent extends React.Component {
      state = {
        count: 0,
      };
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          count: prevState.count + 1,
        };
      }
      render() {
        return `count:${this.state.count}`;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<ParentComponent useFragment={false} />);
    });
    expect(container.textContent).toBe('count:1');
    await act(() => {
      root.render(<ParentComponent useFragment={true} />);
    });
    expect(container.textContent).toBe('count:1');
  });

  it('should switch from a Fragment to StrictMode and reset state', async () => {
    const {Fragment, StrictMode} = React;

    function ParentComponent({useFragment}) {
      return useFragment ? (
        <Fragment>
          <ChildComponent />
        </Fragment>
      ) : (
        <StrictMode>
          <ChildComponent />
        </StrictMode>
      );
    }

    class ChildComponent extends React.Component {
      state = {
        count: 0,
      };
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          count: prevState.count + 1,
        };
      }
      render() {
        return `count:${this.state.count}`;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<ParentComponent useFragment={true} />);
    });
    expect(container.textContent).toBe('count:1');
    await act(() => {
      root.render(<ParentComponent useFragment={false} />);
    });
    expect(container.textContent).toBe('count:1');
  });

  it('should update with StrictMode without losing state', async () => {
    const {StrictMode} = React;

    function ParentComponent() {
      return (
        <StrictMode>
          <ChildComponent />
        </StrictMode>
      );
    }

    class ChildComponent extends React.Component {
      state = {
        count: 0,
      };
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          count: prevState.count + 1,
        };
      }
      render() {
        return `count:${this.state.count}`;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<ParentComponent />);
    });
    expect(container.textContent).toBe('count:1');
    await act(() => {
      root.render(<ParentComponent />);
    });
    expect(container.textContent).toBe('count:2');
  });
});

describe('context legacy', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    PropTypes = require('prop-types');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // @gate !disableLegacyContext || !__DEV__
  it('should warn if the legacy context API have been used in strict mode', async () => {
    class LegacyContextProvider extends React.Component {
      getChildContext() {
        return {color: 'purple'};
      }

      render() {
        return (
          <div>
            <LegacyContextConsumer />
            <FunctionalLegacyContextConsumer />
          </div>
        );
      }
    }

    function FunctionalLegacyContextConsumer() {
      return null;
    }

    LegacyContextProvider.childContextTypes = {
      color: PropTypes.string,
    };

    class LegacyContextConsumer extends React.Component {
      render() {
        return null;
      }
    }

    const {StrictMode} = React;

    class Root extends React.Component {
      render() {
        return (
          <div>
            <StrictMode>
              <LegacyContextProvider />
            </StrictMode>
          </div>
        );
      }
    }

    LegacyContextConsumer.contextTypes = {
      color: PropTypes.string,
    };

    FunctionalLegacyContextConsumer.contextTypes = {
      color: PropTypes.string,
    };

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Root />);
    });

    assertConsoleErrorDev([
      'LegacyContextProvider uses the legacy childContextTypes API ' +
        'which will soon be removed. Use React.createContext() instead. ' +
        '(https://react.dev/link/legacy-context)' +
        '\n    in Root (at **)',
      'LegacyContextConsumer uses the legacy contextTypes API which ' +
        'will soon be removed. Use React.createContext() with static ' +
        'contextType instead. (https://react.dev/link/legacy-context)' +
        '\n    in LegacyContextProvider (at **)' +
        '\n    in Root (at **)',
      'FunctionalLegacyContextConsumer uses the legacy contextTypes ' +
        'API which will be removed soon. Use React.createContext() ' +
        'with React.useContext() instead. (https://react.dev/link/legacy-context)' +
        '\n    in LegacyContextProvider (at **)' +
        '\n    in Root (at **)',
      'Legacy context API has been detected within a strict-mode tree.' +
        '\n\nThe old API will be supported in all 16.x releases, but applications ' +
        'using it should migrate to the new version.' +
        '\n\nPlease update the following components: ' +
        'FunctionalLegacyContextConsumer, LegacyContextConsumer, LegacyContextProvider' +
        '\n\nLearn more about this warning here: ' +
        'https://react.dev/link/legacy-context' +
        '\n    in Root (at **)',
    ]);

    // Dedupe
    await act(() => {
      root.render(<Root />);
    });
  });

  describe('console logs logging', () => {
    beforeEach(() => {
      jest.resetModules();
      React = require('react');
      ReactDOMClient = require('react-dom/client');
      act = require('internal-test-utils').act;

      // These tests are specifically testing console.log.
      spyOnDevAndProd(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it('does not disable logs for class double render', async () => {
      let count = 0;
      class Foo extends React.Component {
        render() {
          count++;
          console.log('foo ' + count);
          return null;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      expect(count).toBe(__DEV__ ? 2 : 1);
      expect(console.log).toBeCalledTimes(__DEV__ ? 2 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo 1');
    });

    it('does not disable logs for class double ctor', async () => {
      let count = 0;
      class Foo extends React.Component {
        constructor(props) {
          super(props);
          count++;
          console.log('foo ' + count);
        }
        render() {
          return null;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      expect(count).toBe(__DEV__ ? 2 : 1);
      expect(console.log).toBeCalledTimes(__DEV__ ? 2 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo 1');
    });

    it('does not disable logs for class double getDerivedStateFromProps', async () => {
      let count = 0;
      class Foo extends React.Component {
        state = {};
        static getDerivedStateFromProps() {
          count++;
          console.log('foo ' + count);
          return {};
        }
        render() {
          return null;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      expect(count).toBe(__DEV__ ? 2 : 1);
      expect(console.log).toBeCalledTimes(__DEV__ ? 2 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo 1');
    });

    it('does not disable logs for class double shouldComponentUpdate', async () => {
      let count = 0;
      class Foo extends React.Component {
        state = {};
        shouldComponentUpdate() {
          count++;
          console.log('foo ' + count);
          return {};
        }
        render() {
          return null;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });

      expect(count).toBe(__DEV__ ? 2 : 1);
      expect(console.log).toBeCalledTimes(__DEV__ ? 2 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo 1');
    });

    it('does not disable logs for class state updaters', async () => {
      let inst;
      let count = 0;
      class Foo extends React.Component {
        state = {};
        render() {
          inst = this;
          return null;
        }
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      await act(() => {
        inst.setState(() => {
          count++;
          console.log('foo ' + count);
          return {};
        });
      });

      expect(count).toBe(__DEV__ ? 2 : 1);
      expect(console.log).toBeCalledTimes(__DEV__ ? 2 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo 1');
    });

    it('does not disable logs for function double render', async () => {
      let count = 0;
      function Foo() {
        count++;
        console.log('foo ' + count);
        return null;
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      expect(count).toBe(__DEV__ ? 2 : 1);
      expect(console.log).toBeCalledTimes(__DEV__ ? 2 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo 1');
    });

    it('does not disable logs for effect double invoke', async () => {
      let create = 0;
      let cleanup = 0;
      function Foo() {
        React.useEffect(() => {
          create++;
          console.log('foo create ' + create);
          return () => {
            cleanup++;
            console.log('foo cleanup ' + cleanup);
          };
        });
        return null;
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <React.StrictMode>
            <Foo />
          </React.StrictMode>,
        );
      });
      expect(create).toBe(__DEV__ ? 2 : 1);
      expect(cleanup).toBe(__DEV__ ? 1 : 0);
      expect(console.log).toBeCalledTimes(__DEV__ ? 3 : 1);
      // Note: we should display the first log because otherwise
      // there is a risk of suppressing warnings when they happen,
      // and on the next render they'd get deduplicated and ignored.
      expect(console.log).toBeCalledWith('foo create 1');
      if (__DEV__) {
        expect(console.log).toBeCalledWith('foo cleanup 1');
      }
    });
  });
});
