let React;
let ReactNoop;
let Scheduler;
let startTransition;
let useState;
let useEffect;
let act;
let assertLog;
let waitFor;
let waitForPaint;

describe('ReactInterleavedUpdates', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    startTransition = React.startTransition;
    useState = React.useState;
    useEffect = React.useEffect;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;
    waitForPaint = InternalTestUtils.waitForPaint;
  });

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  it('update during an interleaved event is not processed during the current render', async () => {
    const updaters = [];

    function Child() {
      const [state, setState] = useState(0);
      useEffect(() => {
        updaters.push(setState);
      }, []);
      return <Text text={state} />;
    }

    function updateChildren(value) {
      for (let i = 0; i < updaters.length; i++) {
        const setState = updaters[i];
        setState(value);
      }
    }

    const root = ReactNoop.createRoot();

    await act(() => {
      root.render(
        <>
          <Child />
          <Child />
          <Child />
        </>,
      );
    });
    assertLog([0, 0, 0]);
    expect(root).toMatchRenderedOutput('000');

    await act(async () => {
      React.startTransition(() => {
        updateChildren(1);
      });
      // Partially render the children. Only the first one.
      await waitFor([1]);

      // In an interleaved event, schedule an update on each of the children.
      // Including the two that haven't rendered yet.
      React.startTransition(() => {
        updateChildren(2);
      });

      // We should continue rendering without including the interleaved updates.
      await waitForPaint([1, 1]);
      expect(root).toMatchRenderedOutput('111');
    });
    // The interleaved updates flush in a separate render.
    assertLog([2, 2, 2]);
    expect(root).toMatchRenderedOutput('222');
  });

  it('regression for #24350: does not add to main update queue until interleaved update queue has been cleared', async () => {
    let setStep;
    function App() {
      const [step, _setState] = useState(0);
      setStep = _setState;
      return (
        <>
          <Text text={'A' + step} />
          <Text text={'B' + step} />
          <Text text={'C' + step} />
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App />);
    });
    assertLog(['A0', 'B0', 'C0']);
    expect(root).toMatchRenderedOutput('A0B0C0');

    await act(async () => {
      // Start the render phase.
      startTransition(() => {
        setStep(1);
      });
      await waitFor(['A1', 'B1']);

      // Schedule an interleaved update. This gets placed on a special queue.
      startTransition(() => {
        setStep(2);
      });

      // Finish rendering the first update.
      await waitForPaint(['C1']);

      // Schedule another update. (In the regression case, this was treated
      // as a normal, non-interleaved update and it was inserted into the queue
      // before the interleaved one was processed.)
      startTransition(() => {
        setStep(3);
      });
    });
    // The last update should win.
    assertLog(['A3', 'B3', 'C3']);
    expect(root).toMatchRenderedOutput('A3B3C3');
  });
});
