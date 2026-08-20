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
let Scheduler;
let container;
let act;

async function fakeAct(cb) {
  // We don't use act/waitForThrow here because we want to observe how errors are reported for real.
  await cb();
  Scheduler.unstable_flushAll();
}

describe('ReactConfigurableErrorLogging', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    container = document.createElement('div');
    if (__DEV__) {
      act = React.act;
    }
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
    const uncaughtErrors = [];
    const caughtErrors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError(error, errorInfo) {
        uncaughtErrors.push(error, errorInfo);
      },
      onCaughtError(error, errorInfo) {
        caughtErrors.push(error, errorInfo);
      },
    });
    await fakeAct(() => {
      root.render(
        <div>
          <span>
            <ErrorThrowingComponent />
          </span>
        </div>,
      );
    });

    expect(uncaughtErrors).toEqual([
      expect.objectContaining({
        message: 'constructor error',
      }),
      expect.objectContaining({
        componentStack: expect.stringMatching(
          new RegExp(
            '\\s+(in|at) ErrorThrowingComponent (.*)\n' +
              '\\s+(in|at) span(.*)\n' +
              '\\s+(in|at) div(.*)',
          ),
        ),
      }),
    ]);
    expect(caughtErrors).toEqual([]);
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
    const uncaughtErrors = [];
    const caughtErrors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError(error, errorInfo) {
        uncaughtErrors.push(error, errorInfo);
      },
      onCaughtError(error, errorInfo) {
        caughtErrors.push(error, errorInfo);
      },
    });
    await fakeAct(() => {
      root.render(
        <div>
          <span>
            <ErrorThrowingComponent />
          </span>
        </div>,
      );
    });

    expect(uncaughtErrors).toEqual([
      expect.objectContaining({
        message: 'componentDidMount error',
      }),
      expect.objectContaining({
        componentStack: expect.stringMatching(
          new RegExp(
            '\\s+(in|at) ErrorThrowingComponent (.*)\n' +
              '\\s+(in|at) span(.*)\n' +
              '\\s+(in|at) div(.*)',
          ),
        ),
      }),
    ]);
    expect(caughtErrors).toEqual([]);
  });

  it('should ignore errors thrown in log method to prevent cycle', async () => {
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

    const uncaughtErrors = [];
    const caughtErrors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError(error, errorInfo) {
        uncaughtErrors.push(error, errorInfo);
      },
      onCaughtError(error, errorInfo) {
        caughtErrors.push(error, errorInfo);
        throw new Error('onCaughtError error');
      },
    });

    const ref = React.createRef();

    await fakeAct(() => {
      root.render(
        <div>
          <ErrorBoundary ref={ref}>
            <span>
              <ErrorThrowingComponent />
            </span>
          </ErrorBoundary>
        </div>,
      );
    });

    expect(uncaughtErrors).toEqual([]);
    expect(caughtErrors).toEqual([
      expect.objectContaining({
        message: 'render error',
      }),
      expect.objectContaining({
        componentStack: expect.stringMatching(
          new RegExp(
            '\\s+(in|at) ErrorThrowingComponent (.*)\n' +
              '\\s+(in|at) span(.*)\n' +
              '\\s+(in|at) ErrorBoundary(.*)\n' +
              '\\s+(in|at) div(.*)',
          ),
        ),
        errorBoundary: ref.current,
      }),
    ]);

    // The error thrown in caughtError should be rethrown with a clean stack
    expect(() => {
      jest.runAllTimers();
    }).toThrow('onCaughtError error');
  });

  it('does not log errors when inside real act', async () => {
    function ErrorThrowingComponent() {
      throw new Error('render error');
    }
    const uncaughtErrors = [];
    const caughtErrors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError(error, errorInfo) {
        uncaughtErrors.push(error, errorInfo);
      },
      onCaughtError(error, errorInfo) {
        caughtErrors.push(error, errorInfo);
      },
    });

    if (__DEV__) {
      global.IS_REACT_ACT_ENVIRONMENT = true;

      await expect(async () => {
        await act(() => {
          root.render(
            <div>
              <span>
                <ErrorThrowingComponent />
              </span>
            </div>,
          );
        });
      }).rejects.toThrow('render error');
    }

    expect(uncaughtErrors).toEqual([]);
    expect(caughtErrors).toEqual([]);
  });
});
