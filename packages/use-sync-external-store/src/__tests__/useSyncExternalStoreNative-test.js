/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 *
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let useSyncExternalStore;
let useSyncExternalStoreWithSelector;
let act;
let assertLog;

// This tests the userspace shim of `useSyncExternalStore` in a server-rendering
// (Node) environment
describe('useSyncExternalStore (userspace shim, server rendering)', () => {
  beforeEach(() => {
    jest.resetModules();

    // Remove useSyncExternalStore from the React imports so that we use the
    // shim instead. Also removing startTransition, since we use that to detect
    // outdated 18 alphas that don't yet include useSyncExternalStore.
    //
    // Longer term, we'll probably test this branch using an actual build of
    // React 17.
    jest.mock('react', () => {
      const {
        startTransition: _,
        useSyncExternalStore: __,
        ...otherExports
      } = jest.requireActual('react');
      return otherExports;
    });

    jest.mock('use-sync-external-store/shim', () =>
      jest.requireActual('use-sync-external-store/shim/index.native'),
    );

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;

    if (gate(flags => flags.source)) {
      // The `shim/with-selector` module composes the main
      // `use-sync-external-store` entrypoint. In the compiled artifacts, this
      // is resolved to the `shim` implementation by our build config, but when
      // running the tests against the source files, we need to tell Jest how to
      // resolve it. Because this is a source module, this mock has no affect on
      // the build tests.
      jest.mock('use-sync-external-store/src/useSyncExternalStore', () =>
        jest.requireActual('use-sync-external-store/shim'),
      );
      jest.mock('use-sync-external-store/src/isServerEnvironment', () =>
        jest.requireActual(
          'use-sync-external-store/src/forks/isServerEnvironment.native',
        ),
      );
    }
    useSyncExternalStore =
      require('use-sync-external-store/shim').useSyncExternalStore;
    useSyncExternalStoreWithSelector =
      require('use-sync-external-store/shim/with-selector').useSyncExternalStoreWithSelector;
  });

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

  it('native version', async () => {
    const store = createExternalStore('client');

    function App() {
      const text = useSyncExternalStore(
        store.subscribe,
        store.getState,
        () => 'server',
      );
      return <Text text={text} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['client']);
    expect(root).toMatchRenderedOutput('client');
  });

  it('Using isEqual to bailout', async () => {
    const store = createExternalStore({a: 0, b: 0});

    function A() {
      const {a} = useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getState,
        null,
        state => ({a: state.a}),
        (state1, state2) => state1.a === state2.a,
      );
      return <Text text={'A' + a} />;
    }
    function B() {
      const {b} = useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getState,
        null,
        state => {
          return {b: state.b};
        },
        (state1, state2) => state1.b === state2.b,
      );
      return <Text text={'B' + b} />;
    }

    function App() {
      return (
        <>
          <A />
          <B />
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));

    assertLog(['A0', 'B0']);
    expect(root).toMatchRenderedOutput('A0B0');

    // Update b but not a
    await act(() => {
      store.set({a: 0, b: 1});
    });
    // Only b re-renders
    assertLog(['B1']);
    expect(root).toMatchRenderedOutput('A0B1');

    // Update a but not b
    await act(() => {
      store.set({a: 1, b: 1});
    });
    // Only a re-renders
    assertLog(['A1']);
    expect(root).toMatchRenderedOutput('A1B1');
  });
});
