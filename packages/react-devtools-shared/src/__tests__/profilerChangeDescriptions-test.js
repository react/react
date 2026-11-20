/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getVersionedRenderImplementation} from './utils';

describe('Profiler change descriptions', () => {
  let React;
  let store;
  let utils;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    store = global.store;
    store.collapseNodesByDefault = false;
    store.recordChangeDescriptions = true;

    React = require('react');
  });

  const {render} = getVersionedRenderImplementation();

  // @reactVersion >=18.0
  it('should identify useContext as the cause for a re-render', () => {
    const Context = React.createContext(0);

    function Child() {
      const context = React.useContext(Context);
      return context;
    }

    function areEqual() {
      return true;
    }

    const MemoizedChild = React.memo(Child, areEqual);
    const ForwardRefChild = React.forwardRef(
      function RefForwardingComponent(props, ref) {
        return <Child />;
      },
    );

    let forceUpdate = null;

    const App = function App() {
      const [val, dispatch] = React.useReducer(x => x + 1, 0);

      forceUpdate = dispatch;

      return (
        <Context.Provider value={val}>
          <Child />
          <MemoizedChild />
          <ForwardRefChild />
        </Context.Provider>
      );
    };

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<App />));
    utils.act(() => forceUpdate());
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getCommitData(rootID, 1);

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Context.Provider>
              <Child>
            ▾ <Child> [Memo]
                <Child>
            ▾ <RefForwardingComponent> [ForwardRef]
                <Child>
    `);

    let element = store.getElementAtIndex(2);
    expect(element.displayName).toBe('Child');
    expect(element.hocDisplayNames).toBeNull();
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": true,
        "didHooksChange": false,
        "hooks": [],
        "isFirstMount": false,
        "props": [],
        "state": null,
      }
    `);

    element = store.getElementAtIndex(3);
    expect(element.displayName).toBe('Child');
    expect(element.hocDisplayNames).toEqual(['Memo']);
    expect(commitData.changeDescriptions.get(element.id)).toBeUndefined();

    element = store.getElementAtIndex(4);
    expect(element.displayName).toBe('Child');
    expect(element.hocDisplayNames).toBeNull();
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": true,
        "didHooksChange": false,
        "hooks": [],
        "isFirstMount": false,
        "props": [],
        "state": null,
      }
    `);

    element = store.getElementAtIndex(5);
    expect(element.displayName).toBe('RefForwardingComponent');
    expect(element.hocDisplayNames).toEqual(['ForwardRef']);
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": false,
        "didHooksChange": false,
        "hooks": [],
        "isFirstMount": false,
        "props": [],
        "state": null,
      }
    `);

    element = store.getElementAtIndex(6);
    expect(element.displayName).toBe('Child');
    expect(element.hocDisplayNames).toBeNull();
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": true,
        "didHooksChange": false,
        "hooks": [],
        "isFirstMount": false,
        "props": [],
        "state": null,
      }
    `);
  });

  // @reactVersion >=18.0
  it('should not throw for memo components that wrap a forwardRef', () => {
    const MemoizedForwardRef = React.memo(
      React.forwardRef(function Input({onChange, value}, ref) {
        const [count] = React.useState(0);
        return value + count;
      }),
    );

    let forceUpdate = null;

    const App = function App() {
      const [val, dispatch] = React.useReducer(x => x + 1, 0);

      forceUpdate = dispatch;

      return <MemoizedForwardRef value={val} onChange={() => {}} />;
    };

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<App />));
    utils.act(() => forceUpdate());
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getCommitData(rootID, 1);

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Input> [Memo]
              <Input> [ForwardRef]
    `);

    let element = store.getElementAtIndex(1);
    expect(element.hocDisplayNames).toEqual(['Memo']);
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": false,
        "didHooksChange": false,
        "hooks": null,
        "isFirstMount": false,
        "props": [
          "value",
          "onChange",
        ],
        "state": null,
      }
    `);

    element = store.getElementAtIndex(2);
    expect(element.hocDisplayNames).toEqual(['ForwardRef']);
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": false,
        "didHooksChange": false,
        "hooks": [],
        "isFirstMount": false,
        "props": [
          "value",
          "onChange",
        ],
        "state": null,
      }
    `);
  });

  // @reactVersion >=18.0
  it('should not throw for memo components with a custom comparison function', () => {
    function Label({value}) {
      const [count] = React.useState(0);
      return value + count;
    }

    const MemoizedLabel = React.memo(
      Label,
      (prevProps, nextProps) => prevProps.value === nextProps.value,
    );

    let forceUpdate = null;

    const App = function App() {
      const [val, dispatch] = React.useReducer(x => x + 1, 0);

      forceUpdate = dispatch;

      return <MemoizedLabel value={val} />;
    };

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<App />));
    utils.act(() => forceUpdate());
    utils.act(() => store.profilerStore.stopProfiling());

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getCommitData(rootID, 1);

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Label> [Memo]
              <Label>
    `);

    let element = store.getElementAtIndex(1);
    expect(element.hocDisplayNames).toEqual(['Memo']);
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": false,
        "didHooksChange": false,
        "hooks": null,
        "isFirstMount": false,
        "props": [
          "value",
        ],
        "state": null,
      }
    `);

    element = store.getElementAtIndex(2);
    expect(element.hocDisplayNames).toBeNull();
    expect(commitData.changeDescriptions.get(element.id))
      .toMatchInlineSnapshot(`
      {
        "context": false,
        "didHooksChange": false,
        "hooks": [],
        "isFirstMount": false,
        "props": [
          "value",
        ],
        "state": null,
      }
    `);
  });
});
