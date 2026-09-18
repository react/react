/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  DevToolsHook,
  ReactRenderer,
} from 'react-devtools-shared/src/backend/types';
import {hasAssignedBackend} from 'react-devtools-shared/src/backend/utils';
import {COMPACT_VERSION_NAME} from 'react-devtools-extensions/src/utils';
import {getIsReloadAndProfileSupported} from 'react-devtools-shared/src/utils';
import {
  getIfReloadedAndProfiling,
  onReloadAndProfile,
  onReloadAndProfileFlagsReset,
} from 'react-devtools-shared/src/utils';

let welcomeHasInitialized = false;
const requiredBackends = new Set<string>();
const activeBackendsShutdownCallbacks = new Set<() => void>();
let cleanupBackendManagerSetup: (() => void) | null = null;
let hasShutdownBackendManager = false;

function finishBackendManagerShutdown() {
  if (hasShutdownBackendManager) {
    return;
  }
  hasShutdownBackendManager = true;

  window.removeEventListener('message', welcome);
  window.removeEventListener('pagehide', handlePageHide);

  const cleanup = cleanupBackendManagerSetup;
  cleanupBackendManagerSetup = null;
  cleanup?.();

  delete window.__REACT_DEVTOOLS_BACKEND_MANAGER_INJECTED__;
}

function handlePageHide() {
  // A document in the back-forward cache keeps its JavaScript heap but loses
  // its extension messaging port. Shut down locally while the document is
  // still active so a restored page can attach a new Agent and replay its tree.
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const shutdownBackend of activeBackendsShutdownCallbacks) {
    shutdownBackend();
  }

  finishBackendManagerShutdown();
}

