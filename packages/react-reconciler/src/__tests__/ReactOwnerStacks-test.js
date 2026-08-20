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
let ReactNoopServer;
let Scheduler;
let act;
let advanceTimersByTime;
let assertLog;
let serverAct;
let waitFor;

describe('ReactOwnerStacks', () => {
  beforeEach(function () {
    let time = 10;
    advanceTimersByTime = timeMS => {
      jest.advanceTimersByTime(timeMS);
      time += timeMS;
    };

    const now = jest.fn().mockImplementation(() => {
      return time++;
    });
    Object.defineProperty(performance, 'timeOrigin', {
      value: time,
      configurable: true,
    });
    Object.defineProperty(performance, 'now', {
      value: now,
      configurable: true,
    });

    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    ReactNoopServer = require('react-noop-renderer/server');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    assertLog = require('internal-test-utils').assertLog;
    serverAct = require('internal-test-utils').serverAct;
    waitFor = require('internal-test-utils').waitFor;
  });

  function normalizeCodeLocInfo(str) {
    return (
      str &&
      str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function (m, name) {
        return '\n    in ' + name + ' (at **)';
      })
    );
  }

  it('behavior in production', () => {
    if (!__DEV__) {
      if (gate('fb')) {
        expect(React).toHaveProperty('captureOwnerStack', undefined);
      } else {
        expect(React).not.toHaveProperty('captureOwnerStack');
      }
    }
  });

  // @gate __DEV__
  it('can get the component owner stacks during rendering in dev', async () => {
    let stack;

    function Foo() {
      return <Bar />;
    }
    function Bar() {
      return (
        <div>
          <Baz />
        </div>
      );
    }
    function Baz() {
      stack = React.captureOwnerStack();
      return <span>hi</span>;
    }

    await act(() => {
      ReactNoop.render(
        <div>
          <Foo />
        </div>,
      );
    });

    expect(normalizeCodeLocInfo(stack)).toBe(
      '\n    in Bar (at **)' + '\n    in Foo (at **)',
    );
  });

  it('returns null outside of render', async () => {
    // Awkward to gate since some builds will have `captureOwnerStack` return null in prod
    if (__DEV__) {
      expect(React.captureOwnerStack()).toBe(null);

      await act(() => {
        ReactNoop.render(<div />);
      });

      expect(React.captureOwnerStack()).toBe(null);
    }
  });

  // @gate __DEV__
  it('cuts off at the owner stack limit', async () => {
    function App({siblingsBeforeStackOne}) {
      const children = [];
      for (
        let i = 0;
        i <
        siblingsBeforeStackOne -
          // <App /> callsite
          1 -
          // Stop so that OwnerStackOne will be right before cutoff
          1;
        i++
      ) {
        children.push(<Component key={i} />);
      }
      children.push(<OwnerStackOne key="stackOne" />);
      children.push(<OwnerStackTwo key="stackTwo" />);

      return children;
    }

    function Component() {
      return null;
    }

    let stackOne;
    function OwnerStackOne() {
      stackOne = React.captureOwnerStack();
    }

    let stackTwo;
    function OwnerStackTwo() {
      stackTwo = React.captureOwnerStack();
    }

    await act(() => {
      ReactNoop.render(
        <App
          key="one"
          // Should be the value with of `ownerStackLimit` with `__VARIANT__` so that we see the cutoff
          siblingsBeforeStackOne={500}
        />,
      );
    });

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      pendingTimers: 0,
      stackOne: '\n    in App (at **)',
      stackTwo: __VARIANT__
        ? // captured right after cutoff
          '\n    in UnknownOwner (at **)'
        : // We never hit the limit outside __VARIANT__
          '\n    in App (at **)',
    });

    await act(() => {
      ReactNoop.render(
        <App
          // TODO: Owner Stacks should update on re-render.
          key="two"
          siblingsBeforeStackOne={0}
        />,
      );
    });

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      pendingTimers: 0,
      stackOne: __VARIANT__
        ? // We re-rendered immediately so not enough time has ellapsed to reset the limit.
          '\n    in UnknownOwner (at **)'
        : // We never hit the limit outside __VARIANT__
          '\n    in App (at **)',
      stackTwo: __VARIANT__
        ? // We re-rendered immediately so not enough time has ellapsed to reset the limit.
          '\n    in UnknownOwner (at **)'
        : // We never hit the limit outside __VARIANT__
          '\n    in App (at **)',
    });

    // advance time so that we reset the limit
    advanceTimersByTime(1001);

    await act(() => {
      ReactNoop.render(
        <App
          // TODO: Owner Stacks should update on re-render.
          key="three"
          // We reset after <App /> so we need to render one more
          // to have similar cutoff as the initial render (key="one")
          siblingsBeforeStackOne={501}
        />,
      );
    });

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      pendingTimers: 0,
      stackOne: '\n    in App (at **)',
      stackTwo: __VARIANT__
        ? // captured right after cutoff
          '\n    in UnknownOwner (at **)'
        : // We never hit the limit outside __VARIANT__
          '\n    in App (at **)',
    });
  });

  // @gate __DEV__
  it('Fiber: resets the owner stack limit periodically', async () => {
    function App({siblingsBeforeStackOne, timeout}) {
      const children = [];
      for (
        let i = 0;
        i <
        siblingsBeforeStackOne -
          // <App /> callsite
          1 -
          // Stop so that OwnerStackOne will be right before cutoff
          1;
        i++
      ) {
        children.push(<Component key={i} />);
      }
      children.push(<OwnerStackOne key="stackOne" />);
      children.push(<OwnerStackDelayed key="stackTwo" timeout={timeout} />);

      return children;
    }

    function Component() {
      return null;
    }

    let stackOne;
    function OwnerStackOne() {
      Scheduler.log('render OwnerStackOne');
      stackOne = React.captureOwnerStack();
    }

    let stackTwo;
    function OwnerStackTwo() {
      Scheduler.log('render OwnerStackTwo');
      stackTwo = React.captureOwnerStack();
    }
    function OwnerStackDelayed({timeout}) {
      Scheduler.log('render OwnerStackDelayed');
      React.use(timeout);
      return <OwnerStackTwo />;
    }

    React.startTransition(() => {
      ReactNoop.render(
        <App
          key="one"
          // Should be the value with of `ownerStackLimit` with `__VARIANT__` so that we see the cutoff
          siblingsBeforeStackOne={500}
          timeout={
            new Promise(resolve =>
              setTimeout(
                resolve,
                // Must be greater or equal then the reset interval
                1000,
              ),
            )
          }
        />,
      );
    });

    await waitFor(['render OwnerStackOne', 'render OwnerStackDelayed']);

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      // 1 for the timeout
      pendingTimers: 1,
      stackOne: '\n    in App (at **)',
      stackTwo: undefined,
    });

    // resolve `timeout` Promise
    advanceTimersByTime(1000);

    await waitFor(['render OwnerStackDelayed', 'render OwnerStackTwo']);

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      pendingTimers: 0,
      stackOne: '\n    in App (at **)',
      stackTwo: __VARIANT__
        ? // We don't reset in Fiber until we start a new render.
          // Here we just continued after a ping.
          '\n    in UnknownOwner (at **)' + '\n    in UnknownOwner (at **)'
        : // We never hit the limit outside __VARIANT__
          '\n    in OwnerStackDelayed (at **)' + '\n    in App (at **)',
    });
  });

  // @gate __DEV__
  it('Fizz: resets the owner stack limit periodically', async () => {
    function App({siblingsBeforeStackOne, timeout}) {
      const children = [];
      for (
        let i = 0;
        i <
        siblingsBeforeStackOne -
          // <App /> callsite
          1 -
          // Stop so that OwnerStackOne will be right before cutoff
          1;
        i++
      ) {
        children.push(<Component key={i} />);
      }
      children.push(<OwnerStackOne key="stackOne" />);
      children.push(<OwnerStackDelayed key="stackTwo" timeout={timeout} />);

      return children;
    }

    function Component() {
      return null;
    }

    let stackOne;
    function OwnerStackOne() {
      Scheduler.log('render OwnerStackOne');
      stackOne = React.captureOwnerStack();
    }

    let stackTwo;
    function OwnerStackTwo() {
      Scheduler.log('render OwnerStackTwo');
      stackTwo = React.captureOwnerStack();
    }
    function OwnerStackDelayed({timeout}) {
      Scheduler.log('render OwnerStackDelayed');
      React.use(timeout);
      return <OwnerStackTwo />;
    }

    ReactNoopServer.render(
      <App
        key="one"
        // Should be the value with of `ownerStackLimit` with `__VARIANT__` so that we see the cutoff
        siblingsBeforeStackOne={500}
        timeout={
          new Promise(resolve =>
            setTimeout(
              resolve,
              // Must be greater or equal then the reset interval
              1000,
            ),
          )
        }
      />,
    );

    assertLog(['render OwnerStackOne', 'render OwnerStackDelayed']);

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      // 1 for the timeout
      pendingTimers: 1,
      stackOne: '\n    in App (at **)',
      stackTwo: undefined,
    });

    await serverAct(() => {
      advanceTimersByTime(1000);
    });

    expect({
      pendingTimers: jest.getTimerCount(),
      stackOne: normalizeCodeLocInfo(stackOne),
      stackTwo: normalizeCodeLocInfo(stackTwo),
    }).toEqual({
      pendingTimers: 0,
      stackOne: '\n    in App (at **)',
      stackTwo: __VARIANT__
        ? // We don't reset in Fiber until we start a new render.
          // Here we just continued after a ping.
          '\n    in UnknownOwner (at **)' + '\n    in UnknownOwner (at **)'
        : // We never hit the limit outside __VARIANT__
          '\n    in OwnerStackDelayed (at **)' + '\n    in App (at **)',
    });
  });
});
