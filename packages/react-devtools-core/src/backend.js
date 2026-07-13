/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import Agent from 'react-devtools-shared/src/backend/agent';
import Bridge from 'react-devtools-shared/src/bridge';
import {installHook} from 'react-devtools-shared/src/hook';
import {initBackend} from 'react-devtools-shared/src/backend';
import {__DEBUG__} from 'react-devtools-shared/src/constants';
import setupNativeStyleEditor from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';
import {
  getDefaultComponentFilters,
  getIsReloadAndProfileSupported,
} from 'react-devtools-shared/src/utils';

import type {BackendBridge} from 'react-devtools-shared/src/bridge';
import type {
  ComponentFilter,
  Wall,
} from 'react-devtools-shared/src/frontend/types';
import type {
  DevToolsHook,
  DevToolsHookSettings,
  ProfilingSettings,
} from 'react-devtools-shared/src/backend/types';
import type {ResolveNativeStyle} from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';

type ConnectOptions = {
  host?: string,
  nativeStyleEditorValidAttributes?: $ReadOnlyArray<string>,
  path?: string,
  port?: number,
  useHttps?: boolean,
  resolveRNStyle?: ResolveNativeStyle,
  retryConnectionDelay?: number,
  isAppActive?: () => boolean,
  websocket?: ?WebSocket,
  onSettingsUpdated?: (settings: $ReadOnly<DevToolsHookSettings>) => void,
  isReloadAndProfileSupported?: boolean,
  isProfiling?: boolean,
  onReloadAndProfile?: (recordChangeDescriptions: boolean) => void,
  onReloadAndProfileFlagsReset?: () => void,
};

let savedComponentFilters: Array<ComponentFilter> =
  getDefaultComponentFilters();

function debug(methodName: string, ...args: Array<mixed>) {
  // $FlowFixMe[constant-condition]
  if (__DEBUG__) {
    console.log(
      `%c[core/backend] %c${methodName}`,
      'color: teal; font-weight: bold;',
      'font-weight: bold;',
      ...args,
    );
  }
}

export function initialize(
  maybeSettingsOrSettingsPromise?:
    | DevToolsHookSettings
    | Promise<DevToolsHookSettings>,
  shouldStartProfilingNow: boolean = false,
  profilingSettings?: ProfilingSettings,
  maybeComponentFiltersOrComponentFiltersPromise?:
    | Array<ComponentFilter>
    | Promise<Array<ComponentFilter>>,
) {
  const componentFiltersOrComponentFiltersPromise =
    maybeComponentFiltersOrComponentFiltersPromise
      ? maybeComponentFiltersOrComponentFiltersPromise
      : savedComponentFilters;
  installHook(
    window,
    componentFiltersOrComponentFiltersPromise,
    maybeSettingsOrSettingsPromise,
    shouldStartProfilingNow,
    profilingSettings,
  );
}

