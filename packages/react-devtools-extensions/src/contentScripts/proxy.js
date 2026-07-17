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

import {
  EXTENSION_BRIDGE_CONNECTION_DISCONNECTED,
  EXTENSION_BRIDGE_CONNECTION_READY,
  getExtensionBridgeConnectionType,
} from '../constants';

function injectProxy() {
  // Firefox's behaviour for injecting this content script can be unpredictable
  // While navigating the history, some content scripts might not be re-injected and still be alive
  if (!window.__REACT_DEVTOOLS_PROXY_INJECTED__) {
    window.__REACT_DEVTOOLS_PROXY_INJECTED__ = true;

    listenToMessagesFromBackend();
    connectPort();
    sayHelloToBackendManager();

    // The backend waits to install the global hook until notified by the content script.
    // In the event of a page reload, the content script might be loaded before the backend manager is injected.
    // Because of this we need to poll the backend manager until it has been initialized.
    const intervalID: IntervalID = setInterval(() => {
      if (backendInitialized) {
        clearInterval(intervalID);
      } else {
        sayHelloToBackendManager();
      }
    }, 500);
  }
}

function handlePageShow() {
  if (document.prerendering) {
    // React DevTools can't handle multiple documents being connected to the same extension port.
    // However, browsers are firing pageshow events while prerendering (https://issues.chromium.org/issues/489633225).
    // We need to wait until prerendering is finished before injecting the proxy.
    // In browsers with pagereveal support, listening to pagereveal would be sufficient.
    // Waiting for prerenderingchange is a workaround to support browsers that
    // have speculationrules but not pagereveal.
    document.addEventListener('prerenderingchange', injectProxy, {once: true});
  } else {
    injectProxy();
  }
}

window.addEventListener('pagereveal', injectProxy);
// For backwards compat with browsers not implementing `pagereveal` which is a fairly new event.
window.addEventListener('pageshow', handlePageShow);

window.addEventListener('pagehide', function ({target}) {
  if (target !== window.document) {
    return;
  }

  delete window.__REACT_DEVTOOLS_PROXY_INJECTED__;
});

let port: ExtensionRuntimePort | null = null;
let backendInitialized: boolean = false;
let isBridgeConnected: boolean = false;
let isListeningToMessagesFromBackend: boolean = false;
const pendingMessages: Array<mixed> = [];

function listenToMessagesFromBackend() {
  if (!isListeningToMessagesFromBackend) {
    window.addEventListener('message', handleMessageFromPage);
    isListeningToMessagesFromBackend = true;
  }
}

function flushPendingMessages(): boolean {
  const currentPort = port;
  if (!isBridgeConnected || currentPort === null) {
    return false;
  }

  let sentCount = 0;
  while (sentCount < pendingMessages.length) {
    try {
      currentPort.postMessage(pendingMessages[sentCount]);
      sentCount++;
    } catch (error) {
      isBridgeConnected = false;
      break;
    }
  }

  if (sentCount > 0) {
    pendingMessages.splice(0, sentCount);
  }

  return isBridgeConnected && pendingMessages.length === 0;
}

function sayHelloToBackendManager() {
  window.postMessage(
    {
      source: 'react-devtools-content-script',
      hello: true,
    },
    '*',
  );
}

function handleMessageFromDevtools(
  sourcePort: ExtensionRuntimePort,
  message: mixed,
) {
  if (port !== sourcePort) {
    return;
  }

  switch (getExtensionBridgeConnectionType(message)) {
    case EXTENSION_BRIDGE_CONNECTION_READY:
      isBridgeConnected = true;
      if (flushPendingMessages()) {
        const currentPort = port;
        if (currentPort === null) {
          // The port may disconnect synchronously while its queue is flushed.
          return;
        }
        try {
          // This travels through the forwarding pipe after all queued backend
          // messages, so the frontend can safely flush its command queue.
          currentPort.postMessage(message);
        } catch (error) {
          isBridgeConnected = false;
        }
      }
      return;
    case EXTENSION_BRIDGE_CONNECTION_DISCONNECTED:
      isBridgeConnected = false;
      return;
  }

  window.postMessage(
    {
      source: 'react-devtools-content-script',
      payload: message,
    },
    '*',
  );
}

function handleMessageFromPage(event: any) {
  if (event.source !== window || !event.data) {
    return;
  }

  switch (event.data.source) {
    // This is a message from a bridge (initialized by a devtools backend)
    case 'react-devtools-bridge': {
      backendInitialized = true;

      pendingMessages.push(event.data.payload);
      flushPendingMessages();
      break;
    }

    // This is a message from the backend manager, which runs in ExecutionWorld.MAIN
    // and can't use `chrome.runtime.sendMessage`
    case 'react-devtools-backend-manager': {
      const {source, payload} = event.data;

      chrome.runtime.sendMessage({
        source,
        payload,
      });
      break;
    }
  }
}

function handleDisconnect(disconnectedPort: ExtensionRuntimePort) {
  if (port !== disconnectedPort) {
    return;
  }

  isBridgeConnected = false;
  port = null;

  // Mirrors the guard in handlePageShow(): the background script can evict/
  // replace a tab's proxy port (see registerProxyPort in background/index.js),
  // which disconnects us while still prerendering. Reconnecting immediately
  // in that case causes an unbounded connect/disconnect cycle for as long as
  // the document stays in the prerendering state (https://crbug.com/478909972).
  if (document.prerendering) {
    document.addEventListener('prerenderingchange', connectPort, {
      once: true,
    });
  } else {
    connectPort();
  }
}

// Creates port from application page to the React DevTools' service worker
// Which then connects it with extension port
function connectPort() {
  isBridgeConnected = false;
  const nextPort = chrome.runtime.connect({
    name: 'proxy',
  });
  port = nextPort;

  listenToMessagesFromBackend();

  nextPort.onMessage.addListener(message =>
    handleMessageFromDevtools(nextPort, message),
  );
  nextPort.onDisconnect.addListener(() => handleDisconnect(nextPort));
}

let evalRequestId = 0;
const evalRequestCallbacks = new Map<number, Function>();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg?.source) {
    case 'devtools-page-eval': {
      const {scriptId, args} = msg.payload;
      const requestId = evalRequestId++;
      window.postMessage(
        {
          source: 'react-devtools-content-script-eval',
          payload: {
            requestId,
            scriptId,
            args,
          },
        },
        '*',
      );
      evalRequestCallbacks.set(requestId, sendResponse);
      return true; // Indicate we will respond asynchronously
    }
  }
});

window.addEventListener('message', event => {
  if (event.data?.source === 'react-devtools-content-script-eval-response') {
    const {requestId, response} = event.data.payload;
    const callback = evalRequestCallbacks.get(requestId);
    try {
      if (!callback)
        throw new Error(
          `No eval request callback for id "${requestId}" exists.`,
        );
      callback(response);
    } catch (e) {
      console.warn(
        'React DevTools Content Script eval response error occurred:',
        e,
      );
    } finally {
      evalRequestCallbacks.delete(requestId);
    }
  }
});
