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
let waitForAll;
let act;
let assertConsoleErrorDev;

describe('ReactSuspense', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    act = InternalTestUtils.act;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  function createThenable() {
    let completed = false;
    let resolve;
    const promise = new Promise(res => {
      resolve = () => {
        completed = true;
        res();
      };
    });
    const PromiseComp = () => {
      if (!completed) {
        throw promise;
      }
      return 'Done';
    };
    return {promise, resolve, PromiseComp};
  }

  // Warning don't fire in production, so this test passes in prod even if
  // the suspenseCallback feature is not enabled
  // @gate enableSuspenseCallback || !__DEV__
  it('check type', async () => {
    const {PromiseComp} = createThenable();

    const elementBadType = (
      <React.Suspense suspenseCallback={1} fallback={'Waiting'}>
        <PromiseComp />
      </React.Suspense>
    );

    ReactNoop.render(elementBadType);
    await waitForAll([]);
    assertConsoleErrorDev(
      [
        'Unexpected type for suspenseCallback.',
        ...(gate('alwaysThrottleRetries')
          ? []
          : ['Unexpected type for suspenseCallback.']),
      ],
      {
        withoutStack: true,
      },
    );

    const elementMissingCallback = (
      <React.Suspense fallback={'Waiting'}>
        <PromiseComp />
      </React.Suspense>
    );

    ReactNoop.render(elementMissingCallback);
    await waitForAll([]);
    assertConsoleErrorDev([]);
  });

  // @gate enableSuspenseCallback
  it('1 then 0 suspense callback', async () => {
    const {promise, resolve, PromiseComp} = createThenable();

    let ops = [];
    const suspenseCallback = thenables => {
      ops.push(thenables);
    };

    const element = (
      <React.Suspense suspenseCallback={suspenseCallback} fallback={'Waiting'}>
        <PromiseComp />
      </React.Suspense>
    );

    ReactNoop.render(element);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Waiting');
    expect(ops).toEqual([
      new Set([promise]),
      ...(gate('alwaysThrottleRetries') ? [] : new Set([promise])),
    ]);
    ops = [];

    await act(() => resolve());
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Done');
    expect(ops).toEqual([]);
  });

  // @gate enableSuspenseCallback
  it('2 then 1 then 0 suspense callback', async () => {
    const {
      promise: promise1,
      resolve: resolve1,
      PromiseComp: PromiseComp1,
    } = createThenable();
    const {
      promise: promise2,
      resolve: resolve2,
      PromiseComp: PromiseComp2,
    } = createThenable();

    let ops = [];
    const suspenseCallback1 = thenables => {
      ops.push(thenables);
    };

    const element = (
      <React.Suspense
        suspenseCallback={suspenseCallback1}
        fallback={'Waiting Tier 1'}>
        <PromiseComp1 />
        <PromiseComp2 />
      </React.Suspense>
    );

    ReactNoop.render(element);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Waiting Tier 1');
    expect(ops).toEqual([
      new Set([promise1]),
      ...(gate('alwaysThrottleRetries') ? [] : new Set([promise1, promise2])),
    ]);
    ops = [];

    await act(() => resolve1());
    ReactNoop.render(element);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Waiting Tier 1');
    expect(ops).toEqual([
      new Set([promise2]),
      // pre-warming
      new Set([promise2]),
    ]);
    ops = [];

    await act(() => resolve2());
    ReactNoop.render(element);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('DoneDone');
    expect(ops).toEqual([]);
  });

  // @gate enableSuspenseCallback
  it('nested suspense promises are reported only for their tier', async () => {
    const {promise, PromiseComp} = createThenable();

    const ops1 = [];
    const suspenseCallback1 = thenables => {
      ops1.push(thenables);
    };
    const ops2 = [];
    const suspenseCallback2 = thenables => {
      ops2.push(thenables);
    };

    const element = (
      <React.Suspense
        suspenseCallback={suspenseCallback1}
        fallback={'Waiting Tier 1'}>
        <React.Suspense
          suspenseCallback={suspenseCallback2}
          fallback={'Waiting Tier 2'}>
          <PromiseComp />
        </React.Suspense>
      </React.Suspense>
    );

    ReactNoop.render(element);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Waiting Tier 2');
    expect(ops1).toEqual([]);
    expect(ops2).toEqual([
      new Set([promise]),
      ...(gate('alwaysThrottleRetries') ? [] : [new Set([promise])]),
    ]);
  });

  // @gate enableSuspenseCallback
  it('competing suspense promises', async () => {
    const {
      promise: promise1,
      resolve: resolve1,
      PromiseComp: PromiseComp1,
    } = createThenable();
    const {
      promise: promise2,
      resolve: resolve2,
      PromiseComp: PromiseComp2,
    } = createThenable();

    let ops1 = [];
    const suspenseCallback1 = thenables => {
      ops1.push(thenables);
    };
    let ops2 = [];
    const suspenseCallback2 = thenables => {
      ops2.push(thenables);
    };

    const element = (
      <React.Suspense
        suspenseCallback={suspenseCallback1}
        fallback={'Waiting Tier 1'}>
        <React.Suspense
          suspenseCallback={suspenseCallback2}
          fallback={'Waiting Tier 2'}>
          <PromiseComp2 />
        </React.Suspense>
        <PromiseComp1 />
      </React.Suspense>
    );

    ReactNoop.render(element);
    await waitForAll([]);
    expect(ReactNoop).toMatchRenderedOutput('Waiting Tier 1');
    expect(ops1).toEqual([new Set([promise1])]);
    expect(ops2).toEqual([]);
    ops1 = [];
    ops2 = [];

    await act(() => resolve1());
    expect(ReactNoop).toMatchRenderedOutput('Waiting Tier 2Done');
    expect(ops1).toEqual([]);
    expect(ops2).toEqual([new Set([promise2]), new Set([promise2])]);
    ops1 = [];
    ops2 = [];

    await act(() => resolve2());
    expect(ReactNoop).toMatchRenderedOutput('DoneDone');
    expect(ops1).toEqual([]);
    expect(ops2).toEqual([]);
  });
});
