/** @flow */

import Agent from 'react-devtools-shared/src/backend/agent';
import Bridge from 'react-devtools-shared/src/bridge';
import {initBackend} from 'react-devtools-shared/src/backend';
import {installHook} from 'react-devtools-shared/src/hook';
import setupNativeStyleEditor from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';

import type {
  BackendBridge,
  SavedPreferencesParams,
} from 'react-devtools-shared/src/bridge';
import type {
  ComponentFilter,
  Wall,
} from 'react-devtools-shared/src/frontend/types';
import {
  getIfReloadedAndProfiling,
  getIsReloadAndProfileSupported,
  onReloadAndProfile,
  onReloadAndProfileFlagsReset,
} from 'react-devtools-shared/src/utils';

let resolveComponentFiltersInjection: (filters: Array<ComponentFilter>) => void;
const componentFiltersPromise = new Promise<Array<ComponentFilter>>(resolve => {
  resolveComponentFiltersInjection = resolve;
});

function startActivation(contentWindow: any, bridge: BackendBridge) {
  const onSavedPreferences = (data: SavedPreferencesParams) => {
    // This is the only message we're listening for,
    // so it's safe to cleanup after we've received it.
    bridge.removeListener('savedPreferences', onSavedPreferences);

    const {componentFilters} = data;

    resolveComponentFiltersInjection(componentFilters);
  };

  componentFiltersPromise.then(
    finishActivation.bind(null, contentWindow, bridge),
  );

  bridge.addListener('savedPreferences', onSavedPreferences);

  // The backend may be unable to read saved preferences directly,
  // because they are stored in localStorage within the context of the extension (on the frontend).
  // Instead it relies on the extension to pass preferences through.
  // Because we might be in a sandboxed iframe, we have to ask for them by way of postMessage().
  bridge.send('getSavedPreferences');
}

function finishActivation(contentWindow: any, bridge: BackendBridge) {
  const agent = new Agent(
    bridge,
    getIfReloadedAndProfiling(),
    onReloadAndProfile,
  );
  onReloadAndProfileFlagsReset();

  const hook = contentWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook) {
    initBackend(hook, agent, contentWindow, getIsReloadAndProfileSupported());

    // Setup React Native style editor if a renderer like react-native-web has injected it.
    if (hook.resolveRNStyle) {
      setupNativeStyleEditor(
        bridge,
        agent,
        hook.resolveRNStyle,
        hook.nativeStyleEditorValidAttributes,
      );
    }
  }
}

export function activate(
  contentWindow: any,
  {
    bridge,
  }: {
    bridge?: BackendBridge,
  } = {},
): void {
  if (bridge == null) {
    bridge = createBridge(contentWindow);
  }

  startActivation(contentWindow, bridge);
}

export function createBridge(contentWindow: any, wall?: Wall): BackendBridge {
  const {parent} = contentWindow;

  if (wall == null) {
    wall = {
      listen(fn) {
        const onMessage = ({data}: $FlowFixMe) => {
          fn(data);
        };
        contentWindow.addEventListener('message', onMessage);
        return () => {
          contentWindow.removeEventListener('message', onMessage);
        };
      },
      send(
        event: string,
        payload: mixed,
        transferable?: $ReadOnlyArray<mixed>,
      ) {
        parent.postMessage({event, payload}, '*', transferable);
      },
    };
  }

  return new Bridge(wall) as BackendBridge;
}

export function initialize(contentWindow: any): void {
  installHook(contentWindow, componentFiltersPromise);
}
