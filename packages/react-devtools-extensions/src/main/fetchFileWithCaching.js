/* global chrome */

import {normalizeUrlIfValid} from 'react-devtools-shared/src/utils';
import {__DEBUG__} from 'react-devtools-shared/src/constants';

let debugIDCounter = 0;

const debugLog = (...args) => {
  if (__DEBUG__) {
    console.log(...args);
  }
};

const fetchFromNetworkCache = (url, resolve, reject) => {
  // Debug ID allows us to avoid re-logging (potentially long) URL strings below,
  // while also still associating (potentially) interleaved logs with the original request.
  let debugID = null;

  if (__DEBUG__) {
    debugID = debugIDCounter++;
    debugLog(`[main] fetchFromNetworkCache(${debugID})`, url);
  }

  chrome.devtools.network.getHAR(harLog => {
    for (let i = 0; i < harLog.entries.length; i++) {
      const entry = harLog.entries[i];
      if (url !== entry.request.url) {
        continue;
      }

      debugLog(
        `[main] fetchFromNetworkCache(${debugID}) Found matching URL in HAR`,
        url,
      );

      if (entry.getContent != null) {
        entry.getContent(content => {
          if (content) {
            debugLog(
              `[main] fetchFromNetworkCache(${debugID}) Content retrieved`,
            );

            resolve(content);
          } else {
            debugLog(
              `[main] fetchFromNetworkCache(${debugID}) Invalid content returned by getContent()`,
              content,
            );

            // Edge case where getContent() returned null; fall back to fetch.
            fetchFromPage(url, resolve, reject);
          }
        });
      } else {
        const content = entry.response.content.text;

        if (content != null) {
          debugLog(
            `[main] fetchFromNetworkCache(${debugID}) Content retrieved`,
          );
          resolve(content);
        } else {
          debugLog(
            `[main] fetchFromNetworkCache(${debugID}) Invalid content returned from entry.response.content`,
            content,
          );
          fetchFromPage(url, resolve, reject);
        }
      }
    }

    debugLog(
      `[main] fetchFromNetworkCache(${debugID}) No cached request found in getHAR()`,
    );

    // No matching URL found; fall back to fetch.
    fetchFromPage(url, resolve, reject);
  });
};

const pendingFetchRequests = new Set();
function pendingFetchRequestsCleanup({payload, source}) {
  if (source === 'react-devtools-background') {
    switch (payload?.type) {
      case 'fetch-file-with-cache-complete':
      case 'fetch-file-with-cache-error':
        pendingFetchRequests.delete(payload.url);
    }
  }
}
chrome.runtime.onMessage.addListener(pendingFetchRequestsCleanup);

const fetchFromPage = async (url, resolve, reject) => {
  debugLog('[main] fetchFromPage()', url);

  function onPortMessage({payload, source}) {
    if (source === 'react-devtools-background' && payload?.url === url) {
      switch (payload?.type) {
        case 'fetch-file-with-cache-complete':
          chrome.runtime.onMessage.removeListener(onPortMessage);
          resolve(payload.value);
          break;
        case 'fetch-file-with-cache-error':
          chrome.runtime.onMessage.removeListener(onPortMessage);
          reject(payload.value);
          break;
      }
    }
  }

  chrome.runtime.onMessage.addListener(onPortMessage);
  if (pendingFetchRequests.has(url)) {
    return;
  }

  pendingFetchRequests.add(url);
  chrome.runtime.sendMessage({
    source: 'devtools-page',
    payload: {
      type: 'fetch-file-with-cache',
      tabId: chrome.devtools.inspectedWindow.tabId,
      url,
    },
  });
};

// 1. Check if resource is available via chrome.devtools.inspectedWindow.getResources
// 2. Check if resource was loaded previously and available in network cache via chrome.devtools.network.getHAR
// 3. Fallback to fetching directly from the page context (from backend)
async function fetchFileWithCaching(url: string): Promise<string> {
  if (__IS_CHROME__ || __IS_EDGE__) {
    const resources = await new Promise(resolve =>
      chrome.devtools.inspectedWindow.getResources(r => resolve(r)),
    );

    const normalizedReferenceURL = normalizeUrlIfValid(url);
    const resource = resources.find(r => r.url === normalizedReferenceURL);

    if (resource != null) {
      const content = await new Promise(resolve =>
        resource.getContent(fetchedContent => resolve(fetchedContent)),
      );

      if (content) {
        return content;
      }
    }
  }

  return new Promise((resolve, reject) => {
    // Try fetching from the Network cache first.
    // If DevTools was opened after the page started loading, we may have missed some requests.
    // So fall back to a fetch() from the page and hope we get a cached response that way.
    fetchFromNetworkCache(url, resolve, reject);
  });
}

export default fetchFileWithCaching;
