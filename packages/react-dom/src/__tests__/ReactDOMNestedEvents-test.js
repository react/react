/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMNestedEvents', () => {
  let React;
  let ReactDOMClient;
  let Scheduler;
  let act;
  let useState;
  let assertLog;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    useState = React.useState;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
  });

  it('nested event dispatches should not cause updates to flush', async () => {
    const buttonRef = React.createRef(null);
    function App() {
      const [isClicked, setIsClicked] = useState(false);
      const [isFocused, setIsFocused] = useState(false);
      const onClick = () => {
        setIsClicked(true);
        const el = buttonRef.current;
        el.focus();
        // The update triggered by the focus event should not have flushed yet.
        // Nor the click update. They would have if we had wrapped the focus
        // call in `flushSync`, though.
        Scheduler.log('Value right after focus call: ' + el.innerHTML);
      };
      const onFocus = () => {
        setIsFocused(true);
      };
      return (
        <>
          <button ref={buttonRef} onFocus={onFocus} onClick={onClick}>
            {`Clicked: ${isClicked}, Focused: ${isFocused}`}
          </button>
        </>
      );
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<App />);
    });
    expect(buttonRef.current.innerHTML).toEqual(
      'Clicked: false, Focused: false',
    );

    await act(() => {
      buttonRef.current.click();
    });
    assertLog(['Value right after focus call: Clicked: false, Focused: false']);
    expect(buttonRef.current.innerHTML).toEqual('Clicked: true, Focused: true');
  });
});
