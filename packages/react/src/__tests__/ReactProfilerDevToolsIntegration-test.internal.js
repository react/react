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

describe('ReactProfiler DevTools integration', () => {
  let React;
  let ReactFeatureFlags;
  let ReactTestRenderer;
  let Scheduler;
  let AdvanceTime;
  let hook;
  let waitForAll;
  let waitFor;
  let act;

  beforeEach(() => {
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook = {
      inject: () => {},
      onCommitFiberRoot: jest.fn((rendererId, root) => {}),
      onCommitFiberUnmount: () => {},
      supportsFiber: true,
    };

    jest.resetModules();

    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableProfilerTimer = true;
    Scheduler = require('scheduler');
    React = require('react');
    ReactTestRenderer = require('react-test-renderer');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    act = InternalTestUtils.act;

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
  });

  it('should auto-Profile all fibers if the DevTools hook is detected', async () => {
    const App = ({multiplier}) => {
      Scheduler.unstable_advanceTime(2);
      return (
        <React.Profiler id="Profiler" onRender={onRender}>
          <AdvanceTime byAmount={3 * multiplier} shouldComponentUpdate={true} />
          <AdvanceTime
            byAmount={7 * multiplier}
            shouldComponentUpdate={false}
          />
        </React.Profiler>
      );
    };

    const onRender = jest.fn(() => {});
    let rendered;
    await act(() => {
      rendered = ReactTestRenderer.create(<App multiplier={1} />, {
        unstable_isConcurrent: true,
      });
    });

    expect(hook.onCommitFiberRoot).toHaveBeenCalledTimes(1);

    // Measure observable timing using the Profiler component.
    // The time spent in App (above the Profiler) won't be included in the durations,
    // But needs to be accounted for in the offset times.
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onRender).toHaveBeenCalledWith('Profiler', 'mount', 10, 10, 2, 12);
    onRender.mockClear();

    // Measure unobservable timing required by the DevTools profiler.
    // At this point, the base time should include both:
    // The time 2ms in the App component itself, and
    // The 10ms spend in the Profiler sub-tree beneath.
    expect(rendered.root.findByType(App)._currentFiber().treeBaseDuration).toBe(
      12,
    );

    await act(() => {
      rendered.update(<App multiplier={2} />);
    });

    // Measure observable timing using the Profiler component.
    // The time spent in App (above the Profiler) won't be included in the durations,
    // But needs to be accounted for in the offset times.
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onRender).toHaveBeenCalledWith('Profiler', 'update', 6, 13, 14, 20);

    // Measure unobservable timing required by the DevTools profiler.
    // At this point, the base time should include both:
    // The initial 9ms for the components that do not re-render, and
    // The updated 6ms for the component that does.
    expect(rendered.root.findByType(App)._currentFiber().treeBaseDuration).toBe(
      15,
    );
  });

  it('should reset the fiber stack correctly after an error when profiling host roots', async () => {
    Scheduler.unstable_advanceTime(20);

    let rendered;
    await act(() => {
      rendered = ReactTestRenderer.create(
        <div>
          <AdvanceTime byAmount={2} />
        </div>,
        {unstable_isConcurrent: true},
      );
    });

    Scheduler.unstable_advanceTime(20);

    function Throws() {
      throw new Error('Oops!');
    }

    await expect(async () => {
      await act(() => {
        rendered.update(
          <Throws>
            <AdvanceTime byAmount={3} />
          </Throws>,
        );
      });
    }).rejects.toThrow('Oops!');

    Scheduler.unstable_advanceTime(20);

    await act(() => {
      // But this should render correctly, if the profiler's fiber stack has been reset.
      rendered.update(
        <div>
          <AdvanceTime byAmount={7} />
        </div>,
      );
    });

    // Measure unobservable timing required by the DevTools profiler.
    // At this point, the base time should include only the most recent (not failed) render.
    // It should not include time spent on the initial render,
    // Or time that elapsed between any of the above renders.
    expect(
      rendered.root.findByType('div')._currentFiber().treeBaseDuration,
    ).toBe(7);
  });

  it('regression test: #17159', async () => {
    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    let root;
    await act(() => {
      root = ReactTestRenderer.create(null, {unstable_isConcurrent: true});
    });

    // Commit something
    root.update(<Text text="A" />);
    await waitForAll(['A']);
    expect(root).toMatchRenderedOutput('A');

    // Advance time by many seconds, larger than the default expiration time
    // for updates.
    Scheduler.unstable_advanceTime(10000);
    // Schedule an update.
    React.startTransition(() => {
      root.update(<Text text="B" />);
    });

    // Update B should not instantly expire.
    await waitFor([]);

    await waitForAll(['B']);
    expect(root).toMatchRenderedOutput('B');
  });
});
