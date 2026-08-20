/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

// sanity tests to make sure act() works without a mocked scheduler

let React;
let ReactDOMClient;
let act;
let container;
let yields;
let prevActGlobal;

function clearLog() {
  try {
    return yields;
  } finally {
    yields = [];
  }
}

beforeEach(() => {
  prevActGlobal = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetModules();
  jest.unmock('scheduler');
  yields = [];
  React = require('react');
  ReactDOMClient = require('react-dom/client');
  act = React.act;
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = prevActGlobal;
  document.body.removeChild(container);
});

// @gate __DEV__
test('can use act to flush effects', async () => {
  function App() {
    React.useEffect(() => {
      yields.push(100);
    });
    return null;
  }

  const root = ReactDOMClient.createRoot(container);
  await act(() => {
    root.render(<App />);
  });

  expect(clearLog()).toEqual([100]);
});

// @gate __DEV__
test('flushes effects on every call', async () => {
  function App() {
    const [ctr, setCtr] = React.useState(0);
    React.useEffect(() => {
      yields.push(ctr);
    });
    return (
      <button id="button" onClick={() => setCtr(x => x + 1)}>
        {ctr}
      </button>
    );
  }

  const root = ReactDOMClient.createRoot(container);
  await act(() => {
    root.render(<App />);
  });

  expect(clearLog()).toEqual([0]);

  const button = container.querySelector('#button');
  function click() {
    button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  }

  act(() => {
    click();
    click();
    click();
  });
  // it consolidates the 3 updates, then fires the effect
  expect(clearLog()).toEqual([3]);
  act(click);
  expect(clearLog()).toEqual([4]);
  act(click);
  expect(clearLog()).toEqual([5]);
  expect(button.innerHTML).toEqual('5');
});

// @gate __DEV__
test("should keep flushing effects until they're done", async () => {
  function App() {
    const [ctr, setCtr] = React.useState(0);
    React.useEffect(() => {
      if (ctr < 5) {
        setCtr(x => x + 1);
      }
    });
    return ctr;
  }

  const root = ReactDOMClient.createRoot(container);
  await act(() => {
    root.render(<App />);
  });

  expect(container.innerHTML).toEqual('5');
});

// @gate __DEV__
test('should flush effects only on exiting the outermost act', async () => {
  function App() {
    React.useEffect(() => {
      yields.push(0);
    });
    return null;
  }
  const root = ReactDOMClient.createRoot(container);
  // let's nest a couple of act() calls
  await act(async () => {
    await act(() => {
      root.render(<App />);
    });
    // the effect wouldn't have yielded yet because
    // we're still inside an act() scope
    expect(clearLog()).toEqual([]);
  });
  // but after exiting the last one, effects get flushed
  expect(clearLog()).toEqual([0]);
});

// @gate __DEV__
test('can handle cascading promises', async () => {
  // this component triggers an effect, that waits a tick,
  // then sets state. repeats this 5 times.
  function App() {
    const [state, setState] = React.useState(0);
    async function ticker() {
      await null;
      await act(() => {
        setState(x => x + 1);
      });
    }
    React.useEffect(() => {
      yields.push(state);
      ticker();
    }, [Math.min(state, 4)]);
    return state;
  }

  const root = ReactDOMClient.createRoot(container);
  await act(() => {
    root.render(<App />);
  });
  // all 5 ticks present and accounted for
  expect(clearLog()).toEqual([0, 1, 2, 3, 4]);
  expect(container.innerHTML).toBe('5');
});
