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
let ReactFeatureFlags;
let ReactNoop;
let Scheduler;
let act;
let AdvanceTime;
let assertLog;
let waitFor;
let waitForAll;
let waitForThrow;

function loadModules({
  enableProfilerTimer = true,
  enableProfilerCommitHooks = true,
  enableProfilerNestedUpdatePhase = true,
} = {}) {
  ReactFeatureFlags = require('shared/ReactFeatureFlags');

  ReactFeatureFlags.enableProfilerTimer = enableProfilerTimer;
  ReactFeatureFlags.enableProfilerCommitHooks = enableProfilerCommitHooks;
  ReactFeatureFlags.enableProfilerNestedUpdatePhase =
    enableProfilerNestedUpdatePhase;

  React = require('react');
  Scheduler = require('scheduler');
  ReactNoop = require('react-noop-renderer');
  const InternalTestUtils = require('internal-test-utils');
  act = InternalTestUtils.act;
  assertLog = InternalTestUtils.assertLog;
  waitFor = InternalTestUtils.waitFor;
  waitForAll = InternalTestUtils.waitForAll;
  waitForThrow = InternalTestUtils.waitForThrow;

  AdvanceTime = class extends React.Component {
    static defaultProps = {
      byAmount: 10,
      shouldComponentUpdate: true,
    };
    shouldComponentUpdate(nextProps) {
      return nextProps.shouldComponentUpdate;
    }
    render() {
      // Simulate time passing when this component is rendered
      Scheduler.unstable_advanceTime(this.props.byAmount);
      return this.props.children || null;
    }
  };
}

