/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import {createContext} from 'react';
import Store from '../store';

import type {ViewAttributeSource} from 'react-devtools-shared/src/devtools/views/DevTools';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';

export const BridgeContext: ReactContext<FrontendBridge> =
  createContext<FrontendBridge>(null as any as FrontendBridge);
BridgeContext.displayName = 'BridgeContext';

export const StoreContext: ReactContext<Store> = createContext<Store>(
  null as any as Store,
);
StoreContext.displayName = 'StoreContext';

export type ContextMenuContextType = {
  isEnabledForInspectedElement: boolean,
  viewAttributeSourceFunction: ViewAttributeSource | null,
};

export const ContextMenuContext: ReactContext<ContextMenuContextType> =
  createContext<ContextMenuContextType>({
    isEnabledForInspectedElement: false,
    viewAttributeSourceFunction: null,
  });
ContextMenuContext.displayName = 'ContextMenuContext';

export type OptionsContextType = {
  readOnly: boolean,
  hideSettings: boolean,
  hideToggleErrorAction: boolean,
  hideToggleSuspenseAction: boolean,
  hideLogAction: boolean,
  hideViewSourceAction: boolean,
};

export const OptionsContext: ReactContext<OptionsContextType> =
  createContext<OptionsContextType>({
    readOnly: false,
    hideSettings: false,
    hideToggleErrorAction: false,
    hideToggleSuspenseAction: false,
    hideLogAction: false,
    hideViewSourceAction: false,
  });
