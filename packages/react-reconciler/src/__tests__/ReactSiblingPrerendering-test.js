let React;
let ReactNoop;
let Scheduler;
let act;
let assertLog;
let waitFor;
let waitForPaint;
let waitForAll;
let textCache;
let startTransition;
let Suspense;
let Activity;

describe('ReactSiblingPrerendering', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    waitFor = require('internal-test-utils').waitFor;
    waitForPaint = require('internal-test-utils').waitForPaint;
    waitForAll = require('internal-test-utils').waitForAll;
    startTransition = React.startTransition;
    Suspense = React.Suspense;
    Activity = React.Activity;

    textCache = new Map();
  });

  function resolveText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      const newRecord = {
        status: 'resolved',
        value: text,
      };
      textCache.set(text, newRecord);
    } else if (record.status === 'pending') {
      const thenable = record.value;
      record.status = 'resolved';
      record.value = text;
      thenable.pings.forEach(t => t());
    }
  }

  function readText(text) {
    const record = textCache.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          Scheduler.log(`Suspend! [${text}]`);
          throw record.value;
        case 'rejected':
          throw record.value;
        case 'resolved':
          return record.value;
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
      textCache.set(text, newRecord);

      throw thenable;
    }
  }

  // function getText(text) {
  //   const record = textCache.get(text);
  //   if (record === undefined) {
  //     const thenable = {
  //       pings: [],
  //       then(resolve) {
  //         if (newRecord.status === 'pending') {
  //           thenable.pings.push(resolve);
  //         } else {
  //           Promise.resolve().then(() => resolve(newRecord.value));
  //         }
  //       },
  //     };
  //     const newRecord = {
  //       status: 'pending',
  //       value: thenable,
  //     };
  //     textCache.set(text, newRecord);
  //     return thenable;
  //   } else {
  //     switch (record.status) {
  //       case 'pending':
  //         return record.value;
  //       case 'rejected':
  //         return Promise.reject(record.value);
  //       case 'resolved':
  //         return Promise.resolve(record.value);
  //     }
  //   }
  // }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({text}) {
    readText(text);
    Scheduler.log(text);
    return text;
  }

  it("don't prerender siblings when something errors", async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <Text text={this.state.error.message} />;
        }
        return this.props.children;
      }
    }

    function Oops() {
      throw new Error('Oops!');
    }

    function App() {
      return (
        <>
          <div>
            <ErrorBoundary>
              <Oops />
              <AsyncText text="A" />
            </ErrorBoundary>
          </div>
          <div>
            <AsyncText text="B" />
            <AsyncText text="C" />
          </div>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => startTransition(() => root.render(<App />)));
    assertLog([
      'Oops!',

      // A is skipped because we don't prerender siblings when
      // something errors.

      'Suspend! [B]',

      // After B suspends, we're still able to prerender C without starting
      // over because there's no fallback, so the root is blocked from
      // committing anyway.
      'Suspend! [C]',
    ]);
  });

  it("don't skip siblings when rendering inside a hidden tree", async () => {
    function App() {
      return (
        <>
          <Text text="A" />
          <Activity mode="hidden">
            <Suspense fallback={<Text text="Loading..." />}>
              <AsyncText text="B" />
              <AsyncText text="C" />
            </Suspense>
          </Activity>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(async () => root.render(<App />));

      // The first render includes only the visible part of the tree. The
      // hidden content is deferred until later.
      await waitForPaint(['A']);
      expect(root).toMatchRenderedOutput('A');

      if (gate(flags => flags.enableYieldingBeforePassive)) {
        // Passive effects.
        await waitForPaint([]);
      }
      // The second render is a prerender of the hidden content.
      await waitForPaint([
        'Suspend! [B]',
        // If B and C were visible, C would not have been attempted
        // during this pass, because it would prevented the fallback
        // from showing.
        'Suspend! [C]',
        'Loading...',
      ]);
      expect(root).toMatchRenderedOutput('A');
    });
  });

  it('start prerendering retries right after the fallback commits', async () => {
    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="A" />
          <AsyncText text="B" />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => root.render(<App />));

      // On the first attempt, A suspends. Unwind and show a fallback, without
      // attempting B.
      await waitForPaint(['Suspend! [A]', 'Loading...']);
      expect(root).toMatchRenderedOutput('Loading...');

      // Immediately after the fallback commits, retry the boundary again. This
      // time we include B, since we're not blocking the fallback from showing.
      if (gate(flags => flags.enableYieldingBeforePassive)) {
        // Passive effects.
        await waitForPaint([]);
      }
      await waitForPaint(['Suspend! [A]', 'Suspend! [B]']);
    });
    expect(root).toMatchRenderedOutput('Loading...');
  });

  it('switch back to normal rendering mode if a ping occurs during prerendering', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback={<Text text="Loading outer..." />}>
            <div>
              <Text text="A" />
              <AsyncText text="B" />
            </div>
            <div>
              <Suspense fallback={<Text text="Loading inner..." />}>
                <AsyncText text="C" />
                <AsyncText text="D" />
              </Suspense>
            </div>
          </Suspense>
        </div>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => root.render(<App />));

      // On the first attempt, B suspends. Unwind and show a fallback, without
      // attempting the siblings.
      await waitForPaint(['A', 'Suspend! [B]', 'Loading outer...']);
      expect(root).toMatchRenderedOutput(<div>Loading outer...</div>);

      // Now that the fallback is visible, we can prerender the siblings. Start
      // prerendering, then yield to simulate an interleaved event.
      await waitFor(['A']);

      // To avoid the Suspense throttling mechanism, let's pretend there's been
      // more than a Just Noticeable Difference since we rendered the
      // outer fallback.
      Scheduler.unstable_advanceTime(500);

      // During the render phase, but before we get to B again, resolve its
      // promise. We should re-enter normal rendering mode, but we also
      // shouldn't unwind and lose our work-in-progress.
      await resolveText('B');
      await waitForPaint([
        'B',
        'Suspend! [C]',

        // If we were still in prerendering mode, then we would have attempted
        // to render D here. But since we received new data, we will skip the
        // remaining siblings to unblock the inner fallback.
        'Loading inner...',
      ]);

      expect(root).toMatchRenderedOutput(
        <div>
          <div>AB</div>
          <div>Loading inner...</div>
        </div>,
      );
    });

    // Now that the inner fallback is showing, we can prerender the rest of
    // the tree.
    assertLog([
      // NOTE: C renders twice instead of once because when B resolved, it
      // was treated like a retry update, not just a ping. So first it
      // regular renders, then it prerenders. TODO: We should be able to
      // optimize this by detecting inside the retry listener that the
      // outer boundary is no longer suspended, and therefore doesn't need
      // to be updated.
      'Suspend! [C]',

      // Now we're in prerender mode, so D is incuded in this attempt.
      'Suspend! [C]',
      'Suspend! [D]',
    ]);
    expect(root).toMatchRenderedOutput(
      <div>
        <div>AB</div>
        <div>Loading inner...</div>
      </div>,
    );
  });

  it("don't throw out completed work in order to prerender", async () => {
    function App() {
      return (
        <div>
          <Suspense fallback={<Text text="Loading outer..." />}>
            <div>
              <AsyncText text="A" />
            </div>
            <div>
              <Suspense fallback={<Text text="Loading inner..." />}>
                <AsyncText text="B" />
                <AsyncText text="C" />
              </Suspense>
            </div>
          </Suspense>
        </div>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => root.render(<App />));

      await waitForPaint(['Suspend! [A]', 'Loading outer...']);
      expect(root).toMatchRenderedOutput(<div>Loading outer...</div>);

      // Before the prerendering of the inner boundary starts, the data for A
      // resolves, so we try rendering that again.
      await resolveText('A');
      // This produces a new tree that we can show. However, the commit phase
      // is throttled because it's been less than a Just Noticeable Difference
      // since the outer fallback was committed.
      //
      // In the meantime, we could choose to start prerendering C, but instead
      // we wait for a JND to elapse and the commit to finish — it's not
      // worth discarding the work we've already done.
      await waitForAll([
        'A',
        'Suspend! [B]',

        // C is skipped because we're no longer in prerendering mode; there's
        // a new fallback we can show.
        'Loading inner...',
      ]);
      expect(root).toMatchRenderedOutput(<div>Loading outer...</div>);

      // Fire the timer to commit the outer fallback.
      jest.runAllTimers();
      expect(root).toMatchRenderedOutput(
        <div>
          <div>A</div>
          <div>Loading inner...</div>
        </div>,
      );
    });
    // Once the inner fallback is committed, we can start prerendering C.
    assertLog(['Suspend! [B]', 'Suspend! [C]']);
  });

  it(
    "don't skip siblings during the retry if there was a ping since the " +
      'first attempt',
    async () => {
      function App() {
        return (
          <>
            <div>
              <Suspense fallback={<Text text="Loading outer..." />}>
                <div>
                  <AsyncText text="A" />
                </div>
                <div>
                  <Suspense fallback={<Text text="Loading inner..." />}>
                    <AsyncText text="B" />
                    <AsyncText text="C" />
                  </Suspense>
                </div>
              </Suspense>
            </div>
            <div>
              <Text text="D" />
            </div>
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(async () => {
        startTransition(() => root.render(<App />));

        // On the first attempt, A suspends. Unwind and show a fallback, without
        // attempting B or C.
        await waitFor([
          'Suspend! [A]',
          'Loading outer...',

          // Yield to simulate an interleaved event
        ]);

        // Ping the promise for A before the render phase has finished, as might
        // happen in an interleaved network event
        await resolveText('A');

        // Now continue rendering the rest of the tree.
        await waitForPaint(['D']);
        expect(root).toMatchRenderedOutput(
          <>
            <div>Loading outer...</div>
            <div>D</div>
          </>,
        );

        if (gate(flags => flags.enableYieldingBeforePassive)) {
          // Passive effects.
          await waitForPaint([]);
        }
        // Immediately after the fallback commits, retry the boundary again.
        // Because the promise for A resolved, this is a normal render, _not_
        // a prerender. So when we proceed to B, and B suspends, we unwind again
        // without attempting C. The practical benefit of this is that we don't
        // block the inner Suspense fallback from appearing.
        await waitForPaint(['A', 'Suspend! [B]', 'Loading inner...']);
        // (Since this is a retry, the commit phase is throttled by a timer.)
        jest.runAllTimers();
        // The inner fallback is now visible.
        expect(root).toMatchRenderedOutput(
          <>
            <div>
              <div>A</div>
              <div>Loading inner...</div>
            </div>
            <div>D</div>
          </>,
        );

        if (gate(flags => flags.enableYieldingBeforePassive)) {
          // Passive effects.
          await waitForPaint([]);
        }
        // Now we can proceed to prerendering C.
        await waitForPaint(['Suspend! [B]', 'Suspend! [C]']);
      });
      assertLog([]);
    },
  );

  it(
    'when a synchronous update suspends outside a boundary, the resulting' +
      'prerender is concurrent',
    async () => {
      function App() {
        return (
          <>
            <Text text="A" />
            <Text text="B" />
            <AsyncText text="Async" />
            <Text text="C" />
            <Text text="D" />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      // Mount the root synchronously
      ReactNoop.flushSync(() => root.render(<App />));

      // Synchronously render everything until we suspend in the shell
      assertLog(['A', 'B', 'Suspend! [Async]']);

      // The rest of the siblings begin to prerender concurrently. Notice
      // that we don't unwind here; we pick up where we left off above.
      await waitFor(['C']);
      await waitFor(['D']);

      assertLog([]);
      expect(root).toMatchRenderedOutput(null);

      await resolveText('Async');
      assertLog(['A', 'B', 'Async', 'C', 'D']);
      expect(root).toMatchRenderedOutput('ABAsyncCD');
    },
  );

  it('restart a suspended sync render if something suspends while prerendering the siblings', async () => {
    function App() {
      return (
        <>
          <Text text="A" />
          <Text text="B" />
          <AsyncText text="Async" />
          <Text text="C" />
          <Text text="D" />
        </>
      );
    }

    const root = ReactNoop.createRoot();
    // Mount the root synchronously
    ReactNoop.flushSync(() => root.render(<App />));

    // Synchronously render everything until we suspend in the shell
    assertLog(['A', 'B', 'Suspend! [Async]']);

    // The rest of the siblings begin to prerender concurrently
    await waitFor(['C']);

    // While we're prerendering, Async resolves. We should unwind and
    // start over, rather than continue prerendering D.
    await resolveText('Async');
    assertLog(['A', 'B', 'Async', 'C', 'D']);
    expect(root).toMatchRenderedOutput('ABAsyncCD');
  });

  it('settles 3 suspended sibling boundaries after a parent re-render', async () => {
    let attempts = 0;
    function Tile({text}) {
      attempts++;
      if (attempts > 50) {
        throw new Error('Infinite Suspense retry loop');
      }
      readText(text);
      Scheduler.log(text);
      return text;
    }

    function Parent() {
      const [, setCount] = React.useState(0);
      React.useEffect(() => {
        setCount(1);
      }, []);
      return (
        <>
          <Suspense fallback={<Text text="loading A" />}>
            <Tile text="A" />
          </Suspense>
          <Suspense fallback={<Text text="loading B" />}>
            <Tile text="B" />
          </Suspense>
          <Suspense fallback={<Text text="loading C" />}>
            <Tile text="C" />
          </Suspense>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(<Parent />);
    await waitForAll([
      // Initial mount
      'Suspend! [A]',
      'loading A',
      'Suspend! [B]',
      'loading B',
      'Suspend! [C]',
      'loading C',
      // useEffect re-render (recreates the boundary elements while still pending)
      'Suspend! [A]',
      'loading A',
      'Suspend! [B]',
      'loading B',
      'Suspend! [C]',
      'loading C',
      // Re-attempted unblocked retry lanes from the wrap-around collision
      'Suspend! [B]',
      'Suspend! [C]',
      // When retries are not throttled, B and C commit immediately and then
      // A, B, and C coalesce into the prerender pass during the same flush.
      ...(!gate('alwaysThrottleRetries')
        ? ['Suspend! [A]', 'Suspend! [B]', 'Suspend! [C]']
        : []),
    ]);

    if (gate(flags => flags.alwaysThrottleRetries)) {
      // Advance past FALLBACK_THROTTLE_MS (300ms) so the throttled retry commits.
      Scheduler.unstable_advanceTime(500);
      jest.runAllTimers();

      // Without keeping previously suspended sibling retries suspended, the retry
      // commit clears `root.suspendedLanes`, dropping A back to normal mode so A
      // and (B, C) chase each other around RetryLanes indefinitely. With the fix,
      // all three coalesce into one prerender pass.
      await waitForAll(['Suspend! [A]', 'Suspend! [B]', 'Suspend! [C]']);
    }
    expect(root).toMatchRenderedOutput('loading Aloading Bloading C');
    expect(attempts).toBe(11);

    // No further retries should be scheduled.
    Scheduler.unstable_advanceTime(500);
    jest.runAllTimers();
    await waitForAll([]);

    await resolveText('A');
    await resolveText('B');
    await resolveText('C');
    await waitForAll(['A', 'B', 'C']);
    expect(root).toMatchRenderedOutput('ABC');
  });

  it('settles 3 suspended sibling boundaries after a parent re-render inside act', async () => {
    let attempts = 0;
    function Tile({text}) {
      attempts++;
      if (attempts > 50) {
        throw new Error('Infinite Suspense retry loop');
      }
      readText(text);
      Scheduler.log(text);
      return text;
    }

    function Parent() {
      const [, setCount] = React.useState(0);
      React.useEffect(() => {
        setCount(1);
      }, []);
      return (
        <>
          <Suspense fallback={<Text text="loading A" />}>
            <Tile text="A" />
          </Suspense>
          <Suspense fallback={<Text text="loading B" />}>
            <Tile text="B" />
          </Suspense>
          <Suspense fallback={<Text text="loading C" />}>
            <Tile text="C" />
          </Suspense>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Parent />);
    });
    assertLog([
      // Initial mount
      'Suspend! [A]',
      'loading A',
      'Suspend! [B]',
      'loading B',
      'Suspend! [C]',
      'loading C',
      // useEffect re-render
      'Suspend! [A]',
      'loading A',
      'Suspend! [B]',
      'loading B',
      'Suspend! [C]',
      'loading C',
      // act() flushes pending work and timers, so the unblocked retries commit
      // and all three boundaries coalesce into a single prerender pass.
      'Suspend! [B]',
      'Suspend! [C]',
      'Suspend! [A]',
      'Suspend! [B]',
      'Suspend! [C]',
    ]);
    expect(root).toMatchRenderedOutput('loading Aloading Bloading C');
    expect(attempts).toBe(11);

    await act(() => {
      resolveText('A');
      resolveText('B');
      resolveText('C');
    });
    assertLog(['A', 'B', 'C']);
    expect(root).toMatchRenderedOutput('ABC');
  });

  it('settles sibling Suspense retries spawned at different priorities', async () => {
    let showA;
    let showB;
    let attempts = 0;

    function Tile({text}) {
      attempts++;
      if (attempts > 50) {
        throw new Error('Infinite Suspense retry loop');
      }
      readText(text);
      Scheduler.log(text);
      return text;
    }

    function Slot({text, onMount}) {
      const [visible, setVisible] = React.useState(false);
      React.useLayoutEffect(() => {
        onMount(() => setVisible(true));
      }, [onMount]);
      if (!visible) {
        return null;
      }
      return (
        <Suspense fallback={<Text text={`loading ${text}`} />}>
          <Tile text={text} />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(
      <>
        <Slot text="A" onMount={fn => (showA = fn)} />
        <Slot text="B" onMount={fn => (showB = fn)} />
      </>,
    );
    await waitForAll([]);

    // Mount two sibling boundaries in separate renders (different priorities),
    // so they occupy distinct RetryLanes even if immediate retries within a
    // single render shared one lane.
    startTransition(() => showA());
    showB();
    await waitForAll([
      'Suspend! [B]',
      'loading B',
      'Suspend! [A]',
      'loading A',
      'Suspend! [B]',
      ...(!gate('alwaysThrottleRetries')
        ? ['Suspend! [A]', 'Suspend! [B]']
        : []),
    ]);

    if (gate(flags => flags.alwaysThrottleRetries)) {
      // Advance past FALLBACK_THROTTLE_MS so the throttled retry commits.
      Scheduler.unstable_advanceTime(500);
      jest.runAllTimers();
      await waitForAll(['Suspend! [A]', 'Suspend! [B]']);
    }
    expect(root).toMatchRenderedOutput('loading Aloading B');
    expect(attempts).toBe(5);

    Scheduler.unstable_advanceTime(500);
    jest.runAllTimers();
    await waitForAll([]);

    await resolveText('A');
    await waitForAll(['A']);
    if (gate(flags => flags.alwaysThrottleRetries)) {
      Scheduler.unstable_advanceTime(500);
      jest.runAllTimers();
      await waitForAll([]);
    }
    expect(root).toMatchRenderedOutput('Aloading B');

    await resolveText('B');
    await waitForAll(['B']);
    if (gate(flags => flags.alwaysThrottleRetries)) {
      Scheduler.unstable_advanceTime(500);
      jest.runAllTimers();
      await waitForAll([]);
    }
    expect(root).toMatchRenderedOutput('AB');
  });

  it('settles sibling Suspense retries spawned at different priorities inside act', async () => {
    let showA;
    let showB;
    let attempts = 0;

    function Tile({text}) {
      attempts++;
      if (attempts > 50) {
        throw new Error('Infinite Suspense retry loop');
      }
      readText(text);
      Scheduler.log(text);
      return text;
    }

    function Slot({text, onMount}) {
      const [visible, setVisible] = React.useState(false);
      React.useLayoutEffect(() => {
        onMount(() => setVisible(true));
      }, [onMount]);
      if (!visible) {
        return null;
      }
      return (
        <Suspense fallback={<Text text={`loading ${text}`} />}>
          <Tile text={text} />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <>
          <Slot text="A" onMount={fn => (showA = fn)} />
          <Slot text="B" onMount={fn => (showB = fn)} />
        </>,
      );
    });
    assertLog([]);
    await act(() => {
      startTransition(() => showA());
      showB();
    });
    assertLog([
      'Suspend! [B]',
      'loading B',
      'Suspend! [A]',
      'loading A',
      'Suspend! [B]',
      'Suspend! [A]',
      'Suspend! [B]',
    ]);
    expect(root).toMatchRenderedOutput('loading Aloading B');
    expect(attempts).toBe(5);

    await act(() => {
      resolveText('A');
    });
    assertLog(['A']);
    expect(root).toMatchRenderedOutput('Aloading B');

    await act(() => {
      resolveText('B');
    });
    assertLog(['B']);
    expect(root).toMatchRenderedOutput('AB');
  });

  it('settles when a sibling retry resolves to a nested Suspense boundary while another stays pending', async () => {
    let showA;
    let showB;

    function SlotA() {
      const [visible, setVisible] = React.useState(false);
      React.useLayoutEffect(() => {
        showA = () => setVisible(true);
      }, []);
      if (!visible) {
        return null;
      }
      return (
        <Suspense fallback={<Text text="loading A" />}>
          <AsyncText text="A1" />
          <Suspense fallback={<Text text="loading A-inner" />}>
            <AsyncText text="A2" />
            <AsyncText text="A3" />
          </Suspense>
        </Suspense>
      );
    }

    function SlotB() {
      const [visible, setVisible] = React.useState(false);
      React.useLayoutEffect(() => {
        showB = () => setVisible(true);
      }, []);
      if (!visible) {
        return null;
      }
      return (
        <Suspense fallback={<Text text="loading B" />}>
          <AsyncText text="B" />
        </Suspense>
      );
    }

    const root = ReactNoop.createRoot();
    root.render(
      <>
        <SlotA />
        <SlotB />
      </>,
    );
    await waitForAll([]);

    // Mount B at default priority and A as a transition so their immediate
    // retries occupy separate RetryLanes. B's retry starts suspended while
    // A mounts its fallback (which puts A on a suspended RetryLane and drops B
    // back to unblocked).
    startTransition(() => showA());
    showB();
    await waitFor(['Suspend! [B]', 'loading B', 'Suspend! [A1]', 'loading A']);

    // Wait until the fallback throttle window expires so B's retry commits,
    // then resolve A1 mid-retry. A transitions to its inner boundary (`A-inner`,
    // skipping A3 so the inner fallback appears first), and `A-inner` and B
    // coalesce into a single prerender pass instead of ping-ponging across
    // distinct RetryLanes.
    Scheduler.unstable_advanceTime(500);
    await waitFor(['Suspend! [B]']);
    await resolveText('A1');
    await waitForAll(['A1', 'Suspend! [A2]', 'loading A-inner']);
    Scheduler.unstable_advanceTime(500);
    jest.runAllTimers();
    expect(root).toMatchRenderedOutput('A1loading A-innerloading B');

    await waitForAll(['Suspend! [A2]', 'Suspend! [A3]', 'Suspend! [B]']);
    Scheduler.unstable_advanceTime(500);
    jest.runAllTimers();
    await waitForAll([]);

    await resolveText('A2');
    await resolveText('A3');
    await resolveText('B');
    await waitForAll(['A2', 'A3', 'B']);
    if (gate(flags => flags.alwaysThrottleRetries)) {
      Scheduler.unstable_advanceTime(500);
      jest.runAllTimers();
    }
    expect(root).toMatchRenderedOutput('A1A2A3B');
  });
});
