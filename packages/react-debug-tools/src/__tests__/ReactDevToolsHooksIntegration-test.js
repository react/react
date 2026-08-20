/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

describe('React hooks DevTools integration', () => {
  let React;
  let ReactDebugTools;
  let ReactTestRenderer;
  let act;
  let overrideHookState;
  let scheduleUpdate;
  let scheduleRetry;
  let setSuspenseHandler;
  let waitForAll;

  global.IS_REACT_ACT_ENVIRONMENT = true;

  beforeEach(() => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      inject: injected => {
        overrideHookState = injected.overrideHookState;
        scheduleUpdate = injected.scheduleUpdate;
        scheduleRetry = injected.scheduleRetry;
        setSuspenseHandler = injected.setSuspenseHandler;
      },
      supportsFiber: true,
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    };

    jest.resetModules();

    React = require('react');
    ReactDebugTools = require('react-debug-tools');
    ReactTestRenderer = require('react-test-renderer');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;

    act = require('internal-test-utils').act;
  });

  it('should support editing useState hooks', async () => {
    let setCountFn;

    function MyComponent() {
      const [count, setCount] = React.useState(0);
      setCountFn = setCount;
      return <div>count:{count}</div>;
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<MyComponent />, {
        unstable_isConcurrent: true,
      });
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['count:', '0'],
    });

    const fiber = renderer.root.findByType(MyComponent)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(fiber);
    const stateHook = tree[0];
    expect(stateHook.isStateEditable).toBe(true);

    if (__DEV__) {
      await act(() => overrideHookState(fiber, stateHook.id, [], 10));
      expect(renderer.toJSON()).toEqual({
        type: 'div',
        props: {},
        children: ['count:', '10'],
      });

      await act(() => setCountFn(count => count + 1));
      expect(renderer.toJSON()).toEqual({
        type: 'div',
        props: {},
        children: ['count:', '11'],
      });
    }
  });

  it('should support editable useReducer hooks', async () => {
    const initialData = {foo: 'abc', bar: 123};

    function reducer(state, action) {
      switch (action.type) {
        case 'swap':
          return {foo: state.bar, bar: state.foo};
        default:
          throw new Error();
      }
    }

    let dispatchFn;
    function MyComponent() {
      const [state, dispatch] = React.useReducer(reducer, initialData);
      dispatchFn = dispatch;
      return (
        <div>
          foo:{state.foo}, bar:{state.bar}
        </div>
      );
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<MyComponent />, {
        unstable_isConcurrent: true,
      });
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['foo:', 'abc', ', bar:', '123'],
    });

    const fiber = renderer.root.findByType(MyComponent)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(fiber);
    const reducerHook = tree[0];
    expect(reducerHook.isStateEditable).toBe(true);

    if (__DEV__) {
      await act(() => overrideHookState(fiber, reducerHook.id, ['foo'], 'def'));
      expect(renderer.toJSON()).toEqual({
        type: 'div',
        props: {},
        children: ['foo:', 'def', ', bar:', '123'],
      });

      await act(() => dispatchFn({type: 'swap'}));
      expect(renderer.toJSON()).toEqual({
        type: 'div',
        props: {},
        children: ['foo:', '123', ', bar:', 'def'],
      });
    }
  });

  // This test case is based on an open source bug report:
  // https://github.com/facebookincubator/redux-react-hook/issues/34#issuecomment-466693787
  it('should handle interleaved stateful hooks (e.g. useState) and non-stateful hooks (e.g. useContext)', async () => {
    const MyContext = React.createContext(1);

    let setStateFn;
    function useCustomHook() {
      const context = React.useContext(MyContext);
      const [state, setState] = React.useState({count: context});
      React.useDebugValue(state.count);
      setStateFn = setState;
      return state.count;
    }

    function MyComponent() {
      const count = useCustomHook();
      return <div>count:{count}</div>;
    }

    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<MyComponent />, {
        unstable_isConcurrent: true,
      });
    });
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['count:', '1'],
    });

    const fiber = renderer.root.findByType(MyComponent)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(fiber);
    const stateHook = tree[0].subHooks[1];
    expect(stateHook.isStateEditable).toBe(true);

    if (__DEV__) {
      await act(() => overrideHookState(fiber, stateHook.id, ['count'], 10));
      expect(renderer.toJSON()).toEqual({
        type: 'div',
        props: {},
        children: ['count:', '10'],
      });
      await act(() => setStateFn(state => ({count: state.count + 1})));
      expect(renderer.toJSON()).toEqual({
        type: 'div',
        props: {},
        children: ['count:', '11'],
      });
    }
  });

  it('should support overriding suspense in legacy mode', async () => {
    if (__DEV__) {
      // Lock the first render
      setSuspenseHandler(() => true);
    }

    function MyComponent() {
      return 'Done';
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(
        <div>
          <React.Suspense fallback={'Loading'}>
            <MyComponent />
          </React.Suspense>
        </div>,
        {unstable_isConcurrent: true},
      );
    });
    const fiber = renderer.root._currentFiber().child;
    if (__DEV__) {
      // First render was locked
      expect(renderer.toJSON().children).toEqual(['Loading']);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);

      // Release the lock
      setSuspenseHandler(() => false);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);

      // Lock again
      setSuspenseHandler(() => true);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);

      // Release the lock again
      setSuspenseHandler(() => false);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);

      // Ensure it checks specific fibers.
      setSuspenseHandler(f => f === fiber || f === fiber.alternate);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);
      setSuspenseHandler(f => f !== fiber && f !== fiber.alternate);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);
    } else {
      expect(renderer.toJSON().children).toEqual(['Done']);
    }
  });

  it('should support overriding suspense in concurrent mode', async () => {
    if (__DEV__) {
      // Lock the first render
      setSuspenseHandler(() => true);
    }

    function MyComponent() {
      return 'Done';
    }

    const renderer = await act(() =>
      ReactTestRenderer.create(
        <div>
          <React.Suspense fallback={'Loading'}>
            <MyComponent />
          </React.Suspense>
        </div>,
        {unstable_isConcurrent: true},
      ),
    );

    await waitForAll([]);
    // Ensure we timeout any suspense time.
    jest.advanceTimersByTime(1000);
    const fiber = renderer.root._currentFiber().child;
    if (__DEV__) {
      // First render was locked
      expect(renderer.toJSON().children).toEqual(['Loading']);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);

      // Release the lock
      setSuspenseHandler(() => false);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);

      // Lock again
      setSuspenseHandler(() => true);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);

      // Release the lock again
      setSuspenseHandler(() => false);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);

      // Ensure it checks specific fibers.
      setSuspenseHandler(f => f === fiber || f === fiber.alternate);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);
      setSuspenseHandler(f => f !== fiber && f !== fiber.alternate);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);
    } else {
      expect(renderer.toJSON().children).toEqual(['Done']);
    }

    if (scheduleRetry) {
      // Lock again, synchronously
      setSuspenseHandler(() => true);
      await act(() => scheduleUpdate(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Loading']);

      // Release the lock again but this time using retry lane
      setSuspenseHandler(() => false);
      await act(() => scheduleRetry(fiber)); // Re-render
      expect(renderer.toJSON().children).toEqual(['Done']);
    }
  });
});
