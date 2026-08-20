/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

describe('ReactDOMConsoleErrorReporting', () => {
  let act;
  let React;
  let ReactDOM;

  let ErrorBoundary;
  let NoError;
  let container;
  let windowOnError;
  let waitForThrow;

  beforeEach(() => {
    jest.resetModules();
    act = require('internal-test-utils').act;
    React = require('react');
    ReactDOM = require('react-dom');

    const InternalTestUtils = require('internal-test-utils');
    waitForThrow = InternalTestUtils.waitForThrow;

    ErrorBoundary = class extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <h1>Caught: {this.state.error.message}</h1>;
        }
        return this.props.children;
      }
    };
    NoError = function () {
      return <h1>OK</h1>;
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    windowOnError = jest.fn();
    window.addEventListener('error', windowOnError);
    spyOnDevAndProd(console, 'error');
    spyOnDevAndProd(console, 'warn');
  });

  afterEach(() => {
    document.body.removeChild(container);
    window.removeEventListener('error', windowOnError);
    jest.restoreAllMocks();
  });

  describe('ReactDOM.render', () => {
    // @gate !disableLegacyMode
    it('logs errors during event handlers', async () => {
      function Foo() {
        return (
          <button
            onClick={() => {
              throw Error('Boom');
            }}>
            click me
          </button>
        );
      }

      await act(() => {
        ReactDOM.render(<Foo />, container);
      });

      await expect(async () => {
        await act(() => {
          container.firstChild.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
            }),
          );
        });
      }).rejects.toThrow(
        expect.objectContaining({
          message: 'Boom',
        }),
      );

      // Reported because we're in a browser click event:
      expect(windowOnError.mock.calls).toEqual([
        [
          expect.objectContaining({
            message: 'Boom',
          }),
        ],
      ]);
      expect(console.warn).not.toBeCalled();

      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.warn.mockReset();
      console.error.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();
      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }
    });

    // @gate !disableLegacyMode
    it('logs render errors without an error boundary', async () => {
      function Foo() {
        throw Error('Boom');
      }

      await expect(async () => {
        await act(() => {
          ReactDOM.render(<Foo />, container);
        });
      }).rejects.toThrow('Boom');

      // Reported because errors without a boundary are reported to window.
      expect(windowOnError.mock.calls).toEqual([
        [
          expect.objectContaining({
            message: 'Boom',
          }),
        ],
      ]);

      if (__DEV__) {
        expect(console.warn.mock.calls).toEqual([
          [
            // Formatting
            expect.stringContaining('%s'),
            // Addendum by React:
            expect.stringContaining('An error occurred in the <Foo> component'),
            expect.stringContaining('Consider adding an error boundary'),
            // The component stack is not added without the polyfill/devtools.
            // expect.stringContaining('Foo'),
          ],
        ]);

        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.warn).not.toBeCalled();
        expect(console.error).not.toBeCalled();
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.warn.mockReset();
      console.error.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(console.warn).not.toBeCalled();
      expect(windowOnError).not.toBeCalled();
      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }
    });

    // @gate !disableLegacyMode
    it('logs render errors with an error boundary', async () => {
      function Foo() {
        throw Error('Boom');
      }

      await act(() => {
        ReactDOM.render(
          <ErrorBoundary>
            <Foo />
          </ErrorBoundary>,
          container,
        );
      });

      // The top-level error was caught with try/catch,
      // so we don't see an error event.
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();

      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
          [
            // Formatting
            expect.stringContaining('%o'),
            expect.objectContaining({
              message: 'Boom',
            }),
            // Addendum by React:
            expect.stringContaining(
              'The above error occurred in the <Foo> component',
            ),
            expect.stringContaining('ErrorBoundary'),
            // The component stack is not added without the polyfill/devtools.
            // expect.stringContaining('Foo'),
          ],
        ]);
      } else {
        expect(console.error.mock.calls).toEqual([
          [
            // Reported by React with no extra message:
            expect.objectContaining({
              message: 'Boom',
            }),
          ],
        ]);
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.error.mockReset();
      console.warn.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();
      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }
    });

    // @gate !disableLegacyMode
    it('logs layout effect errors without an error boundary', async () => {
      function Foo() {
        React.useLayoutEffect(() => {
          throw Error('Boom');
        }, []);
        return null;
      }

      await expect(async () => {
        await act(() => {
          ReactDOM.render(<Foo />, container);
        });
      }).rejects.toThrow('Boom');

      // Reported because errors without a boundary are reported to window.
      expect(windowOnError.mock.calls).toEqual([
        [
          expect.objectContaining({
            message: 'Boom',
          }),
        ],
      ]);

      if (__DEV__) {
        expect(console.warn.mock.calls).toEqual([
          [
            // Formatting
            expect.stringContaining('%s'),

            // Addendum by React:
            expect.stringContaining('An error occurred in the <Foo> component'),
            expect.stringContaining('Consider adding an error boundary'),
            // The component stack is not added without the polyfill/devtools.
            // expect.stringContaining('Foo'),
          ],
        ]);

        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.warn).not.toBeCalled();
        expect(console.error).not.toBeCalled();
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.warn.mockReset();
      console.error.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(console.warn).not.toBeCalled();
      expect(windowOnError).not.toBeCalled();

      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }
    });

    // @gate !disableLegacyMode
    it('logs layout effect errors with an error boundary', async () => {
      function Foo() {
        React.useLayoutEffect(() => {
          throw Error('Boom');
        }, []);
        return null;
      }

      await act(() => {
        ReactDOM.render(
          <ErrorBoundary>
            <Foo />
          </ErrorBoundary>,
          container,
        );
      });

      // The top-level error was caught with try/catch,
      // so we don't see an error event.
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();

      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
          [
            // Formatting
            expect.stringContaining('%o'),
            expect.objectContaining({
              message: 'Boom',
            }),
            // Addendum by React:
            expect.stringContaining(
              'The above error occurred in the <Foo> component',
            ),
            expect.stringContaining('ErrorBoundary'),
            // The component stack is not added without the polyfill/devtools.
            // expect.stringContaining('Foo'),
          ],
        ]);
      } else {
        expect(console.error.mock.calls).toEqual([
          [
            // Reported by React with no extra message:
            expect.objectContaining({
              message: 'Boom',
            }),
          ],
        ]);
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.warn.mockReset();
      console.error.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();
      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }
    });

    // @gate !disableLegacyMode
    it('logs passive effect errors without an error boundary', async () => {
      function Foo() {
        React.useEffect(() => {
          throw Error('Boom');
        }, []);
        return null;
      }

      await act(async () => {
        ReactDOM.render(<Foo />, container);
        await waitForThrow('Boom');
      });

      // The top-level error was caught with try/catch,
      // so we don't see an error event.
      expect(windowOnError.mock.calls).toEqual([
        [
          expect.objectContaining({
            message: 'Boom',
          }),
        ],
      ]);

      if (__DEV__) {
        expect(console.warn.mock.calls).toEqual([
          [
            // Formatting
            expect.stringContaining('%s'),

            // Addendum by React:
            expect.stringContaining('An error occurred in the <Foo> component'),
            expect.stringContaining('Consider adding an error boundary'),
            // The component stack is not added without the polyfill/devtools.
            // expect.stringContaining('Foo'),
          ],
        ]);

        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.warn).not.toBeCalled();
        expect(console.error).not.toBeCalled();
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.warn.mockReset();
      console.error.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();
      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.error).not.toBeCalled();
      }
    });

    // @gate !disableLegacyMode
    it('logs passive effect errors with an error boundary', async () => {
      function Foo() {
        React.useEffect(() => {
          throw Error('Boom');
        }, []);
        return null;
      }

      await act(() => {
        ReactDOM.render(
          <ErrorBoundary>
            <Foo />
          </ErrorBoundary>,
          container,
        );
      });

      // The top-level error was caught with try/catch,
      // so we don't see an error event.
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();

      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
          [
            // Formatting
            expect.stringContaining('%o'),
            expect.objectContaining({
              message: 'Boom',
            }),
            // Addendum by React:
            expect.stringContaining(
              'The above error occurred in the <Foo> component',
            ),
            expect.stringContaining('ErrorBoundary'),
            // The component stack is not added without the polyfill/devtools.
            // expect.stringContaining('Foo'),
          ],
        ]);
      } else {
        expect(console.error.mock.calls).toEqual([
          [
            // Reported by React with no extra message:
            expect.objectContaining({
              message: 'Boom',
            }),
          ],
        ]);
      }

      // Check next render doesn't throw.
      windowOnError.mockReset();
      console.warn.mockReset();
      console.error.mockReset();
      await act(() => {
        ReactDOM.render(<NoError />, container);
      });
      expect(container.textContent).toBe('OK');
      expect(windowOnError).not.toBeCalled();
      expect(console.warn).not.toBeCalled();
      if (__DEV__) {
        expect(console.error.mock.calls).toEqual([
          [
            expect.stringContaining(
              'ReactDOM.render has not been supported since React 18',
            ),
          ],
        ]);
      } else {
        expect(console.warn).not.toBeCalled();
      }
    });
  });
});
