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

const {AsyncLocalStorage} = require('async_hooks');

let React;
let ReactNoop;
let Scheduler;
let use;
let Suspense;
let startTransition;
let waitForAll;

// Stands in for the browser's interaction tracking (e.g. Chrome's soft
// navigation detection). Both ride on V8's continuation-preserved embedder
// data, so a native promise reaction runs in the context that was current
// when `.then` was called.
const als = new AsyncLocalStorage();
let scheduledFrom;

describe('ReactContextPreservingPings', () => {
  beforeEach(() => {
    jest.resetModules();
    scheduledFrom = [];
    jest.mock('scheduler', () => {
      const actual = jest.requireActual('scheduler/unstable_mock');
      return {
        ...actual,
        unstable_scheduleCallback(priority, callback, options) {
          scheduledFrom.push(als.getStore());
          return actual.unstable_scheduleCallback(priority, callback, options);
        },
      };
    });

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    use = React.use;
    Suspense = React.Suspense;
    startTransition = React.startTransition;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
  });

  // Like Flight's ReactPromise: listeners are stored in an array and called
  // synchronously from whatever code settles the thenable.
  function createSyncThenable() {
    const listeners = [];
    const thenable = {
      status: 'pending',
      value: undefined,
      then(resolve) {
        listeners.push(resolve);
      },
      resolve(value) {
        thenable.status = 'fulfilled';
        thenable.value = value;
        listeners.forEach(listener => listener(value));
      },
    };
    return thenable;
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({thenable}) {
    const text = use(thenable);
    Scheduler.log(text);
    return text;
  }

  async function flushMicrotasks() {
    for (let i = 0; i < 10; i++) {
      await null;
    }
  }

  it('pings a suspended transition in the context of the render, not the resolver', async () => {
    const thenable = createSyncThenable();
    const root = ReactNoop.createRoot();

    await als.run('click', async () => {
      startTransition(() => {
        root.render(<AsyncText thenable={thenable} />);
      });
      await waitForAll([]);
    });
    expect(root).toMatchRenderedOutput(null);

    scheduledFrom = [];
    als.run('prepare', () => thenable.resolve('Done'));
    await flushMicrotasks();
    expect(scheduledFrom).toEqual(['click']);

    await waitForAll(['Done']);
    expect(root).toMatchRenderedOutput('Done');
  });

  it('retries a Suspense boundary in the context of the commit, not the resolver', async () => {
    const thenable = createSyncThenable();
    const root = ReactNoop.createRoot();

    await als.run('click', async () => {
      root.render(
        <Suspense fallback={<Text text="Loading" />}>
          <AsyncText thenable={thenable} />
        </Suspense>,
      );
      await waitForAll(['Loading']);
    });
    expect(root).toMatchRenderedOutput('Loading');

    scheduledFrom = [];
    als.run('prepare', () => thenable.resolve('Done'));
    await flushMicrotasks();
    expect(scheduledFrom).toEqual(['click']);

    await waitForAll(['Done']);
    // Retries may be throttled, which delays the commit with a timer.
    jest.runAllTimers();
    await waitForAll([]);
    expect(root).toMatchRenderedOutput('Done');
  });
});
