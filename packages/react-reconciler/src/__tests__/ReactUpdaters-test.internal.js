/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactFeatureFlags;
let ReactDOM;
let ReactDOMClient;
let Scheduler;
let mockDevToolsHook;
let allSchedulerTags;
let allSchedulerTypes;
let onCommitRootShouldYield;
let act;
let waitFor;
let waitForAll;
let assertLog;

describe('updaters', () => {
  beforeEach(() => {
    jest.resetModules();

    allSchedulerTags = [];
    allSchedulerTypes = [];

    onCommitRootShouldYield = true;

    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableUpdaterTracking = true;

    mockDevToolsHook = {
      injectInternals: jest.fn(() => {}),
      isDevToolsPresent: true,
      onCommitRoot: jest.fn(fiberRoot => {
        if (onCommitRootShouldYield) {
          Scheduler.log('onCommitRoot');
        }
        const schedulerTags = [];
        const schedulerTypes = [];
        fiberRoot.memoizedUpdaters.forEach(fiber => {
          schedulerTags.push(fiber.tag);
          schedulerTypes.push(fiber.elementType);
        });
        allSchedulerTags.push(schedulerTags);
        allSchedulerTypes.push(schedulerTypes);
      }),
      onCommitUnmount: jest.fn(() => {}),
      onPostCommitRoot: jest.fn(() => {}),
      onScheduleRoot: jest.fn(() => {}),

      // Profiling APIs
      markCommitStarted: jest.fn(() => {}),
      markCommitStopped: jest.fn(() => {}),
      markComponentRenderStarted: jest.fn(() => {}),
      markComponentRenderStopped: jest.fn(() => {}),
      markComponentPassiveEffectMountStarted: jest.fn(() => {}),
      markComponentPassiveEffectMountStopped: jest.fn(() => {}),
      markComponentPassiveEffectUnmountStarted: jest.fn(() => {}),
      markComponentPassiveEffectUnmountStopped: jest.fn(() => {}),
      markComponentLayoutEffectMountStarted: jest.fn(() => {}),
      markComponentLayoutEffectMountStopped: jest.fn(() => {}),
      markComponentLayoutEffectUnmountStarted: jest.fn(() => {}),
      markComponentLayoutEffectUnmountStopped: jest.fn(() => {}),
      markComponentErrored: jest.fn(() => {}),
      markComponentSuspended: jest.fn(() => {}),
      markLayoutEffectsStarted: jest.fn(() => {}),
      markLayoutEffectsStopped: jest.fn(() => {}),
      markPassiveEffectsStarted: jest.fn(() => {}),
      markPassiveEffectsStopped: jest.fn(() => {}),
      markRenderStarted: jest.fn(() => {}),
      markRenderYielded: jest.fn(() => {}),
      markRenderStopped: jest.fn(() => {}),
      markRenderScheduled: jest.fn(() => {}),
      markForceUpdateScheduled: jest.fn(() => {}),
      markStateUpdateScheduled: jest.fn(() => {}),
    };

    jest.mock(
      'react-reconciler/src/ReactFiberDevToolsHook',
      () => mockDevToolsHook,
    );

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');

    act = require('internal-test-utils').act;

    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
  });

  it('should report the (host) root as the scheduler for root-level render', async () => {
    const {HostRoot} = require('react-reconciler/src/ReactWorkTags');

    const Parent = () => <Child />;
    const Child = () => null;
    const root = ReactDOMClient.createRoot(document.createElement('div'));

    await act(() => {
      root.render(<Parent />);
    });
    expect(allSchedulerTags).toEqual([[HostRoot]]);
    assertLog(['onCommitRoot']);

    await act(() => {
      root.render(<Parent />);
    });
    expect(allSchedulerTags).toEqual([[HostRoot], [HostRoot]]);
    assertLog(['onCommitRoot']);
  });

  it('should report a function component as the scheduler for a hooks update', async () => {
    let scheduleForA = null;
    let scheduleForB = null;

    const Parent = () => (
      <React.Fragment>
        <SchedulingComponentA />
        <SchedulingComponentB />
      </React.Fragment>
    );
    const SchedulingComponentA = () => {
      const [count, setCount] = React.useState(0);
      scheduleForA = () => setCount(prevCount => prevCount + 1);
      return <Child count={count} />;
    };
    const SchedulingComponentB = () => {
      const [count, setCount] = React.useState(0);
      scheduleForB = () => setCount(prevCount => prevCount + 1);
      return <Child count={count} />;
    };
    const Child = () => null;

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Parent />);
    });
    expect(scheduleForA).not.toBeNull();
    expect(scheduleForB).not.toBeNull();
    expect(allSchedulerTypes).toEqual([[null]]);
    assertLog(['onCommitRoot']);

    await act(() => {
      scheduleForA();
    });
    expect(allSchedulerTypes).toEqual([[null], [SchedulingComponentA]]);
    assertLog(['onCommitRoot']);
    await act(() => {
      scheduleForB();
    });
    expect(allSchedulerTypes).toEqual([
      [null],
      [SchedulingComponentA],
      [SchedulingComponentB],
    ]);
    assertLog(['onCommitRoot']);
  });

  it('should report a class component as the scheduler for a setState update', async () => {
    const Parent = () => <SchedulingComponent />;
    class SchedulingComponent extends React.Component {
      state = {};
      render() {
        instance = this;
        return <Child />;
      }
    }
    const Child = () => null;
    let instance;
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Parent />);
    });
    expect(allSchedulerTypes).toEqual([[null]]);
    assertLog(['onCommitRoot']);
    expect(instance).not.toBeNull();
    await act(() => {
      instance.setState({});
    });
    expect(allSchedulerTypes).toEqual([[null], [SchedulingComponent]]);
  });

  it('should cover cascading updates', async () => {
    let triggerActiveCascade = null;
    let triggerPassiveCascade = null;

    const Parent = () => <SchedulingComponent />;
    const SchedulingComponent = () => {
      const [cascade, setCascade] = React.useState(null);
      triggerActiveCascade = () => setCascade('active');
      triggerPassiveCascade = () => setCascade('passive');
      return <CascadingChild cascade={cascade} />;
    };
    const CascadingChild = ({cascade}) => {
      const [count, setCount] = React.useState(0);
      Scheduler.log(`CascadingChild ${count}`);
      React.useLayoutEffect(() => {
        if (cascade === 'active') {
          setCount(prevCount => prevCount + 1);
        }
        return () => {};
      }, [cascade]);
      React.useEffect(() => {
        if (cascade === 'passive') {
          setCount(prevCount => prevCount + 1);
        }
        return () => {};
      }, [cascade]);
      return count;
    };

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(async () => {
      root.render(<Parent />);
      await waitFor(['CascadingChild 0', 'onCommitRoot']);
    });
    expect(triggerActiveCascade).not.toBeNull();
    expect(triggerPassiveCascade).not.toBeNull();
    expect(allSchedulerTypes).toEqual([[null]]);

    await act(async () => {
      triggerActiveCascade();
      await waitFor([
        'CascadingChild 0',
        'onCommitRoot',
        'CascadingChild 1',
        'onCommitRoot',
      ]);
    });
    expect(allSchedulerTypes).toEqual([
      [null],
      [SchedulingComponent],
      [CascadingChild],
    ]);

    await act(async () => {
      triggerPassiveCascade();
      await waitFor([
        'CascadingChild 1',
        'onCommitRoot',
        'CascadingChild 2',
        'onCommitRoot',
      ]);
    });
    expect(allSchedulerTypes).toEqual([
      [null],
      [SchedulingComponent],
      [CascadingChild],
      [SchedulingComponent],
      [CascadingChild],
    ]);

    // Verify no outstanding flushes
    await waitForAll([]);
  });

  // This test should be convertable to createRoot but the allScheduledTypes assertions are no longer the same
  // So I'm leaving it in legacy mode for now and just disabling if legacy mode is turned off
  // @gate !disableLegacyMode
  it('should cover suspense pings', async () => {
    let data = null;
    let resolver = null;
    let promise = null;
    const fakeCacheRead = () => {
      if (data === null) {
        promise = new Promise(resolve => {
          resolver = resolvedData => {
            data = resolvedData;
            resolve(resolvedData);
          };
        });
        throw promise;
      } else {
        return data;
      }
    };
    const Parent = () => (
      <React.Suspense fallback={<Fallback />}>
        <Suspender />
      </React.Suspense>
    );
    const Fallback = () => null;
    let setShouldSuspend = null;
    const Suspender = ({suspend}) => {
      const tuple = React.useState(false);
      setShouldSuspend = tuple[1];
      if (tuple[0] === true) {
        return fakeCacheRead();
      } else {
        return null;
      }
    };

    await act(() => {
      ReactDOM.render(<Parent />, document.createElement('div'));
      assertLog(['onCommitRoot']);
    });
    expect(setShouldSuspend).not.toBeNull();
    expect(allSchedulerTypes).toEqual([[null]]);

    await act(() => {
      setShouldSuspend(true);
    });
    assertLog(['onCommitRoot']);
    expect(allSchedulerTypes).toEqual([[null], [Suspender]]);

    expect(resolver).not.toBeNull();
    await act(() => {
      resolver('abc');
      return promise;
    });
    assertLog(['onCommitRoot']);
    expect(allSchedulerTypes).toEqual([[null], [Suspender], [Suspender]]);

    // Verify no outstanding flushes
    await waitForAll([]);
  });

  it('should cover error handling', async () => {
    let triggerError = null;

    const Parent = () => {
      const [shouldError, setShouldError] = React.useState(false);
      triggerError = () => setShouldError(true);
      return shouldError ? (
        <ErrorBoundary>
          <BrokenRender />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Yield value="initial" />
        </ErrorBoundary>
      );
    };
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        if (this.state.error) {
          return <Yield value="error" />;
        }
        return this.props.children;
      }
    }
    const Yield = ({value}) => {
      Scheduler.log(value);
      return null;
    };
    const BrokenRender = () => {
      throw new Error('Hello');
    };

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Parent shouldError={false} />);
    });
    assertLog(['initial', 'onCommitRoot']);
    expect(triggerError).not.toBeNull();

    allSchedulerTypes.splice(0);
    onCommitRootShouldYield = true;

    await act(() => {
      triggerError();
    });
    assertLog(['onCommitRoot', 'error', 'onCommitRoot']);
    expect(allSchedulerTypes).toEqual([[Parent], [ErrorBoundary]]);

    // Verify no outstanding flushes
    await waitForAll([]);
  });

  it('should distinguish between updaters in the case of interleaved work', async () => {
    const {
      FunctionComponent,
      HostRoot,
    } = require('react-reconciler/src/ReactWorkTags');

    let triggerLowPriorityUpdate = null;
    let triggerSyncPriorityUpdate = null;

    const SyncPriorityUpdater = () => {
      const [count, setCount] = React.useState(0);
      triggerSyncPriorityUpdate = () => setCount(prevCount => prevCount + 1);
      Scheduler.log(`SyncPriorityUpdater ${count}`);
      return <Yield value={`HighPriority ${count}`} />;
    };
    const LowPriorityUpdater = () => {
      const [count, setCount] = React.useState(0);
      triggerLowPriorityUpdate = () => {
        React.startTransition(() => {
          setCount(prevCount => prevCount + 1);
        });
      };
      Scheduler.log(`LowPriorityUpdater ${count}`);
      return <Yield value={`LowPriority ${count}`} />;
    };
    const Yield = ({value}) => {
      Scheduler.log(`Yield ${value}`);
      return null;
    };

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    root.render(
      <React.Fragment>
        <SyncPriorityUpdater />
        <LowPriorityUpdater />
      </React.Fragment>,
    );

    // Render everything initially.
    await waitForAll([
      'SyncPriorityUpdater 0',
      'Yield HighPriority 0',
      'LowPriorityUpdater 0',
      'Yield LowPriority 0',
      'onCommitRoot',
    ]);
    expect(triggerLowPriorityUpdate).not.toBeNull();
    expect(triggerSyncPriorityUpdate).not.toBeNull();
    expect(allSchedulerTags).toEqual([[HostRoot]]);

    // Render a partial update, but don't finish.
    await act(async () => {
      triggerLowPriorityUpdate();
      await waitFor(['LowPriorityUpdater 1']);
      expect(allSchedulerTags).toEqual([[HostRoot]]);

      // Interrupt with higher priority work.
      ReactDOM.flushSync(triggerSyncPriorityUpdate);
      assertLog([
        'SyncPriorityUpdater 1',
        'Yield HighPriority 1',
        'onCommitRoot',
      ]);
      expect(allSchedulerTypes).toEqual([[null], [SyncPriorityUpdater]]);

      // Finish the initial partial update
      triggerLowPriorityUpdate();
      await waitForAll([
        'LowPriorityUpdater 2',
        'Yield LowPriority 2',
        'onCommitRoot',
      ]);
    });
    expect(allSchedulerTags).toEqual([
      [HostRoot],
      [FunctionComponent],
      [FunctionComponent],
    ]);
    expect(allSchedulerTypes).toEqual([
      [null],
      [SyncPriorityUpdater],
      [LowPriorityUpdater],
    ]);

    // Verify no outstanding flushes
    await waitForAll([]);
  });
});
