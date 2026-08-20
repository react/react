/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let waitForAll;
let uncaughtExceptionMock;

async function fakeAct(cb) {
  // We don't use act/waitForThrow here because we want to observe how errors are reported for real.
  await cb();
  Scheduler.unstable_flushAll();
}

describe('ReactIncrementalErrorLogging', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
  });

  // Note: in this test file we won't be using assertConsoleDev() matchers
  // because they filter out precisely the messages we want to test for.
  let oldConsoleWarn;
  let oldConsoleError;
  beforeEach(() => {
    oldConsoleWarn = console.warn;
    oldConsoleError = console.error;
    console.warn = jest.fn();
    console.error = jest.fn();
    uncaughtExceptionMock = jest.fn();
    process.on('uncaughtException', uncaughtExceptionMock);
  });

  afterEach(() => {
    console.warn = oldConsoleWarn;
    console.error = oldConsoleError;
    process.off('uncaughtException', uncaughtExceptionMock);
    oldConsoleWarn = null;
    oldConsoleError = null;
    uncaughtExceptionMock = null;
  });

  it('should log errors that occur during the begin phase', async () => {
    class ErrorThrowingComponent extends React.Component {
      constructor(props) {
        super(props);
        throw new Error('constructor error');
      }
      render() {
        return <div />;
      }
    }
    await fakeAct(() => {
      ReactNoop.render(
        <div>
          <span>
            <ErrorThrowingComponent />
          </span>
        </div>,
      );
    });
    expect(uncaughtExceptionMock).toHaveBeenCalledTimes(1);
    expect(uncaughtExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'constructor error',
      }),
    );
    if (__DEV__) {
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('%s'),
        expect.stringContaining(
          'An error occurred in the <ErrorThrowingComponent> component.',
        ),
        expect.stringContaining(
          'Consider adding an error boundary to your tree ' +
            'to customize error handling behavior.',
        ),
        // The component stack is not added without the polyfill/devtools.
        // expect.stringMatching(
        //  new RegExp(
        //    '\\s+(in|at) ErrorThrowingComponent'
        //  ),
        // ),
      );
    }
  });

  it('should log errors that occur during the commit phase', async () => {
    class ErrorThrowingComponent extends React.Component {
      componentDidMount() {
        throw new Error('componentDidMount error');
      }
      render() {
        return <div />;
      }
    }
    await fakeAct(() => {
      ReactNoop.render(
        <div>
          <span>
            <ErrorThrowingComponent />
          </span>
        </div>,
      );
    });
    expect(uncaughtExceptionMock).toHaveBeenCalledTimes(1);
    expect(uncaughtExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'componentDidMount error',
      }),
    );
    if (__DEV__) {
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('%s'),
        expect.stringContaining(
          'An error occurred in the <ErrorThrowingComponent> component.',
        ),
        expect.stringContaining(
          'Consider adding an error boundary to your tree ' +
            'to customize error handling behavior.',
        ),
        // The component stack is not added without the polyfill/devtools.
        // expect.stringMatching(
        //   new RegExp(
        //     '\\s+(in|at) ErrorThrowingComponent'
        //   ),
        // ),
      );
    }
  });

  it('should ignore errors thrown in log method to prevent cycle', async () => {
    const logCapturedErrorCalls = [];
    console.error.mockImplementation(error => {
      // Test what happens when logging itself is buggy.
      logCapturedErrorCalls.push(error);
      throw new Error('logCapturedError error');
    });

    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        return this.state.error ? null : this.props.children;
      }
    }
    class ErrorThrowingComponent extends React.Component {
      render() {
        throw new Error('render error');
      }
    }
    await fakeAct(() => {
      ReactNoop.render(
        <div>
          <ErrorBoundary>
            <span>
              <ErrorThrowingComponent />
            </span>
          </ErrorBoundary>
        </div>,
      );
    });
    expect(logCapturedErrorCalls.length).toBe(1);
    if (__DEV__) {
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('%o'),
        expect.objectContaining({
          message: 'render error',
        }),
        expect.stringContaining(
          'The above error occurred in the <ErrorThrowingComponent> component.',
        ),
        expect.stringContaining(
          'React will try to recreate this component tree from scratch ' +
            'using the error boundary you provided, ErrorBoundary.',
        ),
        // The component stack is not added without the polyfill/devtools.
        // expect.stringMatching(
        //   new RegExp(
        //     '\\s+(in|at) ErrorThrowingComponent'
        //   ),
        // ),
      );
    } else {
      expect(logCapturedErrorCalls[0]).toEqual(
        expect.objectContaining({
          message: 'render error',
        }),
      );
    }
    // The error thrown in logCapturedError should be rethrown with a clean stack
    expect(() => {
      jest.runAllTimers();
    }).toThrow('logCapturedError error');
  });

  it('does not report internal Offscreen component for errors thrown during reconciliation inside Suspense', async () => {
    // When a child of Suspense throws during reconciliation (not render),
    // a Throw fiber is created whose .return is the internal Offscreen fiber.
    // We should skip Offscreen since it's an internal
    // implementation detail and walk up to Suspense instead.
    const lazyChild = React.lazy(() => {
      throw new Error('lazy init error');
    });

    await fakeAct(() => {
      ReactNoop.render(
        <React.Suspense fallback={<div />}>{lazyChild}</React.Suspense>,
      );
    });
    expect(uncaughtExceptionMock).toHaveBeenCalledTimes(1);
    expect(uncaughtExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'lazy init error',
      }),
    );
    if (__DEV__) {
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0]).toEqual([
        '%s\n\n%s\n',
        'An error occurred in the <Suspense> component.',
        'Consider adding an error boundary to your tree to customize error handling behavior.\n' +
          'Visit https://react.dev/link/error-boundaries to learn more about error boundaries.',
      ]);
    }
  });

  it('does not report internal Offscreen component for errors thrown during reconciliation inside Activity', async () => {
    // Same as the Suspense test above — Activity also wraps its children in
    // an internal Offscreen fiber. The error message should show Activity,
    // not Offscreen.
    const lazyChild = React.lazy(() => {
      throw new Error('lazy init error');
    });

    await fakeAct(() => {
      ReactNoop.render(
        <React.Activity mode="visible">{lazyChild}</React.Activity>,
      );
    });
    expect(uncaughtExceptionMock).toHaveBeenCalledTimes(1);
    expect(uncaughtExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'lazy init error',
      }),
    );
    if (__DEV__) {
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0]).toEqual([
        '%s\n\n%s\n',
        'An error occurred in the <Activity> component.',
        'Consider adding an error boundary to your tree to customize error handling behavior.\n' +
          'Visit https://react.dev/link/error-boundaries to learn more about error boundaries.',
      ]);
    }
  });

  it('resets instance variables before unmounting failed node', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      componentDidCatch(error) {
        this.setState({error});
      }
      render() {
        return this.state.error ? null : this.props.children;
      }
    }
    class Foo extends React.Component {
      state = {step: 0};
      componentDidMount() {
        this.setState({step: 1});
      }
      componentWillUnmount() {
        Scheduler.log('componentWillUnmount: ' + this.state.step);
      }
      render() {
        Scheduler.log('render: ' + this.state.step);
        if (this.state.step > 0) {
          throw new Error('oops');
        }
        return null;
      }
    }

    ReactNoop.render(
      <ErrorBoundary>
        <Foo />
      </ErrorBoundary>,
    );
    await waitForAll(
      [
        'render: 0',

        'render: 1',

        // Retry one more time before handling error
        'render: 1',

        'componentWillUnmount: 0',
      ].filter(Boolean),
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    if (__DEV__) {
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('%o'),
        expect.objectContaining({
          message: 'oops',
        }),
        expect.stringContaining(
          'The above error occurred in the <Foo> component.',
        ),
        expect.stringContaining(
          'React will try to recreate this component tree from scratch ' +
            'using the error boundary you provided, ErrorBoundary.',
        ),
        // The component stack is not added without the polyfill/devtools.
        // expect.stringMatching(
        //   new RegExp('\\s+(in|at) Foo')
        // ),
      );
    } else {
      expect(console.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'oops',
        }),
      );
    }
  });
});
