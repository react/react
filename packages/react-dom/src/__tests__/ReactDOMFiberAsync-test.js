/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;

let ReactDOM;
let ReactDOMClient;
let Scheduler;
let act;
let waitForAll;
let waitFor;
let waitForMicrotasks;
let assertLog;
let assertConsoleErrorDev;

const setUntrackedInputValue = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value',
).set;

describe('ReactDOMFiberAsync', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForMicrotasks = InternalTestUtils.waitForMicrotasks;
    assertLog = InternalTestUtils.assertLog;

    document.body.appendChild(container);
    window.event = undefined;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // @gate !disableLegacyMode
  it('renders synchronously by default in legacy mode', () => {
    const ops = [];
    ReactDOM.render(<div>Hi</div>, container, () => {
      ops.push(container.textContent);
    });
    ReactDOM.render(<div>Bye</div>, container, () => {
      ops.push(container.textContent);
    });
    expect(ops).toEqual(['Hi', 'Bye']);
  });

  it('flushSync batches sync updates and flushes them at the end of the batch', async () => {
    const ops = [];
    let instance;

    class Component extends React.Component {
      state = {text: ''};
      componentDidMount() {
        instance = this;
      }

      push(val) {
        this.setState(state => ({text: state.text + val}));
      }
      componentDidUpdate() {
        ops.push(this.state.text);
      }
      render() {
        instance = this;
        return <span>{this.state.text}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Component />));

    await act(() => {
      instance.push('A');
    });

    expect(ops).toEqual(['A']);
    expect(container.textContent).toEqual('A');

    ReactDOM.flushSync(() => {
      instance.push('B');
      instance.push('C');
      // Not flushed yet
      expect(container.textContent).toEqual('A');
      expect(ops).toEqual(['A']);
    });

    expect(container.textContent).toEqual('ABC');
    expect(ops).toEqual(['A', 'ABC']);
    await act(() => {
      instance.push('D');
    });
    expect(container.textContent).toEqual('ABCD');
    expect(ops).toEqual(['A', 'ABC', 'ABCD']);
  });

  it('flushSync flushes updates even if nested inside another flushSync', async () => {
    const ops = [];
    let instance;

    class Component extends React.Component {
      state = {text: ''};
      componentDidMount() {
        instance = this;
      }

      push(val) {
        this.setState(state => ({text: state.text + val}));
      }
      componentDidUpdate() {
        ops.push(this.state.text);
      }
      render() {
        instance = this;
        return <span>{this.state.text}</span>;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => root.render(<Component />));

    await act(() => {
      instance.push('A');
    });
    expect(ops).toEqual(['A']);
    expect(container.textContent).toEqual('A');

    ReactDOM.flushSync(() => {
      instance.push('B');
      instance.push('C');
      // Not flushed yet
      expect(container.textContent).toEqual('A');
      expect(ops).toEqual(['A']);

      ReactDOM.flushSync(() => {
        instance.push('D');
      });
      // The nested flushSync caused everything to flush.
      expect(container.textContent).toEqual('ABCD');
      expect(ops).toEqual(['A', 'ABCD']);
    });
    expect(container.textContent).toEqual('ABCD');
    expect(ops).toEqual(['A', 'ABCD']);
  });

  it('flushSync logs an error if already performing work', async () => {
    class Component extends React.Component {
      componentDidUpdate() {
        ReactDOM.flushSync();
      }
      render() {
        return null;
      }
    }

    // Initial mount
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    // Update
    ReactDOM.flushSync(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev([
      'flushSync was called from inside a lifecycle method. ' +
        'React cannot flush when React is already rendering. ' +
        'Consider moving this call to a scheduler task or micro task.\n' +
        '    in Component (at **)',
    ]);
  });

  describe('concurrent mode', () => {
    it('does not perform deferred updates synchronously', async () => {
      const inputRef = React.createRef();
      const asyncValueRef = React.createRef();
      const syncValueRef = React.createRef();

      class Counter extends React.Component {
        state = {asyncValue: '', syncValue: ''};

        handleChange = e => {
          const nextValue = e.target.value;
          React.startTransition(() => {
            this.setState({
              asyncValue: nextValue,
            });
            // It should not be flushed yet.
            expect(asyncValueRef.current.textContent).toBe('');
          });
          this.setState({
            syncValue: nextValue,
          });
        };

        render() {
          return (
            <div>
              <input
                ref={inputRef}
                onChange={this.handleChange}
                defaultValue=""
              />
              <p ref={asyncValueRef}>{this.state.asyncValue}</p>
              <p ref={syncValueRef}>{this.state.syncValue}</p>
            </div>
          );
        }
      }
      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Counter />));
      expect(asyncValueRef.current.textContent).toBe('');
      expect(syncValueRef.current.textContent).toBe('');

      await act(() => {
        setUntrackedInputValue.call(inputRef.current, 'hello');
        inputRef.current.dispatchEvent(
          new MouseEvent('input', {bubbles: true}),
        );
        // Should only flush non-deferred update.
        expect(asyncValueRef.current.textContent).toBe('');
        expect(syncValueRef.current.textContent).toBe('hello');
      });

      // Should flush both updates now.
      expect(asyncValueRef.current.textContent).toBe('hello');
      expect(syncValueRef.current.textContent).toBe('hello');
    });

    it('top-level updates are concurrent', async () => {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<div>Hi</div>);
        expect(container.textContent).toEqual('');
      });
      expect(container.textContent).toEqual('Hi');

      await act(() => {
        root.render(<div>Bye</div>);
        expect(container.textContent).toEqual('Hi');
      });
      expect(container.textContent).toEqual('Bye');
    });

    it('deep updates (setState) are concurrent', async () => {
      let instance;
      class Component extends React.Component {
        state = {step: 0};
        render() {
          instance = this;
          return <div>{this.state.step}</div>;
        }
      }

      const root = ReactDOMClient.createRoot(container);

      await act(() => {
        root.render(<Component />);
        expect(container.textContent).toEqual('');
      });
      expect(container.textContent).toEqual('0');

      await act(() => {
        instance.setState({step: 1});
        expect(container.textContent).toEqual('0');
      });
      expect(container.textContent).toEqual('1');
    });

    it('flushSync flushes updates before end of the tick', async () => {
      let instance;

      class Component extends React.Component {
        state = {text: ''};
        push(val) {
          this.setState(state => ({text: state.text + val}));
        }
        componentDidUpdate() {
          Scheduler.log(this.state.text);
        }
        render() {
          instance = this;
          return <span>{this.state.text}</span>;
        }
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => root.render(<Component />));

      // Updates are async by default
      instance.push('A');
      assertLog([]);
      expect(container.textContent).toEqual('');

      ReactDOM.flushSync(() => {
        instance.push('B');
        instance.push('C');
        // Not flushed yet
        expect(container.textContent).toEqual('');
        assertLog([]);
      });
      // Only the active updates have flushed
      expect(container.textContent).toEqual('ABC');
      assertLog(['ABC']);

      await act(() => {
        instance.push('D');
        expect(container.textContent).toEqual('ABC');
        assertLog([]);
      });
      assertLog(['ABCD']);
      expect(container.textContent).toEqual('ABCD');
    });

    it('ignores discrete events on a pending removed element', async () => {
      const disableButtonRef = React.createRef();
      const submitButtonRef = React.createRef();

      function Form() {
        const [active, setActive] = React.useState(true);
        function disableForm() {
          setActive(false);
        }

        return (
          <div>
            <button onClick={disableForm} ref={disableButtonRef}>
              Disable
            </button>
            {active ? <button ref={submitButtonRef}>Submit</button> : null}
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Form />);
      });

      const disableButton = disableButtonRef.current;
      expect(disableButton.tagName).toBe('BUTTON');

      const submitButton = submitButtonRef.current;
      expect(submitButton.tagName).toBe('BUTTON');

      // Dispatch a click event on the Disable-button.
      const firstEvent = document.createEvent('Event');
      firstEvent.initEvent('click', true, true);
      disableButton.dispatchEvent(firstEvent);

      // The click event is flushed synchronously, even in concurrent mode.
      expect(submitButton.current).toBe(undefined);
    });

    it('ignores discrete events on a pending removed event listener', async () => {
      const disableButtonRef = React.createRef();
      const submitButtonRef = React.createRef();

      let formSubmitted = false;

      function Form() {
        const [active, setActive] = React.useState(true);
        function disableForm() {
          setActive(false);
        }
        function submitForm() {
          formSubmitted = true; // This should not get invoked
        }
        function disabledSubmitForm() {
          // The form is disabled.
        }
        return (
          <div>
            <button onClick={disableForm} ref={disableButtonRef}>
              Disable
            </button>
            <button
              onClick={active ? submitForm : disabledSubmitForm}
              ref={submitButtonRef}>
              Submit
            </button>
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Form />);
      });

      const disableButton = disableButtonRef.current;
      expect(disableButton.tagName).toBe('BUTTON');

      // Dispatch a click event on the Disable-button.
      const firstEvent = document.createEvent('Event');
      firstEvent.initEvent('click', true, true);
      await act(() => {
        disableButton.dispatchEvent(firstEvent);
      });

      // There should now be a pending update to disable the form.

      // This should not have flushed yet since it's in concurrent mode.
      const submitButton = submitButtonRef.current;
      expect(submitButton.tagName).toBe('BUTTON');

      // In the meantime, we can dispatch a new client event on the submit button.
      const secondEvent = document.createEvent('Event');
      secondEvent.initEvent('click', true, true);
      // This should force the pending update to flush which disables the submit button before the event is invoked.
      await act(() => {
        submitButton.dispatchEvent(secondEvent);
      });

      // Therefore the form should never have been submitted.
      expect(formSubmitted).toBe(false);
    });

    it('uses the newest discrete events on a pending changed event listener', async () => {
      const enableButtonRef = React.createRef();
      const submitButtonRef = React.createRef();

      let formSubmitted = false;

      function Form() {
        const [active, setActive] = React.useState(false);
        function enableForm() {
          setActive(true);
        }
        function submitForm() {
          formSubmitted = true; // This should not get invoked
        }
        return (
          <div>
            <button onClick={enableForm} ref={enableButtonRef}>
              Enable
            </button>
            <button onClick={active ? submitForm : null} ref={submitButtonRef}>
              Submit
            </button>
          </div>
        );
      }

      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Form />);
      });

      const enableButton = enableButtonRef.current;
      expect(enableButton.tagName).toBe('BUTTON');

      // Dispatch a click event on the Enable-button.
      const firstEvent = document.createEvent('Event');
      firstEvent.initEvent('click', true, true);
      await act(() => {
        enableButton.dispatchEvent(firstEvent);
      });

      // There should now be a pending update to enable the form.

      // This should not have flushed yet since it's in concurrent mode.
      const submitButton = submitButtonRef.current;
      expect(submitButton.tagName).toBe('BUTTON');

      // In the meantime, we can dispatch a new client event on the submit button.
      const secondEvent = document.createEvent('Event');
      secondEvent.initEvent('click', true, true);
      // This should force the pending update to flush which enables the submit button before the event is invoked.
      await act(() => {
        submitButton.dispatchEvent(secondEvent);
      });

      // Therefore the form should have been submitted.
      expect(formSubmitted).toBe(true);
    });
  });

  it('regression test: does not drop passive effects across roots (#17066)', async () => {
    const {useState, useEffect} = React;

    function App({label}) {
      const [step, setStep] = useState(0);
      useEffect(() => {
        if (step < 3) {
          setStep(step + 1);
        }
      }, [step]);

      // The component should keep re-rendering itself until `step` is 3.
      return step === 3 ? 'Finished' : 'Unresolved';
    }

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    const containerC = document.createElement('div');
    const rootA = ReactDOMClient.createRoot(containerA);
    const rootB = ReactDOMClient.createRoot(containerB);
    const rootC = ReactDOMClient.createRoot(containerC);

    await act(() => {
      rootA.render(<App label="A" />);
      rootB.render(<App label="B" />);
      rootC.render(<App label="C" />);
    });

    expect(containerA.textContent).toEqual('Finished');
    expect(containerB.textContent).toEqual('Finished');
    expect(containerC.textContent).toEqual('Finished');
  });

  it('updates flush without yielding in the next event', async () => {
    const root = ReactDOMClient.createRoot(container);

    function Text(props) {
      Scheduler.log(props.text);
      return props.text;
    }

    root.render(
      <>
        <Text text="A" />
        <Text text="B" />
        <Text text="C" />
      </>,
    );

    // Nothing should have rendered yet
    expect(container.textContent).toEqual('');

    // Everything should render immediately in the next event
    await waitForAll(['A', 'B', 'C']);
    expect(container.textContent).toEqual('ABC');
  });

  it('unmounted roots should never clear newer root content from a container', async () => {
    const ref = React.createRef();

    function OldApp() {
      const [value, setValue] = React.useState('old');
      function hideOnClick() {
        // Schedule a discrete update.
        setValue('update');
        // Synchronously unmount this root.
        ReactDOM.flushSync(() => oldRoot.unmount());
      }
      return (
        <button onClick={hideOnClick} ref={ref}>
          {value}
        </button>
      );
    }

    function NewApp() {
      return <button ref={ref}>new</button>;
    }

    const oldRoot = ReactDOMClient.createRoot(container);
    await act(() => {
      oldRoot.render(<OldApp />);
    });

    // Invoke discrete event.
    ref.current.click();

    // The root should now be unmounted.
    expect(container.textContent).toBe('');

    // We can now render a new one.
    const newRoot = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      newRoot.render(<NewApp />);
    });
    ref.current.click();

    expect(container.textContent).toBe('new');
  });

  it('should synchronously render the transition lane scheduled in a popState', async () => {
    function App() {
      const [syncState, setSyncState] = React.useState(false);
      const [hasNavigated, setHasNavigated] = React.useState(false);
      function onPopstate() {
        Scheduler.log(`popState`);
        React.startTransition(() => {
          setHasNavigated(true);
        });
        setSyncState(true);
      }
      React.useEffect(() => {
        window.addEventListener('popstate', onPopstate);
        return () => {
          window.removeEventListener('popstate', onPopstate);
        };
      }, []);
      Scheduler.log(`render:${hasNavigated}/${syncState}`);
      return null;
    }
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    assertLog(['render:false/false']);

    await act(async () => {
      const popStateEvent = new Event('popstate');
      // Jest is not emulating window.event correctly in the microtask
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      queueMicrotask(() => {
        window.event = undefined;
      });
    });

    assertLog(['popState', 'render:true/true']);
    await act(() => {
      root.unmount();
    });
  });

  it('Should not flush transition lanes if there is no transition scheduled in popState', async () => {
    let setHasNavigated;
    function App() {
      const [syncState, setSyncState] = React.useState(false);
      const [hasNavigated, _setHasNavigated] = React.useState(false);
      setHasNavigated = _setHasNavigated;
      function onPopstate() {
        setSyncState(true);
      }

      React.useEffect(() => {
        window.addEventListener('popstate', onPopstate);
        return () => {
          window.removeEventListener('popstate', onPopstate);
        };
      }, []);

      Scheduler.log(`render:${hasNavigated}/${syncState}`);
      return null;
    }
    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    assertLog(['render:false/false']);

    React.startTransition(() => {
      setHasNavigated(true);
    });
    await act(async () => {
      const popStateEvent = new Event('popstate');
      // Jest is not emulating window.event correctly in the microtask
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      queueMicrotask(() => {
        window.event = undefined;
      });
    });
    assertLog(['render:false/true', 'render:true/true']);
    await act(() => {
      root.unmount();
    });
  });

  it('transition lane in popState should be allowed to suspend', async () => {
    let resolvePromise;
    const promise = new Promise(res => {
      resolvePromise = res;
    });

    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    function App() {
      const [pathname, setPathname] = React.useState('/path/a');

      if (pathname !== '/path/a') {
        try {
          React.use(promise);
        } catch (e) {
          Scheduler.log(`Suspend! [${pathname}]`);
          throw e;
        }
      }

      React.useEffect(() => {
        function onPopstate() {
          React.startTransition(() => {
            setPathname('/path/b');
          });
        }
        window.addEventListener('popstate', onPopstate);
        return () => window.removeEventListener('popstate', onPopstate);
      }, []);

      return (
        <>
          <Text text="Before" />
          <div>
            <Text text={pathname} />
          </div>
          <Text text="After" />
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App />);
    });
    assertLog(['Before', '/path/a', 'After']);

    const div = container.getElementsByTagName('div')[0];
    expect(div.textContent).toBe('/path/a');

    // Simulate a popstate event
    await act(async () => {
      const popStateEvent = new Event('popstate');

      // Simulate a popstate event
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      await waitForMicrotasks();
      window.event = undefined;

      // The transition lane should have been attempted synchronously (in
      // a microtask)
      assertLog(['Suspend! [/path/b]']);
      // Because it suspended, it remains on the current path
      expect(div.textContent).toBe('/path/a');
    });
    // pre-warming
    assertLog(['Suspend! [/path/b]']);

    await act(async () => {
      resolvePromise();

      // Since the transition previously suspended, there's no need for this
      // transition to be rendered synchronously on susbequent attempts; if we
      // fail to commit synchronously the first time, the scroll restoration
      // state won't be restored anyway.
      //
      // Yield in between each child to prove that it's concurrent.
      await waitForMicrotasks();
      assertLog([]);

      await waitFor(['Before']);
      await waitFor(['/path/b']);
      await waitFor(['After']);
    });
    assertLog([]);
    expect(div.textContent).toBe('/path/b');
    await act(() => {
      root.unmount();
    });
  });

  it('regression: useDeferredValue in popState leads to infinite deferral loop', async () => {
    // At the time this test was written, it simulated a particular crash that
    // was happened due to a combination of very subtle implementation details.
    // Rather than couple this test to those implementation details, I've chosen
    // to keep it as high-level as possible so that it doesn't break if the
    // details change. In the future, it might not be trigger the exact set of
    // internal circumstances anymore, but it could be useful for catching
    // similar bugs because it represents a realistic real world situation —
    // namely, switching tabs repeatedly in an app that uses useDeferredValue.
    //
    // But don't worry too much about why this test is written the way it is.

    // Represents the browser's current location
    let browserPathname = '/path/a';

    let setPathname;
    function App({initialPathname}) {
      const [pathname, _setPathname] = React.useState('/path/a');
      setPathname = _setPathname;

      const deferredPathname = React.useDeferredValue(pathname);

      // Attach a popstate listener on mount. Normally this would be in the
      // in the router implementation.
      React.useEffect(() => {
        function onPopstate() {
          React.startTransition(() => {
            setPathname(browserPathname);
          });
        }
        window.addEventListener('popstate', onPopstate);
        return () => window.removeEventListener('popstate', onPopstate);
      }, []);

      return `Current:  ${pathname}\nDeferred: ${deferredPathname}`;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<App initialPathname={browserPathname} />);
    });

    // Simulate a series of popstate events that toggle back and forth between
    // two locations. In the original regression case, a certain combination
    // of transition lanes would cause React to fall into an infinite deferral
    // loop — specifically, when the spawned by the useDeferredValue hook was
    // assigned a "higher" bit value than the one assigned to the "popstate".

    // For alignment reasons, call this once to advance the internal variable
    // that assigns transition lanes. Because this is a no-op update, it will
    // bump the counter, but it won't trigger the useDeferredValue hook.
    setPathname(browserPathname);

    // Trigger enough popstate events that the scenario occurs for every
    // possible transition lane.
    for (let i = 0; i < 50; i++) {
      await act(async () => {
        // Simulate a popstate event
        browserPathname = browserPathname === '/path/a' ? '/path/b' : '/path/a';
        const popStateEvent = new Event('popstate');
        window.event = popStateEvent;
        window.dispatchEvent(popStateEvent);
        await waitForMicrotasks();
        window.event = undefined;
      });
    }
  });

  it('regression: infinite deferral loop caused by unstable useDeferredValue input', async () => {
    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    let i = 0;
    function App() {
      const [pathname, setPathname] = React.useState('/path/a');
      // This is an unstable input, so it will always cause a deferred render.
      const {value: deferredPathname} = React.useDeferredValue({
        value: pathname,
      });
      if (i++ > 100) {
        throw new Error('Infinite loop detected');
      }
      React.useEffect(() => {
        function onPopstate() {
          React.startTransition(() => {
            setPathname('/path/b');
          });
        }
        window.addEventListener('popstate', onPopstate);
        return () => window.removeEventListener('popstate', onPopstate);
      }, []);

      return <Text text={deferredPathname} />;
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    assertLog(['/path/a']);
    expect(container.textContent).toBe('/path/a');

    // Simulate a popstate event
    await act(async () => {
      const popStateEvent = new Event('popstate');

      // Simulate a popstate event
      window.event = popStateEvent;
      window.dispatchEvent(popStateEvent);
      await waitForMicrotasks();
      window.event = undefined;

      // The transition lane is attempted synchronously (in a microtask).
      // Because the input to useDeferredValue is referentially unstable, it
      // will spawn a deferred task at transition priority. However, even
      // though it was spawned during a transition event, the spawned task
      // not also be upgraded to sync.
      assertLog(['/path/a']);
    });
    assertLog(['/path/b']);
    expect(container.textContent).toBe('/path/b');
    await act(() => {
      root.unmount();
    });
  });
});
