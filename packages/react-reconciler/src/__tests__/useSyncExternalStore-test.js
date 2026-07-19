/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let useSyncExternalStore;
let React;
let ReactNoop;
let Scheduler;
let act;
let useLayoutEffect;
let forwardRef;
let useImperativeHandle;
let useRef;
let useState;
let use;
let startTransition;
let waitFor;
let waitForAll;
let assertLog;
let Suspense;
let StrictMode;
let useMemo;
let textCache;

// This tests the native useSyncExternalStore implementation, not the shim.
// Tests that apply to both the native implementation and the shim should go
// into useSyncExternalStoreShared-test.js. The reason they are separate is
// because at some point we may start running the shared tests against vendored
// React DOM versions (16, 17, etc) instead of React Noop.
describe('useSyncExternalStore', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    useLayoutEffect = React.useLayoutEffect;
    useImperativeHandle = React.useImperativeHandle;
    forwardRef = React.forwardRef;
    useRef = React.useRef;
    useState = React.useState;
    use = React.use;
    useSyncExternalStore = React.useSyncExternalStore;
    startTransition = React.startTransition;
    Suspense = React.Suspense;
    StrictMode = React.StrictMode;
    useMemo = React.useMemo;
    textCache = new Map();
    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;

    act = require('internal-test-utils').act;
  });

  function resolveText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      const newRecord = {
        status: 'resolved',
        value: text,
      };
      textCache.set(text, newRecord);
    } else if (record.status === 'pending') {
      const thenable = record.value;
      record.status = 'resolved';
      record.value = text;
      thenable.pings.forEach(t => t());
    }
  }
  function readText(text) {
    const record = textCache.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          throw record.value;
        case 'rejected':
          throw record.value;
        case 'resolved':
          return record.value;
      }
    } else {
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
      textCache.set(text, newRecord);

      throw thenable;
    }
  }

  function AsyncText({text}) {
    const result = readText(text);
    Scheduler.log(text);
    return result;
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function createExternalStore(initialState) {
    const listeners = new Set();
    let currentState = initialState;
    return {
      set(text) {
        currentState = text;
        ReactNoop.batchedUpdates(() => {
          listeners.forEach(listener => listener());
        });
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getState() {
        return currentState;
      },
      getSubscriberCount() {
        return listeners.size;
      },
    };
  }

  it(
    'detects interleaved mutations during a concurrent read before ' +
      'layout effects fire',
    async () => {
      const store1 = createExternalStore(0);
      const store2 = createExternalStore(0);

      const Child = forwardRef(({store, label}, ref) => {
        const value = useSyncExternalStore(store.subscribe, store.getState);
        useImperativeHandle(ref, () => {
          return value;
        }, []);
        return <Text text={label + value} />;
      });

      function App({store}) {
        const refA = useRef(null);
        const refB = useRef(null);
        const refC = useRef(null);
        useLayoutEffect(() => {
          // This layout effect reads children that depend on an external store.
          // This demostrates whether the children are consistent when the
          // layout phase runs.
          const aText = refA.current;
          const bText = refB.current;
          const cText = refC.current;
          Scheduler.log(
            `Children observed during layout: A${aText}B${bText}C${cText}`,
          );
        });
        return (
          <>
            <Child store={store} ref={refA} label="A" />
            <Child store={store} ref={refB} label="B" />
            <Child store={store} ref={refC} label="C" />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(async () => {
        // Start a concurrent render that reads from the store, then yield.
        startTransition(() => {
          root.render(<App store={store1} />);
        });

        await waitFor(['A0', 'B0']);

        // During an interleaved event, the store is mutated.
        store1.set(1);

        // Then we continue rendering.
        await waitForAll([
          // C reads a newer value from the store than A or B, which means they
          // are inconsistent.
          'C1',

          // Before committing the layout effects, React detects that the store
          // has been mutated. So it throws out the entire completed tree and
          // re-renders the new values.
          'A1',
          'B1',
          'C1',
          // The layout effects reads consistent children.
          'Children observed during layout: A1B1C1',
        ]);
      });

      // Now we're going test the same thing during an update that
      // switches stores.
      await act(async () => {
        startTransition(() => {
          root.render(<App store={store2} />);
        });

        // Start a concurrent render that reads from the store, then yield.
        await waitFor(['A0', 'B0']);

        // During an interleaved event, the store is mutated.
        store2.set(1);

        // Then we continue rendering.
        await waitForAll([
          // C reads a newer value from the store than A or B, which means they
          // are inconsistent.
          'C1',

          // Before committing the layout effects, React detects that the store
          // has been mutated. So it throws out the entire completed tree and
          // re-renders the new values.
          'A1',
          'B1',
          'C1',
          // The layout effects reads consistent children.
          'Children observed during layout: A1B1C1',
        ]);
      });
    },
  );

  it('next value is correctly cached when state is dispatched in render phase', async () => {
    const store = createExternalStore('value:initial');

    function App() {
      const value = useSyncExternalStore(store.subscribe, store.getState);
      const [sameValue, setSameValue] = useState(value);
      if (value !== sameValue) setSameValue(value);
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      // Start a render that reads from the store and yields value
      root.render(<App />);
    });
    assertLog(['value:initial']);

    await act(() => {
      store.set('value:changed');
    });
    assertLog(['value:changed']);

    // If cached value was updated, we expect a re-render
    await act(() => {
      store.set('value:initial');
    });
    assertLog(['value:initial']);
  });

  it(
    'regression: suspending in shell after synchronously patching ' +
      'up store mutation',
    async () => {
      // Tests a case where a store is mutated during a concurrent event, then
      // during the sync re-render, a synchronous render is triggered.

      const store = createExternalStore('Initial');

      let resolve;
      const promise = new Promise(r => {
        resolve = r;
      });

      function A() {
        const value = useSyncExternalStore(store.subscribe, store.getState);

        if (value === 'Updated') {
          try {
            use(promise);
          } catch (x) {
            Scheduler.log('Suspend A');
            throw x;
          }
        }

        return <Text text={'A: ' + value} />;
      }

      function B() {
        const value = useSyncExternalStore(store.subscribe, store.getState);
        return <Text text={'B: ' + value} />;
      }

      function App() {
        return (
          <>
            <span>
              <A />
            </span>
            <span>
              <B />
            </span>
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(async () => {
        // A and B both read from the same store. Partially render A.
        startTransition(() => root.render(<App />));
        // A reads the initial value of the store.
        await waitFor(['A: Initial']);

        // Before B renders, mutate the store.
        store.set('Updated');
      });
      assertLog([
        // B reads the updated value of the store.
        'B: Updated',
        // This should a synchronous re-render of A using the updated value. In
        // this test, this causes A to suspend.
        'Suspend A',
        // pre-warming
        'B: Updated',
      ]);
      // Nothing has committed, because A suspended and no fallback
      // was provided.
      expect(root).toMatchRenderedOutput(null);

      // Resolve the data and finish rendering.
      await act(() => resolve());
      assertLog(['A: Updated', 'B: Updated']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>A: Updated</span>
          <span>B: Updated</span>
        </>,
      );
    },
  );

  it('re-checks the snapshot after re-subscribing following a StrictMode Suspense remount', async () => {
    let currentState = 0;
    let shouldMutateOnSubscribe = false;

    const store = {
      subscribe(listener) {
        if (shouldMutateOnSubscribe) {
          shouldMutateOnSubscribe = false;
          currentState = 1;
        }
        // We intentionally do not notify through the listener here; the point
        // of this test is that subscribe-time silent mutations still need the
        // post-subscribe snapshot repair path.
        return () => {};
      },
      getState() {
        return currentState;
      },
    };

    function StoreText({text}) {
      const value = useSyncExternalStore(store.subscribe, store.getState);
      const resolvedText = readText(text);
      return <Text text={resolvedText + value} />;
    }

    function App({text}) {
      return (
        <StrictMode>
          <Suspense fallback={<Text text="Loading..." />}>
            <StoreText text={text} />
          </Suspense>
        </StrictMode>
      );
    }

    resolveText('A');
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App text="A" />);
    });
    assertLog(['A0']);
    expect(root).toMatchRenderedOutput('A0');

    await act(async () => {
      shouldMutateOnSubscribe = true;
      root.render(<App text="B" />);
    });
    assertLog(['Loading...']);
    expect(root).toMatchRenderedOutput('Loading...');

    await act(() => {
      resolveText('B');
    });
    assertLog(['B0', 'B1']);
    expect(root).toMatchRenderedOutput('B1');
  });

  it('regression: does not infinite loop for only changing store reference in render', async () => {
    let store = {value: {}};
    let listeners = [];

    const ExternalStore = {
      set(value) {
        // Change the store ref, but not the value.
        // This will cause a new snapshot to be returned if set is called in render,
        // but the value is the same. Stores should not do this, but if they do
        // we shouldn't infinitely render.
        store = {...store};
        setTimeout(() => {
          store = {value};
          emitChange();
        }, 100);
        emitChange();
      },
      subscribe(listener) {
        listeners = [...listeners, listener];
        return () => {
          listeners = listeners.filter(l => l !== listener);
        };
      },
      getSnapshot() {
        return store;
      },
    };

    function emitChange() {
      listeners.forEach(l => l());
    }

    function StoreText() {
      const {value} = useSyncExternalStore(
        ExternalStore.subscribe,
        ExternalStore.getSnapshot,
      );

      useMemo(() => {
        // Set the store value on mount.
        // This breaks the rules of React, but should be handled gracefully.
        const newValue = {text: 'B'};
        if (value == null || newValue !== value) {
          ExternalStore.set(newValue);
        }
      }, []);

      return <Text text={value.text || '(not set)'} />;
    }

    function App() {
      return (
        <>
          <Suspense fallback={'Loading...'}>
            <AsyncText text={'A'} />
            <StoreText />
          </Suspense>
        </>
      );
    }

    const root = ReactNoop.createRoot();

    // The initial render suspends.
    await act(async () => {
      root.render(<App />);
    });

    // pre-warming
    assertLog(['(not set)']);

    expect(root).toMatchRenderedOutput('Loading...');

    // Resolve the data and finish rendering.
    // When resolving, the store should not get stuck in an infinite loop.
    await act(() => {
      resolveText('A');
    });
    assertLog([
      'A',
      'B',
      'A',
      'B',
      'B',
      ...(gate('alwaysThrottleRetries') ? [] : ['B']),
    ]);

    expect(root).toMatchRenderedOutput('AB');
  });
});
