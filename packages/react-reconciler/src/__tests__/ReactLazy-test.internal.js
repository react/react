let React;
let ReactTestRenderer;
let Scheduler;
let Suspense;
let lazy;
let waitFor;
let waitForAll;
let waitForThrow;
let assertLog;
let assertConsoleErrorDev;
let act;

let fakeModuleCache;

function normalizeCodeLocInfo(str) {
  return (
    str &&
    str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function (m, name) {
      return '\n    in ' + name + ' (at **)';
    })
  );
}

describe('ReactLazy', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    Suspense = React.Suspense;
    lazy = React.lazy;
    ReactTestRenderer = require('react-test-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
    waitForThrow = InternalTestUtils.waitForThrow;
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
    act = InternalTestUtils.act;

    fakeModuleCache = new Map();
  });

  function Text(props) {
    Scheduler.log(props.text);
    return props.text;
  }

  async function fakeImport(Component) {
    const record = fakeModuleCache.get(Component);
    if (record === undefined) {
      const newRecord = {
        status: 'pending',
        value: {default: Component},
        pings: [],
        then(ping) {
          switch (newRecord.status) {
            case 'pending': {
              newRecord.pings.push(ping);
              return;
            }
            case 'resolved': {
              ping(newRecord.value);
              return;
            }
            case 'rejected': {
              throw newRecord.value;
            }
          }
        },
      };
      fakeModuleCache.set(Component, newRecord);
      return newRecord;
    }
    return record;
  }

  function resolveFakeImport(moduleName) {
    const record = fakeModuleCache.get(moduleName);
    if (record === undefined) {
      throw new Error('Module not found');
    }
    if (record.status !== 'pending') {
      throw new Error('Module already resolved');
    }
    record.status = 'resolved';
    record.pings.forEach(ping => ping(record.value));
  }

  it('suspends until module has loaded', async () => {
    const LazyText = lazy(() => fakeImport(Text));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyText text="Hi" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('Hi');

    await act(() => resolveFakeImport(Text));
    assertLog(['Hi']);
    expect(root).toMatchRenderedOutput('Hi');

    // Should not suspend on update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyText text="Hi again" />
      </Suspense>,
    );
    await waitForAll(['Hi again']);
    expect(root).toMatchRenderedOutput('Hi again');
  });

  it('renders a lazy context provider', async () => {
    const Context = React.createContext('default');
    function ConsumerText() {
      return <Text text={React.useContext(Context)} />;
    }
    // Context.Provider === Context, so we can lazy-load the context itself
    const LazyProvider = lazy(() => fakeImport(Context));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyProvider value="Hi">
          <ConsumerText />
        </LazyProvider>
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('Hi');

    await act(() => resolveFakeImport(Context));
    assertLog(['Hi']);
    expect(root).toMatchRenderedOutput('Hi');

    // Should not suspend on update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyProvider value="Hi again">
          <ConsumerText />
        </LazyProvider>
      </Suspense>,
    );
    await waitForAll(['Hi again']);
    expect(root).toMatchRenderedOutput('Hi again');
  });

  it('can resolve synchronously without suspending', async () => {
    const LazyText = lazy(() => ({
      then(cb) {
        cb({default: Text});
      },
    }));

    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <Suspense fallback={<Text text="Loading..." />}>
          <LazyText text="Hi" />
        </Suspense>,
        {unstable_isConcurrent: true},
      );
    });

    assertLog(['Hi']);
    expect(root).toMatchRenderedOutput('Hi');
  });

  it('can reject synchronously without suspending', async () => {
    const LazyText = lazy(() => ({
      then(resolve, reject) {
        reject(new Error('oh no'));
      },
    }));

    class ErrorBoundary extends React.Component {
      state = {};
      static getDerivedStateFromError(error) {
        return {message: error.message};
      }
      render() {
        return this.state.message
          ? `Error: ${this.state.message}`
          : this.props.children;
      }
    }

    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <ErrorBoundary>
          <Suspense fallback={<Text text="Loading..." />}>
            <LazyText text="Hi" />
          </Suspense>
        </ErrorBoundary>,
        {unstable_isConcurrent: true},
      );
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput('Error: oh no');
  });

  it('multiple lazy components', async () => {
    function Foo() {
      return <Text text="Foo" />;
    }

    function Bar() {
      return <Text text="Bar" />;
    }

    const LazyFoo = lazy(() => fakeImport(Foo));
    const LazyBar = lazy(() => fakeImport(Bar));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyFoo />
        <LazyBar />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('FooBar');

    await resolveFakeImport(Foo);

    await waitForAll(['Foo']);
    expect(root).not.toMatchRenderedOutput('FooBar');

    await act(() => resolveFakeImport(Bar));
    assertLog(['Foo', 'Bar']);
    expect(root).toMatchRenderedOutput('FooBar');
  });

  it('does not support arbitrary promises, only module objects', async () => {
    const LazyText = lazy(async () => Text);

    const root = ReactTestRenderer.create(null, {
      unstable_isConcurrent: true,
    });

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <LazyText text="Hi" />
        </Suspense>
      );
    }

    let error;
    try {
      await act(() => {
        root.update(<App />);
      });
    } catch (e) {
      error = e;
    }

    expect(error.message).toMatch('Element type is invalid');
    assertLog(['Loading...']);
    assertConsoleErrorDev([
      'lazy: Expected the result of a dynamic import() call. ' +
        'Instead received: function Text(props) {\n' +
        '    Scheduler.log(props.text);\n' +
        '    return props.text;\n' +
        '  }\n\n' +
        'Your code should look like: \n  ' +
        "const MyComponent = lazy(() => import('./MyComponent'))\n" +
        '    in App (at **)',
      'lazy: Expected the result of a dynamic import() call. ' +
        'Instead received: function Text(props) {\n' +
        '    Scheduler.log(props.text);\n' +
        '    return props.text;\n' +
        '  }\n\n' +
        'Your code should look like: \n  ' +
        "const MyComponent = lazy(() => import('./MyComponent'))\n" +
        '    in App (at **)',
    ]);
    expect(root).not.toMatchRenderedOutput('Hi');
  });

  it('throws if promise rejects', async () => {
    const networkError = new Error('Bad network');
    const LazyText = lazy(async () => {
      throw networkError;
    });

    const root = ReactTestRenderer.create(null, {
      unstable_isConcurrent: true,
    });

    let error;
    try {
      await act(() => {
        root.update(
          <Suspense fallback={<Text text="Loading..." />}>
            <LazyText text="Hi" />
          </Suspense>,
        );
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBe(networkError);
    assertLog(['Loading...']);
    expect(root).not.toMatchRenderedOutput('Hi');
  });

  it('mount and reorder', async () => {
    class Child extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentDidUpdate() {
        Scheduler.log('Did update: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    const LazyChildA = lazy(() => {
      Scheduler.log('Suspend! [LazyChildA]');
      return fakeImport(Child);
    });
    const LazyChildB = lazy(() => {
      Scheduler.log('Suspend! [LazyChildB]');
      return fakeImport(Child);
    });

    function Parent({swap}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {swap
            ? [
                <LazyChildB key="B" label="B" />,
                <LazyChildA key="A" label="A" />,
              ]
            : [
                <LazyChildA key="A" label="A" />,
                <LazyChildB key="B" label="B" />,
              ]}
        </Suspense>
      );
    }

    const root = ReactTestRenderer.create(<Parent swap={false} />, {
      unstable_isConcurrent: true,
    });

    await waitForAll([
      'Suspend! [LazyChildA]',
      'Loading...',
      // pre-warming
      'Suspend! [LazyChildB]',
    ]);
    expect(root).not.toMatchRenderedOutput('AB');

    await act(async () => {
      await resolveFakeImport(Child);

      // B suspends even though it happens to share the same import as A.
      // TODO: React.lazy should implement the `status` and `value` fields, so
      // we can unwrap the result synchronously if it already loaded. Like `use`.
      await waitFor([
        'A',
        // pre-warming: LazyChildB was already initialized. So it also already resolved
        // when we called resolveFakeImport above. So it doesn't suspend again.
        'B',
      ]);
    });
    assertLog(['Did mount: A', 'Did mount: B']);
    expect(root).toMatchRenderedOutput('AB');

    // Swap the position of A and B
    root.update(<Parent swap={true} />);
    await waitForAll(['B', 'A', 'Did update: B', 'Did update: A']);
    expect(root).toMatchRenderedOutput('BA');
  });

  it('resolves defaultProps, on mount and update', async () => {
    class T extends React.Component {
      render() {
        return <Text {...this.props} />;
      }
    }
    T.defaultProps = {text: 'Hi'};
    const LazyText = lazy(() => fakeImport(T));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyText />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('Hi');

    await act(() => resolveFakeImport(T));
    assertLog(['Hi']);

    expect(root).toMatchRenderedOutput('Hi');

    T.defaultProps = {text: 'Hi again'};
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyText />
      </Suspense>,
    );
    await waitForAll(['Hi again']);
    expect(root).toMatchRenderedOutput('Hi again');
  });

  it('resolves defaultProps without breaking memoization', async () => {
    class LazyImpl extends React.Component {
      render() {
        Scheduler.log('Lazy');
        return (
          <>
            <Text text={this.props.siblingText} />
            {this.props.children}
          </>
        );
      }
    }
    LazyImpl.defaultProps = {siblingText: 'Sibling'};
    const Lazy = lazy(() => fakeImport(LazyImpl));

    class Stateful extends React.Component {
      state = {text: 'A'};
      render() {
        return <Text text={this.state.text} />;
      }
    }

    const stateful = React.createRef(null);

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <Lazy>
          <Stateful ref={stateful} />
        </Lazy>
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );
    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('SiblingA');

    await act(() => resolveFakeImport(LazyImpl));
    assertLog(['Lazy', 'Sibling', 'A']);

    expect(root).toMatchRenderedOutput('SiblingA');

    // Lazy should not re-render
    stateful.current.setState({text: 'B'});
    await waitForAll(['B']);
    expect(root).toMatchRenderedOutput('SiblingB');
  });

  it('resolves defaultProps without breaking bailout due to unchanged props and state, #17151', async () => {
    class LazyImpl extends React.Component {
      static defaultProps = {value: 0};

      render() {
        const text = `${this.props.label}: ${this.props.value}`;
        return <Text text={text} />;
      }
    }

    const Lazy = lazy(() => fakeImport(LazyImpl));

    const instance1 = React.createRef(null);
    const instance2 = React.createRef(null);

    const root = ReactTestRenderer.create(
      <>
        <LazyImpl ref={instance1} label="Not lazy" />
        <Suspense fallback={<Text text="Loading..." />}>
          <Lazy ref={instance2} label="Lazy" />
        </Suspense>
      </>,
      {
        unstable_isConcurrent: true,
      },
    );
    await waitForAll(['Not lazy: 0', 'Loading...']);
    expect(root).not.toMatchRenderedOutput('Not lazy: 0Lazy: 0');

    await act(() => resolveFakeImport(LazyImpl));
    assertLog(['Lazy: 0']);
    expect(root).toMatchRenderedOutput('Not lazy: 0Lazy: 0');

    // Should bailout due to unchanged props and state
    instance1.current.setState(null);
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('Not lazy: 0Lazy: 0');

    // Should bailout due to unchanged props and state
    instance2.current.setState(null);
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('Not lazy: 0Lazy: 0');
  });

  it('resolves defaultProps without breaking bailout in PureComponent, #17151', async () => {
    class LazyImpl extends React.PureComponent {
      static defaultProps = {value: 0};
      state = {};

      render() {
        const text = `${this.props.label}: ${this.props.value}`;
        return <Text text={text} />;
      }
    }

    const Lazy = lazy(() => fakeImport(LazyImpl));

    const instance1 = React.createRef(null);
    const instance2 = React.createRef(null);

    const root = ReactTestRenderer.create(
      <>
        <LazyImpl ref={instance1} label="Not lazy" />
        <Suspense fallback={<Text text="Loading..." />}>
          <Lazy ref={instance2} label="Lazy" />
        </Suspense>
      </>,
      {
        unstable_isConcurrent: true,
      },
    );
    await waitForAll(['Not lazy: 0', 'Loading...']);
    expect(root).not.toMatchRenderedOutput('Not lazy: 0Lazy: 0');

    await act(() => resolveFakeImport(LazyImpl));
    assertLog(['Lazy: 0']);
    expect(root).toMatchRenderedOutput('Not lazy: 0Lazy: 0');

    // Should bailout due to shallow equal props and state
    instance1.current.setState({});
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('Not lazy: 0Lazy: 0');

    // Should bailout due to shallow equal props and state
    instance2.current.setState({});
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('Not lazy: 0Lazy: 0');
  });

  it('sets defaultProps for modern lifecycles', async () => {
    class C extends React.Component {
      static defaultProps = {text: 'A'};
      state = {};

      static getDerivedStateFromProps(props) {
        Scheduler.log(`getDerivedStateFromProps: ${props.text}`);
        return null;
      }

      constructor(props) {
        super(props);
        Scheduler.log(`constructor: ${this.props.text}`);
      }

      componentDidMount() {
        Scheduler.log(`componentDidMount: ${this.props.text}`);
      }

      componentDidUpdate(prevProps) {
        Scheduler.log(
          `componentDidUpdate: ${prevProps.text} -> ${this.props.text}`,
        );
      }

      componentWillUnmount() {
        Scheduler.log(`componentWillUnmount: ${this.props.text}`);
      }

      shouldComponentUpdate(nextProps) {
        Scheduler.log(
          `shouldComponentUpdate: ${this.props.text} -> ${nextProps.text}`,
        );
        return true;
      }

      getSnapshotBeforeUpdate(prevProps) {
        Scheduler.log(
          `getSnapshotBeforeUpdate: ${prevProps.text} -> ${this.props.text}`,
        );
        return null;
      }

      render() {
        return <Text text={this.props.text + this.props.num} />;
      }
    }

    const LazyClass = lazy(() => fakeImport(C));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyClass num={1} />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('A1');

    await act(() => resolveFakeImport(C));
    assertLog([
      'constructor: A',
      'getDerivedStateFromProps: A',
      'A1',
      'componentDidMount: A',
    ]);

    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyClass num={2} />
      </Suspense>,
    );
    await waitForAll([
      'getDerivedStateFromProps: A',
      'shouldComponentUpdate: A -> A',
      'A2',
      'getSnapshotBeforeUpdate: A -> A',
      'componentDidUpdate: A -> A',
    ]);
    expect(root).toMatchRenderedOutput('A2');

    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyClass num={3} />
      </Suspense>,
    );
    await waitForAll([
      'getDerivedStateFromProps: A',
      'shouldComponentUpdate: A -> A',
      'A3',
      'getSnapshotBeforeUpdate: A -> A',
      'componentDidUpdate: A -> A',
    ]);
    expect(root).toMatchRenderedOutput('A3');
  });

  it('sets defaultProps for legacy lifecycles', async () => {
    class C extends React.Component {
      static defaultProps = {text: 'A'};
      state = {};

      UNSAFE_componentWillMount() {
        Scheduler.log(`UNSAFE_componentWillMount: ${this.props.text}`);
      }

      UNSAFE_componentWillUpdate(nextProps) {
        Scheduler.log(
          `UNSAFE_componentWillUpdate: ${this.props.text} -> ${nextProps.text}`,
        );
      }

      UNSAFE_componentWillReceiveProps(nextProps) {
        Scheduler.log(
          `UNSAFE_componentWillReceiveProps: ${this.props.text} -> ${nextProps.text}`,
        );
      }

      render() {
        return <Text text={this.props.text + this.props.num} />;
      }
    }

    const LazyClass = lazy(() => fakeImport(C));

    let root;
    await act(() => {
      root = ReactTestRenderer.create(
        <Suspense fallback={<Text text="Loading..." />}>
          <LazyClass num={1} />
        </Suspense>,
        {unstable_isConcurrent: true},
      );
    });

    assertLog(['Loading...']);
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('Loading...');

    await resolveFakeImport(C);

    assertLog([]);

    await act(() => {
      root.update(
        <Suspense fallback={<Text text="Loading..." />}>
          <LazyClass num={2} />
        </Suspense>,
      );
    });

    assertLog(['UNSAFE_componentWillMount: A', 'A2']);
    expect(root).toMatchRenderedOutput('A2');

    await act(() => {
      root.update(
        <Suspense fallback={<Text text="Loading..." />}>
          <LazyClass num={3} />
        </Suspense>,
      );
    });
    assertLog([
      'UNSAFE_componentWillReceiveProps: A -> A',
      'UNSAFE_componentWillUpdate: A -> A',
      'A3',
    ]);
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('A3');
  });

  it('throws with a useful error when wrapping invalid type with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(42));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(42);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: 42. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('throws with a useful error when wrapping Fragment with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.Fragment));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.Fragment);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: Fragment. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  // @gate !fb
  it('throws with a useful error when wrapping createPortal with lazy()', async () => {
    const ReactDOM = require('react-dom');
    const container = document.createElement('div');
    const portal = ReactDOM.createPortal(<div />, container);
    const BadLazy = lazy(() => fakeImport(portal));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(portal);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: Portal. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('throws with a useful error when wrapping Profiler with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.Profiler));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.Profiler);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: Profiler. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('throws with a useful error when wrapping StrictMode with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.StrictMode));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.StrictMode);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: StrictMode. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('throws with a useful error when wrapping Suspense with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.Suspense));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.Suspense);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: Suspense. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('renders a lazy context provider without value prop', async () => {
    // Context providers work when wrapped in lazy()
    const Context = React.createContext('default');
    const LazyProvider = lazy(() => fakeImport(Context));

    function ConsumerText() {
      return <Text text={React.useContext(Context)} />;
    }

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyProvider value="provided">
          <ConsumerText />
        </LazyProvider>
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await act(() => resolveFakeImport(Context));
    assertLog(['provided']);
    expect(root).toMatchRenderedOutput('provided');
  });

  it('throws with a useful error when wrapping Context.Consumer with lazy()', async () => {
    const Context = React.createContext(null);
    const BadLazy = lazy(() => fakeImport(Context.Consumer));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(Context.Consumer);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: Context.Consumer. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  // @gate enableSuspenseList
  it('throws with a useful error when wrapping SuspenseList with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.unstable_SuspenseList));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.unstable_SuspenseList);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: SuspenseList. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  // @gate enableViewTransition
  it('throws with a useful error when wrapping ViewTransition with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.ViewTransition));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.ViewTransition);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: ViewTransition. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('throws with a useful error when wrapping Activity with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.Activity));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.Activity);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: Activity. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  // @gate enableTransitionTracing
  it('throws with a useful error when wrapping TracingMarker with lazy()', async () => {
    const BadLazy = lazy(() => fakeImport(React.unstable_TracingMarker));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);

    await resolveFakeImport(React.unstable_TracingMarker);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <BadLazy />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: TracingMarker. ' +
        'Lazy element type must resolve to a class or function.',
    );
  });

  it('throws with a useful error when wrapping lazy() multiple times', async () => {
    const Lazy1 = lazy(() => fakeImport(Text));
    const Lazy2 = lazy(() => fakeImport(Lazy1));

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <Lazy2 text="Hello" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('Hello');

    await resolveFakeImport(Lazy1);
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <Lazy2 text="Hello" />
      </Suspense>,
    );
    await waitForThrow(
      'Element type is invalid. Received a promise that resolves to: [object Object]. ' +
        'Lazy element type must resolve to a class or function.' +
        (__DEV__
          ? ' Did you wrap a component in React.lazy() more than once?'
          : ''),
    );
  });

  it('resolves props for function component without defaultProps', async () => {
    function Add(props) {
      return props.inner + props.outer;
    }
    const LazyAdd = lazy(() => fakeImport(Add));
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner="2" outer="2" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('22');

    // Mount
    await act(() => resolveFakeImport(Add));

    expect(root).toMatchRenderedOutput('22');

    // Update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner={false} outer={false} />
      </Suspense>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');
  });

  it('resolves props for class component with defaultProps', async () => {
    class Add extends React.Component {
      render() {
        expect(this.props.innerWithDefault).toBe(42);
        return this.props.inner + this.props.outer;
      }
    }
    Add.defaultProps = {
      innerWithDefault: 42,
    };
    const LazyAdd = lazy(() => fakeImport(Add));
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner="2" outer="2" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('22');

    // Mount
    await act(() => resolveFakeImport(Add));

    expect(root).toMatchRenderedOutput('22');

    // Update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner={false} outer={false} />
      </Suspense>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');
  });

  it('resolves props for class component without defaultProps', async () => {
    class Add extends React.Component {
      render() {
        return this.props.inner + this.props.outer;
      }
    }
    const LazyAdd = lazy(() => fakeImport(Add));
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner="2" outer="2" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('22');

    // Mount
    await act(() => resolveFakeImport(Add));

    expect(root).toMatchRenderedOutput('22');

    // Update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner={false} outer={false} />
      </Suspense>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');
  });

  it('resolves props for forwardRef component without defaultProps', async () => {
    const Add = React.forwardRef((props, ref) => {
      return props.inner + props.outer;
    });
    Add.displayName = 'Add';

    const LazyAdd = lazy(() => fakeImport(Add));
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner="2" outer="2" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('22');

    // Mount
    await act(() => resolveFakeImport(Add));

    expect(root).toMatchRenderedOutput('22');

    // Update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner={false} outer={false} />
      </Suspense>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');
  });

  it('resolves props for outer memo component without defaultProps', async () => {
    let Add = props => {
      return props.inner + props.outer;
    };
    Add = React.memo(Add);
    const LazyAdd = lazy(() => fakeImport(Add));
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner="2" outer="2" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('22');

    // Mount
    await act(() => resolveFakeImport(Add));

    expect(root).toMatchRenderedOutput('22');

    // Update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner={false} outer={false} />
      </Suspense>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');
  });

  it('resolves props for inner memo component without defaultProps', async () => {
    const Add = props => {
      return props.inner + props.outer;
    };
    Add.displayName = 'Add';
    const LazyAdd = lazy(() => fakeImport(Add));
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner="2" outer="2" />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('22');

    // Mount
    await act(() => resolveFakeImport(Add));

    expect(root).toMatchRenderedOutput('22');

    // Update
    root.update(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyAdd inner={false} outer={false} />
      </Suspense>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('0');
  });

  it('includes lazy-loaded component in warning stack', async () => {
    const Foo = props => <div>{[<Text text="A" />, <Text text="B" />]}</div>;
    const LazyFoo = lazy(() => {
      Scheduler.log('Started loading');
      return fakeImport(Foo);
    });

    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyFoo />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Started loading', 'Loading...']);
    expect(root).not.toMatchRenderedOutput(<div>AB</div>);

    await act(() => resolveFakeImport(Foo));
    assertLog(['A', 'B']);
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n' +
        '\n' +
        'Check the render method of `Foo`. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in Foo (at **)',
    ]);
    expect(root).toMatchRenderedOutput(<div>AB</div>);
  });

  it('supports class and forwardRef components', async () => {
    class Foo extends React.Component {
      render() {
        return <Text text="Foo" />;
      }
    }
    const LazyClass = lazy(() => {
      return fakeImport(Foo);
    });

    class Bar extends React.Component {
      render() {
        return <Text text="Bar" />;
      }
    }
    const ForwardRefBar = React.forwardRef((props, ref) => {
      Scheduler.log('forwardRef');
      return <Bar ref={ref} />;
    });

    const LazyForwardRef = lazy(() => {
      return fakeImport(ForwardRefBar);
    });

    const ref = React.createRef();
    const root = ReactTestRenderer.create(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyClass />
        <LazyForwardRef ref={ref} />
      </Suspense>,
      {
        unstable_isConcurrent: true,
      },
    );

    await waitForAll(['Loading...']);
    expect(root).not.toMatchRenderedOutput('FooBar');
    expect(ref.current).toBe(null);

    await act(() => resolveFakeImport(Foo));
    assertLog(['Foo']);

    await act(() => resolveFakeImport(ForwardRefBar));
    assertLog(['Foo', 'forwardRef', 'Bar']);
    expect(root).toMatchRenderedOutput('FooBar');
    expect(ref.current).not.toBe(null);
  });

  it('should error with a component stack naming the resolved component', async () => {
    let componentStackMessage;

    function ResolvedText() {
      throw new Error('oh no');
    }
    const LazyText = lazy(() => fakeImport(ResolvedText));

    class ErrorBoundary extends React.Component {
      state = {error: null};

      componentDidCatch(error, errMessage) {
        componentStackMessage = normalizeCodeLocInfo(errMessage.componentStack);
        this.setState({
          error,
        });
      }

      render() {
        return this.state.error ? null : this.props.children;
      }
    }

    ReactTestRenderer.create(
      <ErrorBoundary>
        <Suspense fallback={<Text text="Loading..." />}>
          <LazyText text="Hi" />
        </Suspense>
      </ErrorBoundary>,
      {unstable_isConcurrent: true},
    );

    await waitForAll(['Loading...']);

    await act(() => resolveFakeImport(ResolvedText));
    assertLog([]);

    expect(componentStackMessage).toContain('in ResolvedText');
  });

  it('should error with a component stack containing Lazy if unresolved', async () => {
    let componentStackMessage;

    const LazyText = lazy(() => ({
      then(resolve, reject) {
        reject(new Error('oh no'));
      },
    }));

    class ErrorBoundary extends React.Component {
      state = {error: null};

      componentDidCatch(error, errMessage) {
        componentStackMessage = normalizeCodeLocInfo(errMessage.componentStack);
        this.setState({
          error,
        });
      }

      render() {
        return this.state.error ? null : this.props.children;
      }
    }

    await act(() => {
      ReactTestRenderer.create(
        <ErrorBoundary>
          <Suspense fallback={<Text text="Loading..." />}>
            <LazyText text="Hi" />
          </Suspense>
        </ErrorBoundary>,
        {unstable_isConcurrent: true},
      );
    });

    assertLog([]);

    expect(componentStackMessage).toContain('in Lazy');
  });

  it('mount and reorder lazy types', async () => {
    class Child extends React.Component {
      componentWillUnmount() {
        Scheduler.log('Did unmount: ' + this.props.label);
      }
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentDidUpdate() {
        Scheduler.log('Did update: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    function ChildA({lowerCase}) {
      return <Child label={lowerCase ? 'a' : 'A'} />;
    }

    function ChildB({lowerCase}) {
      return <Child label={lowerCase ? 'b' : 'B'} />;
    }

    const LazyChildA = lazy(() => {
      Scheduler.log('Init A');
      return fakeImport(ChildA);
    });
    const LazyChildB = lazy(() => {
      Scheduler.log('Init B');
      return fakeImport(ChildB);
    });
    const LazyChildA2 = lazy(() => {
      Scheduler.log('Init A2');
      return fakeImport(ChildA);
    });
    let resolveB2;
    const LazyChildB2 = lazy(() => {
      Scheduler.log('Init B2');
      return new Promise(r => {
        resolveB2 = r;
      });
    });

    function Parent({swap}) {
      return (
        <Suspense fallback={<Text text="Outer..." />}>
          <Suspense fallback={<Text text="Loading..." />}>
            {swap
              ? [
                  <LazyChildB2 key="B" lowerCase={true} />,
                  <LazyChildA2 key="A" lowerCase={true} />,
                ]
              : [<LazyChildA key="A" />, <LazyChildB key="B" />]}
          </Suspense>
        </Suspense>
      );
    }

    const root = ReactTestRenderer.create(<Parent swap={false} />, {
      unstable_isConcurrent: true,
    });

    await waitForAll([
      'Init A',
      'Loading...',
      // pre-warming
      'Init B',
    ]);
    expect(root).not.toMatchRenderedOutput('AB');

    await act(() => resolveFakeImport(ChildA));
    assertLog(['A']);

    await act(() => resolveFakeImport(ChildB));
    assertLog(['A', 'B', 'Did mount: A', 'Did mount: B']);
    expect(root).toMatchRenderedOutput('AB');

    // Swap the position of A and B
    root.update(<Parent swap={true} />);
    await waitForAll([
      'Init B2',
      'Loading...',
      'Did unmount: A',
      'Did unmount: B',
    ]);

    // The suspense boundary should've triggered now.
    expect(root).toMatchRenderedOutput('Loading...');
    await act(() => resolveB2({default: ChildB}));

    // We need to flush to trigger the second one to load.
    assertLog(['Init A2', 'b', 'a', 'Did mount: b', 'Did mount: a']);
    expect(root).toMatchRenderedOutput('ba');
  });

  it('mount and reorder lazy elements', async () => {
    class Child extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentDidUpdate() {
        Scheduler.log('Did update: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    const ChildA = <Child key="A" label="A" />;
    const lazyChildA = lazy(() => {
      Scheduler.log('Init A');
      return fakeImport(ChildA);
    });
    const ChildB = <Child key="B" label="B" />;
    const lazyChildB = lazy(() => {
      Scheduler.log('Init B');
      return fakeImport(ChildB);
    });
    const ChildA2 = <Child key="A" label="a" />;
    const lazyChildA2 = lazy(() => {
      Scheduler.log('Init A2');
      return fakeImport(ChildA2);
    });
    const ChildB2 = <Child key="B" label="b" />;
    const lazyChildB2 = lazy(() => {
      Scheduler.log('Init B2');
      return fakeImport(ChildB2);
    });

    function Parent({swap}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {swap ? [lazyChildB2, lazyChildA2] : [lazyChildA, lazyChildB]}
        </Suspense>
      );
    }

    const root = ReactTestRenderer.create(<Parent swap={false} />, {
      unstable_isConcurrent: true,
    });

    await waitForAll(['Init A', 'Loading...']);
    expect(root).not.toMatchRenderedOutput('AB');

    await act(() => resolveFakeImport(ChildA));
    // We need to flush to trigger the B to load.
    await assertLog(['Init B']);
    await act(() => resolveFakeImport(ChildB));
    assertLog(['A', 'B', 'Did mount: A', 'Did mount: B']);
    expect(root).toMatchRenderedOutput('AB');

    // Swap the position of A and B
    React.startTransition(() => {
      root.update(<Parent swap={true} />);
    });
    await waitForAll(['Init B2', 'Loading...']);
    await act(() => resolveFakeImport(ChildB2));
    // We need to flush to trigger the second one to load.
    assertLog(['Init A2', 'Loading...']);
    await act(() => resolveFakeImport(ChildA2));
    assertLog(['b', 'a', 'Did update: b', 'Did update: a']);
    expect(root).toMatchRenderedOutput('ba');
  });

  describe('legacy mode', () => {
    // @gate !disableLegacyMode
    it('mount and reorder lazy elements (legacy mode)', async () => {
      class Child extends React.Component {
        componentDidMount() {
          Scheduler.log('Did mount: ' + this.props.label);
        }
        componentDidUpdate() {
          Scheduler.log('Did update: ' + this.props.label);
        }
        render() {
          return <Text text={this.props.label} />;
        }
      }

      const ChildA = <Child key="A" label="A" />;
      const lazyChildA = lazy(() => {
        Scheduler.log('Init A');
        return fakeImport(ChildA);
      });
      const ChildB = <Child key="B" label="B" />;
      const lazyChildB = lazy(() => {
        Scheduler.log('Init B');
        return fakeImport(ChildB);
      });
      const ChildA2 = <Child key="A" label="a" />;
      const lazyChildA2 = lazy(() => {
        Scheduler.log('Init A2');
        return fakeImport(ChildA2);
      });
      const ChildB2 = <Child key="B" label="b" />;
      const lazyChildB2 = lazy(() => {
        Scheduler.log('Init B2');
        return fakeImport(ChildB2);
      });

      function Parent({swap}) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            {swap ? [lazyChildB2, lazyChildA2] : [lazyChildA, lazyChildB]}
          </Suspense>
        );
      }

      const root = ReactTestRenderer.create(<Parent swap={false} />, {
        unstable_isConcurrent: false,
      });

      assertLog(['Init A', 'Loading...']);
      expect(root).not.toMatchRenderedOutput('AB');

      await resolveFakeImport(ChildA);
      // We need to flush to trigger the B to load.
      await waitForAll(['Init B']);
      await resolveFakeImport(ChildB);

      await waitForAll(['A', 'B', 'Did mount: A', 'Did mount: B']);
      expect(root).toMatchRenderedOutput('AB');

      // Swap the position of A and B
      root.update(<Parent swap={true} />);
      assertLog(['Init B2', 'Loading...']);
      await resolveFakeImport(ChildB2);
      // We need to flush to trigger the second one to load.
      await waitForAll(['Init A2']);
      await resolveFakeImport(ChildA2);

      await waitForAll(['b', 'a', 'Did update: b', 'Did update: a']);
      expect(root).toMatchRenderedOutput('ba');
    });

    // @gate !disableLegacyMode
    it('mount and reorder lazy types (legacy mode)', async () => {
      class Child extends React.Component {
        componentDidMount() {
          Scheduler.log('Did mount: ' + this.props.label);
        }
        componentDidUpdate() {
          Scheduler.log('Did update: ' + this.props.label);
        }
        render() {
          return <Text text={this.props.label} />;
        }
      }

      function ChildA({lowerCase}) {
        return <Child label={lowerCase ? 'a' : 'A'} />;
      }

      function ChildB({lowerCase}) {
        return <Child label={lowerCase ? 'b' : 'B'} />;
      }

      const LazyChildA = lazy(() => {
        Scheduler.log('Init A');
        return fakeImport(ChildA);
      });
      const LazyChildB = lazy(() => {
        Scheduler.log('Init B');
        return fakeImport(ChildB);
      });
      const LazyChildA2 = lazy(() => {
        Scheduler.log('Init A2');
        return fakeImport(ChildA);
      });
      const LazyChildB2 = lazy(() => {
        Scheduler.log('Init B2');
        return fakeImport(ChildB);
      });

      function Parent({swap}) {
        return (
          <Suspense fallback={<Text text="Outer..." />}>
            <Suspense fallback={<Text text="Loading..." />}>
              {swap
                ? [
                    <LazyChildB2 key="B" lowerCase={true} />,
                    <LazyChildA2 key="A" lowerCase={true} />,
                  ]
                : [<LazyChildA key="A" />, <LazyChildB key="B" />]}
            </Suspense>
          </Suspense>
        );
      }

      const root = ReactTestRenderer.create(<Parent swap={false} />, {
        unstable_isConcurrent: false,
      });

      assertLog(['Init A', 'Init B', 'Loading...']);
      expect(root).not.toMatchRenderedOutput('AB');

      await resolveFakeImport(ChildA);
      await resolveFakeImport(ChildB);

      await waitForAll(['A', 'B', 'Did mount: A', 'Did mount: B']);
      expect(root).toMatchRenderedOutput('AB');

      // Swap the position of A and B
      root.update(<Parent swap={true} />);
      assertLog(['Init B2', 'Loading...']);
      await waitForAll(['Init A2', 'b', 'a', 'Did update: b', 'Did update: a']);
      expect(root).toMatchRenderedOutput('ba');
    });
  });
});