export function connectToDevTools(options: ?ConnectOptions) {
  const hook: ?DevToolsHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook == null) {
    // DevTools didn't get injected into this page (maybe b'c of the contentType).
    return;
  }

  const {
    host = 'localhost',
    nativeStyleEditorValidAttributes,
    path = '',
    useHttps = false,
    port = 8097,
    websocket,
    resolveRNStyle = null as $FlowFixMe,
    retryConnectionDelay = 2000,
    isAppActive = () => true,
    onSettingsUpdated,
    isReloadAndProfileSupported = getIsReloadAndProfileSupported(),
    isProfiling,
    onReloadAndProfile,
    onReloadAndProfileFlagsReset,
  } = options || {};

  const protocol = useHttps ? 'wss' : 'ws';
  const prefixedPath = path !== '' && !path.startsWith('/') ? '/' + path : path;
  let retryTimeoutID: TimeoutID | null = null;

  function scheduleRetry() {
    if (retryTimeoutID === null) {
      // Two seconds because RN had issues with quick retries.
      retryTimeoutID = setTimeout(
        () => connectToDevTools(options),
        retryConnectionDelay,
      );
    }
  }

  if (!isAppActive()) {
    // If the app is in background, maybe retry later.
    // Don't actually attempt to connect until we're in foreground.
    scheduleRetry();
    return;
  }

  let bridge: BackendBridge | null = null;

  const messageListeners = [];
  const uri = protocol + '://' + host + ':' + port + prefixedPath;

  // If existing websocket is passed, use it.
  // This is necessary to support our custom integrations.
  // See D6251744.
  const ws = websocket ? websocket : new window.WebSocket(uri);
  ws.onclose = handleClose;
  ws.onerror = handleFailed;
  ws.onmessage = handleMessage;
  ws.onopen = function () {
    bridge = new Bridge({
      listen(fn) {
        messageListeners.push(fn);
        return () => {
          const index = messageListeners.indexOf(fn);
          if (index >= 0) {
            messageListeners.splice(index, 1);
          }
        };
      },
      send(event: string, payload: any, transferable?: Array<any>) {
        if (ws.readyState === ws.OPEN) {
          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug('wall.send()', event, payload);
          }

          ws.send(JSON.stringify({event, payload}));
        } else {
          // $FlowFixMe[constant-condition]
          if (__DEBUG__) {
            debug(
              'wall.send()',
              'Shutting down bridge because of closed WebSocket connection',
            );
          }

          if (bridge !== null) {
            bridge.shutdown();
          }

          scheduleRetry();
        }
      },
    });
    bridge.addListener(
      'updateComponentFilters',
      (componentFilters: Array<ComponentFilter>) => {
        // Save filter changes in memory, in case DevTools is reloaded.
        // In that case, the renderer will already be using the updated values.
        // We'll lose these in between backend reloads but that can't be helped.
        savedComponentFilters = componentFilters;
      },
    );

    // TODO (npm-packages) Warn if "isBackendStorageAPISupported"
    // $FlowFixMe[incompatible-type] found when upgrading Flow
    const agent = new Agent(bridge, isProfiling, onReloadAndProfile);
    if (typeof onReloadAndProfileFlagsReset === 'function') {
      onReloadAndProfileFlagsReset();
    }

    if (onSettingsUpdated != null) {
      agent.addListener('updateHookSettings', onSettingsUpdated);
    }
    agent.addListener('shutdown', () => {
      if (onSettingsUpdated != null) {
        agent.removeListener('updateHookSettings', onSettingsUpdated);
      }

      // If we received 'shutdown' from `agent`, we assume the `bridge` is already shutting down,
      // and that caused the 'shutdown' event on the `agent`, so we don't need to call `bridge.shutdown()` here.
      hook.emit('shutdown');
    });

    initBackend(hook, agent, window, isReloadAndProfileSupported);

    // Setup React Native style editor if the environment supports it.
    if (resolveRNStyle != null || hook.resolveRNStyle != null) {
      setupNativeStyleEditor(
        // $FlowFixMe[incompatible-type] found when upgrading Flow
        bridge,
        agent,
        // $FlowFixMe[constant-condition]
        (resolveRNStyle || hook.resolveRNStyle) as any as ResolveNativeStyle,
        nativeStyleEditorValidAttributes ||
          hook.nativeStyleEditorValidAttributes ||
          null,
      );
    } else {
      // Otherwise listen to detect if the environment later supports it.
      // For example, Flipper does not eagerly inject these values.
      // Instead it relies on the React Native Inspector to lazily inject them.
      let lazyResolveRNStyle;
      let lazyNativeStyleEditorValidAttributes;

      const initAfterTick = () => {
        if (bridge !== null) {
          setupNativeStyleEditor(
            bridge,
            agent,
            lazyResolveRNStyle,
            lazyNativeStyleEditorValidAttributes,
          );
        }
      };

      if (!hook.hasOwnProperty('resolveRNStyle')) {
        Object.defineProperty(hook, 'resolveRNStyle', {
          enumerable: false,
          get() {
            return lazyResolveRNStyle;
          },
          set(value: $FlowFixMe) {
            lazyResolveRNStyle = value;
            initAfterTick();
          },
        } as Object);
      }
      if (!hook.hasOwnProperty('nativeStyleEditorValidAttributes')) {
        Object.defineProperty(hook, 'nativeStyleEditorValidAttributes', {
          enumerable: false,
          get() {
            return lazyNativeStyleEditorValidAttributes;
          },
          set(value: $FlowFixMe) {
            lazyNativeStyleEditorValidAttributes = value;
            initAfterTick();
          },
        } as Object);
      }
    }
  };

  function handleClose() {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('WebSocket.onclose');
    }

    if (bridge !== null) {
      bridge.emit('shutdown');
    }

    scheduleRetry();
  }

  function handleFailed() {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('WebSocket.onerror');
    }

    scheduleRetry();
  }

  function handleMessage(event: MessageEvent<>) {
    let data;
    try {
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
        // $FlowFixMe[constant-condition]
        if (__DEBUG__) {
          debug('WebSocket.onmessage', data);
        }
      } else {
        throw Error();
      }
    } catch (e) {
      console.error(
        '[React DevTools] Failed to parse JSON: ' + (event.data as any),
      );
      return;
    }
    messageListeners.forEach(fn => {
      try {
        fn(data);
      } catch (error) {
        // jsc doesn't play so well with tracebacks that go into eval'd code,
        // so the stack trace here will stop at the `eval()` call. Getting the
        // message that caused the error is the best we can do for now.
        console.log('[React DevTools] Error calling listener', data);
        console.log('error:', error);
        throw error;
      }
    });
  }
}

