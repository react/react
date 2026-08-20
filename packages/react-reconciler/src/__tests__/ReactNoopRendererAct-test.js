/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment node
 */

// sanity tests for act()

const React = require('react');
const ReactNoop = require('react-noop-renderer');
const Scheduler = require('scheduler');
const act = require('internal-test-utils').act;
const {assertLog, waitForAll} = require('internal-test-utils');

// TODO: These tests are no longer specific to the noop renderer
// implementation. They test the internal implementation we use in the React
// test suite.
describe('internal act()', () => {
  it('can use act to flush effects', async () => {
    function App(props) {
      React.useEffect(props.callback);
      return null;
    }

    const calledLog = [];
    await act(() => {
      ReactNoop.render(
        <App
          callback={() => {
            calledLog.push(calledLog.length);
          }}
        />,
      );
    });
    await waitForAll([]);
    expect(calledLog).toEqual([0]);
  });

  it('should work with async/await', async () => {
    function App() {
      const [ctr, setCtr] = React.useState(0);
      async function someAsyncFunction() {
        Scheduler.log('stage 1');
        await null;
        Scheduler.log('stage 2');
        await null;
        setCtr(1);
      }
      React.useEffect(() => {
        someAsyncFunction();
      }, []);
      return ctr;
    }
    await act(() => {
      ReactNoop.render(<App />);
    });
    assertLog(['stage 1', 'stage 2']);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('1');
  });
});
