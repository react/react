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
let ReactDOMClient;
let act;

describe('SelectEventPlugin', () => {
  let container;

  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  // See https://github.com/facebook/react/pull/3639 for details.
  it('does not get confused when dependent events are registered independently', async () => {
    const select = jest.fn();
    const onSelect = event => {
      expect(typeof event).toBe('object');
      expect(event.type).toBe('select');
      expect(event.target).toBe(node);
      select(event.currentTarget);
    };

    const root = ReactDOMClient.createRoot(container);
    const node = await (async function () {
      await act(() => {
        // Pass `onMouseDown` so React registers a top-level listener.
        root.render(<input type="text" onMouseDown={function () {}} />);
      });
      return container.firstChild;
    })();

    // Trigger `mousedown` and `mouseup`. Note that
    // React is not currently listening to `mouseup`.
    node.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      }),
    );
    node.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
      }),
    );

    await act(() => {
      // Now subscribe to `onSelect`
      root.render(<input type="text" onSelect={onSelect} />);
    });
    node.focus();

    // This triggers a `select` event in our polyfill.
    node.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, cancelable: true}),
    );

    // Verify that it doesn't get "stuck" waiting for
    // a `mouseup` event that it has "missed" because
    // a top-level listener didn't exist yet.
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('should fire `onSelect` when a listener is present', async () => {
    const select = jest.fn();
    const onSelect = event => {
      expect(typeof event).toBe('object');
      expect(event.type).toBe('select');
      expect(event.target).toBe(node);
      select(event.currentTarget);
    };

    const node = await (async function () {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input type="text" onSelect={onSelect} />);
      });
      return container.firstChild;
    })();

    node.focus();

    let nativeEvent = new MouseEvent('focus', {
      bubbles: true,
      cancelable: true,
    });
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(0);

    nativeEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(0);

    nativeEvent = new MouseEvent('mouseup', {bubbles: true, cancelable: true});
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('should fire `onSelectCapture` when a listener is present', async () => {
    const select = jest.fn();
    const onSelectCapture = event => {
      expect(typeof event).toBe('object');
      expect(event.type).toBe('select');
      expect(event.target).toBe(node);
      select(event.currentTarget);
    };

    const node = await (async function () {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input type="text" onSelectCapture={onSelectCapture} />);
      });
      return container.firstChild;
    })();

    node.focus();

    let nativeEvent = new MouseEvent('focus', {
      bubbles: true,
      cancelable: true,
    });
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(0);

    nativeEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(0);

    nativeEvent = new MouseEvent('mouseup', {bubbles: true, cancelable: true});
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(1);
  });

  // Regression test for https://github.com/facebook/react/issues/11379
  it('should not wait for `mouseup` after receiving `dragend`', async () => {
    const select = jest.fn();
    const onSelect = event => {
      expect(typeof event).toBe('object');
      expect(event.type).toBe('select');
      expect(event.target).toBe(node);
      select(event.currentTarget);
    };

    const node = await (async function () {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input type="text" onSelect={onSelect} />);
      });
      return container.firstChild;
    })();

    node.focus();

    let nativeEvent = new MouseEvent('focus', {
      bubbles: true,
      cancelable: true,
    });
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(0);

    nativeEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(0);

    nativeEvent = new MouseEvent('dragend', {bubbles: true, cancelable: true});
    node.dispatchEvent(nativeEvent);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('should handle selectionchange events', async function () {
    const onSelect = jest.fn();

    const node = await (async function () {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<input type="text" onSelect={onSelect} />);
      });
      return container.firstChild;
    })();

    node.focus();

    // Make sure the event was not called before we emit the selection change event
    expect(onSelect).toHaveBeenCalledTimes(0);

    // This is dispatched e.g. when using CMD+a on macOS
    document.dispatchEvent(
      new Event('selectionchange', {bubbles: false, cancelable: false}),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
