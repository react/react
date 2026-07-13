/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* global chrome */

'use strict';

function injectProxy() {
  // Firefox's behaviour for injecting this content script can be unpredictable
  // While navigating the history, some content scripts might not be re-injected and still be alive
  if (!window.__REACT_DEVTOOLS_PROXY_INJECTED__) {
    window.__REACT_DEVTOOLS_PROXY_INJECTED__ = true;

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

let port = null;
let backendInitialized: boolean = false;

function sayHelloToBackendManager() {
  window.postMessage(
    {
      source: 'react-devtools-content-script',
      hello: true,
    },
    '*',
  );
}

function handleMessageFromDevtools(message: any) {
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

      // $FlowFixMe[incompatible-use]
      port.postMessage(event.data.payload);
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

function handleDisconnect() {
  window.removeEventListener('message', handleMessageFromPage);
  port = null;

  connectPort();
}

// Creates port from application page to the React DevTools' service worker
// Which then connects it with extension port
function connectPort() {
  port = chrome.runtime.connect({
    name: 'proxy',
  });

  window.addEventListener('message', handleMessageFromPage);

  // $FlowFixMe[incompatible-use]
  port.onMessage.addListener(handleMessageFromDevtools);
  // $FlowFixMe[incompatible-use]
  port.onDisconnect.addListener(handleDisconnect);
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