type ConnectWithCustomMessagingOptions = {
  onSubscribe: (cb: Function) => void,
  onUnsubscribe: (cb: Function) => void,
  onMessage: (event: string, payload: any) => void,
  nativeStyleEditorValidAttributes?: $ReadOnlyArray<string>,
  resolveRNStyle?: ResolveNativeStyle,
  onSettingsUpdated?: (settings: $ReadOnly<DevToolsHookSettings>) => void,
  isReloadAndProfileSupported?: boolean,
  isProfiling?: boolean,
  onReloadAndProfile?: (recordChangeDescriptions: boolean) => void,
  onReloadAndProfileFlagsReset?: () => void,
};

export function connectWithCustomMessagingProtocol({
  onSubscribe,
  onUnsubscribe,
  onMessage,
  nativeStyleEditorValidAttributes,
  resolveRNStyle,
  onSettingsUpdated,
  isReloadAndProfileSupported = getIsReloadAndProfileSupported(),
  isProfiling,
  onReloadAndProfile,
  onReloadAndProfileFlagsReset,
}: ConnectWithCustomMessagingOptions): Function {
  const hook: ?DevToolsHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook == null) {
    // DevTools didn't get injected into this page (maybe b'c of the contentType).
    return;
  }

  const wall: Wall = {
    listen(fn: Function) {
      onSubscribe(fn);

      return () => {
        onUnsubscribe(fn);
      };
    },
    send(event: string, payload: any) {
      onMessage(event, payload);
    },
  };

  const bridge: BackendBridge = new Bridge(wall);

  bridge.addListener(
    'updateComponentFilters',
    (componentFilters: Array<ComponentFilter>) => {
      // Save filter changes in memory, in case DevTools is reloaded.
      // In that case, the renderer will already be using the updated values.
      // We'll lose these in between backend reloads but that can't be helped.
      savedComponentFilters = componentFilters;
    },
  );

  const agent = new Agent(bridge, isProfiling, onReloadAndProfile);
  if (typeof onReloadAndProfileFlagsReset === 'function') {
    onReloadAndProfileFlagsReset();
  }

  if (onSettingsUpdated != null) {
    agent.addListener('updateHookSettings', onSettingsUpdated);
  }
  agent.addListener('shutdown', () => {
    if (onSettingsUpdated != null) {
      agent.removeListener('updateHookSettings', onSettingsUpdated);
    }

    // If we received 'shutdown' from `agent`, we assume the `bridge` is already shutting down,
    // and that caused the 'shutdown' event on the `agent`, so we don't need to call `bridge.shutdown()` here.
    hook.emit('shutdown');
  });

  const unsubscribeBackend = initBackend(
    hook,
    agent,
    window,
    isReloadAndProfileSupported,
  );

  const nativeStyleResolver: ResolveNativeStyle | void =
    resolveRNStyle || hook.resolveRNStyle;

  if (nativeStyleResolver != null) {
    const validAttributes =
      nativeStyleEditorValidAttributes ||
      hook.nativeStyleEditorValidAttributes ||
      null;

    setupNativeStyleEditor(bridge, agent, nativeStyleResolver, validAttributes);
  }

  return unsubscribeBackend;
}
