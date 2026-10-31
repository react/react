/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let act;

describe('ReactDOMFlushSyncCommitError', () => {
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('keeps flushing sync work after an error escapes the commit phase', async () => {
    function App({text}) {
      return (
        <>
          <input />
          <span>{text}</span>
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App text="A" />);
    });
    expect(container.textContent).toBe('A');

    // Before mutating the DOM, React reads the selection of the focused
    // element so it can restore it after the commit. Make that read throw once
    // to simulate a host error that escapes performSyncWorkOnRoot.
    const input = container.querySelector('input');
    input.focus();
    let shouldThrow = true;
    Object.defineProperty(input, 'selectionStart', {
      configurable: true,
      get() {
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error('Selection read failed');
        }
        return 0;
      },
    });

    expect(() => {
      ReactDOM.flushSync(() => {
        root.render(<App text="B" />);
      });
    }).toThrow('Selection read failed');

    // Subsequent sync updates must still be flushed.
    ReactDOM.flushSync(() => {
      root.render(<App text="C" />);
    });
    expect(container.textContent).toBe('C');
  });
});
