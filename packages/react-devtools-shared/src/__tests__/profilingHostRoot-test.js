/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  getLegacyRenderImplementation,
  getModernRenderImplementation,
} from './utils';

describe('profiling HostRoot', () => {
  let React;
  let Scheduler;
  let store;
  let utils;
  let getEffectDurations;
  let effectDurations;
  let passiveEffectDurations;

  beforeEach(() => {
    utils = require('./utils');
    utils.beforeEachProfiling();

    getEffectDurations = require('../backend/utils').getEffectDurations;

    store = global.store;

    React = require('react');
    Scheduler = require('scheduler');

    effectDurations = [];
    passiveEffectDurations = [];

    // This is the DevTools hook installed by the env.beforEach()
    // The hook is installed as a read-only property on the window,
    // so for our test purposes we can just override the commit hook.
    const hook = global.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    hook.onPostCommitFiberRoot = function onPostCommitFiberRoot(
      rendererID,
      root,
    ) {
      const {effectDuration, passiveEffectDuration} = getEffectDurations(root);
      effectDurations.push(effectDuration);
      passiveEffectDurations.push(passiveEffectDuration);
    };
  });

  const {render: legacyRender} = getLegacyRenderImplementation();
  const {render: modernRender} = getModernRenderImplementation();

  // @reactVersion >= 18.0
  // @reactVersion <= 18.2
  it('should expose passive and layout effect durations for render()', () => {
    function App() {
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(10);
      });
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(100);
      });
      return null;
    }

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => {
      legacyRender(<App />);
    });
    utils.act(() => store.profilerStore.stopProfiling());

    expect(effectDurations).toHaveLength(1);
    const effectDuration = effectDurations[0];
    expect(effectDuration === null || effectDuration === 100).toBe(true);
    expect(passiveEffectDurations).toHaveLength(1);
    const passiveEffectDuration = passiveEffectDurations[0];
    expect(passiveEffectDuration === null || passiveEffectDuration === 10).toBe(
      true,
    );
  });

  // @reactVersion >=18.0
  it('should expose passive and layout effect durations for createRoot()', () => {
    function App() {
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(10);
      });
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(100);
      });
      return null;
    }

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => {
      modernRender(<App />);
    });
    utils.act(() => store.profilerStore.stopProfiling());

    expect(effectDurations).toHaveLength(1);
    const effectDuration = effectDurations[0];
    expect(effectDuration === null || effectDuration === 100).toBe(true);
    expect(passiveEffectDurations).toHaveLength(1);
    const passiveEffectDuration = passiveEffectDurations[0];
    expect(passiveEffectDuration === null || passiveEffectDuration === 10).toBe(
      true,
    );
  });

  // @reactVersion >=18.0
  it('should properly reset passive and layout effect durations between commits', () => {
    function App({shouldCascade}) {
      const [, setState] = React.useState(false);
      React.useEffect(() => {
        Scheduler.unstable_advanceTime(10);
      });
      React.useLayoutEffect(() => {
        Scheduler.unstable_advanceTime(100);
      });
      React.useLayoutEffect(() => {
        if (shouldCascade) {
          setState(true);
        }
      }, [shouldCascade]);
      return null;
    }

    utils.act(() => store.profilerStore.startProfiling());
    utils.act(() => modernRender(<App />));
    utils.act(() => modernRender(<App shouldCascade={true} />));
    utils.act(() => store.profilerStore.stopProfiling());

    expect(effectDurations).toHaveLength(3);
    expect(passiveEffectDurations).toHaveLength(3);

    for (let i = 0; i < effectDurations.length; i++) {
      const effectDuration = effectDurations[i];
      expect(effectDuration === null || effectDuration === 100).toBe(true);
      const passiveEffectDuration = passiveEffectDurations[i];
      expect(
        passiveEffectDuration === null || passiveEffectDuration === 10,
      ).toBe(true);
    }
  });
});
