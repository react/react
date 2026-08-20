/* global chrome */

function injectBackendManager(tabId) {
  chrome.runtime.sendMessage({
    source: 'devtools-page',
    payload: {
      type: 'inject-backend-manager',
      tabId,
    },
  });
}

export default injectBackendManager;
