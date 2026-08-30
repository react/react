/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';

import * as React from 'react';
import {
  createContext,
  useContext,
  useCallback,
  useState,
  startTransition,
} from 'react';

import {BridgeContext, StoreContext} from '../context';

import type {FrontendBridge} from '../../../bridge';
import type {DevToolsHookSettings} from '../../../backend/types';
import type Store from '../../store';

export type Theme = 'auto' | 'light' | 'dark';

type Context = {
  isModalShowing: boolean,
  setIsModalShowing: (value: boolean) => void,
  environmentNames: null | Promise<Array<string>>,
  hookSettings: null | Promise<$ReadOnly<DevToolsHookSettings>>,
};

const SettingsModalContext: ReactContext<Context> = createContext<Context>(
  null as any as Context,
);
SettingsModalContext.displayName = 'SettingsModalContext';

function fetchEnvironmentNames(bridge: FrontendBridge): Promise<Array<string>> {
  return new Promise(resolve => {
    function onEnvironmentNames(names: Array<string>) {
      bridge.removeListener('environmentNames', onEnvironmentNames);
      resolve(names);
    }
    bridge.addListener('environmentNames', onEnvironmentNames);
    bridge.send('getEnvironmentNames');
  });
}

function fetchHookSettings(
  store: Store,
): Promise<$ReadOnly<DevToolsHookSettings>> {
  return new Promise(resolve => {
    function onHookSettings(settings: $ReadOnly<DevToolsHookSettings>) {
      store.removeListener('hookSettings', onHookSettings);
      resolve(settings);
    }

    store.addListener('hookSettings', onHookSettings);
    store.getHookSettings();
  });
}

function SettingsModalContextController({
  children,
}: {
  children: React$Node,
}): React.Node {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const setIsModalShowing: boolean => void = useCallback(
    (value: boolean) => {
      startTransition(() => {
        setContext({
          isModalShowing: value,
          setIsModalShowing,
          environmentNames: value ? fetchEnvironmentNames(bridge) : null,
          hookSettings: value ? fetchHookSettings(store) : null,
        });
      });
    },
    [bridge, store],
  );

  const [currentContext, setContext] = useState<Context>({
    isModalShowing: false,
    setIsModalShowing,
    environmentNames: null,
    hookSettings: null,
  });

  return (
    <SettingsModalContext.Provider value={currentContext}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export {SettingsModalContext, SettingsModalContextController};
