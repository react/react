let React;
let ReactNoop;
let Scheduler;
let act;
let LegacyHidden;
let Activity;
let Suspense;
let useState;
let useEffect;
let startTransition;
let textCache;
let waitFor;
let waitForPaint;
let assertLog;

describe('Activity Suspense', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    LegacyHidden = React.unstable_LegacyHidden;
    Activity = React.Activity;
    Suspense = React.Suspense;
    useState = React.useState;
    useEffect = React.useEffect;
    startTransition = React.startTransition;

    const InternalTestUtils = require('internal-test-utils');
    waitFor = InternalTestUtils.waitFor;
    waitForPaint = InternalTestUtils.waitForPaint;
    assertLog = InternalTestUtils.assertLog;

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

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({text}) {
    readText(text);
    Scheduler.log(text);
    return text;
  }

  it('basic example of suspending inside hidden tree', async () => {
    const root = ReactNoop.createRoot();

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <span>
            <Text text="Visible" />
          </span>
          <Activity mode="hidden">
            <span>
              <AsyncText text="Hidden" />
            </span>
          </Activity>
        </Suspense>
      );
    }

    // The hidden tree hasn't finished loading, but we should still be able to
    // show the surrounding contents. The outer Suspense boundary
    // isn't affected.
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Visible', 'Suspend! [Hidden]']);
    expect(root).toMatchRenderedOutput(<span>Visible</span>);

    // When the data resolves, we should be able to finish prerendering
    // the hidden tree.
    await act(async () => {
      await resolveText('Hidden');
    });
    assertLog(['Hidden']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Visible</span>
        <span hidden={true}>Hidden</span>
      </>,
    );
  });

  // @gate enableLegacyHidden
  test('LegacyHidden does not handle suspense', async () => {
    const root = ReactNoop.createRoot();

    function App() {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <span>
            <Text text="Visible" />
          </span>
          <LegacyHidden mode="hidden">
            <span>
              <AsyncText text="Hidden" />
            </span>
          </LegacyHidden>
        </Suspense>
      );
    }

    // Unlike Activity, LegacyHidden never captures if something suspends
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Visible', 'Suspend! [Hidden]', 'Loading...']);
    // Nearest Suspense boundary switches to a fallback even though the
    // suspended content is hidden.
    expect(root).toMatchRenderedOutput(
      <>
        <span hidden={true}>Visible</span>
        Loading...
      </>,
    );
  });

  // @gate __DEV__
  test('Regression: Suspending on hide should not infinite loop.', async () => {
    // This regression only repros in public act.
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const root = ReactNoop.createRoot();

    let setMode;
    function Container({text}) {
      const [mode, _setMode] = React.useState('visible');
      setMode = _setMode;
      useEffect(() => {
        return () => {
          Scheduler.log(`Clear [${text}]`);
          textCache.delete(text);
        };
      });
      return (
        //$FlowFixMe
        <Suspense fallback="Loading">
          <Activity mode={mode}>
            <AsyncText text={text} />
          </Activity>
        </Suspense>
      );
    }

    await React.act(() => {
      root.render(<Container text="hello" />);
    });
    assertLog([
      'Suspend! [hello]',
      // pre-warming
      'Suspend! [hello]',
    ]);
    expect(root).toMatchRenderedOutput('Loading');

    await React.act(async () => {
      await resolveText('hello');
    });
    assertLog(['hello']);
    expect(root).toMatchRenderedOutput('hello');

    await React.act(async () => {
      setMode('hidden');
    });
    assertLog(['Clear [hello]', 'Suspend! [hello]']);
    expect(root).toMatchRenderedOutput('');
  });

  test("suspending inside currently hidden tree that's switching to visible", async () => {
    const root = ReactNoop.createRoot();

    function Details({open, children}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <span>
            <Text text={open ? 'Open' : 'Closed'} />
          </span>
          <Activity mode={open ? 'visible' : 'hidden'}>
            <span>{children}</span>
          </Activity>
        </Suspense>
      );
    }

    // The hidden tree hasn't finished loading, but we should still be able to
    // show the surrounding contents. It doesn't matter that there's no
    // Suspense boundary because the unfinished content isn't visible.
    await act(() => {
      root.render(
        <Details open={false}>
          <AsyncText text="Async" />
        </Details>,
      );
    });
    assertLog(['Closed', 'Suspend! [Async]']);
    expect(root).toMatchRenderedOutput(<span>Closed</span>);

    // But when we switch the boundary from hidden to visible, it should
    // now bubble to the nearest Suspense boundary.
    await act(() => {
      startTransition(() => {
        root.render(
          <Details open={true}>
            <AsyncText text="Async" />
          </Details>,
        );
      });
    });
    assertLog(['Open', 'Suspend! [Async]', 'Loading...']);
    // It should suspend with delay to prevent the already-visible Suspense
    // boundary from switching to a fallback
    expect(root).toMatchRenderedOutput(<span>Closed</span>);

    // Resolve the data and finish rendering
    await act(async () => {
      await resolveText('Async');
    });
    assertLog(['Open', 'Async']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Open</span>
        <span>Async</span>
      </>,
    );
  });

  test("suspending inside currently visible tree that's switching to hidden", async () => {
    const root = ReactNoop.createRoot();

    function Details({open, children}) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <span>
            <Text text={open ? 'Open' : 'Closed'} />
          </span>
          <Activity mode={open ? 'visible' : 'hidden'}>
            <span>{children}</span>
          </Activity>
        </Suspense>
      );
    }

    // Initial mount. Nothing suspends
    await act(() => {
      root.render(
        <Details open={true}>
          <Text text="(empty)" />
        </Details>,
      );
    });
    assertLog(['Open', '(empty)']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Open</span>
        <span>(empty)</span>
      </>,
    );

    // Update that suspends inside the currently visible tree
    await act(() => {
      startTransition(() => {
        root.render(
          <Details open={true}>
            <AsyncText text="Async" />
          </Details>,
        );
      });
    });
    assertLog(['Open', 'Suspend! [Async]', 'Loading...']);
    // It should suspend with delay to prevent the already-visible Suspense
    // boundary from switching to a fallback
    expect(root).toMatchRenderedOutput(
      <>
        <span>Open</span>
        <span>(empty)</span>
      </>,
    );

    // Update that hides the suspended tree
    await act(() => {
      startTransition(() => {
        root.render(
          <Details open={false}>
            <AsyncText text="Async" />
          </Details>,
        );
      });
    });
    // Now the visible part of the tree can commit without being blocked
    // by the suspended content, which is hidden.
    assertLog(['Closed', 'Suspend! [Async]']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Closed</span>
        <span hidden={true}>(empty)</span>
      </>,
    );

    // Resolve the data and finish rendering
    await act(async () => {
      await resolveText('Async');
    });
    assertLog(['Async']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Closed</span>
        <span hidden={true}>Async</span>
      </>,
    );
  });

  test('update that suspends inside hidden tree', async () => {
    let setText;
    function Child() {
      const [text, _setText] = useState('A');
      setText = _setText;
      return <AsyncText text={text} />;
    }

    function App({show}) {
      return (
        <Activity mode={show ? 'visible' : 'hidden'}>
          <span>
            <Child />
          </span>
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();
    resolveText('A');
    await act(() => {
      root.render(<App show={false} />);
    });
    assertLog(['A']);

    await act(() => {
      startTransition(() => {
        setText('B');
      });
    });
  });

  test('updates at multiple priorities that suspend inside hidden tree', async () => {
    let setText;
    let setStep;
    function Child() {
      const [text, _setText] = useState('A');
      setText = _setText;

      const [step, _setStep] = useState(0);
      setStep = _setStep;

      return <AsyncText text={text + step} />;
    }

    function App({show}) {
      return (
        <Activity mode={show ? 'visible' : 'hidden'}>
          <span>
            <Child />
          </span>
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();
    resolveText('A0');
    await act(() => {
      root.render(<App show={false} />);
    });
    assertLog(['A0']);
    expect(root).toMatchRenderedOutput(<span hidden={true}>A0</span>);

    await act(() => {
      React.startTransition(() => {
        setStep(1);
      });
      ReactNoop.flushSync(() => {
        setText('B');
      });
    });
    assertLog([
      // The high priority render suspends again
      'Suspend! [B0]',
      // There's still pending work in another lane, so we should attempt
      // that, too.
      'Suspend! [B1]',
    ]);
    expect(root).toMatchRenderedOutput(<span hidden={true}>A0</span>);

    // Resolve the data and finish rendering
    await act(() => {
      resolveText('B1');
    });
    assertLog(['B1']);
    expect(root).toMatchRenderedOutput(<span hidden={true}>B1</span>);
  });

  test('detect updates to a hidden tree during a concurrent event', async () => {
    // This is a pretty complex test case. It relates to how we detect if an
    // update is made to a hidden tree: when scheduling the update, we walk up
    // the fiber return path to see if any of the parents is a hidden Activity
    // component. This doesn't work if there's already a render in progress,
    // because the tree might be about to flip to hidden. To avoid a data race,
    // queue updates atomically: wait to queue the update until after the
    // current render has finished.

    let setInner;
    function Child({outer}) {
      const [inner, _setInner] = useState(0);
      setInner = _setInner;

      useEffect(() => {
        // Inner and outer values are always updated simultaneously, so they
        // should always be consistent.
        if (inner !== outer) {
          Scheduler.log('Tearing! Inner and outer are inconsistent!');
        } else {
          Scheduler.log('Inner and outer are consistent');
        }
      }, [inner, outer]);

      return <Text text={'Inner: ' + inner} />;
    }

    let setOuter;
    function App({show}) {
      const [outer, _setOuter] = useState(0);
      setOuter = _setOuter;
      return (
        <>
          <Activity mode={show ? 'visible' : 'hidden'}>
            <span>
              <Child outer={outer} />
            </span>
          </Activity>
          <span>
            <Text text={'Outer: ' + outer} />
          </span>
          <Suspense fallback={<Text text="Loading..." />}>
            <span>
              <Text text={'Sibling: ' + outer} />
            </span>
          </Suspense>
        </>
      );
    }

    // Render a hidden tree
    const root = ReactNoop.createRoot();
    resolveText('Async: 0');
    await act(() => {
      root.render(<App show={true} />);
    });
    assertLog([
      'Inner: 0',
      'Outer: 0',
      'Sibling: 0',
      'Inner and outer are consistent',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Inner: 0</span>
        <span>Outer: 0</span>
        <span>Sibling: 0</span>
      </>,
    );

    await act(async () => {
      // Update a value both inside and outside the hidden tree. These values
      // must always be consistent.
      startTransition(() => {
        setOuter(1);
        setInner(1);
        // In the same render, also hide the offscreen tree.
        root.render(<App show={false} />);
      });

      await waitFor([
        // The outer update will commit, but the inner update is deferred until
        // a later render.
        'Outer: 1',
      ]);

      // Assert that we haven't committed quite yet
      expect(root).toMatchRenderedOutput(
        <>
          <span>Inner: 0</span>
          <span>Outer: 0</span>
          <span>Sibling: 0</span>
        </>,
      );

      // Before the tree commits, schedule a concurrent event. The inner update
      // is to a tree that's just about to be hidden.
      startTransition(() => {
        setOuter(2);
        setInner(2);
      });

      // Finish rendering and commit the in-progress render.
      await waitForPaint(['Sibling: 1']);
      expect(root).toMatchRenderedOutput(
        <>
          <span hidden={true}>Inner: 0</span>
          <span>Outer: 1</span>
          <span>Sibling: 1</span>
        </>,
      );

      // Now reveal the hidden tree at high priority.
      ReactNoop.flushSync(() => {
        root.render(<App show={true} />);
      });
      assertLog([
        // There are two pending updates on Inner, but only the first one
        // is processed, even though they share the same lane. If the second
        // update were erroneously processed, then Inner would be inconsistent
        // with Outer.
        'Inner: 1',
        'Outer: 1',
        'Sibling: 1',
        'Inner and outer are consistent',
      ]);
    });
    assertLog([
      'Inner: 2',
      'Outer: 2',
      'Sibling: 2',
      'Inner and outer are consistent',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Inner: 2</span>
        <span>Outer: 2</span>
        <span>Sibling: 2</span>
      </>,
    );
  });
});
