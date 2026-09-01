/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';

const {useState, useEffect, useSyncExternalStore} = React;

// Create a simple external store for demonstratio
function createStore<T>(initialValue: T): {
  subscribe: (cb: () => void) => () => any,
  getSnapshot: () => T,
  setValue: (newValue: T) => void,
} {
  let value = initialValue;
  const subscribers = new Set<() => void>();

  return {
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    getSnapshot() {
      return value;
    },
    setValue(newValue) {
      value = newValue;
      subscribers.forEach(callback => callback());
    },
  };
}

const counterStore = createStore(0);
const themeStore = createStore('light');

export default function UseSyncExternalStore(): React.Node {
  return (
    <>
      <h2>useSyncExternalStore()</h2>
      <SingleHookCase />
      <HookTreeCase />
      <MultipleStoresCase />
    </>
  );
}

function SingleHookCase(): React.Node {
  const count = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot,
  );

  return (
    <div>
      <h3>Single hook case</h3>
      <p>Count: {count}</p>
      <button onClick={() => counterStore.setValue(count + 1)}>
        Increment
      </button>
      <button onClick={() => counterStore.setValue(count - 1)}>
        Decrement
      </button>
    </div>
  );
}

function useCounter() {
  const count = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot,
  );
  const [localState, setLocalState] = useState(0);

  useEffect(() => {
    // Some effect
  }, [count]);

  return {count, localState, setLocalState};
}

function HookTreeCase(): React.Node {
  const {count, localState, setLocalState} = useCounter();

  return (
    <div>
      <h3>Hook tree case</h3>
      <p>External count: {count}</p>
      <p>Local state: {localState}</p>
      <button onClick={() => counterStore.setValue(count + 1)}>
        Increment External
      </button>
      <button onClick={() => setLocalState(localState + 1)}>
        Increment Local
      </button>
    </div>
  );
}

function useTheme() {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
  );

  return theme;
}

function MultipleStoresCase() {
  const count = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot,
  );
  const theme = useTheme();

  return (
    <div style={{background: theme === 'dark' ? '#333' : '#fff'}}>
      <h3>Multiple stores case</h3>
      <p>Count: {count}</p>
      <p>Theme: {theme}</p>
      <button
        onClick={() =>
          themeStore.setValue(theme === 'light' ? 'dark' : 'light')
        }>
        Toggle Theme
      </button>
    </div>
  );
}
