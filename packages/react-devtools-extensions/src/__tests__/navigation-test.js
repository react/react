/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {getVersionedRenderImplementation} from 'react-devtools-shared/src/__tests__/utils';

describe('DevTools extension navigation', () => {
  let onNavigated;
  let onCommitted;
  let registerNavigationListener;
  let unsubscribe;
  let wasFirefox;

  function createEvent() {
    const listeners = new Set();
    return {
      addListener: listener => listeners.add(listener),
      removeListener: listener => listeners.delete(listener),
      emit: value => listeners.forEach(listener => listener(value)),
    };
  }

  beforeEach(() => {
    wasFirefox = global.__IS_FIREFOX__;
    global.__IS_FIREFOX__ = false;
    onNavigated = createEvent();
    onCommitted = createEvent();
    global.chrome = {
      devtools: {
        inspectedWindow: {tabId: 123},
        network: {onNavigated},
      },
      webNavigation: {onCommitted},
    };
    registerNavigationListener =
      require('../main/registerNavigationListener').default;
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
    global.__IS_FIREFOX__ = wasFirefox;
    delete global.chrome;
  });

  it('only handles document navigations in the inspected main frame', () => {
    const callback = jest.fn();
    unsubscribe = registerNavigationListener(callback);

    onNavigated.emit('https://example.com/search');
    onCommitted.emit({tabId: 456, frameId: 0});
    onCommitted.emit({tabId: 123, frameId: 1});
    expect(callback).not.toHaveBeenCalled();

    onCommitted.emit({tabId: 123, frameId: 0});
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
    onCommitted.emit({tabId: 123, frameId: 0});
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('uses the Firefox navigation event without accessing webNavigation', () => {
    global.__IS_FIREFOX__ = true;
    delete global.chrome.webNavigation;
    const callback = jest.fn();
    unsubscribe = registerNavigationListener(callback);

    onNavigated.emit('https://example.com/next');
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
    onNavigated.emit('https://example.com/another');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  describe('profiling', () => {
    const {render} = getVersionedRenderImplementation();

    // @reactVersion >= 16.9
    it('records commits before and after a soft navigation in one session', () => {
      const React = require('react');
      const utils = require('react-devtools-shared/src/__tests__/utils');
      utils.beforeEachProfiling();
      const store = global.store;
      const onDocumentNavigation = jest.fn(() => {
        store.profilerStore.stopProfiling();
      });
      unsubscribe = registerNavigationListener(onDocumentNavigation);

      function App({route}) {
        require('scheduler').unstable_advanceTime(1);
        return <div>{route}</div>;
      }

      utils.act(() => render(<App route="initial" />));
      const rootID = store.roots[0];
      utils.act(() => store.profilerStore.startProfiling());
      utils.act(() => render(<App route="before" />));
      utils.act(() => onNavigated.emit('https://example.com/after'));
      expect(store.profilerStore.isProfilingBasedOnUserInput).toBe(true);
      utils.act(() => render(<App route="after" />));
      utils.act(() => store.profilerStore.stopProfiling());

      expect(onDocumentNavigation).not.toHaveBeenCalled();
      const data = store.profilerStore.getDataForRoot(rootID);
      expect(data.commitData).toHaveLength(2);
      expect(data.operations).toHaveLength(2);
      expect(data.commitData[1].timestamp).toBeGreaterThan(
        data.commitData[0].timestamp,
      );
    });
  });
});
