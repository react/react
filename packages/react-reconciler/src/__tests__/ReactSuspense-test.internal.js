let React;
let ReactDOMClient;
let Scheduler;
let Suspense;
let act;
let textCache;
let container;

let assertLog;
let waitForAll;
let waitFor;

describe('ReactSuspense', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    Scheduler = require('scheduler');
    container = document.createElement('div');

    Suspense = React.Suspense;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;

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

    const root = ReactDOMClient.createRoot(container);
    // Render an empty shell
    await act(() => {
      root.render(<Foo />);
    });
    assertLog(['Foo']);
    const renderedEl = container;
    expect(renderedEl.innerText).toBeUndefined();

    // Navigate the shell to now render the child content.
    // This should suspend.
    React.startTransition(() => {
      root.render(<Foo renderBar={true} />);
    });

    await waitForAll([
      'Foo',
      'Bar',
      // A suspends
      'Suspend! [A]',
      // pre-warming
      'B',
      // end pre-warming
      'Loading...',
    ]);
    expect(container.textContent).toEqual('');

    await waitForAll([]);
    expect(container.textContent).toEqual('');

    resolveText('A');
    await waitForAll(['Foo', 'Bar', 'A', 'B']);
    expect(container.textContent).toEqual('AB');
  });

  it('suspends siblings and later recovers each independently', async () => {
    const root = ReactDOMClient.createRoot(container);
    // Render two sibling Suspense components
    root.render(
      <>
        <Suspense fallback={<Text text="Loading A..." />}>
          <AsyncText text="A" />
        </Suspense>
        <Suspense fallback={<Text text="Loading B..." />}>
          <AsyncText text="B" />
        </Suspense>
      </>,
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
    expect(container.innerHTML).toEqual('Loading A...Loading B...');

    // Resolve first Suspense's promise and switch back to the normal view. The
    // second Suspense should still show the placeholder
    await act(() => resolveText('A'));
    assertLog([
      'A',
      ...(gate('alwaysThrottleRetries')
        ? ['Suspend! [B]', 'Suspend! [B]']
        : []),
    ]);
    expect(container.textContent).toEqual('ALoading B...');

    // Resolve the second Suspense's promise resolves and switche back to the
    // normal view
    await act(() => resolveText('B'));
    assertLog(['B']);
    expect(container.textContent).toEqual('AB');
  });

  it('interrupts current render if promise resolves before current render phase', async () => {
    let didResolve = false;
    const listeners = [];

    const thenable = {
      then(resolve) {
        if (!didResolve) {
          listeners.push(resolve);
        } else {
          resolve();
        }
      },
    };

    function resolveThenable() {
      didResolve = true;
      listeners.forEach(l => l());
    }

    function Async() {
      if (!didResolve) {
        Scheduler.log('Suspend!');
        throw thenable;
      }
      Scheduler.log('Async');
      return 'Async';
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <>
          <Suspense fallback={<Text text="Loading..." />} />
          <Text text="Initial" />
        </>,
      );
    });

    assertLog(['Initial']);
    expect(container.textContent).toEqual('Initial');

    // The update will suspend.
    React.startTransition(() => {
      root.render(
        <>
          <Suspense fallback={<Text text="Loading..." />}>
            <Async />
          </Suspense>
          <Text text="After Suspense" />
          <Text text="Sibling" />
        </>,
      );
    });

    // Yield past the Suspense boundary but don't complete the last sibling.
    await waitFor(['Suspend!', 'Loading...', 'After Suspense']);

    // The promise resolves before the current render phase has completed
    resolveThenable();
    assertLog([]);
    expect(container.textContent).toEqual('Initial');

    // Start over from the root, instead of continuing.
    await waitForAll([
      // Async renders again *before* Sibling
      'Async',
      'After Suspense',
      'Sibling',
    ]);
    expect(container.textContent).toEqual('AsyncAfter SuspenseSibling');
  });

  it('throttles fallback committing globally', async () => {
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

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    assertLog([
      'Foo',
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
      'Loading more...',
    ]);
    expect(container.textContent).toEqual('Loading...');

    await resolveText('A');
    await waitForAll(['A', 'Suspend! [B]', 'Loading more...']);

    // By this point, we have enough info to show "A" and "Loading more..."
    // However, we've just shown the outer fallback. So we'll delay
    // showing the inner fallback hoping that B will resolve soon enough.
    expect(container.textContent).toEqual('Loading...');

    await act(() => resolveText('B'));
    // By this point, B has resolved.
    // The contents of both should pop in together.
    assertLog(['A', 'B']);
    expect(container.textContent).toEqual('AB');
  });

  it('pushes out siblings that render faster than throttle', async () => {
    function Foo() {
      Scheduler.log('Foo');
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="A" ms={290} />
          <Suspense fallback={<Text text="Loading more..." />}>
            <AsyncText text="B" ms={30} />
          </Suspense>
        </Suspense>
      );
    }

    setTimeout(async () => {
      // TODO: this is dumb, but AsyncText isn't timer based after the act changes.
      // Pretend that this is the start of the sibling suspending.
      // In a real test, the timer would start when we render B.
      setTimeout(async () => {
        resolveText('B');
      }, 30);

      resolveText('A');
    }, 290);

    // Render an empty shell
    const root = ReactDOMClient.createRoot(container);
    root.render(<Foo />);
    await waitForAll([
      'Foo',
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
      'Loading more...',
    ]);
    expect(container.textContent).toEqual('Loading...');

    // Now resolve A
    jest.advanceTimersByTime(290);
    await waitFor(['A']);
    expect(container.textContent).toEqual('Loading...');

    // B starts loading. Parent boundary is in throttle.
    // Still shows parent loading under throttle
    jest.advanceTimersByTime(10);
    await waitForAll(['Suspend! [B]', 'Loading more...']);
    expect(container.textContent).toEqual('Loading...');

    // !! B could have finished before the throttle, but we show a fallback.
    // !! Pushing out the 30ms fetch for B to 300ms.
    jest.advanceTimersByTime(300);
    await waitFor(['B']);
    expect(container.textContent).toEqual('ALoading more...');

    await act(() => {});
    expect(container.textContent).toEqual('AB');
  });

  it('does not throttle fallback committing for too long', async () => {
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

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    assertLog([
      'Foo',
      'Suspend! [A]',
      'Loading...',
      // pre-warming
      'Suspend! [A]',
      'Suspend! [B]',
      'Loading more...',
    ]);
    expect(container.textContent).toEqual('Loading...');

    await resolveText('A');
    await waitForAll(['A', 'Suspend! [B]', 'Loading more...']);

    // By this point, we have enough info to show "A" and "Loading more..."
    // However, we've just shown the outer fallback. So we'll delay
    // showing the inner fallback hoping that B will resolve soon enough.
    expect(container.textContent).toEqual('Loading...');
    // But if we wait a bit longer, eventually we'll give up and show a
    // fallback. The exact value here isn't important. It's a JND ("Just
    // Noticeable Difference").
    jest.advanceTimersByTime(500);
    expect(container.textContent).toEqual('ALoading more...');

    await act(() => resolveText('B'));
    assertLog(['B']);
    expect(container.textContent).toEqual('AB');
  });

  it('updates memoized child of suspense component when context updates (simple memo)', async () => {
    const {useContext, createContext, useState, memo} = React;

    const ValueContext = createContext(null);

    const MemoizedChild = memo(function MemoizedChild() {
      const text = useContext(ValueContext);
      return <Text text={readText(text)} />;
    });

    let setValue;
    function App() {
      const [value, _setValue] = useState('default');
      setValue = _setValue;

      return (
        <ValueContext.Provider value={value}>
          <Suspense fallback={<Text text="Loading..." />}>
            <MemoizedChild />
          </Suspense>
        </ValueContext.Provider>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    assertLog([
      'Suspend! [default]',
      'Loading...',
      // pre-warming
      'Suspend! [default]',
    ]);

    await act(() => resolveText('default'));
    assertLog(['default']);
    expect(container.textContent).toEqual('default');

    await act(() => setValue('new value'));
    assertLog([
      'Suspend! [new value]',
      'Loading...',
      // pre-warming
      'Suspend! [new value]',
    ]);

    await act(() => resolveText('new value'));
    assertLog(['new value']);
    expect(container.textContent).toEqual('new value');
  });

  it('updates memoized child of suspense component when context updates (manual memo)', async () => {
    const {useContext, createContext, useState, memo} = React;

    const ValueContext = createContext(null);

    const MemoizedChild = memo(
      function MemoizedChild() {
        const text = useContext(ValueContext);
        return <Text text={readText(text)} />;
      },
      function areEqual(prevProps, nextProps) {
        return true;
      },
    );

    let setValue;
    function App() {
      const [value, _setValue] = useState('default');
      setValue = _setValue;

      return (
        <ValueContext.Provider value={value}>
          <Suspense fallback={<Text text="Loading..." />}>
            <MemoizedChild />
          </Suspense>
        </ValueContext.Provider>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    assertLog([
      'Suspend! [default]',
      'Loading...',
      // pre-warming
      'Suspend! [default]',
    ]);

    await act(() => resolveText('default'));
    assertLog(['default']);
    expect(container.textContent).toEqual('default');

    await act(() => setValue('new value'));
    assertLog([
      'Suspend! [new value]',
      'Loading...',
      // pre-warming
      'Suspend! [new value]',
    ]);

    await act(() => resolveText('new value'));
    assertLog(['new value']);
    expect(container.textContent).toEqual('new value');
  });

  it('updates memoized child of suspense component when context updates (function)', async () => {
    const {useContext, createContext, useState} = React;

    const ValueContext = createContext(null);

    function MemoizedChild() {
      const text = useContext(ValueContext);
      return <Text text={readText(text)} />;
    }

    let setValue;
    function App({children}) {
      const [value, _setValue] = useState('default');
      setValue = _setValue;

      return (
        <ValueContext.Provider value={value}>{children}</ValueContext.Provider>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <App>
          <Suspense fallback={<Text text="Loading..." />}>
            <MemoizedChild />
          </Suspense>
        </App>,
      );
    });
    assertLog([
      'Suspend! [default]',
      'Loading...',
      // pre-warming
      'Suspend! [default]',
    ]);

    await act(() => resolveText('default'));
    assertLog(['default']);
    expect(container.textContent).toEqual('default');

    await act(() => setValue('new value'));
    assertLog([
      'Suspend! [new value]',
      'Loading...',
      // pre-warming
      'Suspend! [new value]',
    ]);

    await act(() => resolveText('new value'));
    assertLog(['new value']);
    expect(container.textContent).toEqual('new value');
  });

  it('updates memoized child of suspense component when context updates (forwardRef)', async () => {
    const {forwardRef, useContext, createContext, useState} = React;

    const ValueContext = createContext(null);

    const MemoizedChild = forwardRef(() => {
      const text = useContext(ValueContext);
      return <Text text={readText(text)} />;
    });

    let setValue;
    function App({children}) {
      const [value, _setValue] = useState('default');
      setValue = _setValue;

      return (
        <ValueContext.Provider value={value}>{children}</ValueContext.Provider>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <App>
          <Suspense fallback={<Text text="Loading..." />}>
            <MemoizedChild />
          </Suspense>
        </App>,
      );
    });
    assertLog([
      'Suspend! [default]',
      'Loading...',
      // pre-warming
      'Suspend! [default]',
    ]);

    await act(() => resolveText('default'));
    assertLog(['default']);
    expect(container.textContent).toEqual('default');

    await act(() => setValue('new value'));
    assertLog([
      'Suspend! [new value]',
      'Loading...',
      // pre-warming
      'Suspend! [new value]',
    ]);

    await act(() => resolveText('new value'));
    assertLog(['new value']);
    expect(container.textContent).toEqual('new value');
  });

  it('re-fires layout effects when re-showing Suspense', async () => {
    function TextWithLayout(props) {
      Scheduler.log(props.text);
      React.useLayoutEffect(() => {
        Scheduler.log('create layout');
        return () => {
          Scheduler.log('destroy layout');
        };
      }, []);
      return props.text;
    }

    let _setShow;
    function App(props) {
      const [show, setShow] = React.useState(false);
      _setShow = setShow;
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <TextWithLayout text="Child 1" />
          {show && <AsyncText text="Child 2" />}
        </Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    assertLog(['Child 1', 'create layout']);
    expect(container.textContent).toEqual('Child 1');

    await act(() => {
      _setShow(true);
    });
    assertLog([
      'Child 1',
      'Suspend! [Child 2]',
      'Loading...',
      'destroy layout',
      // pre-warming
      'Child 1',
      'Suspend! [Child 2]',
    ]);

    await act(() => resolveText('Child 2'));
    assertLog(['Child 1', 'Child 2', 'create layout']);
    expect(container.textContent).toEqual(['Child 1', 'Child 2'].join(''));
  });

  it('does not get stuck with fallback in concurrent mode for a large delay', async () => {
    function App(props) {
      return (
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncText text="Child 1" />
          <AsyncText text="Child 2" />
        </Suspense>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    assertLog([
      'Suspend! [Child 1]',
      'Loading...',
      // pre-warming
      'Suspend! [Child 1]',
      'Suspend! [Child 2]',
    ]);
    await resolveText('Child 1');
    await waitForAll([
      'Child 1',
      'Suspend! [Child 2]',
      ...(gate('alwaysThrottleRetries')
        ? []
        : ['Child 1', 'Suspend! [Child 2]']),
    ]);

    jest.advanceTimersByTime(6000);

    await act(() => resolveText('Child 2'));
    assertLog(['Child 1', 'Child 2']);
    expect(container.textContent).toEqual(['Child 1', 'Child 2'].join(''));
  });
});
