/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let startTransition;
let useDeferredValue;
let useMemo;
let useState;
let Suspense;
let Activity;
let assertLog;
let waitForPaint;
let textCache;

describe('ReactDeferredValue', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    startTransition = React.startTransition;
    useDeferredValue = React.useDeferredValue;
    useMemo = React.useMemo;
    useState = React.useState;
    Suspense = React.Suspense;
    Activity = React.Activity;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    waitForPaint = InternalTestUtils.waitForPaint;

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

  it('does not cause an infinite defer loop if the original value isn\t memoized', async () => {
    function App({value}) {
      // The object passed to useDeferredValue is never the same as the previous
      // render. A naive implementation would endlessly spawn deferred renders.
      const {value: deferredValue} = useDeferredValue({value});

      const child = useMemo(
        () => <Text text={'Original: ' + value} />,
        [value],
      );

      const deferredChild = useMemo(
        () => <Text text={'Deferred: ' + deferredValue} />,
        [deferredValue],
      );

      return (
        <div>
          <div>{child}</div>
          <div>{deferredChild}</div>
        </div>
      );
    }

    const root = ReactNoop.createRoot();

    // Initial render
    await act(() => {
      root.render(<App value={1} />);
    });
    assertLog(['Original: 1', 'Deferred: 1']);

    // If it's an urgent update, the value is deferred
    await act(async () => {
      root.render(<App value={2} />);

      await waitForPaint(['Original: 2']);
      // The deferred value updates in a separate render
      await waitForPaint(['Deferred: 2']);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <div>Original: 2</div>
        <div>Deferred: 2</div>
      </div>,
    );

    // But if it updates during a transition, it doesn't defer
    await act(async () => {
      startTransition(() => {
        root.render(<App value={3} />);
      });
      // The deferred value updates in the same render as the original
      await waitForPaint(['Original: 3', 'Deferred: 3']);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <div>Original: 3</div>
        <div>Deferred: 3</div>
      </div>,
    );
  });

  it('does not defer during a transition', async () => {
    function App({value}) {
      const deferredValue = useDeferredValue(value);

      const child = useMemo(
        () => <Text text={'Original: ' + value} />,
        [value],
      );

      const deferredChild = useMemo(
        () => <Text text={'Deferred: ' + deferredValue} />,
        [deferredValue],
      );

      return (
        <div>
          <div>{child}</div>
          <div>{deferredChild}</div>
        </div>
      );
    }

    const root = ReactNoop.createRoot();

    // Initial render
    await act(() => {
      root.render(<App value={1} />);
    });
    assertLog(['Original: 1', 'Deferred: 1']);

    // If it's an urgent update, the value is deferred
    await act(async () => {
      root.render(<App value={2} />);

      await waitForPaint(['Original: 2']);
      // The deferred value updates in a separate render
      await waitForPaint(['Deferred: 2']);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <div>Original: 2</div>
        <div>Deferred: 2</div>
      </div>,
    );

    // But if it updates during a transition, it doesn't defer
    await act(async () => {
      startTransition(() => {
        root.render(<App value={3} />);
      });
      // The deferred value updates in the same render as the original
      await waitForPaint(['Original: 3', 'Deferred: 3']);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <div>Original: 3</div>
        <div>Deferred: 3</div>
      </div>,
    );
  });

  it("works if there's a render phase update", async () => {
    function App({value: propValue}) {
      const [value, setValue] = useState(null);
      if (value !== propValue) {
        setValue(propValue);
      }

      const deferredValue = useDeferredValue(value);

      const child = useMemo(
        () => <Text text={'Original: ' + value} />,
        [value],
      );

      const deferredChild = useMemo(
        () => <Text text={'Deferred: ' + deferredValue} />,
        [deferredValue],
      );

      return (
        <div>
          <div>{child}</div>
          <div>{deferredChild}</div>
        </div>
      );
    }

    const root = ReactNoop.createRoot();

    // Initial render
    await act(() => {
      root.render(<App value={1} />);
    });
    assertLog(['Original: 1', 'Deferred: 1']);

    // If it's an urgent update, the value is deferred
    await act(async () => {
      root.render(<App value={2} />);

      await waitForPaint(['Original: 2']);
      // The deferred value updates in a separate render
      await waitForPaint(['Deferred: 2']);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <div>Original: 2</div>
        <div>Deferred: 2</div>
      </div>,
    );

    // But if it updates during a transition, it doesn't defer
    await act(async () => {
      startTransition(() => {
        root.render(<App value={3} />);
      });
      // The deferred value updates in the same render as the original
      await waitForPaint(['Original: 3', 'Deferred: 3']);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <div>Original: 3</div>
        <div>Deferred: 3</div>
      </div>,
    );
  });

  it('regression test: during urgent update, reuse previous value, not initial value', async () => {
    function App({value: propValue}) {
      const [value, setValue] = useState(null);
      if (value !== propValue) {
        setValue(propValue);
      }

      const deferredValue = useDeferredValue(value);

      const child = useMemo(
        () => <Text text={'Original: ' + value} />,
        [value],
      );

      const deferredChild = useMemo(
        () => <Text text={'Deferred: ' + deferredValue} />,
        [deferredValue],
      );

      return (
        <div>
          <div>{child}</div>
          <div>{deferredChild}</div>
        </div>
      );
    }

    const root = ReactNoop.createRoot();

    // Initial render
    await act(async () => {
      root.render(<App value={1} />);
      await waitForPaint(['Original: 1', 'Deferred: 1']);
      expect(root).toMatchRenderedOutput(
        <div>
          <div>Original: 1</div>
          <div>Deferred: 1</div>
        </div>,
      );
    });

    await act(async () => {
      startTransition(() => {
        root.render(<App value={2} />);
      });
      // In the regression, the memoized value was not updated during non-urgent
      // updates, so this would flip the deferred value back to the initial
      // value (1) instead of reusing the current one (2).
      await waitForPaint(['Original: 2', 'Deferred: 2']);
      expect(root).toMatchRenderedOutput(
        <div>
          <div>Original: 2</div>
          <div>Deferred: 2</div>
        </div>,
      );
    });

    await act(async () => {
      root.render(<App value={3} />);
      await waitForPaint(['Original: 3']);
      expect(root).toMatchRenderedOutput(
        <div>
          <div>Original: 3</div>
          <div>Deferred: 2</div>
        </div>,
      );
      await waitForPaint(['Deferred: 3']);
      expect(root).toMatchRenderedOutput(
        <div>
          <div>Original: 3</div>
          <div>Deferred: 3</div>
        </div>,
      );
    });
  });

  it('supports initialValue argument', async () => {
    function App() {
      const value = useDeferredValue('Final', 'Initial');
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<App />);
      await waitForPaint(['Initial']);
      expect(root).toMatchRenderedOutput('Initial');
    });
    assertLog(['Final']);
    expect(root).toMatchRenderedOutput('Final');
  });

  it('defers during initial render when initialValue is provided, even if render is not sync', async () => {
    function App() {
      const value = useDeferredValue('Final', 'Initial');
      return <Text text={value} />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      // Initial mount is a transition, but it should defer anyway
      startTransition(() => root.render(<App />));
      await waitForPaint(['Initial']);
      expect(root).toMatchRenderedOutput('Initial');
    });
    assertLog(['Final']);
    expect(root).toMatchRenderedOutput('Final');
  });

  it(
    'if a suspended render spawns a deferred task, we can switch to the ' +
      'deferred task without finishing the original one (no Suspense boundary)',
    async () => {
      function App() {
        const text = useDeferredValue('Final', 'Loading...');
        return <AsyncText text={text} />;
      }

      const root = ReactNoop.createRoot();
      await act(() => root.render(<App />));
      assertLog([
        'Suspend! [Loading...]',
        // The initial value suspended, so we attempt the final value, which
        // also suspends.
        'Suspend! [Final]',
        ...(gate('enableParallelTransitions')
          ? []
          : [
              // Existing bug: Unnecessary pre-warm.
              'Suspend! [Loading...]',
              'Suspend! [Final]',
            ]),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The final value loads, so we can skip the initial value entirely.
      await act(() => resolveText('Final'));
      assertLog(['Final']);
      expect(root).toMatchRenderedOutput('Final');

      // When the initial value finally loads, nothing happens because we no
      // longer need it.
      await act(() => resolveText('Loading...'));
      assertLog([]);
      expect(root).toMatchRenderedOutput('Final');
    },
  );

  it(
    'if a suspended render spawns a deferred task that suspends on a sibling, ' +
      'we can finish the original task if the original sibling loads first',
    async () => {
      function App() {
        const deferredText = useDeferredValue(`Final`, `Loading...`);
        return (
          <>
            <AsyncText text={deferredText} />{' '}
            <AsyncText text={`Sibling: ${deferredText}`} />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => root.render(<App text="a" />));
      assertLog([
        'Suspend! [Loading...]',
        // The initial value suspended, so we attempt the final value, which
        // also suspends.
        'Suspend! [Final]',
        'Suspend! [Sibling: Final]',
        ...(gate('enableParallelTransitions')
          ? [
              // With parallel transitions,
              // we do not continue pre-warming.
            ]
          : [
              'Suspend! [Loading...]',
              'Suspend! [Sibling: Loading...]',
              'Suspend! [Final]',
              'Suspend! [Sibling: Final]',
            ]),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The final value loads, so we can skip the initial value entirely.
      await act(() => {
        resolveText('Final');
      });
      assertLog(['Final', 'Suspend! [Sibling: Final]']);
      expect(root).toMatchRenderedOutput(null);

      // The initial value resolves first, so we render that.
      await act(() => resolveText('Loading...'));
      assertLog([
        'Loading...',
        'Suspend! [Sibling: Loading...]',
        'Final',
        'Suspend! [Sibling: Final]',
        ...(gate('enableParallelTransitions')
          ? [
              // With parallel transitions,
              // we do not continue pre-warming.
            ]
          : [
              'Loading...',
              'Suspend! [Sibling: Loading...]',
              'Final',
              'Suspend! [Sibling: Final]',
            ]),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The Final sibling loads, we're unblocked and commit.
      await act(() => {
        resolveText('Sibling: Final');
      });
      assertLog(['Final', 'Sibling: Final']);
      expect(root).toMatchRenderedOutput('Final Sibling: Final');

      // We already rendered the Final value, so nothing happens
      await act(() => {
        resolveText('Sibling: Loading...');
      });
      assertLog([]);
      expect(root).toMatchRenderedOutput('Final Sibling: Final');
    },
  );

  it(
    'if a suspended render spawns a deferred task that suspends on a sibling,' +
      ' we can switch to the deferred task without finishing the original one',
    async () => {
      function App() {
        const deferredText = useDeferredValue(`Final`, `Loading...`);
        return (
          <>
            <AsyncText text={deferredText} />{' '}
            <AsyncText text={`Sibling: ${deferredText}`} />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => root.render(<App text="a" />));
      assertLog([
        'Suspend! [Loading...]',
        // The initial value suspended, so we attempt the final value, which
        // also suspends.
        'Suspend! [Final]',
        'Suspend! [Sibling: Final]',
        ...(gate('enableParallelTransitions')
          ? [
              // With parallel transitions,
              // we do not continue pre-warming.
            ]
          : [
              'Suspend! [Loading...]',
              'Suspend! [Sibling: Loading...]',
              'Suspend! [Final]',
              'Suspend! [Sibling: Final]',
            ]),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The final value loads, so we can skip the initial value entirely.
      await act(() => {
        resolveText('Final');
      });
      assertLog(['Final', 'Suspend! [Sibling: Final]']);
      expect(root).toMatchRenderedOutput(null);

      // The initial value resolves first, so we render that.
      await act(() => resolveText('Loading...'));
      assertLog([
        'Loading...',
        'Suspend! [Sibling: Loading...]',
        'Final',
        'Suspend! [Sibling: Final]',
        ...(gate('enableParallelTransitions')
          ? [
              // With parallel transitions,
              // we do not continue pre-warming.
            ]
          : [
              'Loading...',
              'Suspend! [Sibling: Loading...]',
              'Final',
              'Suspend! [Sibling: Final]',
            ]),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The initial sibling loads, we're unblocked and commit.
      await act(() => {
        resolveText('Sibling: Loading...');
      });
      assertLog([
        'Loading...',
        'Sibling: Loading...',
        'Final',
        'Suspend! [Sibling: Final]',
      ]);
      expect(root).toMatchRenderedOutput('Loading... Sibling: Loading...');

      // Now unblock the final sibling.
      await act(() => {
        resolveText('Sibling: Final');
      });
      assertLog(['Final', 'Sibling: Final']);
      expect(root).toMatchRenderedOutput('Final Sibling: Final');
    },
  );

  it(
    'if a suspended render spawns a deferred task, we can switch to the ' +
      'deferred task without finishing the original one (no Suspense boundary, ' +
      'synchronous parent update)',
    async () => {
      function App() {
        const text = useDeferredValue('Final', 'Loading...');
        return <AsyncText text={text} />;
      }

      const root = ReactNoop.createRoot();
      // TODO: This made me realize that we don't warn if an update spawns a
      // deferred task without being wrapped with `act`. Usually it would work
      // anyway because the parent task has to wrapped with `act`... but not
      // if it was flushed with `flushSync` instead.
      await act(() => {
        ReactNoop.flushSync(() => root.render(<App />));
      });
      assertLog([
        'Suspend! [Loading...]',
        // The initial value suspended, so we attempt the final value, which
        // also suspends.
        'Suspend! [Final]',
        ...(gate('enableParallelTransitions')
          ? [
              // With parallel transitions,
              // we do not continue pre-warming.
            ]
          : ['Suspend! [Loading...]', 'Suspend! [Final]']),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The final value loads, so we can skip the initial value entirely.
      await act(() => resolveText('Final'));
      assertLog(['Final']);
      expect(root).toMatchRenderedOutput('Final');

      // When the initial value finally loads, nothing happens because we no
      // longer need it.
      await act(() => resolveText('Loading...'));
      assertLog([]);
      expect(root).toMatchRenderedOutput('Final');
    },
  );

  it(
    'if a suspended render spawns a deferred task, we can switch to the ' +
      'deferred task without finishing the original one (Suspense boundary)',
    async () => {
      function App() {
        const text = useDeferredValue('Final', 'Loading...');
        return <AsyncText text={text} />;
      }

      const root = ReactNoop.createRoot();
      await act(() =>
        root.render(
          <Suspense fallback={<Text text="Fallback" />}>
            <App />
          </Suspense>,
        ),
      );
      assertLog([
        'Suspend! [Loading...]',
        'Fallback',

        // The initial value suspended, so we attempt the final value, which
        // also suspends.
        'Suspend! [Final]',
        // pre-warming
        'Suspend! [Final]',
      ]);
      expect(root).toMatchRenderedOutput('Fallback');

      // The final value loads, so we can skip the initial value entirely.
      await act(() => resolveText('Final'));
      assertLog(['Final']);
      expect(root).toMatchRenderedOutput('Final');

      // When the initial value finally loads, nothing happens because we no
      // longer need it.
      await act(() => resolveText('Loading...'));
      assertLog([]);
      expect(root).toMatchRenderedOutput('Final');
    },
  );

  it(
    'if a suspended render spawns a deferred task that also suspends, we can ' +
      'finish the original task if that one loads first',
    async () => {
      function App() {
        const text = useDeferredValue('Final', 'Loading...');
        return <AsyncText text={text} />;
      }

      const root = ReactNoop.createRoot();
      await act(() => root.render(<App />));
      assertLog([
        'Suspend! [Loading...]',
        // The initial value suspended, so we attempt the final value, which
        // also suspends.
        'Suspend! [Final]',
        ...(gate('enableParallelTransitions')
          ? [
              // With parallel transitions,
              // we do not continue pre-warming.
            ]
          : ['Suspend! [Loading...]', 'Suspend! [Final]']),
      ]);
      expect(root).toMatchRenderedOutput(null);

      // The initial value resolves first, so we render that.
      await act(() => resolveText('Loading...'));
      assertLog([
        'Loading...',
        // Still waiting for the final value.
        'Suspend! [Final]',
      ]);
      expect(root).toMatchRenderedOutput('Loading...');

      // The final value loads, so we can switch to that.
      await act(() => resolveText('Final'));
      assertLog(['Final']);
      expect(root).toMatchRenderedOutput('Final');
    },
  );

  it(
    'if there are multiple useDeferredValues in the same tree, only the ' +
      'first level defers; subsequent ones go straight to the final value, to ' +
      'avoid a waterfall',
    async () => {
      function App() {
        const showContent = useDeferredValue(true, false);
        if (!showContent) {
          return <Text text="App Preview" />;
        }
        return <Content />;
      }

      function Content() {
        const text = useDeferredValue('Content', 'Content Preview');
        return <AsyncText text={text} />;
      }

      const root = ReactNoop.createRoot();
      resolveText('App Preview');

      await act(() => root.render(<App />));
      assertLog([
        // The App shows an immediate preview
        'App Preview',
        // Then we switch to showing the content. The Content component also
        // contains a useDeferredValue, but since we already showed a preview
        // in a parent component, we skip the preview in the inner one and
        // go straight to attempting the final value.
        //
        // (Note that this is intentionally different from how nested Suspense
        // boundaries work, where we always prefer to show the innermost
        // loading state.)
        'Suspend! [Content]',
      ]);
      // Still showing the App preview state because the inner
      // content suspended.
      expect(root).toMatchRenderedOutput('App Preview');

      // Finish loading the content
      await act(() => resolveText('Content'));
      // We didn't even attempt to render Content Preview.
      assertLog(['Content']);
      expect(root).toMatchRenderedOutput('Content');
    },
  );

  it(
    "regression: useDeferredValue's initial value argument works even if an unrelated " +
      'transition is suspended',
    async () => {
      // Simulates a previous bug where a new useDeferredValue hook is mounted
      // while some unrelated transition is suspended. In the regression case,
      // the initial values was skipped/ignored.

      function Content({text}) {
        return (
          <AsyncText text={useDeferredValue(text, `Preview ${text}...`)} />
        );
      }

      function App({text}) {
        // Use a key to force a new Content instance to be mounted each time
        // the text changes.
        return <Content key={text} text={text} />;
      }

      const root = ReactNoop.createRoot();

      // Render a previous UI using useDeferredValue. Suspend on the
      // final value.
      resolveText('Preview A...');
      await act(() => startTransition(() => root.render(<App text="A" />)));
      assertLog(['Preview A...', 'Suspend! [A]']);

      // While it's still suspended, update the UI to show a different screen
      // with a different preview value. We should be able to show the new
      // preview even though the previous transition never finished.
      resolveText('Preview B...');
      await act(() => startTransition(() => root.render(<App text="B" />)));
      assertLog(['Preview B...', 'Suspend! [B]']);

      // Now finish loading the final value.
      await act(() => resolveText('B'));
      assertLog(['B']);
      expect(root).toMatchRenderedOutput('B');
    },
  );

  it('avoids a useDeferredValue waterfall when separated by a Suspense boundary', async () => {
    // Same as the previous test but with a Suspense boundary separating the
    // two useDeferredValue hooks.
    function App() {
      const showContent = useDeferredValue(true, false);
      if (!showContent) {
        return <Text text="App Preview" />;
      }
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <Content />
        </Suspense>
      );
    }

    function Content() {
      const text = useDeferredValue('Content', 'Content Preview');
      return <AsyncText text={text} />;
    }

    const root = ReactNoop.createRoot();
    resolveText('App Preview');

    await act(() => root.render(<App />));
    assertLog([
      // The App shows an immediate preview
      'App Preview',
      // Then we switch to showing the content. The Content component also
      // contains a useDeferredValue, but since we already showed a preview
      // in a parent component, we skip the preview in the inner one and
      // go straight to attempting the final value.
      'Suspend! [Content]',
      'Loading...',
      // pre-warming
      'Suspend! [Content]',
    ]);
    // The content suspended, so we show a Suspense fallback
    expect(root).toMatchRenderedOutput('Loading...');

    // Finish loading the content
    await act(() => resolveText('Content'));
    // We didn't even attempt to render Content Preview.
    assertLog(['Content']);
    expect(root).toMatchRenderedOutput('Content');
  });

  it('useDeferredValue can spawn a deferred task while prerendering a hidden tree', async () => {
    function App() {
      const text = useDeferredValue('Final', 'Preview');
      return (
        <div>
          <AsyncText text={text} />
        </div>
      );
    }

    let revealContent;
    function Container({children}) {
      const [shouldShow, setState] = useState(false);
      revealContent = () => setState(true);
      return (
        <Activity mode={shouldShow ? 'visible' : 'hidden'}>{children}</Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Prerender a hidden tree
    resolveText('Preview');
    await act(() =>
      root.render(
        <Container>
          <App />
        </Container>,
      ),
    );
    assertLog(['Preview', 'Suspend! [Final]']);
    expect(root).toMatchRenderedOutput(<div hidden={true}>Preview</div>);

    // Finish loading the content
    await act(() => resolveText('Final'));
    assertLog(['Final']);
    expect(root).toMatchRenderedOutput(<div hidden={true}>Final</div>);

    // Now reveal the hidden tree. It should toggle the visibility without
    // having to re-render anything inside the prerendered tree.
    await act(() => revealContent());
    assertLog([]);
    expect(root).toMatchRenderedOutput(<div>Final</div>);
  });

  it('useDeferredValue can prerender the initial value inside a hidden tree', async () => {
    function App({text}) {
      const renderedText = useDeferredValue(text, `Preview [${text}]`);
      return (
        <div>
          <Text text={renderedText} />
        </div>
      );
    }

    let revealContent;
    function Container({children}) {
      const [shouldShow, setState] = useState(false);
      revealContent = () => setState(true);
      return (
        <Activity mode={shouldShow ? 'visible' : 'hidden'}>{children}</Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Prerender some content
    await act(() => {
      root.render(
        <Container>
          <App text="A" />
        </Container>,
      );
    });
    assertLog(['Preview [A]', 'A']);
    expect(root).toMatchRenderedOutput(<div hidden={true}>A</div>);

    await act(async () => {
      // While the tree is still hidden, update the pre-rendered tree.
      root.render(
        <Container>
          <App text="B" />
        </Container>,
      );
      // We should switch to pre-rendering the new preview.
      await waitForPaint([]);
      await waitForPaint(['Preview [B]']);
      expect(root).toMatchRenderedOutput(<div hidden={true}>Preview [B]</div>);

      // Before the prerender is complete, reveal the hidden tree. Because we
      // consider revealing a hidden tree to be the same as mounting a new one,
      // we should not skip the preview state.
      revealContent();
      // Because the preview state was already prerendered, we can reveal it
      // without any addditional work.
      if (gate(flags => flags.enableYieldingBeforePassive)) {
        // Passive effects.
        await waitForPaint([]);
      }
      await waitForPaint([]);
      expect(root).toMatchRenderedOutput(<div>Preview [B]</div>);
    });
    // Finally, finish rendering the final value.
    assertLog(['B']);
    expect(root).toMatchRenderedOutput(<div>B</div>);
  });

  it(
    'useDeferredValue skips the preview state when revealing a hidden tree ' +
      'if the final value is referentially identical',
    async () => {
      function App({text}) {
        const renderedText = useDeferredValue(text, `Preview [${text}]`);
        return (
          <div>
            <Text text={renderedText} />
          </div>
        );
      }

      function Container({text, shouldShow}) {
        return (
          <Activity mode={shouldShow ? 'visible' : 'hidden'}>
            <App text={text} />
          </Activity>
        );
      }

      const root = ReactNoop.createRoot();

      // Prerender some content
      await act(() => root.render(<Container text="A" shouldShow={false} />));
      assertLog(['Preview [A]', 'A']);
      expect(root).toMatchRenderedOutput(<div hidden={true}>A</div>);

      // Reveal the prerendered tree. Because the final value is referentially
      // equal to what was already prerendered, we can skip the preview state
      // and go straight to the final one. The practical upshot of this is
      // that we can completely prerender the final value without having to
      // do additional rendering work when the tree is revealed.
      await act(() => root.render(<Container text="A" shouldShow={true} />));
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<div>A</div>);
    },
  );

  it(
    'useDeferredValue does not skip the preview state when revealing a ' +
      'hidden tree if the final value is different from the currently rendered one',
    async () => {
      function App({text}) {
        const renderedText = useDeferredValue(text, `Preview [${text}]`);
        return (
          <div>
            <Text text={renderedText} />
          </div>
        );
      }

      function Container({text, shouldShow}) {
        return (
          <Activity mode={shouldShow ? 'visible' : 'hidden'}>
            <App text={text} />
          </Activity>
        );
      }

      const root = ReactNoop.createRoot();

      // Prerender some content
      await act(() => root.render(<Container text="A" shouldShow={false} />));
      assertLog(['Preview [A]', 'A']);
      expect(root).toMatchRenderedOutput(<div hidden={true}>A</div>);

      // Reveal the prerendered tree. Because the final value is different from
      // what was already prerendered, we can't bail out. Since we treat
      // revealing a hidden tree the same as a new mount, show the preview state
      // before switching to the final one.
      await act(async () => {
        root.render(<Container text="B" shouldShow={true} />);
        // First commit the preview state
        await waitForPaint(['Preview [B]']);
        expect(root).toMatchRenderedOutput(<div>Preview [B]</div>);
      });
      // Then switch to the final state
      assertLog(['B']);
      expect(root).toMatchRenderedOutput(<div>B</div>);
    },
  );

  it(
    'useDeferredValue does not show "previous" value when revealing a hidden ' +
      'tree (no initial value)',
    async () => {
      function App({text}) {
        const renderedText = useDeferredValue(text);
        return (
          <div>
            <Text text={renderedText} />
          </div>
        );
      }

      function Container({text, shouldShow}) {
        return (
          <Activity mode={shouldShow ? 'visible' : 'hidden'}>
            <App text={text} />
          </Activity>
        );
      }

      const root = ReactNoop.createRoot();

      // Prerender some content
      await act(() => root.render(<Container text="A" shouldShow={false} />));
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<div hidden={true}>A</div>);

      // Update the prerendered tree and reveal it at the same time. Even though
      // this is a sync update, we should update B immediately rather than stay
      // on the old value (A), because conceptually this is a new tree.
      await act(() => root.render(<Container text="B" shouldShow={true} />));
      assertLog(['B']);
      expect(root).toMatchRenderedOutput(<div>B</div>);
    },
  );

  // Regression test for https://github.com/facebook/react/issues/35821
  it('deferred value catches up when a suspension is resolved during the same render', async () => {
    let setValue;
    function App() {
      const [value, _setValue] = useState('initial');
      setValue = _setValue;
      const deferred = useDeferredValue(value);
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text={'A:' + deferred} />
          <Sibling text={deferred} />
        </Suspense>
      );
    }

    function Sibling({text}) {
      if (text !== 'initial') {
        // Resolve A during this render, simulating data arriving while
        // a render is already in progress.
        resolveText('A:' + text);
      }
      readText('B:' + text);
      Scheduler.log('B: ' + text);
      return text;
    }

    const root = ReactNoop.createRoot();

    resolveText('A:initial');
    resolveText('B:initial');
    await act(() => root.render(<App />));
    assertLog(['A:initial', 'B: initial']);

    // Pre-resolve B so the sibling won't suspend on retry.
    resolveText('B:updated');

    await act(() => setValue('updated'));
    assertLog([
      // Sync render defers the value.
      'A:initial',
      'B: initial',
      // Deferred render: A suspends, then Sibling resolves A mid-render.
      'Suspend! [A:updated]',
      'B: updated',
      'Loading...',
      // React retries and the deferred value catches up.
      'A:updated',
      'B: updated',
    ]);
    expect(root).toMatchRenderedOutput('A:updatedupdated');
  });
});
