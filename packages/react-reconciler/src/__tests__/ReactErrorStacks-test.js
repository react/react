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
let Suspense;
let Activity;
let ViewTransition;
let ReactNoop;
let waitForAll;

describe('ReactFragment', () => {
  let didCatchErrors = [];
  let rootCaughtErrors = [];
  let SomethingThatErrors;
  let CatchingBoundary;
  let onCaughtError;

  beforeEach(function () {
    jest.resetModules();

    React = require('react');
    Suspense = React.Suspense;
    Activity = React.Activity;
    ViewTransition = React.ViewTransition;
    ReactNoop = require('react-noop-renderer');
    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;

    didCatchErrors = [];
    rootCaughtErrors = [];

    onCaughtError = function (error, errorInfo) {
      rootCaughtErrors.push(
        error.message,
        normalizeCodeLocInfo(errorInfo.componentStack),
        React.captureOwnerStack
          ? normalizeCodeLocInfo(React.captureOwnerStack())
          : null,
      );
    };

    SomethingThatErrors = () => {
      throw new Error('uh oh');
    };

    // eslint-disable-next-line no-shadow
    CatchingBoundary = class CatchingBoundary extends React.Component {
      constructor() {
        super();
        this.state = {};
      }

      static getDerivedStateFromError(error) {
        return {errored: true};
      }

      componentDidCatch(err, errInfo) {
        didCatchErrors.push(
          err.message,
          normalizeCodeLocInfo(errInfo.componentStack),
        );
      }

      render() {
        if (this.state.errored) {
          return null;
        }
        return this.props.children;
      }
    };
  });

  function componentStack(components) {
    return components
      .map(component => `\n    in ${component} (at **)`)
      .join('');
  }

  function normalizeCodeLocInfo(str) {
    return (
      str &&
      str.replace(/\n +(?:at|in) ([^\(]+) [^\n]*/g, function (m, name) {
        return '\n    in ' + name + ' (at **)';
      })
    );
  }

  it('retains component and owner stacks when rethrowing an error', async () => {
    class RethrowingBoundary extends React.Component {
      static getDerivedStateFromError(error) {
        throw error;
      }

      render() {
        return this.props.children;
      }
    }

    function Foo() {
      return (
        <RethrowingBoundary>
          <Bar />
        </RethrowingBoundary>
      );
    }
    function Bar() {
      return <SomethingThatErrors />;
    }

    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <Foo />
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'Bar',
        'RethrowingBoundary',
        'Foo',
        'CatchingBoundary',
      ]),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'Bar',
        'RethrowingBoundary',
        'Foo',
        'CatchingBoundary',
      ]),
      __DEV__ ? componentStack(['Bar', 'Foo']) : null,
    ]);
  });

  it('includes built-in for Suspense', async () => {
    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <Suspense>
          <SomethingThatErrors />
        </Suspense>
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack(['SomethingThatErrors', 'Suspense', 'CatchingBoundary']),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack(['SomethingThatErrors', 'Suspense', 'CatchingBoundary']),
      __DEV__ ? componentStack(['SomethingThatErrors']) : null,
    ]);
  });

  it('includes built-in for Suspense fallbacks', async () => {
    const SomethingThatSuspends = React.lazy(() => {
      return new Promise(() => {});
    });

    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <Suspense fallback={<SomethingThatErrors />}>
          <SomethingThatSuspends />
        </Suspense>
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'Suspense Fallback',
        'CatchingBoundary',
      ]),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'Suspense Fallback',
        'CatchingBoundary',
      ]),
      __DEV__ ? componentStack(['SomethingThatErrors']) : null,
    ]);
  });

  it('includes built-in for Activity', async () => {
    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <Activity>
          <SomethingThatErrors />
        </Activity>
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack(['SomethingThatErrors', 'Activity', 'CatchingBoundary']),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack(['SomethingThatErrors', 'Activity', 'CatchingBoundary']),
      __DEV__ ? componentStack(['SomethingThatErrors']) : null,
    ]);
  });

  // @gate enableViewTransition
  it('includes built-in for ViewTransition', async () => {
    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <ViewTransition>
          <SomethingThatErrors />
        </ViewTransition>
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'ViewTransition',
        'CatchingBoundary',
      ]),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'ViewTransition',
        'CatchingBoundary',
      ]),
      __DEV__ ? componentStack(['SomethingThatErrors']) : null,
    ]);
  });

  it('includes built-in for Lazy', async () => {
    // Lazy component throws
    const LazyComponent = React.lazy(() => {
      throw new Error('uh oh');
    });

    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <LazyComponent />
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack(['Lazy', 'CatchingBoundary']),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack(['Lazy', 'CatchingBoundary']),
      __DEV__ ? '' : null, // No owner stack
    ]);
  });

  // @gate enableSuspenseList
  it('includes built-in for SuspenseList', async () => {
    const SuspenseList = React.unstable_SuspenseList;

    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <SuspenseList revealOrder="independent">
          <SomethingThatErrors />
        </SuspenseList>
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'SuspenseList',
        'CatchingBoundary',
      ]),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        'SuspenseList',
        'CatchingBoundary',
      ]),
      __DEV__ ? componentStack(['SomethingThatErrors']) : null,
    ]);
  });

  it('does not include built-in for Fragment', async () => {
    ReactNoop.createRoot({
      onCaughtError,
    }).render(
      <CatchingBoundary>
        <>
          <SomethingThatErrors />
        </>
      </CatchingBoundary>,
    );
    await waitForAll([]);
    expect(didCatchErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        // No Fragment
        'CatchingBoundary',
      ]),
    ]);
    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack([
        'SomethingThatErrors',
        // No Fragment
        'CatchingBoundary',
      ]),
      __DEV__ ? componentStack(['SomethingThatErrors']) : null,
    ]);
  });

  it('captures class component stacks via the no-Reflect.construct fallback', async () => {
    class FailingClassComponent extends React.Component {
      render() {
        throw new Error('uh oh');
      }
    }

    const root = ReactNoop.createRoot({onCaughtError});

    const originalReflectConstruct = Reflect.construct;
    delete Reflect.construct;

    try {
      root.render(
        <CatchingBoundary>
          <FailingClassComponent />
        </CatchingBoundary>,
      );
      await waitForAll([]);
    } finally {
      Object.defineProperty(Reflect, 'construct', {
        value: originalReflectConstruct,
      });
    }

    expect(rootCaughtErrors).toEqual([
      'uh oh',
      componentStack(['FailingClassComponent', 'CatchingBoundary']),
      __DEV__ ? componentStack(['FailingClassComponent']) : null,
    ]);

    // The throwing trap should be reset, we use props object for it
    expect(
      Object.getOwnPropertyDescriptor(FailingClassComponent.prototype, 'props'),
    ).toBeUndefined();
  });
});
