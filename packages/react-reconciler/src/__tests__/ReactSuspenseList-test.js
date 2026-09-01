/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

let React;
let ReactNoop;
let Scheduler;
let act;
let Profiler;
let Suspense;
let SuspenseList;
let waitForAll;
let assertLog;
let waitFor;
let assertConsoleErrorDev;

describe('ReactSuspenseList', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    Profiler = React.Profiler;
    Suspense = React.Suspense;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;
    act = InternalTestUtils.act;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  function Text(props) {
    Scheduler.log(props.text);
    return <span>{props.text}</span>;
  }

  function createAsyncText(text) {
    let resolved = false;
    const Component = function () {
      if (!resolved) {
        Scheduler.log('Suspend! [' + text + ']');
        throw promise;
      }
      return <Text text={text} />;
    };
    const promise = new Promise(resolve => {
      Component.resolve = function () {
        resolved = true;
        return resolve();
      };
    });
    return Component;
  }

  // @gate enableSuspenseList
  it('warns if an unsupported revealOrder option is used', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="something">
          <Suspense fallback="Loading">Content</Suspense>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo />);
    });
    assertConsoleErrorDev([
      '"something" is not a supported revealOrder on ' +
        '<SuspenseList />. Did you mean "independent", "together", "forwards" or "backwards"?' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('warns if a upper case revealOrder option is used', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="TOGETHER">
          <Suspense fallback="Loading">Content</Suspense>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo />);
    });
    assertConsoleErrorDev([
      '"TOGETHER" is not a valid value for revealOrder on ' +
        '<SuspenseList />. Use lowercase "together" instead.' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('warns if a misspelled revealOrder option is used', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="forward">
          <Suspense fallback="Loading">Content</Suspense>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo />);
    });
    assertConsoleErrorDev([
      '"forward" is not a valid value for revealOrder on ' +
        '<SuspenseList />. React uses the -s suffix in the spelling. ' +
        'Use "forwards" instead.' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('warns if a single element is passed to a "forwards" list', async () => {
    function Foo({children}) {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          {children}
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);
    // No warning
    await waitForAll([]);

    ReactNoop.render(<Foo>{null}</Foo>);
    // No warning
    await waitForAll([]);

    ReactNoop.render(<Foo>{false}</Foo>);
    // No warning
    await waitForAll([]);

    await act(() => {
      ReactNoop.render(
        <Foo>
          <Suspense fallback="Loading">Child</Suspense>
        </Foo>,
      );
    });
    assertConsoleErrorDev([
      'A single row was passed to a <SuspenseList revealOrder="forwards" />. ' +
        'This is not useful since it needs multiple rows. ' +
        'Did you mean to pass multiple children or an array?' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('warns if a single fragment is passed to a "backwards" list', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="unstable_legacy-backwards" tail="visible">
          <>{[]}</>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo />);
    });
    assertConsoleErrorDev([
      'A single row was passed to a <SuspenseList revealOrder="unstable_legacy-backwards" />. ' +
        'This is not useful since it needs multiple rows. ' +
        'Did you mean to pass multiple children or an array?' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('warns if a nested array is passed to a "forwards" list', async () => {
    function Foo({items}) {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          {items.map(name => (
            <Suspense key={name} fallback="Loading">
              {name}
            </Suspense>
          ))}
          <div>Tail</div>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo items={['A', 'B']} />);
    });
    assertConsoleErrorDev([
      'A nested array was passed to row #0 in <SuspenseList />. ' +
        'Wrap it in an additional SuspenseList to configure its revealOrder: ' +
        '<SuspenseList revealOrder=...> ... ' +
        '<SuspenseList revealOrder=...>{array}</SuspenseList> ... ' +
        '</SuspenseList>' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('behaves as revealOrder=forwards by default', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList>
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll(['Suspend! [A]', 'Loading A']);

    expect(ReactNoop).toMatchRenderedOutput(null);

    await A.resolve();

    await waitForAll(['A', 'Suspend! [B]', 'Loading B']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]', 'Loading C']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('shows content independently with revealOrder="independent"', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="independent">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    await A.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Suspend! [C]',
      'Loading C',
      // pre-warming
      'Suspend! [B]',
      'Suspend! [C]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(
      gate('alwaysThrottleRetries')
        ? ['Suspend! [B]', 'C', 'Suspend! [B]']
        : ['C'],
    );

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList && !disableLegacyMode
  it('shows content independently in legacy mode regardless of option', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    await A.resolve();

    ReactNoop.renderLegacySyncRoot(<Foo />);

    assertLog(['A', 'Suspend! [B]', 'Loading B', 'Suspend! [C]', 'Loading C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => {
      C.resolve();
    });

    assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>C</span>
      </>,
    );

    await act(() => {
      B.resolve();
    });

    assertLog(['B']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays all "together"', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    await A.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Suspend! [C]',
      'Loading C',
      'Loading A',
      'Loading B',
      'Loading C',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['A', 'B', 'Suspend! [C]']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays all "together" even when nested as siblings', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <div>
            <Suspense fallback={<Text text="Loading A" />}>
              <A />
            </Suspense>
            <Suspense fallback={<Text text="Loading B" />}>
              <B />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<Text text="Loading C" />}>
              <C />
            </Suspense>
          </div>
        </SuspenseList>
      );
    }

    await A.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Suspend! [C]',
      'Loading C',
      'Loading A',
      'Loading B',
      'Loading C',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>Loading A</span>
          <span>Loading B</span>
        </div>
        <div>
          <span>Loading C</span>
        </div>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['A', 'B', 'Suspend! [C]']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>Loading A</span>
          <span>Loading B</span>
        </div>
        <div>
          <span>Loading C</span>
        </div>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>A</span>
          <span>B</span>
        </div>
        <div>
          <span>C</span>
        </div>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays all "together" in nested SuspenseLists', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <SuspenseList revealOrder="together">
            <Suspense fallback={<Text text="Loading B" />}>
              <B />
            </Suspense>
            <Suspense fallback={<Text text="Loading C" />}>
              <C />
            </Suspense>
          </SuspenseList>
        </SuspenseList>
      );
    }

    await A.resolve();
    await B.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'B',
      'Suspend! [C]',
      'Loading C',
      'Loading B',
      'Loading C',
      'Loading A',
      'Loading B',
      'Loading C',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays all "together" in nested SuspenseLists where the inner is "independent"', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <SuspenseList revealOrder="independent">
            <Suspense fallback={<Text text="Loading B" />}>
              <B />
            </Suspense>
            <Suspense fallback={<Text text="Loading C" />}>
              <C />
            </Suspense>
          </SuspenseList>
        </SuspenseList>
      );
    }

    await A.resolve();
    await B.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'B',
      'Suspend! [C]',
      'Loading C',
      'Loading A',
      'Loading B',
      'Loading C',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays all "together" during an update', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');
    const D = createAsyncText('D');

    function Foo({step}) {
      return (
        <SuspenseList revealOrder="together">
          {step === 0 && (
            <Suspense fallback={<Text text="Loading A" />}>
              <A />
            </Suspense>
          )}
          {step === 0 && (
            <Suspense fallback={<Text text="Loading B" />}>
              <B />
            </Suspense>
          )}
          {step === 1 && (
            <Suspense fallback={<Text text="Loading C" />}>
              <C />
            </Suspense>
          )}
          {step === 1 && (
            <Suspense fallback={<Text text="Loading D" />}>
              <D />
            </Suspense>
          )}
        </SuspenseList>
      );
    }

    // Mount
    await A.resolve();
    ReactNoop.render(<Foo step={0} />);
    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Loading A',
      'Loading B',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
      </>,
    );
    await act(() => B.resolve());
    assertLog(['A', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );

    // Update
    await C.resolve();
    ReactNoop.render(<Foo step={1} />);
    await waitForAll([
      'C',
      'Suspend! [D]',
      'Loading D',
      'Loading C',
      'Loading D',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading C</span>
        <span>Loading D</span>
      </>,
    );
    await act(() => D.resolve());
    assertLog(['C', 'D']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>C</span>
        <span>D</span>
      </>,
    );
  });

  // @gate enableSuspenseList && enableSuspenseAvoidThisFallback
  it('avoided boundaries can be coordinate with SuspenseList', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo({showMore}) {
      return (
        <Suspense fallback={<Text text="Loading" />}>
          <SuspenseList revealOrder="together">
            <Suspense
              unstable_avoidThisFallback={true}
              fallback={<Text text="Loading A" />}>
              <A />
            </Suspense>
            {showMore ? (
              <>
                <Suspense
                  unstable_avoidThisFallback={true}
                  fallback={<Text text="Loading B" />}>
                  <B />
                </Suspense>
                <Suspense
                  unstable_avoidThisFallback={true}
                  fallback={<Text text="Loading C" />}>
                  <C />
                </Suspense>
              </>
            ) : null}
          </SuspenseList>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [A]',
      'Loading',
      // pre-warming
      'Suspend! [A]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(<span>Loading</span>);

    await act(() => A.resolve());
    assertLog(['A']);

    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    // Let's do an update that should consult the avoided boundaries.
    ReactNoop.render(<Foo showMore={true} />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Suspend! [C]',
      'Loading C',
      'A',
      'Loading B',
      'Loading C',
    ]);

    // This will suspend, since the boundaries are avoided. Give them
    // time to display their loading states.
    jest.advanceTimersByTime(500);

    // A is already showing content so it doesn't turn into a fallback.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]']);

    // Even though we could now show B, we're still waiting on C.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('boundaries without fallbacks can be coordinate with SuspenseList', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo({showMore}) {
      return (
        <Suspense fallback={<Text text="Loading" />}>
          <SuspenseList revealOrder="together">
            <Suspense>
              <A />
            </Suspense>
            {showMore ? (
              <>
                <Suspense>
                  <B />
                </Suspense>
                <Suspense>
                  <C />
                </Suspense>
              </>
            ) : null}
          </SuspenseList>
        </Suspense>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [A]',
      // null
    ]);

    expect(ReactNoop).toMatchRenderedOutput(null);

    await act(() => A.resolve());
    assertLog(['A']);

    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    // Let's do an update that should consult the avoided boundaries.
    ReactNoop.render(<Foo showMore={true} />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      // null
      'Suspend! [C]',
      // null
      'A',
      // null
      // null
    ]);

    // This will suspend, since the boundaries are avoided. Give them
    // time to display their loading states.
    jest.advanceTimersByTime(500);

    // A is already showing content so it doesn't turn into a fallback.
    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]']);

    // Even though we could now show B, we're still waiting on C.
    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    await act(() => C.resolve());
    assertLog(['B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays each items in "forwards" order', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    await C.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [A]',
      'Loading A',
      'Loading B',
      'Loading C',
      // pre-warming
      'Suspend! [A]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => A.resolve());
    assertLog(['A', 'Suspend! [B]', 'Suspend! [B]']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays each items in "backwards" order', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="backwards" tail="visible">
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
        </SuspenseList>
      );
    }

    await A.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [C]',
      'Loading C',
      'Loading B',
      'Loading A',
      // pre-warming
      'Suspend! [C]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog([
      'C',
      'Suspend! [B]',
      // pre-warming
      'Suspend! [B]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'A']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays each items in "backwards" order (legacy)', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="unstable_legacy-backwards" tail="visible">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    await A.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [C]',
      'Loading C',
      'Loading B',
      'Loading A',
      // pre-warming
      'Suspend! [C]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog([
      'C',
      'Suspend! [B]',
      // pre-warming
      'Suspend! [B]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'A']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays added row at the top "together" and the bottom in "forwards" order', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');
    const D = createAsyncText('D');
    const E = createAsyncText('E');
    const F = createAsyncText('F');

    function Foo({items}) {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          {items.map(([key, Component]) => (
            <Suspense key={key} fallback={<Text text={'Loading ' + key} />}>
              <Component />
            </Suspense>
          ))}
        </SuspenseList>
      );
    }

    await B.resolve();
    await D.resolve();

    ReactNoop.render(
      <Foo
        items={[
          ['B', B],
          ['D', D],
        ]}
      />,
    );

    await waitForAll(['B', 'D']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>B</span>
        <span>D</span>
      </>,
    );

    // Insert items in the beginning, middle and end.
    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['B', B],
          ['C', C],
          ['D', D],
          ['E', E],
          ['F', F],
        ]}
      />,
    );

    await waitForAll([
      'Suspend! [A]',
      'Loading A',
      'B',
      'Suspend! [C]',
      'Loading C',
      'D',
      'Loading A',
      'B',
      'Loading C',
      'D',
      'Loading E',
      'Loading F',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>B</span>
        <span>Loading C</span>
        <span>D</span>
        <span>Loading E</span>
        <span>Loading F</span>
      </>,
    );

    await act(() => A.resolve());
    assertLog(['A', 'Suspend! [C]']);

    // Even though we could show A, it is still in a fallback state because
    // C is not yet resolved. We need to resolve everything in the head first.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>B</span>
        <span>Loading C</span>
        <span>D</span>
        <span>Loading E</span>
        <span>Loading F</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog([
      'A',
      'C',
      'Suspend! [E]',
      // pre-warming
      'Suspend! [E]',
    ]);

    // We can now resolve the full head.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>Loading E</span>
        <span>Loading F</span>
      </>,
    );

    await act(() => E.resolve());
    assertLog([
      'E',
      'Suspend! [F]',
      // pre-warming
      'Suspend! [F]',
    ]);

    // In the tail we can resolve one-by-one.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>Loading F</span>
      </>,
    );

    await act(() => F.resolve());
    assertLog(['F']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );

    // We can also delete some items.
    ReactNoop.render(
      <Foo
        items={[
          ['D', D],
          ['E', E],
          ['F', F],
        ]}
      />,
    );

    await waitForAll(['D', 'E', 'F']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('displays added row at the top "together" and the bottom in "backwards" order', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const D = createAsyncText('D');
    const F = createAsyncText('F');

    function createSyncText(text) {
      return function () {
        return <Text text={text} />;
      };
    }

    const As = createSyncText('A');
    const Bs = createSyncText('B');
    const Cs = createSyncText('C');
    const Ds = createSyncText('D');
    const Es = createSyncText('E');
    const Fs = createSyncText('F');

    function Foo({items}) {
      return (
        <SuspenseList revealOrder="unstable_legacy-backwards" tail="visible">
          {items.map(([key, Component]) => (
            <Suspense key={key} fallback={<Text text={'Loading ' + key} />}>
              <Component />
            </Suspense>
          ))}
        </SuspenseList>
      );
    }

    // The first pass doesn't suspend.
    ReactNoop.render(
      <Foo
        items={[
          ['A', As],
          ['B', Bs],
          ['C', Cs],
          ['D', Ds],
          ['E', Es],
          ['F', Fs],
        ]}
      />,
    );
    await waitForAll(['F', 'E', 'D', 'C', 'B', 'A']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );

    // Update items in the beginning, middle and end to start suspending.
    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['B', B],
          ['C', Cs],
          ['D', D],
          ['E', Es],
          ['F', F],
        ]}
      />,
    );

    await waitForAll([
      'Suspend! [A]',
      'Loading A',
      'Suspend! [B]',
      'Loading B',
      'C',
      'Suspend! [D]',
      'Loading D',
      'E',
      'Suspend! [F]',
      'Loading F',
      'Suspend! [A]',
      'Loading A',
      'Suspend! [B]',
      'Loading B',
      'C',
      'Suspend! [D]',
      'Loading D',
      'E',
      'Suspend! [F]',
      'Loading F',
      // pre-warming
      'Suspend! [D]',
      'Suspend! [F]',
    ]);

    // This will suspend, since the boundaries are avoided. Give them
    // time to display their loading states.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span>Loading A</span>
        <span hidden={true}>B</span>
        <span>Loading B</span>
        <span>C</span>
        <span hidden={true}>D</span>
        <span>Loading D</span>
        <span>E</span>
        <span hidden={true}>F</span>
        <span>Loading F</span>
      </>,
    );

    await F.resolve();

    await waitForAll(['Suspend! [D]', 'F']);

    // Even though we could show F, it is still in a fallback state because
    // E is not yet resolved. We need to resolve everything in the head first.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span>Loading A</span>
        <span hidden={true}>B</span>
        <span>Loading B</span>
        <span>C</span>
        <span hidden={true}>D</span>
        <span>Loading D</span>
        <span>E</span>
        <span hidden={true}>F</span>
        <span>Loading F</span>
      </>,
    );

    await act(() => D.resolve());
    assertLog([
      'D',
      'F',
      'Suspend! [B]',
      // pre-warming
      'Suspend! [B]',
    ]);

    // We can now resolve the full head.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span>Loading A</span>
        <span hidden={true}>B</span>
        <span>Loading B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog([
      'B',
      'Suspend! [A]',
      // pre-warming
      'Suspend! [A]',
    ]);

    // In the tail we can resolve one-by-one.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span hidden={true}>A</span>
        <span>Loading A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );

    await act(() => A.resolve());
    assertLog(['A']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('switches to rendering fallbacks if the tail takes long CPU time', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          <Suspense fallback={<Text text="Loading A" />}>
            <Text text="A" />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <Text text="B" />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <Text text="C" />
          </Suspense>
        </SuspenseList>
      );
    }

    // This render is only CPU bound. Nothing suspends.
    await act(async () => {
      React.startTransition(() => {
        ReactNoop.render(<Foo />);
      });

      await waitFor(['A']);

      Scheduler.unstable_advanceTime(200);
      jest.advanceTimersByTime(200);

      await waitFor(['B']);

      Scheduler.unstable_advanceTime(300);
      jest.advanceTimersByTime(300);

      // We've still not been able to show anything on the screen even though
      // we have two items ready.
      expect(ReactNoop).toMatchRenderedOutput(null);

      // Time has now elapsed for so long that we're just going to give up
      // rendering the rest of the content. So that we can at least show
      // something.
      await waitFor([
        'Loading C',
        'C', // I'll flush through into the next render so that the first commits.
      ]);

      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span>A</span>
          <span>B</span>
          <span>Loading C</span>
        </>,
      );
    });
    // Then we do a second pass to commit the last item.
    assertLog([]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('only shows one loading state at a time for "collapsed" tail insertions', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="collapsed">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [A]',
      'Loading A',
      // pre-warming
      'Suspend! [A]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(<span>Loading A</span>);

    await A.resolve();

    await waitForAll(['A', 'Suspend! [B]', 'Loading B']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
      </>,
    );

    await B.resolve();

    await waitForAll(['B', 'Suspend! [C]', 'Loading C']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => C.resolve());
    await assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('behaves as tail=hidden if no tail option is specified', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll(['Suspend! [A]', 'Loading A']);

    expect(ReactNoop).toMatchRenderedOutput(null);

    await A.resolve();

    await waitForAll(['A', 'Suspend! [B]', 'Loading B']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]', 'Loading C']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('warns if an unsupported tail option is used', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="collapse">
          <Suspense fallback="Loading">A</Suspense>
          <Suspense fallback="Loading">B</Suspense>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo />);
    });
    assertConsoleErrorDev([
      '"collapse" is not a supported value for tail on ' +
        '<SuspenseList />. Did you mean "visible", "collapsed" or "hidden"?' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('warns if a tail option is used with "together"', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="together" tail="collapsed">
          <Suspense fallback="Loading">Content</Suspense>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo />);
    });
    assertConsoleErrorDev([
      '<SuspenseList tail="collapsed" /> is only valid if ' +
        'revealOrder is "forwards" (default) or "backwards". ' +
        'Did you mean to specify revealOrder="forwards"?' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList
  it('renders one "collapsed" fallback even if CPU time elapsed', async () => {
    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="collapsed">
          <Suspense fallback={<Text text="Loading A" />}>
            <Text text="A" />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <Text text="B" />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <Text text="C" />
          </Suspense>
          <Suspense fallback={<Text text="Loading D" />}>
            <Text text="D" />
          </Suspense>
        </SuspenseList>
      );
    }

    // This render is only CPU bound. Nothing suspends.
    await act(async () => {
      React.startTransition(() => {
        ReactNoop.render(<Foo />);
      });

      await waitFor(['A']);

      Scheduler.unstable_advanceTime(200);
      jest.advanceTimersByTime(200);

      await waitFor(['B']);

      Scheduler.unstable_advanceTime(300);
      jest.advanceTimersByTime(300);

      // We've still not been able to show anything on the screen even though
      // we have two items ready.
      expect(ReactNoop).toMatchRenderedOutput(null);

      // Time has now elapsed for so long that we're just going to give up
      // rendering the rest of the content. So that we can at least show
      // something.
      await waitFor([
        'Loading C',
        'C', // I'll flush through into the next render so that the first commits.
      ]);

      expect(ReactNoop).toMatchRenderedOutput(
        <>
          <span>A</span>
          <span>B</span>
          <span>Loading C</span>
        </>,
      );
    });
    // Then we do a second pass to commit the last two items.
    assertLog(['D']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('adding to the middle does not collapse insertions (forwards)', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');
    const D = createAsyncText('D');
    const E = createAsyncText('E');
    const F = createAsyncText('F');

    function Foo({items}) {
      return (
        <SuspenseList revealOrder="forwards" tail="collapsed">
          {items.map(([key, Component]) => (
            <Suspense key={key} fallback={<Text text={'Loading ' + key} />}>
              <Component />
            </Suspense>
          ))}
        </SuspenseList>
      );
    }

    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['D', D],
        ]}
      />,
    );

    await A.resolve();
    await D.resolve();

    await waitForAll(['A', 'D']);

    // First render commits A and D.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>D</span>
      </>,
    );

    // For the second render, we're going to insert items in the middle and end.
    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['B', B],
          ['C', C],
          ['D', D],
          ['E', E],
          ['F', F],
        ]}
      />,
    );

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Suspend! [C]',
      'Loading C',
      'D',
      'A',
      'Loading B',
      'Loading C',
      'D',
      'Loading E',
    ]);

    // B and C don't get collapsed, but F gets collapsed with E.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
        <span>D</span>
        <span>Loading E</span>
      </>,
    );

    await B.resolve();

    await waitForAll(['B', 'Suspend! [C]']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    // Even though B is unsuspended, it's still in loading state because
    // it is blocked by C.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
        <span>D</span>
        <span>Loading E</span>
      </>,
    );

    await C.resolve();
    await E.resolve();

    await waitForAll(['B', 'C', 'E', 'Suspend! [F]', 'Loading F']);

    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>Loading F</span>
      </>,
    );

    await F.resolve();

    await waitForAll(['F']);

    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('adding to the middle does not collapse insertions (backwards)', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');
    const D = createAsyncText('D');
    const E = createAsyncText('E');
    const F = createAsyncText('F');

    function Foo({items}) {
      return (
        <SuspenseList revealOrder="unstable_legacy-backwards" tail="collapsed">
          {items.map(([key, Component]) => (
            <Suspense key={key} fallback={<Text text={'Loading ' + key} />}>
              <Component />
            </Suspense>
          ))}
        </SuspenseList>
      );
    }

    ReactNoop.render(
      <Foo
        items={[
          ['C', C],
          ['F', F],
        ]}
      />,
    );

    await C.resolve();
    await F.resolve();

    await waitForAll(['F', 'C']);

    // First render commits C and F.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>C</span>
        <span>F</span>
      </>,
    );

    // For the second render, we're going to insert items in the middle and end.
    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['B', B],
          ['C', C],
          ['D', D],
          ['E', E],
          ['F', F],
        ]}
      />,
    );

    await waitForAll([
      'C',
      'Suspend! [D]',
      'Loading D',
      'Suspend! [E]',
      'Loading E',
      'F',
      'C',
      'Loading D',
      'Loading E',
      'F',
      'Loading B',
    ]);

    // D and E don't get collapsed, but A gets collapsed with B.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading B</span>
        <span>C</span>
        <span>Loading D</span>
        <span>Loading E</span>
        <span>F</span>
      </>,
    );

    await D.resolve();

    await waitForAll(['D', 'Suspend! [E]']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    // Even though D is unsuspended, it's still in loading state because
    // it is blocked by E.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading B</span>
        <span>C</span>
        <span>Loading D</span>
        <span>Loading E</span>
        <span>F</span>
      </>,
    );

    await C.resolve();
    await E.resolve();

    await B.resolve();
    await C.resolve();
    await D.resolve();
    await E.resolve();

    await waitForAll(['D', 'E', 'B', 'Suspend! [A]', 'Loading A']);

    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );

    await A.resolve();

    await waitForAll(['A']);

    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('adding to the middle of committed tail does not collapse insertions', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');
    const D = createAsyncText('D');
    const E = createAsyncText('E');
    const F = createAsyncText('F');

    function SyncD() {
      return <Text text="D" />;
    }

    function Foo({items}) {
      return (
        <SuspenseList revealOrder="forwards" tail="collapsed">
          {items.map(([key, Component]) => (
            <Suspense key={key} fallback={<Text text={'Loading ' + key} />}>
              <Component />
            </Suspense>
          ))}
        </SuspenseList>
      );
    }

    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['D', SyncD],
        ]}
      />,
    );

    await A.resolve();

    await waitForAll(['A', 'D']);

    // First render commits A and D.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>D</span>
      </>,
    );

    // For the second render, we're going to insert items in the middle and end.
    // Note that D now suspends even though it didn't in the first pass.
    ReactNoop.render(
      <Foo
        items={[
          ['A', A],
          ['B', B],
          ['C', C],
          ['D', D],
          ['E', E],
          ['F', F],
        ]}
      />,
    );

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Suspend! [C]',
      'Loading C',
      'Suspend! [D]',
      'Loading D',
      'A',
      'Loading B',
      'Loading C',
      'Suspend! [D]',
      'Loading D',
      'Loading E',
      // pre-warming
      'Suspend! [B]',
    ]);

    // This is suspended due to the update to D causing a loading state.
    jest.advanceTimersByTime(500);

    // B and C don't get collapsed, but F gets collapsed with E.
    // Even though everything in the bottom of the list is suspended, we don't
    // collapse them because D was an update. Not an insertion.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
        <span hidden={true}>D</span>
        <span>Loading D</span>
        <span>Loading E</span>
      </>,
    );

    await B.resolve();

    await waitForAll([
      'B',
      'Suspend! [C]',
      ...(!gate('alwaysThrottleRetries') ? ['Suspend! [C]'] : []),
    ]);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    // B is able to unblock here because it's part of the tail.
    // If D was still visible it wouldn't be part of the tail
    // and would be blocked on C like in the other test.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>Loading C</span>
        <span hidden={true}>D</span>
        <span>Loading D</span>
        <span>Loading E</span>
      </>,
    );

    await C.resolve();
    await D.resolve();
    await E.resolve();

    await waitForAll(['C', 'D', 'E', 'Suspend! [F]', 'Loading F']);

    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>Loading F</span>
      </>,
    );

    await F.resolve();

    await waitForAll(['F']);

    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
        <span>E</span>
        <span>F</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('only shows no initial loading state "hidden" tail insertions', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="hidden">
          <Suspense fallback={<Text text="Loading A" />}>
            <A />
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <C />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll(['Suspend! [A]', 'Loading A']);

    expect(ReactNoop).toMatchRenderedOutput(null);

    await A.resolve();

    await waitForAll(['A', 'Suspend! [B]', 'Loading B']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]', 'Loading C']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('reveals "hidden" rows one by one without suspense boundaries', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="hidden">
          <div>
            <A />
          </div>
          <B />
          <C />
        </SuspenseList>
      );
    }

    ReactNoop.render(
      <Suspense fallback="Loading root">
        <Foo />
      </Suspense>,
    );

    await waitForAll(['Suspend! [A]']);

    // We can commit without any rows at all leaving empty.
    expect(ReactNoop).toMatchRenderedOutput(null);

    await act(() => A.resolve());
    assertLog(['A', 'Suspend! [B]']);

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>A</span>
      </div>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>A</span>
        </div>
        <span>B</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <div>
          <span>A</span>
        </div>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('preserves already mounted rows when a new hidden on is inserted in the tail', async () => {
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    let count = 0;
    function MountCount({children}) {
      // This component should only mount once.
      React.useLayoutEffect(() => {
        count++;
      }, []);
      return children;
    }

    function Foo({insert}) {
      return (
        <SuspenseList
          revealOrder="forwards"
          tail={insert ? 'hidden' : 'visible'}>
          <Text text="A" />
          {insert ? <B /> : null}
          <MountCount>
            <Suspense fallback={<Text text="Loading C" />}>
              <C />
            </Suspense>
          </MountCount>
        </SuspenseList>
      );
    }

    await act(() => {
      ReactNoop.render(<Foo insert={false} />);
    });
    assertLog(['A', 'Suspend! [C]', 'Loading C', 'Suspend! [C]']);

    expect(count).toBe(1);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => {
      ReactNoop.render(<Foo insert={true} />);
    });

    assertLog(['A', 'Suspend! [B]', 'A', 'Suspend! [B]']);

    expect(count).toBe(1);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading C</span>
      </>,
    );

    await act(async () => {
      await B.resolve();
      await C.resolve();
    });

    assertLog(['A', 'B', 'C']);

    expect(count).toBe(1);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('reveals "collapsed" rows one by one after the first without boundaries', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="collapsed">
          <A />
          <Suspense fallback={<Text text="Loading B" />}>
            <B />
          </Suspense>
          <C />
        </SuspenseList>
      );
    }

    await act(async () => {
      ReactNoop.render(
        <Suspense fallback="Loading root">
          <Foo />
        </Suspense>,
      );
      await waitForAll(['Suspend! [A]', 'Suspend! [A]']);
    });

    // The root is still blocked on the first row.
    expect(ReactNoop).toMatchRenderedOutput('Loading root');

    await A.resolve();

    await waitForAll(['A', 'Suspend! [B]', 'Loading B']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    // Because we have a Suspense boundary that can commit we can now unblock the rest.
    // If it wasn't a boundary then we couldn't make progress because it would commit
    // without any loading state.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'Suspend! [C]', 'B', 'Suspend! [C]']);

    // Incremental loading is suspended.
    jest.advanceTimersByTime(500);

    // Surprisingly unsuspending B actually causes the parent to resuspend
    // because C is now unblocked which resuspends the parent. Preventing the
    // Retry from committing. That's because we don't want to commit into a
    // state that doesn't have any loading indicators at all. That's what
    // "collapsed" is for. To ensure there's always a loading indicator.
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
      </>,
    );

    await act(() => C.resolve());
    assertLog(['B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('eventually resolves a nested forwards suspense list', async () => {
    const B = createAsyncText('B');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <SuspenseList revealOrder="forwards" tail="visible">
            <Suspense fallback={<Text text="Loading A" />}>
              <Text text="A" />
            </Suspense>
            <Suspense fallback={<Text text="Loading B" />}>
              <B />
            </Suspense>
            <Suspense fallback={<Text text="Loading C" />}>
              <Text text="C" />
            </Suspense>
          </SuspenseList>
          <Suspense fallback={<Text text="Loading D" />}>
            <Text text="D" />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Loading C',
      'D',
      // The second pass forces the fallbacks
      'Loading A',
      'Loading B',
      'Loading C',
      'Loading D',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
        <span>Loading D</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['A', 'B', 'C', 'D']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('eventually resolves a nested forwards suspense list with a hidden tail', async () => {
    const B = createAsyncText('B');

    function Foo() {
      return (
        <SuspenseList revealOrder="together">
          <SuspenseList revealOrder="forwards" tail="hidden">
            <Suspense fallback={<Text text="Loading A" />}>
              <Text text="A" />
            </Suspense>
            <Suspense fallback={<Text text="Loading B" />}>
              <B />
            </Suspense>
          </SuspenseList>
          <Suspense fallback={<Text text="Loading C" />}>
            <Text text="C" />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll(['A', 'Suspend! [B]', 'Loading B', 'C', 'Loading C']);

    expect(ReactNoop).toMatchRenderedOutput(<span>Loading C</span>);

    await act(() => B.resolve());
    assertLog(['A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('eventually resolves two nested forwards suspense lists with a hidden tail', async () => {
    const B = createAsyncText('B');

    function Foo({showB}) {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          <SuspenseList revealOrder="forwards" tail="hidden">
            <Suspense fallback={<Text text="Loading A" />}>
              <Text text="A" />
            </Suspense>
            {showB ? (
              <Suspense fallback={<Text text="Loading B" />}>
                <B />
              </Suspense>
            ) : null}
          </SuspenseList>
          <Suspense fallback={<Text text="Loading C" />}>
            <Text text="C" />
          </Suspense>
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo showB={false} />);

    await waitForAll(['A', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>C</span>
      </>,
    );

    // Showing the B later means that C has already committed
    // so we're now effectively in "together" mode for the head.
    ReactNoop.render(<Foo showB={true} />);

    await waitForAll(['A', 'Suspend! [B]', 'Loading B', 'C', 'A', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('can do unrelated adjacent updates', async () => {
    let updateAdjacent;
    function Adjacent() {
      const [text, setText] = React.useState('-');
      updateAdjacent = setText;
      return <Text text={text} />;
    }

    function Foo() {
      return (
        <div>
          <SuspenseList revealOrder="forwards" tail="visible">
            <Text text="A" />
            <Text text="B" />
          </SuspenseList>
          <Adjacent />
        </div>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll(['A', 'B', '-']);

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>A</span>
        <span>B</span>
        <span>-</span>
      </div>,
    );

    // Update the row adjacent to the list
    await act(() => updateAdjacent('C'));

    assertLog(['C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <div>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </div>,
    );
  });

  // @gate enableSuspenseList
  it('is able to re-suspend the last rows during an update with hidden', async () => {
    const AsyncB = createAsyncText('B');

    let setAsyncB;

    function B() {
      const [shouldBeAsync, setAsync] = React.useState(false);
      setAsyncB = setAsync;

      return shouldBeAsync ? (
        <Suspense fallback={<Text text="Loading B" />}>
          <AsyncB />
        </Suspense>
      ) : (
        <Text text="Sync B" />
      );
    }

    function Foo({updateList}) {
      return (
        <SuspenseList revealOrder="forwards" tail="hidden">
          <Suspense key="A" fallback={<Text text="Loading A" />}>
            <Text text="A" />
          </Suspense>
          <B key="B" updateList={updateList} />
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll(['A', 'Sync B']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Sync B</span>
      </>,
    );

    const previousInst = setAsyncB;

    // During an update we suspend on B.
    await act(() => setAsyncB(true));

    assertLog([
      'Suspend! [B]',
      'Loading B',
      // The second pass is the "force hide" pass
      'Loading B',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
      </>,
    );

    // Before we resolve we'll rerender the whole list.
    // This should leave the tree intact.
    await act(() => ReactNoop.render(<Foo updateList={true} />));

    assertLog([
      'A',
      'Suspend! [B]',
      'Loading B',
      // pre-warming
      'Suspend! [B]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
      </>,
    );

    await act(() => AsyncB.resolve());
    assertLog(['B']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );

    // This should be the same instance. I.e. it didn't
    // remount.
    expect(previousInst).toBe(setAsyncB);
  });

  // @gate enableSuspenseList
  it('is able to interrupt a partially rendered tree and continue later', async () => {
    const AsyncA = createAsyncText('A');

    let updateLowPri;
    let updateHighPri;

    function Bar() {
      const [highPriState, setHighPriState] = React.useState(false);
      updateHighPri = setHighPriState;
      return highPriState ? <AsyncA /> : null;
    }

    function Foo() {
      const [lowPriState, setLowPriState] = React.useState(false);
      updateLowPri = setLowPriState;
      return (
        <SuspenseList revealOrder="forwards" tail="hidden">
          <Suspense key="A" fallback={<Text text="Loading A" />}>
            <Bar />
          </Suspense>
          {lowPriState ? <Text text="B" /> : null}
          {lowPriState ? <Text text="C" /> : null}
          {lowPriState ? <Text text="D" /> : null}
        </SuspenseList>
      );
    }

    ReactNoop.render(<Foo />);

    await waitForAll([]);

    expect(ReactNoop).toMatchRenderedOutput(null);

    await act(async () => {
      // Add a few items at the end.
      React.startTransition(() => {
        updateLowPri(true);
      });

      // Flush partially through.
      await waitFor(['B', 'C']);

      // Schedule another update at higher priority.
      ReactNoop.flushSync(() => updateHighPri(true));

      // That will intercept the previous render.
      assertLog([
        'Suspend! [A]',
        'Loading A',
        // Re-render at forced.
        'Suspend! [A]',
        'Loading A',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span>Loading A</span>);

      // Try again on low-pri.
      await waitForAll([
        'Suspend! [A]',
        'Loading A',
        // pre-warming
        'Suspend! [A]',
      ]);
      expect(ReactNoop).toMatchRenderedOutput(<span>Loading A</span>);
    });

    await act(() => AsyncA.resolve());
    assertLog(['A', 'B', 'C', 'D']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>D</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('can resume class components when revealed together', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');

    class ClassComponent extends React.Component {
      render() {
        return this.props.children;
      }
    }

    function Foo() {
      return (
        <Suspense fallback={<Text text="Loading" />}>
          <SuspenseList revealOrder="together">
            <ClassComponent>
              <Suspense fallback={<Text text="Loading A" />}>
                <A />
              </Suspense>
            </ClassComponent>
            <ClassComponent>
              <Suspense fallback={<Text text="Loading B" />}>
                <B />
              </Suspense>
            </ClassComponent>
          </SuspenseList>
        </Suspense>
      );
    }

    await A.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'A',
      'Suspend! [B]',
      'Loading B',
      'Loading A',
      'Loading B',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
      </>,
    );

    await B.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll(['A', 'B']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('should be able to progressively show CPU expensive rows with two pass rendering', async () => {
    function TwoPass({text}) {
      const [pass, setPass] = React.useState(0);
      React.useLayoutEffect(() => {
        Scheduler.log('Mount ' + text);
        setPass(1);
      }, []);
      return <Text text={pass === 0 ? 'First Pass ' + text : text} />;
    }

    function Sleep({time, children}) {
      Scheduler.unstable_advanceTime(time);
      return children;
    }

    function App() {
      Scheduler.log('App');
      return (
        <SuspenseList revealOrder="forwards" tail="hidden">
          <Suspense fallback={<Text text="Loading A" />}>
            <Sleep time={600}>
              <TwoPass text="A" />
            </Sleep>
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <Sleep time={600}>
              <TwoPass text="B" />
            </Sleep>
          </Suspense>
          <Sleep time={600}>
            <Text text="C" />
          </Sleep>
        </SuspenseList>
      );
    }

    React.startTransition(() => {
      ReactNoop.render(<App />);
    });

    await waitFor(['App', 'First Pass A', 'Mount A', 'A']);
    expect(ReactNoop).toMatchRenderedOutput(<span>A</span>);

    await waitFor(['First Pass B', 'Mount B', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );

    await waitForAll(['C']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it('should be able to progressively show rows with two pass rendering and visible', async () => {
    function TwoPass({text}) {
      const [pass, setPass] = React.useState(0);
      React.useLayoutEffect(() => {
        Scheduler.log('Mount ' + text);
        setPass(1);
      }, []);
      return <Text text={pass === 0 ? 'First Pass ' + text : text} />;
    }

    function Sleep({time, children}) {
      Scheduler.unstable_advanceTime(time);
      return children;
    }

    function App() {
      Scheduler.log('App');
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          <Suspense fallback={<Text text="Loading A" />}>
            <Sleep time={600}>
              <TwoPass text="A" />
            </Sleep>
          </Suspense>
          <Suspense fallback={<Text text="Loading B" />}>
            <Sleep time={600}>
              <TwoPass text="B" />
            </Sleep>
          </Suspense>
          <Suspense fallback={<Text text="Loading C" />}>
            <Sleep time={600}>
              <Text text="C" />
            </Sleep>
          </Suspense>
        </SuspenseList>
      );
    }

    React.startTransition(() => {
      ReactNoop.render(<App />);
    });

    await waitFor([
      'App',
      'First Pass A',
      'Loading B',
      'Loading C',
      'Mount A',
      'A',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await waitFor(['First Pass B', 'Mount B', 'B']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>Loading C</span>
      </>,
    );

    await waitForAll(['C']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableProfilerTimer
  // @gate enableSuspenseList
  it('counts the actual duration when profiling a SuspenseList', async () => {
    // Order of parameters: id, phase, actualDuration, treeBaseDuration
    const onRender = jest.fn();

    const Fallback = () => {
      Scheduler.log('Fallback');
      Scheduler.unstable_advanceTime(3);
      return <span>Loading...</span>;
    };

    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');
    const D = createAsyncText('D');
    await A.resolve();
    await B.resolve();

    function Sleep({time, children}) {
      Scheduler.unstable_advanceTime(time);
      return children;
    }

    function App({addRow, suspendTail}) {
      Scheduler.log('App');
      return (
        <Profiler id="root" onRender={onRender}>
          <SuspenseList revealOrder="forwards" tail="visible">
            <Suspense fallback={<Fallback />}>
              <Sleep time={1}>
                <A />
              </Sleep>
            </Suspense>
            <Suspense fallback={<Fallback />}>
              <Sleep time={4}>
                <B />
              </Sleep>
            </Suspense>
            <Suspense fallback={<Fallback />}>
              <Sleep time={5}>{suspendTail ? <C /> : <Text text="C" />}</Sleep>
            </Suspense>
            {addRow ? (
              <Suspense fallback={<Fallback />}>
                <Sleep time={12}>
                  <D />
                </Sleep>
              </Suspense>
            ) : null}
          </SuspenseList>
        </Profiler>
      );
    }

    ReactNoop.render(<App suspendTail={true} />);

    await waitForAll([
      'App',
      'A',
      'B',
      'Suspend! [C]',
      'Fallback',
      // pre-warming
      'Suspend! [C]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>Loading...</span>
      </>,
    );
    expect(onRender).toHaveBeenCalledTimes(
      gate('alwaysThrottleRetries') ? 1 : 2,
    );

    // The treeBaseDuration should be the time to render each child. The last
    // one counts the fallback time.
    // The actualDuration should also include the 5ms spent rendering the
    // last suspended row.

    // actualDuration
    expect(onRender.mock.calls[0][2]).toBe(1 + 4 + 5 + 3);
    // treeBaseDuration
    expect(onRender.mock.calls[0][3]).toBe(1 + 4 + 3);

    ReactNoop.render(<App suspendTail={false} />);

    await waitForAll(['App', 'A', 'B', 'C']);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
    expect(onRender).toHaveBeenCalledTimes(
      gate('alwaysThrottleRetries') ? 2 : 3,
    );

    // actualDuration
    expect(onRender.mock.calls[1][2]).toBe(
      gate('alwaysThrottleRetries') ? 1 + 4 + 5 : 5,
    );
    // treeBaseDuration
    expect(onRender.mock.calls[1][3]).toBe(
      gate('alwaysThrottleRetries') ? 1 + 4 + 5 : 8,
    );

    ReactNoop.render(<App addRow={true} suspendTail={true} />);

    await waitForAll([
      'App',
      'A',
      'B',
      'Suspend! [C]',
      'Fallback',
      // We rendered in together mode for the head, now we re-render with forced suspense.
      'A',
      'B',
      'Suspend! [C]',
      'Fallback',
      // Lastly we render the tail.
      'Fallback',
      // pre-warming
      'Suspend! [C]',
    ]);

    // Flush suspended time.
    jest.advanceTimersByTime(1000);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span hidden={true}>C</span>
        <span>Loading...</span>
        <span>Loading...</span>
      </>,
    );
    expect(onRender).toHaveBeenCalledTimes(
      gate('alwaysThrottleRetries') ? 4 : 5,
    );

    // The treeBaseDuration should be the time to render the first two
    // children and then two fallbacks.
    // The actualDuration should also include rendering the content of
    // the first fallback, as well as the second pass to render the head
    // with force fallback mode.

    // actualDuration
    expect(onRender.mock.calls[2][2]).toBe(
      gate('alwaysThrottleRetries') ? (1 + 4 + 5 + 3) * 2 + 3 : 10,
    );
    // treeBaseDuration
    expect(onRender.mock.calls[2][3]).toBe(
      gate('alwaysThrottleRetries') ? 1 + 4 + 3 + 3 : 10,
    );

    await act(() => C.resolve());
    assertLog([
      'C',
      'Suspend! [D]',
      // pre-warming
      'Suspend! [D]',
    ]);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
        <span>Loading...</span>
      </>,
    );

    expect(onRender).toHaveBeenCalledTimes(
      gate('alwaysThrottleRetries') ? 6 : 7,
    );

    // actualDuration
    expect(onRender.mock.calls[5][2]).toBe(
      gate('alwaysThrottleRetries') ? 12 : 17,
    );
    // treeBaseDuration
    expect(onRender.mock.calls[5][3]).toBe(1 + 4 + 5 + 3);
  });

  // @gate enableSuspenseList
  it('propagates despite a memo bailout', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');
    const C = createAsyncText('C');

    const Bailout = React.memo(({children}) => {
      return children;
    });

    function Foo() {
      // To test the part that relies on context propagation,
      // we need to bailout *above* the Suspense's parent.
      // Several layers of Bailout wrappers help verify we're
      // marking updates all the way to the propagation root.
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          <Bailout>
            <Bailout>
              <Bailout>
                <Bailout>
                  <Suspense fallback={<Text text="Loading A" />}>
                    <A />
                  </Suspense>
                </Bailout>
              </Bailout>
            </Bailout>
          </Bailout>
          <Bailout>
            <Bailout>
              <Bailout>
                <Bailout>
                  <Suspense fallback={<Text text="Loading B" />}>
                    <B />
                  </Suspense>
                </Bailout>
              </Bailout>
            </Bailout>
          </Bailout>
          <Bailout>
            <Bailout>
              <Bailout>
                <Bailout>
                  <Suspense fallback={<Text text="Loading C" />}>
                    <C />
                  </Suspense>
                </Bailout>
              </Bailout>
            </Bailout>
          </Bailout>
        </SuspenseList>
      );
    }

    await C.resolve();

    ReactNoop.render(<Foo />);

    await waitForAll([
      'Suspend! [A]',
      'Loading A',
      'Loading B',
      'Loading C',
      // pre-warming
      'Suspend! [A]',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => A.resolve());
    assertLog(['A', 'Suspend! [B]', 'Suspend! [B]']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
        <span>Loading C</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B', 'C']);
    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </>,
    );
  });

  // @gate enableSuspenseList
  it(
    'regression test: SuspenseList should never force boundaries deeper than ' +
      'a single level into fallback mode',
    async () => {
      const A = createAsyncText('A');

      function UnreachableFallback() {
        throw new Error('Should never be thrown!');
      }

      function Repro({update}) {
        return (
          <SuspenseList revealOrder="forwards" tail="visible">
            {update && (
              <Suspense fallback={<Text text="Loading A..." />}>
                <A />
              </Suspense>
            )}
            <Suspense fallback={<Text text="Loading B..." />}>
              {update ? (
                <Suspense fallback={<UnreachableFallback />}>
                  <Text text="B2" />
                </Suspense>
              ) : (
                <Text text="B1" />
              )}
            </Suspense>
            <Suspense fallback={<Text text="Loading C..." />}>
              <Text text="C" />
            </Suspense>
            {update && (
              <Suspense fallback={<Text text="Loading D..." />}>
                <Text text="D" />
              </Suspense>
            )}
          </SuspenseList>
        );
      }

      // Initial mount. Only two rows are mounted, B and C.
      const root = ReactNoop.createRoot();
      await act(() => root.render(<Repro update={false} />));
      assertLog(['B1', 'C']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>B1</span>
          <span>C</span>
        </>,
      );

      // During the update, a few things happen simultaneously:
      // - A new row, A, is inserted into the head. This row suspends.
      // - The context in row B is replaced. The new content contains a nested
      //   Suspense boundary.
      // - A new row, D, is inserted into the tail.
      await act(() => root.render(<Repro update={true} />));
      assertLog([
        // During the first pass, the new row, A, suspends. This means any new
        // rows in the tail should be forced into fallback mode.
        'Suspend! [A]',
        'Loading A...',
        'B2',
        'C',

        // A second pass is used to render the fallbacks in the tail.
        //
        // Rows B and C were already mounted, so they should not be forced into
        // fallback mode.
        //
        // In the regression that this test was written for, the inner
        // Suspense boundary around B2 was incorrectly activated. Only the
        // nearest fallbacks per row should be activated, and only if they
        // haven't already mounted.
        'Loading A...',
        'B2',
        'C',

        // D is part of the tail, so it should show a fallback.
        'Loading D...',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Loading A...</span>
          <span>B2</span>
          <span>C</span>
          <span>Loading D...</span>
        </>,
      );

      // Now finish loading A.
      await act(() => A.resolve());
      assertLog(['A', 'D']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>A</span>
          <span>B2</span>
          <span>C</span>
          <span>D</span>
        </>,
      );
    },
  );

  // @gate enableSuspenseList && enableAsyncIterableChildren
  it('warns for async generator components in "forwards" order', async () => {
    async function* Generator() {
      yield 'A';
      yield 'B';
    }
    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          <Generator />
        </SuspenseList>
      );
    }

    await act(() => {
      React.startTransition(() => {
        ReactNoop.render(<Foo />);
      });
    });
    assertConsoleErrorDev([
      'A generator Component was passed to a <SuspenseList revealOrder="forwards" />. ' +
        'This is not supported as a way to generate lists. Instead, pass an ' +
        'iterable as the children.' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
      '<Generator> is an async Client Component. ' +
        'Only Server Components can be async at the moment. ' +
        "This error is often caused by accidentally adding `'use client'` " +
        'to a module that was originally written for the server.\n' +
        '    in Foo (at **)',
      // We get this warning because the generator's promise themselves are not cached.
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in Foo (at **)',
    ]);
  });

  // @gate enableSuspenseList && enableAsyncIterableChildren
  it('can display async iterable in "forwards" order', async () => {
    const A = createAsyncText('A');
    const B = createAsyncText('B');

    // We use Cached elements to avoid rerender.
    const ASlot = (
      <Suspense key="A" fallback={<Text text="Loading A" />}>
        <A />
      </Suspense>
    );

    const BSlot = (
      <Suspense key="B" fallback={<Text text="Loading B" />}>
        <B />
      </Suspense>
    );

    const iterable = {
      async *[Symbol.asyncIterator]() {
        yield ASlot;
        yield BSlot;
      },
    };

    function Foo() {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          {iterable}
        </SuspenseList>
      );
    }

    await act(() => {
      React.startTransition(() => {
        ReactNoop.render(<Foo />);
      });
    });

    assertLog([
      'Suspend! [A]',
      'Loading A',
      'Loading B',
      // pre-warming
      'Suspend! [A]',
    ]);

    assertConsoleErrorDev([
      // We get this warning because the generator's promise themselves are not cached.
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in SuspenseList (at **)\n' +
        '    in Foo (at **)',
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in SuspenseList (at **)\n' +
        '    in Foo (at **)',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>Loading A</span>
        <span>Loading B</span>
      </>,
    );

    await act(() => A.resolve());
    assertLog(['A', 'Suspend! [B]', 'Suspend! [B]']);

    assertConsoleErrorDev([
      // We get this warning because the generator's promise themselves are not cached.
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in SuspenseList (at **)\n' +
        '    in Foo (at **)',
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in SuspenseList (at **)\n' +
        '    in Foo (at **)',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>Loading B</span>
      </>,
    );

    await act(() => B.resolve());
    assertLog(['B']);

    assertConsoleErrorDev([
      // We get this warning because the generator's promise themselves are not cached.
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in SuspenseList (at **)\n' +
        '    in Foo (at **)',
    ]);

    expect(ReactNoop).toMatchRenderedOutput(
      <>
        <span>A</span>
        <span>B</span>
      </>,
    );
  });

  // @gate enableSuspenseList && enableAsyncIterableChildren
  it('warns if a nested async iterable is passed to a "forwards" list', async () => {
    function Foo({items}) {
      return (
        <SuspenseList revealOrder="forwards" tail="visible">
          {items}
          <div>Tail</div>
        </SuspenseList>
      );
    }

    const iterable = {
      async *[Symbol.asyncIterator]() {
        yield (
          <Suspense key={'A'} fallback="Loading">
            A
          </Suspense>
        );
        yield (
          <Suspense key={'B'} fallback="Loading">
            B
          </Suspense>
        );
      },
    };

    await act(() => {
      React.startTransition(() => {
        ReactNoop.render(<Foo items={iterable} />);
      });
    });
    assertConsoleErrorDev([
      'A nested async iterable was passed to row #0 in <SuspenseList />. ' +
        'Wrap it in an additional SuspenseList to configure its revealOrder: ' +
        '<SuspenseList revealOrder=...> ... ' +
        '<SuspenseList revealOrder=...>{async iterable}</SuspenseList> ... ' +
        '</SuspenseList>' +
        '\n    in SuspenseList (at **)' +
        '\n    in Foo (at **)',
      // We get this warning because the generator's promise themselves are not cached.
      'A component was suspended by an uncached promise. ' +
        'Creating promises inside a Client Component or hook is not yet supported, ' +
        'except via a Suspense-compatible library or framework.\n' +
        '    in Foo (at **)',
    ]);
  });
});
