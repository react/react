/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Dispatch, ReactNode} from 'react';
import {useState, useEffect, useReducer} from 'react';
import createContext from '../lib/createContext';
import {emptyStore, defaultStore} from '../lib/defaultStore';
import {
  saveStore,
  initStoreFromUrlOrLocalStorage,
  type Store,
} from '../lib/stores';

const StoreContext = createContext<Store>();

/**
 * Hook to access the store.
 */
export const useStore = StoreContext.useContext;

const StoreDispatchContext = createContext<Dispatch<ReducerAction>>();

/**
 * Hook to access the store dispatch function.
 */
export const useStoreDispatch = StoreDispatchContext.useContext;

/**
 * Make Store and dispatch function available to all sub-components in children.
 */
export function StoreProvider({children}: {children: ReactNode}): JSX.Element {
  const [store, dispatch] = useReducer(storeReducer, emptyStore);
  const [isPageReady, setIsPageReady] = useState<boolean>(false);

  useEffect(() => {
    let mountStore: Store;
    try {
      mountStore = initStoreFromUrlOrLocalStorage();
    } catch (e) {
      console.error('Failed to initialize store from URL or local storage', e);
      mountStore = defaultStore;
    }
    dispatch({type: 'setStore', payload: {store: mountStore}});
    setIsPageReady(true);
  }, []);

  useEffect(() => {
    if (store !== emptyStore) {
      saveStore(store);
    }
  }, [store]);

  return (
    <StoreContext.Provider value={store}>
      <StoreDispatchContext.Provider value={dispatch}>
        {isPageReady ? children : null}
      </StoreDispatchContext.Provider>
    </StoreContext.Provider>
  );
}

type ReducerAction =
  | {
      type: 'setStore';
      payload: {
        store: Store;
      };
    }
  | {
      type: 'updateSource';
      payload: {
        source: string;
      };
    }
  | {
      type: 'updateConfig';
      payload: {
        config: string;
      };
    }
  | {
      type: 'toggleInternals';
    };

function storeReducer(store: Store, action: ReducerAction): Store {
  switch (action.type) {
    case 'setStore': {
      const newStore = action.payload.store;
      return newStore;
    }
    case 'updateSource': {
      const source = action.payload.source;
      const newStore = {
        ...store,
        source,
      };
      return newStore;
    }
    case 'updateConfig': {
      const config = action.payload.config;
      const newStore = {
        ...store,
        config,
      };
      return newStore;
    }
    case 'toggleInternals': {
      const newStore = {
        ...store,
        showInternals: !store.showInternals,
      };
      return newStore;
    }
  }
}