describe(`onRender`, () => {
  beforeEach(() => {
    jest.resetModules();
    loadModules();
  });

  it('should handle errors thrown', async () => {
    const callback = jest.fn(id => {
      if (id === 'throw') {
        throw Error('expected');
      }
    });

    let didMount = false;
    class ClassComponent extends React.Component {
      componentDidMount() {
        didMount = true;
      }
      render() {
        return this.props.children;
      }
    }

    // Errors thrown from onRender should not break the commit phase,
    // Or prevent other lifecycles from being called.
    await expect(
      act(() => {
        ReactNoop.render(
          <ClassComponent>
            <React.Profiler id="do-not-throw" onRender={callback}>
              <React.Profiler id="throw" onRender={callback}>
                <div />
              </React.Profiler>
            </React.Profiler>
          </ClassComponent>,
        );
      }),
    ).rejects.toThrow('expected');
    expect(didMount).toBe(true);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('is not invoked until the commit phase', async () => {
    const callback = jest.fn();

    const Yield = ({value}) => {
      Scheduler.log(value);
      return null;
    };

    React.startTransition(() => {
      ReactNoop.render(
        <React.Profiler id="test" onRender={callback}>
          <Yield value="first" />
          <Yield value="last" />
        </React.Profiler>,
      );
    });

    // Times are logged until a render is committed.
    await waitFor(['first']);
    expect(callback).toHaveBeenCalledTimes(0);
    await waitForAll(['last']);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // @gate !__DEV__
  it('does not record times for components outside of Profiler tree', async () => {
    // Mock the Scheduler module so we can track how many times the current
    // time is read
    jest.mock('scheduler', obj => {
      const ActualScheduler = jest.requireActual('scheduler/unstable_mock');
      return {
        ...ActualScheduler,
        unstable_now: function mockUnstableNow() {
          ActualScheduler.log('read current time');
          return ActualScheduler.unstable_now();
        },
      };
    });

    jest.resetModules();

    loadModules();

    // Clear yields in case the current time is read during initialization.
    Scheduler.unstable_clearLog();

    await act(() => {
      ReactNoop.render(
        <div>
          <AdvanceTime />
          <AdvanceTime />
          <AdvanceTime />
          <AdvanceTime />
          <AdvanceTime />
        </div>,
      );
    });

    // Restore original mock
    jest.mock('scheduler', () => jest.requireActual('scheduler/unstable_mock'));

    if (gate(flags => flags.enableComponentPerformanceTrack)) {
      assertLog([
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
      ]);
    } else {
      assertLog([
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
        'read current time',
      ]);
    }
  });

  it('does not report work done on a sibling', async () => {
    const callback = jest.fn();

    const DoesNotUpdate = React.memo(
      function DoesNotUpdateInner() {
        Scheduler.unstable_advanceTime(10);
        return null;
      },
      () => true,
    );

    let updateProfilerSibling;

    function ProfilerSibling() {
      const [count, setCount] = React.useState(0);
      updateProfilerSibling = () => setCount(count + 1);
      return null;
    }

    function App() {
      return (
        <React.Fragment>
          <React.Profiler id="test" onRender={callback}>
            <DoesNotUpdate />
          </React.Profiler>
          <ProfilerSibling />
        </React.Fragment>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(6);
    expect(call[0]).toBe('test');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(10); // actual time
    expect(call[3]).toBe(10); // base time
    expect(call[4]).toBe(0); // start time
    expect(call[5]).toBe(10); // commit time

    callback.mockReset();

    Scheduler.unstable_advanceTime(20); // 10 -> 30

    await act(() => {
      root.render(<App />);
    });

    if (gate(flags => flags.enableUseJSStackToTrackPassiveDurations)) {
      // None of the Profiler's subtree was rendered because App bailed out before the Profiler.
      // So we expect onRender not to be called.
      expect(callback).not.toHaveBeenCalled();
    } else {
      // Updating a parent reports a re-render,
      // since React technically did a little bit of work between the Profiler and the bailed out subtree.
      // This is not optimal but it's how the old reconciler fork works.
      expect(callback).toHaveBeenCalledTimes(1);

      call = callback.mock.calls[0];

      expect(call).toHaveLength(6);
      expect(call[0]).toBe('test');
      expect(call[1]).toBe('update');
      expect(call[2]).toBe(0); // actual time
      expect(call[3]).toBe(10); // base time
      expect(call[4]).toBe(30); // start time
      expect(call[5]).toBe(30); // commit time

      callback.mockReset();
    }

    Scheduler.unstable_advanceTime(20); // 30 -> 50

    // Updating a sibling should not report a re-render.
    await act(() => updateProfilerSibling());

    expect(callback).not.toHaveBeenCalled();
  });

  it('logs render times for both mount and update', async () => {
    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <AdvanceTime />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let [call] = callback.mock.calls;

    expect(call).toHaveLength(6);
    expect(call[0]).toBe('test');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(10); // actual time
    expect(call[3]).toBe(10); // base time
    expect(call[4]).toBe(5); // start time
    expect(call[5]).toBe(15); // commit time

    callback.mockReset();

    Scheduler.unstable_advanceTime(20); // 15 -> 35

    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <AdvanceTime />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    [call] = callback.mock.calls;

    expect(call).toHaveLength(6);
    expect(call[0]).toBe('test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(10); // actual time
    expect(call[3]).toBe(10); // base time
    expect(call[4]).toBe(35); // start time
    expect(call[5]).toBe(45); // commit time

    callback.mockReset();

    Scheduler.unstable_advanceTime(20); // 45 -> 65

    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <AdvanceTime byAmount={4} />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    [call] = callback.mock.calls;

    expect(call).toHaveLength(6);
    expect(call[0]).toBe('test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(4); // actual time
    expect(call[3]).toBe(4); // base time
    expect(call[4]).toBe(65); // start time
    expect(call[5]).toBe(69); // commit time
  });

  it('includes render times of nested Profilers in their parent times', async () => {
    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Fragment>
          <React.Profiler id="parent" onRender={callback}>
            <AdvanceTime byAmount={10}>
              <React.Profiler id="child" onRender={callback}>
                <AdvanceTime byAmount={20} />
              </React.Profiler>
            </AdvanceTime>
          </React.Profiler>
        </React.Fragment>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    // Callbacks bubble (reverse order).
    const [childCall, parentCall] = callback.mock.calls;
    expect(childCall[0]).toBe('child');
    expect(parentCall[0]).toBe('parent');

    // Parent times should include child times
    expect(childCall[2]).toBe(20); // actual time
    expect(childCall[3]).toBe(20); // base time
    expect(childCall[4]).toBe(15); // start time
    expect(childCall[5]).toBe(35); // commit time
    expect(parentCall[2]).toBe(30); // actual time
    expect(parentCall[3]).toBe(30); // base time
    expect(parentCall[4]).toBe(5); // start time
    expect(parentCall[5]).toBe(35); // commit time
  });

  it('traces sibling Profilers separately', async () => {
    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Fragment>
          <React.Profiler id="first" onRender={callback}>
            <AdvanceTime byAmount={20} />
          </React.Profiler>
          <React.Profiler id="second" onRender={callback}>
            <AdvanceTime byAmount={5} />
          </React.Profiler>
        </React.Fragment>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    const [firstCall, secondCall] = callback.mock.calls;
    expect(firstCall[0]).toBe('first');
    expect(secondCall[0]).toBe('second');

    // Parent times should include child times
    expect(firstCall[2]).toBe(20); // actual time
    expect(firstCall[3]).toBe(20); // base time
    expect(firstCall[4]).toBe(5); // start time
    expect(firstCall[5]).toBe(30); // commit time
    expect(secondCall[2]).toBe(5); // actual time
    expect(secondCall[3]).toBe(5); // base time
    expect(secondCall[4]).toBe(25); // start time
    expect(secondCall[5]).toBe(30); // commit time
  });

  it('does not include time spent outside of profile root', async () => {
    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Fragment>
          <AdvanceTime byAmount={20} />
          <React.Profiler id="test" onRender={callback}>
            <AdvanceTime byAmount={5} />
          </React.Profiler>
          <AdvanceTime byAmount={20} />
        </React.Fragment>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    const [call] = callback.mock.calls;
    expect(call[0]).toBe('test');
    expect(call[2]).toBe(5); // actual time
    expect(call[3]).toBe(5); // base time
    expect(call[4]).toBe(25); // start time
    expect(call[5]).toBe(50); // commit time
  });

  it('is not called when blocked by sCU false', async () => {
    const callback = jest.fn();

    let instance;
    class Updater extends React.Component {
      state = {};
      render() {
        instance = this;
        return this.props.children;
      }
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="outer" onRender={callback}>
          <Updater>
            <React.Profiler id="inner" onRender={callback}>
              <div />
            </React.Profiler>
          </Updater>
        </React.Profiler>,
      );
    });
    // All profile callbacks are called for initial render
    expect(callback).toHaveBeenCalledTimes(2);

    callback.mockReset();

    ReactNoop.flushSync(() => {
      instance.setState({
        count: 1,
      });
    });

    // Only call onRender for paths that have re-rendered.
    // Since the Updater's props didn't change,
    // React does not re-render its children.
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toBe('outer');
  });

  it('decreases actual time but not base time when sCU prevents an update', async () => {
    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <AdvanceTime byAmount={10}>
            <AdvanceTime byAmount={13} shouldComponentUpdate={false} />
          </AdvanceTime>
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    Scheduler.unstable_advanceTime(30); // 28 -> 58

    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <AdvanceTime byAmount={4}>
            <AdvanceTime byAmount={7} shouldComponentUpdate={false} />
          </AdvanceTime>
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    const [mountCall, updateCall] = callback.mock.calls;

    expect(mountCall[1]).toBe('mount');
    expect(mountCall[2]).toBe(23); // actual time
    expect(mountCall[3]).toBe(23); // base time
    expect(mountCall[4]).toBe(5); // start time
    expect(mountCall[5]).toBe(28); // commit time

    expect(updateCall[1]).toBe('update');
    expect(updateCall[2]).toBe(4); // actual time
    expect(updateCall[3]).toBe(17); // base time
    expect(updateCall[4]).toBe(58); // start time
    expect(updateCall[5]).toBe(62); // commit time
  });

  it('includes time spent in render phase lifecycles', async () => {
    class WithLifecycles extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        Scheduler.unstable_advanceTime(3);
        return null;
      }
      shouldComponentUpdate() {
        Scheduler.unstable_advanceTime(7);
        return true;
      }
      render() {
        Scheduler.unstable_advanceTime(5);
        return null;
      }
    }

    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <WithLifecycles />
        </React.Profiler>,
      );
    });

    Scheduler.unstable_advanceTime(15); // 13 -> 28

    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <WithLifecycles />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    const [mountCall, updateCall] = callback.mock.calls;

    expect(mountCall[1]).toBe('mount');
    expect(mountCall[2]).toBe(8); // actual time
    expect(mountCall[3]).toBe(8); // base time
    expect(mountCall[4]).toBe(5); // start time
    expect(mountCall[5]).toBe(13); // commit time

    expect(updateCall[1]).toBe('update');
    expect(updateCall[2]).toBe(15); // actual time
    expect(updateCall[3]).toBe(15); // base time
    expect(updateCall[4]).toBe(28); // start time
    expect(updateCall[5]).toBe(43); // commit time
  });

  it('should clear nested-update flag when multiple cascading renders are scheduled', async () => {
    jest.resetModules();
    loadModules();

    function Component() {
      const [didMount, setDidMount] = React.useState(false);
      const [didMountAndUpdate, setDidMountAndUpdate] = React.useState(false);

      React.useLayoutEffect(() => {
        setDidMount(true);
      }, []);

      React.useEffect(() => {
        if (didMount && !didMountAndUpdate) {
          setDidMountAndUpdate(true);
        }
      }, [didMount, didMountAndUpdate]);

      Scheduler.log(`${didMount}:${didMountAndUpdate}`);

      return null;
    }

    const onRender = jest.fn();

    await act(() => {
      ReactNoop.render(
        <React.Profiler id="root" onRender={onRender}>
          <Component />
        </React.Profiler>,
      );
    });
    assertLog(['false:false', 'true:false', 'true:true']);

    expect(onRender).toHaveBeenCalledTimes(3);
    expect(onRender.mock.calls[0][1]).toBe('mount');
    expect(onRender.mock.calls[1][1]).toBe('nested-update');
    expect(onRender.mock.calls[2][1]).toBe('update');
  });

  it('is properly distinguish updates and nested-updates when there is more than sync remaining work', () => {
    jest.resetModules();
    loadModules();

    function Component() {
      const [didMount, setDidMount] = React.useState(false);

      React.useLayoutEffect(() => {
        setDidMount(true);
      }, []);
      Scheduler.log(didMount);
      return didMount;
    }

    const onRender = jest.fn();

    // Schedule low-priority work.
    React.startTransition(() =>
      ReactNoop.render(
        <React.Profiler id="root" onRender={onRender}>
          <Component />
        </React.Profiler>,
      ),
    );

    // Flush sync work with a nested update
    ReactNoop.flushSync(() => {
      ReactNoop.render(
        <React.Profiler id="root" onRender={onRender}>
          <Component />
        </React.Profiler>,
      );
    });
    assertLog([false, true]);

    // Verify that the nested update inside of the sync work is appropriately tagged.
    expect(onRender).toHaveBeenCalledTimes(2);
    expect(onRender.mock.calls[0][1]).toBe('mount');
    expect(onRender.mock.calls[1][1]).toBe('nested-update');
  });

  describe('with regard to interruptions', () => {
    it('should accumulate actual time after a scheduling interruptions', async () => {
      const callback = jest.fn();

      const Yield = ({renderTime}) => {
        Scheduler.unstable_advanceTime(renderTime);
        Scheduler.log('Yield:' + renderTime);
        return null;
      };

      Scheduler.unstable_advanceTime(5); // 0 -> 5

      const root = ReactNoop.createRoot();
      // Render partially, but run out of time before completing.
      React.startTransition(() => {
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <Yield renderTime={2} />
            <Yield renderTime={3} />
          </React.Profiler>,
        );
      });

      await waitFor(['Yield:2']);
      expect(callback).toHaveBeenCalledTimes(0);

      // Resume render for remaining children.
      await waitForAll(['Yield:3']);

      // Verify that logged times include both durations above.
      expect(callback).toHaveBeenCalledTimes(1);
      const [call] = callback.mock.calls;
      expect(call[2]).toBe(5); // actual time
      expect(call[3]).toBe(5); // base time
      expect(call[4]).toBe(5); // start time
      expect(call[5]).toBe(10); // commit time
    });

    it('should not include time between frames', async () => {
      const callback = jest.fn();

      const Yield = ({renderTime}) => {
        Scheduler.unstable_advanceTime(renderTime);
        Scheduler.log('Yield:' + renderTime);
        return null;
      };

      Scheduler.unstable_advanceTime(5); // 0 -> 5

      const root = ReactNoop.createRoot();
      // Render partially, but don't finish.
      // This partial render should take 5ms of simulated time.
      React.startTransition(() => {
        root.render(
          <React.Profiler id="outer" onRender={callback}>
            <Yield renderTime={5} />
            <Yield renderTime={10} />
            <React.Profiler id="inner" onRender={callback}>
              <Yield renderTime={17} />
            </React.Profiler>
          </React.Profiler>,
        );
      });

      await waitFor(['Yield:5']);
      expect(callback).toHaveBeenCalledTimes(0);

      // Simulate time moving forward while frame is paused.
      Scheduler.unstable_advanceTime(50); // 10 -> 60

      // Flush the remaining work,
      // Which should take an additional 10ms of simulated time.
      await waitForAll(['Yield:10', 'Yield:17']);
      expect(callback).toHaveBeenCalledTimes(2);

      const [innerCall, outerCall] = callback.mock.calls;

      // Verify that the actual time includes all work times,
      // But not the time that elapsed between frames.
      expect(innerCall[0]).toBe('inner');
      expect(innerCall[2]).toBe(17); // actual time
      expect(innerCall[3]).toBe(17); // base time
      expect(innerCall[4]).toBe(70); // start time
      expect(innerCall[5]).toBe(87); // commit time
      expect(outerCall[0]).toBe('outer');
      expect(outerCall[2]).toBe(32); // actual time
      expect(outerCall[3]).toBe(32); // base time
      expect(outerCall[4]).toBe(5); // start time
      expect(outerCall[5]).toBe(87); // commit time
    });

    it('should report the expected times when a high-pri update replaces a mount in-progress', async () => {
      const callback = jest.fn();

      const Yield = ({renderTime}) => {
        Scheduler.unstable_advanceTime(renderTime);
        Scheduler.log('Yield:' + renderTime);
        return null;
      };

      Scheduler.unstable_advanceTime(5); // 0 -> 5

      const root = ReactNoop.createRoot();
      // Render a partially update, but don't finish.
      // This partial render should take 10ms of simulated time.
      React.startTransition(() => {
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <Yield renderTime={10} />
            <Yield renderTime={20} />
          </React.Profiler>,
        );
      });

      await waitFor(['Yield:10']);
      expect(callback).toHaveBeenCalledTimes(0);

      // Simulate time moving forward while frame is paused.
      Scheduler.unstable_advanceTime(100); // 15 -> 115

      // Interrupt with higher priority work.
      // The interrupted work simulates an additional 5ms of time.
      ReactNoop.flushSync(() => {
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <Yield renderTime={5} />
          </React.Profiler>,
        );
      });
      assertLog(['Yield:5']);

      // The initial work was thrown away in this case,
      // So the actual and base times should only include the final rendered tree times.
      expect(callback).toHaveBeenCalledTimes(1);
      const call = callback.mock.calls[0];
      expect(call[2]).toBe(5); // actual time
      expect(call[3]).toBe(5); // base time
      expect(call[4]).toBe(115); // start time
      expect(call[5]).toBe(120); // commit time

      callback.mockReset();

      // Verify no more unexpected callbacks from low priority work
      await waitForAll([]);
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('should report the expected times when a high-priority update replaces a low-priority update', async () => {
      const callback = jest.fn();

      const Yield = ({renderTime}) => {
        Scheduler.unstable_advanceTime(renderTime);
        Scheduler.log('Yield:' + renderTime);
        return null;
      };

      Scheduler.unstable_advanceTime(5); // 0 -> 5
      const root = ReactNoop.createRoot();
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <Yield renderTime={6} />
          <Yield renderTime={15} />
        </React.Profiler>,
      );

      // Render everything initially.
      // This should take 21 seconds of actual and base time.
      await waitForAll(['Yield:6', 'Yield:15']);
      expect(callback).toHaveBeenCalledTimes(1);
      let call = callback.mock.calls[0];
      expect(call[2]).toBe(21); // actual time
      expect(call[3]).toBe(21); // base time
      expect(call[4]).toBe(5); // start time
      expect(call[5]).toBe(26); // commit time

      callback.mockReset();

      Scheduler.unstable_advanceTime(30); // 26 -> 56

      // Render a partially update, but don't finish.
      // This partial render should take 3ms of simulated time.
      React.startTransition(() => {
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <Yield renderTime={3} />
            <Yield renderTime={5} />
            <Yield renderTime={9} />
          </React.Profiler>,
        );
      });

      await waitFor(['Yield:3']);
      expect(callback).toHaveBeenCalledTimes(0);

      // Simulate time moving forward while frame is paused.
      Scheduler.unstable_advanceTime(100); // 59 -> 159

      // Render another 5ms of simulated time.
      await waitFor(['Yield:5']);
      expect(callback).toHaveBeenCalledTimes(0);

      // Simulate time moving forward while frame is paused.
      Scheduler.unstable_advanceTime(100); // 164 -> 264

      // Interrupt with higher priority work.
      // The interrupted work simulates an additional 11ms of time.
      ReactNoop.flushSync(() => {
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <Yield renderTime={11} />
          </React.Profiler>,
        );
      });
      assertLog(['Yield:11']);

      // The actual time should include only the most recent render,
      // Because this lets us avoid a lot of commit phase reset complexity.
      // The base time includes only the final rendered tree times.
      expect(callback).toHaveBeenCalledTimes(1);
      call = callback.mock.calls[0];
      expect(call[2]).toBe(11); // actual time
      expect(call[3]).toBe(11); // base time
      expect(call[4]).toBe(264); // start time
      expect(call[5]).toBe(275); // commit time

      // Verify no more unexpected callbacks from low priority work
      await waitForAll([]);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should report the expected times when a high-priority update interrupts a low-priority update', async () => {
      const callback = jest.fn();

      const Yield = ({renderTime}) => {
        Scheduler.unstable_advanceTime(renderTime);
        Scheduler.log('Yield:' + renderTime);
        return null;
      };

      let first;
      class FirstComponent extends React.Component {
        state = {renderTime: 1};
        render() {
          first = this;
          Scheduler.unstable_advanceTime(this.state.renderTime);
          Scheduler.log('FirstComponent:' + this.state.renderTime);
          return <Yield renderTime={4} />;
        }
      }
      let second;
      class SecondComponent extends React.Component {
        state = {renderTime: 2};
        render() {
          second = this;
          Scheduler.unstable_advanceTime(this.state.renderTime);
          Scheduler.log('SecondComponent:' + this.state.renderTime);
          return <Yield renderTime={7} />;
        }
      }

      Scheduler.unstable_advanceTime(5); // 0 -> 5

      const root = ReactNoop.createRoot();
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <FirstComponent />
          <SecondComponent />
        </React.Profiler>,
      );

      // Render everything initially.
      // This simulates a total of 14ms of actual render time.
      // The base render time is also 14ms for the initial render.
      await waitForAll([
        'FirstComponent:1',
        'Yield:4',
        'SecondComponent:2',
        'Yield:7',
      ]);
      expect(callback).toHaveBeenCalledTimes(1);
      let call = callback.mock.calls[0];
      expect(call[2]).toBe(14); // actual time
      expect(call[3]).toBe(14); // base time
      expect(call[4]).toBe(5); // start time
      expect(call[5]).toBe(19); // commit time

      callback.mockClear();

      Scheduler.unstable_advanceTime(100); // 19 -> 119

      // Render a partially update, but don't finish.
      // This partial render will take 10ms of actual render time.
      React.startTransition(() => {
        first.setState({renderTime: 10});
      });

      await waitFor(['FirstComponent:10']);
      expect(callback).toHaveBeenCalledTimes(0);

      // Simulate time moving forward while frame is paused.
      Scheduler.unstable_advanceTime(100); // 129 -> 229

      // Interrupt with higher priority work.
      // This simulates a total of 37ms of actual render time.
      ReactNoop.flushSync(() => second.setState({renderTime: 30}));
      assertLog(['SecondComponent:30', 'Yield:7']);

      // The actual time should include only the most recent render (37ms),
      // Because this greatly simplifies the commit phase logic.
      // The base time should include the more recent times for the SecondComponent subtree,
      // As well as the original times for the FirstComponent subtree.
      expect(callback).toHaveBeenCalledTimes(1);
      call = callback.mock.calls[0];
      expect(call[2]).toBe(37); // actual time
      expect(call[3]).toBe(42); // base time
      expect(call[4]).toBe(229); // start time
      expect(call[5]).toBe(266); // commit time

      callback.mockClear();

      // Simulate time moving forward while frame is paused.
      Scheduler.unstable_advanceTime(100); // 266 -> 366

      // Resume the original low priority update, with rebased state.
      // This simulates a total of 14ms of actual render time,
      // And does not include the original (interrupted) 10ms.
      // The tree contains 42ms of base render time at this point,
      // Reflecting the most recent (longer) render durations.
      // TODO: This actual time should decrease by 10ms once the scheduler supports resuming.
      await waitForAll(['FirstComponent:10', 'Yield:4']);
      expect(callback).toHaveBeenCalledTimes(1);
      call = callback.mock.calls[0];
      expect(call[2]).toBe(14); // actual time
      expect(call[3]).toBe(51); // base time
      expect(call[4]).toBe(366); // start time
      expect(call[5]).toBe(380); // commit time
    });

    it('should accumulate actual time after an error handled by componentDidCatch()', async () => {
      const callback = jest.fn();

      const ThrowsError = ({unused}) => {
        Scheduler.unstable_advanceTime(3);
        throw Error('expected error');
      };

      class ErrorBoundary extends React.Component {
        state = {error: null};
        componentDidCatch(error) {
          this.setState({error});
        }
        render() {
          Scheduler.unstable_advanceTime(2);
          return this.state.error === null ? (
            this.props.children
          ) : (
            <AdvanceTime byAmount={20} />
          );
        }
      }

      Scheduler.unstable_advanceTime(5); // 0 -> 5

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <ErrorBoundary>
              <AdvanceTime byAmount={9} />
              <ThrowsError />
            </ErrorBoundary>
          </React.Profiler>,
        );
      });

      expect(callback).toHaveBeenCalledTimes(2);

      // Callbacks bubble (reverse order).
      const [mountCall, updateCall] = callback.mock.calls;

      // The initial mount only includes the ErrorBoundary (which takes 2)
      // But it spends time rendering all of the failed subtree also.
      expect(mountCall[1]).toBe('mount');
      // actual time includes: 2 (ErrorBoundary) + 9 (AdvanceTime) + 3 (ThrowsError)
      // We don't count the time spent in replaying the failed unit of work (ThrowsError)
      expect(mountCall[2]).toBe(14);
      // base time includes: 2 (ErrorBoundary)
      // Since the tree is empty for the initial commit
      expect(mountCall[3]).toBe(2);

      // start time: 5 initially + 14 of work
      // Add an additional 3 (ThrowsError) if we replayed the failed work
      expect(mountCall[4]).toBe(19);
      // commit time: 19 initially + 14 of work
      // Add an additional 6 (ThrowsError *2) if we replayed the failed work
      expect(mountCall[5]).toBe(33);

      // The update includes the ErrorBoundary and its fallback child
      expect(updateCall[1]).toBe('nested-update');
      // actual time includes: 2 (ErrorBoundary) + 20 (AdvanceTime)
      expect(updateCall[2]).toBe(22);
      // base time includes: 2 (ErrorBoundary) + 20 (AdvanceTime)
      expect(updateCall[3]).toBe(22);
      // start time
      expect(updateCall[4]).toBe(33);
      // commit time: 19 (startTime) + 2 (ErrorBoundary) + 20 (AdvanceTime)
      // Add an additional 3 (ThrowsError) if we replayed the failed work
      expect(updateCall[5]).toBe(55);
    });

    it('should accumulate actual time after an error handled by getDerivedStateFromError()', async () => {
      const callback = jest.fn();

      const ThrowsError = ({unused}) => {
        Scheduler.unstable_advanceTime(10);
        throw Error('expected error');
      };

      class ErrorBoundary extends React.Component {
        state = {error: null};
        static getDerivedStateFromError(error) {
          return {error};
        }
        render() {
          Scheduler.unstable_advanceTime(2);
          return this.state.error === null ? (
            this.props.children
          ) : (
            <AdvanceTime byAmount={20} />
          );
        }
      }

      Scheduler.unstable_advanceTime(5); // 0 -> 5

      await act(() => {
        const root = ReactNoop.createRoot();
        root.render(
          <React.Profiler id="test" onRender={callback}>
            <ErrorBoundary>
              <AdvanceTime byAmount={5} />
              <ThrowsError />
            </ErrorBoundary>
          </React.Profiler>,
        );
      });

      expect(callback).toHaveBeenCalledTimes(1);

      // Callbacks bubble (reverse order).
      const [mountCall] = callback.mock.calls;

      // The initial mount includes the ErrorBoundary's error state,
      // But it also spends actual time rendering UI that fails and isn't included.
      expect(mountCall[1]).toBe('mount');
      // actual time includes: 2 (ErrorBoundary) + 5 (AdvanceTime) + 10 (ThrowsError)
      // Then the re-render: 2 (ErrorBoundary) + 20 (AdvanceTime)
      // We don't count the time spent in replaying the failed unit of work (ThrowsError)
      expect(mountCall[2]).toBe(39);
      // base time includes: 2 (ErrorBoundary) + 20 (AdvanceTime)
      expect(mountCall[3]).toBe(22);
      // start time
      expect(mountCall[4]).toBe(44);
      // commit time
      expect(mountCall[5]).toBe(83);
    });

    it('should reset the fiber stack correct after a "complete" phase error', async () => {
      jest.resetModules();

      loadModules({
        useNoopRenderer: true,
      });

      // Simulate a renderer error during the "complete" phase.
      // This mimics behavior like React Native's View/Text nesting validation.
      ReactNoop.render(
        <React.Profiler id="profiler" onRender={jest.fn()}>
          <errorInCompletePhase>hi</errorInCompletePhase>
        </React.Profiler>,
      );
      await waitForThrow('Error in host config.');

      // A similar case we've seen caused by an invariant in ReactDOM.
      // It didn't reproduce without a host component inside.
      ReactNoop.render(
        <React.Profiler id="profiler" onRender={jest.fn()}>
          <errorInCompletePhase>
            <span>hi</span>
          </errorInCompletePhase>
        </React.Profiler>,
      );
      await waitForThrow('Error in host config.');

      // So long as the profiler timer's fiber stack is reset correctly,
      // Subsequent renders should not error.
      ReactNoop.render(
        <React.Profiler id="profiler" onRender={jest.fn()}>
          <span>hi</span>
        </React.Profiler>,
      );
      await waitForAll([]);
    });
  });

  it('reflects the most recently rendered id value', async () => {
    const callback = jest.fn();

    Scheduler.unstable_advanceTime(5); // 0 -> 5

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="one" onRender={callback}>
          <AdvanceTime byAmount={2} />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    Scheduler.unstable_advanceTime(20); // 7 -> 27

    await act(() => {
      root.render(
        <React.Profiler id="two" onRender={callback}>
          <AdvanceTime byAmount={1} />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    const [mountCall, updateCall] = callback.mock.calls;

    expect(mountCall[0]).toBe('one');
    expect(mountCall[1]).toBe('mount');
    expect(mountCall[2]).toBe(2); // actual time
    expect(mountCall[3]).toBe(2); // base time
    expect(mountCall[4]).toBe(5); // start time

    expect(updateCall[0]).toBe('two');
    expect(updateCall[1]).toBe('update');
    expect(updateCall[2]).toBe(1); // actual time
    expect(updateCall[3]).toBe(1); // base time
    expect(updateCall[4]).toBe(27); // start time
  });

  it('should not be called until after mutations', async () => {
    let classComponentMounted = false;
    const callback = jest.fn(
      (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
        // Don't call this hook until after mutations
        expect(classComponentMounted).toBe(true);
        // But the commit time should reflect pre-mutation
        expect(commitTime).toBe(2);
      },
    );

    class ClassComponent extends React.Component {
      componentDidMount() {
        Scheduler.unstable_advanceTime(5);
        classComponentMounted = true;
      }
      render() {
        Scheduler.unstable_advanceTime(2);
        return null;
      }
    }
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="test" onRender={callback}>
          <ClassComponent />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe(`onCommit`, () => {
  beforeEach(() => {
    jest.resetModules();

    loadModules();
  });

  it('should report time spent in layout effects and commit lifecycles', async () => {
    const callback = jest.fn();

    const ComponentWithEffects = () => {
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(10);
        return () => {
          Scheduler.unstable_advanceTime(100);
        };
      }, []);
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(1000);
        return () => {
          Scheduler.unstable_advanceTime(10000);
        };
      });
      React.useEffect(() => {
        // This passive effect is here to verify that its time isn't reported.
        Scheduler.unstable_advanceTime(5);
        return () => {
          Scheduler.unstable_advanceTime(7);
        };
      });
      return null;
    };

    class ComponentWithCommitHooks extends React.Component {
      componentDidMount() {
        Scheduler.unstable_advanceTime(100000);
      }
      componentDidUpdate() {
        Scheduler.unstable_advanceTime(1000000);
      }
      render() {
        return null;
      }
    }

    Scheduler.unstable_advanceTime(1);
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="mount-test" onCommit={callback}>
          <ComponentWithEffects />
          <ComponentWithCommitHooks />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('mount-test');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(101010); // durations
    expect(call[3]).toBe(1); // commit start time (before mutations or effects)

    Scheduler.unstable_advanceTime(1);

    await act(() => {
      root.render(
        <React.Profiler id="update-test" onCommit={callback}>
          <ComponentWithEffects />
          <ComponentWithCommitHooks />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    call = callback.mock.calls[1];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('update-test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(1011000); // durations
    expect(call[3]).toBe(101017); // commit start time (before mutations or effects)

    Scheduler.unstable_advanceTime(1);

    await act(() => {
      root.render(<React.Profiler id="unmount-test" onCommit={callback} />);
    });

    expect(callback).toHaveBeenCalledTimes(3);

    call = callback.mock.calls[2];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('unmount-test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(10100); // durations
    expect(call[3]).toBe(1112030); // commit start time (before mutations or effects)
  });

  it('should report time spent in layout effects and commit lifecycles with cascading renders', async () => {
    const callback = jest.fn();

    const ComponentWithEffects = ({shouldCascade}) => {
      const [didCascade, setDidCascade] = React.useState(false);
      Scheduler.unstable_advanceTime(100000000);
      React.useLayoutEffect(() => {
        if (shouldCascade && !didCascade) {
          setDidCascade(true);
        }
        Scheduler.unstable_advanceTime(didCascade ? 30 : 10);
        return () => {
          Scheduler.unstable_advanceTime(100);
        };
      }, [didCascade, shouldCascade]);
      return null;
    };

    class ComponentWithCommitHooks extends React.Component {
      state = {
        didCascade: false,
      };
      componentDidMount() {
        Scheduler.unstable_advanceTime(1000);
      }
      componentDidUpdate() {
        Scheduler.unstable_advanceTime(10000);
        if (this.props.shouldCascade && !this.state.didCascade) {
          this.setState({didCascade: true});
        }
      }
      render() {
        Scheduler.unstable_advanceTime(1000000000);
        return null;
      }
    }

    Scheduler.unstable_advanceTime(1);
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="mount-test" onCommit={callback}>
          <ComponentWithEffects shouldCascade={true} />
          <ComponentWithCommitHooks />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('mount-test');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(1010); // durations
    expect(call[3]).toBe(1100000001); // commit start time (before mutations or effects)

    call = callback.mock.calls[1];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('mount-test');
    expect(call[1]).toBe('nested-update');
    expect(call[2]).toBe(130); // durations
    expect(call[3]).toBe(1200001011); // commit start time (before mutations or effects)

    Scheduler.unstable_advanceTime(1);

    await act(() => {
      root.render(
        <React.Profiler id="update-test" onCommit={callback}>
          <ComponentWithEffects />
          <ComponentWithCommitHooks shouldCascade={true} />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(4);

    call = callback.mock.calls[2];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('update-test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(10130); // durations
    expect(call[3]).toBe(2300001142); // commit start time (before mutations or effects)

    call = callback.mock.calls[3];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('update-test');
    expect(call[1]).toBe('nested-update');
    expect(call[2]).toBe(10000); // durations
    expect(call[3]).toBe(3300011272); // commit start time (before mutations or effects)
  });

  it('should include time spent in ref callbacks', async () => {
    const callback = jest.fn();

    const refSetter = ref => {
      if (ref !== null) {
        Scheduler.unstable_advanceTime(10);
      } else {
        Scheduler.unstable_advanceTime(100);
      }
    };

    class ClassComponent extends React.Component {
      render() {
        return null;
      }
    }

    const Component = () => {
      Scheduler.unstable_advanceTime(1000);
      return <ClassComponent ref={refSetter} />;
    };

    Scheduler.unstable_advanceTime(1);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root" onCommit={callback}>
          <Component />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(10); // durations
    expect(call[3]).toBe(1001); // commit start time (before mutations or effects)

    callback.mockClear();

    await act(() => {
      root.render(<React.Profiler id="root" onCommit={callback} />);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(100); // durations
    expect(call[3]).toBe(1011); // commit start time (before mutations or effects)
  });

  it('should bubble time spent in layout effects to higher profilers', async () => {
    const callback = jest.fn();

    const ComponentWithEffects = ({cleanupDuration, duration, setCountRef}) => {
      const setCount = React.useState(0)[1];
      if (setCountRef != null) {
        setCountRef.current = setCount;
      }
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(duration);
        return () => {
          Scheduler.unstable_advanceTime(cleanupDuration);
        };
      });
      Scheduler.unstable_advanceTime(1);
      return null;
    };

    const setCountRef = React.createRef(null);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root-mount" onCommit={callback}>
          <React.Profiler id="a">
            <ComponentWithEffects
              duration={10}
              cleanupDuration={100}
              setCountRef={setCountRef}
            />
          </React.Profiler>
          <React.Profiler id="b">
            <ComponentWithEffects duration={1000} cleanupDuration={10000} />
          </React.Profiler>
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root-mount');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(1010); // durations
    expect(call[3]).toBe(2); // commit start time (before mutations or effects)

    await act(() => setCountRef.current(count => count + 1));

    expect(callback).toHaveBeenCalledTimes(2);

    call = callback.mock.calls[1];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root-mount');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(110); // durations
    expect(call[3]).toBe(1013); // commit start time (before mutations or effects)

    await act(() => {
      root.render(
        <React.Profiler id="root-update" onCommit={callback}>
          <React.Profiler id="b">
            <ComponentWithEffects duration={1000} cleanupDuration={10000} />
          </React.Profiler>
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(3);

    call = callback.mock.calls[2];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root-update');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(11100); // durations
    expect(call[3]).toBe(1124); // commit start time (before mutations or effects)
  });

  it('should properly report time in layout effects even when there are errors', async () => {
    const callback = jest.fn();

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error === null
          ? this.props.children
          : this.props.fallback;
      }
    }

    const ComponentWithEffects = ({
      cleanupDuration,
      duration,
      effectDuration,
      shouldThrow,
    }) => {
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(effectDuration);
        if (shouldThrow) {
          throw Error('expected');
        }
        return () => {
          Scheduler.unstable_advanceTime(cleanupDuration);
        };
      });
      Scheduler.unstable_advanceTime(duration);
      return null;
    };

    Scheduler.unstable_advanceTime(1);

    // Test an error that happens during an effect

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root" onCommit={callback}>
          <ErrorBoundary
            fallback={
              <ComponentWithEffects
                duration={10000000}
                effectDuration={100000000}
                cleanupDuration={1000000000}
              />
            }>
            <ComponentWithEffects
              duration={10}
              effectDuration={100}
              cleanupDuration={1000}
              shouldThrow={true}
            />
          </ErrorBoundary>
          <ComponentWithEffects
            duration={10000}
            effectDuration={100000}
            cleanupDuration={1000000}
          />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    let call = callback.mock.calls[0];

    // Initial render (with error)
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(100100); // durations
    expect(call[3]).toBe(10011); // commit start time (before mutations or effects)

    call = callback.mock.calls[1];

    // Cleanup render from error boundary
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('nested-update');
    expect(call[2]).toBe(100000000); // durations
    expect(call[3]).toBe(10110111); // commit start time (before mutations or effects)
  });

  it('should properly report time in layout effect cleanup functions even when there are errors', async () => {
    const callback = jest.fn();

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error === null
          ? this.props.children
          : this.props.fallback;
      }
    }

    const ComponentWithEffects = ({
      cleanupDuration,
      duration,
      effectDuration,
      shouldThrow = false,
    }) => {
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(effectDuration);
        return () => {
          Scheduler.unstable_advanceTime(cleanupDuration);
          if (shouldThrow) {
            throw Error('expected');
          }
        };
      });
      Scheduler.unstable_advanceTime(duration);
      return null;
    };

    Scheduler.unstable_advanceTime(1);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root" onCommit={callback}>
          <ErrorBoundary
            fallback={
              <ComponentWithEffects
                duration={10000000}
                effectDuration={100000000}
                cleanupDuration={1000000000}
              />
            }>
            <ComponentWithEffects
              duration={10}
              effectDuration={100}
              cleanupDuration={1000}
              shouldThrow={true}
            />
          </ErrorBoundary>
          <ComponentWithEffects
            duration={10000}
            effectDuration={100000}
            cleanupDuration={1000000}
          />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    // Initial render
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(100100); // durations
    expect(call[3]).toBe(10011); // commit start time (before mutations or effects)

    callback.mockClear();

    // Test an error that happens during an cleanup function

    await act(() => {
      root.render(
        <React.Profiler id="root" onCommit={callback}>
          <ErrorBoundary
            fallback={
              <ComponentWithEffects
                duration={10000000}
                effectDuration={100000000}
                cleanupDuration={1000000000}
              />
            }>
            <ComponentWithEffects
              duration={10}
              effectDuration={100}
              cleanupDuration={1000}
              shouldThrow={false}
            />
          </ErrorBoundary>
          <ComponentWithEffects
            duration={10000}
            effectDuration={100000}
            cleanupDuration={1000000}
          />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    call = callback.mock.calls[0];

    // Update (that throws)
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(1101100); // durations
    expect(call[3]).toBe(120121); // commit start time (before mutations or effects)

    call = callback.mock.calls[1];

    // Cleanup render from error boundary
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('nested-update');
    expect(call[2]).toBe(100001000); // durations
    expect(call[3]).toBe(11221221); // commit start time (before mutations or effects)
  });
});

describe(`onPostCommit`, () => {
  beforeEach(() => {
    jest.resetModules();

    loadModules();
  });

  it('should report time spent in passive effects', async () => {
    const callback = jest.fn();

    const ComponentWithEffects = () => {
      React.useLayoutEffect(() => {
        // This layout effect is here to verify that its time isn't reported.
        Scheduler.unstable_advanceTime(5);
        return () => {
          Scheduler.unstable_advanceTime(7);
        };
      });
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(10);
        return () => {
          Scheduler.unstable_advanceTime(100);
        };
      }, []);
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(1000);
        return () => {
          Scheduler.unstable_advanceTime(10000);
        };
      });
      return null;
    };

    Scheduler.unstable_advanceTime(1);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="mount-test" onPostCommit={callback}>
          <ComponentWithEffects />
        </React.Profiler>,
      );
    });
    await waitForAll([]);

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('mount-test');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(1010); // durations
    expect(call[3]).toBe(1); // commit start time (before mutations or effects)

    Scheduler.unstable_advanceTime(1);

    await act(() => {
      root.render(
        <React.Profiler id="update-test" onPostCommit={callback}>
          <ComponentWithEffects />
        </React.Profiler>,
      );
    });
    await waitForAll([]);

    expect(callback).toHaveBeenCalledTimes(2);

    call = callback.mock.calls[1];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('update-test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(11000); // durations
    expect(call[3]).toBe(1017); // commit start time (before mutations or effects)

    Scheduler.unstable_advanceTime(1);

    await act(() => {
      root.render(<React.Profiler id="unmount-test" onPostCommit={callback} />);
    });
    await waitForAll([]);

    expect(callback).toHaveBeenCalledTimes(3);

    call = callback.mock.calls[2];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('unmount-test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(10100); // durations
    expect(call[3]).toBe(12030); // commit start time (before mutations or effects)
  });

  it('should report time spent in passive effects with cascading renders', async () => {
    const callback = jest.fn();

    const ComponentWithEffects = () => {
      const [didMount, setDidMount] = React.useState(false);
      Scheduler.unstable_advanceTime(1000);
      React.useEffect(() => {
        if (!didMount) {
          setDidMount(true);
        }
        Scheduler.unstable_advanceTime(didMount ? 30 : 10);
        return () => {
          Scheduler.unstable_advanceTime(100);
        };
      }, [didMount]);
      return null;
    };

    Scheduler.unstable_advanceTime(1);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="mount-test" onPostCommit={callback}>
          <ComponentWithEffects />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('mount-test');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(10); // durations
    expect(call[3]).toBe(1001); // commit start time (before mutations or effects)

    call = callback.mock.calls[1];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('mount-test');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(130); // durations
    expect(call[3]).toBe(2011); // commit start time (before mutations or effects)
  });

  it('should bubble time spent in effects to higher profilers', async () => {
    const callback = jest.fn();

    const ComponentWithEffects = ({cleanupDuration, duration, setCountRef}) => {
      const setCount = React.useState(0)[1];
      if (setCountRef != null) {
        setCountRef.current = setCount;
      }
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(duration);
        return () => {
          Scheduler.unstable_advanceTime(cleanupDuration);
        };
      });
      Scheduler.unstable_advanceTime(1);
      return null;
    };

    const setCountRef = React.createRef(null);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root-mount" onPostCommit={callback}>
          <React.Profiler id="a">
            <ComponentWithEffects
              duration={10}
              cleanupDuration={100}
              setCountRef={setCountRef}
            />
          </React.Profiler>
          <React.Profiler id="b">
            <ComponentWithEffects duration={1000} cleanupDuration={10000} />
          </React.Profiler>
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root-mount');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(1010); // durations
    expect(call[3]).toBe(2); // commit start time (before mutations or effects)

    await act(() => setCountRef.current(count => count + 1));

    expect(callback).toHaveBeenCalledTimes(2);

    call = callback.mock.calls[1];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root-mount');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(110); // durations
    expect(call[3]).toBe(1013); // commit start time (before mutations or effects)

    await act(() => {
      root.render(
        <React.Profiler id="root-update" onPostCommit={callback}>
          <React.Profiler id="b">
            <ComponentWithEffects duration={1000} cleanupDuration={10000} />
          </React.Profiler>
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(3);

    call = callback.mock.calls[2];

    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root-update');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(11100); // durations
    expect(call[3]).toBe(1124); // commit start time (before mutations or effects)
  });

  it('should properly report time in passive effects even when there are errors', async () => {
    const callback = jest.fn();

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error === null
          ? this.props.children
          : this.props.fallback;
      }
    }

    const ComponentWithEffects = ({
      cleanupDuration,
      duration,
      effectDuration,
      shouldThrow,
    }) => {
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(effectDuration);
        if (shouldThrow) {
          throw Error('expected');
        }
        return () => {
          Scheduler.unstable_advanceTime(cleanupDuration);
        };
      });
      Scheduler.unstable_advanceTime(duration);
      return null;
    };

    Scheduler.unstable_advanceTime(1);

    // Test an error that happens during an effect
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root" onPostCommit={callback}>
          <ErrorBoundary
            fallback={
              <ComponentWithEffects
                duration={10000000}
                effectDuration={100000000}
                cleanupDuration={1000000000}
              />
            }>
            <ComponentWithEffects
              duration={10}
              effectDuration={100}
              cleanupDuration={1000}
              shouldThrow={true}
            />
          </ErrorBoundary>
          <ComponentWithEffects
            duration={10000}
            effectDuration={100000}
            cleanupDuration={1000000}
          />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    let call = callback.mock.calls[0];

    // Initial render (with error)
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(100100); // durations
    expect(call[3]).toBe(10011); // commit start time (before mutations or effects)

    call = callback.mock.calls[1];

    // Cleanup render from error boundary
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(100000000); // durations
    expect(call[3]).toBe(10110111); // commit start time (before mutations or effects)
  });

  it('should properly report time in passive effect cleanup functions even when there are errors', async () => {
    const callback = jest.fn();

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error === null
          ? this.props.children
          : this.props.fallback;
      }
    }

    const ComponentWithEffects = ({
      cleanupDuration,
      duration,
      effectDuration,
      shouldThrow = false,
      id,
    }) => {
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(effectDuration);
        return () => {
          Scheduler.unstable_advanceTime(cleanupDuration);
          if (shouldThrow) {
            throw Error('expected');
          }
        };
      });
      Scheduler.unstable_advanceTime(duration);
      return null;
    };

    Scheduler.unstable_advanceTime(1);

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <React.Profiler id="root" onPostCommit={callback}>
          <ErrorBoundary
            fallback={
              <ComponentWithEffects
                duration={10000000}
                effectDuration={100000000}
                cleanupDuration={1000000000}
              />
            }>
            <ComponentWithEffects
              duration={10}
              effectDuration={100}
              cleanupDuration={1000}
              shouldThrow={true}
            />
          </ErrorBoundary>
          <ComponentWithEffects
            duration={10000}
            effectDuration={100000}
            cleanupDuration={1000000}
          />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);

    let call = callback.mock.calls[0];

    // Initial render
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('mount');
    expect(call[2]).toBe(100100); // durations
    expect(call[3]).toBe(10011); // commit start time (before mutations or effects)

    callback.mockClear();

    // Test an error that happens during an cleanup function

    await act(() => {
      root.render(
        <React.Profiler id="root" onPostCommit={callback}>
          <ErrorBoundary
            fallback={
              <ComponentWithEffects
                duration={10000000}
                effectDuration={100000000}
                cleanupDuration={1000000000}
              />
            }>
            <ComponentWithEffects
              duration={10}
              effectDuration={100}
              cleanupDuration={1000}
              shouldThrow={false}
            />
          </ErrorBoundary>
          <ComponentWithEffects
            duration={10000}
            effectDuration={100000}
            cleanupDuration={1000000}
          />
        </React.Profiler>,
      );
    });

    expect(callback).toHaveBeenCalledTimes(2);

    call = callback.mock.calls[0];

    // Update (that throws)
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('update');
    // We continue flushing pending effects even if one throws.
    expect(call[2]).toBe(1101100); // durations
    expect(call[3]).toBe(120121); // commit start time (before mutations or effects)

    call = callback.mock.calls[1];

    // Cleanup render from error boundary
    expect(call).toHaveLength(4);
    expect(call[0]).toBe('root');
    expect(call[1]).toBe('update');
    expect(call[2]).toBe(100001000); // durations
    // The commit time varies because the above duration time varies
    expect(call[3]).toBe(11221221); // commit start time (before mutations or effects)
  });
});
