/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOM autoFocus ref ordering', () => {
  let React;
  let ReactDOMClient;
  let act;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
  });

  // Regression test for https://github.com/facebook/react/issues/7769
  it('attaches the ref before autoFocus fires a focus event on mount', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    let refWasAttachedDuringFocus = null;

    function App() {
      const inputRef = React.useRef(null);
      return (
        <input
          autoFocus={true}
          ref={inputRef}
          onFocus={() => {
            refWasAttachedDuringFocus = inputRef.current !== null;
          }}
        />
      );
    }

    await act(() => {
      root.render(<App />);
    });

    expect(refWasAttachedDuringFocus).toBe(true);

    document.body.removeChild(container);
  });

  it('attaches a callback ref before autoFocus fires a focus event on mount', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    let refInstanceDuringFocus = null;
    let focusedInstance = null;

    function App() {
      return (
        <input
          autoFocus={true}
          ref={instance => {
            refInstanceDuringFocus = instance;
          }}
          onFocus={event => {
            focusedInstance = event.target;
          }}
        />
      );
    }

    await act(() => {
      root.render(<App />);
    });

    expect(refInstanceDuringFocus).not.toBe(null);
    expect(refInstanceDuringFocus).toBe(focusedInstance);

    document.body.removeChild(container);
  });
});
