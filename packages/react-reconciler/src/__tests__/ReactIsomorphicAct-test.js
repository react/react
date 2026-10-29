/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

// sanity tests for act()

let React;
let ReactNoop;
let act;
let use;
let Suspense;
let DiscreteEventPriority;
let startTransition;
let waitForMicrotasks;

describe('isomorphic act()', () => {
  beforeEach(() => {
    React = require('react');

    ReactNoop = require('react-noop-renderer');
    DiscreteEventPriority =
      require('react-reconciler/constants').DiscreteEventPriority;
    act = React.act;
    use = React.use;
    Suspense = React.Suspense;
    startTransition = React.startTransition;

    waitForMicrotasks = require('internal-test-utils').waitForMicrotasks;
  });

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('behavior in production', () => {
    if (!__DEV__) {
      if (gate('fb')) {
        expect(() => act(() => {})).toThrow(
          'act(...) is not supported in production builds of React',
        );
      } else {
        expect(React).not.toHaveProperty('act');
      }
    }
  });

  // @gate __DEV__
  it('bypasses queueMicrotask', async () => {
    const root = ReactNoop.createRoot();

    // First test what happens without wrapping in act. This update would
    // normally be queued in a microtask.
    global.IS_REACT_ACT_ENVIRONMENT = false;
    ReactNoop.unstable_runWithPriority(DiscreteEventPriority, () => {
      root.render('A');
    });
    // Nothing has rendered yet
    expect(root).toMatchRenderedOutput(null);
    // Flush the microtasks by awaiting
    await waitForMicrotasks();
    expect(root).toMatchRenderedOutput('A');

    // Now do the same thing but wrap the update with `act`. No
    // `await` necessary.
    global.IS_REACT_ACT_ENVIRONMENT = true;
    act(() => {
      ReactNoop.unstable_runWithPriority(DiscreteEventPriority, () => {
        root.render('B');
      });
    });
    expect(root).toMatchRenderedOutput('B');
  });

  // @gate __DEV__
  it('return value – sync callback', async () => {
    expect(await act(() => 'hi')).toEqual('hi');
  });

  // @gate __DEV__
  it('return value – sync callback, nested', async () => {
    const returnValue = await act(() => {
      return act(() => 'hi');
    });
    expect(returnValue).toEqual('hi');
  });

  // @gate __DEV__
  it('return value – async callback', async () => {
    const returnValue = await act(async () => {
      return await Promise.resolve('hi');
    });
    expect(returnValue).toEqual('hi');
  });

  // @gate __DEV__
  it('return value – async callback, nested', async () => {
    const returnValue = await act(async () => {
      return await act(async () => {
        return await Promise.resolve('hi');
      });
    });
    expect(returnValue).toEqual('hi');
  });

  // @gate __DEV__
  it('unwraps promises by yielding to microtasks (async act scope)', async () => {
    const promise = Promise.resolve('Async');

    function Fallback() {
      throw new Error('Fallback should never be rendered');
    }

    function App() {
      return use(promise);
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate __DEV__
  it('unwraps promises by yielding to microtasks (non-async act scope)', async () => {
    const promise = Promise.resolve('Async');

    function Fallback() {
      throw new Error('Fallback should never be rendered');
    }

    function App() {
      return use(promise);
    }

    const root = ReactNoop.createRoot();

    // Note that the scope function is not an async function
    await act(() => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate __DEV__
  it('warns if a promise is used in a non-awaited `act` scope', async () => {
    const promise = new Promise(() => {});

    function Fallback() {
      throw new Error('Fallback should never be rendered');
    }

    function App() {
      return use(promise);
    }

    spyOnDev(console, 'error').mockImplementation(() => {});
    const root = ReactNoop.createRoot();
    act(() => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });

    // `act` warns after a few microtasks, instead of a macrotask, so that it's
    // more likely to be attributed to the correct test case.
    //
    // The exact number of microtasks is an implementation detail; just needs
    // to happen when the microtask queue is flushed.
    await waitForMicrotasks();

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toContain(
      'A component suspended inside an `act` scope, but the `act` ' +
        'call was not awaited. When testing React components that ' +
        'depend on asynchronous data, you must await the result:\n\n' +
        'await act(() => ...)',
    );
  });

  // @gate __DEV__
  it('does not warn when suspending via legacy `throw` API  in non-awaited `act` scope', async () => {
    let didResolve = false;
    let resolvePromise;
    const promise = new Promise(r => {
      resolvePromise = () => {
        didResolve = true;
        r();
      };
    });

    function Fallback() {
      return 'Loading...';
    }

    function App() {
      if (!didResolve) {
        throw promise;
      }
      return 'Async';
    }

    spyOnDev(console, 'error').mockImplementation(() => {});
    const root = ReactNoop.createRoot();
    act(() => {
      startTransition(() => {
        root.render(
          <Suspense fallback={<Fallback />}>
            <App />
          </Suspense>,
        );
      });
    });
    expect(root).toMatchRenderedOutput('Loading...');

    // `act` warns after a few microtasks, instead of a macrotask, so that it's
    // more likely to be attributed to the correct test case.
    //
    // The exact number of microtasks is an implementation detail; just needs
    // to happen when the microtask queue is flushed.
    await waitForMicrotasks();

    expect(console.error).toHaveBeenCalledTimes(0);

    // Finish loading the data
    await act(async () => {
      resolvePromise();
    });
    expect(root).toMatchRenderedOutput('Async');
  });

  // @gate __DEV__
  it('restores act queue when callback throws synchronously', async () => {
    let setCounter;
    function Counter() {
      const [count, setCount] = React.useState(0);
      setCounter = setCount;
      return count;
    }
    const root = ReactNoop.createRoot();
    act(() => {
      root.render(<Counter />);
    });
    expect(root).toMatchRenderedOutput('0');

    expect(() => {
      act(() => {
        throw new Error('boom');
      });
    }).toThrow('boom');

    global.IS_REACT_ACT_ENVIRONMENT = false;
    ReactNoop.unstable_runWithPriority(DiscreteEventPriority, () => {
      setCounter(1);
    });
    await waitForMicrotasks();
    expect(root).toMatchRenderedOutput('1');
  });

  // @gate __DEV__
  it('restores act queue when callback rejects asynchronously', async () => {
    let setCounter;
    function Counter() {
      const [count, setCount] = React.useState(0);
      setCounter = setCount;
      return count;
    }
    const root = ReactNoop.createRoot();
    act(() => {
      root.render(<Counter />);
    });
    expect(root).toMatchRenderedOutput('0');

    let didCatch = false;
    try {
      await act(async () => {
        throw new Error('boom async');
      });
    } catch (error) {
      didCatch = true;
      expect(error.message).toBe('boom async');
    }
    expect(didCatch).toBe(true);

    global.IS_REACT_ACT_ENVIRONMENT = false;
    ReactNoop.unstable_runWithPriority(DiscreteEventPriority, () => {
      setCounter(1);
    });
    await waitForMicrotasks();
    expect(root).toMatchRenderedOutput('1');
  });
});
