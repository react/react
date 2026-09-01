let React;
let ReactDOM;
let ReactDOMClient;
let Scheduler;
let act;
let useState;
let useEffect;
let startTransition;
let assertLog;
let assertConsoleErrorDev;
let waitForPaint;

// TODO: Migrate tests to React DOM instead of React Noop

describe('ReactFlushSync', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    useState = React.useState;
    useEffect = React.useEffect;
    startTransition = React.startTransition;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
    waitForPaint = InternalTestUtils.waitForPaint;
  });

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function getVisibleChildren(element: Element): React$Node {
    const children = [];
    let node: any = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          ((node.tagName !== 'SCRIPT' && node.tagName !== 'script') ||
            node.hasAttribute('data-meaningful')) &&
          node.tagName !== 'TEMPLATE' &&
          node.tagName !== 'template' &&
          !node.hasAttribute('hidden') &&
          !node.hasAttribute('aria-hidden')
        ) {
          const props: any = {};
          const attributes = node.attributes;
          for (let i = 0; i < attributes.length; i++) {
            if (
              attributes[i].name === 'id' &&
              attributes[i].value.includes(':')
            ) {
              // We assume this is a React added ID that's a non-visual implementation detail.
              continue;
            }
            props[attributes[i].name] = attributes[i].value;
          }
          props.children = getVisibleChildren(node);
          children.push(
            require('react').createElement(node.tagName.toLowerCase(), props),
          );
        }
      } else if (node.nodeType === 3) {
        children.push(node.data);
      }
      node = node.nextSibling;
    }
    return children.length === 0
      ? undefined
      : children.length === 1
        ? children[0]
        : children;
  }

  it('changes priority of updates in useEffect', async () => {
    function App() {
      const [syncState, setSyncState] = useState(0);
      const [state, setState] = useState(0);
      useEffect(() => {
        if (syncState !== 1) {
          setState(1);
          ReactDOM.flushSync(() => setSyncState(1));
        }
      }, [syncState, state]);
      return <Text text={`${syncState}, ${state}`} />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      React.startTransition(() => {
        root.render(<App />);
      });
      // This will yield right before the passive effect fires
      await waitForPaint(['0, 0']);

      // The passive effect will schedule a sync update and a normal update.
      // They should commit in two separate batches. First the sync one.
      await waitForPaint(['1, 1']);

      // The remaining update is not sync
      ReactDOM.flushSync();
      assertLog([]);
      assertConsoleErrorDev([
        'flushSync was called from inside a lifecycle method. React ' +
          'cannot flush when React is already rendering. Consider moving this ' +
          'call to a scheduler task or micro task.' +
          '\n    in App',
      ]);

      await waitForPaint([]);
    });
    expect(getVisibleChildren(container)).toEqual('1, 1');
  });

  it('supports nested flushSync with startTransition', async () => {
    let setSyncState;
    let setState;
    function App() {
      const [syncState, _setSyncState] = useState(0);
      const [state, _setState] = useState(0);
      setSyncState = _setSyncState;
      setState = _setState;
      return <Text text={`${syncState}, ${state}`} />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    assertLog(['0, 0']);
    expect(getVisibleChildren(container)).toEqual('0, 0');

    await act(() => {
      ReactDOM.flushSync(() => {
        startTransition(() => {
          // This should be async even though flushSync is on the stack, because
          // startTransition is closer.
          setState(1);
          ReactDOM.flushSync(() => {
            // This should be async even though startTransition is on the stack,
            // because flushSync is closer.
            setSyncState(1);
          });
        });
      });
      // Only the sync update should have flushed
      assertLog(['1, 0']);
      expect(getVisibleChildren(container)).toEqual('1, 0');
    });
    // Now the async update has flushed, too.
    assertLog(['1, 1']);
    expect(getVisibleChildren(container)).toEqual('1, 1');
  });

  it('flushes passive effects synchronously when they are the result of a sync render', async () => {
    function App() {
      useEffect(() => {
        Scheduler.log('Effect');
      }, []);
      return <Text text="Child" />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      ReactDOM.flushSync(() => {
        root.render(<App />);
      });
      assertLog([
        'Child',
        // Because the pending effect was the result of a sync update, calling
        // flushSync should flush it.
        'Effect',
      ]);
      expect(getVisibleChildren(container)).toEqual('Child');
    });
  });

  // @gate !disableLegacyMode
  it('does not flush passive effects synchronously after render in legacy mode', async () => {
    function App() {
      useEffect(() => {
        Scheduler.log('Effect');
      }, []);
      return <Text text="Child" />;
    }

    const container = document.createElement('div');
    await act(() => {
      ReactDOM.flushSync(() => {
        ReactDOM.render(<App />, container);
      });
      assertLog([
        'Child',
        // Because we're in legacy mode, we shouldn't have flushed the passive
        // effects yet.
      ]);
      expect(getVisibleChildren(container)).toEqual('Child');
    });
    // Effect flushes after paint.
    assertLog(['Effect']);
  });

  // @gate !disableLegacyMode
  it('flushes pending passive effects before scope is called in legacy mode', async () => {
    let currentStep = 0;

    function App({step}) {
      useEffect(() => {
        currentStep = step;
        Scheduler.log('Effect: ' + step);
      }, [step]);
      return <Text text={step} />;
    }

    const container = document.createElement('div');
    await act(() => {
      ReactDOM.flushSync(() => {
        ReactDOM.render(<App step={1} />, container);
      });
      assertLog([
        1,
        // Because we're in legacy mode, we shouldn't have flushed the passive
        // effects yet.
      ]);
      expect(getVisibleChildren(container)).toEqual('1');

      ReactDOM.flushSync(() => {
        // This should render step 2 because the passive effect has already
        // fired, before the scope function is called.
        ReactDOM.render(<App step={currentStep + 1} />, container);
      });
      assertLog(['Effect: 1', 2]);
      expect(getVisibleChildren(container)).toEqual('2');
    });
    assertLog(['Effect: 2']);
  });

  it("does not flush passive effects synchronously when they aren't the result of a sync render", async () => {
    function App() {
      useEffect(() => {
        Scheduler.log('Effect');
      }, []);
      return <Text text="Child" />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
      await waitForPaint([
        'Child',
        // Because the passive effect was not the result of a sync update, it
        // should not flush before paint.
      ]);
      expect(getVisibleChildren(container)).toEqual('Child');
    });
    // Effect flushes after paint.
    assertLog(['Effect']);
  });

  it('does not flush pending passive effects', async () => {
    function App() {
      useEffect(() => {
        Scheduler.log('Effect');
      }, []);
      return <Text text="Child" />;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
      await waitForPaint(['Child']);
      expect(getVisibleChildren(container)).toEqual('Child');

      // Passive effects are pending. Calling flushSync should not affect them.
      ReactDOM.flushSync();
      // Effects still haven't fired.
      assertLog([]);
    });
    // Now the effects have fired.
    assertLog(['Effect']);
  });

  it('completely exhausts synchronous work queue even if something throws', async () => {
    function Throws({error}) {
      throw error;
    }

    const container1 = document.createElement('div');
    const root1 = ReactDOMClient.createRoot(container1);

    const container2 = document.createElement('div');
    const root2 = ReactDOMClient.createRoot(container2);

    const container3 = document.createElement('div');
    const root3 = ReactDOMClient.createRoot(container3);

    await act(async () => {
      root1.render(<Text text="Hi" />);
      root2.render(<Text text="Andrew" />);
      root3.render(<Text text="!" />);
    });
    assertLog(['Hi', 'Andrew', '!']);

    const aahh = new Error('AAHH!');
    const nooo = new Error('Noooooooooo!');

    let error;
    try {
      await act(() => {
        ReactDOM.flushSync(() => {
          root1.render(<Throws error={aahh} />);
          root2.render(<Throws error={nooo} />);
          root3.render(<Text text="aww" />);
        });
      });
    } catch (e) {
      error = e;
    }

    // The update to root 3 should have finished synchronously, even though the
    // earlier updates errored.
    assertLog(['aww']);
    // Roots 1 and 2 were unmounted.
    expect(getVisibleChildren(container1)).toEqual(undefined);
    expect(getVisibleChildren(container2)).toEqual(undefined);
    expect(getVisibleChildren(container3)).toEqual('aww');

    // Because there were multiple errors, React threw an AggregateError.
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.errors.length).toBe(2);
    expect(error.errors[0]).toBe(aahh);
    expect(error.errors[1]).toBe(nooo);
  });
});
