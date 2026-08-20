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

let useSyncExternalStore;
let React;
let ReactDOM;
let ReactDOMServer;
let Scheduler;
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

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMServer = require('react-dom/server');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;

    useSyncExternalStore =
      require('use-sync-external-store/shim').useSyncExternalStore;
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
        ReactDOM.unstable_batchedUpdates(() => {
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

  it('basic server render', async () => {
    const store = createExternalStore('client');

    function App() {
      const text = useSyncExternalStore(
        store.subscribe,
        store.getState,
        () => 'server',
      );
      return <Text text={text} />;
    }

    const html = ReactDOMServer.renderToString(<App />);

    // We don't call getServerSnapshot in the shim
    assertLog(['client']);
    expect(html).toEqual('client');
  });
});
