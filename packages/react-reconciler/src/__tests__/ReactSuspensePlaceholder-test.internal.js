/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

let Profiler;
let React;
let ReactNoop;
let Scheduler;
let ReactFeatureFlags;
let ReactCache;
let Suspense;
let TextResource;
let textResourceShouldFail;
let waitForAll;
let assertLog;
let act;

describe('ReactSuspensePlaceholder', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactFeatureFlags = require('shared/ReactFeatureFlags');

    ReactFeatureFlags.enableProfilerTimer = true;
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    ReactCache = require('react-cache');

    Profiler = React.Profiler;
    Suspense = React.Suspense;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    act = InternalTestUtils.act;

    TextResource = ReactCache.unstable_createResource(
      ([text, ms = 0]) => {
        let listeners = null;
        let status = 'pending';
        let value = null;
        return {
          then(resolve, reject) {
            switch (status) {
              case 'pending': {
                if (listeners === null) {
                  listeners = [{resolve, reject}];
                  setTimeout(() => {
                    if (textResourceShouldFail) {
                      Scheduler.log(`Promise rejected [${text}]`);
                      status = 'rejected';
                      value = new Error('Failed to load: ' + text);
                      listeners.forEach(listener => listener.reject(value));
                    } else {
                      Scheduler.log(`Promise resolved [${text}]`);
                      status = 'resolved';
                      value = text;
                      listeners.forEach(listener => listener.resolve(value));
                    }
                  }, ms);
                } else {
                  listeners.push({resolve, reject});
                }
                break;
              }
              case 'resolved': {
                resolve(value);
                break;
              }
              case 'rejected': {
                reject(value);
                break;
              }
            }
          },
        };
      },
      ([text, ms]) => text,
    );
    textResourceShouldFail = false;
  });

  function Text({fakeRenderDuration = 0, text = 'Text'}) {
    Scheduler.unstable_advanceTime(fakeRenderDuration);
    Scheduler.log(text);
    return text;
  }

  function AsyncText({fakeRenderDuration = 0, ms, text}) {
    Scheduler.unstable_advanceTime(fakeRenderDuration);
    try {
      TextResource.read([text, ms]);
      Scheduler.log(text);
      return text;
    } catch (promise) {
      if (typeof promise.then === 'function') {
        Scheduler.log(`Suspend! [${text}]`);
      } else {
        Scheduler.log(`Error! [${text}]`);
      }
      throw promise;
    }
  }

  it('times out children that are already hidden', async () => {
    class HiddenText extends React.PureComponent {
      render() {
        const text = this.props.text;
        Scheduler.log(text);
        return <span hidden={true}>{text}</span>;
      }
    }

    function App(props) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <HiddenText text="A" />
          <span>
            <AsyncText ms={1000} text={props.middleText} />
          </span>
          <span>
            <Text text="C" />
          </span>
        </Suspense>
      );
    }

    // Initial mount
    ReactNoop.render(<App middleText="B" />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading...',
      // pre-warming
      'A',
      'Suspend! [B]',
      'C',
    ]);
    expect(ReactNoop).toMatchRenderedOutput('Loading...');

    await act(() => jest.advanceTimersByTime(1000));
    assertLog(['Promise resolved [B]', 'A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );

    // Update
    ReactNoop.render(<App middleText="B2" />);
    await waitForAll([
      'Suspend! [B2]',
      'Loading...',
      // pre-warming
      'Suspend! [B2]',
      'C',
    ]);

    // Time out the update
    jest.advanceTimersByTime(750);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span hidden={true}>B</span>
        <span hidden={true}>C</span>
        Loading...
      </>,
    );

    // Resolve the promise
    await act(() => jest.advanceTimersByTime(1000));
    assertLog(['Promise resolved [B2]', 'B2', 'C']);

    // Render the final update. A should still be hidden, because it was
    // given a `hidden` prop.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span>B2</span>
        <span>C</span>
      </>,
    );
  });

  it('times out text nodes', async () => {
    function App(props) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="A" />
          <AsyncText ms={1000} text={props.middleText} />
          <Text text="C" />
        </Suspense>
      );
    }

    // Initial mount
    ReactNoop.render(<App middleText="B" />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading...',
      // pre-warming
      'A',
      'Suspend! [B]',
      'C',
    ]);

    expect(ReactNoop).not.toMatchRenderedOutput('ABC');

    await act(() => jest.advanceTimersByTime(1000));
    assertLog(['Promise resolved [B]', 'A', 'B', 'C']);
    expect(ReactNoop).toMatchRenderedOutput('ABC');

    // Update
    ReactNoop.render(<App middleText="B2" />);
    await waitForAll([
      'A',
      'Suspend! [B2]',
      'Loading...',
      // pre-warming
      'A',
      'Suspend! [B2]',
      'C',
    ]);
    // Time out the update
    jest.advanceTimersByTime(750);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Loading...');

    // Resolve the promise
    await act(() => jest.advanceTimersByTime(1000));
    assertLog(['Promise resolved [B2]', 'A', 'B2', 'C']);

    // Render the final update. A should still be hidden, because it was
    // given a `hidden` prop.
    expect(ReactNoop).toMatchRenderedOutput('AB2C');
  });

  it('preserves host context for text nodes', async () => {
    function App(props) {
      return (
        // uppercase is a special type that causes React Noop to render child
        // text nodes as uppercase.
        <uppercase>
          <Suspense fallback={<Text text="Loading..." />}>
            <Text text="a" />
            <AsyncText ms={1000} text={props.middleText} />
            <Text text="c" />
          </Suspense>
        </uppercase>
      );
    }

    // Initial mount
    ReactNoop.render(<App middleText="b" />);

    await waitForAll([
      'a',
      'Suspend! [b]',
      'Loading...',
      // pre-warming
      'a',
      'Suspend! [b]',
      'c',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(<uppercase>LOADING...</uppercase>);

    await act(() => jest.advanceTimersByTime(1000));
    assertLog(['Promise resolved [b]', 'a', 'b', 'c']);
    expect(ReactNoop).toMatchRenderedOutput(<uppercase>ABC</uppercase>);

    // Update
    ReactNoop.render(<App middleText="b2" />);
    await waitForAll([
      'a',
      'Suspend! [b2]',
      'Loading...',
      'a',
      'Suspend! [b2]',
      'c',
    ]);
    // Time out the update
    jest.advanceTimersByTime(750);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<uppercase>LOADING...</uppercase>);

    // Resolve the promise
    await act(() => jest.advanceTimersByTime(1000));
    assertLog(['Promise resolved [b2]', 'a', 'b2', 'c']);

    // Render the final update. A should still be hidden, because it was
    // given a `hidden` prop.
    expect(ReactNoop).toMatchRenderedOutput(<uppercase>AB2C</uppercase>);
  });

  describe('profiler durations', () => {
    let App;
    let onRender;

    beforeEach(() => {
      // Order of parameters: id, phase, actualDuration, treeBaseDuration
      onRender = jest.fn();

      const Fallback = () => {
        Scheduler.log('Fallback');
        Scheduler.unstable_advanceTime(10);
        return 'Loading...';
      };

      const Suspending = () => {
        Scheduler.log('Suspending');
        Scheduler.unstable_advanceTime(2);
        return <AsyncText ms={1000} text="Loaded" fakeRenderDuration={1} />;
      };

      App = ({shouldSuspend, text = 'Text', textRenderDuration = 5}) => {
        Scheduler.log('App');
        return (
          <Profiler id="root" onRender={onRender}>
            <Suspense fallback={<Fallback />}>
              {shouldSuspend && <Suspending />}
              <Text fakeRenderDuration={textRenderDuration} text={text} />
            </Suspense>
          </Profiler>
        );
      };
    });

    describe('when suspending during mount', () => {
      // @gate !disableLegacyMode && !disableLegacyMode
      it('properly accounts for base durations when a suspended times out in a legacy tree', async () => {
        ReactNoop.renderLegacySyncRoot(<App shouldSuspend={true} />);
        assertLog([
          'App',
          'Suspending',
          'Suspend! [Loaded]',
          'Text',
          'Fallback',
        ]);
        expect(ReactNoop).toMatchRenderedOutput('Loading...');
        expect(onRender).toHaveBeenCalledTimes(1);

        // Initial mount only shows the "Loading..." Fallback.
        // The treeBaseDuration then should be 10ms spent rendering Fallback,
        // but the actualDuration should also include the 8ms spent rendering the hidden tree.
        expect(onRender.mock.calls[0][2]).toBe(18);
        expect(onRender.mock.calls[0][3]).toBe(10);

        jest.advanceTimersByTime(1000);

        assertLog(['Promise resolved [Loaded]']);

        ReactNoop.flushSync();

        assertLog(['Loaded']);
        expect(ReactNoop).toMatchRenderedOutput('LoadedText');
        expect(onRender).toHaveBeenCalledTimes(2);

        // When the suspending data is resolved and our final UI is rendered,
        // the baseDuration should only include the 1ms re-rendering AsyncText,
        // but the treeBaseDuration should include the full 8ms spent in the tree.
        expect(onRender.mock.calls[1][2]).toBe(1);
        expect(onRender.mock.calls[1][3]).toBe(8);
      });

      it('properly accounts for base durations when a suspended times out in a concurrent tree', async () => {
        ReactNoop.render(<App shouldSuspend={true} />);

        await waitForAll([
          'App',
          'Suspending',
          'Suspend! [Loaded]',
          'Fallback',
          // pre-warming
          'Suspending',
          'Suspend! [Loaded]',
          'Text',
        ]);
        // Since this is initial render we immediately commit the fallback. Another test below
        // deals with the update case where this suspends.
        expect(ReactNoop).toMatchRenderedOutput('Loading...');
        expect(onRender).toHaveBeenCalledTimes(
          gate('alwaysThrottleRetries') ? 1 : 2,
        );

        // Initial mount only shows the "Loading..." Fallback.
        // The treeBaseDuration then should be 10ms spent rendering Fallback,
        // but the actualDuration should also include the 3ms spent rendering the hidden tree.
        expect(onRender.mock.calls[0][2]).toBe(13);
        expect(onRender.mock.calls[0][3]).toBe(10);

        // Resolve the pending promise.
        await act(() => jest.advanceTimersByTime(1000));
        assertLog([
          'Promise resolved [Loaded]',
          'Suspending',
          'Loaded',
          'Text',
        ]);
        expect(ReactNoop).toMatchRenderedOutput('LoadedText');

        expect(onRender).toHaveBeenCalledTimes(3);

        // When the suspending data is resolved and our final UI is rendered,
        // both times should include the 8ms re-rendering Suspending and AsyncText.
        expect(onRender.mock.calls[2][2]).toBe(8);
        expect(onRender.mock.calls[2][3]).toBe(8);
      });
    });

    describe('when suspending during update', () => {
      // @gate !disableLegacyMode && !disableLegacyMode
      it('properly accounts for base durations when a suspended times out in a legacy tree', async () => {
        ReactNoop.renderLegacySyncRoot(
          <App shouldSuspend={false} textRenderDuration={5} />,
        );
        assertLog(['App', 'Text']);
        expect(ReactNoop).toMatchRenderedOutput('Text');
        expect(onRender).toHaveBeenCalledTimes(1);

        // Initial mount only shows the "Text" text.
        // It should take 5ms to render.
        expect(onRender.mock.calls[0][2]).toBe(5);
        expect(onRender.mock.calls[0][3]).toBe(5);

        ReactNoop.render(<App shouldSuspend={true} textRenderDuration={5} />);
        assertLog([
          'App',
          'Suspending',
          'Suspend! [Loaded]',
          'Text',
          'Fallback',
        ]);
        expect(ReactNoop).toMatchRenderedOutput('Loading...');
        expect(onRender).toHaveBeenCalledTimes(2);

        // The suspense update should only show the "Loading..." Fallback.
        // The actual duration should include 10ms spent rendering Fallback,
        // plus the 8ms render all of the hidden, suspended subtree.
        // But the tree base duration should only include 10ms spent rendering Fallback,
        expect(onRender.mock.calls[1][2]).toBe(18);
        expect(onRender.mock.calls[1][3]).toBe(10);

        ReactNoop.renderLegacySyncRoot(
          <App shouldSuspend={true} text="New" textRenderDuration={6} />,
        );
        assertLog([
          'App',
          'Suspending',
          'Suspend! [Loaded]',
          'New',
          'Fallback',
        ]);
        expect(ReactNoop).toMatchRenderedOutput('Loading...');
        expect(onRender).toHaveBeenCalledTimes(3);

        expect(onRender.mock.calls[1][2]).toBe(18);
        expect(onRender.mock.calls[1][3]).toBe(10);
        jest.advanceTimersByTime(1000);

        assertLog(['Promise resolved [Loaded]']);

        ReactNoop.flushSync();

        assertLog(['Loaded']);
        expect(ReactNoop).toMatchRenderedOutput('LoadedNew');
        expect(onRender).toHaveBeenCalledTimes(4);

        // When the suspending data is resolved and our final UI is rendered,
        // the baseDuration should only include the 1ms re-rendering AsyncText,
        // but the treeBaseDuration should include the full 9ms spent in the tree.
        expect(onRender.mock.calls[3][2]).toBe(1);
        expect(onRender.mock.calls[3][3]).toBe(9);
      });

      it('properly accounts for base durations when a suspended times out in a concurrent tree', async () => {
        const Fallback = () => {
          Scheduler.log('Fallback');
          Scheduler.unstable_advanceTime(10);
          return 'Loading...';
        };

        const Suspending = () => {
          Scheduler.log('Suspending');
          Scheduler.unstable_advanceTime(2);
          return <AsyncText ms={1000} text="Loaded" fakeRenderDuration={1} />;
        };

        App = ({shouldSuspend, text = 'Text', textRenderDuration = 5}) => {
          Scheduler.log('App');
          return (
            <Profiler id="root" onRender={onRender}>
              <Suspense fallback={<Fallback />}>
                {shouldSuspend && <Suspending />}
                <Text fakeRenderDuration={textRenderDuration} text={text} />
              </Suspense>
            </Profiler>
          );
        };

        ReactNoop.render(
          <>
            <App shouldSuspend={false} textRenderDuration={5} />
            <Suspense fallback={null} />
          </>,
        );

        await waitForAll(['App', 'Text']);
        expect(ReactNoop).toMatchRenderedOutput('Text');
        expect(onRender).toHaveBeenCalledTimes(1);

        // Initial mount only shows the "Text" text.
        // It should take 5ms to render.
        expect(onRender.mock.calls[0][2]).toBe(5);
        expect(onRender.mock.calls[0][3]).toBe(5);

        ReactNoop.render(
          <>
            <App shouldSuspend={true} textRenderDuration={5} />
            <Suspense fallback={null} />
          </>,
        );
        await waitForAll([
          'App',
          'Suspending',
          'Suspend! [Loaded]',
          'Fallback',
          // pre-warming
          'Suspending',
          'Suspend! [Loaded]',
          'Text',
        ]);
        // Show the fallback UI.
        expect(ReactNoop).toMatchRenderedOutput('Loading...');
        expect(onRender).toHaveBeenCalledTimes(
          gate('alwaysThrottleRetries') ? 2 : 3,
        );

        jest.advanceTimersByTime(900);

        // The suspense update should only show the "Loading..." Fallback.
        // The actual duration should include 10ms spent rendering Fallback,
        // plus the 3ms render all of the partially rendered suspended subtree.
        // But the tree base duration should only include 10ms spent rendering Fallback.
        expect(onRender.mock.calls[1][2]).toBe(13);
        expect(onRender.mock.calls[1][3]).toBe(10);

        // Update again while timed out.
        // Since this test was originally written we added an optimization to avoid
        // suspending in the case that we already timed out. To simulate the old
        // behavior, we add a different suspending boundary as a sibling.
        ReactNoop.render(
          <>
            <App shouldSuspend={true} text="New" textRenderDuration={6} />
            <Suspense fallback={null}>
              <AsyncText ms={100} text="Sibling" fakeRenderDuration={1} />
            </Suspense>
          </>,
        );

        // TODO: This is here only to shift us into the next JND bucket. A
        // consequence of AsyncText relying on the same timer queue as React's
        // internal Suspense timer. We should decouple our AsyncText helpers
        // from timers.
        Scheduler.unstable_advanceTime(200);

        await waitForAll([
          'App',
          'Suspending',
          'Suspend! [Loaded]',
          'Fallback',
          'Suspend! [Sibling]',
          // pre-warming
          'Suspending',
          'Suspend! [Loaded]',
          'New',
          'Suspend! [Sibling]',
        ]);
        expect(ReactNoop).toMatchRenderedOutput('Loading...');

        expect(onRender).toHaveBeenCalledTimes(
          gate('alwaysThrottleRetries') ? 4 : 5,
        );

        // Resolve the pending promise.
        await act(async () => {
          jest.advanceTimersByTime(100);
          assertLog([
            'Promise resolved [Loaded]',
            'Promise resolved [Sibling]',
          ]);
          await waitForAll(['Suspending', 'Loaded', 'New', 'Sibling']);
        });

        expect(onRender).toHaveBeenCalledTimes(
          gate('alwaysThrottleRetries') ? 5 : 6,
        );

        // When the suspending data is resolved and our final UI is rendered,
        // both times should include the 6ms rendering Text,
        // the 2ms rendering Suspending, and the 1ms rendering AsyncText.
        expect(onRender.mock.calls[4][2]).toBe(9);
        expect(onRender.mock.calls[4][3]).toBe(
          gate('alwaysThrottleRetries') ? 9 : 10,
        );
      });
    });
  });
});
