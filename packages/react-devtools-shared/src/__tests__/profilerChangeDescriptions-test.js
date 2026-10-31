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
  it('should not throw when a memo(forwardRef()) component re-renders', () => {
    let setCount = null;

    const ControlledMemoInput = React.memo(
      React.forwardRef(function ControlledMemoInput({onChange, value}, ref) {
        const [count, _setCount] = React.useState(0);
        setCount = _setCount;
        return (
          <input
            ref={ref}
            onChange={onChange}
            value={value}
            data-count={count}
          />
        );
      }),
    );

    let setValue = null;

    function App() {
      const [value, _setValue] = React.useState('');
      setValue = _setValue;
      return (
        <ControlledMemoInput
          value={value}
          onChange={event => _setValue(event.target.value)}
        />
      );
    }

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<App />));
    // Inspecting hooks re-runs the component with react-debug-tools' dispatcher,
    // which replaces setters captured during render with no-ops. So trigger
    // each update before its component has been inspected.
    utils.act(() => setCount(1));
    utils.act(() => setValue('a'));
    utils.act(() => store.profilerStore.stopProfiling());

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <ControlledMemoInput> [Memo]
              <ControlledMemoInput> [ForwardRef]
    `);

    const rootID = store.roots[0];
    const memoElement = store.getElementAtIndex(1);
    expect(memoElement.hocDisplayNames).toEqual(['Memo']);
    const forwardRefElement = store.getElementAtIndex(2);
    expect(forwardRefElement.hocDisplayNames).toEqual(['ForwardRef']);

    // An inner state update bails out of the memo wrapper, and the
    // forwardRef still reports its own hook change.
    let commitData = store.profilerStore.getCommitData(rootID, 1);
    expect(commitData.changeDescriptions.get(memoElement.id)).toBeUndefined();
    expect(commitData.changeDescriptions.get(forwardRefElement.id))
      .toMatchInlineSnapshot(`
      {
        "context": false,
        "didHooksChange": true,
        "hooks": [
          0,
        ],
        "isFirstMount": false,
        "props": [],
        "state": null,
      }
    `);

    // New props re-render the memo wrapper, which doesn't own any hooks.
    commitData = store.profilerStore.getCommitData(rootID, 2);
    expect(commitData.changeDescriptions.get(memoElement.id))
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
    expect(commitData.changeDescriptions.get(forwardRefElement.id))
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
  it('should not throw when a memo() component with a custom compare function re-renders', () => {
    function Child({value}) {
      const [state] = React.useState(0);
      return `${value}:${state}`;
    }

    const MemoizedChild = React.memo(
      Child,
      (prevProps, nextProps) => prevProps.value === nextProps.value,
    );

    let setValue = null;

    function App() {
      const [value, _setValue] = React.useState(0);
      setValue = _setValue;
      return <MemoizedChild value={value} />;
    }

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => render(<App />));
    utils.act(() => setValue(1));
    utils.act(() => store.profilerStore.stopProfiling());

    expect(store).toMatchInlineSnapshot(`
      [root]
        ▾ <App>
          ▾ <Child> [Memo]
              <Child>
    `);

    const rootID = store.roots[0];
    const commitData = store.profilerStore.getCommitData(rootID, 1);

    const memoElement = store.getElementAtIndex(1);
    expect(memoElement.hocDisplayNames).toEqual(['Memo']);
    expect(commitData.changeDescriptions.get(memoElement.id))
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

    const childElement = store.getElementAtIndex(2);
    expect(childElement.hocDisplayNames).toBeNull();
    expect(commitData.changeDescriptions.get(childElement.id))
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
