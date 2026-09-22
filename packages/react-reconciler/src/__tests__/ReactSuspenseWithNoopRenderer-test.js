let React;
let Fragment;
let ReactNoop;
let Scheduler;
let act;
let waitFor;
let waitForAll;
let waitForMicrotasks;
let assertLog;
let waitForPaint;
let Suspense;
let startTransition;
let getCacheForType;

let caches;
let seededCache;

describe('ReactSuspenseWithNoopRenderer', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    Fragment = React.Fragment;
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    Suspense = React.Suspense;
    startTransition = React.startTransition;
    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
    waitForPaint = InternalTestUtils.waitForPaint;
    waitForMicrotasks = InternalTestUtils.waitForMicrotasks;
    assertLog = InternalTestUtils.assertLog;

    getCacheForType = React.unstable_getCacheForType;

    caches = [];
    seededCache = null;
  });

  function createTextCache() {
    if (seededCache !== null) {
      // Trick to seed a cache before it exists.
      // TODO: Need a built-in API to seed data before the initial render (i.e.
      // not a refresh because nothing has mounted yet).
      const cache = seededCache;
      seededCache = null;
      return cache;
    }

    const data = new Map();
    const version = caches.length + 1;
    const cache = {
      version,
      data,
      resolve(text) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'resolved',
            value: text,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'resolved';
          record.value = text;
          thenable.pings.forEach(t => t());
        }
      },
      reject(text, error) {
        const record = data.get(text);
        if (record === undefined) {
          const newRecord = {
            status: 'rejected',
            value: error,
          };
          data.set(text, newRecord);
        } else if (record.status === 'pending') {
          const thenable = record.value;
          record.status = 'rejected';
          record.value = error;
          thenable.pings.forEach(t => t());
        }
      },
    };
    caches.push(cache);
    return cache;
  }

  function readText(text) {
    const textCache = getCacheForType(createTextCache);
    const record = textCache.data.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          Scheduler.log(`Error! [${text}]`);
          throw record.value;
        case 'resolved':
          return textCache.version;
      }
    } else {
      Scheduler.log(`Suspend! [${text}]`);

      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.data.set(text, newRecord);

      throw thenable;
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return <span prop={text} />;
  }

  function AsyncText({text, showVersion}) {
    const version = readText(text);
    const fullText = showVersion ? `${text} [v${version}]` : text;
    Scheduler.log(fullText);
    return <span prop={fullText} />;
  }

  function seedNextTextCache(text) {
    if (seededCache === null) {
      seededCache = createTextCache();
    }
    seededCache.resolve(text);
  }

  function resolveMostRecentTextCache(text) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].resolve(text)`.
      caches[caches.length - 1].resolve(text);
    }
  }

  const resolveText = resolveMostRecentTextCache;

  function rejectMostRecentTextCache(text, error) {
    if (caches.length === 0) {
      throw Error('Cache does not exist.');
    } else {
      // Resolve the most recently created cache. An older cache can by
      // resolved with `caches[index].reject(text, error)`.
      caches[caches.length - 1].reject(text, error);
    }
  }

  const rejectText = rejectMostRecentTextCache;

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

  // Note: This is based on a similar component we use in www. We can delete
  // once the extra div wrapper is no longer necessary.
  function LegacyHiddenDiv({children, mode}) {
    return (
      <div hidden={mode === 'hidden'}>
        <React.unstable_LegacyHidden
          mode={mode === 'hidden' ? 'unstable-defer-without-hiding' : mode}>
          {children}
        </React.unstable_LegacyHidden>
      </div>
    );
  }

  // @gate enableLegacyCache
  it("does not restart if there's a ping during initial render", async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return props.children;
    }

    function Foo() {
      Scheduler.log('Foo');
      return (
        <>
          <Suspense fallback={<Text text="Loading..." />}>
            <Bar>
              <AsyncText text="A" />
              <Text text="B" />
            </Bar>
          </Suspense>
          <Text text="C" />
          <Text text="D" />
        </>
      );
    }

    React.startTransition(() => {
      ReactNoop.render(<Foo />);
    });
    await waitFor([
      'Foo',
      'Bar',
      // A suspends
      'Suspend! [A]',
      // We immediately unwind and switch to a fallback without
      // rendering siblings.
      'Loading...',
      'C',
      // Yield before rendering D
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    // Flush the promise completely
    await act(async () => {
      await resolveText('A');
      // Even though the promise has resolved, we should now flush
      // and commit the in progress render instead of restarting.
      await waitForPaint(['D']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Loading..." />
          <span prop="C" />
          <span prop="D" />
        </>,
      );
      // Next, we'll flush the complete content.
      await waitForAll(['Bar', 'A', 'B']);
    });

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
        <span prop="C" />
        <span prop="D" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('suspends rendering and continues later', async () => {
    function Bar(props) {
      Scheduler.log('Bar');
      return props.children;
    }

    function Foo({renderBar}) {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {renderBar ? (
            <Bar>
              <AsyncText text="A" />
              <Text text="B" />
            </Bar>
          ) : null}
        </Suspense>
      );
    }

    // Render empty shell.
    ReactNoop.render(<Foo />);
    await waitForAll(['Foo']);

    // The update will suspend.
    React.startTransition(() => {
      ReactNoop.render(<Foo renderBar={true} />);
    });
    await waitForAll([
      'Foo',
      'Bar',
      // A suspends
      'Suspend! [A]',

      // pre-warming
      'B',
      // end pre-warming

      // We immediately unwind and switch to a fallback without
      // rendering siblings.
      'Loading...',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    // Resolve the data
    await resolveText('A');
    // Renders successfully
    await waitForAll(['Foo', 'Bar', 'A', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('suspends siblings and later recovers each independently', async () => {
    // Render two sibling Suspense components
    ReactNoop.render(
      <Fragment>
        <Suspense fallback={<Text text="Loading A..." />}>
          <AsyncText text="A" />
        </Suspense>
        <Suspense fallback={<Text text="Loading B..." />}>
          <AsyncText text="B" />
        </Suspense>
      </Fragment>,
    );
    await waitForAll([
      'Suspend! [A]',
      'Loading A...',
      'Suspend! [B]',
      'Loading B...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Loading A..." />
        <span prop="Loading B..." />
      </>,
    );

    // Resolve first Suspense's promise so that it switches switches back to the
    // normal view. The second Suspense should still show the placeholder.
    await act(() => resolveText('A'));
    assertLog([
      'A',
      ...(gate('alwaysThrottleRetries')
        ? ['Suspend! [B]', 'Suspend! [B]']
        : []),
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="Loading B..." />
      </>,
    );

    // Resolve the second Suspense's promise so that it switches back to the
    // normal view.
    await act(() => resolveText('B'));
    assertLog(['B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('when something suspends, unwinds immediately without rendering siblings', async () => {
    // A shell is needed. The update cause it to suspend.
    ReactNoop.render(<Suspense fallback={<Text text="Loading..." />} />);
    await waitForAll([]);
    React.startTransition(() => {
      ReactNoop.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="A" />
          <AsyncText text="B" />
          <Text text="C" />
          <Text text="D" />
        </Suspense>,
      );
    });

    // B suspends. Render a fallback
    await waitForAll([
      'A',
      'Suspend! [B]',
      // pre-warming
      'C',
      'D',
      // end pre-warming
      'Loading...',
    ]);
    // Did not commit yet.
    expect(ReactNoop).toMatchRenderedOutput(null);

    // Wait for data to resolve
    await resolveText('B');
    await waitForAll(['A', 'B', 'C', 'D']);
    // Renders successfully
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
        <span prop="C" />
        <span prop="D" />
      </>,
    );
  });

  // Second condition is redundant but guarantees that the test runs in prod.
  // @gate enableLegacyCache
  it('retries on error', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      reset() {
        this.setState({error: null});
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={'Caught error: ' + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const errorBoundary = React.createRef();
    function App({renderContent}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {renderContent ? (
            <ErrorBoundary ref={errorBoundary}>
              <AsyncText text="Result" />
            </ErrorBoundary>
          ) : null}
        </Suspense>
      );
    }

    ReactNoop.render(<App />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    React.startTransition(() => {
      ReactNoop.render(<App renderContent={true} />);
    });
    await waitForAll(['Suspend! [Result]', 'Loading...']);
    expect(ReactNoop).toMatchRenderedOutput(null);

    await rejectText('Result', new Error('Failed to load: Result'));

    await waitForAll([
      'Error! [Result]',

      // React retries one more time
      'Error! [Result]',

      // Errored again on retry. Now handle it.
      'Caught error: Failed to load: Result',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught error: Failed to load: Result" />,
    );
  });

  // Second condition is redundant but guarantees that the test runs in prod.
  // @gate enableLegacyCache
  it('retries on error after falling back to a placeholder', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      reset() {
        this.setState({error: null});
      }
      render() {
        if (this.state.error !== null) {
          return <Text text={'Caught error: ' + this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    const errorBoundary = React.createRef();
    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <ErrorBoundary ref={errorBoundary}>
            <AsyncText text="Result" />
          </ErrorBoundary>
        </Suspense>
      );
    }

    ReactNoop.render(<App />);
    await waitForAll([
      'Suspend! [Result]',
      'Loading...',
      // pre-warming
      'Suspend! [Result]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

    await act(() => rejectText('Result', new Error('Failed to load: Result')));
    assertLog([
      'Error! [Result]',

      // React retries one more time
      'Error! [Result]',

      // Errored again on retry. Now handle it.
      'Caught error: Failed to load: Result',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <span prop="Caught error: Failed to load: Result" />,
    );
  });

  // @gate enableLegacyCache
  it('can update at a higher priority while in a suspended state', async () => {
    let setHighPri;
    function HighPri() {
      const [text, setText] = React.useState('A');
      setHighPri = setText;
      return <Text text={text} />;
    }

    let setLowPri;
    function LowPri() {
      const [text, setText] = React.useState('1');
      setLowPri = setText;
      return <AsyncText text={text} />;
    }

    function App() {
      return (
        <>
          <HighPri />
          <Suspense fallback={<Text text="Loading..." />}>
            <LowPri />
          </Suspense>
        </>
      );
    }

    // Initial mount
    await act(() => ReactNoop.render(<App />));
    assertLog([
      'A',
      'Suspend! [1]',
      'Loading...',
      // pre-warming
      'Suspend! [1]',
    ]);

    await act(() => resolveText('1'));
    assertLog(['1']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="1" />
      </>,
    );

    // Update the low-pri text
    await act(() => startTransition(() => setLowPri('2')));
    // Suspends
    assertLog(['Suspend! [2]', 'Loading...']);

    // While we're still waiting for the low-pri update to complete, update the
    // high-pri text at high priority.
    ReactNoop.flushSync(() => {
      setHighPri('B');
    });
    assertLog(['B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="B" />
        <span prop="1" />
      </>,
    );

    // Unblock the low-pri text and finish. Nothing in the UI changes because
    // the update was overriden
    await act(() => resolveText('2'));
    assertLog(['2']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="B" />
        <span prop="2" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('keeps working on lower priority work after being pinged', async () => {
    function App(props) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {props.showA && <AsyncText text="A" />}
          {props.showB && <Text text="B" />}
        </Suspense>
      );
    }

    ReactNoop.render(<App showA={false} showB={false} />);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    React.startTransition(() => {
      ReactNoop.render(<App showA={true} showB={false} />);
    });
    await waitForAll(['Suspend! [A]', 'Loading...']);
    expect(ReactNoop).toMatchRenderedOutput(null);

    React.startTransition(() => {
      ReactNoop.render(<App showA={true} showB={true} />);
    });
    await waitForAll([
      'Suspend! [A]',
      // pre-warming
      'B',
      // end pre-warming
      'Loading...',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(null);

    await resolveText('A');
    await waitForAll(['A', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('tries rendering a lower priority pending update even if a higher priority one suspends', async () => {
    function App(props) {
      if (props.hide) {
        return <Text text="(empty)" />;
      }
      return (
        <Suspense fallback="Loading...">
          <AsyncText text="Async" />
        </Suspense>
      );
    }

    // Schedule a default pri update and a low pri update, without rendering in between.
    // Default pri
    ReactNoop.render(<App />);
    // Low pri
    React.startTransition(() => {
      ReactNoop.render(<App hide={true} />);
    });

    await waitForAll([
      // The first update suspends
      'Suspend! [Async]',
      // but we have another pending update that we can work on
      '(empty)',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="(empty)" />);
  });

  // Note: This test was written to test a heuristic used in the expiration
  // times model. Might not make sense in the new model.
  // TODO: This test doesn't over what it was originally designed to test.
  // Either rewrite or delete.
  it('tries each subsequent level after suspending', async () => {
    const root = ReactNoop.createRoot();

    function App({step, shouldSuspend}) {
      return (
        <Suspense fallback="Loading...">
          <Text text="Sibling" />
          {shouldSuspend ? (
            <AsyncText text={'Step ' + step} />
          ) : (
            <Text text={'Step ' + step} />
          )}
        </Suspense>
      );
    }

    function interrupt() {
      // React has a heuristic to batch all updates that occur within the same
      // event. This is a trick to circumvent that heuristic.
      ReactNoop.flushSync(() => {
        ReactNoop.renderToRootWithID(null, 'other-root');
      });
    }

    // Mount the Suspense boundary without suspending, so that the subsequent
    // updates suspend with a delay.
    await act(() => {
      root.render(<App step={0} shouldSuspend={false} />);
    });
    await advanceTimers(1000);
    assertLog(['Sibling', 'Step 0']);

    // Schedule an update at several distinct expiration times
    await act(async () => {
      React.startTransition(() => {
        root.render(<App step={1} shouldSuspend={true} />);
      });
      Scheduler.unstable_advanceTime(1000);
      await waitFor(['Sibling']);
      interrupt();

      React.startTransition(() => {
        root.render(<App step={2} shouldSuspend={true} />);
      });
      Scheduler.unstable_advanceTime(1000);
      await waitFor(['Sibling']);
      interrupt();

      React.startTransition(() => {
        root.render(<App step={3} shouldSuspend={true} />);
      });
      Scheduler.unstable_advanceTime(1000);
      await waitFor(['Sibling']);
      interrupt();

      root.render(<App step={4} shouldSuspend={false} />);
    });

    assertLog(['Sibling', 'Step 4']);
  });

  // @gate enableLegacyCache
  it('switches to an inner fallback after suspending for a while', async () => {
    // Advance the virtual time so that we're closer to the edge of a bucket.
    ReactNoop.expire(200);

    ReactNoop.render(
      <Fragment>
        <Text text="Sync" />
        <Suspense fallback={<Text text="Loading outer..." />}>
          <AsyncText text="Outer content" />
          <Suspense fallback={<Text text="Loading inner..." />}>
            <AsyncText text="Inner content" />
          </Suspense>
        </Suspense>
      </Fragment>,
    );

    await waitForAll([
      'Sync',
      // The async content suspends
      'Suspend! [Outer content]',
      'Loading outer...',
      // pre-warming
      'Suspend! [Outer content]',
      'Suspend! [Inner content]',
      'Loading inner...',
    ]);
    // The outer loading state finishes immediately.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Sync" />
        <span prop="Loading outer..." />
      </>,
    );

    // Resolve the outer promise.
    await resolveText('Outer content');
    await waitForAll([
      'Outer content',
      'Suspend! [Inner content]',
      'Loading inner...',
    ]);
    // Don't commit the inner placeholder yet.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Sync" />
        <span prop="Loading outer..." />
      </>,
    );

    // Expire the inner timeout.
    ReactNoop.expire(500);
    await advanceTimers(500);
    // Now that 750ms have elapsed since the outer placeholder timed out,
    // we can timeout the inner placeholder.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Sync" />
        <span prop="Outer content" />
        <span prop="Loading inner..." />
      </>,
    );

    // Finally, flush the inner promise. We should see the complete screen.
    await act(() => resolveText('Inner content'));
    assertLog(['Inner content']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Sync" />
        <span prop="Outer content" />
        <span prop="Inner content" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('renders an Suspense boundary synchronously', async () => {
    spyOnDev(console, 'error');
    // Synchronously render a tree that suspends
    ReactNoop.flushSync(() =>
      ReactNoop.render(
        <Fragment>
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Async" />
          </Suspense>
          <Text text="Sync" />
        </Fragment>,
      ),
    );
    assertLog([
      // The async child suspends
      'Suspend! [Async]',
      // We immediately render the fallback UI
      'Loading...',
      // Continue on the sibling
      'Sync',
    ]);
    // The tree commits synchronously
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Loading..." />
        <span prop="Sync" />
      </>,
    );

    // Once the promise resolves, we render the suspended view
    await act(() => resolveText('Async'));
    assertLog(['Async']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Async" />
        <span prop="Sync" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('suspending inside an expired expiration boundary will bubble to the next one', async () => {
    ReactNoop.flushSync(() =>
      ReactNoop.render(
        <Fragment>
          <Suspense fallback={<Text text="Loading (outer)..." />}>
            <Suspense fallback={<AsyncText text="Loading (inner)..." />}>
              <AsyncText text="Async" />
            </Suspense>
            <Text text="Sync" />
          </Suspense>
        </Fragment>,
      ),
    );
    assertLog([
      'Suspend! [Async]',
      'Suspend! [Loading (inner)...]',
      'Loading (outer)...',
    ]);
    // The tree commits synchronously
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading (outer)..." />);
  });

  // @gate enableLegacyCache
  it('resolves successfully even if fallback render is pending', async () => {
    const root = ReactNoop.createRoot();
    root.render(
      <>
        <Suspense fallback={<Text text="Loading..." />} />
      </>,
    );
    await waitForAll([]);
    expect(root).toMatchRenderedOutput(null);
    React.startTransition(() => {
      root.render(
        <>
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Async" />
            <Text text="Sibling" />
          </Suspense>
        </>,
      );
    });
    await waitFor(['Suspend! [Async]']);

    await resolveText('Async');

    // Because we're already showing a fallback, interrupt the current render
    // and restart immediately.
    await waitForAll(['Async', 'Sibling']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Async" />
        <span prop="Sibling" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('in concurrent mode, does not error when an update suspends without a Suspense boundary during a sync update', () => {
    // NOTE: We may change this to be a warning in the future.
    expect(() => {
      ReactNoop.flushSync(() => {
        ReactNoop.render(<AsyncText text="Async" />);
      });
    }).not.toThrow();
  });

  // @gate enableLegacyCache && !disableLegacyMode
  it('in legacy mode, errors when an update suspends without a Suspense boundary during a sync update', async () => {
    const root = ReactNoop.createLegacyRoot();
    await expect(async () => {
      await act(() => root.render(<AsyncText text="Async" />));
    }).rejects.toThrow(
      'A component suspended while responding to synchronous input.',
    );
  });

  // @gate enableLegacyCache
  it('a Suspense component correctly handles more than one suspended child', async () => {
    ReactNoop.render(
      <Suspense fallback={<Text text="Loading..." />}>
        <AsyncText text="A" />
        <AsyncText text="B" />
      </Suspense>,
    );
    await waitForAll([
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

    await act(() => {
      resolveText('A');
      resolveText('B');
    });
    assertLog(['A', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('can resume rendering earlier than a timeout', async () => {
    ReactNoop.render(<Suspense fallback={<Text text="Loading..." />} />);
    await waitForAll([]);

    React.startTransition(() => {
      ReactNoop.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="Async" />
        </Suspense>,
      );
    });
    await waitForAll(['Suspend! [Async]', 'Loading...']);
    expect(ReactNoop).toMatchRenderedOutput(null);

    // Resolve the promise
    await resolveText('Async');
    // We can now resume rendering
    await waitForAll(['Async']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Async" />);
  });

  // @gate enableLegacyCache
  it('starts working on an update even if its priority falls between two suspended levels', async () => {
    function App(props) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          {props.text === 'C' || props.text === 'S' ? (
            <Text text={props.text} />
          ) : (
            <AsyncText text={props.text} />
          )}
        </Suspense>
      );
    }

    // First mount without suspending. This ensures we already have content
    // showing so that subsequent updates will suspend.
    ReactNoop.render(<App text="S" />);
    await waitForAll(['S']);

    // Schedule an update, and suspend for up to 5 seconds.
    React.startTransition(() => ReactNoop.render(<App text="A" />));
    // The update should suspend.
    await waitForAll(['Suspend! [A]', 'Loading...']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="S" />);

    // Advance time until right before it expires.
    await advanceTimers(4999);
    ReactNoop.expire(4999);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="S" />);

    // Schedule another low priority update.
    React.startTransition(() => ReactNoop.render(<App text="B" />));
    // This update should also suspend.
    await waitForAll(['Suspend! [B]', 'Loading...']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="S" />);

    // Schedule a regular update. Its expiration time will fall between
    // the expiration times of the previous two updates.
    ReactNoop.render(<App text="C" />);
    await waitForAll(['C']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="C" />);

    // Flush the remaining work.
    await resolveText('A');
    await resolveText('B');
    // Nothing else to render.
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="C" />);
  });

  // @gate enableLegacyCache
  it('a suspended update that expires', async () => {
    // Regression test. This test used to fall into an infinite loop.
    function ExpensiveText({text}) {
      // This causes the update to expire.
      Scheduler.unstable_advanceTime(10000);
      // Then something suspends.
      return <AsyncText text={text} />;
    }

    function App() {
      return (
        <Suspense fallback="Loading...">
          <ExpensiveText text="A" />
          <ExpensiveText text="B" />
          <ExpensiveText text="C" />
        </Suspense>
      );
    }

    ReactNoop.render(<App />);
    await waitForAll([
      'Suspend! [A]',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
      'Suspend! [C]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput('Loading...');

    await resolveText('A');
    await resolveText('B');
    await resolveText('C');

    await waitForAll(['A', 'B', 'C']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
        <span prop="C" />
      </>,
    );
  });

  describe('legacy mode mode', () => {
    // @gate enableLegacyCache && !disableLegacyMode
    it('times out immediately', async () => {
      function App() {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Result" />
          </Suspense>
        );
      }

      // Times out immediately, ignoring the specified threshold.
      ReactNoop.renderLegacySyncRoot(<App />);
      assertLog(['Suspend! [Result]', 'Loading...']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

      await act(() => {
        resolveText('Result');
      });

      assertLog(['Result']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Result" />);
    });

    // @gate enableLegacyCache && !disableLegacyMode
    it('times out immediately when Suspense is in legacy mode', async () => {
      class UpdatingText extends React.Component {
        state = {step: 1};
        render() {
          return <AsyncText text={`Step: ${this.state.step}`} />;
        }
      }

      function Spinner() {
        return (
          <Fragment>
            <Text text="Loading (1)" />
            <Text text="Loading (2)" />
            <Text text="Loading (3)" />
          </Fragment>
        );
      }

      const text = React.createRef(null);
      function App() {
        return (
          <Suspense fallback={<Spinner />}>
            <UpdatingText ref={text} />
            <Text text="Sibling" />
          </Suspense>
        );
      }

      // Initial mount.
      await seedNextTextCache('Step: 1');
      ReactNoop.renderLegacySyncRoot(<App />);
      assertLog(['Step: 1', 'Sibling']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Step: 1" />
          <span prop="Sibling" />
        </>,
      );

      // Update.
      text.current.setState({step: 2}, () =>
        Scheduler.log('Update did commit'),
      );

      expect(ReactNoop.flushNextYield()).toEqual([
        'Suspend! [Step: 2]',
        'Loading (1)',
        'Loading (2)',
        'Loading (3)',
        'Update did commit',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="Step: 1" />
          <span hidden={true} prop="Sibling" />
          <span prop="Loading (1)" />
          <span prop="Loading (2)" />
          <span prop="Loading (3)" />
        </>,
      );

      await act(() => {
        resolveText('Step: 2');
      });
      assertLog(['Step: 2']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="Step: 2" />
          <span prop="Sibling" />
        </>,
      );
    });

    // @gate enableLegacyCache && !disableLegacyMode
    it('does not re-render siblings in loose mode', async () => {
      class TextWithLifecycle extends React.Component {
        componentDidMount() {
          Scheduler.log(`Mount [${this.props.text}]`);
        }
        componentDidUpdate() {
          Scheduler.log(`Update [${this.props.text}]`);
        }
        render() {
          return <Text {...this.props} />;
        }
      }

      class AsyncTextWithLifecycle extends React.Component {
        componentDidMount() {
          Scheduler.log(`Mount [${this.props.text}]`);
        }
        componentDidUpdate() {
          Scheduler.log(`Update [${this.props.text}]`);
        }
        render() {
          return <AsyncText {...this.props} />;
        }
      }

      function App() {
        return (
          <Suspense fallback={<TextWithLifecycle text="Loading..." />}>
            <TextWithLifecycle text="A" />
            <AsyncTextWithLifecycle text="B" />
            <TextWithLifecycle text="C" />
          </Suspense>
        );
      }

      ReactNoop.renderLegacySyncRoot(<App />, () =>
        Scheduler.log('Commit root'),
      );
      assertLog([
        'A',
        'Suspend! [B]',
        'C',

        'Loading...',
        'Mount [A]',
        'Mount [B]',
        'Mount [C]',
        // This should be a mount, not an update.
        'Mount [Loading...]',
        'Commit root',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="A" />
          <span hidden={true} prop="C" />

          <span prop="Loading..." />
        </>,
      );

      await act(() => {
        resolveText('B');
      });

      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="A" />
          <span prop="B" />
          <span prop="C" />
        </>,
      );
    });

    // @gate enableLegacyCache && !disableLegacyMode
    it('suspends inside constructor', async () => {
      class AsyncTextInConstructor extends React.Component {
        constructor(props) {
          super(props);
          const text = props.text;
          Scheduler.log('constructor');
          readText(text);
          this.state = {text};
        }
        componentDidMount() {
          Scheduler.log('componentDidMount');
        }
        render() {
          Scheduler.log(this.state.text);
          return <span prop={this.state.text} />;
        }
      }

      ReactNoop.renderLegacySyncRoot(
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncTextInConstructor text="Hi" />
        </Suspense>,
      );

      assertLog(['constructor', 'Suspend! [Hi]', 'Loading...']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

      await act(() => {
        resolveText('Hi');
      });

      assertLog(['constructor', 'Hi', 'componentDidMount']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Hi" />);
    });

    // @gate enableLegacyCache && !disableLegacyMode
    it('does not infinite loop if fallback contains lifecycle method', async () => {
      class Fallback extends React.Component {
        state = {
          name: 'foo',
        };
        componentDidMount() {
          this.setState({
            name: 'bar',
          });
        }
        render() {
          return <Text text="Loading..." />;
        }
      }

      class Demo extends React.Component {
        render() {
          return (
            <Suspense fallback={<Fallback />}>
              <AsyncText text="Hi" />
            </Suspense>
          );
        }
      }

      ReactNoop.renderLegacySyncRoot(<Demo />);

      assertLog([
        'Suspend! [Hi]',
        'Loading...',
        // Re-render due to lifecycle update
        'Loading...',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);
      await act(() => {
        resolveText('Hi');
      });
      assertLog(['Hi']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Hi" />);
    });

    if (global.__PERSISTENT__) {
      // @gate enableLegacyCache && !disableLegacyMode
      it('hides/unhides suspended children before layout effects fire (persistent)', async () => {
        const {useRef, useLayoutEffect} = React;

        function Parent() {
          const child = useRef(null);

          useLayoutEffect(() => {
            Scheduler.log(ReactNoop.getPendingChildrenAsJSX());
          });

          return (
            <span ref={child} hidden={false}>
              <AsyncText text="Hi" />
            </span>
          );
        }

        function App(props) {
          return (
            <Suspense fallback={<Text text="Loading..." />}>
              <Parent />
            </Suspense>
          );
        }

        ReactNoop.renderLegacySyncRoot(<App middleText="B" />);

        assertLog([
          'Suspend! [Hi]',
          'Loading...',
          // The child should have already been hidden
          <>
            <span hidden={true} />
            <span prop="Loading..." />
          </>,
        ]);

        await act(() => {
          resolveText('Hi');
        });
        assertLog(['Hi']);
      });
    } else {
      // @gate enableLegacyCache && !disableLegacyMode
      it('hides/unhides suspended children before layout effects fire (mutation)', async () => {
        const {useRef, useLayoutEffect} = React;

        function Parent() {
          const child = useRef(null);

          useLayoutEffect(() => {
            Scheduler.log('Child is hidden: ' + child.current.hidden);
          });

          return (
            <span ref={child} hidden={false}>
              <AsyncText text="Hi" />
            </span>
          );
        }

        function App(props) {
          return (
            <Suspense fallback={<Text text="Loading..." />}>
              <Parent />
            </Suspense>
          );
        }

        ReactNoop.renderLegacySyncRoot(<App middleText="B" />);

        assertLog([
          'Suspend! [Hi]',
          'Loading...',
          // The child should have already been hidden
          'Child is hidden: true',
        ]);

        await act(() => {
          resolveText('Hi');
        });

        assertLog(['Hi']);
      });
    }

    // @gate enableLegacyCache && !disableLegacyMode
    it('handles errors in the return path of a component that suspends', async () => {
      // Covers an edge case where an error is thrown inside the complete phase
      // of a component that is in the return path of a component that suspends.
      // The second error should also be handled (i.e. able to be captured by
      // an error boundary.
      class ErrorBoundary extends React.Component {
        state = {error: null};
        static getDerivedStateFromError(error, errorInfo) {
          return {error};
        }
        render() {
          if (this.state.error) {
            return `Caught an error: ${this.state.error.message}`;
          }
          return this.props.children;
        }
      }

      ReactNoop.renderLegacySyncRoot(
        <ErrorBoundary>
          <Suspense fallback="Loading...">
            <errorInCompletePhase>
              <AsyncText text="Async" />
            </errorInCompletePhase>
          </Suspense>
        </ErrorBoundary>,
      );

      assertLog(['Suspend! [Async]']);
      expect(ReactNoop).toMatchRenderedOutput(
        'Caught an error: Error in host config.',
      );
    });

    // @gate !disableLegacyMode
    it('does not drop mounted effects', async () => {
      const never = {then() {}};

      let setShouldSuspend;
      function App() {
        const [shouldSuspend, _setShouldSuspend] = React.useState(0);
        setShouldSuspend = _setShouldSuspend;
        return (
          <Suspense fallback="Loading...">
            <Child shouldSuspend={shouldSuspend} />
          </Suspense>
        );
      }

      function Child({shouldSuspend}) {
        if (shouldSuspend) {
          throw never;
        }

        React.useEffect(() => {
          Scheduler.log('Mount');
          return () => {
            Scheduler.log('Unmount');
          };
        }, []);

        return 'Child';
      }

      const root = ReactNoop.createLegacyRoot(null);
      await act(() => {
        root.render(<App />);
      });
      assertLog(['Mount']);
      expect(root).toMatchRenderedOutput('Child');

      // Suspend the child. This puts it into an inconsistent state.
      await act(() => {
        setShouldSuspend(true);
      });
      expect(root).toMatchRenderedOutput('Loading...');

      // Unmount everything
      await act(() => {
        root.render(null);
      });
      assertLog(['Unmount']);
    });
  });

  // @gate enableLegacyCache && !disableLegacyMode
  it('does not call lifecycles of a suspended component', async () => {
    class TextWithLifecycle extends React.Component {
      componentDidMount() {
        Scheduler.log(`Mount [${this.props.text}]`);
      }
      componentDidUpdate() {
        Scheduler.log(`Update [${this.props.text}]`);
      }
      componentWillUnmount() {
        Scheduler.log(`Unmount [${this.props.text}]`);
      }
      render() {
        return <Text {...this.props} />;
      }
    }

    class AsyncTextWithLifecycle extends React.Component {
      componentDidMount() {
        Scheduler.log(`Mount [${this.props.text}]`);
      }
      componentDidUpdate() {
        Scheduler.log(`Update [${this.props.text}]`);
      }
      componentWillUnmount() {
        Scheduler.log(`Unmount [${this.props.text}]`);
      }
      render() {
        const text = this.props.text;
        readText(text);
        Scheduler.log(text);
        return <span prop={text} />;
      }
    }

    function App() {
      return (
        <Suspense fallback={<TextWithLifecycle text="Loading..." />}>
          <TextWithLifecycle text="A" />
          <AsyncTextWithLifecycle text="B" />
          <TextWithLifecycle text="C" />
        </Suspense>
      );
    }

    ReactNoop.renderLegacySyncRoot(<App />, () => Scheduler.log('Commit root'));
    assertLog([
      'A',
      'Suspend! [B]',
      'C',
      'Loading...',

      'Mount [A]',
      // B's lifecycle should not fire because it suspended
      // 'Mount [B]',
      'Mount [C]',
      'Mount [Loading...]',
      'Commit root',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true} prop="A" />
        <span hidden={true} prop="C" />
        <span prop="Loading..." />
      </>,
    );
  });

  // @gate enableLegacyCache && !disableLegacyMode
  it('does not call lifecycles of a suspended component (hooks)', async () => {
    function TextWithLifecycle(props) {
      React.useLayoutEffect(() => {
        Scheduler.log(`Layout Effect [${props.text}]`);
        return () => {
          Scheduler.log(`Destroy Layout Effect [${props.text}]`);
        };
      }, [props.text]);
      React.useEffect(() => {
        Scheduler.log(`Effect [${props.text}]`);
        return () => {
          Scheduler.log(`Destroy Effect [${props.text}]`);
        };
      }, [props.text]);
      return <Text {...props} />;
    }

    function AsyncTextWithLifecycle(props) {
      React.useLayoutEffect(() => {
        Scheduler.log(`Layout Effect [${props.text}]`);
        return () => {
          Scheduler.log(`Destroy Layout Effect [${props.text}]`);
        };
      }, [props.text]);
      React.useEffect(() => {
        Scheduler.log(`Effect [${props.text}]`);
        return () => {
          Scheduler.log(`Destroy Effect [${props.text}]`);
        };
      }, [props.text]);
      const text = props.text;
      readText(text);
      Scheduler.log(text);
      return <span prop={text} />;
    }

    function App({text}) {
      return (
        <Suspense fallback={<TextWithLifecycle text="Loading..." />}>
          <TextWithLifecycle text="A" />
          <AsyncTextWithLifecycle text={text} />
          <TextWithLifecycle text="C" />
        </Suspense>
      );
    }

    ReactNoop.renderLegacySyncRoot(<App text="B" />, () =>
      Scheduler.log('Commit root'),
    );
    assertLog([
      'A',
      'Suspend! [B]',
      'C',
      'Loading...',

      'Layout Effect [A]',
      // B's effect should not fire because it suspended
      // 'Layout Effect [B]',
      'Layout Effect [C]',
      'Layout Effect [Loading...]',
      'Commit root',
    ]);

    // Flush passive effects.
    await waitForAll([
      'Effect [A]',
      // B's effect should not fire because it suspended
      // 'Effect [B]',
      'Effect [C]',
      'Effect [Loading...]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true} prop="A" />
        <span hidden={true} prop="C" />
        <span prop="Loading..." />
      </>,
    );

    await act(() => {
      resolveText('B');
    });

    assertLog([
      'B',
      'Destroy Layout Effect [Loading...]',
      'Layout Effect [B]',
      'Destroy Effect [Loading...]',
      'Effect [B]',
    ]);

    // Update
    ReactNoop.renderLegacySyncRoot(<App text="B2" />, () =>
      Scheduler.log('Commit root'),
    );

    assertLog([
      'A',
      'Suspend! [B2]',
      'C',
      'Loading...',

      // B2's effect should not fire because it suspended
      // 'Layout Effect [B2]',
      'Layout Effect [Loading...]',
      'Commit root',
    ]);

    // Flush passive effects.
    await waitForAll([
      // B2's effect should not fire because it suspended
      // 'Effect [B2]',
      'Effect [Loading...]',
    ]);

    await act(() => {
      resolveText('B2');
    });

    assertLog([
      'B2',
      'Destroy Layout Effect [Loading...]',
      'Destroy Layout Effect [B]',
      'Layout Effect [B2]',
      'Destroy Effect [Loading...]',
      'Destroy Effect [B]',
      'Effect [B2]',
    ]);
  });

  // @gate enableLegacyCache
  it('does not suspends if a fallback has been shown for a long time', async () => {
    function Foo() {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="A" />
          <Suspense fallback={<Text text="Loading more..." />}>
            <AsyncText text="B" />
          </Suspense>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    // Start rendering
    await waitForAll([
      'Foo',
      // A suspends
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
      'Loading more...',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

    // Wait a long time.
    Scheduler.unstable_advanceTime(5000);
    await advanceTimers(5000);

    // Retry with the new content.
    await resolveText('A');
    await waitForAll([
      'A',
      // B suspends
      'Suspend! [B]',
      'Loading more...',
      // pre-warming
      'Suspend! [B]',
    ]);

    // Because we've already been waiting for so long we've exceeded
    // our threshold and we show the next level immediately.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="Loading more..." />
      </>,
    );

    // Flush the last promise completely
    await act(() => resolveText('B'));
    // Renders successfully
    assertLog(['B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('throttles content from appearing if a fallback was shown recently', async () => {
    function Foo() {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="A" />
          <Suspense fallback={<Text text="Loading more..." />}>
            <AsyncText text="B" />
          </Suspense>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    // Start rendering
    await waitForAll([
      'Foo',
      // A suspends
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
      'Loading more...',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

    await act(async () => {
      await resolveText('A');

      // Retry with the new content.
      await waitForAll([
        'A',
        // B suspends
        'Suspend! [B]',
        'Loading more...',
      ]);
      // Because we've already been waiting for so long we can
      // wait a bit longer. Still nothing...
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

      // Before we commit another Promise resolves.
      // We're still showing the first loading state.
      await resolveText('B');
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

      // Restart and render the complete content.
      await waitForAll(['A', 'B']);

      if (gate(flags => flags.alwaysThrottleRetries)) {
        // Correct behavior:
        //
        // The tree will finish but we won't commit the result yet because the fallback appeared recently.
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);
      } else {
        // Old behavior, gated until this rolls out at Meta:
        //
        // TODO: Because this render was the result of a retry, and a fallback
        // was shown recently, we should suspend and remain on the fallback for
        // little bit longer. We currently only do this if there's still
        // remaining fallbacks in the tree, but we should do it for all retries.
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="A" />
            <span prop="B" />
          </>,
        );
      }
    });
    assertLog([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('throttles content from appearing if a fallback was filled in recently', async () => {
    function Foo() {
      Scheduler.log('Foo');
      return (
        <>
          <Suspense fallback={<Text text="Loading A..." />}>
            <AsyncText text="A" />
          </Suspense>
          <Suspense fallback={<Text text="Loading B..." />}>
            <AsyncText text="B" />
          </Suspense>
        </>
      );
    }

    ReactNoop.render(<Foo />);
    // Start rendering
    await waitForAll([
      'Foo',
      'Suspend! [A]',
      'Loading A...',
      'Suspend! [B]',
      'Loading B...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Loading A..." />
        <span prop="Loading B..." />
      </>,
    );

    // Resolve only A. B will still be loading.
    await act(async () => {
      await resolveText('A');

      // If we didn't advance the time here, A would not commit; it would
      // be throttled because the fallback would have appeared too recently.
      Scheduler.unstable_advanceTime(10000);
      jest.advanceTimersByTime(10000);
      if (gate(flags => flags.enableYieldingBeforePassive)) {
        // Passive effects.
        await waitForPaint([]);
      }
      await waitForPaint(['A']);
      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span prop="A" />
          <span prop="Loading B..." />
        </>,
      );
    });

    // Advance by a small amount of time. For testing purposes, this is meant
    // to be just under the throttling interval. It's a heurstic, though, so
    // if we adjust the heuristic we might have to update this test, too.
    Scheduler.unstable_advanceTime(200);
    jest.advanceTimersByTime(200);

    // Now resolve B.
    await act(async () => {
      await resolveText('B');
      await waitForPaint(['B']);

      if (gate(flags => flags.alwaysThrottleRetries)) {
        // B should not commit yet. Even though it's been a long time since its
        // fallback was shown, it hasn't been long since A appeared. So B's
        // appearance is throttled to reduce jank.
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="A" />
            <span prop="Loading B..." />
          </>,
        );

        // Advance time a little bit more. Now it commits because enough time
        // has passed.
        Scheduler.unstable_advanceTime(100);
        jest.advanceTimersByTime(100);
        await waitForAll([]);
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="A" />
            <span prop="B" />
          </>,
        );
      } else {
        // Old behavior, gated until this rolls out at Meta:
        //
        // B appears immediately, without being throttled.
        expect(ReactNoop).toMatchRenderedOutput(
          <>
            <span prop="A" />
            <span prop="B" />
          </>,
        );
      }
    });
  });

  // TODO: flip to "warns" when this is implemented again.
  // @gate enableLegacyCache
  it('does not warn when a low priority update suspends inside a high priority update for functional components', async () => {
    let _setShow;
    function App() {
      const [show, setShow] = React.useState(false);
      _setShow = setShow;
      return (
        <Suspense fallback="Loading...">
          {show && <AsyncText text="A" />}
        </Suspense>
      );
    }

    await act(() => {
      ReactNoop.render(<App />);
    });

    // TODO: assertConsoleErrorDev() when the warning is implemented again.
    await act(() => {
      ReactNoop.flushSync(() => _setShow(true));
    });
  });

  // TODO: flip to "warns" when this is implemented again.
  // @gate enableLegacyCache
  it('does not warn when a low priority update suspends inside a high priority update for class components', async () => {
    let show;
    class App extends React.Component {
      state = {show: false};

      render() {
        show = () => this.setState({show: true});
        return (
          <Suspense fallback="Loading...">
            {this.state.show && <AsyncText text="A" />}
          </Suspense>
        );
      }
    }

    await act(() => {
      ReactNoop.render(<App />);
    });

    // TODO: assertConsoleErrorDev() when the warning is implemented again.
    await act(() => {
      ReactNoop.flushSync(() => show());
    });
  });

  // @gate enableLegacyCache
  it('does not warn about wrong Suspense priority if no new fallbacks are shown', async () => {
    let showB;
    class App extends React.Component {
      state = {showB: false};

      render() {
        showB = () => this.setState({showB: true});
        return (
          <Suspense fallback="Loading...">
            {<AsyncText text="A" />}
            {this.state.showB && <AsyncText text="B" />}
          </Suspense>
        );
      }
    }

    await act(() => {
      ReactNoop.render(<App />);
    });

    assertLog([
      'Suspend! [A]',
      // pre-warming
      'Suspend! [A]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput('Loading...');

    await act(() => {
      ReactNoop.flushSync(() => showB());
    });

    assertLog([
      'Suspend! [A]',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
    ]);
  });

  // TODO: flip to "warns" when this is implemented again.
  // @gate enableLegacyCache
  it(
    'does not warn when component that triggered user-blocking update is between Suspense boundary ' +
      'and component that suspended',
    async () => {
      let _setShow;
      function A() {
        const [show, setShow] = React.useState(false);
        _setShow = setShow;
        return show && <AsyncText text="A" />;
      }
      function App() {
        return (
          <Suspense fallback="Loading...">
            <A />
          </Suspense>
        );
      }
      await act(() => {
        ReactNoop.render(<App />);
      });

      // TODO: assertConsoleErrorDev() when the warning is implemented again.
      await act(() => {
        ReactNoop.flushSync(() => _setShow(true));
      });
    },
  );

  // @gate enableLegacyCache
  it('normal priority updates suspending do not warn for class components', async () => {
    let show;
    class App extends React.Component {
      state = {show: false};

      render() {
        show = () => this.setState({show: true});
        return (
          <Suspense fallback="Loading...">
            {this.state.show && <AsyncText text="A" />}
          </Suspense>
        );
      }
    }

    await act(() => {
      ReactNoop.render(<App />);
    });

    // also make sure lowpriority is okay
    await act(() => show(true));

    assertLog([
      'Suspend! [A]',
      // pre-warming
      'Suspend! [A]',
    ]);
    await resolveText('A');

    expect(ReactNoop).toMatchRenderedOutput('Loading...');
  });

  // @gate enableLegacyCache
  it('normal priority updates suspending do not warn for functional components', async () => {
    let _setShow;
    function App() {
      const [show, setShow] = React.useState(false);
      _setShow = setShow;
      return (
        <Suspense fallback="Loading...">
          {show && <AsyncText text="A" />}
        </Suspense>
      );
    }

    await act(() => {
      ReactNoop.render(<App />);
    });

    // also make sure lowpriority is okay
    await act(() => _setShow(true));

    assertLog([
      'Suspend! [A]',
      // pre-warming
      'Suspend! [A]',
    ]);
    await resolveText('A');

    expect(ReactNoop).toMatchRenderedOutput('Loading...');
  });

  // @gate enableLegacyCache && enableSuspenseAvoidThisFallback
  it('shows the parent fallback if the inner fallback should be avoided', async () => {
    function Foo({showC}) {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Initial load..." />}>
          <Suspense
            unstable_avoidThisFallback={true}
            fallback={<Text text="Updating..." />}>
            <AsyncText text="A" />
            {showC ? <AsyncText text="C" /> : null}
          </Suspense>
          <Text text="B" />
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([
      'Foo',
      'Suspend! [A]',
      'Initial load...',
      // pre-warming
      'Suspend! [A]',
      'B',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="Initial load..." />);

    // Eventually we resolve and show the data.
    await act(() => resolveText('A'));
    assertLog(['A', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );

    // Update to show C
    ReactNoop.render(<Foo showC={true} />);
    await waitForAll([
      'Foo',
      'A',
      'Suspend! [C]',
      'Updating...',
      'B',
      // pre-warming
      'A',
      'Suspend! [C]',
    ]);
    // Flush to skip suspended time.
    Scheduler.unstable_advanceTime(600);
    await advanceTimers(600);
    // Since the optional suspense boundary is already showing its content,
    // we have to use the inner fallback instead.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" hidden={true} />
        <span prop="Updating..." />
        <span prop="B" />
      </>,
    );

    // Later we load the data.
    await act(() => resolveText('C'));
    assertLog(['A', 'C']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="C" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('does not show the parent fallback if the inner fallback is not defined', async () => {
    function Foo({showC}) {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Initial load..." />}>
          <Suspense>
            <AsyncText text="A" />
            {showC ? <AsyncText text="C" /> : null}
          </Suspense>
          <Text text="B" />
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([
      'Foo',
      'Suspend! [A]',
      'B',
      // null
      // pre-warming
      'Suspend! [A]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);

    // Eventually we resolve and show the data.
    await act(() => resolveText('A'));
    assertLog(['A']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );

    // Update to show C
    ReactNoop.render(<Foo showC={true} />);
    await waitForAll([
      'Foo',
      'A',
      'Suspend! [C]',
      // null
      'B',
      // pre-warming
      'A',
      'Suspend! [C]',
    ]);
    // Flush to skip suspended time.
    Scheduler.unstable_advanceTime(600);
    await advanceTimers(600);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" hidden={true} />
        <span prop="B" />
      </>,
    );

    // Later we load the data.
    await act(() => resolveText('C'));
    assertLog(['A', 'C']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="C" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('favors showing the inner fallback for nested top level avoided fallback', async () => {
    function Foo({showB}) {
      Scheduler.log('Foo');
      return (
        <Suspense
          unstable_avoidThisFallback={true}
          fallback={<Text text="Loading A..." />}>
          <Text text="A" />
          <Suspense
            unstable_avoidThisFallback={true}
            fallback={<Text text="Loading B..." />}>
            <AsyncText text="B" />
          </Suspense>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll([
      'Foo',
      'A',
      'Suspend! [B]',
      'Loading B...',
      // pre-warming
      'Suspend! [B]',
    ]);
    // Flush to skip suspended time.
    Scheduler.unstable_advanceTime(600);
    await advanceTimers(600);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="Loading B..." />
      </>,
    );
  });

  // @gate enableLegacyCache && enableSuspenseAvoidThisFallback
  it('keeps showing an avoided parent fallback if it is already showing', async () => {
    function Foo({showB}) {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Initial load..." />}>
          <Suspense
            unstable_avoidThisFallback={true}
            fallback={<Text text="Loading A..." />}>
            <Text text="A" />
            {showB ? (
              <Suspense
                unstable_avoidThisFallback={true}
                fallback={<Text text="Loading B..." />}>
                <AsyncText text="B" />
              </Suspense>
            ) : null}
          </Suspense>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll(['Foo', 'A']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

    React.startTransition(() => {
      ReactNoop.render(<Foo showB={true} />);
    });

    await waitForAll(['Foo', 'A', 'Suspend! [B]', 'Loading B...']);

    // Transitions never fall back.
    expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
  });

  // @gate enableLegacyCache
  it('keeps showing an undefined fallback if it is already showing', async () => {
    function Foo({showB}) {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Initial load..." />}>
          <Suspense fallback={undefined}>
            <Text text="A" />
            {showB ? (
              <Suspense fallback={undefined}>
                <AsyncText text="B" />
              </Suspense>
            ) : null}
          </Suspense>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);
    await waitForAll(['Foo', 'A']);
    expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

    React.startTransition(() => {
      ReactNoop.render(<Foo showB={true} />);
    });

    await waitForAll([
      'Foo',
      'A',
      'Suspend! [B]',
      // Null
      // pre-warming
      'Suspend! [B]',
    ]);
    // Still suspended.
    expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

    // Flush to skip suspended time.
    Scheduler.unstable_advanceTime(600);
    await advanceTimers(600);

    expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
  });

  describe('startTransition', () => {
    // @gate enableLegacyCache
    it('top level render', async () => {
      function App({page}) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={page} />
          </Suspense>
        );
      }

      // Initial render.
      React.startTransition(() => ReactNoop.render(<App page="A" />));

      await waitForAll([
        'Suspend! [A]',
        'Loading...',
        // pre-warming
        'Suspend! [A]',
      ]);
      // Only a short time is needed to unsuspend the initial loading state.
      Scheduler.unstable_advanceTime(400);
      await advanceTimers(400);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

      // Later we load the data.
      await act(() => resolveText('A'));
      assertLog(['A']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Start transition.
      React.startTransition(() => ReactNoop.render(<App page="B" />));

      await waitForAll(['Suspend! [B]', 'Loading...']);
      Scheduler.unstable_advanceTime(100000);
      await advanceTimers(100000);
      // Even after lots of time has passed, we have still not yet flushed the
      // loading state.
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
      // Later we load the data.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);
    });

    // @gate enableLegacyCache
    it('hooks', async () => {
      let transitionToPage;
      function App() {
        const [page, setPage] = React.useState('none');
        transitionToPage = setPage;
        if (page === 'none') {
          return null;
        }
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={page} />
          </Suspense>
        );
      }

      ReactNoop.render(<App />);
      await waitForAll([]);

      // Initial render.
      await act(async () => {
        React.startTransition(() => transitionToPage('A'));

        await waitForAll([
          'Suspend! [A]',
          'Loading...',
          // pre-warming
          'Suspend! [A]',
        ]);
        // Only a short time is needed to unsuspend the initial loading state.
        Scheduler.unstable_advanceTime(400);
        await advanceTimers(400);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);
      });

      // Later we load the data.
      await act(() => resolveText('A'));
      assertLog(['A']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Start transition.
      await act(async () => {
        React.startTransition(() => transitionToPage('B'));

        await waitForAll(['Suspend! [B]', 'Loading...']);
        Scheduler.unstable_advanceTime(100000);
        await advanceTimers(100000);
        // Even after lots of time has passed, we have still not yet flushed the
        // loading state.
        expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
      });
      // Later we load the data.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);
    });

    // @gate enableLegacyCache
    it('classes', async () => {
      let transitionToPage;
      class App extends React.Component {
        state = {page: 'none'};
        render() {
          transitionToPage = page => this.setState({page});
          const page = this.state.page;
          if (page === 'none') {
            return null;
          }
          return (
            <Suspense fallback={<Text text="Loading..." />}>
              <AsyncText text={page} />
            </Suspense>
          );
        }
      }

      ReactNoop.render(<App />);
      await waitForAll([]);

      // Initial render.
      await act(async () => {
        React.startTransition(() => transitionToPage('A'));

        await waitForAll([
          'Suspend! [A]',
          'Loading...',
          // pre-warming
          'Suspend! [A]',
        ]);
        // Only a short time is needed to unsuspend the initial loading state.
        Scheduler.unstable_advanceTime(400);
        await advanceTimers(400);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);
      });

      // Later we load the data.
      await act(() => resolveText('A'));
      assertLog(['A']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Start transition.
      await act(async () => {
        React.startTransition(() => transitionToPage('B'));

        await waitForAll(['Suspend! [B]', 'Loading...']);
        Scheduler.unstable_advanceTime(100000);
        await advanceTimers(100000);
        // Even after lots of time has passed, we have still not yet flushed the
        // loading state.
        expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
      });
      // Later we load the data.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);
    });
  });

  describe('delays transitions when using React.startTransition', () => {
    // @gate enableLegacyCache
    it('top level render', async () => {
      function App({page}) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={page} />
          </Suspense>
        );
      }

      // Initial render.
      React.startTransition(() => ReactNoop.render(<App page="A" />));

      await waitForAll([
        'Suspend! [A]',
        'Loading...',
        // pre-warming
        'Suspend! [A]',
      ]);
      // Only a short time is needed to unsuspend the initial loading state.
      Scheduler.unstable_advanceTime(400);
      await advanceTimers(400);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);

      // Later we load the data.
      await act(() => resolveText('A'));
      assertLog(['A']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Start transition.
      React.startTransition(() => ReactNoop.render(<App page="B" />));

      await waitForAll(['Suspend! [B]', 'Loading...']);
      Scheduler.unstable_advanceTime(2999);
      await advanceTimers(2999);
      // Since the timeout is infinite (or effectively infinite),
      // we have still not yet flushed the loading state.
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Later we load the data.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);

      // Start a long (infinite) transition.
      React.startTransition(() => ReactNoop.render(<App page="C" />));
      await waitForAll(['Suspend! [C]', 'Loading...']);

      // Even after lots of time has passed, we have still not yet flushed the
      // loading state.
      Scheduler.unstable_advanceTime(100000);
      await advanceTimers(100000);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);
    });

    // @gate enableLegacyCache
    it('hooks', async () => {
      let transitionToPage;
      function App() {
        const [page, setPage] = React.useState('none');
        transitionToPage = setPage;
        if (page === 'none') {
          return null;
        }
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text={page} />
          </Suspense>
        );
      }

      ReactNoop.render(<App />);
      await waitForAll([]);

      // Initial render.
      await act(async () => {
        React.startTransition(() => transitionToPage('A'));

        await waitForAll([
          'Suspend! [A]',
          'Loading...',
          // pre-warming
          'Suspend! [A]',
        ]);
        // Only a short time is needed to unsuspend the initial loading state.
        Scheduler.unstable_advanceTime(400);
        await advanceTimers(400);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);
      });

      // Later we load the data.
      await act(() => resolveText('A'));
      assertLog(['A']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Start transition.
      await act(async () => {
        React.startTransition(() => transitionToPage('B'));

        await waitForAll(['Suspend! [B]', 'Loading...']);

        Scheduler.unstable_advanceTime(2999);
        await advanceTimers(2999);
        // Since the timeout is infinite (or effectively infinite),
        // we have still not yet flushed the loading state.
        expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
      });

      // Later we load the data.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);

      // Start a long (infinite) transition.
      await act(async () => {
        React.startTransition(() => transitionToPage('C'));

        await waitForAll(['Suspend! [C]', 'Loading...']);

        // Even after lots of time has passed, we have still not yet flushed the
        // loading state.
        Scheduler.unstable_advanceTime(100000);
        await advanceTimers(100000);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);
      });
    });

    // @gate enableLegacyCache
    it('classes', async () => {
      let transitionToPage;
      class App extends React.Component {
        state = {page: 'none'};
        render() {
          transitionToPage = page => this.setState({page});
          const page = this.state.page;
          if (page === 'none') {
            return null;
          }
          return (
            <Suspense fallback={<Text text="Loading..." />}>
              <AsyncText text={page} />
            </Suspense>
          );
        }
      }

      ReactNoop.render(<App />);
      await waitForAll([]);

      // Initial render.
      await act(async () => {
        React.startTransition(() => transitionToPage('A'));

        await waitForAll([
          'Suspend! [A]',
          'Loading...',
          // pre-warming
          'Suspend! [A]',
        ]);
        // Only a short time is needed to unsuspend the initial loading state.
        Scheduler.unstable_advanceTime(400);
        await advanceTimers(400);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="Loading..." />);
      });

      // Later we load the data.
      await act(() => resolveText('A'));
      assertLog(['A']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);

      // Start transition.
      await act(async () => {
        React.startTransition(() => transitionToPage('B'));

        await waitForAll(['Suspend! [B]', 'Loading...']);
        Scheduler.unstable_advanceTime(2999);
        await advanceTimers(2999);
        // Since the timeout is infinite (or effectively infinite),
        // we have still not yet flushed the loading state.
        expect(ReactNoop).toMatchRenderedOutput(<span prop="A" />);
      });

      // Later we load the data.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);

      // Start a long (infinite) transition.
      await act(async () => {
        React.startTransition(() => transitionToPage('C'));

        await waitForAll(['Suspend! [C]', 'Loading...']);

        // Even after lots of time has passed, we have still not yet flushed the
        // loading state.
        Scheduler.unstable_advanceTime(100000);
        await advanceTimers(100000);
        expect(ReactNoop).toMatchRenderedOutput(<span prop="B" />);
      });
    });
  });

  // @gate enableLegacyCache && enableSuspenseAvoidThisFallback
  it('do not show placeholder when updating an avoided boundary with startTransition', async () => {
    function App({page}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="Hi!" />
          <Suspense
            fallback={<Text text={'Loading ' + page + '...'} />}
            unstable_avoidThisFallback={true}>
            <AsyncText text={page} />
          </Suspense>
        </Suspense>
      );
    }

    // Initial render.
    ReactNoop.render(<App page="A" />);
    await waitForAll([
      'Hi!',
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Hi!',
      'Suspend! [A]',
    ]);
    await act(() => resolveText('A'));
    assertLog(['Hi!', 'A']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="A" />
      </>,
    );

    // Start transition.
    React.startTransition(() => ReactNoop.render(<App page="B" />));

    await waitForAll(['Hi!', 'Suspend! [B]', 'Loading B...']);

    // Suspended
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="A" />
      </>,
    );
    Scheduler.unstable_advanceTime(1800);
    await advanceTimers(1800);
    await waitForAll([]);
    // We should still be suspended here because this loading state should be avoided.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="A" />
      </>,
    );
    await resolveText('B');
    await waitForAll(['Hi!', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="B" />
      </>,
    );
  });

  // @gate enableLegacyCache && enableSuspenseAvoidThisFallback
  it('do not show placeholder when mounting an avoided boundary with startTransition', async () => {
    function App({page}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="Hi!" />
          {page === 'A' ? (
            <Text text="A" />
          ) : (
            <Suspense
              fallback={<Text text={'Loading ' + page + '...'} />}
              unstable_avoidThisFallback={true}>
              <AsyncText text={page} />
            </Suspense>
          )}
        </Suspense>
      );
    }

    // Initial render.
    ReactNoop.render(<App page="A" />);
    await waitForAll(['Hi!', 'A']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="A" />
      </>,
    );

    // Start transition.
    React.startTransition(() => ReactNoop.render(<App page="B" />));

    await waitForAll(['Hi!', 'Suspend! [B]', 'Loading B...']);

    // Suspended
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="A" />
      </>,
    );
    Scheduler.unstable_advanceTime(1800);
    await advanceTimers(1800);
    await waitForAll([]);
    // We should still be suspended here because this loading state should be avoided.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="A" />
      </>,
    );
    await resolveText('B');
    await waitForAll(['Hi!', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span prop="Hi!" />
        <span prop="B" />
      </>,
    );
  });

  it('regression test: resets current "debug phase" after suspending', async () => {
    function App() {
      return (
        <Suspense fallback="Loading...">
          <Foo suspend={false} />
        </Suspense>
      );
    }

    const thenable = {then() {}};

    let foo;
    class Foo extends React.Component {
      state = {suspend: false};
      render() {
        foo = this;

        if (this.state.suspend) {
          Scheduler.log('Suspend!');
          throw thenable;
        }

        return <Text text="Foo" />;
      }
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });

    assertLog(['Foo']);

    await act(async () => {
      foo.setState({suspend: true});

      // In the regression that this covers, we would neglect to reset the
      // current debug phase after suspending (in the catch block), so React
      // thinks we're still inside the render phase.
      await waitFor(['Suspend!']);

      // Then when this setState happens, React would incorrectly fire a warning
      // about updates that happen the render phase (only fired by classes).
      foo.setState({suspend: false});
    });

    assertLog([
      // First setState
      'Foo',
    ]);
    expect(root).toMatchRenderedOutput(<span prop="Foo" />);
  });

  // @gate enableLegacyCache && enableLegacyHidden
  it('should not render hidden content while suspended on higher pri', async () => {
    function Offscreen() {
      Scheduler.log('Offscreen');
      return 'Offscreen';
    }
    function App({showContent}) {
      React.useLayoutEffect(() => {
        Scheduler.log('Commit');
      });
      return (
        <>
          <LegacyHiddenDiv mode="hidden">
            <Offscreen />
          </LegacyHiddenDiv>
          <Suspense fallback={<Text text="Loading..." />}>
            {showContent ? <AsyncText text="A" /> : null}
          </Suspense>
        </>
      );
    }

    // Initial render.
    ReactNoop.render(<App showContent={false} />);
    await waitFor(['Commit']);
    expect(ReactNoop).toMatchRenderedOutput(<div hidden={true} />);

    // Start transition.
    React.startTransition(() => {
      ReactNoop.render(<App showContent={true} />);
    });

    await waitForAll(['Suspend! [A]', 'Loading...']);
    await resolveText('A');
    await waitFor(['A', 'Commit']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div hidden={true} />
        <span prop="A" />
      </>,
    );
    await waitForAll(['Offscreen']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div hidden={true}>Offscreen</div>
        <span prop="A" />
      </>,
    );
  });

  // @gate enableLegacyCache && enableLegacyHidden
  it('should be able to unblock higher pri content before suspended hidden', async () => {
    function Offscreen() {
      Scheduler.log('Offscreen');
      return 'Offscreen';
    }
    function App({showContent}) {
      React.useLayoutEffect(() => {
        Scheduler.log('Commit');
      });
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <LegacyHiddenDiv mode="hidden">
            <AsyncText text="A" />
            <Offscreen />
          </LegacyHiddenDiv>
          {showContent ? <AsyncText text="A" /> : null}
        </Suspense>
      );
    }

    // Initial render.
    ReactNoop.render(<App showContent={false} />);
    await waitFor(['Commit']);
    expect(ReactNoop).toMatchRenderedOutput(<div hidden={true} />);

    // Partially render through the hidden content.
    await waitFor(['Suspend! [A]']);

    // Start transition.
    React.startTransition(() => {
      ReactNoop.render(<App showContent={true} />);
    });

    await waitForAll(['Suspend! [A]', 'Loading...']);
    await resolveText('A');
    await waitFor(['A', 'Commit']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div hidden={true} />
        <span prop="A" />
      </>,
    );
    await waitForAll(['A', 'Offscreen']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div hidden={true}>
          <span prop="A" />
          Offscreen
        </div>
        <span prop="A" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it(
    'multiple updates originating inside a Suspense boundary at different ' +
      'priority levels are not dropped',
    async () => {
      const {useState} = React;
      const root = ReactNoop.createRoot();

      function Parent() {
        return (
          <>
            <Suspense fallback={<Text text="Loading..." />}>
              <Child />
            </Suspense>
          </>
        );
      }

      let setText;
      function Child() {
        const [text, _setText] = useState('A');
        setText = _setText;
        return <AsyncText text={text} />;
      }

      await seedNextTextCache('A');
      await act(() => {
        root.render(<Parent />);
      });
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<span prop="A" />);

      await act(async () => {
        // Schedule two updates that originate inside the Suspense boundary.
        // The first one causes the boundary to suspend. The second one is at
        // lower priority and unsuspends the tree.
        ReactNoop.discreteUpdates(() => {
          setText('B');
        });
        startTransition(() => {
          setText('C');
        });
        // Assert that neither update has happened yet. Both the high pri and
        // low pri updates are in the queue.
        assertLog([]);

        // Resolve this before starting to render so that C doesn't suspend.
        await resolveText('C');
      });
      assertLog([
        // First we attempt the high pri update. It suspends.
        'Suspend! [B]',
        'Loading...',
        // Then we attempt the low pri update, which finishes successfully.
        'C',
      ]);
      expect(root).toMatchRenderedOutput(<span prop="C" />);
    },
  );

  // @gate enableLegacyCache
  it(
    'fallback component can update itself even after a high pri update to ' +
      'the primary tree suspends',
    async () => {
      const {useState} = React;
      const root = ReactNoop.createRoot();

      let setAppText;
      function App() {
        const [text, _setText] = useState('A');
        setAppText = _setText;
        return (
          <>
            <Suspense fallback={<Fallback />}>
              <AsyncText text={text} />
            </Suspense>
          </>
        );
      }

      let setFallbackText;
      function Fallback() {
        const [text, _setText] = useState('Loading...');
        setFallbackText = _setText;
        return <Text text={text} />;
      }

      // Resolve the initial tree
      await seedNextTextCache('A');
      await act(() => {
        root.render(<App />);
      });
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<span prop="A" />);

      await act(async () => {
        // Schedule an update inside the Suspense boundary that suspends.
        setAppText('B');
        await waitForAll([
          'Suspend! [B]',
          'Loading...',
          // pre-warming
          'Suspend! [B]',
        ]);
      });

      expect(root).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="A" />
          <span prop="Loading..." />
        </>,
      );

      // Schedule a default pri update on the boundary, and a lower pri update
      // on the fallback. We're testing to make sure the fallback can still
      // update even though the primary tree is suspended.
      await act(() => {
        setAppText('C');
        React.startTransition(() => {
          setFallbackText('Still loading...');
        });
      });

      assertLog([
        // First try to render the high pri update. Still suspended.
        'Suspend! [C]',
        'Loading...',

        // In the expiration times model, once the high pri update suspends,
        // we can't be sure if there's additional work at a lower priority
        // that might unblock the tree. We do know that there's a lower
        // priority update *somewhere* in the entire root, though (the update
        // to the fallback). So we try rendering one more time, just in case.
        // TODO: We shouldn't need to do this with lanes, because we always
        // know exactly which lanes have pending work in each tree.
        'Suspend! [C]',

        // Then complete the update to the fallback.
        'Still loading...',
        'Suspend! [C]',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="A" />
          <span prop="Still loading..." />
        </>,
      );
    },
  );

  // @gate enableLegacyCache
  it(
    'regression: primary fragment fiber is not always part of setState ' +
      'return path',
    async () => {
      // Reproduces a bug where updates inside a suspended tree are dropped
      // because the fragment fiber we insert to wrap the hidden children is not
      // part of the return path, so it doesn't get marked during setState.
      const {useState} = React;
      const root = ReactNoop.createRoot();

      function Parent() {
        return (
          <>
            <Suspense fallback={<Text text="Loading..." />}>
              <Child />
            </Suspense>
          </>
        );
      }

      let setText;
      function Child() {
        const [text, _setText] = useState('A');
        setText = _setText;
        return <AsyncText text={text} />;
      }

      // Mount an initial tree. Resolve A so that it doesn't suspend.
      await seedNextTextCache('A');
      await act(() => {
        root.render(<Parent />);
      });
      assertLog(['A']);
      // At this point, the setState return path follows current fiber.
      expect(root).toMatchRenderedOutput(<span prop="A" />);

      // Schedule another update. This will "flip" the alternate pairs.
      await resolveText('B');
      await act(() => {
        setText('B');
      });
      assertLog(['B']);
      // Now the setState return path follows the *alternate* fiber.
      expect(root).toMatchRenderedOutput(<span prop="B" />);

      // Schedule another update. This time, we'll suspend.
      await act(() => {
        setText('C');
      });
      assertLog(['Suspend! [C]', 'Loading...', 'Suspend! [C]']);

      // Commit. This will insert a fragment fiber to wrap around the component
      // that triggered the update.
      await act(async () => {
        await advanceTimers(250);
      });
      // The fragment fiber is part of the current tree, but the setState return
      // path still follows the alternate path. That means the fragment fiber is
      // not part of the return path.
      expect(root).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="B" />
          <span prop="Loading..." />
        </>,
      );

      // Update again. This should unsuspend the tree.
      await resolveText('D');
      await act(() => {
        setText('D');
      });
      // Even though the fragment fiber is not part of the return path, we should
      // be able to finish rendering.
      assertLog(['D']);
      expect(root).toMatchRenderedOutput(<span prop="D" />);
    },
  );

  // @gate enableLegacyCache
  it(
    'regression: primary fragment fiber is not always part of setState ' +
      'return path (another case)',
    async () => {
      // Reproduces a bug where updates inside a suspended tree are dropped
      // because the fragment fiber we insert to wrap the hidden children is not
      // part of the return path, so it doesn't get marked during setState.
      const {useState} = React;
      const root = ReactNoop.createRoot();

      function Parent() {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <Child />
          </Suspense>
        );
      }

      let setText;
      function Child() {
        const [text, _setText] = useState('A');
        setText = _setText;
        return <AsyncText text={text} />;
      }

      // Mount an initial tree. Resolve A so that it doesn't suspend.
      await seedNextTextCache('A');
      await act(() => {
        root.render(<Parent />);
      });
      assertLog(['A']);
      // At this point, the setState return path follows current fiber.
      expect(root).toMatchRenderedOutput(<span prop="A" />);

      // Schedule another update. This will "flip" the alternate pairs.
      await resolveText('B');
      await act(() => {
        setText('B');
      });
      assertLog(['B']);
      // Now the setState return path follows the *alternate* fiber.
      expect(root).toMatchRenderedOutput(<span prop="B" />);

      // Schedule another update. This time, we'll suspend.
      await act(() => {
        setText('C');
      });
      assertLog([
        'Suspend! [C]',
        'Loading...',
        // pre-warming
        'Suspend! [C]',
      ]);

      // Commit. This will insert a fragment fiber to wrap around the component
      // that triggered the update.
      await act(async () => {
        await advanceTimers(250);
      });
      // The fragment fiber is part of the current tree, but the setState return
      // path still follows the alternate path. That means the fragment fiber is
      // not part of the return path.
      expect(root).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="B" />
          <span prop="Loading..." />
        </>,
      );

      await act(async () => {
        // Schedule a normal pri update. This will suspend again.
        setText('D');

        // And another update at lower priority. This will unblock.
        await resolveText('E');
        ReactNoop.idleUpdates(() => {
          setText('E');
        });
      });
      // Even though the fragment fiber is not part of the return path, we should
      // be able to finish rendering.
      assertLog([
        'Suspend! [D]',
        // pre-warming
        'Suspend! [D]',
        // end pre-warming
        'E',
      ]);
      expect(root).toMatchRenderedOutput(<span prop="E" />);
    },
  );

  // @gate enableLegacyCache
  it(
    'after showing fallback, should not flip back to primary content until ' +
      'the update that suspended finishes',
    async () => {
      const {useState, useEffect} = React;
      const root = ReactNoop.createRoot();

      let setOuterText;
      function Parent({step}) {
        const [text, _setText] = useState('A');
        setOuterText = _setText;
        return (
          <>
            <Text text={'Outer text: ' + text} />
            <Text text={'Outer step: ' + step} />
            <Suspense fallback={<Text text="Loading..." />}>
              <Child step={step} outerText={text} />
            </Suspense>
          </>
        );
      }

      let setInnerText;
      function Child({step, outerText}) {
        const [text, _setText] = useState('A');
        setInnerText = _setText;

        // This will log if the component commits in an inconsistent state
        useEffect(() => {
          if (text === outerText) {
            Scheduler.log('Commit Child');
          } else {
            Scheduler.log('FIXME: Texts are inconsistent (tearing)');
          }
        }, [text, outerText]);

        return (
          <>
            <AsyncText text={'Inner text: ' + text} />
            <Text text={'Inner step: ' + step} />
          </>
        );
      }

      // These always update simultaneously. They must be consistent.
      function setText(text) {
        setOuterText(text);
        setInnerText(text);
      }

      // Mount an initial tree. Resolve A so that it doesn't suspend.
      await seedNextTextCache('Inner text: A');
      await act(() => {
        root.render(<Parent step={0} />);
      });
      assertLog([
        'Outer text: A',
        'Outer step: 0',
        'Inner text: A',
        'Inner step: 0',
        'Commit Child',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Outer text: A" />
          <span prop="Outer step: 0" />
          <span prop="Inner text: A" />
          <span prop="Inner step: 0" />
        </>,
      );

      // Update. This causes the inner component to suspend.
      await act(() => {
        setText('B');
      });
      assertLog([
        'Outer text: B',
        'Outer step: 0',
        'Suspend! [Inner text: B]',
        'Loading...',
        // pre-warming
        'Suspend! [Inner text: B]',
        'Inner step: 0',
      ]);
      // Commit the placeholder
      await advanceTimers(250);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Outer text: B" />
          <span prop="Outer step: 0" />
          <span hidden={true} prop="Inner text: A" />
          <span hidden={true} prop="Inner step: 0" />
          <span prop="Loading..." />
        </>,
      );

      // Schedule a high pri update on the parent.
      await act(() => {
        ReactNoop.discreteUpdates(() => {
          root.render(<Parent step={1} />);
        });
      });

      // Only the outer part can update. The inner part should still show a
      // fallback because we haven't finished loading B yet. Otherwise, the
      // inner text would be inconsistent with the outer text.
      assertLog([
        'Outer text: B',
        'Outer step: 1',
        'Suspend! [Inner text: B]',
        'Loading...',
        // pre-warming
        'Suspend! [Inner text: B]',
        'Inner step: 1',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Outer text: B" />
          <span prop="Outer step: 1" />
          <span hidden={true} prop="Inner text: A" />
          <span hidden={true} prop="Inner step: 0" />
          <span prop="Loading..." />
        </>,
      );

      // Now finish resolving the inner text
      await act(async () => {
        await resolveText('Inner text: B');
      });
      assertLog(['Inner text: B', 'Inner step: 1', 'Commit Child']);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Outer text: B" />
          <span prop="Outer step: 1" />
          <span prop="Inner text: B" />
          <span prop="Inner step: 1" />
        </>,
      );
    },
  );

  // @gate enableLegacyCache
  it('a high pri update can unhide a boundary that suspended at a different level', async () => {
    const {useState, useEffect} = React;
    const root = ReactNoop.createRoot();

    let setOuterText;
    function Parent({step}) {
      const [text, _setText] = useState('A');
      setOuterText = _setText;
      return (
        <>
          <Text text={'Outer: ' + text + step} />
          <Suspense fallback={<Text text="Loading..." />}>
            <Child step={step} outerText={text} />
          </Suspense>
        </>
      );
    }

    let setInnerText;
    function Child({step, outerText}) {
      const [text, _setText] = useState('A');
      setInnerText = _setText;

      // This will log if the component commits in an inconsistent state
      useEffect(() => {
        if (text === outerText) {
          Scheduler.log('Commit Child');
        } else {
          Scheduler.log('FIXME: Texts are inconsistent (tearing)');
        }
      }, [text, outerText]);

      return (
        <>
          <AsyncText text={'Inner: ' + text + step} />
        </>
      );
    }

    // These always update simultaneously. They must be consistent.
    function setText(text) {
      setOuterText(text);
      setInnerText(text);
    }

    // Mount an initial tree. Resolve A so that it doesn't suspend.
    await seedNextTextCache('Inner: A0');
    await act(() => {
      root.render(<Parent step={0} />);
    });
    assertLog(['Outer: A0', 'Inner: A0', 'Commit Child']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Outer: A0" />
        <span prop="Inner: A0" />
      </>,
    );

    // Update. This causes the inner component to suspend.
    await act(() => {
      setText('B');
    });
    assertLog([
      'Outer: B0',
      'Suspend! [Inner: B0]',
      'Loading...',
      // pre-warming
      'Suspend! [Inner: B0]',
    ]);
    // Commit the placeholder
    await advanceTimers(250);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Outer: B0" />
        <span hidden={true} prop="Inner: A0" />
        <span prop="Loading..." />
      </>,
    );

    // Schedule a high pri update on the parent. This will unblock the content.
    await resolveText('Inner: B1');
    await act(() => {
      ReactNoop.discreteUpdates(() => {
        root.render(<Parent step={1} />);
      });
    });

    assertLog(['Outer: B1', 'Inner: B1', 'Commit Child']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Outer: B1" />
        <span prop="Inner: B1" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('regression: ping at high priority causes update to be dropped', async () => {
    const {useState, useTransition} = React;

    let setTextA;
    function A() {
      const [textA, _setTextA] = useState('A');
      setTextA = _setTextA;
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text={textA} />
        </Suspense>
      );
    }

    let setTextB;
    let startTransitionFromB;
    function B() {
      const [textB, _setTextB] = useState('B');
      // eslint-disable-next-line no-unused-vars
      const [_, _startTransition] = useTransition();
      startTransitionFromB = _startTransition;
      setTextB = _setTextB;
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text={textB} />
        </Suspense>
      );
    }

    function App() {
      return (
        <>
          <A />
          <B />
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      await seedNextTextCache('A');
      await seedNextTextCache('B');
      root.render(<App />);
    });
    assertLog(['A', 'B']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="B" />
      </>,
    );

    await act(async () => {
      // Triggers suspense at normal pri
      setTextA('A1');
      // Triggers in an unrelated tree at a different pri
      startTransitionFromB(() => {
        // Update A again so that it doesn't suspend on A1. That way we can ping
        // the A1 update without also pinging this one. This is a workaround
        // because there's currently no way to render at a lower priority (B2)
        // without including all updates at higher priority (A1).
        setTextA('A2');
        setTextB('B2');
      });

      await waitFor([
        'Suspend! [A1]',
        'Loading...',
        'B',
        'Suspend! [A2]',
        'Loading...',
        'Suspend! [B2]',
        'Loading...',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span hidden={true} prop="A" />
          <span prop="Loading..." />
          <span prop="B" />
        </>,
      );

      await resolveText('A1');
      await waitFor(['A1']);
    });
    assertLog(['Suspend! [A2]', 'Loading...', 'Suspend! [B2]', 'Loading...']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="A1" />
        <span prop="B" />
      </>,
    );

    await act(async () => {
      await resolveText('A2');
      await resolveText('B2');
    });
    assertLog(['A2', 'B2']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="A2" />
        <span prop="B2" />
      </>,
    );
  });

  // Regression: https://github.com/facebook/react/issues/18486
  // @gate enableLegacyCache
  it('does not get stuck in pending state with render phase updates', async () => {
    let setTextWithShortTransition;
    let setTextWithLongTransition;

    function App() {
      const [isPending1, startShortTransition] = React.useTransition();
      const [isPending2, startLongTransition] = React.useTransition();
      const isPending = isPending1 || isPending2;
      const [text, setText] = React.useState('');
      const [mirror, setMirror] = React.useState('');

      if (text !== mirror) {
        // Render phase update was needed to repro the bug.
        setMirror(text);
      }

      setTextWithShortTransition = value => {
        startShortTransition(() => {
          setText(value);
        });
      };
      setTextWithLongTransition = value => {
        startLongTransition(() => {
          setText(value);
        });
      };

      return (
        <>
          {isPending ? <Text text="Pending..." /> : null}
          {text !== '' ? <AsyncText text={text} /> : <Text text={text} />}
        </>
      );
    }

    function Root() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <App />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Root />);
    });
    assertLog(['']);
    expect(root).toMatchRenderedOutput(<span prop="" />);

    // Update to "a". That will suspend.
    await act(async () => {
      setTextWithShortTransition('a');
      await waitForAll(['Pending...', '', 'Suspend! [a]', 'Loading...']);
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Pending..." />
        <span prop="" />
      </>,
    );

    // Update to "b". That will suspend, too.
    await act(async () => {
      setTextWithLongTransition('b');
      await waitForAll([
        // Neither is resolved yet.
        'Pending...',
        '',
        'Suspend! [b]',
        'Loading...',
      ]);
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Pending..." />
        <span prop="" />
      </>,
    );

    // Resolve "a". But "b" is still pending.
    await act(async () => {
      await resolveText('a');

      await waitForAll(['Suspend! [b]', 'Loading...']);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Pending..." />
          <span prop="" />
        </>,
      );

      // Resolve "b". This should remove the pending state.
      await act(async () => {
        await resolveText('b');
      });
      assertLog(['b']);
      // The bug was that the pending state got stuck forever.
      expect(root).toMatchRenderedOutput(<span prop="b" />);
    });
  });

  // @gate enableLegacyCache
  it('retries have lower priority than normal updates', async () => {
    const {useState} = React;

    let setText;
    function UpdatingText() {
      const [text, _setText] = useState('A');
      setText = _setText;
      return <Text text={text} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <>
          <UpdatingText />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Async" />
          </Suspense>
        </>,
      );
    });
    assertLog([
      'A',
      'Suspend! [Async]',
      'Loading...',
      // pre-warming
      'Suspend! [Async]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="Loading..." />
      </>,
    );

    await act(async () => {
      // Resolve the promise. This will trigger a retry.
      await resolveText('Async');
      // Before the retry happens, schedule a new update.
      setText('B');

      // The update should be allowed to finish before the retry is attempted.
      await waitForPaint(['B']);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="B" />
          <span prop="Loading..." />
        </>,
      );
    });
    // Then do the retry.
    assertLog(['Async']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="B" />
        <span prop="Async" />
      </>,
    );
  });

  // @gate enableLegacyCache
  it('should fire effect clean-up when deleting suspended tree', async () => {
    const {useEffect} = React;

    function App({show}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Child />
          {show && <AsyncText text="Async" />}
        </Suspense>
      );
    }

    function Child() {
      useEffect(() => {
        Scheduler.log('Mount Child');
        return () => {
          Scheduler.log('Unmount Child');
        };
      }, []);
      return <span prop="Child" />;
    }

    const root = ReactNoop.createRoot();

    await act(() => {
      root.render(<App show={false} />);
    });
    assertLog(['Mount Child']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);

    await act(() => {
      root.render(<App show={true} />);
    });
    assertLog([
      'Suspend! [Async]',
      'Loading...',
      // pre-warming
      'Suspend! [Async]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span hidden={true} prop="Child" />
        <span prop="Loading..." />
      </>,
    );

    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount Child']);
  });

  // @gate enableLegacyCache && !disableLegacyMode
  it('should fire effect clean-up when deleting suspended tree (legacy)', async () => {
    const {useEffect} = React;

    function App({show}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Child />
          {show && <AsyncText text="Async" />}
        </Suspense>
      );
    }

    function Child() {
      useEffect(() => {
        Scheduler.log('Mount Child');
        return () => {
          Scheduler.log('Unmount Child');
        };
      }, []);
      return <span prop="Child" />;
    }

    const root = ReactNoop.createLegacyRoot();

    await act(() => {
      root.render(<App show={false} />);
    });
    assertLog(['Mount Child']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);

    await act(() => {
      root.render(<App show={true} />);
    });
    assertLog(['Suspend! [Async]', 'Loading...']);
    expect(root).toMatchRenderedOutput(
      <>
        <span hidden={true} prop="Child" />
        <span prop="Loading..." />
      </>,
    );

    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount Child']);
  });

  // @gate enableLegacyCache
  it(
    'regression test: pinging synchronously within the render phase ' +
      'does not unwind the stack',
    async () => {
      // This is a regression test that reproduces a very specific scenario that
      // used to cause a crash.
      const thenable = {
        then(resolve) {
          resolve('B');
        },
        status: 'pending',
      };

      function ImmediatelyPings() {
        if (thenable.status === 'pending') {
          thenable.status = 'fulfilled';
          throw thenable;
        }
        return <Text text="B" />;
      }

      function App({showMore}) {
        return (
          <div>
            <Suspense fallback={<Text text="Loading A..." />}>
              {showMore ? (
                <>
                  <AsyncText text="A" />
                </>
              ) : null}
            </Suspense>
            {showMore ? (
              <Suspense fallback={<Text text="Loading B..." />}>
                <ImmediatelyPings />
              </Suspense>
            ) : null}
          </div>
        );
      }

      // Initial render. This mounts a Suspense boundary, so that in the next
      // update we can trigger a "suspend with delay" scenario.
      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App showMore={false} />);
      });
      assertLog([]);
      expect(root).toMatchRenderedOutput(<div />);

      // Update. This will cause two separate trees to suspend. The first tree
      // will be inside an already mounted Suspense boundary, so it will trigger
      // a "suspend with delay". The second tree will be a new Suspense
      // boundary, but the thenable that is thrown will immediately call its
      // ping listener.
      //
      // Before the bug was fixed, this would lead to a `prepareFreshStack` call
      // that unwinds the work-in-progress stack. When that code was written, it
      // was expected that pings always happen from an asynchronous task (or
      // microtask). But this test shows an example where that's not the case.
      //
      // The fix was to check if we're in the render phase before calling
      // `prepareFreshStack`. The synchronous ping is instead recorded so the
      // lane can be retried.
      await act(() => {
        startTransition(() => root.render(<App showMore={true} />));
      });
      assertLog([
        'Suspend! [A]',
        'Loading A...',
        'Loading B...',
        // The synchronous ping was recorded, so B retries and renders.
        'Suspend! [A]',
        'Loading A...',
        'B',
      ]);
      expect(root).toMatchRenderedOutput(<div />);
    },
  );

  // @gate enableLegacyCache
  it('recurring updates in siblings should not block expensive content in suspense boundary from committing', async () => {
    let setText;
    function UpdatingText() {
      const [text, _setText] = React.useState('1');
      setText = _setText;
      return <Text text={text} />;
    }

    function ExpensiveText({text, ms}) {
      Scheduler.log(text);
      Scheduler.unstable_advanceTime(ms);
      return <span prop={text} />;
    }

    function App() {
      return (
        <>
          <UpdatingText />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Async" />
            <ExpensiveText text="A" ms={1000} />
            <ExpensiveText text="B" ms={3999} />
            <ExpensiveText text="C" ms={100000} />
          </Suspense>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(<App />);
    await waitForAll([
      '1',
      'Suspend! [Async]',
      'Loading...',
      // pre-warming
      'Suspend! [Async]',
      'A',
      'B',
      'C',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="1" />
        <span prop="Loading..." />
      </>,
    );

    await resolveText('Async');
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="1" />
        <span prop="Loading..." />
      </>,
    );

    await waitFor(['Async', 'A', 'B']);
    ReactNoop.expire(100000);
    await advanceTimers(100000);
    setText('2');
    await waitForPaint(['2']);

    await waitForMicrotasks();
    Scheduler.unstable_flushNumberOfYields(1);

    if (gate('enableRetryLaneExpiration')) {
      // Even with an interruption, the expired retry is included.
      assertLog(['Async', 'A', 'B', 'C']);

      expect(root).toMatchRenderedOutput(
        <>
          <span prop="2" />
          <span prop="Async" />
          <span prop="A" />
          <span prop="B" />
          <span prop="C" />
        </>,
      );
    } else {
      // Since there's an interruption, the expired content is pushed out.
      assertLog(['Async']);

      expect(root).toMatchRenderedOutput(
        <>
          <span prop="2" />
          <span prop="Loading..." />
        </>,
      );

      // Now flush without interrupting
      await waitForAll(['A', 'B', 'C']);

      expect(root).toMatchRenderedOutput(
        <>
          <span prop="2" />
          <span prop="Async" />
          <span prop="A" />
          <span prop="B" />
          <span prop="C" />
        </>,
      );
    }
  });

  // @gate enableLegacyCache
  it('recurring transition updates in siblings should not block expensive content in suspense boundary from committing', async () => {
    let setText;
    function UpdatingText() {
      const [text, _setText] = React.useState('1');
      setText = _setText;
      return <Text text={text} />;
    }

    function ExpensiveText({text, ms}) {
      Scheduler.log(text);
      Scheduler.unstable_advanceTime(ms);
      return <span prop={text} />;
    }

    function App() {
      return (
        <>
          <UpdatingText />
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Async" />
            <ExpensiveText text="A" ms={1000} />
            <ExpensiveText text="B" ms={3999} />
            <ExpensiveText text="C" ms={100000} />
          </Suspense>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(<App />);
    await waitForAll([
      '1',
      'Suspend! [Async]',
      'Loading...',

      ...(gate('enableSiblingPrerendering')
        ? ['Suspend! [Async]', 'A', 'B', 'C']
        : []),
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="1" />
        <span prop="Loading..." />
      </>,
    );

    await resolveText('Async');
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="1" />
        <span prop="Loading..." />
      </>,
    );

    await waitFor(['Async', 'A', 'B']);
    ReactNoop.expire(100000);
    await advanceTimers(100000);
    startTransition(() => {
      setText('2');
    });
    await waitForPaint(['2']);

    await waitForMicrotasks();
    Scheduler.unstable_flushNumberOfYields(1);

    if (gate('enableRetryLaneExpiration')) {
      // Even with an interruption, the expired retry is included.
      assertLog(['Async', 'A', 'B', 'C']);

      expect(root).toMatchRenderedOutput(
        <>
          <span prop="2" />
          <span prop="Async" />
          <span prop="A" />
          <span prop="B" />
          <span prop="C" />
        </>,
      );
    } else {
      // Since there's an interruption, the expired content is pushed out.
      assertLog(['Async', 'A', 'B', 'C']);

      expect(root).toMatchRenderedOutput(
        <>
          <span prop="2" />
          <span prop="Loading..." />
        </>,
      );

      // Now flush without interrupting
      await waitForAll(['A', 'B', 'C']);

      expect(root).toMatchRenderedOutput(
        <>
          <span prop="2" />
          <span prop="Async" />
          <span prop="A" />
          <span prop="B" />
          <span prop="C" />
        </>,
      );
    }
  });

  it('can rerender after resolving a promise', async () => {
    const promise = Promise.resolve(null);
    const root = ReactNoop.createRoot();

    await act(() => {
      startTransition(() => {
        root.render(<Suspense>{promise}</Suspense>);
      });
    });

    assertLog([]);
    expect(root).toMatchRenderedOutput(null);

    await act(() => {
      startTransition(() => {
        root.render(
          <Suspense>
            <div />
          </Suspense>,
        );
      });
    });
  });
});
