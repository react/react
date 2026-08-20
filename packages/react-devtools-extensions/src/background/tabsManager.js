/* global chrome */

'use strict';

import setExtensionIconAndPopup from './setExtensionIconAndPopup';

function isRestrictedBrowserPage(url) {
  if (!url) {
    return true;
  }

  const urlProtocol = new URL(url).protocol;
  return urlProtocol === 'chrome:' || urlProtocol === 'about:';
}

function checkAndHandleRestrictedPageIfSo(tab) {
  if (tab && isRestrictedBrowserPage(tab.url)) {
    setExtensionIconAndPopup('restricted', tab.id);
  }
}

// Update popup page of any existing open tabs, if they are restricted browser pages
chrome.tabs.query({}, tabs => tabs.forEach(checkAndHandleRestrictedPageIfSo));
chrome.tabs.onCreated.addListener(tab => checkAndHandleRestrictedPageIfSo(tab));

// Listen to URL changes on the active tab and update the DevTools icon.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && isRestrictedBrowserPage(changeInfo.url)) {
    setExtensionIconAndPopup('restricted', tabId);
  }
});
