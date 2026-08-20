let React;
let ReactDOMClient;
let ReactDOM;
let Scheduler;
let Suspense;
let act;
let textCache;
let container;

let assertLog;
let waitForPaint;
let waitForAll;
let waitFor;

describe('ReactSuspense', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    Scheduler = require('scheduler');
    container = document.createElement('div');

    Suspense = React.Suspense;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitForPaint = InternalTestUtils.waitForPaint;
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

  // @gate !disableLegacyMode
  it('mounts a lazy class component in non-concurrent mode (legacy)', async () => {
    class Class extends React.Component {
      componentDidMount() {
        Scheduler.log('Did mount: ' + this.props.label);
      }
      componentDidUpdate() {
        Scheduler.log('Did update: ' + this.props.label);
      }
      render() {
        return <Text text={this.props.label} />;
      }
    }

    async function fakeImport(result) {
      return {default: result};
    }

    const LazyClass = React.lazy(() => fakeImport(Class));

    ReactDOM.render(
      <Suspense fallback={<Text text="Loading..." />}>
        <LazyClass label="Hi" />
      </Suspense>,
      container,
    );

    assertLog(['Loading...']);
    expect(container.textContent).toEqual('Loading...');

    await LazyClass;

    await waitForPaint(['Hi', 'Did mount: Hi']);
    expect(container.textContent).toEqual('Hi');
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

  describe('outside concurrent mode (legacy)', () => {
    // @gate !disableLegacyMode
    it('a mounted class component can suspend without losing state', async () => {
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

      let instance;
      class AsyncTextWithLifecycle extends React.Component {
        state = {step: 1};
        componentDidMount() {
          Scheduler.log(`Mount [${this.props.text}:${this.state.step}]`);
        }
        componentDidUpdate() {
          Scheduler.log(`Update [${this.props.text}:${this.state.step}]`);
        }
        componentWillUnmount() {
          Scheduler.log(`Unmount [${this.props.text}:${this.state.step}]`);
        }
        render() {
          instance = this;
          const text = readText(`${this.props.text}:${this.state.step}`);
          return <Text text={text} />;
        }
      }

      function App() {
        return (
          <Suspense fallback={<TextWithLifecycle text="Loading..." />}>
            <TextWithLifecycle text="A" />
            <AsyncTextWithLifecycle text="B" ref={instance} />
            <TextWithLifecycle text="C" />
          </Suspense>
        );
      }

      ReactDOM.render(<App />, container);
      assertLog([
        'A',
        'Suspend! [B:1]',
        'C',
        'Loading...',

        'Mount [A]',
        // B's lifecycle should not fire because it suspended
        // 'Mount [B]',
        'Mount [C]',
        'Mount [Loading...]',
      ]);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('B:1');
      assertLog([
        'B:1',
        'Unmount [Loading...]',
        // Should be a mount, not an update
        'Mount [B:1]',
      ]);
      expect(container.textContent).toEqual('AB:1C');

      instance.setState({step: 2});
      assertLog(['Suspend! [B:2]', 'Loading...', 'Mount [Loading...]']);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('B:2');
      assertLog(['B:2', 'Unmount [Loading...]', 'Update [B:2]']);
      expect(container.textContent).toEqual('AB:2C');
    });

    // @gate !disableLegacyMode
    it('bails out on timed-out primary children even if they receive an update', async () => {
      let instance;
      class Stateful extends React.Component {
        state = {step: 1};
        render() {
          instance = this;
          return <Text text={`Stateful: ${this.state.step}`} />;
        }
      }

      function App(props) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <Stateful />
            <AsyncText text={props.text} />
          </Suspense>
        );
      }

      ReactDOM.render(<App text="A" />, container);

      assertLog(['Stateful: 1', 'Suspend! [A]', 'Loading...']);

      await resolveText('A');
      assertLog(['A']);
      expect(container.textContent).toEqual('Stateful: 1A');

      ReactDOM.render(<App text="B" />, container);
      assertLog(['Stateful: 1', 'Suspend! [B]', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      instance.setState({step: 2});
      assertLog(['Stateful: 2', 'Suspend! [B]']);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('B');
      assertLog(['B']);
      expect(container.textContent).toEqual('Stateful: 2B');
    });

    // @gate !disableLegacyMode
    it('when updating a timed-out tree, always retries the suspended component', async () => {
      let instance;
      class Stateful extends React.Component {
        state = {step: 1};
        render() {
          instance = this;
          return <Text text={`Stateful: ${this.state.step}`} />;
        }
      }

      const Indirection = React.Fragment;

      function App(props) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <Stateful />
            <Indirection>
              <Indirection>
                <Indirection>
                  <AsyncText text={props.text} />
                </Indirection>
              </Indirection>
            </Indirection>
          </Suspense>
        );
      }

      ReactDOM.render(<App text="A" />, container);

      assertLog(['Stateful: 1', 'Suspend! [A]', 'Loading...']);

      await resolveText('A');
      assertLog(['A']);
      expect(container.textContent).toEqual('Stateful: 1A');

      ReactDOM.render(<App text="B" />, container);
      assertLog(['Stateful: 1', 'Suspend! [B]', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      instance.setState({step: 2});
      assertLog([
        'Stateful: 2',

        // The suspended component should suspend again. If it doesn't, the
        // likely mistake is that the suspended fiber wasn't marked with
        // pending work, so it was improperly treated as complete.
        'Suspend! [B]',
      ]);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('B');
      assertLog(['B']);
      expect(container.textContent).toEqual('Stateful: 2B');
    });

    // @gate !disableLegacyMode
    it('suspends in a class that has componentWillUnmount and is then deleted', async () => {
      class AsyncTextWithUnmount extends React.Component {
        componentWillUnmount() {
          Scheduler.log('will unmount');
        }
        render() {
          return <Text text={readText(this.props.text)} />;
        }
      }

      function App({text}) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncTextWithUnmount text={text} />
          </Suspense>
        );
      }

      ReactDOM.render(<App text="A" />, container);
      assertLog(['Suspend! [A]', 'Loading...']);
      ReactDOM.render(<Text text="B" />, container);
      // Should not fire componentWillUnmount
      assertLog(['B']);
      expect(container.textContent).toEqual('B');
    });

    // @gate !disableLegacyMode
    it('suspends in a component that also contains useEffect', async () => {
      const {useLayoutEffect} = React;

      function AsyncTextWithEffect(props) {
        const text = props.text;

        useLayoutEffect(() => {
          Scheduler.log('Did commit: ' + text);
        }, [text]);

        return <Text text={readText(text)} />;
      }

      function App({text}) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncTextWithEffect text={text} />
          </Suspense>
        );
      }

      ReactDOM.render(<App text="A" />, container);
      assertLog(['Suspend! [A]', 'Loading...']);
      await resolveText('A');
      assertLog(['A', 'Did commit: A']);
    });

    // @gate !disableLegacyMode
    it('retries when an update is scheduled on a timed out tree', async () => {
      let instance;
      class Stateful extends React.Component {
        state = {step: 1};
        render() {
          instance = this;
          return <AsyncText text={`Step: ${this.state.step}`} />;
        }
      }

      function App(props) {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <Stateful />
          </Suspense>
        );
      }

      ReactDOM.render(<App />, container);

      // Initial render
      assertLog(['Suspend! [Step: 1]', 'Loading...']);

      await act(() => resolveText('Step: 1'));
      assertLog(['Step: 1']);
      expect(container.textContent).toEqual('Step: 1');

      // Update that suspends
      await act(() => {
        instance.setState({step: 2});
      });
      assertLog(['Suspend! [Step: 2]', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      // Update while still suspended
      instance.setState({step: 3});
      assertLog(['Suspend! [Step: 3]']);
      expect(container.textContent).toEqual('Loading...');

      await act(() => {
        resolveText('Step: 2');
        resolveText('Step: 3');
      });
      assertLog(['Step: 3']);
      expect(container.textContent).toEqual('Step: 3');
    });

    // @gate !disableLegacyMode
    it('does not remount the fallback while suspended children resolve in legacy mode', async () => {
      let mounts = 0;
      class ShouldMountOnce extends React.Component {
        componentDidMount() {
          mounts++;
        }
        render() {
          return <Text text="Loading..." />;
        }
      }

      function App(props) {
        return (
          <Suspense fallback={<ShouldMountOnce />}>
            <AsyncText text="Child 1" />
            <AsyncText text="Child 2" />
            <AsyncText text="Child 3" />
          </Suspense>
        );
      }

      ReactDOM.render(<App />, container);

      // Initial render
      assertLog([
        'Suspend! [Child 1]',
        'Suspend! [Child 2]',
        'Suspend! [Child 3]',
        'Loading...',
      ]);
      await waitForAll([]);

      await resolveText('Child 1');
      assertLog(['Child 1', 'Suspend! [Child 2]', 'Suspend! [Child 3]']);

      await resolveText('Child 2');
      assertLog(['Child 2', 'Suspend! [Child 3]']);

      await resolveText('Child 3');
      assertLog(['Child 3']);
      expect(container.textContent).toEqual(
        ['Child 1', 'Child 2', 'Child 3'].join(''),
      );
      expect(mounts).toBe(1);
    });

    // @gate !disableLegacyMode
    it('reuses effects, including deletions, from the suspended tree', async () => {
      const {useState} = React;

      let setTab;
      function App() {
        const [tab, _setTab] = useState(0);
        setTab = _setTab;

        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText key={tab} text={'Tab: ' + tab} />
            <Text key={tab + 'sibling'} text=" + sibling" />
          </Suspense>
        );
      }

      ReactDOM.render(<App />, container);
      assertLog(['Suspend! [Tab: 0]', ' + sibling', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('Tab: 0');
      assertLog(['Tab: 0']);
      expect(container.textContent).toEqual('Tab: 0 + sibling');

      await act(() => setTab(1));
      assertLog(['Suspend! [Tab: 1]', ' + sibling', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('Tab: 1');
      assertLog(['Tab: 1']);
      expect(container.textContent).toEqual('Tab: 1 + sibling');

      await act(() => setTab(2));
      assertLog(['Suspend! [Tab: 2]', ' + sibling', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      await resolveText('Tab: 2');
      assertLog(['Tab: 2']);
      expect(container.textContent).toEqual('Tab: 2 + sibling');
    });

    // @gate !disableLegacyMode
    it('does not warn if a mounted component is pinged', async () => {
      const {useState} = React;

      ReactDOM.render(null, container);

      let setStep;
      function UpdatingText({text, ms}) {
        const [step, _setStep] = useState(0);
        setStep = _setStep;
        const fullText = `${text}:${step}`;
        return <Text text={readText(fullText)} />;
      }

      ReactDOM.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <UpdatingText text="A" ms={1000} />
        </Suspense>,
        container,
      );

      assertLog(['Suspend! [A:0]', 'Loading...']);

      await resolveText('A:0');
      assertLog(['A:0']);
      expect(container.textContent).toEqual('A:0');

      await act(() => setStep(1));
      assertLog(['Suspend! [A:1]', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');
    });

    // @gate !disableLegacyMode
    it('memoizes promise listeners per thread ID to prevent redundant renders', async () => {
      function App() {
        return (
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="A" />
            <AsyncText text="B" />
            <AsyncText text="C" />
          </Suspense>
        );
      }

      ReactDOM.render(null, container);

      ReactDOM.render(<App />, container);

      assertLog(['Suspend! [A]', 'Suspend! [B]', 'Suspend! [C]', 'Loading...']);

      await resolveText('A');
      assertLog([
        'A',
        // The promises for B and C have now been thrown twice
        'Suspend! [B]',
        'Suspend! [C]',
      ]);

      await resolveText('B');
      assertLog([
        // Even though the promise for B was thrown twice, we should only
        // re-render once.
        'B',
        // The promise for C has now been thrown three times
        'Suspend! [C]',
      ]);

      await resolveText('C');
      assertLog([
        // Even though the promise for C was thrown three times, we should only
        // re-render once.
        'C',
      ]);
    });

    // @gate !disableLegacyMode
    it('#14162', async () => {
      const {lazy} = React;

      function Hello() {
        return <span>hello</span>;
      }

      async function fetchComponent() {
        return new Promise(r => {
          // simulating a delayed import() call
          setTimeout(r, 1000, {default: Hello});
        });
      }

      const LazyHello = lazy(fetchComponent);

      class App extends React.Component {
        state = {render: false};

        componentDidMount() {
          setTimeout(() => this.setState({render: true}));
        }

        render() {
          return (
            <Suspense fallback={<span>loading...</span>}>
              {this.state.render && <LazyHello />}
            </Suspense>
          );
        }
      }

      ReactDOM.render(null, container);

      ReactDOM.render(<App name="world" />, container);
    });

    // @gate !disableLegacyMode
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

      ReactDOM.render(<App />, container);
      assertLog(['Suspend! [default]', 'Loading...']);

      await resolveText('default');
      assertLog(['default']);
      expect(container.textContent).toEqual('default');

      await act(() => setValue('new value'));
      assertLog(['Suspend! [new value]', 'Loading...']);

      await resolveText('new value');
      assertLog(['new value']);
      expect(container.textContent).toEqual('new value');
    });

    // @gate !disableLegacyMode
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

      ReactDOM.render(<App />, container);
      assertLog(['Suspend! [default]', 'Loading...']);

      await resolveText('default');
      assertLog(['default']);
      expect(container.textContent).toEqual('default');

      await act(() => setValue('new value'));
      assertLog(['Suspend! [new value]', 'Loading...']);

      await resolveText('new value');
      assertLog(['new value']);
      expect(container.textContent).toEqual('new value');
    });

    // @gate !disableLegacyMode
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
          <ValueContext.Provider value={value}>
            {children}
          </ValueContext.Provider>
        );
      }

      ReactDOM.render(
        <App>
          <Suspense fallback={<Text text="Loading..." />}>
            <MemoizedChild />
          </Suspense>
        </App>,
        container,
      );
      assertLog(['Suspend! [default]', 'Loading...']);

      await resolveText('default');
      assertLog(['default']);
      expect(container.textContent).toEqual('default');

      await act(() => setValue('new value'));
      assertLog(['Suspend! [new value]', 'Loading...']);

      await resolveText('new value');
      assertLog(['new value']);
      expect(container.textContent).toEqual('new value');
    });

    // @gate !disableLegacyMode
    it('updates memoized child of suspense component when context updates (forwardRef)', async () => {
      const {forwardRef, useContext, createContext, useState} = React;

      const ValueContext = createContext(null);

      const MemoizedChild = forwardRef(function MemoizedChild() {
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

      ReactDOM.render(<App />, container);
      assertLog(['Suspend! [default]', 'Loading...']);

      await resolveText('default');
      assertLog(['default']);
      expect(container.textContent).toEqual('default');

      await act(() => setValue('new value'));
      assertLog(['Suspend! [new value]', 'Loading...']);

      await resolveText('new value');
      assertLog(['new value']);
      expect(container.textContent).toEqual('new value');
    });

    // @gate !disableLegacyMode
    it('updates context consumer within child of suspended suspense component when context updates', async () => {
      const {createContext, useState} = React;

      const ValueContext = createContext(null);

      const promiseThatNeverResolves = new Promise(() => {});
      function Child() {
        return (
          <ValueContext.Consumer>
            {value => {
              Scheduler.log(`Received context value [${value}]`);
              if (value === 'default') return <Text text="default" />;
              throw promiseThatNeverResolves;
            }}
          </ValueContext.Consumer>
        );
      }

      let setValue;
      function Wrapper({children}) {
        const [value, _setValue] = useState('default');
        setValue = _setValue;
        return (
          <ValueContext.Provider value={value}>
            {children}
          </ValueContext.Provider>
        );
      }

      function App() {
        return (
          <Wrapper>
            <Suspense fallback={<Text text="Loading..." />}>
              <Child />
            </Suspense>
          </Wrapper>
        );
      }

      ReactDOM.render(<App />, container);
      assertLog(['Received context value [default]', 'default']);
      expect(container.textContent).toEqual('default');

      await act(() => setValue('new value'));
      assertLog(['Received context value [new value]', 'Loading...']);
      expect(container.textContent).toEqual('Loading...');

      await act(() => setValue('default'));
      assertLog(['Received context value [default]', 'default']);
      expect(container.textContent).toEqual('default');
    });
  });
});
