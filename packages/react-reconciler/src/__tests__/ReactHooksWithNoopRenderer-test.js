/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-func-assign */

'use strict';

let React;
let textCache;
let readText;
let resolveText;
let ReactNoop;
let Scheduler;
let Suspense;
let Activity;
let useState;
let useReducer;
let useEffect;
let useInsertionEffect;
let useLayoutEffect;
let useCallback;
let useMemo;
let useRef;
let useImperativeHandle;
let useTransition;
let useDeferredValue;
let forwardRef;
let memo;
let act;
let ContinuousEventPriority;
let SuspenseList;
let waitForAll;
let waitFor;
let waitForThrow;
let waitForPaint;
let assertLog;
let assertConsoleErrorDev;

describe('ReactHooksWithNoopRenderer', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    useState = React.useState;
    useReducer = React.useReducer;
    useEffect = React.useEffect;
    useInsertionEffect = React.useInsertionEffect;
    useLayoutEffect = React.useLayoutEffect;
    useCallback = React.useCallback;
    useMemo = React.useMemo;
    useRef = React.useRef;
    useImperativeHandle = React.useImperativeHandle;
    forwardRef = React.forwardRef;
    memo = React.memo;
    useTransition = React.useTransition;
    useDeferredValue = React.useDeferredValue;
    Suspense = React.Suspense;
    Activity = React.Activity;
    ContinuousEventPriority =
      require('react-reconciler/constants').ContinuousEventPriority;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForThrow = InternalTestUtils.waitForThrow;
    waitForPaint = InternalTestUtils.waitForPaint;
    assertLog = InternalTestUtils.assertLog;

    textCache = new Map();

    readText = text => {
      const record = textCache.get(text);
      if (record !== undefined) {
        switch (record.status) {
          case 'pending':
            throw record.promise;
          case 'rejected':
            throw Error('Failed to load: ' + text);
          case 'resolved':
            return text;
        }
      } else {
        let ping;
        const promise = new Promise(resolve => (ping = resolve));
        const newRecord = {
          status: 'pending',
          ping: ping,
          promise,
        };
        textCache.set(text, newRecord);
        throw promise;
      }
    };

    resolveText = text => {
      const record = textCache.get(text);
      if (record !== undefined) {
        if (record.status === 'pending') {
          Scheduler.log(`Promise resolved [${text}]`);
          record.ping();
          record.ping = null;
          record.status = 'resolved';
          clearTimeout(record.promise._timer);
          record.promise = null;
        }
      } else {
        const newRecord = {
          ping: null,
          status: 'resolved',
          promise: null,
        };
        textCache.set(text, newRecord);
      }
    };
  });

  function Text(props) {
    Scheduler.log(props.text);
    return <span prop={props.text} />;
  }

  function AsyncText(props) {
    const text = props.text;
    try {
      readText(text);
      Scheduler.log(text);
      return <span prop={text} />;
    } catch (promise) {
      if (typeof promise.then === 'function') {
        Scheduler.log(`Suspend! [${text}]`);
        if (typeof props.ms === 'number' && promise._timer === undefined) {
          promise._timer = setTimeout(() => {
            resolveText(text);
          }, props.ms);
        }
      } else {
        Scheduler.log(`Error! [${text}]`);
      }
      throw promise;
    }
  }

  function advanceTimers(ms) {
    // Note: This advances Jest's virtual time but not React's. Use
    // ReactNoop.expire for that.
    if (typeof ms !== 'number') {
      throw new Error('Must specify ms');
    }
    jest.advanceTimersByTime(ms);
    // Wait until the end of the current tick
    // We cannot use a timer since we're faking them
    return Promise.resolve().then(() => {});
  }

  it('resumes after an interruption', async () => {
    function Counter(props, ref) {
      const [count, updateCount] = useState(0);
      useImperativeHandle(ref, () => ({updateCount}));
      return <Text text={props.label + ': ' + count} />;
    }
    Counter = forwardRef(Counter);

    // Initial mount
    const counter = React.createRef(null);
    ReactNoop.render(<Counter label="Count" ref={counter} />);
    await waitForAll(['Count: 0']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

    // Schedule some updates
    await act(async () => {
      React.startTransition(() => {
        counter.current.updateCount(1);
        counter.current.updateCount(count => count + 10);
      });

      // Partially flush without committing
      await waitFor(['Count: 11']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      // Interrupt with a high priority update
      ReactNoop.flushSync(() => {
        ReactNoop.render(<Counter label="Total" />);
      });
      assertLog(['Total: 0']);

      // Resume rendering
      await waitForAll(['Total: 11']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Total: 11" />);
    });
  });

  it('throws inside class components', async () => {
    class BadCounter extends React.Component {
      render() {
        const [count] = useState(0);
        return <Text text={this.props.label + ': ' + count} />;
      }
    }
    ReactNoop.render(<BadCounter />);

    await waitForThrow(
      'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
        ' one of the following reasons:\n' +
        '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
        '2. You might be breaking the Rules of Hooks\n' +
        '3. You might have more than one copy of React in the same app\n' +
        'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
    );

    // Confirm that a subsequent hook works properly.
    function GoodCounter(props, ref) {
      const [count] = useState(props.initialCount);
      return <Text text={count} />;
    }
    ReactNoop.render(<GoodCounter initialCount={10} />);
    await waitForAll([10]);
  });

  it('throws when called outside the render phase', async () => {
    expect(() => useState(0)).toThrow(
      "Cannot read property 'useState' of null",
    );
    assertConsoleErrorDev([
      'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
        ' one of the following reasons:\n' +
        '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
        '2. You might be breaking the Rules of Hooks\n' +
        '3. You might have more than one copy of React in the same app\n' +
        'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
    ]);
  });

  describe('useState', () => {
    it('simple mount and update', async () => {
      function Counter(props, ref) {
        const [count, updateCount] = useState(0);
        useImperativeHandle(ref, () => ({updateCount}));
        return <Text text={'Count: ' + count} />;
      }
      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      await act(() => counter.current.updateCount(1));
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);

      await act(() => counter.current.updateCount(count => count + 10));
      assertLog(['Count: 11']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 11" />);
    });

    it('lazy state initializer', async () => {
      function Counter(props, ref) {
        const [count, updateCount] = useState(() => {
          Scheduler.log('getInitialState');
          return props.initialState;
        });
        useImperativeHandle(ref, () => ({updateCount}));
        return <Text text={'Count: ' + count} />;
      }
      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter initialState={42} ref={counter} />);
      await waitForAll(['getInitialState', 'Count: 42']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 42" />);

      await act(() => counter.current.updateCount(7));
      assertLog(['Count: 7']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 7" />);
    });

    it('multiple states', async () => {
      function Counter(props, ref) {
        const [count, updateCount] = useState(0);
        const [label, updateLabel] = useState('Count');
        useImperativeHandle(ref, () => ({updateCount, updateLabel}));
        return <Text text={label + ': ' + count} />;
      }
      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      await act(() => counter.current.updateCount(7));
      assertLog(['Count: 7']);

      await act(() => counter.current.updateLabel('Total'));
      assertLog(['Total: 7']);
    });

    it('returns the same updater function every time', async () => {
      let updater = null;
      function Counter() {
        const [count, updateCount] = useState(0);
        updater = updateCount;
        return <Text text={'Count: ' + count} />;
      }
      ReactNoop.render(<Counter />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      const firstUpdater = updater;

      await act(() => firstUpdater(1));
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);

      const secondUpdater = updater;

      await act(() => firstUpdater(count => count + 10));
      assertLog(['Count: 11']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 11" />);

      expect(firstUpdater).toBe(secondUpdater);
    });

    it('does not warn on set after unmount', async () => {
      let _updateCount;
      function Counter(props, ref) {
        const [, updateCount] = useState(0);
        _updateCount = updateCount;
        return null;
      }

      ReactNoop.render(<Counter />);
      await waitForAll([]);
      ReactNoop.render(null);
      await waitForAll([]);
      await act(() => _updateCount(1));
    });

    it('works with memo', async () => {
      let _updateCount;
      function Counter(props) {
        const [count, updateCount] = useState(0);
        _updateCount = updateCount;
        return <Text text={'Count: ' + count} />;
      }
      Counter = memo(Counter);

      ReactNoop.render(<Counter />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      ReactNoop.render(<Counter />);
      await waitForAll([]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      await act(() => _updateCount(1));
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
    });
  });

  describe('updates during the render phase', () => {
    it('restarts the render function and applies the new updates on top', async () => {
      function ScrollView({row: newRow}) {
        const [isScrollingDown, setIsScrollingDown] = useState(false);
        const [row, setRow] = useState(null);

        if (row !== newRow) {
          // Row changed since last render. Update isScrollingDown.
          setIsScrollingDown(row !== null && newRow > row);
          setRow(newRow);
        }

        return <Text text={`Scrolling down: ${isScrollingDown}`} />;
      }

      ReactNoop.render(<ScrollView row={1} />);
      await waitForAll(['Scrolling down: false']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Scrolling down: false" />,
      );

      ReactNoop.render(<ScrollView row={5} />);
      await waitForAll(['Scrolling down: true']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Scrolling down: true" />,
      );

      ReactNoop.render(<ScrollView row={5} />);
      await waitForAll(['Scrolling down: true']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Scrolling down: true" />,
      );

      ReactNoop.render(<ScrollView row={10} />);
      await waitForAll(['Scrolling down: true']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Scrolling down: true" />,
      );

      ReactNoop.render(<ScrollView row={2} />);
      await waitForAll(['Scrolling down: false']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Scrolling down: false" />,
      );

      ReactNoop.render(<ScrollView row={2} />);
      await waitForAll(['Scrolling down: false']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Scrolling down: false" />,
      );
    });

    it('warns about render phase update on a different component', async () => {
      let setStep;
      function Foo() {
        const [step, _setStep] = useState(0);
        setStep = _setStep;
        return <Text text={`Foo [${step}]`} />;
      }

      function Bar({triggerUpdate}) {
        if (triggerUpdate) {
          setStep(x => x + 1);
        }
        return <Text text="Bar" />;
      }

      const root = ReactNoop.createRoot();

      await act(() => {
        root.render(
          <>
            <Foo />
            <Bar />
          </>,
        );
      });
      assertLog(['Foo [0]', 'Bar']);

      // Bar will update Foo during its render phase. React should warn.
      root.render(
        <>
          <Foo />
          <Bar triggerUpdate={true} />
        </>,
      );
      await waitForAll(['Foo [0]', 'Bar', 'Foo [1]']);
      assertConsoleErrorDev([
        'Cannot update a component (`Foo`) while rendering a different component (`Bar`). ' +
          'To locate the bad setState() call inside `Bar`, ' +
          'follow the stack trace as described in https://react.dev/link/setstate-in-render\n' +
          '    in Bar (at **)',
      ]);

      // It should not warn again (deduplication).
      await act(async () => {
        root.render(
          <>
            <Foo />
            <Bar triggerUpdate={true} />
          </>,
        );
        await waitForAll(['Foo [1]', 'Bar', 'Foo [2]']);
      });
    });

    it('keeps restarting until there are no more new updates', async () => {
      function Counter({row: newRow}) {
        const [count, setCount] = useState(0);
        if (count < 3) {
          setCount(count + 1);
        }
        Scheduler.log('Render: ' + count);
        return <Text text={count} />;
      }

      ReactNoop.render(<Counter />);
      await waitForAll(['Render: 0', 'Render: 1', 'Render: 2', 'Render: 3', 3]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={3} />);
    });

    it('updates multiple times within same render function', async () => {
      function Counter({row: newRow}) {
        const [count, setCount] = useState(0);
        if (count < 12) {
          setCount(c => c + 1);
          setCount(c => c + 1);
          setCount(c => c + 1);
        }
        Scheduler.log('Render: ' + count);
        return <Text text={count} />;
      }

      ReactNoop.render(<Counter />);
      await waitForAll([
        // Should increase by three each time
        'Render: 0',
        'Render: 3',
        'Render: 6',
        'Render: 9',
        'Render: 12',
        12,
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={12} />);
    });

    it('throws after too many iterations', async () => {
      function Counter({row: newRow}) {
        const [count, setCount] = useState(0);
        setCount(count + 1);
        Scheduler.log('Render: ' + count);
        return <Text text={count} />;
      }
      ReactNoop.render(<Counter />);
      await waitForThrow(
        'Too many re-renders. React limits the number of renders to prevent ' +
          'an infinite loop.',
      );
    });

    it('works with useReducer', async () => {
      function reducer(state, action) {
        return action === 'increment' ? state + 1 : state;
      }
      function Counter({row: newRow}) {
        const [count, dispatch] = useReducer(reducer, 0);
        if (count < 3) {
          dispatch('increment');
        }
        Scheduler.log('Render: ' + count);
        return <Text text={count} />;
      }

      ReactNoop.render(<Counter />);
      await waitForAll(['Render: 0', 'Render: 1', 'Render: 2', 'Render: 3', 3]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={3} />);
    });

    it('uses reducer passed at time of render, not time of dispatch', async () => {
      // This test is a bit contrived but it demonstrates a subtle edge case.

      // Reducer A increments by 1. Reducer B increments by 10.
      function reducerA(state, action) {
        switch (action) {
          case 'increment':
            return state + 1;
          case 'reset':
            return 0;
        }
      }
      function reducerB(state, action) {
        switch (action) {
          case 'increment':
            return state + 10;
          case 'reset':
            return 0;
        }
      }

      function Counter({row: newRow}, ref) {
        const [reducer, setReducer] = useState(() => reducerA);
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeHandle(ref, () => ({dispatch}));
        if (count < 20) {
          dispatch('increment');
          // Swap reducers each time we increment
          if (reducer === reducerA) {
            setReducer(() => reducerB);
          } else {
            setReducer(() => reducerA);
          }
        }
        Scheduler.log('Render: ' + count);
        return <Text text={count} />;
      }
      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll([
        // The count should increase by alternating amounts of 10 and 1
        // until we reach 21.
        'Render: 0',
        'Render: 10',
        'Render: 11',
        'Render: 21',
        21,
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={21} />);

      // Test that it works on update, too. This time the log is a bit different
      // because we started with reducerB instead of reducerA.
      await act(() => {
        counter.current.dispatch('reset');
      });
      ReactNoop.render(<Counter ref={counter} />);
      assertLog([
        'Render: 0',
        'Render: 1',
        'Render: 11',
        'Render: 12',
        'Render: 22',
        22,
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={22} />);
    });

    it('discards render phase updates if something suspends', async () => {
      const thenable = {then() {}};
      function Foo({signal}) {
        return (
          <Suspense fallback="Loading...">
            <Bar signal={signal} />
          </Suspense>
        );
      }

      function Bar({signal: newSignal}) {
        const [counter, setCounter] = useState(0);
        const [signal, setSignal] = useState(true);

        // Increment a counter every time the signal changes
        if (signal !== newSignal) {
          setCounter(c => c + 1);
          setSignal(newSignal);
          if (counter === 0) {
            // We're suspending during a render that includes render phase
            // updates. Those updates should not persist to the next render.
            Scheduler.log('Suspend!');
            throw thenable;
          }
        }

        return <Text text={counter} />;
      }

      const root = ReactNoop.createRoot();
      root.render(<Foo signal={true} />);

      await waitForAll([0]);
      expect(root).toMatchRenderedOutput(<span prop={0} />);

      React.startTransition(() => {
        root.render(<Foo signal={false} />);
      });
      await waitForAll(['Suspend!']);
      expect(root).toMatchRenderedOutput(<span prop={0} />);

      // Rendering again should suspend again.
      React.startTransition(() => {
        root.render(<Foo signal={false} />);
      });
      await waitForAll(['Suspend!']);
    });

    it('discards render phase updates if something suspends, but not other updates in the same component', async () => {
      const thenable = {then() {}};
      function Foo({signal}) {
        return (
          <Suspense fallback="Loading...">
            <Bar signal={signal} />
          </Suspense>
        );
      }

      let setLabel;
      function Bar({signal: newSignal}) {
        const [counter, setCounter] = useState(0);

        if (counter === 1) {
          // We're suspending during a render that includes render phase
          // updates. Those updates should not persist to the next render.
          Scheduler.log('Suspend!');
          throw thenable;
        }

        const [signal, setSignal] = useState(true);

        // Increment a counter every time the signal changes
        if (signal !== newSignal) {
          setCounter(c => c + 1);
          setSignal(newSignal);
        }

        const [label, _setLabel] = useState('A');
        setLabel = _setLabel;

        return <Text text={`${label}:${counter}`} />;
      }

      const root = ReactNoop.createRoot();
      root.render(<Foo signal={true} />);

      await waitForAll(['A:0']);
      expect(root).toMatchRenderedOutput(<span prop="A:0" />);

      await act(async () => {
        React.startTransition(() => {
          root.render(<Foo signal={false} />);
          setLabel('B');
        });

        await waitForAll(['Suspend!']);
        expect(root).toMatchRenderedOutput(<span prop="A:0" />);

        // Rendering again should suspend again.
        React.startTransition(() => {
          root.render(<Foo signal={false} />);
        });
        await waitForAll(['Suspend!']);

        // Flip the signal back to "cancel" the update. However, the update to
        // label should still proceed. It shouldn't have been dropped.
        React.startTransition(() => {
          root.render(<Foo signal={true} />);
        });
        await waitForAll(['B:0']);
        expect(root).toMatchRenderedOutput(<span prop="B:0" />);
      });
    });

    it(
      'preserves pending updates on later hooks that were not processed ' +
        'before unwind',
      async () => {
        const thenable = {then() {}};

        let setLabel;
        function Foo({suspend}) {
          return (
            <Suspense fallback="Loading...">
              <Bar suspend={suspend} />
            </Suspense>
          );
        }

        function Bar({suspend}) {
          const [counter, setCounter] = useState(0);

          if (suspend) {
            setCounter(c => c + 1);
            Scheduler.log('Suspend!');
            throw thenable;
          }

          const [label, _setLabel] = useState('A');
          setLabel = _setLabel;

          return <Text text={`${label}:${counter}`} />;
        }

        const root = ReactNoop.createRoot();
        root.render(<Foo suspend={false} />);

        await waitForAll(['A:0']);
        expect(root).toMatchRenderedOutput(<span prop="A:0" />);

        await act(async () => {
          React.startTransition(() => {
            root.render(<Foo suspend={true} />);
            setLabel('B');
          });

          await waitForAll(['Suspend!']);
          expect(root).toMatchRenderedOutput(<span prop="A:0" />);

          React.startTransition(() => {
            root.render(<Foo suspend={false} />);
          });

          await waitForAll(['B:0']);
          expect(root).toMatchRenderedOutput(<span prop="B:0" />);
        });
      },
    );

    it('regression: render phase updates cause lower pri work to be dropped', async () => {
      let setRow;
      function ScrollView() {
        const [row, _setRow] = useState(10);
        setRow = _setRow;

        const [scrollDirection, setScrollDirection] = useState('Up');
        const [prevRow, setPrevRow] = useState(null);

        if (prevRow !== row) {
          setScrollDirection(prevRow !== null && row > prevRow ? 'Down' : 'Up');
          setPrevRow(row);
        }

        return <Text text={scrollDirection} />;
      }

      const root = ReactNoop.createRoot();

      await act(() => {
        root.render(<ScrollView row={10} />);
      });
      assertLog(['Up']);
      expect(root).toMatchRenderedOutput(<span prop="Up" />);

      await act(() => {
        ReactNoop.discreteUpdates(() => {
          setRow(5);
        });
        React.startTransition(() => {
          setRow(20);
        });
      });
      assertLog(['Up', 'Down']);
      expect(root).toMatchRenderedOutput(<span prop="Down" />);
    });

    // TODO: This should probably warn
    it('calling startTransition inside render phase', async () => {
      function App() {
        const [counter, setCounter] = useState(0);

        if (counter === 0) {
          React.startTransition(() => {
            setCounter(c => c + 1);
          });
        }

        return <Text text={counter} />;
      }

      const root = ReactNoop.createRoot();
      root.render(<App />);
      await waitForAll([1]);
      expect(root).toMatchRenderedOutput(<span prop={1} />);
    });
  });

  describe('useReducer', () => {
    it('simple mount and update', async () => {
      const INCREMENT = 'INCREMENT';
      const DECREMENT = 'DECREMENT';

      function reducer(state, action) {
        switch (action) {
          case 'INCREMENT':
            return state + 1;
          case 'DECREMENT':
            return state - 1;
          default:
            return state;
        }
      }

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeHandle(ref, () => ({dispatch}));
        return <Text text={'Count: ' + count} />;
      }
      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      await act(() => counter.current.dispatch(INCREMENT));
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      await act(() => {
        counter.current.dispatch(DECREMENT);
        counter.current.dispatch(DECREMENT);
        counter.current.dispatch(DECREMENT);
      });

      assertLog(['Count: -2']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: -2" />);
    });

    it('lazy init', async () => {
      const INCREMENT = 'INCREMENT';
      const DECREMENT = 'DECREMENT';

      function reducer(state, action) {
        switch (action) {
          case 'INCREMENT':
            return state + 1;
          case 'DECREMENT':
            return state - 1;
          default:
            return state;
        }
      }

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, props, p => {
          Scheduler.log('Init');
          return p.initialCount;
        });
        useImperativeHandle(ref, () => ({dispatch}));
        return <Text text={'Count: ' + count} />;
      }
      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter initialCount={10} ref={counter} />);
      await waitForAll(['Init', 'Count: 10']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 10" />);

      await act(() => counter.current.dispatch(INCREMENT));
      assertLog(['Count: 11']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 11" />);

      await act(() => {
        counter.current.dispatch(DECREMENT);
        counter.current.dispatch(DECREMENT);
        counter.current.dispatch(DECREMENT);
      });

      assertLog(['Count: 8']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 8" />);
    });

    // Regression test for https://github.com/facebook/react/issues/14360
    it('handles dispatches with mixed priorities', async () => {
      const INCREMENT = 'INCREMENT';

      function reducer(state, action) {
        return action === INCREMENT ? state + 1 : state;
      }

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeHandle(ref, () => ({dispatch}));
        return <Text text={'Count: ' + count} />;
      }

      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);

      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      ReactNoop.batchedUpdates(() => {
        counter.current.dispatch(INCREMENT);
        counter.current.dispatch(INCREMENT);
        counter.current.dispatch(INCREMENT);
      });

      ReactNoop.flushSync(() => {
        counter.current.dispatch(INCREMENT);
      });
      assertLog(['Count: 4']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 4" />);
    });
  });

  describe('useEffect', () => {
    it('simple mount and update', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Passive effect [${props.count}]`);
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
        // Effects are deferred until after the commit
        await waitForAll(['Passive effect [0]']);
      });

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
        // Effects are deferred until after the commit
        await waitForAll(['Passive effect [1]']);
      });
    });

    it('flushes passive effects even with sibling deletions', async () => {
      function LayoutEffect(props) {
        useLayoutEffect(() => {
          Scheduler.log(`Layout effect`);
        });
        return <Text text="Layout" />;
      }
      function PassiveEffect(props) {
        useEffect(() => {
          Scheduler.log(`Passive effect`);
        }, []);
        return <Text text="Passive" />;
      }
      const passive = <PassiveEffect key="p" />;
      await act(async () => {
        ReactNoop.render([<LayoutEffect key="l" />, passive]);
        await waitFor(['Layout', 'Passive', 'Layout effect']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Layout" />
            <span prop="Passive" />
          </>,
        );
        // Destroying the first child shouldn't prevent the passive effect from
        // being executed
        ReactNoop.render([passive]);
        await waitForAll(['Passive effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Passive" />);
      });
      // exiting act calls flushPassiveEffects(), but there are none left to flush.
      assertLog([]);
    });

    it('flushes passive effects even if siblings schedule an update', async () => {
      function PassiveEffect(props) {
        useEffect(() => {
          Scheduler.log('Passive effect');
        });
        return <Text text="Passive" />;
      }
      function LayoutEffect(props) {
        const [count, setCount] = useState(0);
        useLayoutEffect(() => {
          // Scheduling work shouldn't interfere with the queued passive effect
          if (count === 0) {
            setCount(1);
          }
          Scheduler.log('Layout effect ' + count);
        });
        return <Text text="Layout" />;
      }

      ReactNoop.render([<PassiveEffect key="p" />, <LayoutEffect key="l" />]);

      await act(async () => {
        await waitForAll([
          'Passive',
          'Layout',
          'Layout effect 0',
          'Passive effect',
          'Layout',
          'Layout effect 1',
        ]);
      });

      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Passive" />
          <span prop="Layout" />
        </>,
      );
    });

    it('flushes passive effects even if siblings schedule a new root', async () => {
      function PassiveEffect(props) {
        useEffect(() => {
          Scheduler.log('Passive effect');
        }, []);
        return <Text text="Passive" />;
      }
      function LayoutEffect(props) {
        useLayoutEffect(() => {
          Scheduler.log('Layout effect');
          // Scheduling work shouldn't interfere with the queued passive effect
          ReactNoop.renderToRootWithID(<Text text="New Root" />, 'root2');
        });
        return <Text text="Layout" />;
      }
      await act(async () => {
        ReactNoop.render([<PassiveEffect key="p" />, <LayoutEffect key="l" />]);
        await waitForAll([
          'Passive',
          'Layout',
          'Layout effect',
          'Passive effect',
          'New Root',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="Passive" />
            <span prop="Layout" />
          </>,
        );
      });
    });

    it(
      'flushes effects serially by flushing old effects before flushing ' +
        "new ones, if they haven't already fired",
      async () => {
        function getCommittedText() {
          const children = ReactNoop.getChildrenAsJSX();
          if (children === null) {
            return null;
          }
          return children.props.prop;
        }

        function Counter(props) {
          useEffect(() => {
            Scheduler.log(
              `Committed state when effect was fired: ${getCommittedText()}`,
            );
          });
          return <Text text={props.count} />;
        }
        await act(async () => {
          ReactNoop.render(<Counter count={0} />, () =>
            Scheduler.log('Sync effect'),
          );
          await waitFor([0, 'Sync effect']);
          expect(ReactNoop).toMatchRenderedOutput(<span prop={0} />);
          // Before the effects have a chance to flush, schedule another update
          ReactNoop.render(<Counter count={1} />, () =>
            Scheduler.log('Sync effect'),
          );
          await waitFor([
            // The previous effect flushes before the reconciliation
            'Committed state when effect was fired: 0',
            1,
            'Sync effect',
          ]);
          expect(ReactNoop).toMatchRenderedOutput(<span prop={1} />);
        });

        assertLog(['Committed state when effect was fired: 1']);
      },
    );

    it('defers passive effect destroy functions during unmount', async () => {
      function Child({bar, foo}) {
        React.useEffect(() => {
          Scheduler.log('passive bar create');
          return () => {
            Scheduler.log('passive bar destroy');
          };
        }, [bar]);
        React.useLayoutEffect(() => {
          Scheduler.log('layout bar create');
          return () => {
            Scheduler.log('layout bar destroy');
          };
        }, [bar]);
        React.useEffect(() => {
          Scheduler.log('passive foo create');
          return () => {
            Scheduler.log('passive foo destroy');
          };
        }, [foo]);
        React.useLayoutEffect(() => {
          Scheduler.log('layout foo create');
          return () => {
            Scheduler.log('layout foo destroy');
          };
        }, [foo]);
        Scheduler.log('render');
        return null;
      }

      await act(async () => {
        ReactNoop.render(<Child bar={1} foo={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor([
          'render',
          'layout bar create',
          'layout foo create',
          'Sync effect',
        ]);
        // Effects are deferred until after the commit
        await waitForAll(['passive bar create', 'passive foo create']);
      });

      // This update exists to test an internal implementation detail:
      // Effects without updating dependencies lose their layout/passive tag during an update.
      await act(async () => {
        ReactNoop.render(<Child bar={1} foo={2} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor([
          'render',
          'layout foo destroy',
          'layout foo create',
          'Sync effect',
        ]);
        // Effects are deferred until after the commit
        await waitForAll(['passive foo destroy', 'passive foo create']);
      });

      // Unmount the component and verify that passive destroy functions are deferred until post-commit.
      await act(async () => {
        ReactNoop.render(null, () => Scheduler.log('Sync effect'));
        await waitFor([
          'layout bar destroy',
          'layout foo destroy',
          'Sync effect',
        ]);
        // Effects are deferred until after the commit
        await waitForAll(['passive bar destroy', 'passive foo destroy']);
      });
    });

    it('does not warn about state updates for unmounted components with pending passive unmounts', async () => {
      let completePendingRequest = null;
      function Component() {
        Scheduler.log('Component');
        const [didLoad, setDidLoad] = React.useState(false);
        React.useLayoutEffect(() => {
          Scheduler.log('layout create');
          return () => {
            Scheduler.log('layout destroy');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('passive create');
          // Mimic an XHR request with a complete handler that updates state.
          completePendingRequest = () => setDidLoad(true);
          return () => {
            Scheduler.log('passive destroy');
          };
        }, []);
        return didLoad;
      }

      await act(async () => {
        ReactNoop.renderToRootWithID(<Component />, 'root', () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Component', 'layout create', 'Sync effect']);
        ReactNoop.flushPassiveEffects();
        assertLog(['passive create']);

        // Unmount but don't process pending passive destroy function
        ReactNoop.unmountRootWithID('root');
        await waitFor(['layout destroy']);

        // Simulate an XHR completing, which will cause a state update-
        // but should not log a warning.
        completePendingRequest();

        ReactNoop.flushPassiveEffects();
        assertLog(['passive destroy']);
      });
    });

    it('does not warn about state updates for unmounted components with pending passive unmounts for alternates', async () => {
      let setParentState = null;
      const setChildStates = [];

      function Parent() {
        const [state, setState] = useState(true);
        setParentState = setState;
        Scheduler.log(`Parent ${state} render`);
        useLayoutEffect(() => {
          Scheduler.log(`Parent ${state} commit`);
        });
        if (state) {
          return (
            <>
              <Child label="one" />
              <Child label="two" />
            </>
          );
        } else {
          return null;
        }
      }

      function Child({label}) {
        const [state, setState] = useState(0);
        useLayoutEffect(() => {
          Scheduler.log(`Child ${label} commit`);
        });
        useEffect(() => {
          setChildStates.push(setState);
          Scheduler.log(`Child ${label} passive create`);
          return () => {
            Scheduler.log(`Child ${label} passive destroy`);
          };
        }, []);
        Scheduler.log(`Child ${label} render`);
        return state;
      }

      // Schedule debounced state update for child (prob a no-op for this test)
      // later tick: schedule unmount for parent
      // start process unmount (but don't flush passive effectS)
      // State update on child
      await act(async () => {
        ReactNoop.render(<Parent />);
        await waitFor([
          'Parent true render',
          'Child one render',
          'Child two render',
          'Child one commit',
          'Child two commit',
          'Parent true commit',
          'Child one passive create',
          'Child two passive create',
        ]);

        // Update children.
        setChildStates.forEach(setChildState => setChildState(1));
        await waitFor([
          'Child one render',
          'Child two render',
          'Child one commit',
          'Child two commit',
        ]);

        // Schedule another update for children, and partially process it.
        React.startTransition(() => {
          setChildStates.forEach(setChildState => setChildState(2));
        });
        await waitFor(['Child one render']);

        // Schedule unmount for the parent that unmounts children with pending update.
        ReactNoop.unstable_runWithPriority(ContinuousEventPriority, () => {
          setParentState(false);
        });
        await waitForPaint(['Parent false render', 'Parent false commit']);

        // Schedule updates for children too (which should be ignored)
        setChildStates.forEach(setChildState => setChildState(2));
        await waitForAll([
          'Child one passive destroy',
          'Child two passive destroy',
        ]);
      });
    });

    it('does not warn about state updates for unmounted components with no pending passive unmounts', async () => {
      let completePendingRequest = null;
      function Component() {
        Scheduler.log('Component');
        const [didLoad, setDidLoad] = React.useState(false);
        React.useLayoutEffect(() => {
          Scheduler.log('layout create');
          // Mimic an XHR request with a complete handler that updates state.
          completePendingRequest = () => setDidLoad(true);
          return () => {
            Scheduler.log('layout destroy');
          };
        }, []);
        return didLoad;
      }

      await act(async () => {
        ReactNoop.renderToRootWithID(<Component />, 'root', () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Component', 'layout create', 'Sync effect']);

        // Unmount but don't process pending passive destroy function
        ReactNoop.unmountRootWithID('root');
        await waitFor(['layout destroy']);

        // Simulate an XHR completing.
        completePendingRequest();
      });
    });

    it('does not warn if there are pending passive unmount effects but not for the current fiber', async () => {
      let completePendingRequest = null;
      function ComponentWithXHR() {
        Scheduler.log('Component');
        const [didLoad, setDidLoad] = React.useState(false);
        React.useLayoutEffect(() => {
          Scheduler.log('a:layout create');
          return () => {
            Scheduler.log('a:layout destroy');
          };
        }, []);
        React.useEffect(() => {
          Scheduler.log('a:passive create');
          // Mimic an XHR request with a complete handler that updates state.
          completePendingRequest = () => setDidLoad(true);
        }, []);
        return didLoad;
      }

      function ComponentWithPendingPassiveUnmount() {
        React.useEffect(() => {
          Scheduler.log('b:passive create');
          return () => {
            Scheduler.log('b:passive destroy');
          };
        }, []);
        return null;
      }

      await act(async () => {
        ReactNoop.renderToRootWithID(
          <>
            <ComponentWithXHR />
            <ComponentWithPendingPassiveUnmount />
          </>,
          'root',
          () => Scheduler.log('Sync effect'),
        );
        await waitFor(['Component', 'a:layout create', 'Sync effect']);
        ReactNoop.flushPassiveEffects();
        assertLog(['a:passive create', 'b:passive create']);

        // Unmount but don't process pending passive destroy function
        ReactNoop.unmountRootWithID('root');
        await waitFor(['a:layout destroy']);

        // Simulate an XHR completing in the component without a pending passive effect..
        completePendingRequest();
      });
    });

    it('does not warn if there are updates after pending passive unmount effects have been flushed', async () => {
      let updaterFunction;

      function Component() {
        Scheduler.log('Component');
        const [state, setState] = React.useState(false);
        updaterFunction = setState;
        React.useEffect(() => {
          Scheduler.log('passive create');
          return () => {
            Scheduler.log('passive destroy');
          };
        }, []);
        return state;
      }

      await act(() => {
        ReactNoop.renderToRootWithID(<Component />, 'root', () =>
          Scheduler.log('Sync effect'),
        );
      });
      assertLog(['Component', 'Sync effect', 'passive create']);

      ReactNoop.unmountRootWithID('root');
      await waitForAll(['passive destroy']);

      await act(() => {
        updaterFunction(true);
      });
    });

    it('does not show a warning when a component updates its own state from within passive unmount function', async () => {
      function Component() {
        Scheduler.log('Component');
        const [didLoad, setDidLoad] = React.useState(false);
        React.useEffect(() => {
          Scheduler.log('passive create');
          return () => {
            setDidLoad(true);
            Scheduler.log('passive destroy');
          };
        }, []);
        return didLoad;
      }

      await act(async () => {
        ReactNoop.renderToRootWithID(<Component />, 'root', () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Component', 'Sync effect', 'passive create']);

        // Unmount but don't process pending passive destroy function
        ReactNoop.unmountRootWithID('root');
        await waitForAll(['passive destroy']);
      });
    });

    it('does not show a warning when a component updates a child state from within passive unmount function', async () => {
      function Parent() {
        Scheduler.log('Parent');
        const updaterRef = useRef(null);
        React.useEffect(() => {
          Scheduler.log('Parent passive create');
          return () => {
            updaterRef.current(true);
            Scheduler.log('Parent passive destroy');
          };
        }, []);
        return <Child updaterRef={updaterRef} />;
      }

      function Child({updaterRef}) {
        Scheduler.log('Child');
        const [state, setState] = React.useState(false);
        React.useEffect(() => {
          Scheduler.log('Child passive create');
          updaterRef.current = setState;
        }, []);
        return state;
      }

      await act(async () => {
        ReactNoop.renderToRootWithID(<Parent />, 'root');
        await waitFor([
          'Parent',
          'Child',
          'Child passive create',
          'Parent passive create',
        ]);

        // Unmount but don't process pending passive destroy function
        ReactNoop.unmountRootWithID('root');
        await waitForAll(['Parent passive destroy']);
      });
    });

    it('does not show a warning when a component updates a parents state from within passive unmount function', async () => {
      function Parent() {
        const [state, setState] = React.useState(false);
        Scheduler.log('Parent');
        return <Child setState={setState} state={state} />;
      }

      function Child({setState, state}) {
        Scheduler.log('Child');
        React.useEffect(() => {
          Scheduler.log('Child passive create');
          return () => {
            Scheduler.log('Child passive destroy');
            setState(true);
          };
        }, []);
        return state;
      }

      await act(async () => {
        ReactNoop.renderToRootWithID(<Parent />, 'root');
        await waitFor(['Parent', 'Child', 'Child passive create']);

        // Unmount but don't process pending passive destroy function
        ReactNoop.unmountRootWithID('root');
        await waitForAll(['Child passive destroy']);
      });
    });

    it('updates have async priority', async () => {
      function Counter(props) {
        const [count, updateCount] = useState('(empty)');
        useEffect(() => {
          Scheduler.log(`Schedule update [${props.count}]`);
          updateCount(props.count);
        }, [props.count]);
        return <Text text={'Count: ' + count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: (empty)', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: (empty)" />);
        ReactNoop.flushPassiveEffects();
        assertLog(['Schedule update [0]']);
        await waitForAll(['Count: 0']);
      });

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
        ReactNoop.flushPassiveEffects();
        assertLog(['Schedule update [1]']);
        await waitForAll(['Count: 1']);
      });
    });

    it('updates have async priority even if effects are flushed early', async () => {
      function Counter(props) {
        const [count, updateCount] = useState('(empty)');
        useEffect(() => {
          Scheduler.log(`Schedule update [${props.count}]`);
          updateCount(props.count);
        }, [props.count]);
        return <Text text={'Count: ' + count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: (empty)', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: (empty)" />);

        // Rendering again should flush the previous commit's effects
        React.startTransition(() => {
          ReactNoop.render(<Counter count={1} />, () =>
            Scheduler.log('Sync effect'),
          );
        });

        await waitFor(['Schedule update [0]', 'Count: 0']);

        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
        await waitFor([
          'Count: 0',
          'Sync effect',
          'Schedule update [1]',
          'Count: 1',
        ]);

        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });
    });

    it('does not flush non-discrete passive effects when flushing sync', async () => {
      let _updateCount;
      function Counter(props) {
        const [count, updateCount] = useState(0);
        _updateCount = updateCount;
        useEffect(() => {
          Scheduler.log(`Will set count to 1`);
          updateCount(1);
        }, []);
        return <Text text={'Count: ' + count} />;
      }

      ReactNoop.render(<Counter count={0} />, () =>
        Scheduler.log('Sync effect'),
      );
      await waitFor(['Count: 0', 'Sync effect']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      // A flush sync doesn't cause the passive effects to fire.
      // So we haven't added the other update yet.
      await act(() => {
        ReactNoop.flushSync(() => {
          _updateCount(2);
        });
      });

      // As a result we, somewhat surprisingly, commit them in the opposite order.
      // This should be fine because any non-discrete set of work doesn't guarantee order
      // and easily could've happened slightly later too.
      assertLog(['Will set count to 1', 'Count: 1']);

      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
    });

    // @gate !disableLegacyMode
    it(
      'in legacy mode, useEffect is deferred and updates finish synchronously ' +
        '(in a single batch)',
      async () => {
        function Counter(props) {
          const [count, updateCount] = useState('(empty)');
          useEffect(() => {
            // Update multiple times. These should all be batched together in
            // a single render.
            updateCount(props.count);
            updateCount(props.count);
            updateCount(props.count);
            updateCount(props.count);
            updateCount(props.count);
            updateCount(props.count);
          }, [props.count]);
          return <Text text={'Count: ' + count} />;
        }
        await act(() => {
          ReactNoop.flushSync(() => {
            ReactNoop.renderLegacySyncRoot(<Counter count={0} />);
          });

          // Even in legacy mode, effects are deferred until after paint
          assertLog(['Count: (empty)']);
          expect(ReactNoop).toMatchRenderedOutput(
            <span prop="Count: (empty)" />,
          );
        });

        // effects get forced on exiting act()
        // There were multiple updates, but there should only be a
        // single render
        assertLog(['Count: 0']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      },
    );

    it('flushSync is not allowed', async () => {
      function Counter(props) {
        const [count, updateCount] = useState('(empty)');
        useEffect(() => {
          Scheduler.log(`Schedule update [${props.count}]`);
          ReactNoop.flushSync(() => {
            updateCount(props.count);
          });
          assertLog([`Schedule update [${props.count}]`]);
          assertConsoleErrorDev([
            'flushSync was called from inside a lifecycle method. ' +
              'React cannot flush when React is already rendering. ' +
              'Consider moving this call to a scheduler task or micro task.\n' +
              '    in Counter (at **)',
          ]);
          // This shouldn't flush synchronously.
          expect(ReactNoop).not.toMatchRenderedOutput(
            <span prop={`Count: ${props.count}`} />,
          );
        }, [props.count]);
        return <Text text={'Count: ' + count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: (empty)', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: (empty)" />);
      });

      assertLog([`Count: 0`]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
    });

    it('unmounts previous effect', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Did create [${props.count}]`);
          return () => {
            Scheduler.log(`Did destroy [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      });

      assertLog(['Did create [0]']);

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });

      assertLog(['Did destroy [0]', 'Did create [1]']);
    });

    it('unmounts on deletion', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Did create [${props.count}]`);
          return () => {
            Scheduler.log(`Did destroy [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      });

      assertLog(['Did create [0]']);

      ReactNoop.render(null);
      await waitForAll(['Did destroy [0]']);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    it('unmounts on deletion after skipped effect', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Did create [${props.count}]`);
          return () => {
            Scheduler.log(`Did destroy [${props.count}]`);
          };
        }, []);
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      });

      assertLog(['Did create [0]']);

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });

      assertLog([]);

      ReactNoop.render(null);
      await waitForAll(['Did destroy [0]']);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    it('always fires effects if no dependencies are provided', async () => {
      function effect() {
        Scheduler.log(`Did create`);
        return () => {
          Scheduler.log(`Did destroy`);
        };
      }
      function Counter(props) {
        useEffect(effect);
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      });

      assertLog(['Did create']);

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });

      assertLog(['Did destroy', 'Did create']);

      ReactNoop.render(null);
      await waitForAll(['Did destroy']);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    it('skips effect if inputs have not changed', async () => {
      function Counter(props) {
        const text = `${props.label}: ${props.count}`;
        useEffect(() => {
          Scheduler.log(`Did create [${text}]`);
          return () => {
            Scheduler.log(`Did destroy [${text}]`);
          };
        }, [props.label, props.count]);
        return <Text text={text} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter label="Count" count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
      });

      assertLog(['Did create [Count: 0]']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      await act(async () => {
        ReactNoop.render(<Counter label="Count" count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        // Count changed
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });

      assertLog(['Did destroy [Count: 0]', 'Did create [Count: 1]']);

      await act(async () => {
        ReactNoop.render(<Counter label="Count" count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        // Nothing changed, so no effect should have fired
        await waitFor(['Count: 1', 'Sync effect']);
      });

      assertLog([]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);

      await act(async () => {
        ReactNoop.render(<Counter label="Total" count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        // Label changed
        await waitFor(['Total: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Total: 1" />);
      });

      assertLog(['Did destroy [Count: 1]', 'Did create [Total: 1]']);
    });

    it('multiple effects', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Did commit 1 [${props.count}]`);
        });
        useEffect(() => {
          Scheduler.log(`Did commit 2 [${props.count}]`);
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      });

      assertLog(['Did commit 1 [0]', 'Did commit 2 [0]']);

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });
      assertLog(['Did commit 1 [1]', 'Did commit 2 [1]']);
    });

    it('unmounts all previous effects before creating any new ones', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Mount A [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount A [${props.count}]`);
          };
        });
        useEffect(() => {
          Scheduler.log(`Mount B [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount B [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      });

      assertLog(['Mount A [0]', 'Mount B [0]']);

      await act(async () => {
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      });
      assertLog([
        'Unmount A [0]',
        'Unmount B [0]',
        'Mount A [1]',
        'Mount B [1]',
      ]);
    });

    it('unmounts all previous effects between siblings before creating any new ones', async () => {
      function Counter({count, label}) {
        useEffect(() => {
          Scheduler.log(`Mount ${label} [${count}]`);
          return () => {
            Scheduler.log(`Unmount ${label} [${count}]`);
          };
        });
        return <Text text={`${label} ${count}`} />;
      }
      await act(async () => {
        ReactNoop.render(
          <>
            <Counter label="A" count={0} />
            <Counter label="B" count={0} />
          </>,
          () => Scheduler.log('Sync effect'),
        );
        await waitFor(['A 0', 'B 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="A 0" />
            <span prop="B 0" />
          </>,
        );
      });

      assertLog(['Mount A [0]', 'Mount B [0]']);

      await act(async () => {
        ReactNoop.render(
          <>
            <Counter label="A" count={1} />
            <Counter label="B" count={1} />
          </>,
          () => Scheduler.log('Sync effect'),
        );
        await waitFor(['A 1', 'B 1', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="A 1" />
            <span prop="B 1" />
          </>,
        );
      });
      assertLog([
        'Unmount A [0]',
        'Unmount B [0]',
        'Mount A [1]',
        'Mount B [1]',
      ]);

      await act(async () => {
        ReactNoop.render(
          <>
            <Counter label="B" count={2} />
            <Counter label="C" count={0} />
          </>,
          () => Scheduler.log('Sync effect'),
        );
        await waitFor(['B 2', 'C 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="B 2" />
            <span prop="C 0" />
          </>,
        );
      });
      assertLog([
        'Unmount A [1]',
        'Unmount B [1]',
        'Mount B [2]',
        'Mount C [0]',
      ]);
    });

    it('handles errors in create on mount', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Mount A [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount A [${props.count}]`);
          };
        });
        useEffect(() => {
          Scheduler.log('Oops!');
          throw new Error('Oops!');
          // eslint-disable-next-line no-unreachable
          Scheduler.log(`Mount B [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount B [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await expect(async () => {
        await act(async () => {
          ReactNoop.render(<Counter count={0} />, () =>
            Scheduler.log('Sync effect'),
          );
          await waitFor(['Count: 0', 'Sync effect']);
          expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
        });
      }).rejects.toThrow('Oops');

      assertLog([
        'Mount A [0]',
        'Oops!',
        // Clean up effect A. There's no effect B to clean-up, because it
        // never mounted.
        'Unmount A [0]',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    it('handles errors in create on update', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Mount A [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount A [${props.count}]`);
          };
        });
        useEffect(() => {
          if (props.count === 1) {
            Scheduler.log('Oops!');
            throw new Error('Oops error!');
          }
          Scheduler.log(`Mount B [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount B [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
        ReactNoop.flushPassiveEffects();
        assertLog(['Mount A [0]', 'Mount B [0]']);
      });

      await expect(async () => {
        await act(async () => {
          // This update will trigger an error
          ReactNoop.render(<Counter count={1} />, () =>
            Scheduler.log('Sync effect'),
          );
          await waitFor(['Count: 1', 'Sync effect']);
          expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
          ReactNoop.flushPassiveEffects();
          assertLog([
            'Unmount A [0]',
            'Unmount B [0]',
            'Mount A [1]',
            'Oops!',
            // Clean up effect A runs passively on unmount.
            // There's no effect B to clean-up, because it never mounted.
            'Unmount A [1]',
          ]);
          expect(ReactNoop).toMatchRenderedOutput(null);
        });
      }).rejects.toThrow('Oops error!');
    });

    it('handles errors in destroy on update', async () => {
      function Counter(props) {
        useEffect(() => {
          Scheduler.log(`Mount A [${props.count}]`);
          return () => {
            Scheduler.log('Oops!');
            if (props.count === 0) {
              throw new Error('Oops error!');
            }
          };
        });
        useEffect(() => {
          Scheduler.log(`Mount B [${props.count}]`);
          return () => {
            Scheduler.log(`Unmount B [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }

      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Count: 0', 'Sync effect']);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
        ReactNoop.flushPassiveEffects();
        assertLog(['Mount A [0]', 'Mount B [0]']);
      });

      await expect(async () => {
        await act(async () => {
          // This update will trigger an error during passive effect unmount
          ReactNoop.render(<Counter count={1} />, () =>
            Scheduler.log('Sync effect'),
          );
          await waitFor(['Count: 1', 'Sync effect']);
          expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
          ReactNoop.flushPassiveEffects();

          // This branch enables a feature flag that flushes all passive destroys in a
          // separate pass before flushing any passive creates.
          // A result of this two-pass flush is that an error thrown from unmount does
          // not block the subsequent create functions from being run.
          assertLog([
            'Oops!',
            'Unmount B [0]',
            'Mount A [1]',
            'Mount B [1]',
            // <Counter> gets unmounted because an error is thrown above.
            // The remaining destroy functions are run later on unmount, since they're passive.
            // In this case, one of them throws again (because of how the test is written).
            'Oops!',
            'Unmount B [1]',
          ]);
        });
      }).rejects.toThrow('Oops error!');

      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    it('works with memo', async () => {
      function Counter({count}) {
        useLayoutEffect(() => {
          Scheduler.log('Mount: ' + count);
          return () => Scheduler.log('Unmount: ' + count);
        });
        return <Text text={'Count: ' + count} />;
      }
      Counter = memo(Counter);

      ReactNoop.render(<Counter count={0} />, () =>
        Scheduler.log('Sync effect'),
      );
      await waitFor(['Count: 0', 'Mount: 0', 'Sync effect']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);

      ReactNoop.render(<Counter count={1} />, () =>
        Scheduler.log('Sync effect'),
      );
      await waitFor(['Count: 1', 'Unmount: 0', 'Mount: 1', 'Sync effect']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);

      ReactNoop.render(null);
      await waitFor(['Unmount: 1']);
      expect(ReactNoop).toMatchRenderedOutput(null);
    });

    describe('errors thrown in passive destroy function within unmounted trees', () => {
      let BrokenUseEffectCleanup;
      let ErrorBoundary;
      let LogOnlyErrorBoundary;

      beforeEach(() => {
        BrokenUseEffectCleanup = function () {
          useEffect(() => {
            Scheduler.log('BrokenUseEffectCleanup useEffect');
            return () => {
              Scheduler.log('BrokenUseEffectCleanup useEffect destroy');
              throw new Error('Expected error');
            };
          }, []);

          return 'inner child';
        };

        ErrorBoundary = class extends React.Component {
          state = {error: null};
          static getDerivedStateFromError(error) {
            Scheduler.log(`ErrorBoundary static getDerivedStateFromError`);
            return {error};
          }
          componentDidCatch(error, info) {
            Scheduler.log(`ErrorBoundary componentDidCatch`);
          }
          render() {
            if (this.state.error) {
              Scheduler.log('ErrorBoundary render error');
              return <span prop="ErrorBoundary fallback" />;
            }
            Scheduler.log('ErrorBoundary render success');
            return this.props.children || null;
          }
        };

        LogOnlyErrorBoundary = class extends React.Component {
          componentDidCatch(error, info) {
            Scheduler.log(`LogOnlyErrorBoundary componentDidCatch`);
          }
          render() {
            Scheduler.log(`LogOnlyErrorBoundary render`);
            return this.props.children || null;
          }
        };
      });

      it('should use the nearest still-mounted boundary if there are no unmounted boundaries', async () => {
        await act(() => {
          ReactNoop.render(
            <LogOnlyErrorBoundary>
              <BrokenUseEffectCleanup />
            </LogOnlyErrorBoundary>,
          );
        });

        assertLog([
          'LogOnlyErrorBoundary render',
          'BrokenUseEffectCleanup useEffect',
        ]);

        await act(() => {
          ReactNoop.render(<LogOnlyErrorBoundary />);
        });

        assertLog([
          'LogOnlyErrorBoundary render',
          'BrokenUseEffectCleanup useEffect destroy',
          'LogOnlyErrorBoundary componentDidCatch',
        ]);
      });

      it('should skip unmounted boundaries and use the nearest still-mounted boundary', async () => {
        function Conditional({showChildren}) {
          if (showChildren) {
            return (
              <ErrorBoundary>
                <BrokenUseEffectCleanup />
              </ErrorBoundary>
            );
          } else {
            return null;
          }
        }

        await act(() => {
          ReactNoop.render(
            <LogOnlyErrorBoundary>
              <Conditional showChildren={true} />
            </LogOnlyErrorBoundary>,
          );
        });

        assertLog([
          'LogOnlyErrorBoundary render',
          'ErrorBoundary render success',
          'BrokenUseEffectCleanup useEffect',
        ]);

        await act(() => {
          ReactNoop.render(
            <LogOnlyErrorBoundary>
              <Conditional showChildren={false} />
            </LogOnlyErrorBoundary>,
          );
        });

        assertLog([
          'LogOnlyErrorBoundary render',
          'BrokenUseEffectCleanup useEffect destroy',
          'LogOnlyErrorBoundary componentDidCatch',
        ]);
      });

      it('should call getDerivedStateFromError in the nearest still-mounted boundary', async () => {
        function Conditional({showChildren}) {
          if (showChildren) {
            return <BrokenUseEffectCleanup />;
          } else {
            return null;
          }
        }

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary>
              <Conditional showChildren={true} />
            </ErrorBoundary>,
          );
        });

        assertLog([
          'ErrorBoundary render success',
          'BrokenUseEffectCleanup useEffect',
        ]);

        await act(() => {
          ReactNoop.render(
            <ErrorBoundary>
              <Conditional showChildren={false} />
            </ErrorBoundary>,
          );
        });

        assertLog([
          'ErrorBoundary render success',
          'BrokenUseEffectCleanup useEffect destroy',
          'ErrorBoundary static getDerivedStateFromError',
          'ErrorBoundary render error',
          'ErrorBoundary componentDidCatch',
        ]);

        expect(ReactNoop).toMatchRenderedOutput(
          <span prop="ErrorBoundary fallback" />,
        );
      });

      it('should rethrow error if there are no still-mounted boundaries', async () => {
        function Conditional({showChildren}) {
          if (showChildren) {
            return (
              <ErrorBoundary>
                <BrokenUseEffectCleanup />
              </ErrorBoundary>
            );
          } else {
            return null;
          }
        }

        await act(() => {
          ReactNoop.render(<Conditional showChildren={true} />);
        });

        assertLog([
          'ErrorBoundary render success',
          'BrokenUseEffectCleanup useEffect',
        ]);

        await act(async () => {
          ReactNoop.render(<Conditional showChildren={false} />);
          await waitForThrow('Expected error');
        });

        assertLog(['BrokenUseEffectCleanup useEffect destroy']);

        expect(ReactNoop).toMatchRenderedOutput(null);
      });
    });

    it('calls passive effect destroy functions for memoized components', async () => {
      const Wrapper = ({children}) => children;
      function Child() {
        React.useEffect(() => {
          Scheduler.log('passive create');
          return () => {
            Scheduler.log('passive destroy');
          };
        }, []);
        React.useLayoutEffect(() => {
          Scheduler.log('layout create');
          return () => {
            Scheduler.log('layout destroy');
          };
        }, []);
        Scheduler.log('render');
        return null;
      }

      const isEqual = (prevProps, nextProps) =>
        prevProps.prop === nextProps.prop;
      const MemoizedChild = React.memo(Child, isEqual);

      await act(() => {
        ReactNoop.render(
          <Wrapper>
            <MemoizedChild key={1} />
          </Wrapper>,
        );
      });
      assertLog(['render', 'layout create', 'passive create']);

      // Include at least one no-op (memoized) update to trigger original bug.
      await act(() => {
        ReactNoop.render(
          <Wrapper>
            <MemoizedChild key={1} />
          </Wrapper>,
        );
      });
      assertLog([]);

      await act(() => {
        ReactNoop.render(
          <Wrapper>
            <MemoizedChild key={2} />
          </Wrapper>,
        );
      });
      assertLog([
        'render',
        'layout destroy',
        'layout create',
        'passive destroy',
        'passive create',
      ]);

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog(['layout destroy', 'passive destroy']);
    });

    it('calls passive effect destroy functions for descendants of memoized components', async () => {
      const Wrapper = ({children}) => children;
      function Child() {
        return <Grandchild />;
      }

      function Grandchild() {
        React.useEffect(() => {
          Scheduler.log('passive create');
          return () => {
            Scheduler.log('passive destroy');
          };
        }, []);
        React.useLayoutEffect(() => {
          Scheduler.log('layout create');
          return () => {
            Scheduler.log('layout destroy');
          };
        }, []);
        Scheduler.log('render');
        return null;
      }

      const isEqual = (prevProps, nextProps) =>
        prevProps.prop === nextProps.prop;
      const MemoizedChild = React.memo(Child, isEqual);

      await act(() => {
        ReactNoop.render(
          <Wrapper>
            <MemoizedChild key={1} />
          </Wrapper>,
        );
      });
      assertLog(['render', 'layout create', 'passive create']);

      // Include at least one no-op (memoized) update to trigger original bug.
      await act(() => {
        ReactNoop.render(
          <Wrapper>
            <MemoizedChild key={1} />
          </Wrapper>,
        );
      });
      assertLog([]);

      await act(() => {
        ReactNoop.render(
          <Wrapper>
            <MemoizedChild key={2} />
          </Wrapper>,
        );
      });
      assertLog([
        'render',
        'layout destroy',
        'layout create',
        'passive destroy',
        'passive create',
      ]);

      await act(() => {
        ReactNoop.render(null);
      });
      assertLog(['layout destroy', 'passive destroy']);
    });

    it('assumes passive effect destroy function is either a function or undefined', async () => {
      function App(props) {
        useEffect(() => {
          return props.return;
        });
        return null;
      }

      const root1 = ReactNoop.createRoot();
      await act(() => {
        root1.render(<App return={17} />);
      });
      assertConsoleErrorDev([
        'useEffect must not return anything besides a function, ' +
          'which is used for clean-up. You returned: 17\n' +
          '    in App (at **)',
      ]);

      const root2 = ReactNoop.createRoot();
      await act(() => {
        root2.render(<App return={null} />);
      });
      assertConsoleErrorDev([
        'useEffect must not return anything besides a function, ' +
          'which is used for clean-up. You returned null. ' +
          'If your effect does not require clean up, return undefined (or nothing).\n' +
          '    in App (at **)',
      ]);

      const root3 = ReactNoop.createRoot();
      await act(() => {
        root3.render(<App return={Promise.resolve()} />);
      });
      assertConsoleErrorDev([
        'useEffect must not return anything besides a function, which is used for clean-up.\n' +
          '\n' +
          'It looks like you wrote useEffect(async () => ...) or returned a Promise. ' +
          'Instead, write the async function inside your effect and call it immediately:\n' +
          '\n' +
          'useEffect(() => {\n' +
          '  async function fetchData() {\n' +
          '    // You can await here\n' +
          '    const response = await MyAPI.getData(someId);\n' +
          '    // ...\n' +
          '  }\n' +
          '  fetchData();\n' +
          "}, [someId]); // Or [] if effect doesn't need props or state\n" +
          '\n' +
          'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching\n' +
          '    in App (at **)',
      ]);

      // Error on unmount because React assumes the value is a function
      await act(async () => {
        root3.render(null);
        await waitForThrow('is not a function');
      });
    });
  });

  describe('useInsertionEffect', () => {
    it('fires insertion effects after snapshots on update', async () => {
      function CounterA(props) {
        useInsertionEffect(() => {
          Scheduler.log(`Create insertion`);
          return () => {
            Scheduler.log(`Destroy insertion`);
          };
        });
        return null;
      }

      class CounterB extends React.Component {
        getSnapshotBeforeUpdate(prevProps, prevState) {
          Scheduler.log(`Get Snapshot`);
          return null;
        }

        componentDidUpdate() {}

        render() {
          return null;
        }
      }

      await act(async () => {
        ReactNoop.render(
          <>
            <CounterA />
            <CounterB />
          </>,
        );

        await waitForAll(['Create insertion']);
      });

      // Update
      await act(async () => {
        ReactNoop.render(
          <>
            <CounterA />
            <CounterB />
          </>,
        );

        await waitForAll([
          'Get Snapshot',
          'Destroy insertion',
          'Create insertion',
        ]);
      });

      // Unmount everything
      await act(async () => {
        ReactNoop.render(null);

        await waitForAll(['Destroy insertion']);
      });
    });

    it('fires insertion effects before layout effects', async () => {
      let committedText = '(empty)';

      function Counter(props) {
        useInsertionEffect(() => {
          Scheduler.log(`Create insertion [current: ${committedText}]`);
          committedText = String(props.count);
          return () => {
            Scheduler.log(`Destroy insertion [current: ${committedText}]`);
          };
        });
        useLayoutEffect(() => {
          Scheduler.log(`Create layout [current: ${committedText}]`);
          return () => {
            Scheduler.log(`Destroy layout [current: ${committedText}]`);
          };
        });
        useEffect(() => {
          Scheduler.log(`Create passive [current: ${committedText}]`);
          return () => {
            Scheduler.log(`Destroy passive [current: ${committedText}]`);
          };
        });
        return null;
      }
      await act(async () => {
        ReactNoop.render(<Counter count={0} />);

        await waitForPaint([
          'Create insertion [current: (empty)]',
          'Create layout [current: 0]',
        ]);
        expect(committedText).toEqual('0');
      });

      assertLog(['Create passive [current: 0]']);

      // Unmount everything
      await act(async () => {
        ReactNoop.render(null);

        await waitForPaint([
          'Destroy insertion [current: 0]',
          'Destroy layout [current: 0]',
        ]);
      });

      assertLog(['Destroy passive [current: 0]']);
    });

    it('force flushes passive effects before firing new insertion effects', async () => {
      let committedText = '(empty)';

      function Counter(props) {
        useInsertionEffect(() => {
          Scheduler.log(`Create insertion [current: ${committedText}]`);
          committedText = String(props.count);
          return () => {
            Scheduler.log(`Destroy insertion [current: ${committedText}]`);
          };
        });
        useLayoutEffect(() => {
          Scheduler.log(`Create layout [current: ${committedText}]`);
          committedText = String(props.count);
          return () => {
            Scheduler.log(`Destroy layout [current: ${committedText}]`);
          };
        });
        useEffect(() => {
          Scheduler.log(`Create passive [current: ${committedText}]`);
          return () => {
            Scheduler.log(`Destroy passive [current: ${committedText}]`);
          };
        });
        return null;
      }

      await act(async () => {
        React.startTransition(() => {
          ReactNoop.render(<Counter count={0} />);
        });
        await waitForPaint([
          'Create insertion [current: (empty)]',
          'Create layout [current: 0]',
        ]);
        expect(committedText).toEqual('0');

        React.startTransition(() => {
          ReactNoop.render(<Counter count={1} />);
        });
        if (gate(flags => flags.enableYieldingBeforePassive)) {
          await waitForPaint(['Create passive [current: 0]']);
          await waitForPaint([
            'Destroy insertion [current: 0]',
            'Create insertion [current: 0]',
            'Destroy layout [current: 1]',
            'Create layout [current: 1]',
          ]);
        } else {
          await waitForPaint([
            'Create passive [current: 0]',
            'Destroy insertion [current: 0]',
            'Create insertion [current: 0]',
            'Destroy layout [current: 1]',
            'Create layout [current: 1]',
          ]);
        }
        expect(committedText).toEqual('1');
      });
      assertLog([
        'Destroy passive [current: 1]',
        'Create passive [current: 1]',
      ]);
    });

    it('fires all insertion effects (interleaved) before firing any layout effects', async () => {
      let committedA = '(empty)';
      let committedB = '(empty)';

      function CounterA(props) {
        useInsertionEffect(() => {
          Scheduler.log(
            `Create Insertion 1 for Component A [A: ${committedA}, B: ${committedB}]`,
          );
          committedA = String(props.count);
          return () => {
            Scheduler.log(
              `Destroy Insertion 1 for Component A [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });
        useInsertionEffect(() => {
          Scheduler.log(
            `Create Insertion 2 for Component A [A: ${committedA}, B: ${committedB}]`,
          );
          committedA = String(props.count);
          return () => {
            Scheduler.log(
              `Destroy Insertion 2 for Component A [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });

        useLayoutEffect(() => {
          Scheduler.log(
            `Create Layout 1 for Component A [A: ${committedA}, B: ${committedB}]`,
          );
          return () => {
            Scheduler.log(
              `Destroy Layout 1 for Component A [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });

        useLayoutEffect(() => {
          Scheduler.log(
            `Create Layout 2 for Component A [A: ${committedA}, B: ${committedB}]`,
          );
          return () => {
            Scheduler.log(
              `Destroy Layout 2 for Component A [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });
        return null;
      }

      function CounterB(props) {
        useInsertionEffect(() => {
          Scheduler.log(
            `Create Insertion 1 for Component B [A: ${committedA}, B: ${committedB}]`,
          );
          committedB = String(props.count);
          return () => {
            Scheduler.log(
              `Destroy Insertion 1 for Component B [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });
        useInsertionEffect(() => {
          Scheduler.log(
            `Create Insertion 2 for Component B [A: ${committedA}, B: ${committedB}]`,
          );
          committedB = String(props.count);
          return () => {
            Scheduler.log(
              `Destroy Insertion 2 for Component B [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });

        useLayoutEffect(() => {
          Scheduler.log(
            `Create Layout 1 for Component B [A: ${committedA}, B: ${committedB}]`,
          );
          return () => {
            Scheduler.log(
              `Destroy Layout 1 for Component B [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });

        useLayoutEffect(() => {
          Scheduler.log(
            `Create Layout 2 for Component B [A: ${committedA}, B: ${committedB}]`,
          );
          return () => {
            Scheduler.log(
              `Destroy Layout 2 for Component B [A: ${committedA}, B: ${committedB}]`,
            );
          };
        });
        return null;
      }

      await act(async () => {
        ReactNoop.render(
          <React.Fragment>
            <CounterA count={0} />
            <CounterB count={0} />
          </React.Fragment>,
        );
        await waitForAll([
          // All insertion effects fire before all layout effects
          'Create Insertion 1 for Component A [A: (empty), B: (empty)]',
          'Create Insertion 2 for Component A [A: 0, B: (empty)]',
          'Create Insertion 1 for Component B [A: 0, B: (empty)]',
          'Create Insertion 2 for Component B [A: 0, B: 0]',
          'Create Layout 1 for Component A [A: 0, B: 0]',
          'Create Layout 2 for Component A [A: 0, B: 0]',
          'Create Layout 1 for Component B [A: 0, B: 0]',
          'Create Layout 2 for Component B [A: 0, B: 0]',
        ]);
        expect([committedA, committedB]).toEqual(['0', '0']);
      });

      await act(async () => {
        ReactNoop.render(
          <React.Fragment>
            <CounterA count={1} />
            <CounterB count={1} />
          </React.Fragment>,
        );
        await waitForAll([
          'Destroy Insertion 1 for Component A [A: 0, B: 0]',
          'Destroy Insertion 2 for Component A [A: 0, B: 0]',
          'Create Insertion 1 for Component A [A: 0, B: 0]',
          'Create Insertion 2 for Component A [A: 1, B: 0]',
          'Destroy Layout 1 for Component A [A: 1, B: 0]',
          'Destroy Layout 2 for Component A [A: 1, B: 0]',
          'Destroy Insertion 1 for Component B [A: 1, B: 0]',
          'Destroy Insertion 2 for Component B [A: 1, B: 0]',
          'Create Insertion 1 for Component B [A: 1, B: 0]',
          'Create Insertion 2 for Component B [A: 1, B: 1]',
          'Destroy Layout 1 for Component B [A: 1, B: 1]',
          'Destroy Layout 2 for Component B [A: 1, B: 1]',
          'Create Layout 1 for Component A [A: 1, B: 1]',
          'Create Layout 2 for Component A [A: 1, B: 1]',
          'Create Layout 1 for Component B [A: 1, B: 1]',
          'Create Layout 2 for Component B [A: 1, B: 1]',
        ]);
        expect([committedA, committedB]).toEqual(['1', '1']);

        // Unmount everything
        await act(async () => {
          ReactNoop.render(null);

          await waitForAll([
            'Destroy Insertion 1 for Component A [A: 1, B: 1]',
            'Destroy Insertion 2 for Component A [A: 1, B: 1]',
            'Destroy Layout 1 for Component A [A: 1, B: 1]',
            'Destroy Layout 2 for Component A [A: 1, B: 1]',
            'Destroy Insertion 1 for Component B [A: 1, B: 1]',
            'Destroy Insertion 2 for Component B [A: 1, B: 1]',
            'Destroy Layout 1 for Component B [A: 1, B: 1]',
            'Destroy Layout 2 for Component B [A: 1, B: 1]',
          ]);
        });
      });
    });

    it('assumes insertion effect destroy function is either a function or undefined', async () => {
      function App(props) {
        useInsertionEffect(() => {
          return props.return;
        });
        return null;
      }

      const root1 = ReactNoop.createRoot();
      await act(() => {
        root1.render(<App return={17} />);
      });
      assertConsoleErrorDev([
        'useInsertionEffect must not return anything besides a function, ' +
          'which is used for clean-up. You returned: 17\n' +
          '    in App (at **)',
      ]);

      const root2 = ReactNoop.createRoot();
      await act(() => {
        root2.render(<App return={null} />);
      });
      assertConsoleErrorDev([
        'useInsertionEffect must not return anything besides a function, ' +
          'which is used for clean-up. You returned null. ' +
          'If your effect does not require clean up, return undefined (or nothing).\n' +
          '    in App (at **)',
      ]);

      const root3 = ReactNoop.createRoot();
      await act(() => {
        root3.render(<App return={Promise.resolve()} />);
      });
      assertConsoleErrorDev([
        'useInsertionEffect must not return anything besides a ' +
          'function, which is used for clean-up.\n' +
          '\n' +
          'It looks like you wrote useInsertionEffect(async () => ...) or returned a Promise. ' +
          'Instead, write the async function inside your effect and call it immediately:\n' +
          '\n' +
          'useInsertionEffect(() => {\n' +
          '  async function fetchData() {\n' +
          '    // You can await here\n' +
          '    const response = await MyAPI.getData(someId);\n' +
          '    // ...\n' +
          '  }\n' +
          '  fetchData();\n' +
          "}, [someId]); // Or [] if effect doesn't need props or state\n" +
          '\n' +
          'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching\n' +
          '    in App (at **)',
      ]);

      // Error on unmount because React assumes the value is a function
      await act(async () => {
        root3.render(null);
        await waitForThrow('is not a function');
      });
    });

    it('warns when setState is called from insertion effect setup', async () => {
      function App(props) {
        const [, setX] = useState(0);
        useInsertionEffect(() => {
          setX(1);
          if (props.throw) {
            throw Error('No');
          }
        }, [props.throw]);
        return null;
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App />);
      });
      assertConsoleErrorDev([
        'useInsertionEffect must not schedule updates.\n' +
          '    in App (at **)',
      ]);

      await act(async () => {
        root.render(<App throw={true} />);
        await waitForThrow('No');
      });

      // Should not warn for regular effects after throw.
      function NotInsertion() {
        const [, setX] = useState(0);
        useEffect(() => {
          setX(1);
        }, []);
        return null;
      }
      await act(() => {
        root.render(<NotInsertion />);
      });
    });

    it('warns when setState is called from insertion effect cleanup', async () => {
      function App(props) {
        const [, setX] = useState(0);
        useInsertionEffect(() => {
          if (props.throw) {
            throw Error('No');
          }
          return () => {
            setX(1);
          };
        }, [props.throw, props.foo]);
        return null;
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App foo="hello" />);
      });
      await act(() => {
        root.render(<App foo="goodbye" />);
      });
      assertConsoleErrorDev([
        'useInsertionEffect must not schedule updates.\n' +
          '    in App (at **)',
      ]);

      await act(async () => {
        root.render(<App throw={true} />);
        await waitForThrow('No');
      });

      // Should not warn for regular effects after throw.
      function NotInsertion() {
        const [, setX] = useState(0);
        useEffect(() => {
          setX(1);
        }, []);
        return null;
      }
      await act(() => {
        root.render(<NotInsertion />);
      });
    });

    it('warns when setState is called from offscreen deleted insertion effect cleanup', async () => {
      function App(props) {
        const [, setX] = useState(0);
        useInsertionEffect(() => {
          if (props.throw) {
            throw Error('No');
          }
          return () => {
            setX(1);
          };
        }, [props.throw, props.foo]);
        return null;
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(
          <Activity mode="hidden">
            <App foo="hello" />
          </Activity>,
        );
      });

      await act(() => {
        root.render(<Activity mode="hidden" />);
      });
      assertConsoleErrorDev([
        'useInsertionEffect must not schedule updates.\n' +
          '    in App (at **)',
      ]);

      // Should not warn for regular effects after throw.
      function NotInsertion() {
        const [, setX] = useState(0);
        useEffect(() => {
          setX(1);
        }, []);
        return null;
      }
      await act(() => {
        root.render(<NotInsertion />);
      });
    });
  });

  describe('useLayoutEffect', () => {
    it('fires layout effects after the host has been mutated', async () => {
      function getCommittedText() {
        const yields = Scheduler.unstable_clearLog();
        const children = ReactNoop.getChildrenAsJSX();
        Scheduler.log(yields);
        if (children === null) {
          return null;
        }
        return children.props.prop;
      }

      function Counter(props) {
        useLayoutEffect(() => {
          Scheduler.log(`Current: ${getCommittedText()}`);
        });
        return <Text text={props.count} />;
      }

      ReactNoop.render(<Counter count={0} />, () =>
        Scheduler.log('Sync effect'),
      );
      await waitFor([[0], 'Current: 0', 'Sync effect']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={0} />);

      ReactNoop.render(<Counter count={1} />, () =>
        Scheduler.log('Sync effect'),
      );
      await waitFor([[1], 'Current: 1', 'Sync effect']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop={1} />);
    });

    it('force flushes passive effects before firing new layout effects', async () => {
      let committedText = '(empty)';

      function Counter(props) {
        useLayoutEffect(() => {
          // Normally this would go in a mutation effect, but this test
          // intentionally omits a mutation effect.
          committedText = String(props.count);

          Scheduler.log(`Mount layout [current: ${committedText}]`);
          return () => {
            Scheduler.log(`Unmount layout [current: ${committedText}]`);
          };
        });
        useEffect(() => {
          Scheduler.log(`Mount normal [current: ${committedText}]`);
          return () => {
            Scheduler.log(`Unmount normal [current: ${committedText}]`);
          };
        });
        return null;
      }

      await act(async () => {
        ReactNoop.render(<Counter count={0} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Mount layout [current: 0]', 'Sync effect']);
        expect(committedText).toEqual('0');
        ReactNoop.render(<Counter count={1} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor([
          'Mount normal [current: 0]',
          'Unmount layout [current: 0]',
          'Mount layout [current: 1]',
          'Sync effect',
        ]);
        expect(committedText).toEqual('1');
      });

      assertLog(['Unmount normal [current: 1]', 'Mount normal [current: 1]']);
    });

    it('catches errors thrown in useLayoutEffect', async () => {
      class ErrorBoundary extends React.Component {
        state = {error: null};
        static getDerivedStateFromError(error) {
          Scheduler.log(`ErrorBoundary static getDerivedStateFromError`);
          return {error};
        }
        render() {
          const {children, id, fallbackID} = this.props;
          const {error} = this.state;
          if (error) {
            Scheduler.log(`${id} render error`);
            return <Component id={fallbackID} />;
          }
          Scheduler.log(`${id} render success`);
          return children || null;
        }
      }

      function Component({id}) {
        Scheduler.log('Component render ' + id);
        return <span prop={id} />;
      }

      function BrokenLayoutEffectDestroy() {
        useLayoutEffect(() => {
          return () => {
            Scheduler.log('BrokenLayoutEffectDestroy useLayoutEffect destroy');
            throw Error('Expected');
          };
        }, []);

        Scheduler.log('BrokenLayoutEffectDestroy render');
        return <span prop="broken" />;
      }

      ReactNoop.render(
        <ErrorBoundary id="OuterBoundary" fallbackID="OuterFallback">
          <Component id="sibling" />
          <ErrorBoundary id="InnerBoundary" fallbackID="InnerFallback">
            <BrokenLayoutEffectDestroy />
          </ErrorBoundary>
        </ErrorBoundary>,
      );

      await waitForAll([
        'OuterBoundary render success',
        'Component render sibling',
        'InnerBoundary render success',
        'BrokenLayoutEffectDestroy render',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="sibling" />
          <span prop="broken" />
        </>,
      );

      ReactNoop.render(
        <ErrorBoundary id="OuterBoundary" fallbackID="OuterFallback">
          <Component id="sibling" />
        </ErrorBoundary>,
      );

      // React should skip over the unmounting boundary and find the nearest still-mounted boundary.
      await waitForAll([
        'OuterBoundary render success',
        'Component render sibling',
        'BrokenLayoutEffectDestroy useLayoutEffect destroy',
        'ErrorBoundary static getDerivedStateFromError',
        'OuterBoundary render error',
        'Component render OuterFallback',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="OuterFallback" />);
    });

    it('assumes layout effect destroy function is either a function or undefined', async () => {
      function App(props) {
        useLayoutEffect(() => {
          return props.return;
        });
        return null;
      }

      const root1 = ReactNoop.createRoot();
      await act(() => {
        root1.render(<App return={17} />);
      });
      assertConsoleErrorDev([
        'useLayoutEffect must not return anything besides a ' +
          'function, which is used for clean-up. You returned: 17\n' +
          '    in App (at **)',
      ]);

      const root2 = ReactNoop.createRoot();
      await act(() => {
        root2.render(<App return={null} />);
      });
      assertConsoleErrorDev([
        'useLayoutEffect must not return anything besides a ' +
          'function, which is used for clean-up. You returned null. If your ' +
          'effect does not require clean up, return undefined (or nothing).\n' +
          '    in App (at **)',
      ]);

      const root3 = ReactNoop.createRoot();
      await act(() => {
        root3.render(<App return={Promise.resolve()} />);
      });
      assertConsoleErrorDev([
        'useLayoutEffect must not return anything besides a ' +
          'function, which is used for clean-up.\n\n' +
          'It looks like you wrote useLayoutEffect(async () => ...) or returned a Promise. ' +
          'Instead, write the async function inside your effect and call it immediately:\n' +
          '\n' +
          'useLayoutEffect(() => {\n' +
          '  async function fetchData() {\n' +
          '    // You can await here\n' +
          '    const response = await MyAPI.getData(someId);\n' +
          '    // ...\n' +
          '  }\n' +
          '  fetchData();\n' +
          "}, [someId]); // Or [] if effect doesn't need props or state\n" +
          '\n' +
          'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching\n' +
          '    in App (at **)',
      ]);

      // Error on unmount because React assumes the value is a function
      await act(async () => {
        root3.render(null);
        await waitForThrow('is not a function');
      });
    });
  });

  describe('useCallback', () => {
    it('memoizes callback by comparing inputs', async () => {
      class IncrementButton extends React.PureComponent {
        increment = () => {
          this.props.increment();
        };
        render() {
          return <Text text="Increment" />;
        }
      }

      function Counter({incrementBy}) {
        const [count, updateCount] = useState(0);
        const increment = useCallback(
          () => updateCount(c => c + incrementBy),
          [incrementBy],
        );
        return (
          <>
            <IncrementButton increment={increment} ref={button} />
            <Text text={'Count: ' + count} />
          </>
        );
      }

      const button = React.createRef(null);
      ReactNoop.render(<Counter incrementBy={1} />);
      await waitForAll(['Increment', 'Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Increment" />
          <span prop="Count: 0" />
        </>,
      );

      await act(() => button.current.increment());
      assertLog([
        // Button should not re-render, because its props haven't changed
        // 'Increment',
        'Count: 1',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Increment" />
          <span prop="Count: 1" />
        </>,
      );

      // Increase the increment amount
      ReactNoop.render(<Counter incrementBy={10} />);
      await waitForAll([
        // Inputs did change this time
        'Increment',
        'Count: 1',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Increment" />
          <span prop="Count: 1" />
        </>,
      );

      // Callback should have updated
      await act(() => button.current.increment());
      assertLog(['Count: 11']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Increment" />
          <span prop="Count: 11" />
        </>,
      );
    });
  });

  describe('useMemo', () => {
    it('memoizes value by comparing to previous inputs', async () => {
      function CapitalizedText(props) {
        const text = props.text;
        const capitalizedText = useMemo(() => {
          Scheduler.log(`Capitalize '${text}'`);
          return text.toUpperCase();
        }, [text]);
        return <Text text={capitalizedText} />;
      }

      ReactNoop.render(<CapitalizedText text="hello" />);
      await waitForAll(["Capitalize 'hello'", 'HELLO']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="HELLO" />);

      ReactNoop.render(<CapitalizedText text="hi" />);
      await waitForAll(["Capitalize 'hi'", 'HI']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="HI" />);

      ReactNoop.render(<CapitalizedText text="hi" />);
      await waitForAll(['HI']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="HI" />);

      ReactNoop.render(<CapitalizedText text="goodbye" />);
      await waitForAll(["Capitalize 'goodbye'", 'GOODBYE']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="GOODBYE" />);
    });

    it('always re-computes if no inputs are provided', async () => {
      function LazyCompute(props) {
        const computed = useMemo(props.compute);
        return <Text text={computed} />;
      }

      function computeA() {
        Scheduler.log('compute A');
        return 'A';
      }

      function computeB() {
        Scheduler.log('compute B');
        return 'B';
      }

      ReactNoop.render(<LazyCompute compute={computeA} />);
      await waitForAll(['compute A', 'A']);

      ReactNoop.render(<LazyCompute compute={computeA} />);
      await waitForAll(['compute A', 'A']);

      ReactNoop.render(<LazyCompute compute={computeA} />);
      await waitForAll(['compute A', 'A']);

      ReactNoop.render(<LazyCompute compute={computeB} />);
      await waitForAll(['compute B', 'B']);
    });

    it('should not invoke memoized function during re-renders unless inputs change', async () => {
      function LazyCompute(props) {
        const computed = useMemo(
          () => props.compute(props.input),
          [props.input],
        );
        const [count, setCount] = useState(0);
        if (count < 3) {
          setCount(count + 1);
        }
        return <Text text={computed} />;
      }

      function compute(val) {
        Scheduler.log('compute ' + val);
        return val;
      }

      ReactNoop.render(<LazyCompute compute={compute} input="A" />);
      await waitForAll(['compute A', 'A']);

      ReactNoop.render(<LazyCompute compute={compute} input="A" />);
      await waitForAll(['A']);

      ReactNoop.render(<LazyCompute compute={compute} input="B" />);
      await waitForAll(['compute B', 'B']);
    });
  });

  describe('useImperativeHandle', () => {
    it('does not update when deps are the same', async () => {
      const INCREMENT = 'INCREMENT';

      function reducer(state, action) {
        return action === INCREMENT ? state + 1 : state;
      }

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeHandle(ref, () => ({count, dispatch}), []);
        return <Text text={'Count: ' + count} />;
      }

      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      expect(counter.current.count).toBe(0);

      await act(() => {
        counter.current.dispatch(INCREMENT);
      });
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      // Intentionally not updated because of [] deps:
      expect(counter.current.count).toBe(0);
    });

    // Regression test for https://github.com/facebook/react/issues/14782
    it('automatically updates when deps are not specified', async () => {
      const INCREMENT = 'INCREMENT';

      function reducer(state, action) {
        return action === INCREMENT ? state + 1 : state;
      }

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeHandle(ref, () => ({count, dispatch}));
        return <Text text={'Count: ' + count} />;
      }

      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      expect(counter.current.count).toBe(0);

      await act(() => {
        counter.current.dispatch(INCREMENT);
      });
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      expect(counter.current.count).toBe(1);
    });

    it('updates when deps are different', async () => {
      const INCREMENT = 'INCREMENT';

      function reducer(state, action) {
        return action === INCREMENT ? state + 1 : state;
      }

      let totalRefUpdates = 0;
      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeHandle(ref, () => {
          totalRefUpdates++;
          return {count, dispatch};
        }, [count]);
        return <Text text={'Count: ' + count} />;
      }

      Counter = forwardRef(Counter);
      const counter = React.createRef(null);
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 0" />);
      expect(counter.current.count).toBe(0);
      expect(totalRefUpdates).toBe(1);

      await act(() => {
        counter.current.dispatch(INCREMENT);
      });
      assertLog(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      expect(counter.current.count).toBe(1);
      expect(totalRefUpdates).toBe(2);

      // Update that doesn't change the ref dependencies
      ReactNoop.render(<Counter ref={counter} />);
      await waitForAll(['Count: 1']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Count: 1" />);
      expect(counter.current.count).toBe(1);
      expect(totalRefUpdates).toBe(2); // Should not increase since last time
    });
  });

  describe('useTransition', () => {
    it('delays showing loading state until after timeout', async () => {
      let transition;
      function App() {
        const [show, setShow] = useState(false);
        const [isPending, startTransition] = useTransition();
        transition = () => {
          startTransition(() => {
            setShow(true);
          });
        };
        return (
          <Suspense
            fallback={<Text text={`Loading... Pending: ${isPending}`} />}>
            {show ? (
              <AsyncText text={`After... Pending: ${isPending}`} />
            ) : (
              <Text text={`Before... Pending: ${isPending}`} />
            )}
          </Suspense>
        );
      }
      ReactNoop.render(<App />);
      await waitForAll(['Before... Pending: false']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="Before... Pending: false" />,
      );

      await act(async () => {
        transition();

        await waitForAll([
          'Before... Pending: true',
          'Suspend! [After... Pending: false]',
          'Loading... Pending: false',
        ]);
        expect(ReactNoop).toMatchRenderedOutput(
          <span prop="Before... Pending: true" />,
        );
        Scheduler.unstable_advanceTime(500);
        await advanceTimers(500);

        // Even after a long amount of time, we still don't show a placeholder.
        Scheduler.unstable_advanceTime(100000);
        await advanceTimers(100000);
        expect(ReactNoop).toMatchRenderedOutput(
          <span prop="Before... Pending: true" />,
        );

        await resolveText('After... Pending: false');
        assertLog(['Promise resolved [After... Pending: false]']);
        await waitForAll(['After... Pending: false']);
        expect(ReactNoop).toMatchRenderedOutput(
          <span prop="After... Pending: false" />,
        );
      });
    });
  });

  describe('useDeferredValue', () => {
    it('defers text value', async () => {
      function TextBox({text}) {
        return <AsyncText text={text} />;
      }

      let _setText;
      function App() {
        const [text, setText] = useState('A');
        const deferredText = useDeferredValue(text);
        _setText = setText;
        return (
          <>
            <Text text={text} />
            <Suspense fallback={<Text text={'Loading'} />}>
              <TextBox text={deferredText} />
            </Suspense>
          </>
        );
      }

      await act(() => {
        ReactNoop.render(<App />);
      });

      assertLog([
        'A',
        'Suspend! [A]',
        'Loading',
        // pre-warming
        'Suspend! [A]',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="A" />
          <span prop="Loading" />
        </>,
      );

      await act(() => resolveText('A'));
      assertLog(['Promise resolved [A]', 'A']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="A" />
          <span prop="A" />
        </>,
      );

      await act(async () => {
        _setText('B');
        await waitForAll(['B', 'A', 'B', 'Suspend! [B]', 'Loading']);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="B" />
            <span prop="A" />
          </>,
        );
      });

      await act(async () => {
        Scheduler.unstable_advanceTime(250);
        await advanceTimers(250);
      });
      assertLog([]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="B" />
          <span prop="A" />
        </>,
      );

      // Even after a long amount of time, we don't show a fallback
      Scheduler.unstable_advanceTime(100000);
      await advanceTimers(100000);
      await waitForAll([]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="B" />
          <span prop="A" />
        </>,
      );

      await act(async () => {
        await resolveText('B');
      });
      assertLog(['Promise resolved [B]', 'B', 'B']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="B" />
          <span prop="B" />
        </>,
      );
    });
  });

  describe('progressive enhancement (not supported)', () => {
    it('mount additional state', async () => {
      let updateA;
      let updateB;
      // let updateC;

      function App(props) {
        const [A, _updateA] = useState(0);
        const [B, _updateB] = useState(0);
        updateA = _updateA;
        updateB = _updateB;

        let C;
        if (props.loadC) {
          useState(0);
        } else {
          C = '[not loaded]';
        }

        return <Text text={`A: ${A}, B: ${B}, C: ${C}`} />;
      }

      ReactNoop.render(<App loadC={false} />);
      await waitForAll(['A: 0, B: 0, C: [not loaded]']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="A: 0, B: 0, C: [not loaded]" />,
      );

      await act(() => {
        updateA(2);
        updateB(3);
      });

      assertLog(['A: 2, B: 3, C: [not loaded]']);
      expect(ReactNoop).toMatchRenderedOutput(
        <span prop="A: 2, B: 3, C: [not loaded]" />,
      );

      ReactNoop.render(<App loadC={true} />);
      await waitForThrow(
        'Rendered more hooks than during the previous render.',
      );
      assertLog([]);
      assertConsoleErrorDev([
        'React has detected a change in the order of Hooks called by App. ' +
          'This will lead to bugs and errors if not fixed. For more information, ' +
          'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
          '\n' +
          '   Previous render            Next render\n' +
          '   ------------------------------------------------------\n' +
          '1. useState                   useState\n' +
          '2. useState                   useState\n' +
          '3. undefined                  useState\n' +
          '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
          '\n' +
          '    in App (at **)',
      ]);

      // Uncomment if/when we support this again
      // expect(ReactNoop).toMatchRenderedOutput(<span prop="A: 2, B: 3, C: 0" />]);

      // updateC(4);
      // expect(Scheduler).toFlushAndYield(['A: 2, B: 3, C: 4']);
      // expect(ReactNoop).toMatchRenderedOutput(<span prop="A: 2, B: 3, C: 4" />]);
    });

    it('unmount state', async () => {
      let updateA;
      let updateB;
      let updateC;

      function App(props) {
        const [A, _updateA] = useState(0);
        const [B, _updateB] = useState(0);
        updateA = _updateA;
        updateB = _updateB;

        let C;
        if (props.loadC) {
          const [_C, _updateC] = useState(0);
          C = _C;
          updateC = _updateC;
        } else {
          C = '[not loaded]';
        }

        return <Text text={`A: ${A}, B: ${B}, C: ${C}`} />;
      }

      ReactNoop.render(<App loadC={true} />);
      await waitForAll(['A: 0, B: 0, C: 0']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A: 0, B: 0, C: 0" />);
      await act(() => {
        updateA(2);
        updateB(3);
        updateC(4);
      });
      assertLog(['A: 2, B: 3, C: 4']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A: 2, B: 3, C: 4" />);
      ReactNoop.render(<App loadC={false} />);
      await waitForThrow(
        'Rendered fewer hooks than expected. This may be caused by an ' +
          'accidental early return statement.',
      );
    });

    it('unmount effects', async () => {
      function App(props) {
        useEffect(() => {
          Scheduler.log('Mount A');
          return () => {
            Scheduler.log('Unmount A');
          };
        }, []);

        if (props.showMore) {
          useEffect(() => {
            Scheduler.log('Mount B');
            return () => {
              Scheduler.log('Unmount B');
            };
          }, []);
        }

        return null;
      }

      await act(async () => {
        ReactNoop.render(<App showMore={false} />, () =>
          Scheduler.log('Sync effect'),
        );
        await waitFor(['Sync effect']);
      });

      assertLog(['Mount A']);

      await act(async () => {
        ReactNoop.render(<App showMore={true} />);
        await waitForThrow(
          'Rendered more hooks than during the previous render.',
        );
        assertLog(['Unmount A']);
        assertConsoleErrorDev([
          'React has detected a change in the order of Hooks called by App. ' +
            'This will lead to bugs and errors if not fixed. For more information, ' +
            'read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n' +
            '\n' +
            '   Previous render            Next render\n' +
            '   ------------------------------------------------------\n' +
            '1. useEffect                  useEffect\n' +
            '2. undefined                  useEffect\n' +
            '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
            '\n' +
            '    in App (at **)',
        ]);
      });

      // Uncomment if/when we support this again
      // ReactNoop.flushPassiveEffects();
      // expect(Scheduler).toHaveYielded(['Mount B']);

      // ReactNoop.render(<App showMore={false} />);
      // expect(Scheduler).toFlushAndThrow(
      //   'Rendered fewer hooks than expected. This may be caused by an ' +
      //     'accidental early return statement.',
      // );
    });
  });

  it('useReducer does not eagerly bail out of state updates', async () => {
    // Edge case based on a bug report
    let setCounter;
    function App() {
      const [counter, _setCounter] = useState(1);
      setCounter = _setCounter;
      return <Component count={counter} />;
    }

    function Component({count}) {
      const [state, dispatch] = useReducer(() => {
        // This reducer closes over a value from props. If the reducer is not
        // properly updated, the eager reducer will compare to an old value
        // and bail out incorrectly.
        Scheduler.log('Reducer: ' + count);
        return count;
      }, -1);
      useEffect(() => {
        Scheduler.log('Effect: ' + count);
        dispatch();
      }, [count]);
      Scheduler.log('Render: ' + state);
      return count;
    }

    await act(async () => {
      ReactNoop.render(<App />);
      await waitForAll(['Render: -1', 'Effect: 1', 'Reducer: 1', 'Render: 1']);
      expect(ReactNoop).toMatchRenderedOutput('1');
    });

    await act(() => {
      setCounter(2);
    });
    assertLog(['Render: 1', 'Effect: 2', 'Reducer: 2', 'Render: 2']);
    expect(ReactNoop).toMatchRenderedOutput('2');
  });

  it('useReducer does not replay previous no-op actions when other state changes', async () => {
    let increment;
    let setDisabled;

    function Counter() {
      const [disabled, _setDisabled] = useState(true);
      const [count, dispatch] = useReducer((state, action) => {
        if (disabled) {
          return state;
        }
        if (action.type === 'increment') {
          return state + 1;
        }
        return state;
      }, 0);

      increment = () => dispatch({type: 'increment'});
      setDisabled = _setDisabled;

      Scheduler.log('Render disabled: ' + disabled);
      Scheduler.log('Render count: ' + count);
      return count;
    }

    ReactNoop.render(<Counter />);
    await waitForAll(['Render disabled: true', 'Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');

    await act(() => {
      // These increments should have no effect, since disabled=true
      increment();
      increment();
      increment();
    });
    assertLog(['Render disabled: true', 'Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');

    await act(() => {
      // Enabling the updater should *not* replay the previous increment() actions
      setDisabled(false);
    });
    assertLog(['Render disabled: false', 'Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');
  });

  it('useReducer does not replay previous no-op actions when props change', async () => {
    let setDisabled;
    let increment;

    function Counter({disabled}) {
      const [count, dispatch] = useReducer((state, action) => {
        if (disabled) {
          return state;
        }
        if (action.type === 'increment') {
          return state + 1;
        }
        return state;
      }, 0);

      increment = () => dispatch({type: 'increment'});

      Scheduler.log('Render count: ' + count);
      return count;
    }

    function App() {
      const [disabled, _setDisabled] = useState(true);
      setDisabled = _setDisabled;
      Scheduler.log('Render disabled: ' + disabled);
      return <Counter disabled={disabled} />;
    }

    ReactNoop.render(<App />);
    await waitForAll(['Render disabled: true', 'Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');

    await act(() => {
      // These increments should have no effect, since disabled=true
      increment();
      increment();
      increment();
    });
    assertLog(['Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');

    await act(() => {
      // Enabling the updater should *not* replay the previous increment() actions
      setDisabled(false);
    });
    assertLog(['Render disabled: false', 'Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');
  });

  it('useReducer applies potential no-op changes if made relevant by other updates in the batch', async () => {
    let setDisabled;
    let increment;

    function Counter({disabled}) {
      const [count, dispatch] = useReducer((state, action) => {
        if (disabled) {
          return state;
        }
        if (action.type === 'increment') {
          return state + 1;
        }
        return state;
      }, 0);

      increment = () => dispatch({type: 'increment'});

      Scheduler.log('Render count: ' + count);
      return count;
    }

    function App() {
      const [disabled, _setDisabled] = useState(true);
      setDisabled = _setDisabled;
      Scheduler.log('Render disabled: ' + disabled);
      return <Counter disabled={disabled} />;
    }

    ReactNoop.render(<App />);
    await waitForAll(['Render disabled: true', 'Render count: 0']);
    expect(ReactNoop).toMatchRenderedOutput('0');

    await act(() => {
      // Although the increment happens first (and would seem to do nothing since disabled=true),
      // because these calls are in a batch the parent updates first. This should cause the child
      // to re-render with disabled=false and *then* process the increment action, which now
      // increments the count and causes the component output to change.
      increment();
      setDisabled(false);
    });
    assertLog(['Render disabled: false', 'Render count: 1']);
    expect(ReactNoop).toMatchRenderedOutput('1');
  });

  // Regression test. Covers a case where an internal state variable
  // (`didReceiveUpdate`) is not reset properly.
  it('state bail out edge case (#16359)', async () => {
    let setCounterA;
    let setCounterB;

    function CounterA() {
      const [counter, setCounter] = useState(0);
      setCounterA = setCounter;
      Scheduler.log('Render A: ' + counter);
      useEffect(() => {
        Scheduler.log('Commit A: ' + counter);
      });
      return counter;
    }

    function CounterB() {
      const [counter, setCounter] = useState(0);
      setCounterB = setCounter;
      Scheduler.log('Render B: ' + counter);
      useEffect(() => {
        Scheduler.log('Commit B: ' + counter);
      });
      return counter;
    }

    const root = ReactNoop.createRoot(null);
    await act(() => {
      root.render(
        <>
          <CounterA />
          <CounterB />
        </>,
      );
    });
    assertLog(['Render A: 0', 'Render B: 0', 'Commit A: 0', 'Commit B: 0']);

    await act(() => {
      setCounterA(1);

      // In the same batch, update B twice. To trigger the condition we're
      // testing, the first update is necessary to bypass the early
      // bailout optimization.
      setCounterB(1);
      setCounterB(0);
    });
    assertLog([
      'Render A: 1',
      'Render B: 0',
      'Commit A: 1',
      // B should not fire an effect because the update bailed out
      // 'Commit B: 0',
    ]);
  });

  it('should update latest rendered reducer when a preceding state receives a render phase update', async () => {
    // Similar to previous test, except using a preceding render phase update
    // instead of new props.
    let dispatch;
    function App() {
      const [step, setStep] = useState(0);
      const [shadow, _dispatch] = useReducer(() => step, step);
      dispatch = _dispatch;

      if (step < 5) {
        setStep(step + 1);
      }

      Scheduler.log(`Step: ${step}, Shadow: ${shadow}`);
      return shadow;
    }

    ReactNoop.render(<App />);
    await waitForAll([
      'Step: 0, Shadow: 0',
      'Step: 1, Shadow: 0',
      'Step: 2, Shadow: 0',
      'Step: 3, Shadow: 0',
      'Step: 4, Shadow: 0',
      'Step: 5, Shadow: 0',
    ]);
    expect(ReactNoop).toMatchRenderedOutput('0');

    await act(() => dispatch());
    assertLog(['Step: 5, Shadow: 5']);
    expect(ReactNoop).toMatchRenderedOutput('5');
  });

  it('should process the rest pending updates after a render phase update', async () => {
    // Similar to previous test, except using a preceding render phase update
    // instead of new props.
    let updateA;
    let updateC;
    function App() {
      const [a, setA] = useState(false);
      const [b, setB] = useState(false);
      if (a !== b) {
        setB(a);
      }
      // Even though we called setB above,
      // we should still apply the changes to C,
      // during this render pass.
      const [c, setC] = useState(false);
      updateA = setA;
      updateC = setC;
      return `${a ? 'A' : 'a'}${b ? 'B' : 'b'}${c ? 'C' : 'c'}`;
    }

    await act(() => ReactNoop.render(<App />));
    expect(ReactNoop).toMatchRenderedOutput('abc');

    await act(() => {
      updateA(true);
      // This update should not get dropped.
      updateC(true);
    });
    expect(ReactNoop).toMatchRenderedOutput('ABC');
  });

  it("regression test: don't unmount effects on siblings of deleted nodes", async () => {
    const root = ReactNoop.createRoot();

    function Child({label}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout ' + label);
        return () => {
          Scheduler.log('Unmount layout ' + label);
        };
      }, [label]);
      useEffect(() => {
        Scheduler.log('Mount passive ' + label);
        return () => {
          Scheduler.log('Unmount passive ' + label);
        };
      }, [label]);
      return label;
    }

    await act(() => {
      root.render(
        <>
          <Child key="A" label="A" />
          <Child key="B" label="B" />
        </>,
      );
    });
    assertLog([
      'Mount layout A',
      'Mount layout B',
      'Mount passive A',
      'Mount passive B',
    ]);

    // Delete A. This should only unmount the effect on A. In the regression,
    // B's effect would also unmount.
    await act(() => {
      root.render(
        <>
          <Child key="B" label="B" />
        </>,
      );
    });
    assertLog(['Unmount layout A', 'Unmount passive A']);

    // Now delete and unmount B.
    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount layout B', 'Unmount passive B']);
  });

  it('regression: deleting a tree and unmounting its effects after a reorder', async () => {
    const root = ReactNoop.createRoot();

    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return label;
    }

    await act(() => {
      root.render(
        <>
          <Child key="A" label="A" />
          <Child key="B" label="B" />
        </>,
      );
    });
    assertLog(['Mount A', 'Mount B']);

    await act(() => {
      root.render(
        <>
          <Child key="B" label="B" />
          <Child key="A" label="A" />
        </>,
      );
    });
    assertLog([]);

    await act(() => {
      root.render(null);
    });

    assertLog([
      'Unmount B',
      // In the regression, the reorder would cause Child A to "forget" that it
      // contains passive effects. Then when we deleted the tree, A's unmount
      // effect would not fire.
      'Unmount A',
    ]);
  });

  // @gate enableSuspenseList
  it('regression: SuspenseList causes unmounts to be dropped on deletion', async () => {
    function Row({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return (
        <Suspense fallback="Loading...">
          <AsyncText text={label} />
        </Suspense>
      );
    }

    function App() {
      return (
        <SuspenseList revealOrder="together">
          <Row label="A" />
          <Row label="B" />
        </SuspenseList>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Suspend! [A]', 'Suspend! [B]', 'Mount A', 'Mount B']);

    await act(async () => {
      await resolveText('A');
    });
    assertLog(['Promise resolved [A]', 'A', 'Suspend! [B]']);

    await act(() => {
      root.render(null);
    });
    // In the regression, SuspenseList would cause the children to "forget" that
    // it contains passive effects. Then when we deleted the tree, these unmount
    // effects would not fire.
    assertLog(['Unmount A', 'Unmount B']);
  });

  it('effect dependencies are persisted after a render phase update', async () => {
    let handleClick;
    function Test() {
      const [count, setCount] = useState(0);

      useEffect(() => {
        Scheduler.log(`Effect: ${count}`);
      }, [count]);

      if (count > 0) {
        setCount(0);
      }

      handleClick = () => setCount(2);

      return <Text text={`Render: ${count}`} />;
    }

    await act(() => {
      ReactNoop.render(<Test />);
    });

    assertLog(['Render: 0', 'Effect: 0']);

    await act(() => {
      handleClick();
    });

    assertLog(['Render: 0']);

    await act(() => {
      handleClick();
    });

    assertLog(['Render: 0']);

    await act(() => {
      handleClick();
    });

    assertLog(['Render: 0']);
  });
});
