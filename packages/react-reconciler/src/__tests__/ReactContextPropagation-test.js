let React;
let ReactNoop;
let Scheduler;
let act;
let use;
let useState;
let useContext;
let Suspense;
let SuspenseList;
let getCacheForType;
let caches;
let seededCache;
let assertLog;

describe('ReactLazyContextPropagation', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    use = React.use;
    useState = React.useState;
    useContext = React.useContext;
    Suspense = React.Suspense;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;

    getCacheForType = React.unstable_getCacheForType;

    caches = [];
    seededCache = null;
  });

  function createTextCache() {
    if (seededCache !== null) {
      // Trick to seed a cache before it exists.
      // TODO: Need a built-in API to seed data before the initial render (i.e.
      // not a refresh because nothing has mounted yet).
      const cache = seededCache;
      seededCache = null;
      return cache;
    }

    const data = new Map();
    const version = caches.length + 1;
    const cache = {
      version,
      data,
      resolve(text) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'resolved',
            value: text,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'resolved';
          record.value = text;
          thenable.pings.forEach(t => t());
        }
      },
      reject(text, error) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'rejected',
            value: error,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'rejected';
          record.value = error;
          thenable.pings.forEach(t => t());
        }
      },
    };
    caches.push(cache);
    return cache;
  }

  function readText(text) {
    const textCache = getCacheForType(createTextCache);
    const record = textCache.data.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          Scheduler.log(`Error! [${text}]`);
          throw record.value;
        case 'resolved':
          return textCache.version;
      }
    } else {
      Scheduler.log(`Suspend! [${text}]`);

      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.data.set(text, newRecord);

      throw thenable;
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  // function AsyncText({text, showVersion}) {
  //   const version = readText(text);
  //   const fullText = showVersion ? `${text} [v${version}]` : text;
  //   Scheduler.log(fullText);
  //   return text;
  // }

  function seedNextTextCache(text) {
    if (seededCache === null) {
      seededCache = createTextCache();
    }
    seededCache.resolve(text);
  }

  function resolveMostRecentTextCache(text) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].resolve(text)`.
      caches[caches.length - 1].resolve(text);
    }
  }

  const resolveText = resolveMostRecentTextCache;

  // function rejectMostRecentTextCache(text, error) {
  //   if (caches.length === 0) {
  //     throw Error('Cache does not exist.');
  //   } else {
  //     // Resolve the most recently created cache. An older cache can by
  //     // resolved with `caches[index].reject(text, error)`.
  //     caches[caches.length - 1].reject(text, error);
  //   }
  // }

  it(
    'context change should prevent bailout of memoized component (useMemo -> ' +
      'no intermediate fiber)',
    async () => {
      const root = ReactNoop.createRoot();

      const Context = React.createContext(0);

      let setValue;
      function App() {
        const [value, _setValue] = useState(0);
        setValue = _setValue;

        // NOTE: It's an important part of this test that we're memoizing the
        // props of the Consumer component, as opposed to wrapping in an
        // additional memoized fiber, because the implementation propagates
        // context changes whenever a fiber bails out.
        const consumer = React.useMemo(() => <Consumer />, []);

        return <Context.Provider value={value}>{consumer}</Context.Provider>;
      }

      function Consumer() {
        const value = useContext(Context);
        // Even though Consumer is memoized, Consumer should re-render
        // DeepChild whenever the context value changes. Otherwise DeepChild
        // won't receive the new value.
        return <DeepChild value={value} />;
      }

      function DeepChild({value}) {
        return <Text text={value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog([0]);
      expect(root).toMatchRenderedOutput('0');

      await act(() => {
        setValue(1);
      });
      assertLog([1]);
      expect(root).toMatchRenderedOutput('1');
    },
  );

  it('context change should prevent bailout of memoized component (memo HOC)', async () => {
    const root = ReactNoop.createRoot();

    const Context = React.createContext(0);

    let setValue;
    function App() {
      const [value, _setValue] = useState(0);
      setValue = _setValue;
      return (
        <Context.Provider value={value}>
          <Consumer />
        </Context.Provider>
      );
    }

    const Consumer = React.memo(() => {
      const value = useContext(Context);
      // Even though Consumer is memoized, Consumer should re-render
      // DeepChild whenever the context value changes. Otherwise DeepChild
      // won't receive the new value.
      return <DeepChild value={value} />;
    });

    function DeepChild({value}) {
      return <Text text={value} />;
    }

    await act(() => {
      root.render(<App />);
    });
    assertLog([0]);
    expect(root).toMatchRenderedOutput('0');

    await act(() => {
      setValue(1);
    });
    assertLog([1]);
    expect(root).toMatchRenderedOutput('1');
  });

  it('context change should prevent bailout of memoized component (PureComponent)', async () => {
    const root = ReactNoop.createRoot();

    const Context = React.createContext(0);

    let setValue;
    function App() {
      const [value, _setValue] = useState(0);
      setValue = _setValue;
      return (
        <Context.Provider value={value}>
          <Consumer />
        </Context.Provider>
      );
    }

    class Consumer extends React.PureComponent {
      static contextType = Context;
      render() {
        // Even though Consumer is memoized, Consumer should re-render
        // DeepChild whenever the context value changes. Otherwise DeepChild
        // won't receive the new value.
        return <DeepChild value={this.context} />;
      }
    }

    function DeepChild({value}) {
      return <Text text={value} />;
    }

    await act(() => {
      root.render(<App />);
    });
    assertLog([0]);
    expect(root).toMatchRenderedOutput('0');

    await act(() => {
      setValue(1);
    });
    assertLog([1]);
    expect(root).toMatchRenderedOutput('1');
  });

  it("context consumer bails out if context hasn't changed", async () => {
    const root = ReactNoop.createRoot();

    const Context = React.createContext(0);

    function App() {
      return (
        <Context.Provider value={0}>
          <Consumer />
        </Context.Provider>
      );
    }

    let setOtherValue;
    const Consumer = React.memo(() => {
      const value = useContext(Context);

      const [, _setOtherValue] = useState(0);
      setOtherValue = _setOtherValue;

      Scheduler.log('Consumer');

      return <Text text={value} />;
    });

    await act(() => {
      root.render(<App />);
    });
    assertLog(['Consumer', 0]);
    expect(root).toMatchRenderedOutput('0');

    await act(() => {
      // Intentionally calling setState to some other arbitrary value before
      // setting it back to the current one. That way an update is scheduled,
      // but we'll bail out during render when nothing has changed.
      setOtherValue(1);
      setOtherValue(0);
    });
    // NOTE: If this didn't yield anything, that indicates that we never visited
    // the consumer during the render phase, which probably means the eager
    // bailout mechanism kicked in. Because we're testing the _lazy_ bailout
    // mechanism, update this test to foil the _eager_ bailout, somehow. Perhaps
    // by switching to useReducer.
    assertLog(['Consumer']);
    expect(root).toMatchRenderedOutput('0');
  });

  // @gate enableLegacyCache
  it('context is propagated across retries', async () => {
    const root = ReactNoop.createRoot();

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <Suspense fallback={<Text text="Loading..." />}>
            <Async />
          </Suspense>
          <Text text={value} />
        </Context.Provider>
      );
    }

    function Async() {
      const value = useContext(Context);
      readText(value);

      // When `readText` suspends, we haven't yet visited Indirection and all
      // of its children. They won't get rendered until a later retry.
      return <Indirection />;
    }

    const Indirection = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild />;
    });

    function DeepChild() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    await seedNextTextCache('A');
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      // Intentionally not wrapping in startTransition, so that the fallback
      // the fallback displays despite this being a refresh.
      setContext('B');
    });
    assertLog([
      'Suspend! [B]',
      'Loading...',
      'B',
      // pre-warming
      'Suspend! [B]',
    ]);
    expect(root).toMatchRenderedOutput('Loading...B');

    await act(async () => {
      await resolveText('B');
    });
    assertLog(['B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  // @gate enableLegacyCache
  it('multiple contexts are propagated across retries', async () => {
    // Same as previous test, but with multiple context providers
    const root = ReactNoop.createRoot();

    const Context1 = React.createContext('A');
    const Context2 = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context1.Provider value={value}>
          <Context2.Provider value={value}>
            <Suspense fallback={<Text text="Loading..." />}>
              <Async />
            </Suspense>
            <Text text={value} />
          </Context2.Provider>
        </Context1.Provider>
      );
    }

    function Async() {
      const value = useContext(Context1);
      readText(value);

      // When `readText` suspends, we haven't yet visited Indirection and all
      // of its children. They won't get rendered until a later retry.
      return (
        <>
          <Indirection1 />
          <Indirection2 />
        </>
      );
    }

    const Indirection1 = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild1 />;
    });

    const Indirection2 = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild2 />;
    });

    function DeepChild1() {
      const value = useContext(Context1);
      return <Text text={value} />;
    }

    function DeepChild2() {
      const value = useContext(Context2);
      return <Text text={value} />;
    }

    await seedNextTextCache('A');
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A', 'A']);
    expect(root).toMatchRenderedOutput('AAA');

    await act(() => {
      // Intentionally not wrapping in startTransition, so that the fallback
      // the fallback displays despite this being a refresh.
      setContext('B');
    });
    assertLog([
      'Suspend! [B]',
      'Loading...',
      'B',
      // pre-warming
      'Suspend! [B]',
    ]);
    expect(root).toMatchRenderedOutput('Loading...B');

    await act(async () => {
      await resolveText('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BBB');
  });

  // @gate enableLegacyCache && !disableLegacyMode
  it('context is propagated across retries (legacy)', async () => {
    const root = ReactNoop.createLegacyRoot();

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <Suspense fallback={<Text text="Loading..." />}>
            <Async />
          </Suspense>
          <Text text={value} />
        </Context.Provider>
      );
    }

    function Async() {
      const value = useContext(Context);
      readText(value);

      // When `readText` suspends, we haven't yet visited Indirection and all
      // of its children. They won't get rendered until a later retry.
      return <Indirection />;
    }

    const Indirection = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild />;
    });

    function DeepChild() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    await seedNextTextCache('A');
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      // Intentionally not wrapping in startTransition, so that the fallback
      // the fallback displays despite this being a refresh.
      setContext('B');
    });
    assertLog(['Suspend! [B]', 'Loading...', 'B']);
    expect(root).toMatchRenderedOutput('Loading...B');

    await act(async () => {
      await resolveText('B');
    });
    assertLog(['B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  // @gate enableLegacyCache && enableLegacyHidden
  it('context is propagated through offscreen trees', async () => {
    const LegacyHidden = React.unstable_LegacyHidden;

    const root = ReactNoop.createRoot();

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <LegacyHidden mode="hidden">
            <Indirection />
          </LegacyHidden>
          <Text text={value} />
        </Context.Provider>
      );
    }

    const Indirection = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild />;
    });

    function DeepChild() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    await seedNextTextCache('A');
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      setContext('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  // @gate enableLegacyCache && enableLegacyHidden
  it('multiple contexts are propagated across through offscreen trees', async () => {
    // Same as previous test, but with multiple context providers
    const LegacyHidden = React.unstable_LegacyHidden;

    const root = ReactNoop.createRoot();

    const Context1 = React.createContext('A');
    const Context2 = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context1.Provider value={value}>
          <Context2.Provider value={value}>
            <LegacyHidden mode="hidden">
              <Indirection1 />
              <Indirection2 />
            </LegacyHidden>
            <Text text={value} />
          </Context2.Provider>
        </Context1.Provider>
      );
    }

    const Indirection1 = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild1 />;
    });

    const Indirection2 = React.memo(() => {
      // This child must always be consistent with the sibling Text component.
      return <DeepChild2 />;
    });

    function DeepChild1() {
      const value = useContext(Context1);
      return <Text text={value} />;
    }

    function DeepChild2() {
      const value = useContext(Context2);
      return <Text text={value} />;
    }

    await seedNextTextCache('A');
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A', 'A']);
    expect(root).toMatchRenderedOutput('AAA');

    await act(() => {
      setContext('B');
    });
    assertLog(['B', 'B', 'B']);
    expect(root).toMatchRenderedOutput('BBB');
  });

  // @gate enableSuspenseList
  it('contexts are propagated through SuspenseList', async () => {
    // This kinda tests an implementation detail. SuspenseList has an early
    // bailout that doesn't use `bailoutOnAlreadyFinishedWork`. It probably
    // should just use that function, though.
    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      const children = React.useMemo(
        () => (
          <SuspenseList revealOrder="forwards" tail="visible">
            <Child />
            <Child />
          </SuspenseList>
        ),
        [],
      );
      return <Context.Provider value={value}>{children}</Context.Provider>;
    }

    function Child() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      setContext('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  it('nested bailouts', async () => {
    // Lazy context propagation will stop propagating when it hits the first
    // match. If we bail out again inside that tree, we must resume propagating.

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <ChildIndirection />
        </Context.Provider>
      );
    }

    const ChildIndirection = React.memo(() => {
      return <Child />;
    });

    function Child() {
      const value = useContext(Context);
      return (
        <>
          <Text text={value} />
          <DeepChildIndirection />
        </>
      );
    }

    const DeepChildIndirection = React.memo(() => {
      return <DeepChild />;
    });

    function DeepChild() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      setContext('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  // @gate enableLegacyCache
  it('nested bailouts across retries', async () => {
    // Lazy context propagation will stop propagating when it hits the first
    // match. If we bail out again inside that tree, we must resume propagating.

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <Suspense fallback={<Text text="Loading..." />}>
            <Async value={value} />
          </Suspense>
        </Context.Provider>
      );
    }

    function Async({value}) {
      // When this suspends, we won't be able to visit its children during the
      // current render. So we must take extra care to propagate the context
      // change in such a way that they're aren't lost when we retry in a
      // later render.
      readText(value);
      return <Child value={value} />;
    }

    function Child() {
      const value = useContext(Context);
      return (
        <>
          <Text text={value} />
          <DeepChildIndirection />
        </>
      );
    }

    const DeepChildIndirection = React.memo(() => {
      return <DeepChild />;
    });

    function DeepChild() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await seedNextTextCache('A');
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      setContext('B');
    });
    assertLog([
      'Suspend! [B]',
      'Loading...',
      // pre-warming
      'Suspend! [B]',
    ]);
    expect(root).toMatchRenderedOutput('Loading...');

    await act(async () => {
      await resolveText('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  // @gate enableLegacyCache && enableLegacyHidden
  it('nested bailouts through offscreen trees', async () => {
    // Lazy context propagation will stop propagating when it hits the first
    // match. If we bail out again inside that tree, we must resume propagating.

    const LegacyHidden = React.unstable_LegacyHidden;

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <LegacyHidden mode="hidden">
            <Child />
          </LegacyHidden>
        </Context.Provider>
      );
    }

    function Child() {
      const value = useContext(Context);
      return (
        <>
          <Text text={value} />
          <DeepChildIndirection />
        </>
      );
    }

    const DeepChildIndirection = React.memo(() => {
      return <DeepChild />;
    });

    function DeepChild() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      setContext('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  it('finds context consumers in multiple sibling branches', async () => {
    // This test confirms that when we find a matching context consumer during
    // propagation, we continue propagating to its sibling branches.

    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, setValue] = useState('A');
      setContext = setValue;
      return (
        <Context.Provider value={value}>
          <Blah />
        </Context.Provider>
      );
    }

    const Blah = React.memo(() => {
      return (
        <>
          <Indirection />
          <Indirection />
        </>
      );
    });

    const Indirection = React.memo(() => {
      return <Child />;
    });

    function Child() {
      const value = useContext(Context);
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A', 'A']);
    expect(root).toMatchRenderedOutput('AA');

    await act(() => {
      setContext('B');
    });
    assertLog(['B', 'B']);
    expect(root).toMatchRenderedOutput('BB');
  });

  it('regression: context change triggers retry of suspended Suspense boundary on initial mount', async () => {
    // Regression test for a bug where a context change above a suspended
    // Suspense boundary would fail to trigger a retry. When a Suspense
    // boundary suspends during initial mount, the primary children's fibers
    // are discarded because there is no current tree to preserve them. If
    // the suspended promise never resolves, the only way to retry is
    // something external — like a context change. Context propagation must
    // mark suspended Suspense boundaries for retry even though the consumer
    // fibers no longer exist in the tree.
    //
    // The Provider component owns the state update. The children are
    // passed in from above, so they are not re-created when the Provider
    // re-renders — this means the Suspense boundary bails out, exercising
    // the lazy context propagation path where the bug manifests.
    const Context = React.createContext(null);
    const neverResolvingPromise = new Promise(() => {});
    const resolvedThenable = {status: 'fulfilled', value: 'Result', then() {}};

    function Consumer() {
      return <Text text={use(use(Context))} />;
    }

    let setPromise;
    function Provider({children}) {
      const [promise, _setPromise] = useState(neverResolvingPromise);
      setPromise = _setPromise;
      return <Context.Provider value={promise}>{children}</Context.Provider>;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Provider>
          <Suspense fallback={<Text text="Loading" />}>
            <Consumer />
          </Suspense>
        </Provider>,
      );
    });
    assertLog(['Loading']);
    expect(root).toMatchRenderedOutput('Loading');

    await act(() => {
      setPromise(resolvedThenable);
    });
    assertLog(['Result']);
    expect(root).toMatchRenderedOutput('Result');
  });

  it('regression: context change triggers retry of suspended Suspense boundary on initial mount (nested)', async () => {
    // Same as above, but with an additional indirection component between
    // the provider and the Suspense boundary. This exercises the
    // propagateContextChanges walker path rather than the
    // propagateParentContextChanges path.
    const Context = React.createContext(null);
    const neverResolvingPromise = new Promise(() => {});
    const resolvedThenable = {status: 'fulfilled', value: 'Result', then() {}};

    function Consumer() {
      return <Text text={use(use(Context))} />;
    }

    function Indirection({children}) {
      Scheduler.log('Indirection');
      return children;
    }

    let setPromise;
    function Provider({children}) {
      const [promise, _setPromise] = useState(neverResolvingPromise);
      setPromise = _setPromise;
      return <Context.Provider value={promise}>{children}</Context.Provider>;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Provider>
          <Indirection>
            <Suspense fallback={<Text text="Loading" />}>
              <Consumer />
            </Suspense>
          </Indirection>
        </Provider>,
      );
    });
    assertLog(['Indirection', 'Loading']);
    expect(root).toMatchRenderedOutput('Loading');

    // Indirection should not re-render — only the Suspense boundary
    // should be retried.
    await act(() => {
      setPromise(resolvedThenable);
    });
    assertLog(['Result']);
    expect(root).toMatchRenderedOutput('Result');
  });

  // @gate enableLegacyCache
  it('context change propagates to Suspense fallback (memo boundary)', async () => {
    // When a context change occurs above a Suspense boundary that is currently
    // showing its fallback, the fallback's context consumers should re-render
    // with the updated value — even if there's a memo boundary between the
    // provider and the Suspense boundary that prevents the fallback element
    // references from changing.
    const root = ReactNoop.createRoot();
    const Context = React.createContext('A');

    let setContext;
    function App() {
      const [value, _setValue] = useState('A');
      setContext = _setValue;
      return (
        <Context.Provider value={value}>
          <MemoizedWrapper />
          <Text text={value} />
        </Context.Provider>
      );
    }

    const MemoizedWrapper = React.memo(function MemoizedWrapper() {
      return (
        <Suspense fallback={<FallbackConsumer />}>
          <AsyncChild />
        </Suspense>
      );
    });

    function FallbackConsumer() {
      const value = useContext(Context);
      return <Text text={'Fallback: ' + value} />;
    }

    function AsyncChild() {
      readText('async');
      return <Text text="Content" />;
    }

    // Initial render — primary content suspends, fallback is shown
    await act(() => {
      root.render(<App />);
    });
    assertLog([
      'Suspend! [async]',
      'Fallback: A',
      'A',
      // pre-warming
      'Suspend! [async]',
    ]);
    expect(root).toMatchRenderedOutput('Fallback: AA');

    // Update context while still suspended. The fallback consumer should
    // re-render with the new value.
    await act(() => {
      setContext('B');
    });
    assertLog([
      // The Suspense boundary retries the primary children first
      'Suspend! [async]',
      'Fallback: B',
      'B',
      // pre-warming
      'Suspend! [async]',
    ]);
    expect(root).toMatchRenderedOutput('Fallback: BB');

    // Unsuspend. The primary content should render with the latest context.
    await act(async () => {
      await resolveText('async');
    });
    assertLog(['Content']);
    expect(root).toMatchRenderedOutput('ContentB');
  });

  describe('memoized parent walk', () => {
    // These tests target the memoization of the return-path walk performed by
    // lazilyPropagateParentContextChanges. They use a shape where an update
    // enters below a bailed-out memo boundary and fans out into many sibling
    // subtrees that bail out, so that later siblings (and their descendants)
    // reuse the results recorded by earlier ones.

    let Activity;
    let useMemo;
    let memo;
    let startTransition;
    let waitFor;
    let waitForAll;
    let StableA;
    let StableB;

    beforeEach(() => {
      Activity = React.Activity;
      useMemo = React.useMemo;
      memo = React.memo;
      startTransition = React.startTransition;
      const InternalTestUtils = require('internal-test-utils');
      waitFor = InternalTestUtils.waitFor;
      waitForAll = InternalTestUtils.waitForAll;
      StableA = React.createContext('a');
      StableB = React.createContext('b');
    });

    // Some providers and plain wrappers whose values never change, to put
    // distance between the interesting provider and the consumers.
    function Padding({depth, children}) {
      if (depth === 0) {
        return children;
      }
      const inner = <Padding depth={depth - 1}>{children}</Padding>;
      switch (depth % 3) {
        case 0:
          return <StableA.Provider value="a">{inner}</StableA.Provider>;
        case 1:
          return <PassThrough>{inner}</PassThrough>;
        default:
          return <StableB.Provider value="b">{inner}</StableB.Provider>;
      }
    }
    function PassThrough({children}) {
      return children;
    }

    it('propagates a distant provider change into many bailed-out sibling subtrees', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={12}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <Padding depth={6}>
            <List />
          </Padding>
        );
      });

      function List() {
        const [tick, _setTick] = useState(0);
        setTick = _setTick;
        // Reading a context here means that when List re-renders it is
        // flagged NeedsPropagation, so its children's walks continue past the
        // memo boundary above.
        useContext(StableA);
        const rows = useMemo(
          () => [0, 1, 2, 3, 4, 5, 6, 7].map(i => <Row key={i} id={i} />),
          [],
        );
        return (
          <>
            <Text text={'List ' + tick} />
            {rows}
          </>
        );
      }

      const Row = memo(function Row({id}) {
        return (
          <div>
            <Padding depth={4}>
              <Consumer id={id + 'a'} />
              <Consumer id={id + 'b'} />
            </Padding>
          </div>
        );
      });

      function Consumer({id}) {
        const value = useContext(Context);
        useContext(StableB);
        return <Text text={id + ':' + value} />;
      }

      const ids = [0, 1, 2, 3, 4, 5, 6, 7];
      const consumers = v => ids.flatMap(i => [i + 'a:' + v, i + 'b:' + v]);
      const output = (tick, v) => (
        <>
          {'List ' + tick}
          <div>{'0a:' + v + '0b:' + v}</div>
          <div>{'1a:' + v + '1b:' + v}</div>
          <div>{'2a:' + v + '2b:' + v}</div>
          <div>{'3a:' + v + '3b:' + v}</div>
          <div>{'4a:' + v + '4b:' + v}</div>
          <div>{'5a:' + v + '5b:' + v}</div>
          <div>{'6a:' + v + '6b:' + v}</div>
          <div>{'7a:' + v + '7b:' + v}</div>
        </>
      );

      await act(() => {
        root.render(<App />);
      });
      assertLog(['List 0', ...consumers('A')]);

      // Only the list re-renders. Every row bails out and nothing changed
      // above, so no consumer should render.
      await act(() => {
        setTick(1);
      });
      assertLog(['List 1']);

      // The distant provider changes and the list re-renders in the same
      // pass. Every consumer must see the new value.
      await act(() => {
        setValue('B');
        setTick(2);
      });
      assertLog(['List 2', ...consumers('B')]);
      expect(root).toMatchRenderedOutput(output(2, 'B'));

      // The distant provider changes but the list itself bails out.
      await act(() => {
        setValue('C');
      });
      assertLog(consumers('C'));
      expect(root).toMatchRenderedOutput(output(2, 'C'));
    });

    it('propagates a change from the direct parent provider into bailed-out siblings', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        return (
          <Padding depth={6}>
            <List />
          </Padding>
        );
      }

      function List() {
        const [tick, _setTick] = useState(0);
        const [value, _setValue] = useState('A');
        setTick = _setTick;
        setValue = _setValue;
        const rows = useMemo(
          () => [0, 1, 2, 3].map(i => <Row key={i} id={i} />),
          [],
        );
        return (
          <Context.Provider value={value}>
            <Text text={'List ' + tick} />
            {rows}
          </Context.Provider>
        );
      }

      const Row = memo(function Row({id}) {
        return (
          <Padding depth={3}>
            <Consumer id={id} />
          </Padding>
        );
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog(['List 0', '0:A', '1:A', '2:A', '3:A']);

      await act(() => {
        setTick(1);
      });
      assertLog(['List 1']);

      await act(() => {
        setValue('B');
      });
      assertLog(['List 1', '0:B', '1:B', '2:B', '3:B']);
      expect(root).toMatchRenderedOutput('List 10:B1:B2:B3:B');
    });

    it('nested providers of the same context: only the outer one changes', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('-');

      let setOuter;
      let setInner;
      function App() {
        const [outer, _setOuter] = useState('A');
        setOuter = _setOuter;
        return (
          <Context.Provider value={outer}>
            <Padding depth={4}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <div>
            <Rows prefix="outer" />
            <InnerHost />
          </div>
        );
      });

      function InnerHost() {
        const [inner, _setInner] = useState('a');
        setInner = _setInner;
        return (
          <Context.Provider value={inner}>
            <Rows prefix="inner" />
          </Context.Provider>
        );
      }

      const Rows = memo(function Rows({prefix}) {
        return (
          <Padding depth={2}>
            <Row id={prefix + '0'} />
            <Row id={prefix + '1'} />
            <Row id={prefix + '2'} />
          </Padding>
        );
      });

      const Row = memo(function Row({id}) {
        return (
          <span>
            <Consumer id={id} />
          </span>
        );
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog([
        'outer0:A',
        'outer1:A',
        'outer2:A',
        'inner0:a',
        'inner1:a',
        'inner2:a',
      ]);

      // Only the outer provider changes. Consumers under the inner provider
      // are shadowed, so they must keep showing the inner value. (They are
      // marked, because propagation matches on the context type, but they
      // bail out after reading the unchanged value.)
      await act(() => {
        setOuter('B');
      });
      assertLog(['outer0:B', 'outer1:B', 'outer2:B']);
      expect(root).toMatchRenderedOutput(
        <div>
          <span>outer0:B</span>
          <span>outer1:B</span>
          <span>outer2:B</span>
          <span>inner0:a</span>
          <span>inner1:a</span>
          <span>inner2:a</span>
        </div>,
      );

      // Only the inner provider changes. Consumers that aren't under it must
      // not re-render.
      await act(() => {
        setInner('b');
      });
      assertLog(['inner0:b', 'inner1:b', 'inner2:b']);
      expect(root).toMatchRenderedOutput(
        <div>
          <span>outer0:B</span>
          <span>outer1:B</span>
          <span>outer2:B</span>
          <span>inner0:b</span>
          <span>inner1:b</span>
          <span>inner2:b</span>
        </div>,
      );

      // Both change in the same pass.
      await act(() => {
        setOuter('C');
        setInner('c');
      });
      assertLog([
        'outer0:C',
        'outer1:C',
        'outer2:C',
        'inner0:c',
        'inner1:c',
        'inner2:c',
      ]);
    });

    it('a component that bailed out and propagated acts as a boundary for its descendants', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={3}>
              <List />
            </Padding>
          </Context.Provider>
        );
      }

      function List() {
        const [tick, _setTick] = useState(0);
        setTick = _setTick;
        return (
          <>
            <Text text={'List ' + tick} />
            <Section id="x" />
            <Section id="y" />
          </>
        );
      }

      // Section bails out (memo) while List re-renders. When the provider
      // above changed it propagates into its own subtree and is flagged, so
      // the walks started by its bailing descendants stop at it.
      const Section = memo(function Section({id}) {
        Scheduler.log('Section ' + id);
        return (
          <Padding depth={2}>
            <Group id={id + '0'} />
            <Group id={id + '1'} />
          </Padding>
        );
      });

      const Group = memo(function Group({id}) {
        Scheduler.log('Group ' + id);
        return (
          <div>
            <Consumer id={id + 'a'} />
            <Leaf id={id} />
            <Consumer id={id + 'b'} />
          </div>
        );
      });

      const Leaf = memo(function Leaf({id}) {
        Scheduler.log('Leaf ' + id);
        return <span>{id}</span>;
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog([
        'List 0',
        'Section x',
        'Group x0',
        'x0a:A',
        'Leaf x0',
        'x0b:A',
        'Group x1',
        'x1a:A',
        'Leaf x1',
        'x1b:A',
        'Section y',
        'Group y0',
        'y0a:A',
        'Leaf y0',
        'y0b:A',
        'Group y1',
        'y1a:A',
        'Leaf y1',
        'y1b:A',
      ]);

      await act(() => {
        setValue('B');
        setTick(1);
      });
      // Only the list and the consumers re-render.
      assertLog([
        'List 1',
        'x0a:B',
        'x0b:B',
        'x1a:B',
        'x1b:B',
        'y0a:B',
        'y0b:B',
        'y1a:B',
        'y1b:B',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          List 1
          <div>
            x0a:B<span>x0</span>x0b:B
          </div>
          <div>
            x1a:B<span>x1</span>x1b:B
          </div>
          <div>
            y0a:B<span>y0</span>y0b:B
          </div>
          <div>
            y1a:B<span>y1</span>y1b:B
          </div>
        </>,
      );
    });

    it('a re-rendered consumer still propagates to memoized descendants after a sibling bailed out', async () => {
      // The memo boundary propagates the change and stops at the first
      // matching consumer in each branch, so consumers nested below a
      // matched consumer rely on the walk started under that consumer
      // continuing past the memo boundary. An earlier sibling that bailed out
      // records a result for the shared parent that stops at the boundary;
      // that result must not be reused for the walk under the consumer.
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={3}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      // The stable provider below the memo boundary matters: providers are
      // where walk results get recorded.
      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <StableB.Provider value="b">
            <PassThrough>
              <Static id="before" />
              <DirectConsumer />
              <Static id="after" />
            </PassThrough>
          </StableB.Provider>
        );
      });

      const Static = memo(function Static({id}) {
        return (
          <PassThrough>
            <Text text={id} />
          </PassThrough>
        );
      });

      function DirectConsumer() {
        const value = useContext(Context);
        Scheduler.log('Direct:' + value);
        return <Nested />;
      }

      const Nested = memo(function Nested() {
        return (
          <Padding depth={2}>
            <NestedConsumer />
          </Padding>
        );
      });

      function NestedConsumer() {
        const value = useContext(Context);
        return <Text text={'Nested:' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog(['before', 'Direct:A', 'Nested:A', 'after']);

      await act(() => {
        setValue('B');
      });
      assertLog(['Direct:B', 'Nested:B']);
      expect(root).toMatchRenderedOutput('beforeNested:Bafter');
    });

    it('does not attribute a provider inside a re-rendered sibling to a bailed-out sibling', async () => {
      const root = ReactNoop.createRoot();
      const Outer = React.createContext('A');
      const Local = React.createContext(0);

      let setValue;
      let setTick;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Outer.Provider value={value}>
            <Local.Provider value={0}>
              <Padding depth={3}>
                <StaticMiddle />
              </Padding>
            </Local.Provider>
          </Outer.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <div>
            <List />
          </div>
        );
      });

      function List() {
        const [tick, _setTick] = useState(0);
        setTick = _setTick;
        return (
          <>
            <Text text={'List ' + tick} />
            <SiblingA tick={tick} />
            <SiblingB />
            <SiblingA tick={tick} />
            <SiblingB />
          </>
        );
      }

      // Re-renders with the list and provides a new Local value each time.
      function SiblingA({tick}) {
        return (
          <Local.Provider value={tick}>
            <Consumers prefix="a" />
          </Local.Provider>
        );
      }

      // Bails out. Its Local consumers read the provider above List, which
      // never changes.
      const SiblingB = memo(function SiblingB() {
        return <Consumers prefix="b" />;
      });

      const Consumers = memo(function Consumers({prefix}) {
        return (
          <Padding depth={2}>
            <LocalConsumer id={prefix} />
            <OuterConsumer id={prefix} />
          </Padding>
        );
      });

      function LocalConsumer({id}) {
        const value = useContext(Local);
        return <Text text={id + ' local:' + value} />;
      }

      function OuterConsumer({id}) {
        const value = useContext(Outer);
        return <Text text={id + ' outer:' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog([
        'List 0',
        'a local:0',
        'a outer:A',
        'b local:0',
        'b outer:A',
        'a local:0',
        'a outer:A',
        'b local:0',
        'b outer:A',
      ]);

      // Only the providers inside the SiblingAs change.
      await act(() => {
        setTick(1);
      });
      assertLog(['List 1', 'a local:1', 'a local:1']);
      expect(root).toMatchRenderedOutput(
        <div>
          List 1a local:1a outer:Ab local:0b outer:Aa local:1a outer:Ab local:0b
          outer:A
        </div>,
      );

      // The providers inside the SiblingAs and the distant Outer provider
      // change in the same pass.
      await act(() => {
        setTick(2);
        setValue('B');
      });
      assertLog([
        'List 2',
        'a local:2',
        'a outer:B',
        'b outer:B',
        'a local:2',
        'a outer:B',
        'b outer:B',
      ]);
      expect(root).toMatchRenderedOutput(
        <div>
          List 2a local:2a outer:Bb local:0b outer:Ba local:2a outer:Bb local:0b
          outer:B
        </div>,
      );
    });

    // @gate enableLegacyCache
    it('propagates through Suspense boundaries in sibling subtrees (content and fallback)', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={4}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <Padding depth={2}>
            <List />
          </Padding>
        );
      });

      function List() {
        const [tick, _setTick] = useState(0);
        setTick = _setTick;
        const rows = useMemo(
          () => ['x', 'y', 'z'].map(id => <Row key={id} id={id} />),
          [],
        );
        return (
          <>
            <Text text={'List ' + tick} />
            {rows}
          </>
        );
      }

      const Row = memo(function Row({id}) {
        return (
          <div>
            <Suspense fallback={<Consumer id={id + ' fallback'} />}>
              <Padding depth={2}>
                <Async id={id} />
                <Consumer id={id + ' content'} />
              </Padding>
            </Suspense>
          </div>
        );
      });

      function Async({id}) {
        readText(id);
        return null;
      }

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      // Mount with 'y' still suspended.
      await act(async () => {
        seedNextTextCache('x');
        seedNextTextCache('z');
        root.render(<App />);
      });
      assertLog([
        'List 0',
        'x content:A',
        'Suspend! [y]',
        'y fallback:A',
        'z content:A',
        // pre-warming
        'Suspend! [y]',
        'y content:A',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          List 0<div>x content:A</div>
          <div>y fallback:A</div>
          <div>z content:A</div>
        </>,
      );

      // Change the provider while the list also re-renders. The resolved
      // boundaries update their content, the suspended one its fallback.
      await act(() => {
        setValue('B');
        setTick(1);
      });
      assertLog([
        'List 1',
        'x content:B',
        // The suspended boundary retries its content first
        'Suspend! [y]',
        'y fallback:B',
        'z content:B',
        // pre-warming
        'Suspend! [y]',
        'y content:B',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          List 1<div>x content:B</div>
          <div>y fallback:B</div>
          <div>z content:B</div>
        </>,
      );

      // Same, but this time the list bails out too.
      await act(() => {
        setValue('C');
      });
      assertLog([
        'x content:C',
        'Suspend! [y]',
        'y fallback:C',
        'z content:C',
        // pre-warming
        'Suspend! [y]',
        'y content:C',
      ]);

      // Unsuspend. The revealed content must show the latest value.
      await act(async () => {
        await resolveText('y');
      });
      assertLog(['y content:C']);
      expect(root).toMatchRenderedOutput(
        <>
          List 1<div>x content:C</div>
          <div>y content:C</div>
          <div>z content:C</div>
        </>,
      );
    });

    // @gate enableLegacyCache
    it('propagates into a boundary that suspends during the update and is later retried', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={3}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <>
            <Row id="x" />
            <Row id="y" />
          </>
        );
      });

      const Row = memo(function Row({id}) {
        return (
          <div>
            <Suspense fallback={<Text text={id + ' loading'} />}>
              <AsyncConsumer id={id} />
              <Padding depth={2}>
                <Inner id={id} />
              </Padding>
            </Suspense>
          </div>
        );
      });

      // Suspends on the new value, so the boundary unwinds and re-renders
      // with its fallback in the same pass that propagated the change.
      function AsyncConsumer({id}) {
        const value = useContext(Context);
        readText(id + value);
        return <Text text={id + ':' + value} />;
      }

      const Inner = memo(function Inner({id}) {
        return <Consumer id={id + ' inner'} />;
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(async () => {
        seedNextTextCache('xA');
        root.render(<App />);
      });
      // 'yA' was not seeded, so y shows its fallback.
      assertLog([
        'x:A',
        'x inner:A',
        'Suspend! [yA]',
        'y loading',
        // pre-warming
        'Suspend! [yA]',
        'y inner:A',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <div>x:Ax inner:A</div>
          <div>y loading</div>
        </>,
      );

      await act(async () => {
        await resolveText('yA');
      });
      assertLog(['y:A', 'y inner:A']);

      // Change the provider. Both rows suspend on the new value.
      await act(() => {
        setValue('B');
      });
      assertLog([
        'Suspend! [xB]',
        'x loading',
        'Suspend! [yB]',
        'y loading',
        // pre-warming
        'Suspend! [xB]',
        'x inner:B',
        'Suspend! [yB]',
        'y inner:B',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <div>x loading</div>
          <div>y loading</div>
        </>,
      );

      await act(async () => {
        await resolveText('xB');
        await resolveText('yB');
      });
      assertLog(['x:B', 'x inner:B', 'y:B', 'y inner:B']);
      expect(root).toMatchRenderedOutput(
        <>
          <div>x:Bx inner:B</div>
          <div>y:By inner:B</div>
        </>,
      );
    });

    it('propagates into hidden Activity subtrees of bailed-out siblings', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={4}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <div>
            <List />
          </div>
        );
      });

      function List() {
        const [tick, _setTick] = useState(0);
        setTick = _setTick;
        const rows = useMemo(
          () => ['x', 'y'].map(id => <Row key={id} id={id} />),
          [],
        );
        return (
          <>
            <Text text={'List ' + tick} />
            {rows}
          </>
        );
      }

      const Row = memo(function Row({id}) {
        return (
          <>
            <Consumer id={id + ' visible'} />
            <Activity mode="hidden">
              <Padding depth={2}>
                <Consumer id={id + ' hidden'} />
              </Padding>
            </Activity>
          </>
        );
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog([
        'List 0',
        'x visible:A',
        'y visible:A',
        'x hidden:A',
        'y hidden:A',
      ]);

      await act(() => {
        setValue('B');
        setTick(1);
      });
      assertLog([
        'List 1',
        'x visible:B',
        'y visible:B',
        'x hidden:B',
        'y hidden:B',
      ]);

      await act(() => {
        setValue('C');
      });
      assertLog(['x visible:C', 'y visible:C', 'x hidden:C', 'y hidden:C']);
    });

    // @gate enableSuspenseList
    it('propagates through a SuspenseList that does a second pass', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={3}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <SuspenseList revealOrder="together">
            <Row id="x" />
            <Row id="y" />
          </SuspenseList>
        );
      });

      const Row = memo(function Row({id}) {
        return (
          <Suspense fallback={<Text text={id + ' loading'} />}>
            <AsyncConsumer id={id} />
            <Padding depth={2}>
              <Inner id={id} />
            </Padding>
          </Suspense>
        );
      });

      function AsyncConsumer({id}) {
        const value = useContext(Context);
        readText(id + value);
        return <Text text={id + ':' + value} />;
      }

      const Inner = memo(function Inner({id}) {
        return <Consumer id={id + ' inner'} />;
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(async () => {
        seedNextTextCache('xA');
        seedNextTextCache('yA');
        root.render(<App />);
      });
      assertLog(['x:A', 'x inner:A', 'y:A', 'y inner:A']);
      expect(root).toMatchRenderedOutput('x:Ax inner:Ay:Ay inner:A');

      // Change the provider. Row y suspends on the new value, which forces
      // the list to do a second pass over both rows to show them together.
      await act(async () => {
        await resolveText('xB');
        setValue('B');
      });
      assertLog([
        'x:B',
        'x inner:B',
        'Suspend! [yB]',
        'y loading',
        // second pass
        'x:B',
        'x inner:B',
        'Suspend! [yB]',
        'y loading',
        // pre-warming
        'Suspend! [yB]',
        'y inner:B',
      ]);
      expect(root).toMatchRenderedOutput('x:Bx inner:By loading');

      await act(async () => {
        await resolveText('yB');
      });
      assertLog(['y:B', 'y inner:B']);
      expect(root).toMatchRenderedOutput('x:Bx inner:By:By inner:B');
    });

    it('does not reuse walk results from an interrupted render attempt', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        return (
          <Padding depth={3}>
            <StaticMiddle />
          </Padding>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <div>
            <List />
          </div>
        );
      });

      // The provider sits directly between the re-rendering component and
      // the bailing rows, so whether it changed is only discovered by the
      // rows' own walks.
      function List() {
        const [tick, _setTick] = useState(0);
        const [value, _setValue] = useState('A');
        setTick = _setTick;
        setValue = _setValue;
        const children = useMemo(
          () =>
            [0, 1, 2].map(i => (
              <React.Fragment key={i}>
                <Row id={i} />
                <Ticker id={i} />
              </React.Fragment>
            )),
          [],
        );
        return (
          <Context.Provider value={value}>
            <TickContext.Provider value={tick}>
              <Text text={'List ' + tick + ' ' + value} />
              {children}
            </TickContext.Provider>
          </Context.Provider>
        );
      }

      const TickContext = React.createContext(0);
      function Ticker({id}) {
        const tick = useContext(TickContext);
        return <Text text={'T' + id + ':' + tick} />;
      }

      const Row = memo(function Row({id}) {
        return (
          <Padding depth={2}>
            <Consumer id={id} />
          </Padding>
        );
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog(['List 0 A', '0:A', 'T0:0', '1:A', 'T1:0', '2:A', 'T2:0']);

      // Start a transition that only bumps the tick. The rows bail out and
      // record that nothing above them changed.
      await act(async () => {
        startTransition(() => {
          setTick(1);
        });
        await waitFor(['List 1 A', 'T0:1']);

        // Interrupt with a sync update that changes the provider. The rows
        // are the same fibers as in the interrupted attempt, but this time
        // the provider above them did change.
        ReactNoop.flushSync(() => {
          setValue('B');
        });
        assertLog(['List 0 B', '0:B', '1:B', '2:B']);
        expect(root).toMatchRenderedOutput(
          <div>List 0 B0:BT0:01:BT1:02:BT2:0</div>,
        );

        // The transition starts over on top of the new state. Nothing it
        // renders reads a changed Context, so no consumer re-renders.
        await waitForAll(['List 1 B', 'T0:1', 'T1:1', 'T2:1']);
        expect(root).toMatchRenderedOutput(
          <div>List 1 B0:BT0:11:BT1:12:BT2:1</div>,
        );
      });

      // Now the other way around: the interrupted attempt saw a changed
      // provider, the interrupting one must not.
      await act(async () => {
        startTransition(() => {
          setValue('C');
        });
        await waitFor(['List 1 C', '0:C']);

        ReactNoop.flushSync(() => {
          setTick(2);
        });
        assertLog(['List 2 B', 'T0:2', 'T1:2', 'T2:2']);
        expect(root).toMatchRenderedOutput(
          <div>List 2 B0:BT0:21:BT1:22:BT2:2</div>,
        );

        await waitForAll(['List 2 C', '0:C', '1:C', '2:C']);
        expect(root).toMatchRenderedOutput(
          <div>List 2 C0:CT0:21:CT1:22:CT2:2</div>,
        );
      });
    });

    it('still propagates correctly when a render yields and resumes between siblings', async () => {
      const root = ReactNoop.createRoot();
      const Context = React.createContext('A');

      let setValue;
      let setTick;
      function App() {
        const [value, _setValue] = useState('A');
        setValue = _setValue;
        return (
          <Context.Provider value={value}>
            <Padding depth={4}>
              <StaticMiddle />
            </Padding>
          </Context.Provider>
        );
      }

      const StaticMiddle = memo(function StaticMiddle() {
        return (
          <div>
            <List />
          </div>
        );
      });

      function List() {
        const [tick, _setTick] = useState(0);
        setTick = _setTick;
        useContext(StableA);
        const rows = useMemo(
          () => [0, 1, 2, 3].map(i => <Row key={i} id={i} />),
          [],
        );
        return (
          <>
            <Text text={'List ' + tick} />
            {rows}
          </>
        );
      }

      const Row = memo(function Row({id}) {
        return (
          <Padding depth={2}>
            <Consumer id={id + 'a'} />
            <Consumer id={id + 'b'} />
          </Padding>
        );
      });

      function Consumer({id}) {
        const value = useContext(Context);
        return <Text text={id + ':' + value} />;
      }

      await act(() => {
        root.render(<App />);
      });
      assertLog([
        'List 0',
        '0a:A',
        '0b:A',
        '1a:A',
        '1b:A',
        '2a:A',
        '2b:A',
        '3a:A',
        '3b:A',
      ]);

      await act(async () => {
        startTransition(() => {
          setValue('B');
          setTick(1);
        });
        // Yield in the middle of a row, then between rows, then finish.
        await waitFor(['List 1', '0a:B']);
        await waitFor(['0b:B', '1a:B', '1b:B']);
        await waitForAll(['2a:B', '2b:B', '3a:B', '3b:B']);
      });
      expect(root).toMatchRenderedOutput(
        <div>List 10a:B0b:B1a:B1b:B2a:B2b:B3a:B3b:B</div>,
      );
    });
  });
});
