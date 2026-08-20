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

let React;
let ReactNoop;
let Scheduler;
let ContinuousEventPriority;
let act;
let waitForAll;
let waitFor;
let assertLog;
let assertConsoleErrorDev;

describe('ReactIncrementalUpdates', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    ContinuousEventPriority =
      require('react-reconciler/constants').ContinuousEventPriority;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  it('applies updates in order of priority', async () => {
    let state;
    class Foo extends React.Component {
      state = {};
      componentDidMount() {
        Scheduler.log('commit');
        React.startTransition(() => {
          // Has low priority
          this.setState({b: 'b'});
          this.setState({c: 'c'});
        });
        // Has Task priority
        this.setState({a: 'a'});
      }
      render() {
        state = this.state;
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitFor(['commit']);

    expect(state).toEqual({a: 'a'});
    await waitForAll([]);
    expect(state).toEqual({a: 'a', b: 'b', c: 'c'});
  });

  it('applies updates with equal priority in insertion order', async () => {
    let state;
    class Foo extends React.Component {
      state = {};
      componentDidMount() {
        // All have Task priority
        this.setState({a: 'a'});
        this.setState({b: 'b'});
        this.setState({c: 'c'});
      }
      render() {
        state = this.state;
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);
    expect(state).toEqual({a: 'a', b: 'b', c: 'c'});
  });

  it('only drops updates with equal or lesser priority when replaceState is called', async () => {
    let instance;
    class Foo extends React.Component {
      state = {};
      componentDidMount() {
        Scheduler.log('componentDidMount');
      }
      componentDidUpdate() {
        Scheduler.log('componentDidUpdate');
      }
      render() {
        Scheduler.log('render');
        instance = this;
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll(['render', 'componentDidMount']);

    ReactNoop.flushSync(() => {
      React.startTransition(() => {
        instance.setState({x: 'x'});
        instance.setState({y: 'y'});
      });
      instance.setState({a: 'a'});
      instance.setState({b: 'b'});
      React.startTransition(() => {
        instance.updater.enqueueReplaceState(instance, {c: 'c'});
        instance.setState({d: 'd'});
      });
    });

    // Even though a replaceState has been already scheduled, it hasn't been
    // flushed yet because it has async priority.
    expect(instance.state).toEqual({a: 'a', b: 'b'});
    assertLog(['render', 'componentDidUpdate']);

    await waitForAll(['render', 'componentDidUpdate']);
    // Now the rest of the updates are flushed, including the replaceState.
    expect(instance.state).toEqual({c: 'c', d: 'd'});
  });

  it('can abort an update, schedule additional updates, and resume', async () => {
    let instance;
    class Foo extends React.Component {
      state = {};
      render() {
        instance = this;
        return <span prop={Object.keys(this.state).sort().join('')} />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);

    function createUpdate(letter) {
      return () => {
        Scheduler.log(letter);
        return {
          [letter]: letter,
        };
      };
    }

    // Schedule some async updates
    React.startTransition(() => {
      instance.setState(createUpdate('a'));
      instance.setState(createUpdate('b'));
      instance.setState(createUpdate('c'));
    });

    // Begin the updates but don't flush them yet
    await waitFor(['a', 'b', 'c']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="" />);

    // Schedule some more updates at different priorities
    instance.setState(createUpdate('d'));
    ReactNoop.flushSync(() => {
      instance.setState(createUpdate('e'));
      instance.setState(createUpdate('f'));
    });
    React.startTransition(() => {
      instance.setState(createUpdate('g'));
    });

    // The sync updates should have flushed, but not the async ones.
    assertLog(['d', 'e', 'f']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="def" />);

    // Now flush the remaining work. Even though e and f were already processed,
    // they should be processed again, to ensure that the terminal state
    // is deterministic.
    await waitForAll([
      // Then we'll re-process everything for 'g'.
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="abcdefg" />);
  });

  it('can abort an update, schedule a replaceState, and resume', async () => {
    let instance;
    class Foo extends React.Component {
      state = {};
      render() {
        instance = this;
        return <span prop={Object.keys(this.state).sort().join('')} />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([]);

    function createUpdate(letter) {
      return () => {
        Scheduler.log(letter);
        return {
          [letter]: letter,
        };
      };
    }

    // Schedule some async updates
    React.startTransition(() => {
      instance.setState(createUpdate('a'));
      instance.setState(createUpdate('b'));
      instance.setState(createUpdate('c'));
    });

    // Begin the updates but don't flush them yet
    await waitFor(['a', 'b', 'c']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="" />);

    // Schedule some more updates at different priorities
    instance.setState(createUpdate('d'));

    ReactNoop.flushSync(() => {
      instance.setState(createUpdate('e'));
      // No longer a public API, but we can test that it works internally by
      // reaching into the updater.
      instance.updater.enqueueReplaceState(instance, createUpdate('f'));
    });
    React.startTransition(() => {
      instance.setState(createUpdate('g'));
    });

    // The sync updates should have flushed, but not the async ones.
    assertLog(['d', 'e', 'f']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="f" />);

    // Now flush the remaining work. Even though e and f were already processed,
    // they should be processed again, to ensure that the terminal state
    // is deterministic.
    await waitForAll([
      // Then we'll re-process everything for 'g'.
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="fg" />);
  });

  it('passes accumulation of previous updates to replaceState updater function', async () => {
    let instance;
    class Foo extends React.Component {
      state = {};
      render() {
        instance = this;
        return <span />;
      }
    }
    ReactNoop.render(<Foo />);
    await waitForAll([]);

    instance.setState({a: 'a'});
    instance.setState({b: 'b'});
    // No longer a public API, but we can test that it works internally by
    // reaching into the updater.
    instance.updater.enqueueReplaceState(instance, previousState => ({
      previousState,
    }));
    await waitForAll([]);
    expect(instance.state).toEqual({previousState: {a: 'a', b: 'b'}});
  });

  it('does not call callbacks that are scheduled by another callback until a later commit', async () => {
    class Foo extends React.Component {
      state = {};
      componentDidMount() {
        Scheduler.log('did mount');
        this.setState({a: 'a'}, () => {
          Scheduler.log('callback a');
          this.setState({b: 'b'}, () => {
            Scheduler.log('callback b');
          });
        });
      }
      render() {
        Scheduler.log('render');
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([
      'render',
      'did mount',
      'render',
      'callback a',
      'render',
      'callback b',
    ]);
  });

  it('gives setState during reconciliation the same priority as whatever level is currently reconciling', async () => {
    let instance;

    class Foo extends React.Component {
      state = {};
      UNSAFE_componentWillReceiveProps() {
        Scheduler.log('componentWillReceiveProps');
        this.setState({b: 'b'});
      }
      render() {
        Scheduler.log('render');
        instance = this;
        return <div />;
      }
    }
    ReactNoop.render(<Foo />);
    await waitForAll(['render']);

    ReactNoop.flushSync(() => {
      instance.setState({a: 'a'});

      ReactNoop.render(<Foo />); // Trigger componentWillReceiveProps
    });

    expect(instance.state).toEqual({a: 'a', b: 'b'});

    assertLog(['componentWillReceiveProps', 'render']);
  });

  it('updates triggered from inside a class setState updater', async () => {
    let instance;
    class Foo extends React.Component {
      state = {};
      render() {
        Scheduler.log('render');
        instance = this;
        return <div />;
      }
    }

    ReactNoop.render(<Foo />);
    await waitForAll([
      // Initial render
      'render',
    ]);

    instance.setState(function a() {
      Scheduler.log('setState updater');
      this.setState({b: 'b'});
      return {a: 'a'};
    });

    await waitForAll([
      'setState updater',
      // Updates in the render phase receive the currently rendering
      // lane, so the update flushes immediately in the same render.
      'render',
    ]);
    assertConsoleErrorDev([
      'An update (setState, replaceState, or forceUpdate) was scheduled ' +
        'from inside an update function. Update functions should be pure, ' +
        'with zero side-effects. Consider using componentDidUpdate or a ' +
        'callback.\n' +
        '\n' +
        'Please update the following component: Foo\n' +
        '    in Foo (at **)',
    ]);
    expect(instance.state).toEqual({a: 'a', b: 'b'});

    // Test deduplication (no additional warnings expected)
    instance.setState(function a() {
      this.setState({a: 'a'});
      return {b: 'b'};
    });
    await waitForAll(
      gate(flags =>
        // Updates in the render phase receive the currently rendering
        // lane, so the update flushes immediately in the same render.
        ['render'],
      ),
    );
  });

  it('getDerivedStateFromProps should update base state of updateQueue (based on product bug)', () => {
    // Based on real-world bug.

    let foo;
    class Foo extends React.Component {
      state = {value: 'initial state'};
      static getDerivedStateFromProps() {
        return {value: 'derived state'};
      }
      render() {
        foo = this;
        return (
          <>
            <span prop={this.state.value} />
            <Bar />
          </>
        );
      }
    }

    let bar;
    class Bar extends React.Component {
      render() {
        bar = this;
        return null;
      }
    }

    ReactNoop.flushSync(() => {
      ReactNoop.render(<Foo />);
    });
    expect(ReactNoop).toMatchRenderedOutput(<span prop="derived state" />);

    ReactNoop.flushSync(() => {
      // Triggers getDerivedStateFromProps again
      ReactNoop.render(<Foo />);
      // The noop callback is needed to trigger the specific internal path that
      // led to this bug. Removing it causes it to "accidentally" work.
      foo.setState({value: 'update state'}, function noop() {});
    });
    expect(ReactNoop).toMatchRenderedOutput(<span prop="derived state" />);

    ReactNoop.flushSync(() => {
      bar.setState({});
    });
    expect(ReactNoop).toMatchRenderedOutput(<span prop="derived state" />);
  });

  it('regression: does not expire soon due to layout effects in the last batch', async () => {
    const {useState, useLayoutEffect} = React;

    let setCount;
    function App() {
      const [count, _setCount] = useState(0);
      setCount = _setCount;
      Scheduler.log('Render: ' + count);
      useLayoutEffect(() => {
        setCount(1);
        Scheduler.log('Commit: ' + count);
      }, []);
      return <Text text="Child" />;
    }

    await act(async () => {
      React.startTransition(() => {
        ReactNoop.render(<App />);
      });
      assertLog([]);
      await waitForAll([
        'Render: 0',
        'Child',
        'Commit: 0',
        'Render: 1',
        'Child',
      ]);

      Scheduler.unstable_advanceTime(10000);
      React.startTransition(() => {
        setCount(2);
      });
      // The transition should not have expired, so we should be able to
      // partially render it.
      await waitFor(['Render: 2']);
      // Now do the rest
      await waitForAll(['Child']);
    });
  });

  it('regression: does not expire soon due to previous flushSync', async () => {
    ReactNoop.flushSync(() => {
      ReactNoop.render(<Text text="A" />);
    });
    assertLog(['A']);

    Scheduler.unstable_advanceTime(10000);

    React.startTransition(() => {
      ReactNoop.render(
        <>
          <Text text="A" />
          <Text text="B" />
          <Text text="C" />
          <Text text="D" />
        </>,
      );
    });
    // The transition should not have expired, so we should be able to
    // partially render it.
    await waitFor(['A']);
    await waitFor(['B']);
    await waitForAll(['C', 'D']);
  });

  it('regression: does not expire soon due to previous expired work', async () => {
    React.startTransition(() => {
      ReactNoop.render(
        <>
          <Text text="A" />
          <Text text="B" />
          <Text text="C" />
          <Text text="D" />
        </>,
      );
    });

    await waitFor(['A']);
    // This will expire the rest of the update
    Scheduler.unstable_advanceTime(10000);
    await waitFor(['B'], {
      additionalLogsAfterAttemptingToYield: ['C', 'D'],
    });

    Scheduler.unstable_advanceTime(10000);

    // Now do another transition. This one should not expire.
    React.startTransition(() => {
      ReactNoop.render(
        <>
          <Text text="A" />
          <Text text="B" />
          <Text text="C" />
          <Text text="D" />
        </>,
      );
    });

    // The transition should not have expired, so we should be able to
    // partially render it.
    await waitFor(['A']);
    await waitFor(['B']);
    await waitForAll(['C', 'D']);
  });

  it('when rebasing, does not exclude updates that were already committed, regardless of priority', async () => {
    const {useState, useLayoutEffect} = React;

    let pushToLog;
    function App() {
      const [log, setLog] = useState('');
      pushToLog = msg => {
        setLog(prevLog => prevLog + msg);
      };

      useLayoutEffect(() => {
        Scheduler.log('Committed: ' + log);
        if (log === 'B') {
          // Right after B commits, schedule additional updates.
          ReactNoop.unstable_runWithPriority(ContinuousEventPriority, () =>
            pushToLog('C'),
          );
          setLog(prevLog => prevLog + 'D');
        }
      }, [log]);

      return log;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Committed: ']);
    expect(root).toMatchRenderedOutput(null);

    await act(() => {
      React.startTransition(() => {
        pushToLog('A');
      });

      ReactNoop.unstable_runWithPriority(ContinuousEventPriority, () =>
        pushToLog('B'),
      );
    });
    assertLog(['Committed: B', 'Committed: BCD', 'Committed: ABCD']);
    expect(root).toMatchRenderedOutput('ABCD');
  });

  it('when rebasing, does not exclude updates that were already committed, regardless of priority (classes)', async () => {
    let pushToLog;
    class App extends React.Component {
      state = {log: ''};
      pushToLog = msg => {
        this.setState(prevState => ({log: prevState.log + msg}));
      };
      componentDidUpdate() {
        Scheduler.log('Committed: ' + this.state.log);
        if (this.state.log === 'B') {
          // Right after B commits, schedule additional updates.
          ReactNoop.unstable_runWithPriority(ContinuousEventPriority, () =>
            this.pushToLog('C'),
          );
          this.pushToLog('D');
        }
      }
      render() {
        pushToLog = this.pushToLog;
        return this.state.log;
      }
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput(null);

    await act(() => {
      React.startTransition(() => {
        pushToLog('A');
      });
      ReactNoop.unstable_runWithPriority(ContinuousEventPriority, () =>
        pushToLog('B'),
      );
    });
    assertLog(['Committed: B', 'Committed: BCD', 'Committed: ABCD']);
    expect(root).toMatchRenderedOutput('ABCD');
  });

  it("base state of update queue is initialized to its fiber's memoized state", async () => {
    // This test is very weird because it tests an implementation detail but
    // is tested in terms of public APIs. When it was originally written, the
    // test failed because the update queue was initialized to the state of
    // the alternate fiber.
    let app;
    class App extends React.Component {
      state = {prevProp: 'A', count: 0};
      static getDerivedStateFromProps(props, state) {
        // Add 100 whenever the label prop changes. The prev label is stored
        // in state. If the state is dropped incorrectly, we'll fail to detect
        // prop changes.
        if (props.prop !== state.prevProp) {
          return {
            prevProp: props.prop,
            count: state.count + 100,
          };
        }
        return null;
      }
      render() {
        app = this;
        return this.state.count;
      }
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App prop="A" />);
    });
    expect(root).toMatchRenderedOutput('0');

    // Changing the prop causes the count to increase by 100
    await act(() => {
      root.render(<App prop="B" />);
    });
    expect(root).toMatchRenderedOutput('100');

    // Now increment the count by 1 with a state update. And, in the same
    // batch, change the prop back to its original value.
    await act(() => {
      root.render(<App prop="A" />);
      app.setState(state => ({count: state.count + 1}));
    });
    // There were two total prop changes, plus an increment.
    expect(root).toMatchRenderedOutput('201');
  });
});