function welcome(event: $FlowFixMe) {
  if (
    event.source !== window ||
    event.data.source !== 'react-devtools-content-script'
  ) {
    return;
  }

  // In some circumstances, this method is called more than once for a single welcome message.
  // The exact circumstances of this are unclear, though it seems related to 3rd party event batching code.
  //
  // Regardless, call this method multiple times can cause DevTools to add duplicate elements to the Store
  // (and throw an error) or worse yet, choke up entirely and freeze the browser.
  //
  // The simplest solution is to ignore the duplicate events.
  // To be clear, this SHOULD NOT BE NECESSARY, since we remove the event handler below.
  //
  // See https://github.com/facebook/react/issues/24162
  if (welcomeHasInitialized) {
    console.warn(
      'React DevTools detected duplicate welcome "message" events from the content script.',
    );
    return;
  }

  welcomeHasInitialized = true;

  window.removeEventListener('message', welcome);

  setup(window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
}

function setup(hook: ?DevToolsHook) {
  // this should not happen, but Chrome can be weird sometimes
  if (hook == null) {
    return;
  }

  // register renderers that have already injected themselves.
  hook.renderers.forEach(renderer => {
    registerRenderer(renderer, hook);
  });

  // Activate and remove from required all present backends, registered within the hook
  hook.backends.forEach((_, backendVersion) => {
    requiredBackends.delete(backendVersion);
    activateBackend(backendVersion, hook);
  });

  updateRequiredBackends();

  // register renderers that inject themselves later.
  const unsubscribeRendererListener = hook.sub('renderer', ({renderer}) => {
    registerRenderer(renderer, hook);
    updateRequiredBackends();
  });

  // listen for backend installations.
  const unsubscribeBackendInstallationListener = hook.sub(
    'devtools-backend-installed',
    version => {
      activateBackend(version, hook);
      updateRequiredBackends();
    },
  );

  let didCleanup = false;
  let unsubscribeShutdownListener: (() => void) | null = null;
  const cleanup = () => {
    if (didCleanup) {
      return;
    }
    didCleanup = true;

    unsubscribeRendererListener();
    unsubscribeBackendInstallationListener();
    unsubscribeShutdownListener?.();
    unsubscribeShutdownListener = null;

    if (cleanupBackendManagerSetup === cleanup) {
      cleanupBackendManagerSetup = null;
    }
  };

  unsubscribeShutdownListener = hook.sub('shutdown', cleanup);
  cleanupBackendManagerSetup = cleanup;
}

function registerRenderer(renderer: ReactRenderer, hook: DevToolsHook) {
  let version = renderer.reconcilerVersion || renderer.version;
  if (!hasAssignedBackend(version)) {
    version = COMPACT_VERSION_NAME;
  }

  // Check if required backend is already activated, no need to require again
  if (!hook.backends.has(version)) {
    requiredBackends.add(version);
  }
}

function activateBackend(version: string, hook: DevToolsHook) {
  const backend = hook.backends.get(version);
  if (!backend) {
    throw new Error(`Could not find backend for version "${version}"`);
  }

  const {Agent, Bridge, initBackend, setupNativeStyleEditor} = backend;
  let shouldSendMessages = true;
  const bridge = new Bridge({
    listen(fn) {
      const listener = (event: $FlowFixMe) => {
        if (
          event.source !== window ||
          !event.data ||
          event.data.source !== 'react-devtools-content-script' ||
          !event.data.payload
        ) {
          return;
        }
        fn(event.data.payload);
      };
      window.addEventListener('message', listener);
      return () => {
        window.removeEventListener('message', listener);
      };
    },
    send(event: string, payload: mixed, transferable?: $ReadOnlyArray<mixed>) {
      if (!shouldSendMessages) {
        return;
      }

      window.postMessage(
        {
          source: 'react-devtools-bridge',
          payload: {event, payload},
        },
        '*',
        transferable,
      );
    },
  });

  const agent = new Agent(
    bridge,
    getIfReloadedAndProfiling(),
    onReloadAndProfile,
  );
  // Agent read flags successfully, we can count it as successful launch
  // Clean up flags, so that next reload won't start profiling
  onReloadAndProfileFlagsReset();

  let hasShutdownBackend = false;
  const shutdownBackend = () => {
    if (hasShutdownBackend) {
      return;
    }
    hasShutdownBackend = true;
    shouldSendMessages = false;

    bridge.shutdown();
  };
  activeBackendsShutdownCallbacks.add(shutdownBackend);

  agent.addListener('shutdown', () => {
    hasShutdownBackend = true;
    shouldSendMessages = false;
    activeBackendsShutdownCallbacks.delete(shutdownBackend);

    hook.emit('shutdown');

    if (activeBackendsShutdownCallbacks.size === 0) {
      finishBackendManagerShutdown();
    }
  });

  initBackend(hook, agent, window, getIsReloadAndProfileSupported());

  // Setup React Native style editor if a renderer like react-native-web has injected it.
  if (typeof setupNativeStyleEditor === 'function' && hook.resolveRNStyle) {
    setupNativeStyleEditor(
      bridge,
      agent,
      hook.resolveRNStyle,
      hook.nativeStyleEditorValidAttributes,
    );
  }

  // Let the frontend know that the backend has attached listeners and is ready for messages.
  // This covers the case of syncing saved values after reloading/navigating while DevTools remain open.
  bridge.send('extensionBackendInitialized');

  // this backend is activated
  requiredBackends.delete(version);
}

// tell the service worker which versions of backends are needed for the current page
function updateRequiredBackends() {
  if (requiredBackends.size === 0) {
    return;
  }

  window.postMessage(
    {
      source: 'react-devtools-backend-manager',
      payload: {
        type: 'require-backends',
        versions: Array.from(requiredBackends),
      },
    },
    '*',
  );
}

/*
 * Make sure this is executed only once in case Frontend is reloaded multiple times while Backend is initializing
 * We can't use `reactDevToolsAgent` field on a global Hook object, because it only cleaned up after both Frontend and Backend initialized
 */
if (!window.__REACT_DEVTOOLS_BACKEND_MANAGER_INJECTED__) {
  window.__REACT_DEVTOOLS_BACKEND_MANAGER_INJECTED__ = true;

  window.addEventListener('message', welcome);
  window.addEventListener('pagehide', handlePageHide);
}
