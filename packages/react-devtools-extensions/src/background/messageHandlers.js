/* global chrome */

import {__DEBUG__} from 'react-devtools-shared/src/constants';
import setExtensionIconAndPopup from './setExtensionIconAndPopup';
import {executeScriptInMainWorld} from './executeScript';

import {EXTENSION_CONTAINED_VERSIONS} from '../utils';

export function handleReactDevToolsHookMessage(message, sender) {
  const {payload} = message;

  switch (payload?.type) {
    case 'react-renderer-attached': {
      setExtensionIconAndPopup(payload.reactBuildType, sender.tab.id);

      break;
    }
  }
}

export function handleBackendManagerMessage(message, sender) {
  const {payload} = message;

  switch (payload?.type) {
    case 'require-backends': {
      payload.versions.forEach(version => {
        if (EXTENSION_CONTAINED_VERSIONS.includes(version)) {
          executeScriptInMainWorld({
            injectImmediately: true,
            target: {tabId: sender.tab.id},
            files: [`/build/react_devtools_backend_${version}.js`],
          });
        }
      });

      break;
    }
  }
}

export function handleDevToolsPageMessage(message) {
  const {payload} = message;

  switch (payload?.type) {
    // Proxy this message from DevTools page to content script via chrome.tabs.sendMessage
    case 'fetch-file-with-cache': {
      const {
        payload: {tabId, url},
      } = message;

      if (!tabId || !url) {
        // Send a response straight away to get the Promise fulfilled.
        chrome.runtime.sendMessage({
          source: 'react-devtools-background',
          payload: {
            type: 'fetch-file-with-cache-error',
            url,
            value: null,
          },
        });
      } else {
        chrome.tabs.sendMessage(tabId, {
          source: 'devtools-page',
          payload: {
            type: 'fetch-file-with-cache',
            url,
          },
        });
      }

      break;
    }

    case 'inject-backend-manager': {
      const {
        payload: {tabId},
      } = message;

      if (!tabId) {
        throw new Error("Couldn't inject backend manager: tabId not specified");
      }

      executeScriptInMainWorld({
        injectImmediately: true,
        target: {tabId},
        files: ['/build/backendManager.js'],
      }).then(
        () => {
          if (__DEBUG__) {
            console.log('Successfully injected backend manager');
          }
        },
        reason => {
          console.error('Failed to inject backend manager:', reason);
        },
      );

      break;
    }

    case 'eval-in-inspected-window': {
      const {
        payload: {tabId, requestId, scriptId, args},
      } = message;

      chrome.tabs
        .sendMessage(tabId, {
          source: 'devtools-page-eval',
          payload: {
            scriptId,
            args,
          },
        })
        .then(response => {
          if (!response) {
            chrome.runtime.sendMessage({
              source: 'react-devtools-background',
              payload: {
                type: 'eval-in-inspected-window-response',
                requestId,
                result: null,
                error: 'No response from content script',
              },
            });
            return;
          }
          const {result, error} = response;
          chrome.runtime.sendMessage({
            source: 'react-devtools-background',
            payload: {
              type: 'eval-in-inspected-window-response',
              requestId,
              result,
              error,
            },
          });
        })
        .catch(error => {
          chrome.runtime.sendMessage({
            source: 'react-devtools-background',
            payload: {
              type: 'eval-in-inspected-window-response',
              requestId,
              result: null,
              error: error?.message || String(error),
            },
          });
        });

      break;
    }
  }
}

export function handleFetchResourceContentScriptMessage(message) {
  const {payload} = message;

  switch (payload?.type) {
    case 'fetch-file-with-cache-complete':
    case 'fetch-file-with-cache-error':
      // Forward the result of fetch-in-page requests back to the DevTools page.
      // We switch the source here because of inconsistency between Firefox and Chrome
      // In Chromium this message will be propagated from content script to DevTools page
      // For Firefox, only background script will get this message, so we need to forward it to DevTools page
      chrome.runtime.sendMessage({
        source: 'react-devtools-background',
        payload,
      });
      break;
  }
}
