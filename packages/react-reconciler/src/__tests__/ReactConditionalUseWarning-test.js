/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let assertLog;
let use;
let Suspense;
let startTransition;

describe('conditional use warning', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    use = React.use;
    Suspense = React.Suspense;
    startTransition = React.startTransition;
  });

  // @gate __DEV__ && enableConditionalUseWarning
  it('warns if use(promise) is called conditionally based on a cache', async () => {
    let cachedValue;
    let resolve;
    const promise = new Promise(r => {
      resolve = value => {
        cachedValue = value;
        r(value);
      };
    });

    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    function Async() {
      if (cachedValue !== undefined) {
        return <Text text={cachedValue} />;
      }
      return <Text text={use(promise)} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Suspense fallback={<Text text="Loading..." />}>
          <Text text="Initial" />
        </Suspense>,
      );
    });
    assertLog(['Initial']);
    expect(root).toMatchRenderedOutput('Initial');

    spyOnDev(console, 'error').mockImplementation(() => {});
    try {
      await act(() => {
        startTransition(() => {
          root.render(
            <Suspense fallback={<Text text="Loading..." />}>
              <Async />
            </Suspense>,
          );
        });
      });
      assertLog(['Loading...']);
      expect(root).toMatchRenderedOutput('Initial');

      await act(() => resolve('Async'));
      assertLog(['Async']);
      expect(root).toMatchRenderedOutput('Async');

      expect(console.error).toHaveBeenCalledTimes(1);
      const warning = console.error.mock.calls[0][0];
      expect(warning).toBeInstanceOf(Error);
      expect(warning.message).toBe(
        'This library called use() to suspend in a previous render but ' +
          'did not call use() when it finished. This indicates an incorrect use of use(). ' +
          'Learn more: https://react.dev/warnings/conditional-use-of-use',
      );

      await act(() => {
        root.render(
          <Suspense fallback={<Text text="Loading..." />}>
            <Async />
          </Suspense>,
        );
      });
      assertLog(['Async']);
      expect(root).toMatchRenderedOutput('Async');
      expect(console.error).toHaveBeenCalledTimes(1);
    } finally {
      if (__DEV__) {
        console.error.mockRestore();
      }
    }
  });

  it('does not warn if use(promise) is called unconditionally', async () => {
    let resolve;
    const promise = new Promise(r => {
      resolve = r;
    });

    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    function Async() {
      return <Text text={use(promise)} />;
    }

    const root = ReactNoop.createRoot();
    spyOnDev(console, 'error').mockImplementation(() => {});
    try {
      await act(() => {
        root.render(
          <Suspense fallback={<Text text="Loading..." />}>
            <Async />
          </Suspense>,
        );
      });
      assertLog(['Loading...']);
      expect(root).toMatchRenderedOutput('Loading...');

      await act(() => resolve('Async'));
      assertLog(['Async']);
      expect(root).toMatchRenderedOutput('Async');

      await act(() => {
        root.render(
          <Suspense fallback={<Text text="Loading..." />}>
            <Async />
          </Suspense>,
        );
      });
      assertLog(['Async']);
      expect(root).toMatchRenderedOutput('Async');
      if (__DEV__) {
        expect(console.error).not.toHaveBeenCalled();
      }
    } finally {
      if (__DEV__) {
        console.error.mockRestore();
      }
    }
  });
});
