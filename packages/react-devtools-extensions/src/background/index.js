/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* global chrome, ExtensionRuntimePort */

'use strict';

import './dynamicallyInjectContentScripts';
import './tabsManager';

import {
  handleDevToolsPageMessage,
  handleBackendManagerMessage,
  handleReactDevToolsHookMessage,
  handleFetchResourceContentScriptMessage,
} from './messageHandlers';

const ports: {
  // TODO: Check why we convert tab IDs to strings, and if we can avoid it
  [tabId: string]: {
    extension: ExtensionRuntimePort | null,
    proxy: ExtensionRuntimePort | null,
    disconnectPipe: Function | null,
  },
} = {};

function registerTab(tabId: number) {
  // $FlowFixMe[incompatible-type]
  if (!ports[tabId]) {
    // $FlowFixMe[incompatible-type]
    ports[tabId] = {
      extension: null,
      proxy: null,
      disconnectPipe: null,
    };
  }
}

function registerExtensionPort(port: ExtensionRuntimePort, tabId: number) {
  // $FlowFixMe[incompatible-type]
  ports[tabId].extension = port;

  port.onDisconnect.addListener(() => {
    // This should delete disconnectPipe from ports dictionary
    // $FlowFixMe[incompatible-type]
    ports[tabId].disconnectPipe?.();

    // $FlowFixMe[incompatible-type]
    ports[tabId].extension = null;
  });
}

function registerProxyPort(port: ExtensionRuntimePort, tabId: string) {
  ports[tabId].proxy = port;

  // In case proxy port was disconnected from the other end, from content script
  // This can happen if content script was detached, when user does in-tab navigation
  // This listener should never be called when we call port.disconnect() from this (background/index.js) script
  port.onDisconnect.addListener(() => {
    ports[tabId].disconnectPipe?.();

    ports[tabId].proxy = null;
  });
}

function isNumeric(str: string): boolean {
  return +str + '' === str;
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'proxy') {
    // Might not be present for restricted pages in Firefox
    if (port.sender?.tab?.id == null) {
      // Not disconnecting it, so it would not reconnect
      return;
    }

    // Proxy content script is executed in tab, so it should have it specified.
    const tabId = port.sender.tab.id;

    // $FlowFixMe[incompatible-type]
    const registeredPort = ports[tabId];
    const proxy = registeredPort?.proxy;
    if (proxy) {
      registeredPort.disconnectPipe?.();
      proxy.disconnect();
    }

    registerTab(tabId);
    registerProxyPort(
      port,
      // $FlowFixMe[incompatible-type]
      tabId,
    );

    // $FlowFixMe[incompatible-type]
    if (ports[tabId].extension) {
      connectExtensionAndProxyPorts(
        ports[tabId].extension,
        ports[tabId].proxy,
        tabId,
      );
    }

    return;
  }

  if (isNumeric(port.name)) {
    // DevTools page port doesn't have tab id specified, because its sender is the extension.
    const tabId = +port.name;

    registerTab(tabId);
    registerExtensionPort(
      port,
      // $FlowFixMe[incompatible-call]
      tabId,
    );

    // $FlowFixMe[incompatible-type]
    if (ports[tabId].proxy) {
      connectExtensionAndProxyPorts(
        ports[tabId].extension,
        ports[tabId].proxy,
        tabId,
      );
    }

    return;
  }

  // I am not sure if we should throw here
  console.warn(`Unknown port ${port.name} connected`);
});

function connectExtensionAndProxyPorts(
  maybeExtensionPort: ExtensionRuntimePort | null,
  maybeProxyPort: ExtensionRuntimePort | null,
  tabId: number,
) {
  if (!maybeExtensionPort) {
    throw new Error(
      `Attempted to connect ports, when extension port is not present`,
    );
  }
  const extensionPort = maybeExtensionPort;

  if (!maybeProxyPort) {
    throw new Error(
      `Attempted to connect ports, when proxy port is not present`,
    );
  }
  const proxyPort = maybeProxyPort;

  // $FlowFixMe[incompatible-type]
  if (ports[tabId].disconnectPipe) {
    throw new Error(
      `Attempted to connect already connected ports for tab with id ${tabId}`,
    );
  }

  function extensionPortMessageListener(message: any) {
    try {
      proxyPort.postMessage(message);
    } catch (e) {
      if (__DEV__) {
        console.log(`Broken pipe ${tabId}: `, e);
      }

      disconnectListener();
    }
  }

  function proxyPortMessageListener(message: any) {
    try {
      extensionPort.postMessage(message);
    } catch (e) {
      if (__DEV__) {
        console.log(`Broken pipe ${tabId}: `, e);
      }

      disconnectListener();
    }
  }

  function disconnectListener() {
    extensionPort.onMessage.removeListener(extensionPortMessageListener);
    proxyPort.onMessage.removeListener(proxyPortMessageListener);

    // We handle disconnect() calls manually, based on each specific case
    // No need to disconnect other port here

    // $FlowFixMe[incompatible-type]
    delete ports[tabId].disconnectPipe;
  }

  ports[tabId].disconnectPipe = disconnectListener;

  extensionPort.onMessage.addListener(extensionPortMessageListener);
  proxyPort.onMessage.addListener(proxyPortMessageListener);

  extensionPort.onDisconnect.addListener(disconnectListener);
  proxyPort.onDisconnect.addListener(disconnectListener);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message?.source) {
    case 'devtools-page': {
      handleDevToolsPageMessage(message);
      break;
    }
    case 'react-devtools-fetch-resource-content-script': {
      handleFetchResourceContentScriptMessage(message);
      break;
    }
    case 'react-devtools-backend-manager': {
      handleBackendManagerMessage(message, sender);
      break;
    }
    case 'react-devtools-hook': {
      handleReactDevToolsHookMessage(message, sender);
    }
  }
});

chrome.tabs.onActivated.addListener(({tabId: activeTabId}) => {
  for (const registeredTabId in ports) {
    if (
      ports[registeredTabId].proxy != null &&
      ports[registeredTabId].extension != null
    ) {
      const numericRegisteredTabId = +registeredTabId;
      const event =
        activeTabId === numericRegisteredTabId
          ? 'resumeElementPolling'
          : 'pauseElementPolling';

      ports[registeredTabId].extension.postMessage({event});
    }
  }
});
