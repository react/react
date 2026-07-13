/* eslint-disable react/jsx-boolean-value */

let React;
let ReactNoop;
let Scheduler;
let act;
let Suspense;
let useState;
let textCache;

let readText;
let resolveText;
// let rejectText;

let assertLog;
let waitForPaint;

describe('ReactSuspenseWithNoopRenderer', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    Suspense = React.Suspense;
    useState = React.useState;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    waitForPaint = InternalTestUtils.waitForPaint;

    textCache = new Map();

    readText = text => {
      const record = textCache.get(text);
      if (record !== undefined) {
        switch (record.status) {
          case 'pending':
            throw record.promise;
          case 'rejected':
            throw Error('Failed to load: ' + text);
          case 'resolved':
            return text;
        }
      } else {
        let ping;
        const promise = new Promise(resolve => (ping = resolve));
        const newRecord = {
          status: 'pending',
          ping: ping,
          promise,
        };
        textCache.set(text, newRecord);
        throw promise;
      }
    };

    resolveText = text => {
      const record = textCache.get(text);
      if (record !== undefined) {
        if (record.status === 'pending') {
          record.ping();
          record.ping = null;
          record.status = 'resolved';
          record.promise = null;
        }
      } else {
        const newRecord = {
          ping: null,
          status: 'resolved',
          promise: null,
        };
        textCache.set(text, newRecord);
      }
    };

    // rejectText = text => {
    //   const record = textCache.get(text);
    //   if (record !== undefined) {
    //     if (record.status === 'pending') {
    //       Scheduler.log(`Promise rejected [${text}]`);
    //       record.ping();
    //       record.status = 'rejected';
    //       clearTimeout(record.promise._timer);
    //       record.promise = null;
    //     }
    //   } else {
    //     const newRecord = {
    //       ping: null,
    //       status: 'rejected',
    //       promise: null,
    //     };
    //     textCache.set(text, newRecord);
    //   }
    // };
  });

  function Text(props) {
    Scheduler.log(props.text);
    return props.text;
  }

  function AsyncText(props) {
    const text = props.text;
    try {
      readText(text);
      Scheduler.log(text);
      return text;
    } catch (promise) {
      if (typeof promise.then === 'function') {
        Scheduler.log(`Suspend! [${text}]`);
      } else {
        Scheduler.log(`Error! [${text}]`);
      }
      throw promise;
    }
  }

  // @gate enableCPUSuspense
  it('skips CPU-bound trees on initial mount', async () => {
    function App() {
      return (
        <>
          <Text text="Outer" />
          <div>
            <Suspense defer fallback={<Text text="Loading..." />}>
              <Text text="Inner" />
            </Suspense>
          </div>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<App />);
      await waitForPaint(['Outer', 'Loading...']);
      expect(root).toMatchRenderedOutput(
        <>
          Outer
          <div>Loading...</div>
        </>,
      );
    });
    // Inner contents finish in separate commit from outer
    assertLog(['Inner']);
    expect(root).toMatchRenderedOutput(
      <>
        Outer
        <div>Inner</div>
      </>,
    );
  });

  // @gate enableCPUSuspense
  it('does not skip CPU-bound trees during updates', async () => {
    let setCount;

    function App() {
      const [count, _setCount] = useState(0);
      setCount = _setCount;
      return (
        <>
          <Text text="Outer" />
          <div>
            <Suspense defer fallback={<Text text="Loading..." />}>
              <Text text={`Inner [${count}]`} />
            </Suspense>
          </div>
        </>
      );
    }

    // Initial mount
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    // Inner contents finish in separate commit from outer
    assertLog(['Outer', 'Loading...', 'Inner [0]']);
    expect(root).toMatchRenderedOutput(
      <>
        Outer
        <div>Inner [0]</div>
      </>,
    );

    // Update
    await act(() => {
      setCount(1);
    });
    // Entire update finishes in a single commit
    assertLog(['Outer', 'Inner [1]']);
    expect(root).toMatchRenderedOutput(
      <>
        Outer
        <div>Inner [1]</div>
      </>,
    );
  });

  // @gate enableCPUSuspense
  it('suspend inside CPU-bound tree', async () => {
    function App() {
      return (
        <>
          <Text text="Outer" />
          <div>
            <Suspense defer fallback={<Text text="Loading..." />}>
              <AsyncText text="Inner" />
            </Suspense>
          </div>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<App />);
      await waitForPaint(['Outer', 'Loading...']);
      expect(root).toMatchRenderedOutput(
        <>
          Outer
          <div>Loading...</div>
        </>,
      );
    });
    // Inner contents suspended, so we continue showing a fallback.
    assertLog([
      'Suspend! [Inner]',
      // pre-warming
      'Suspend! [Inner]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        Outer
        <div>Loading...</div>
      </>,
    );

    // Resolve the data and finish rendering
    await act(async () => {
      await resolveText('Inner');
    });
    assertLog(['Inner']);
    expect(root).toMatchRenderedOutput(
      <>
        Outer
        <div>Inner</div>
      </>,
    );
  });

  // @gate enableCPUSuspense
  it('nested CPU-bound trees', async () => {
    function App() {
      return (
        <>
          <Text text="A" />
          <div>
            <Suspense defer fallback={<Text text="Loading B..." />}>
              <Text text="B" />
              <div>
                <Suspense defer fallback={<Text text="Loading C..." />}>
                  <Text text="C" />
                </Suspense>
              </div>
            </Suspense>
          </div>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    // Each level commits separately
    assertLog(['A', 'Loading B...', 'B', 'Loading C...', 'C']);
    expect(root).toMatchRenderedOutput(
      <>
        A
        <div>
          B<div>C</div>
        </div>
      </>,
    );
  });
});
