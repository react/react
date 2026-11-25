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
let ReactTestRenderer;
let act;
let ReactSharedInternals;
let waitForAll;

describe('ReactAct', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactTestRenderer = require('react-test-renderer');
    act = React.act;
    ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    ({waitForAll} = require('internal-test-utils'));
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // @gate __DEV__
  it('restores actQueue when callback throws synchronously', async () => {
    let setCount;
    function Counter() {
      const [count, set] = React.useState(0);
      setCount = set;
      return String(count);
    }

    let root;
    await act(async () => {
      root = ReactTestRenderer.create(React.createElement(Counter));
    });
    expect(root.toJSON()).toEqual('0');
    expect(ReactSharedInternals.actQueue).toBe(null);

    expect(() => {
      act(() => {
        throw new Error('boom sync');
      });
    }).toThrow('boom sync');

    expect(ReactSharedInternals.actQueue).toBe(null);

    global.IS_REACT_ACT_ENVIRONMENT = false;
    setCount(1);
    await waitForAll([]);
    expect(root.toJSON()).toEqual('1');
  });

  // @gate __DEV__
  it('restores actQueue when callback rejects asynchronously', async () => {
    let setCount;
    function Counter() {
      const [count, set] = React.useState(0);
      setCount = set;
      return String(count);
    }

    let root;
    await act(async () => {
      root = ReactTestRenderer.create(React.createElement(Counter));
    });
    expect(root.toJSON()).toEqual('0');
    expect(ReactSharedInternals.actQueue).toBe(null);

    let caughtError;
    try {
      await act(async () => {
        throw new Error('boom async');
      });
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeDefined();
    expect(caughtError.message).toBe('boom async');

    expect(ReactSharedInternals.actQueue).toBe(null);

    global.IS_REACT_ACT_ENVIRONMENT = false;
    setCount(1);
    await waitForAll([]);
    expect(root.toJSON()).toEqual('1');
  });

  // @gate __DEV__
  it('restores outer actQueue when nested callback throws synchronously', async () => {
    let setCount;
    function Counter() {
      const [count, set] = React.useState(0);
      setCount = set;
      return String(count);
    }

    let root;
    await act(async () => {
      root = ReactTestRenderer.create(React.createElement(Counter));
    });
    expect(root.toJSON()).toEqual('0');

    await act(async () => {
      const outerQueue = ReactSharedInternals.actQueue;
      expect(outerQueue).not.toBe(null);

      expect(() => {
        act(() => {
          throw new Error('boom nested sync');
        });
      }).toThrow('boom nested sync');

      expect(ReactSharedInternals.actQueue).toBe(outerQueue);
      setCount(1);
    });
    expect(root.toJSON()).toEqual('1');
    expect(ReactSharedInternals.actQueue).toBe(null);
  });

  // @gate __DEV__
  it('restores outer actQueue when nested callback rejects asynchronously', async () => {
    let setCount;
    function Counter() {
      const [count, set] = React.useState(0);
      setCount = set;
      return String(count);
    }

    let root;
    await act(async () => {
      root = ReactTestRenderer.create(React.createElement(Counter));
    });
    expect(root.toJSON()).toEqual('0');

    await act(async () => {
      const outerQueue = ReactSharedInternals.actQueue;
      expect(outerQueue).not.toBe(null);

      let caughtError;
      try {
        await act(async () => {
          throw new Error('boom nested async');
        });
      } catch (error) {
        caughtError = error;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe('boom nested async');

      expect(ReactSharedInternals.actQueue).toBe(outerQueue);
      setCount(1);
    });
    expect(root.toJSON()).toEqual('1');
    expect(ReactSharedInternals.actQueue).toBe(null);
  });
});
