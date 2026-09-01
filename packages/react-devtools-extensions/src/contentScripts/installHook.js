/** @flow */

import type {UnknownMessageEvent} from './messages';
import type {DevToolsHookSettings} from 'react-devtools-shared/src/backend/types';
import type {ComponentFilter} from 'react-devtools-shared/src/frontend/types';

import {installHook} from 'react-devtools-shared/src/hook';
import {
  getIfReloadedAndProfiling,
  getProfilingSettings,
} from 'react-devtools-shared/src/utils';
import {postMessage} from './messages';
import {createReactRendererListener} from './reactBuildType';

let resolveHookSettingsInjection: (settings: DevToolsHookSettings) => void;
let resolveComponentFiltersInjection: (filters: Array<ComponentFilter>) => void;

function messageListener(event: UnknownMessageEvent) {
  if (event.source !== window) {
    return;
  }

  if (event.data.source === 'react-devtools-settings-injector') {
    const payload = event.data.payload;
    // In case handshake message was sent prior to hookSettingsInjector execution
    // We can't guarantee order
    if (payload.handshake) {
      postMessage({
        source: 'react-devtools-hook-installer',
        payload: {handshake: true},
      });
    } else if (payload.hookSettings) {
      window.removeEventListener('message', messageListener);
      resolveHookSettingsInjection(payload.hookSettings);
      resolveComponentFiltersInjection(payload.componentFilters);
    }
  }
}

// Avoid double execution
if (!window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
  const hookSettingsPromise = new Promise<DevToolsHookSettings>(resolve => {
    resolveHookSettingsInjection = resolve;
  });
  const componentFiltersPromise = new Promise<Array<ComponentFilter>>(
    resolve => {
      resolveComponentFiltersInjection = resolve;
    },
  );

  window.addEventListener('message', messageListener);
  postMessage({
    source: 'react-devtools-hook-installer',
    payload: {handshake: true},
  });

  const shouldStartProfiling = getIfReloadedAndProfiling();
  const profilingSettings = getProfilingSettings();
  // Can't delay hook installation, inject settings lazily
  installHook(
    window,
    componentFiltersPromise,
    hookSettingsPromise,
    shouldStartProfiling,
    profilingSettings,
  );

  // Detect React
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.on(
    'renderer',
    createReactRendererListener(window),
  );
}
