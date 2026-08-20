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
let act;
let useEffect;
let useLayoutEffect;
let assertLog;

describe('ReactEffectOrdering', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    useEffect = React.useEffect;
    useLayoutEffect = React.useLayoutEffect;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
  });

  it('layout unmounts on deletion are fired in parent -> child order', async () => {
    const root = ReactNoop.createRoot();

    function Parent() {
      useLayoutEffect(() => {
        return () => Scheduler.log('Unmount parent');
      });
      return <Child />;
    }

    function Child() {
      useLayoutEffect(() => {
        return () => Scheduler.log('Unmount child');
      });
      return 'Child';
    }

    await act(() => {
      root.render(<Parent />);
    });
    expect(root).toMatchRenderedOutput('Child');
    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount parent', 'Unmount child']);
  });

  it('passive unmounts on deletion are fired in parent -> child order', async () => {
    const root = ReactNoop.createRoot();

    function Parent() {
      useEffect(() => {
        return () => Scheduler.log('Unmount parent');
      });
      return <Child />;
    }

    function Child() {
      useEffect(() => {
        return () => Scheduler.log('Unmount child');
      });
      return 'Child';
    }

    await act(() => {
      root.render(<Parent />);
    });
    expect(root).toMatchRenderedOutput('Child');
    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount parent', 'Unmount child']);
  });
});
