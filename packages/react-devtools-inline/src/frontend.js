/** @flow */

import * as React from 'react';
import {forwardRef} from 'react';
import Bridge from 'react-devtools-shared/src/bridge';
import Store from 'react-devtools-shared/src/devtools/store';
import DevTools from 'react-devtools-shared/src/devtools/views/DevTools';
import {getSavedComponentFilters} from 'react-devtools-shared/src/utils';

import type {Wall} from 'react-devtools-shared/src/frontend/types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {Props} from 'react-devtools-shared/src/devtools/views/DevTools';
import type {Config} from 'react-devtools-shared/src/devtools/store';

export function createStore(bridge: FrontendBridge, config?: Config): Store {
  return new Store(bridge, {
    checkBridgeProtocolCompatibility: true,
    supportsTraceUpdates: true,
    supportsTimeline: true,
    supportsNativeInspection: true,
    ...config,
  });
}

export function createBridge(contentWindow: any, wall?: Wall): FrontendBridge {
  if (wall == null) {
    wall = {
      listen(fn) {
        // $FlowFixMe[missing-local-annot]
        const onMessage = ({data}) => {
          fn(data);
        };
        window.addEventListener('message', onMessage);
        return () => {
          window.removeEventListener('message', onMessage);
        };
      },
      send(event: string, payload: any, transferable?: Array<any>) {
        contentWindow.postMessage({event, payload}, '*', transferable);
      },
    };
  }

  return new Bridge(wall) as FrontendBridge;
}

export function initialize(
  contentWindow: any,
  {
    bridge,
    store,
    reload,
  }: {
    bridge?: FrontendBridge,
    store?: Store,
    reload?: () => void,
  } = {},
): component(...props: Props) {
  if (bridge == null) {
    bridge = createBridge(contentWindow);
  }

  // Type refinement.
  const frontendBridge = bridge as any as FrontendBridge;

  if (store == null) {
    store = createStore(frontendBridge);
  }

  const onGetSavedPreferences = () => {
    // This is the only message we're listening for,
    // so it's safe to cleanup after we've received it.
    frontendBridge.removeListener('getSavedPreferences', onGetSavedPreferences);

    const data = {
      componentFilters: getSavedComponentFilters(),
    };

    // The renderer interface can't read saved preferences directly,
    // because they are stored in localStorage within the context of the extension.
    // Instead it relies on the extension to pass them through.
    frontendBridge.send('savedPreferences', data);
  };

  frontendBridge.addListener('getSavedPreferences', onGetSavedPreferences);
  if (reload) {
    frontendBridge.addListener('reloadAppForProfiling', reload);
  }

  const ForwardRef = forwardRef<Props, mixed>((props, ref) => (
    <DevTools ref={ref} bridge={frontendBridge} store={store} {...props} />
  ));
  ForwardRef.displayName = 'DevTools';

  return ForwardRef;
}
