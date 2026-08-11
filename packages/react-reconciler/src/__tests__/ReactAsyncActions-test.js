let React;
let ReactNoop;
let Scheduler;
let act;
let assertLog;
let useTransition;
let useState;
let useOptimistic;
let textCache;
let assertConsoleErrorDev;

describe('ReactAsyncActions', () => {
  beforeEach(() => {
    jest.resetModules();

    global.reportError = error => {
      Scheduler.log('reportError: ' + error.message);
    };

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    useTransition = React.useTransition;
    useState = React.useState;
    useOptimistic = React.useOptimistic;

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

  function getText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
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
      return thenable;
    } else {
      switch (record.status) {
        case 'pending':
          return record.value;
        case 'rejected':
          return Promise.reject(record.value);
        case 'resolved':
          return Promise.resolve(record.value);
      }
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

  it('isPending remains true until async action finishes', async () => {
    let startTransition;
    function App() {
      const [isPending, _start] = useTransition();
      startTransition = _start;
      return <Text text={'Pending: ' + isPending} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['Pending: false']);
    expect(root).toMatchRenderedOutput('Pending: false');

    // At the start of an async action, isPending is set to true.
    await act(() => {
      startTransition(async () => {
        Scheduler.log('Async action started');
        await getText('Wait');
        Scheduler.log('Async action ended');
      });
    });
    assertLog(['Async action started', 'Pending: true']);
    expect(root).toMatchRenderedOutput('Pending: true');

    // Once the action finishes, isPending is set back to false.
    await act(() => resolveText('Wait'));
    assertLog(['Async action ended', 'Pending: false']);
    expect(root).toMatchRenderedOutput('Pending: false');
  });

  it('multiple updates in an async action scope are entangled together', async () => {
    let startTransition;
    function App({text}) {
      const [isPending, _start] = useTransition();
      startTransition = _start;
      return (
        <>
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
          <span>
            <Text text={text} />
          </span>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App text="A" />);
    });
    assertLog(['Pending: false', 'A']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: false</span>
        <span>A</span>
      </>,
    );

    await act(() => {
      startTransition(async () => {
        Scheduler.log('Async action started');
        await getText('Yield before updating');
        Scheduler.log('Async action ended');
        startTransition(() => root.render(<App text="B" />));
      });
    });
    assertLog(['Async action started', 'Pending: true', 'A']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A</span>
      </>,
    );

    await act(() => resolveText('Yield before updating'));
    assertLog(['Async action ended', 'Pending: false', 'B']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: false</span>
        <span>B</span>
      </>,
    );
  });

  it('multiple async action updates in the same scope are entangled together', async () => {
    let setStepA;
    function A() {
      const [step, setStep] = useState(0);
      setStepA = setStep;
      return <AsyncText text={'A' + step} />;
    }

    let setStepB;
    function B() {
      const [step, setStep] = useState(0);
      setStepB = setStep;
      return <AsyncText text={'B' + step} />;
    }

    let setStepC;
    function C() {
      const [step, setStep] = useState(0);
      setStepC = setStep;
      return <AsyncText text={'C' + step} />;
    }

    let startTransition;
    function App() {
      const [isPending, _start] = useTransition();
      startTransition = _start;
      return (
        <>
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
          <span>
            <A />, <B />, <C />
          </span>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    resolveText('A0');
    resolveText('B0');
    resolveText('C0');
    await act(() => {
      root.render(<App text="A" />);
    });
    assertLog(['Pending: false', 'A0', 'B0', 'C0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: false</span>
        <span>A0, B0, C0</span>
      </>,
    );

    await act(() => {
      startTransition(async () => {
        Scheduler.log('Async action started');
        setStepA(1);
        await getText('Wait before updating B');
        startTransition(() => setStepB(1));
        await getText('Wait before updating C');
        startTransition(() => setStepC(1));
        Scheduler.log('Async action ended');
      });
    });
    assertLog(['Async action started', 'Pending: true', 'A0', 'B0', 'C0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B0, C0</span>
      </>,
    );

    // This will schedule an update on B, but nothing will render yet because
    // the async action scope hasn't finished.
    await act(() => resolveText('Wait before updating B'));
    assertLog([]);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B0, C0</span>
      </>,
    );

    // This will schedule an update on C, and also the async action scope
    // will end. This will allow React to attempt to render the updates.
    await act(() => resolveText('Wait before updating C'));
    assertLog([
      'Async action ended',
      'Pending: false',
      'Suspend! [A1]',
      // pre-warming
      'Suspend! [B1]',
      'Suspend! [C1]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B0, C0</span>
      </>,
    );

    // Progressively load the all the data. Because they are all entangled
    // together, only when the all of A, B, and C updates are unblocked is the
    // render allowed to proceed.
    await act(() => resolveText('A1'));
    assertLog([
      'Pending: false',
      'A1',
      'Suspend! [B1]',
      // pre-warming
      'Suspend! [C1]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B0, C0</span>
      </>,
    );
    await act(() => resolveText('B1'));
    assertLog(['Pending: false', 'A1', 'B1', 'Suspend! [C1]']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B0, C0</span>
      </>,
    );

    // Finally, all the data has loaded and the transition is complete.
    await act(() => resolveText('C1'));
    assertLog(['Pending: false', 'A1', 'B1', 'C1']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: false</span>
        <span>A1, B1, C1</span>
      </>,
    );
  });

  it('urgent updates are not blocked during an async action', async () => {
    let setStepA;
    function A() {
      const [step, setStep] = useState(0);
      setStepA = setStep;
      return <Text text={'A' + step} />;
    }

    let setStepB;
    function B() {
      const [step, setStep] = useState(0);
      setStepB = setStep;
      return <Text text={'B' + step} />;
    }

    let startTransition;
    function App() {
      const [isPending, _start] = useTransition();
      startTransition = _start;
      return (
        <>
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
          <span>
            <A />, <B />
          </span>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App text="A" />);
    });
    assertLog(['Pending: false', 'A0', 'B0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: false</span>
        <span>A0, B0</span>
      </>,
    );

    await act(() => {
      startTransition(async () => {
        Scheduler.log('Async action started');
        startTransition(() => setStepA(1));
        await getText('Wait');
        Scheduler.log('Async action ended');
      });
    });
    assertLog(['Async action started', 'Pending: true', 'A0', 'B0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B0</span>
      </>,
    );

    // Update B at urgent priority. This should be allowed to finish.
    await act(() => setStepB(1));
    assertLog(['B1']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: true</span>
        <span>A0, B1</span>
      </>,
    );

    // Finish the async action.
    await act(() => resolveText('Wait'));
    assertLog(['Async action ended', 'Pending: false', 'A1', 'B1']);
    expect(root).toMatchRenderedOutput(
      <>
        <span>Pending: false</span>
        <span>A1, B1</span>
      </>,
    );
  });

  it("if a sync action throws, it's rethrown from the `useTransition`", async () => {
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

    let startTransition;
    function App() {
      const [isPending, _start] = useTransition();
      startTransition = _start;
      return <Text text={'Pending: ' + isPending} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      );
    });
    assertLog(['Pending: false']);
    expect(root).toMatchRenderedOutput('Pending: false');

    await act(() => {
      startTransition(() => {
        throw new Error('Oops!');
      });
    });
    assertLog(['Pending: true', 'Oops!', 'Oops!']);
    expect(root).toMatchRenderedOutput('Oops!');
  });

  it("if an async action throws, it's rethrown from the `useTransition`", async () => {
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

    let startTransition;
    function App() {
      const [isPending, _start] = useTransition();
      startTransition = _start;
      return <Text text={'Pending: ' + isPending} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      );
    });
    assertLog(['Pending: false']);
    expect(root).toMatchRenderedOutput('Pending: false');

    await act(() => {
      startTransition(async () => {
        Scheduler.log('Async action started');
        await getText('Wait');
        throw new Error('Oops!');
      });
    });
    assertLog(['Async action started', 'Pending: true']);
    expect(root).toMatchRenderedOutput('Pending: true');

    await act(() => resolveText('Wait'));
    assertLog(['Oops!', 'Oops!']);
    expect(root).toMatchRenderedOutput('Oops!');
  });

  it('if there are multiple entangled actions, and one of them errors, it only affects that action', async () => {
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

    let startTransitionA;
    function ActionA() {
      const [isPendingA, start] = useTransition();
      startTransitionA = start;
      return <Text text={'Pending A: ' + isPendingA} />;
    }

    let startTransitionB;
    function ActionB() {
      const [isPending, start] = useTransition();
      startTransitionB = start;
      return <Text text={'Pending B: ' + isPending} />;
    }

    let startTransitionC;
    function ActionC() {
      const [isPending, start] = useTransition();
      startTransitionC = start;
      return <Text text={'Pending C: ' + isPending} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <>
          <div>
            <ErrorBoundary>
              <ActionA />
            </ErrorBoundary>
          </div>
          <div>
            <ErrorBoundary>
              <ActionB />
            </ErrorBoundary>
          </div>
          <div>
            <ErrorBoundary>
              <ActionC />
            </ErrorBoundary>
          </div>
        </>,
      );
    });
    assertLog(['Pending A: false', 'Pending B: false', 'Pending C: false']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending A: false</div>
        <div>Pending B: false</div>
        <div>Pending C: false</div>
      </>,
    );

    // Start a bunch of entangled transitions. A and C throw errors, but B
    // doesn't. A and should surface their respective errors, but B should
    // finish successfully.
    await act(() => {
      startTransitionC(async () => {
        startTransitionB(async () => {
          startTransitionA(async () => {
            await getText('Wait for A');
            throw new Error('Oops A!');
          });
          await getText('Wait for B');
        });
        await getText('Wait for C');
        throw new Error('Oops C!');
      });
    });
    assertLog(['Pending A: true', 'Pending B: true', 'Pending C: true']);

    // Finish action A. We can't commit the result yet because it's entangled
    // with B and C.
    await act(() => resolveText('Wait for A'));
    assertLog([]);

    // Finish action B. Same as above.
    await act(() => resolveText('Wait for B'));
    assertLog([]);

    // Now finish action C. This is the last action in the entangled set, so
    // rendering can proceed.
    await act(() => resolveText('Wait for C'));
    assertLog([
      // A and C result in (separate) errors, but B does not.
      'Oops A!',
      'Pending B: false',
      'Oops C!',

      // Because there was an error, React will try rendering one more time.
      'Oops A!',
      'Pending B: false',
      'Oops C!',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Oops A!</div>
        <div>Pending B: false</div>
        <div>Oops C!</div>
      </>,
    );
  });

  it('useOptimistic can be used to implement a pending state', async () => {
    const startTransition = React.startTransition;

    let setIsPending;
    function App({text}) {
      const [isPending, _setIsPending] = useOptimistic(false);
      setIsPending = _setIsPending;
      return (
        <>
          <Text text={'Pending: ' + isPending} />
          <AsyncText text={text} />
        </>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    resolveText('A');
    await act(() => root.render(<App text="A" />));
    assertLog(['Pending: false', 'A']);
    expect(root).toMatchRenderedOutput('Pending: falseA');

    // Start a transition
    await act(() =>
      startTransition(() => {
        setIsPending(true);
        root.render(<App text="B" />);
      }),
    );
    assertLog([
      // Render the pending state immediately
      'Pending: true',
      'A',

      // Then attempt to render the transition. The pending state will be
      // automatically reverted.
      'Pending: false',
      'Suspend! [B]',
    ]);

    // Resolve the transition
    await act(() => resolveText('B'));
    assertLog([
      // Render the pending state immediately
      'Pending: false',
      'B',
    ]);
  });

  it('useOptimistic rebases pending updates on top of passthrough value', async () => {
    let serverCart = ['A'];

    async function submitNewItem(item) {
      await getText('Adding item ' + item);
      serverCart = [...serverCart, item];
      React.startTransition(() => {
        root.render(<App cart={serverCart} />);
      });
    }

    let addItemToCart;
    function App({cart}) {
      const [isPending, startTransition] = useTransition();

      const savedCartSize = cart.length;
      const [optimisticCartSize, setOptimisticCartSize] =
        useOptimistic(savedCartSize);

      addItemToCart = item => {
        startTransition(async () => {
          setOptimisticCartSize(n => n + 1);
          await submitNewItem(item);
        });
      };

      return (
        <>
          <div>
            <Text text={'Pending: ' + isPending} />
          </div>
          <div>
            <Text text={'Items in cart: ' + optimisticCartSize} />
          </div>
          <ul>
            {cart.map(item => (
              <li key={item}>
                <Text text={'Item ' + item} />
              </li>
            ))}
          </ul>
        </>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    await act(() => root.render(<App cart={serverCart} />));
    assertLog(['Pending: false', 'Items in cart: 1', 'Item A']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: false</div>
        <div>Items in cart: 1</div>
        <ul>
          <li>Item A</li>
        </ul>
      </>,
    );

    // The cart size is incremented even though B hasn't been added yet.
    await act(() => addItemToCart('B'));
    assertLog(['Pending: true', 'Items in cart: 2', 'Item A']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: true</div>
        <div>Items in cart: 2</div>
        <ul>
          <li>Item A</li>
        </ul>
      </>,
    );

    // While B is still pending, another item gets added to the cart
    // out-of-band.
    serverCart = [...serverCart, 'C'];
    // NOTE: This is a synchronous update only because we don't yet support
    // parallel transitions; all transitions are entangled together. Once we add
    // support for parallel transitions, we can update this test.
    ReactNoop.flushSync(() => root.render(<App cart={serverCart} />));
    assertLog([
      'Pending: true',
      // Note that the optimistic cart size is still correct, because the
      // pending update was rebased on top new value.
      'Items in cart: 3',
      'Item A',
      'Item C',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: true</div>
        <div>Items in cart: 3</div>
        <ul>
          <li>Item A</li>
          <li>Item C</li>
        </ul>
      </>,
    );

    // Finish loading B. The optimistic state is reverted.
    await act(() => resolveText('Adding item B'));
    assertLog([
      'Pending: false',
      'Items in cart: 3',
      'Item A',
      'Item C',
      'Item B',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: false</div>
        <div>Items in cart: 3</div>
        <ul>
          <li>Item A</li>
          <li>Item C</li>
          <li>Item B</li>
        </ul>
      </>,
    );
  });

  it(
    'regression: when there are no pending transitions, useOptimistic should ' +
      'always return the passthrough value',
    async () => {
      let setCanonicalState;
      function App() {
        const [canonicalState, _setCanonicalState] = useState(0);
        const [optimisticState] = useOptimistic(canonicalState);
        setCanonicalState = _setCanonicalState;

        return (
          <>
            <div>
              <Text text={'Canonical: ' + canonicalState} />
            </div>
            <div>
              <Text text={'Optimistic: ' + optimisticState} />
            </div>
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => root.render(<App />));
      assertLog(['Canonical: 0', 'Optimistic: 0']);
      expect(root).toMatchRenderedOutput(
        <>
          <div>Canonical: 0</div>
          <div>Optimistic: 0</div>
        </>,
      );

      // Update the canonical state. The optimistic state should update, too,
      // even though there was no transition, and no call to setOptimisticState.
      await act(() => setCanonicalState(1));
      assertLog(['Canonical: 1', 'Optimistic: 1']);
      expect(root).toMatchRenderedOutput(
        <>
          <div>Canonical: 1</div>
          <div>Optimistic: 1</div>
        </>,
      );
    },
  );

  it('regression: useOptimistic during setState-in-render', async () => {
    // This is a regression test for a very specific case where useOptimistic is
    // the first hook in the component, it has a pending update, and a later
    // hook schedules a local (setState-in-render) update. Don't sweat about
    // deleting this test if the implementation details change.

    let setOptimisticState;
    let startTransition;
    function App() {
      const [optimisticState, _setOptimisticState] = useOptimistic(0);
      setOptimisticState = _setOptimisticState;
      const [, _startTransition] = useTransition();
      startTransition = _startTransition;

      const [derivedState, setDerivedState] = useState(0);
      if (derivedState !== optimisticState) {
        setDerivedState(optimisticState);
      }

      return <Text text={optimisticState} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog([0]);
    expect(root).toMatchRenderedOutput('0');

    await act(() => {
      startTransition(async () => {
        setOptimisticState(1);
        await getText('Wait');
      });
    });
    assertLog([1]);
    expect(root).toMatchRenderedOutput('1');
  });

  it('useOptimistic accepts a custom reducer', async () => {
    let serverCart = ['A'];

    async function submitNewItem(item) {
      await getText('Adding item ' + item);
      serverCart = [...serverCart, item];
      React.startTransition(() => {
        root.render(<App cart={serverCart} />);
      });
    }

    let addItemToCart;
    function App({cart}) {
      const [isPending, startTransition] = useTransition();

      const savedCartSize = cart.length;
      const [optimisticCartSize, addToOptimisticCart] = useOptimistic(
        savedCartSize,
        (prevSize, newItem) => {
          Scheduler.log('Increment optimistic cart size for ' + newItem);
          return prevSize + 1;
        },
      );

      addItemToCart = item => {
        startTransition(async () => {
          addToOptimisticCart(item);
          await submitNewItem(item);
        });
      };

      return (
        <>
          <div>
            <Text text={'Pending: ' + isPending} />
          </div>
          <div>
            <Text text={'Items in cart: ' + optimisticCartSize} />
          </div>
          <ul>
            {cart.map(item => (
              <li key={item}>
                <Text text={'Item ' + item} />
              </li>
            ))}
          </ul>
        </>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    await act(() => root.render(<App cart={serverCart} />));
    assertLog(['Pending: false', 'Items in cart: 1', 'Item A']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: false</div>
        <div>Items in cart: 1</div>
        <ul>
          <li>Item A</li>
        </ul>
      </>,
    );

    // The cart size is incremented even though B hasn't been added yet.
    await act(() => addItemToCart('B'));
    assertLog([
      'Increment optimistic cart size for B',
      'Pending: true',
      'Items in cart: 2',
      'Item A',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: true</div>
        <div>Items in cart: 2</div>
        <ul>
          <li>Item A</li>
        </ul>
      </>,
    );

    // While B is still pending, another item gets added to the cart
    // out-of-band.
    serverCart = [...serverCart, 'C'];
    // NOTE: This is a synchronous update only because we don't yet support
    // parallel transitions; all transitions are entangled together. Once we add
    // support for parallel transitions, we can update this test.
    ReactNoop.flushSync(() => root.render(<App cart={serverCart} />));
    assertLog([
      'Increment optimistic cart size for B',
      'Pending: true',
      // Note that the optimistic cart size is still correct, because the
      // pending update was rebased on top new value.
      'Items in cart: 3',
      'Item A',
      'Item C',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: true</div>
        <div>Items in cart: 3</div>
        <ul>
          <li>Item A</li>
          <li>Item C</li>
        </ul>
      </>,
    );

    // Finish loading B. The optimistic state is reverted.
    await act(() => resolveText('Adding item B'));
    assertLog([
      'Pending: false',
      'Items in cart: 3',
      'Item A',
      'Item C',
      'Item B',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Pending: false</div>
        <div>Items in cart: 3</div>
        <ul>
          <li>Item A</li>
          <li>Item C</li>
          <li>Item B</li>
        </ul>
      </>,
    );
  });

  it('useOptimistic rebases if the passthrough is updated during a render phase update', async () => {
    // This is kind of an esoteric case where it's hard to come up with a
    // realistic real-world scenario but it should still work.
    let increment;
    let setCount;
    function App() {
      const [isPending, startTransition] = useTransition(2);
      const [count, _setCount] = useState(0);
      setCount = _setCount;

      const [optimisticCount, setOptimisticCount] = useOptimistic(
        count,
        prev => {
          Scheduler.log('Increment optimistic count');
          return prev + 1;
        },
      );

      if (count === 1) {
        Scheduler.log('Render phase update count from 1 to 2');
        setCount(2);
      }

      increment = () =>
        startTransition(async () => {
          setOptimisticCount(n => n + 1);
          await getText('Wait to increment');
          React.startTransition(() => setCount(n => n + 1));
        });

      return (
        <>
          <div>
            <Text text={'Count: ' + count} />
          </div>
          {isPending ? (
            <div>
              <Text text={'Optimistic count: ' + optimisticCount} />
            </div>
          ) : null}
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog(['Count: 0']);
    expect(root).toMatchRenderedOutput(<div>Count: 0</div>);

    await act(() => increment());
    assertLog([
      'Increment optimistic count',
      'Count: 0',
      'Optimistic count: 1',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Count: 0</div>
        <div>Optimistic count: 1</div>
      </>,
    );

    await act(() => setCount(1));
    assertLog([
      'Increment optimistic count',
      'Render phase update count from 1 to 2',
      // The optimistic update is rebased on top of the new passthrough value.
      'Increment optimistic count',
      'Count: 2',
      'Optimistic count: 3',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Count: 2</div>
        <div>Optimistic count: 3</div>
      </>,
    );

    // Finish the action
    await act(() => resolveText('Wait to increment'));
    assertLog(['Count: 3']);
    expect(root).toMatchRenderedOutput(<div>Count: 3</div>);
  });

  it('useOptimistic rebases if the passthrough is updated during a render phase update (initial mount)', async () => {
    // This is kind of an esoteric case where it's hard to come up with a
    // realistic real-world scenario but it should still work.
    function App() {
      const [count, setCount] = useState(0);
      const [optimisticCount] = useOptimistic(count);

      if (count === 0) {
        Scheduler.log('Render phase update count from 1 to 2');
        setCount(1);
      }

      return (
        <>
          <div>
            <Text text={'Count: ' + count} />
          </div>
          <div>
            <Text text={'Optimistic count: ' + optimisticCount} />
          </div>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog([
      'Render phase update count from 1 to 2',
      'Count: 1',
      'Optimistic count: 1',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Count: 1</div>
        <div>Optimistic count: 1</div>
      </>,
    );
  });

  it('useOptimistic can update repeatedly in the same async action', async () => {
    let startTransition;
    let setLoadingProgress;
    let setText;
    function App() {
      const [, _startTransition] = useTransition();
      const [text, _setText] = useState('A');
      const [loadingProgress, _setLoadingProgress] = useOptimistic(0);
      startTransition = _startTransition;
      setText = _setText;
      setLoadingProgress = _setLoadingProgress;

      return (
        <>
          {loadingProgress !== 0 ? (
            <div key="progress">
              <Text text={`Loading... (${loadingProgress})`} />
            </div>
          ) : null}
          <div key="real">
            <Text text={text} />
          </div>
        </>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog(['A']);
    expect(root).toMatchRenderedOutput(<div>A</div>);

    await act(async () => {
      startTransition(async () => {
        setLoadingProgress('25%');
        await getText('Wait 1');
        setLoadingProgress('75%');
        await getText('Wait 2');
        startTransition(() => setText('B'));
      });
    });
    assertLog(['Loading... (25%)', 'A']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Loading... (25%)</div>
        <div>A</div>
      </>,
    );

    await act(() => resolveText('Wait 1'));
    assertLog(['Loading... (75%)', 'A']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Loading... (75%)</div>
        <div>A</div>
      </>,
    );

    await act(() => resolveText('Wait 2'));
    assertLog(['B']);
    expect(root).toMatchRenderedOutput(<div>B</div>);
  });

  it('useOptimistic warns if outside of a transition', async () => {
    let startTransition;
    let setLoadingProgress;
    let setText;
    function App() {
      const [, _startTransition] = useTransition();
      const [text, _setText] = useState('A');
      const [loadingProgress, _setLoadingProgress] = useOptimistic(0);
      startTransition = _startTransition;
      setText = _setText;
      setLoadingProgress = _setLoadingProgress;

      return (
        <>
          {loadingProgress !== 0 ? (
            <div key="progress">
              <Text text={`Loading... (${loadingProgress})`} />
            </div>
          ) : null}
          <div key="real">
            <Text text={text} />
          </div>
        </>
      );
    }

    // Initial render
    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog(['A']);
    expect(root).toMatchRenderedOutput(<div>A</div>);

    await act(() => {
      setLoadingProgress('25%');
      startTransition(() => setText('B'));
    });
    assertConsoleErrorDev([
      'An optimistic state update occurred outside a transition or ' +
        'action. To fix, move the update to an action, or wrap ' +
        'with startTransition.',
    ]);
    assertLog(['Loading... (25%)', 'A', 'B']);
    expect(root).toMatchRenderedOutput(<div>B</div>);
  });

  it(
    'optimistic state is not reverted until async action finishes, even if ' +
      'useTransition hook is unmounted',
    async () => {
      let startTransition;
      function Updater() {
        const [isPending, _start] = useTransition();
        startTransition = _start;
        return (
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
        );
      }

      let setText;
      let setOptimisticText;
      function Sibling() {
        const [canonicalText, _setText] = useState('A');
        setText = _setText;

        const [text, _setOptimisticText] = useOptimistic(
          canonicalText,
          (_, optimisticText) => `${optimisticText} (loading...)`,
        );
        setOptimisticText = _setOptimisticText;

        return (
          <span>
            <Text text={text} />
          </span>
        );
      }

      function App({showUpdater}) {
        return (
          <>
            {showUpdater ? <Updater /> : null}
            <Sibling />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App showUpdater={true} />);
      });
      assertLog(['Pending: false', 'A']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: false</span>
          <span>A</span>
        </>,
      );

      // Start an async action that has multiple updates with async
      // operations in between.
      await act(() => {
        startTransition(async () => {
          Scheduler.log('Async action started');

          setOptimisticText('C');

          startTransition(() => setText('B'));

          await getText('Wait before updating to C');

          Scheduler.log('Async action ended');
          startTransition(() => setText('C'));
        });
      });
      assertLog([
        'Async action started',
        'Pending: true',
        // Render an optimistic value
        'C (loading...)',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: true</span>
          <span>C (loading...)</span>
        </>,
      );

      // Delete the component that contains the useTransition hook. This
      // component no longer blocks the transition from completing. But the
      // we're still showing an optimistic state, because the async action has
      // not yet finished.
      await act(() => {
        root.render(<App showUpdater={false} />);
      });
      assertLog(['C (loading...)']);
      expect(root).toMatchRenderedOutput(<span>C (loading...)</span>);

      // Finish the async action. Now the optimistic state is reverted and we
      // switch to the canonical value.
      await act(() => resolveText('Wait before updating to C'));
      assertLog(['Async action ended', 'C']);
      expect(root).toMatchRenderedOutput(<span>C</span>);
    },
  );

  it(
    'updates in an async action are entangled even if useTransition hook ' +
      'is unmounted before it finishes',
    async () => {
      let startTransition;
      function Updater() {
        const [isPending, _start] = useTransition();
        startTransition = _start;
        return (
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
        );
      }

      let setText;
      function Sibling() {
        const [text, _setText] = useState('A');
        setText = _setText;
        return (
          <span>
            <Text text={text} />
          </span>
        );
      }

      function App({showUpdater}) {
        return (
          <>
            {showUpdater ? <Updater /> : null}
            <Sibling />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App showUpdater={true} />);
      });
      assertLog(['Pending: false', 'A']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: false</span>
          <span>A</span>
        </>,
      );

      // Start an async action that has multiple updates with async
      // operations in between.
      await act(() => {
        startTransition(async () => {
          Scheduler.log('Async action started');
          startTransition(() => setText('B'));

          await getText('Wait before updating to C');

          Scheduler.log('Async action ended');
          startTransition(() => setText('C'));
        });
      });
      assertLog(['Async action started', 'Pending: true']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: true</span>
          <span>A</span>
        </>,
      );

      // Delete the component that contains the useTransition hook. This
      // component no longer blocks the transition from completing. But the
      // pending update to Sibling should not be allowed to finish, because it's
      // part of the async action.
      await act(() => {
        root.render(<App showUpdater={false} />);
      });
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<span>A</span>);

      // Finish the async action. Notice the intermediate B state was never
      // shown, because it was batched with the update that came later in the
      // same action.
      await act(() => resolveText('Wait before updating to C'));
      assertLog(['Async action ended', 'C']);
      expect(root).toMatchRenderedOutput(<span>C</span>);
    },
  );

  it(
    'updates in an async action are entangled even if useTransition hook ' +
      'is unmounted before it finishes (class component)',
    async () => {
      let startTransition;
      function Updater() {
        const [isPending, _start] = useTransition();
        startTransition = _start;
        return (
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
        );
      }

      let setText;
      class Sibling extends React.Component {
        state = {text: 'A'};
        render() {
          setText = text => this.setState({text});
          return (
            <span>
              <Text text={this.state.text} />
            </span>
          );
        }
      }

      function App({showUpdater}) {
        return (
          <>
            {showUpdater ? <Updater /> : null}
            <Sibling />
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App showUpdater={true} />);
      });
      assertLog(['Pending: false', 'A']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: false</span>
          <span>A</span>
        </>,
      );

      // Start an async action that has multiple updates with async
      // operations in between.
      await act(() => {
        startTransition(async () => {
          Scheduler.log('Async action started');
          startTransition(() => setText('B'));

          await getText('Wait before updating to C');

          Scheduler.log('Async action ended');
          startTransition(() => setText('C'));
        });
      });
      assertLog(['Async action started', 'Pending: true']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: true</span>
          <span>A</span>
        </>,
      );

      // Delete the component that contains the useTransition hook. This
      // component no longer blocks the transition from completing. But the
      // pending update to Sibling should not be allowed to finish, because it's
      // part of the async action.
      await act(() => {
        root.render(<App showUpdater={false} />);
      });
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<span>A</span>);

      // Finish the async action. Notice the intermediate B state was never
      // shown, because it was batched with the update that came later in the
      // same action.
      await act(() => resolveText('Wait before updating to C'));
      assertLog(['Async action ended', 'C']);
      expect(root).toMatchRenderedOutput(<span>C</span>);

      // Check that subsequent updates are unaffected.
      await act(() => setText('D'));
      assertLog(['D']);
      expect(root).toMatchRenderedOutput(<span>D</span>);
    },
  );

  it(
    'updates in an async action are entangled even if useTransition hook ' +
      'is unmounted before it finishes (root update)',
    async () => {
      let startTransition;
      function Updater() {
        const [isPending, _start] = useTransition();
        startTransition = _start;
        return (
          <span>
            <Text text={'Pending: ' + isPending} />
          </span>
        );
      }

      let setShowUpdater;
      function App({text}) {
        const [showUpdater, _setShowUpdater] = useState(true);
        setShowUpdater = _setShowUpdater;
        return (
          <>
            {showUpdater ? <Updater /> : null}
            <span>
              <Text text={text} />
            </span>
          </>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App text="A" />);
      });
      assertLog(['Pending: false', 'A']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: false</span>
          <span>A</span>
        </>,
      );

      // Start an async action that has multiple updates with async
      // operations in between.
      await act(() => {
        startTransition(async () => {
          Scheduler.log('Async action started');
          startTransition(() => root.render(<App text="B" />));

          await getText('Wait before updating to C');

          Scheduler.log('Async action ended');
          startTransition(() => root.render(<App text="C" />));
        });
      });
      assertLog(['Async action started', 'Pending: true']);
      expect(root).toMatchRenderedOutput(
        <>
          <span>Pending: true</span>
          <span>A</span>
        </>,
      );

      // Delete the component that contains the useTransition hook. This
      // component no longer blocks the transition from completing. But the
      // pending update to Sibling should not be allowed to finish, because it's
      // part of the async action.
      await act(() => setShowUpdater(false));
      assertLog(['A']);
      expect(root).toMatchRenderedOutput(<span>A</span>);

      // Finish the async action. Notice the intermediate B state was never
      // shown, because it was batched with the update that came later in the
      // same action.
      await act(() => resolveText('Wait before updating to C'));
      assertLog(['Async action ended', 'C']);
      expect(root).toMatchRenderedOutput(<span>C</span>);

      // Check that subsequent updates are unaffected.
      await act(() => root.render(<App text="D" />));
      assertLog(['D']);
      expect(root).toMatchRenderedOutput(<span>D</span>);
    },
  );

  it('React.startTransition supports async actions', async () => {
    const startTransition = React.startTransition;

    function App({text}) {
      return <Text text={text} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App text="A" />);
    });
    assertLog(['A']);

    await act(() => {
      startTransition(async () => {
        // Update to B
        root.render(<App text="B" />);

        // There's an async gap before C is updated
        await getText('Wait before updating to C');
        root.render(<App text="C" />);

        Scheduler.log('Async action ended');
      });
    });
    // The update to B is blocked because the async action hasn't completed yet.
    assertLog([]);
    expect(root).toMatchRenderedOutput('A');

    // Finish the async action
    await act(() => resolveText('Wait before updating to C'));

    // Now both B and C can finish in a single batch.
    assertLog(['Async action ended', 'C']);
    expect(root).toMatchRenderedOutput('C');
  });

  it('useOptimistic works with async actions passed to React.startTransition', async () => {
    const startTransition = React.startTransition;

    let setOptimisticText;
    function App({text: canonicalText}) {
      const [text, _setOptimisticText] = useOptimistic(
        canonicalText,
        (_, optimisticText) => `${optimisticText} (loading...)`,
      );
      setOptimisticText = _setOptimisticText;
      return (
        <span>
          <Text text={text} />
        </span>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App text="Initial" />);
    });
    assertLog(['Initial']);
    expect(root).toMatchRenderedOutput(<span>Initial</span>);

    // Start an async action using the non-hook form of startTransition. The
    // action includes an optimistic update.
    await act(() => {
      startTransition(async () => {
        Scheduler.log('Async action started');
        setOptimisticText('Updated');
        await getText('Yield before updating');
        Scheduler.log('Async action ended');
        startTransition(() => root.render(<App text="Updated" />));
      });
    });
    // Because the action hasn't finished yet, the optimistic UI is shown.
    assertLog(['Async action started', 'Updated (loading...)']);
    expect(root).toMatchRenderedOutput(<span>Updated (loading...)</span>);

    // Finish the async action. The optimistic state is reverted and replaced by
    // the canonical state.
    await act(() => resolveText('Yield before updating'));
    assertLog(['Async action ended', 'Updated']);
    expect(root).toMatchRenderedOutput(<span>Updated</span>);
  });

  it(
    'regression: updates in an action passed to React.startTransition are batched ' +
      'even if there were no updates before the first await',
    async () => {
      // Regression for a bug that occurred in an older, too-clever-by-half
      // implementation of the isomorphic startTransition API. Now, the
      // isomorphic startTransition is literally the composition of every
      // reconciler instance's startTransition, so the behavior is less likely
      // to regress in the future.
      const startTransition = React.startTransition;

      let setOptimisticText;
      function App({text: canonicalText}) {
        const [text, _setOptimisticText] = useOptimistic(
          canonicalText,
          (_, optimisticText) => `${optimisticText} (loading...)`,
        );
        setOptimisticText = _setOptimisticText;
        return (
          <span>
            <Text text={text} />
          </span>
        );
      }

      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(<App text="Initial" />);
      });
      assertLog(['Initial']);
      expect(root).toMatchRenderedOutput(<span>Initial</span>);

      // Start an async action using the non-hook form of startTransition. The
      // action includes an optimistic update.
      await act(() => {
        startTransition(async () => {
          Scheduler.log('Async action started');

          // Yield to an async task *before* any updates have occurred.
          await getText('Yield before optimistic update');

          // This optimistic update happens after an async gap. In the
          // regression case, this update was not correctly associated with
          // the outer async action, causing the optimistic update to be
          // immediately reverted.
          setOptimisticText('Updated');

          await getText('Yield before updating');
          Scheduler.log('Async action ended');
          startTransition(() => root.render(<App text="Updated" />));
        });
      });
      assertLog(['Async action started']);

      // Wait for an async gap, then schedule an optimistic update.
      await act(() => resolveText('Yield before optimistic update'));

      // Because the action hasn't finished yet, the optimistic UI is shown.
      assertLog(['Updated (loading...)']);
      expect(root).toMatchRenderedOutput(<span>Updated (loading...)</span>);

      // Finish the async action. The optimistic state is reverted and replaced
      // by the canonical state.
      await act(() => resolveText('Yield before updating'));
      assertLog(['Async action ended', 'Updated']);
      expect(root).toMatchRenderedOutput(<span>Updated</span>);
    },
  );

  it('React.startTransition captures async errors and passes them to reportError', async () => {
    await act(() => {
      React.startTransition(async () => {
        throw new Error('Oops');
      });
    });
    assertLog(['reportError: Oops']);
  });

  it('React.startTransition captures sync errors and passes them to reportError', async () => {
    await act(() => {
      try {
        React.startTransition(() => {
          throw new Error('Oops');
        });
      } catch (e) {
        throw new Error('Should not be reachable.');
      }
    });
    assertLog(['reportError: Oops']);
  });

  // @gate enableOptimisticKey
  it('reconciles against new items when optimisticKey is used', async () => {
    const startTransition = React.startTransition;

    function Item({text}) {
      const [initialText] = React.useState(text);
      return <span>{initialText + '-' + text}</span>;
    }

    let addOptimisticItem;
    function App({items}) {
      const [optimisticItems, _addOptimisticItem] = useOptimistic(
        items,
        (canonicalItems, optimisticText) =>
          canonicalItems.concat({
            id: React.optimisticKey,
            text: optimisticText,
          }),
      );
      addOptimisticItem = _addOptimisticItem;
      return (
        <div>
          {optimisticItems.map(item => (
            <Item key={item.id} text={item.text} />
          ))}
        </div>
      );
    }

    const A = {
      id: 'a',
      text: 'A',
    };

    const B = {
      id: 'b',
      text: 'B',
    };

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App items={[A]} />);
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <span>A-A</span>
      </div>,
    );

    // Start an async action using the non-hook form of startTransition. The
    // action includes an optimistic update.
    await act(() => {
      startTransition(async () => {
        addOptimisticItem('b');
        await getText('Yield before updating');
        startTransition(() => root.render(<App items={[A, B]} />));
      });
    });
    // Because the action hasn't finished yet, the optimistic UI is shown.
    expect(root).toMatchRenderedOutput(
      <div>
        <span>A-A</span>
        <span>b-b</span>
      </div>,
    );

    // Finish the async action. The optimistic state is reverted and replaced by
    // the canonical state. The state is transferred to the new row.
    await act(() => {
      resolveText('Yield before updating');
    });
    expect(root).toMatchRenderedOutput(
      <div>
        <span>A-A</span>
        <span>b-B</span>
      </div>,
    );
  });
});
