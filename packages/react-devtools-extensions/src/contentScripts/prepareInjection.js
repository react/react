/* global chrome */

let lastSentDevToolsHookMessage;

// We want to detect when a renderer attaches, and notify the "background page"
// (which is shared between tabs and can highlight the React icon).
// Currently we are in "content script" context, so we can't listen to the hook directly
// (it will be injected directly into the page).
// So instead, the hook will use postMessage() to pass message to us here.
// And when this happens, we'll send a message to the "background page".
window.addEventListener('message', function onMessage({data, source}) {
  if (source !== window || !data) {
    return;
  }

  // We keep this logic here and not in `proxy.js`, because proxy content script is injected later at `document_end`
  if (data.source === 'react-devtools-hook') {
    const {source: messageSource, payload} = data;
    const message = {source: messageSource, payload};

    lastSentDevToolsHookMessage = message;
    chrome.runtime.sendMessage(message);
  }
});

// NOTE: Firefox WebExtensions content scripts are still alive and not re-injected
// while navigating the history to a document that has not been destroyed yet,
// replay the last detection result if the content script is active and the
// document has been hidden and shown again.
window.addEventListener('pageshow', function ({target}) {
  if (!lastSentDevToolsHookMessage || target !== window.document) {
    return;
  }

  chrome.runtime.sendMessage(lastSentDevToolsHookMessage);
});
