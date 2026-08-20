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
let assertConsoleErrorDev;
let assertLog;
let useMemo;
let useState;
let useMemoCache;
let MemoCacheSentinel;
let ErrorBoundary;

describe('useMemoCache()', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    const InternalTestUtils = require('internal-test-utils');
    act = InternalTestUtils.act;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
    assertLog = InternalTestUtils.assertLog;
    useMemo = React.useMemo;
    useMemoCache = require('react/compiler-runtime').c;
    useState = React.useState;
    MemoCacheSentinel = Symbol.for('react.memo_cache_sentinel');

    class _ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = {hasError: false};
      }

      static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return {hasError: true};
      }

      componentDidCatch(error, errorInfo) {}

      render() {
        if (this.state.hasError) {
          // You can render any custom fallback UI
          return <h1>Something went wrong.</h1>;
        }

        return this.props.children;
      }
    }
    ErrorBoundary = _ErrorBoundary;
  });

  it('render component using cache', async () => {
    function Component(props) {
      const cache = useMemoCache(1);
      expect(Array.isArray(cache)).toBe(true);
      expect(cache.length).toBe(1);
      expect(cache[0]).toBe(MemoCacheSentinel);

      return 'Ok';
    }
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Component />);
    });
    expect(root).toMatchRenderedOutput('Ok');
  });

  it('update component using cache', async () => {
    let setX;
    let forceUpdate;
    function Component(props) {
      const cache = useMemoCache(5);

      // x is used to produce a `data` object passed to the child
      const [x, _setX] = useState(0);
      setX = _setX;

      // n is passed as-is to the child as a cache breaker
      const [n, setN] = useState(0);
      forceUpdate = () => setN(a => a + 1);

      const c_0 = x !== cache[0];
      let data;
      if (c_0) {
        data = {text: `Count ${x}`};
        cache[0] = x;
        cache[1] = data;
      } else {
        data = cache[1];
      }
      const c_2 = x !== cache[2];
      const c_3 = n !== cache[3];
      let t0;
      if (c_2 || c_3) {
        t0 = <Text data={data} n={n} />;
        cache[2] = x;
        cache[3] = n;
        cache[4] = t0;
      } else {
        t0 = cache[4];
      }
      return t0;
    }
    let data;
    const Text = jest.fn(function Text(props) {
      data = props.data;
      return data.text;
    });

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Component />);
    });
    expect(root).toMatchRenderedOutput('Count 0');
    expect(Text).toBeCalledTimes(1);
    const data0 = data;

    // Changing x should reset the data object
    await act(() => {
      setX(1);
    });
    expect(root).toMatchRenderedOutput('Count 1');
    expect(Text).toBeCalledTimes(2);
    expect(data).not.toBe(data0);
    const data1 = data;

    // Forcing an unrelated update shouldn't recreate the
    // data object.
    await act(() => {
      forceUpdate();
    });
    expect(root).toMatchRenderedOutput('Count 1');
    expect(Text).toBeCalledTimes(3);
    expect(data).toBe(data1); // confirm that the cache persisted across renders
  });

  it('update component using cache with setstate during render', async () => {
    let setN;
    function Component(props) {
      const cache = useMemoCache(5);

      // x is used to produce a `data` object passed to the child
      const [x] = useState(0);

      const c_0 = x !== cache[0];
      let data;
      if (c_0) {
        data = {text: `Count ${x}`};
        cache[0] = x;
        cache[1] = data;
      } else {
        data = cache[1];
      }

      // n is passed as-is to the child as a cache breaker
      const [n, _setN] = useState(0);
      setN = _setN;

      if (n === 1) {
        setN(2);
        return;
      }

      const c_2 = x !== cache[2];
      const c_3 = n !== cache[3];
      let t0;
      if (c_2 || c_3) {
        t0 = <Text data={data} n={n} />;
        cache[2] = x;
        cache[3] = n;
        cache[4] = t0;
      } else {
        t0 = cache[4];
      }
      return t0;
    }
    let data;
    const Text = jest.fn(function Text(props) {
      data = props.data;
      return `${data.text} (n=${props.n})`;
    });

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Component />);
    });
    expect(root).toMatchRenderedOutput('Count 0 (n=0)');
    expect(Text).toBeCalledTimes(1);
    const data0 = data;

    // Trigger an update that will cause a setState during render. The `data` prop
    // does not depend on `n`, and should remain cached.
    await act(() => {
      setN(1);
    });
    expect(root).toMatchRenderedOutput('Count 0 (n=2)');
    expect(Text).toBeCalledTimes(2);
    expect(data).toBe(data0);
  });

  it('update component using cache with throw during render', async () => {
    let setN;
    let shouldFail = true;
    function Component(props) {
      const cache = useMemoCache(5);

      // x is used to produce a `data` object passed to the child
      const [x] = useState(0);

      const c_0 = x !== cache[0];
      let data;
      if (c_0) {
        data = {text: `Count ${x}`};
        cache[0] = x;
        cache[1] = data;
      } else {
        data = cache[1];
      }

      // n is passed as-is to the child as a cache breaker
      const [n, _setN] = useState(0);
      setN = _setN;

      if (n === 1) {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('failed');
        }
      }

      const c_2 = x !== cache[2];
      const c_3 = n !== cache[3];
      let t0;
      if (c_2 || c_3) {
        t0 = <Text data={data} n={n} />;
        cache[2] = x;
        cache[3] = n;
        cache[4] = t0;
      } else {
        t0 = cache[4];
      }
      return t0;
    }
    let data;
    const Text = jest.fn(function Text(props) {
      data = props.data;
      return `${data.text} (n=${props.n})`;
    });

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <ErrorBoundary>
          <Component />
        </ErrorBoundary>,
      );
    });
    expect(root).toMatchRenderedOutput('Count 0 (n=0)');
    expect(Text).toBeCalledTimes(1);
    const data0 = data;

    await act(() => {
      // this triggers a throw.
      setN(1);
    });
    assertConsoleErrorDev([
      'Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.' +
        '\n    in <stack>',
    ]);
    expect(root).toMatchRenderedOutput('Count 0 (n=1)');
    expect(Text).toBeCalledTimes(2);
    expect(data).toBe(data0);
    const data1 = data;

    // Forcing an unrelated update shouldn't recreate the
    // data object.
    await act(() => {
      setN(2);
    });
    expect(root).toMatchRenderedOutput('Count 0 (n=2)');
    expect(Text).toBeCalledTimes(3);
    expect(data).toBe(data1); // confirm that the cache persisted across renders
  });

  it('update component and custom hook with caches', async () => {
    let setX;
    let forceUpdate;
    function Component(props) {
      const cache = useMemoCache(4);

      // x is used to produce a `data` object passed to the child
      const [x, _setX] = useState(0);
      setX = _setX;
      const c_x = x !== cache[0];
      cache[0] = x;

      // n is passed as-is to the child as a cache breaker
      const [n, setN] = useState(0);
      forceUpdate = () => setN(a => a + 1);
      const c_n = n !== cache[1];
      cache[1] = n;

      let _data;
      if (c_x) {
        _data = cache[2] = {text: `Count ${x}`};
      } else {
        _data = cache[2];
      }
      const data = useData(_data);
      if (c_x || c_n) {
        return (cache[3] = <Text data={data} n={n} />);
      } else {
        return cache[3];
      }
    }
    function useData(data) {
      const cache = useMemoCache(2);
      const c_data = data !== cache[0];
      cache[0] = data;
      let nextData;
      if (c_data) {
        nextData = cache[1] = {text: data.text.toLowerCase()};
      } else {
        nextData = cache[1];
      }
      return nextData;
    }
    let data;
    const Text = jest.fn(function Text(props) {
      data = props.data;
      return data.text;
    });

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Component />);
    });
    expect(root).toMatchRenderedOutput('count 0');
    expect(Text).toBeCalledTimes(1);
    const data0 = data;

    // Changing x should reset the data object
    await act(() => {
      setX(1);
    });
    expect(root).toMatchRenderedOutput('count 1');
    expect(Text).toBeCalledTimes(2);
    expect(data).not.toBe(data0);
    const data1 = data;

    // Forcing an unrelated update shouldn't recreate the
    // data object.
    await act(() => {
      forceUpdate();
    });
    expect(root).toMatchRenderedOutput('count 1');
    expect(Text).toBeCalledTimes(3);
    expect(data).toBe(data1); // confirm that the cache persisted across renders
  });

  it('reuses computations from suspended/interrupted render attempts during an update', async () => {
    // This test demonstrates the benefit of a shared memo cache. By "shared" I
    // mean multiple concurrent render attempts of the same component/hook use
    // the same cache. (When the feature flag is off, we don't do this — the
    // cache is copy-on-write.)
    //
    // If an update is interrupted, either because it suspended or because of
    // another update, we can reuse the memoized computations from the previous
    // attempt. We can do this because the React Compiler performs atomic writes
    // to the memo cache, i.e. it will not record the inputs to a memoization
    // without also recording its output.
    //
    // This gives us a form of "resuming" within components and hooks.
    //
    // This only works when updating a component that already mounted. It has no
    // impact during initial render, because the memo cache is stored on the
    // fiber, and since we have not implemented resuming for fibers, it's always
    // a fresh memo cache, anyway.
    //
    // However, this alone is pretty useful — it happens whenever you update the
    // UI with fresh data after a mutation/action, which is extremely common in
    // a Suspense-driven (e.g. RSC or Relay) app. That's the scenario that this
    // test simulates.
    //
    // So the impact of this feature is faster data mutations/actions.

    function someExpensiveProcessing(t) {
      Scheduler.log(`Some expensive processing... [${t}]`);
      return t;
    }

    function useWithLog(t, msg) {
      try {
        return React.use(t);
      } catch (x) {
        Scheduler.log(`Suspend! [${msg}]`);
        throw x;
      }
    }

    // Original code:
    //
    //   function Data({chunkA, chunkB}) {
    //     const a = someExpensiveProcessing(useWithLog(chunkA, 'chunkA'));
    //     const b = useWithLog(chunkB, 'chunkB');
    //     return (
    //       <>
    //         {a}
    //         {b}
    //       </>
    //     );
    //   }
    //
    //   function Input() {
    //     const [input, _setText] = useState('');
    //     return input;
    //   }
    //
    //   function App({chunkA, chunkB}) {
    //     return (
    //       <>
    //         <div>
    //           Input: <Input />
    //         </div>
    //         <div>
    //           Data: <Data chunkA={chunkA} chunkB={chunkB} />
    //         </div>
    //       </>
    //     );
    //   }
    function Data(t0) {
      const $ = useMemoCache(5);
      const {chunkA, chunkB} = t0;
      const t1 = useWithLog(chunkA, 'chunkA');
      let t2;

      if ($[0] !== t1) {
        t2 = someExpensiveProcessing(t1);
        $[0] = t1;
        $[1] = t2;
      } else {
        t2 = $[1];
      }

      const a = t2;
      const b = useWithLog(chunkB, 'chunkB');
      let t3;

      if ($[2] !== a || $[3] !== b) {
        t3 = (
          <>
            {a}
            {b}
          </>
        );
        $[2] = a;
        $[3] = b;
        $[4] = t3;
      } else {
        t3 = $[4];
      }

      return t3;
    }

    let setInput;
    function Input() {
      const [input, _set] = useState('');
      setInput = _set;
      return input;
    }

    function App(t0) {
      const $ = useMemoCache(4);
      const {chunkA, chunkB} = t0;
      let t1;

      if ($[0] === Symbol.for('react.memo_cache_sentinel')) {
        t1 = (
          <div>
            Input: <Input />
          </div>
        );
        $[0] = t1;
      } else {
        t1 = $[0];
      }

      let t2;

      if ($[1] !== chunkA || $[2] !== chunkB) {
        t2 = (
          <>
            {t1}
            <div>
              Data: <Data chunkA={chunkA} chunkB={chunkB} />
            </div>
          </>
        );
        $[1] = chunkA;
        $[2] = chunkB;
        $[3] = t2;
      } else {
        t2 = $[3];
      }

      return t2;
    }

    function createInstrumentedResolvedPromise(value) {
      return {
        then() {},
        status: 'fulfilled',
        value,
      };
    }

    function createDeferred() {
      let resolve;
      const p = new Promise(res => {
        resolve = res;
      });
      p.resolve = resolve;
      return p;
    }

    // Initial render. We pass the data in as two separate "chunks" to simulate
    // a stream (e.g. RSC).
    const root = ReactNoop.createRoot();
    const initialChunkA = createInstrumentedResolvedPromise('A1');
    const initialChunkB = createInstrumentedResolvedPromise('B1');
    await act(() =>
      root.render(<App chunkA={initialChunkA} chunkB={initialChunkB} />),
    );
    assertLog(['Some expensive processing... [A1]']);
    expect(root).toMatchRenderedOutput(
      <>
        <div>Input: </div>
        <div>Data: A1B1</div>
      </>,
    );

    // Update the UI in a transition. This would happen after a data mutation.
    const updatedChunkA = createDeferred();
    const updatedChunkB = createDeferred();
    await act(() => {
      React.startTransition(() => {
        root.render(<App chunkA={updatedChunkA} chunkB={updatedChunkB} />);
      });
    });
    assertLog(['Suspend! [chunkA]']);

    // The data starts to stream in. Loading the data in the first chunk
    // triggers an expensive computation in the UI. Later, we'll test whether
    // this computation is reused.
    await act(() => updatedChunkA.resolve('A2'));
    assertLog(['Some expensive processing... [A2]', 'Suspend! [chunkB]']);

    // The second chunk hasn't loaded yet, so we're still showing the
    // initial UI.
    expect(root).toMatchRenderedOutput(
      <>
        <div>Input: </div>
        <div>Data: A1B1</div>
      </>,
    );

    // While waiting for the data to finish loading, update a different part of
    // the screen. This interrupts the refresh transition.
    //
    // In a real app, this might be an input or hover event.
    await act(() => setInput('hi!'));

    // Once the input has updated, we go back to rendering the transition.
    if (gate(flags => flags.enableNoCloningMemoCache)) {
      // We did not have process the first chunk again. We reused the
      // computation from the earlier attempt.
      assertLog(['Suspend! [chunkB]']);
    } else {
      // Because we clone/reset the memo cache after every aborted attempt, we
      // must process the first chunk again.
      assertLog(['Some expensive processing... [A2]', 'Suspend! [chunkB]']);
    }

    expect(root).toMatchRenderedOutput(
      <>
        <div>Input: hi!</div>
        <div>Data: A1B1</div>
      </>,
    );

    // Finish loading the data.
    await act(() => updatedChunkB.resolve('B2'));
    if (gate(flags => flags.enableNoCloningMemoCache)) {
      // We did not have process the first chunk again. We reused the
      // computation from the earlier attempt.
      assertLog([]);
    } else {
      // Because we clone/reset the memo cache after every aborted attempt, we
      // must process the first chunk again.
      //
      // That's three total times we've processed the first chunk, compared to
      // just once when enableNoCloningMemoCache is on.
      assertLog(['Some expensive processing... [A2]']);
    }
    expect(root).toMatchRenderedOutput(
      <>
        <div>Input: hi!</div>
        <div>Data: A2B2</div>
      </>,
    );
  });

  it('(repro) infinite renders when used with setState during render', async () => {
    // Output of react compiler on `useUserMemo`
    function useCompilerMemo(value) {
      let arr;
      const $ = useMemoCache(2);
      if ($[0] !== value) {
        arr = [value];
        $[0] = value;
        $[1] = arr;
      } else {
        arr = $[1];
      }
      return arr;
    }

    // Baseline / source code
    function useManualMemo(value) {
      return useMemo(() => [value], [value]);
    }

    function makeComponent(hook) {
      return function Component({value}) {
        const state = hook(value);
        const [prevState, setPrevState] = useState(null);
        if (state !== prevState) {
          setPrevState(state);
        }
        return <div>{state.join(',')}</div>;
      };
    }

    /**
     * Test with useMemoCache
     */
    let root = ReactNoop.createRoot();
    const CompilerMemoComponent = makeComponent(useCompilerMemo);
    await act(() => {
      root.render(<CompilerMemoComponent value={2} />);
    });
    expect(root).toMatchRenderedOutput(<div>2</div>);

    /**
     * Test with useMemo
     */
    root = ReactNoop.createRoot();
    const HookMemoComponent = makeComponent(useManualMemo);
    await act(() => {
      root.render(<HookMemoComponent value={2} />);
    });
    expect(root).toMatchRenderedOutput(<div>2</div>);
  });
});
