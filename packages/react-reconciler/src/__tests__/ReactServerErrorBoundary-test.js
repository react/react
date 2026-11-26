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
let ServerErrorBoundary;
let act;
let container;

describe('ReactServerErrorBoundary', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ServerErrorBoundary = React.unstable_ServerErrorBoundary;
    act = require('internal-test-utils').act;
    container = document.createElement('div');
  });

  function createAsyncChild() {
    let resolved = false;
    const listeners = new Set();
    const thenable = {
      then(resolve) {
        listeners.add(resolve);
      },
    };
    return {
      resolve() {
        resolved = true;
        listeners.forEach(resolve => resolve());
      },
      Child() {
        if (!resolved) {
          throw thenable;
        }
        return <span>Ready</span>;
      },
    };
  }

  it('exposes the API only in enabled client and server builds', () => {
    const expected = gate(flags => flags.enableServerErrorBoundary)
      ? Symbol.for('react.server_error_boundary')
      : undefined;
    expect(React.unstable_ServerErrorBoundary).toBe(expected);
    expect(
      require('react/react.react-server').unstable_ServerErrorBoundary,
    ).toBe(expected);
    __unmockReact();
  });

  // @gate enableServerErrorBoundary
  it('catches client errors without replacing the surrounding layout', async () => {
    const error = new Error('Failed');
    const onCaughtError = jest.fn();
    const root = ReactDOMClient.createRoot(container, {onCaughtError});

    function Child({fail}) {
      if (fail) {
        throw error;
      }
      return <span>Ready</span>;
    }

    function App({fail}) {
      return (
        <>
          <header>Layout</header>
          <ServerErrorBoundary fallback={<b>Unavailable</b>}>
            <Child fail={fail} />
          </ServerErrorBoundary>
        </>
      );
    }

    await act(() => root.render(<App fail={false} />));
    const header = container.firstChild;

    await act(() => root.render(<App fail={true} />));
    expect(container.innerHTML).toBe(
      '<header>Layout</header><b>Unavailable</b>',
    );
    expect(container.firstChild).toBe(header);
    expect(onCaughtError).toHaveBeenCalledTimes(1);
    expect(onCaughtError.mock.calls[0][0]).toBe(error);
  });

  // @gate enableServerErrorBoundary
  it('lets the surrounding Suspense boundary handle pending children', async () => {
    const {Child, resolve} = createAsyncChild();
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <React.Suspense fallback={<p>Loading</p>}>
          <ServerErrorBoundary fallback={<b>Unavailable</b>}>
            <Child />
          </ServerErrorBoundary>
        </React.Suspense>,
      );
    });
    expect(container.innerHTML).toBe('<p>Loading</p>');

    await act(resolve);
    expect(container.innerHTML).toBe('<span>Ready</span>');
  });

  // @gate enableServerErrorBoundary
  it('waits for pending children when there is no Suspense boundary', async () => {
    const {Child, resolve} = createAsyncChild();
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <ServerErrorBoundary fallback={<b>Unavailable</b>}>
          <Child />
        </ServerErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('');

    await act(resolve);
    expect(container.innerHTML).toBe('<span>Ready</span>');
  });

  // @gate enableServerErrorBoundary && enableSuspenseList
  it('does not show an error fallback when SuspenseList delays a row', async () => {
    const {Child, resolve} = createAsyncChild();
    const root = ReactDOMClient.createRoot(container);
    const fallback = jest.fn(() => <b>Unavailable</b>);

    await act(() => {
      root.render(
        <React.unstable_SuspenseList revealOrder="forwards">
          <React.Suspense fallback={<p>Loading</p>}>
            <Child />
          </React.Suspense>
          <ServerErrorBoundary fallback={React.createElement(fallback)}>
            <span>Second</span>
          </ServerErrorBoundary>
        </React.unstable_SuspenseList>,
      );
    });
    expect(fallback).not.toHaveBeenCalled();

    await act(resolve);
    expect(container.textContent).toBe('ReadySecond');
    expect(fallback).not.toHaveBeenCalled();
  });

  // @gate enableServerErrorBoundary
  it('propagates errors in its fallback to the parent error boundary', async () => {
    const childError = new Error('Child failed');
    const fallbackError = new Error('Fallback failed');
    const onCaughtError = jest.fn();
    const root = ReactDOMClient.createRoot(container, {onCaughtError});

    function Throw({error}) {
      throw error;
    }

    await act(() => {
      root.render(
        <ServerErrorBoundary fallback={<b>Outer fallback</b>}>
          <ServerErrorBoundary fallback={<Throw error={fallbackError} />}>
            <Throw error={childError} />
          </ServerErrorBoundary>
        </ServerErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('<b>Outer fallback</b>');
    expect(onCaughtError).toHaveBeenCalledTimes(1);
    expect(onCaughtError.mock.calls[0][0]).toBe(fallbackError);
  });

  // @gate enableServerErrorBoundary
  it('resets a caught error when its key changes', async () => {
    const onCaughtError = jest.fn();
    const root = ReactDOMClient.createRoot(container, {onCaughtError});

    function Child({fail}) {
      if (fail) {
        throw new Error('Failed');
      }
      return <span>Ready</span>;
    }

    function App({boundaryKey, fail}) {
      return (
        <ServerErrorBoundary key={boundaryKey} fallback={<b>Unavailable</b>}>
          <Child fail={fail} />
        </ServerErrorBoundary>
      );
    }

    await act(() => root.render(<App boundaryKey="first" fail={true} />));
    expect(container.innerHTML).toBe('<b>Unavailable</b>');

    await act(() => root.render(<App boundaryKey="first" fail={false} />));
    expect(container.innerHTML).toBe('<b>Unavailable</b>');

    await act(() => root.render(<App boundaryKey="second" fail={false} />));
    expect(container.innerHTML).toBe('<span>Ready</span>');
  });

  // @gate enableServerErrorBoundary
  it('preserves server content while hydrating children suspend', async () => {
    const {Child, resolve} = createAsyncChild();
    container.innerHTML = '<!--$--><span>Ready</span><!--/$-->';
    const span = container.querySelector('span');
    const onRecoverableError = jest.fn();

    await act(() => {
      ReactDOMClient.hydrateRoot(
        container,
        <ServerErrorBoundary fallback={<b>Unavailable</b>}>
          <Child />
        </ServerErrorBoundary>,
        {onRecoverableError},
      );
    });
    expect(container.querySelector('span')).toBe(span);
    expect(container.textContent).toBe('Ready');

    await act(resolve);
    expect(container.querySelector('span')).toBe(span);
    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  // @gate enableServerErrorBoundary
  it('waits when a client retry of a server error suspends', async () => {
    const {Child, resolve} = createAsyncChild();
    container.innerHTML =
      '<!--$!--><template></template><b>Unavailable</b><!--/$-->';
    const fallback = container.querySelector('b');
    const onRecoverableError = jest.fn();

    await act(() => {
      ReactDOMClient.hydrateRoot(
        container,
        <ServerErrorBoundary fallback={<b>Unavailable</b>}>
          <Child />
        </ServerErrorBoundary>,
        {onRecoverableError},
      );
    });
    // Pending client work has not created a fresh error fallback.
    expect(container.querySelector('b')).toBe(fallback);

    await act(resolve);
    expect(container.innerHTML).toBe('<span>Ready</span>');
    // Retrying suspended work can queue the server diagnostic more than once.
    // No hydration mismatch or root recovery is needed.
    expect(
      new Set(onRecoverableError.mock.calls.map(call => call[0].message)),
    ).toEqual(
      new Set([
        'The server could not finish this Suspense boundary, likely ' +
          'due to an error during server rendering. ' +
          'Switched to client rendering.',
      ]),
    );
  });
});
