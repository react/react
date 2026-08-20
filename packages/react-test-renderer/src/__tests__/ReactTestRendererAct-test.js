jest.useRealTimers();

let React;
let ReactTestRenderer;
let Scheduler;
let act;
let assertLog;

describe('ReactTestRenderer.act()', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactTestRenderer = require('react-test-renderer');
    Scheduler = require('scheduler');
    act = ReactTestRenderer.act;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  // @gate __DEV__
  it('can use .act() to flush effects', () => {
    function App(props) {
      const [ctr, setCtr] = React.useState(0);
      React.useEffect(() => {
        props.callback();
        setCtr(1);
      }, []);
      return ctr;
    }
    const calledLog = [];
    let root;
    act(() => {
      root = ReactTestRenderer.create(
        <App
          callback={() => {
            calledLog.push(calledLog.length);
          }}
        />,
      );
    });

    expect(calledLog).toEqual([0]);
    expect(root.toJSON()).toEqual('1');
  });

  describe('async', () => {
    // @gate __DEV__
    it('should work with async/await', async () => {
      function fetch(url) {
        return Promise.resolve({
          details: [1, 2, 3],
        });
      }
      function App() {
        const [details, setDetails] = React.useState(0);

        React.useEffect(() => {
          async function fetchDetails() {
            const response = await fetch();
            setDetails(response.details);
          }
          fetchDetails();
        }, []);
        return details;
      }
      let root;

      await ReactTestRenderer.act(async () => {
        root = ReactTestRenderer.create(<App />);
      });

      expect(root.toJSON()).toEqual(['1', '2', '3']);
    });

    // @gate __DEV__
    it('should not flush effects without also flushing microtasks', async () => {
      const {useEffect, useReducer} = React;

      const alreadyResolvedPromise = Promise.resolve();

      function App() {
        // This component will keep updating itself until step === 3
        const [step, proceed] = useReducer(s => (s === 3 ? 3 : s + 1), 1);
        useEffect(() => {
          Scheduler.log('Effect');
          alreadyResolvedPromise.then(() => {
            Scheduler.log('Microtask');
            proceed();
          });
        });
        return step;
      }
      let root;
      await act(() => {
        root = ReactTestRenderer.create(null);
      });
      await act(async () => {
        root.update(<App />);
      });
      assertLog([
        // Should not flush effects without also flushing microtasks
        // First render:
        'Effect',
        'Microtask',
        // Second render:
        'Effect',
        'Microtask',
        // Final render:
        'Effect',
        'Microtask',
      ]);
      expect(root).toMatchRenderedOutput('3');
    });
  });
});
