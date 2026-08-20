/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

jest.mock('react-dom-bindings/src/events/isEventSupported');

describe('InvalidEventListeners', () => {
  let React;
  let ReactDOMClient;
  let act;
  let assertConsoleErrorDev;
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('should prevent non-function listeners, at dispatch', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div onClick="not a function" />);
    });
    assertConsoleErrorDev([
      'Expected `onClick` listener to be a function, instead got a value of `string` type.\n' +
        '    in div (at **)',
    ]);
    const node = container.firstChild;

    console.error = jest.fn();

    const uncaughtErrors = [];
    function handleWindowError(e) {
      uncaughtErrors.push(e.error);
    }
    window.addEventListener('error', handleWindowError);
    try {
      node.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
        }),
      );
    } finally {
      window.removeEventListener('error', handleWindowError);
    }
    expect(uncaughtErrors.length).toBe(1);
    expect(uncaughtErrors[0]).toEqual(
      expect.objectContaining({
        message:
          'Expected `onClick` listener to be a function, ' +
          'instead got a value of `string` type.',
      }),
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        detail: expect.objectContaining({
          message:
            'Expected `onClick` listener to be a function, instead got a value of `string` type.',
        }),
        type: 'unhandled exception',
      }),
    );
  });

  it('should not prevent null listeners, at dispatch', async () => {
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<div onClick={null} />);
    });

    const node = container.firstChild;
    await act(() => {
      node.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
        }),
      );
    });
  });
});
