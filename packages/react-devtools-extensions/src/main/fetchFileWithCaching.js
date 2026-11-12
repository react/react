/* global chrome */

import {normalizeUrlIfValid} from 'react-devtools-shared/src/utils';
import {clearSourceCaches} from 'react-devtools-shared/src/symbolicateSource';
import {__DEBUG__} from 'react-devtools-shared/src/constants';

const debugLog = (...args) => {
  if (__DEBUG__) {
    console.log(...args);
  }
};

function decodeBase64Text(content: string): string {
  const binary = atob(content);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
}

function decodeDataURL(url: string): string {
  const comma = url.indexOf(',');
  if (comma < 0) throw new Error('Invalid data URL');
  const metadata = url.slice(0, comma);
  const content = decodeURIComponent(url.slice(comma + 1));
  return /;base64$/i.test(metadata) ? decodeBase64Text(content) : content;
}

// HAR stays fresh on each lookup. Retain only non-data resource descriptors so
// serial owner frames do not repeatedly invoke Chrome's expensive enumeration.
// Script events invalidate the inventory; a missing URL refreshes it once.
let inFlightHAR = null;
let inFlightResources = null;
let resourceInventory = null;
let resourceInventoryVersion = 0;
function getHAR() {
  if (inFlightHAR !== null) return inFlightHAR;
  const request = new Promise(resolve =>
    chrome.devtools.network.getHAR(resolve),
  );
  inFlightHAR = request;
  const cleanup = () => {
    if (inFlightHAR === request) inFlightHAR = null;
  };
  request.then(cleanup, cleanup);
  return request;
}

function invalidateResourceInventory() {
  resourceInventoryVersion++;
  resourceInventory = null;
  inFlightResources = null;
}

function getResources() {
  if (resourceInventory !== null) return Promise.resolve(resourceInventory);
  if (inFlightResources !== null) return inFlightResources;
  const version = resourceInventoryVersion;
  const request = new Promise(resolve =>
    chrome.devtools.inspectedWindow.getResources(resources => {
      const inventory = new Map();
      resources.forEach(resource => {
        if (!resource.url.startsWith('data:'))
          inventory.set(resource.url, resource);
      });
      if (version === resourceInventoryVersion) resourceInventory = inventory;
      resolve(inventory);
    }),
  );
  inFlightResources = request;
  const cleanup = () => {
    if (inFlightResources === request) inFlightResources = null;
  };
  request.then(cleanup, cleanup);
  return request;
}

async function getResource(url: string) {
  // Unknown virtual/lazy scripts may not have emitted a network event.
  if (resourceInventory !== null && !resourceInventory.has(url))
    invalidateResourceInventory();
  return (await getResources()).get(url);
}

async function fetchFromNetworkCache(url: string): Promise<string | null> {
  const harLog = await getHAR();
  // A URL can appear more than once after reload/HMR. Prefer its newest body.
  for (let i = harLog.entries.length - 1; i >= 0; i--) {
    const entry = harLog.entries[i];
    if (normalizeUrlIfValid(entry.request.url) !== url) continue;
    if (entry.getContent != null) {
      return new Promise(resolve =>
        entry.getContent((content, encoding) => {
          try {
            resolve(
              !content
                ? null
                : encoding === 'base64'
                  ? decodeBase64Text(content)
                  : content,
            );
          } catch {
            resolve(null);
          }
        }),
      );
    }
    const {text, encoding} = entry.response.content;
    try {
      return text == null
        ? null
        : encoding === 'base64'
          ? decodeBase64Text(text)
          : text;
    } catch {
      return null;
    }
  }
  return null;
}

let nextPageRequestID = 0;
const pageRequestSession = Math.random().toString(36).slice(2);
const pendingPageRequests = new Map();
const fetchFromPage = (url, resolve, reject) => {
  debugLog('[main] fetchFromPage()', url);
  const requestID = pageRequestSession + ':' + ++nextPageRequestID;
  let settled = false;
  const timeout = setTimeout(
    () => fail(new Error('Source read timed out')),
    5000,
  );
  const cleanup = () => {
    settled = true;
    clearTimeout(timeout);
    chrome.runtime.onMessage.removeListener(onPortMessage);
    pendingPageRequests.delete(requestID);
  };
  function fail(error) {
    if (settled) return;
    cleanup();
    reject(error);
  }
  function onPortMessage({payload, source}) {
    if (
      source === 'react-devtools-background' &&
      payload?.url === url &&
      payload?.requestID === requestID
    ) {
      switch (payload?.type) {
        case 'fetch-file-with-cache-complete':
          cleanup();
          resolve(payload.value);
          break;
        case 'fetch-file-with-cache-error':
          cleanup();
          reject(payload.value);
          break;
      }
    }
  }
  chrome.runtime.onMessage.addListener(onPortMessage);
  pendingPageRequests.set(requestID, () =>
    fail(new Error('Source read invalidated')),
  );
  Promise.resolve(
    chrome.runtime.sendMessage({
      source: 'devtools-page',
      payload: {
        type: 'fetch-file-with-cache',
        tabId: chrome.devtools.inspectedWindow.tabId,
        url,
        requestID,
      },
    }),
  ).catch(fail);
};

// Inline data is local. For HTTP URLs prefer HAR then the page HTTP cache;
// enumerate debugger resources only when that fails or for virtual scripts.
// Concurrent requests share their promise; settled bodies are not retained.
const inFlightRequests: Map<string, Promise<string>> = new Map();

function fetchFileWithCaching(url: string): Promise<string> {
  const inFlightRequest = inFlightRequests.get(url);
  if (inFlightRequest !== undefined) {
    return inFlightRequest;
  }

  const request = fetchFileWithCachingImpl(url);
  inFlightRequests.set(url, request);
  const cleanup = () => {
    if (inFlightRequests.get(url) === request) {
      inFlightRequests.delete(url);
    }
  };
  request.then(cleanup, cleanup);
  return request;
}

const requestedURLs = new Set();
const pageCacheReads = new Map();
let sourceFetchVersion = 0;
const committedSourceContents: Map<string, string> = new Map();
function invalidateSourceCaches() {
  sourceFetchVersion++;
  pendingPageRequests.forEach(cancel => cancel());
  pageCacheReads.clear();
  inFlightRequests.clear();
  inFlightHAR = null;
  invalidateResourceInventory();
  requestedURLs.clear();
  clearSourceCaches();
}

chrome.devtools.network.onNavigated.addListener(() => {
  committedSourceContents.clear();
  invalidateSourceCaches();
});
chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(
  (resource, content) => {
    invalidateSourceCaches();
    committedSourceContents.set(normalizeUrlIfValid(resource.url), content);
    if (committedSourceContents.size > 50)
      committedSourceContents.delete(
        committedSourceContents.keys().next().value,
      );
  },
);
chrome.devtools.network.onRequestFinished.addListener(entry => {
  const url = normalizeUrlIfValid(entry.request.url);
  const mimeType = entry.response?.content?.mimeType || '';
  const isScript =
    /\.(?:[cm]?js|[jt]sx?|map)(?:[?#]|$)/i.test(url) ||
    /javascript|typescript/.test(mimeType);
  if (isScript) invalidateResourceInventory();
  // A new unrelated chunk does not change existing maps. Our own HTTP cache
  // read can emit this event too; its returned body already contains the result.
  if (requestedURLs.has(url) && !pageCacheReads.has(url)) {
    committedSourceContents.delete(url);
    invalidateSourceCaches();
  }
});

async function fetchFileWithCachingImpl(url: string): Promise<string> {
  const requestVersion = sourceFetchVersion;
  const assertCurrent = () => {
    if (requestVersion !== sourceFetchVersion)
      throw new Error('Source read invalidated');
  };
  if (url.startsWith('data:')) return decodeDataURL(url);
  const normalizedReferenceURL = normalizeUrlIfValid(url);
  const committedContent = committedSourceContents.get(normalizedReferenceURL);
  if (committedContent !== undefined) return committedContent;
  requestedURLs.add(normalizedReferenceURL);
  const networkContent = await fetchFromNetworkCache(normalizedReferenceURL);
  assertCurrent();
  if (networkContent !== null) return networkContent;

  let pageReadError = null;
  const readPageFirst = /^https?:/i.test(url);
  if (readPageFirst) {
    pageCacheReads.set(normalizedReferenceURL, requestVersion);
    try {
      const content = await new Promise((resolve, reject) =>
        fetchFromPage(url, resolve, reject),
      );
      assertCurrent();
      if (content) return content;
    } catch (error) {
      pageReadError = error;
      // Virtual or unavailable network sources may still exist in the debugger.
    } finally {
      if (pageCacheReads.get(normalizedReferenceURL) === requestVersion)
        pageCacheReads.delete(normalizedReferenceURL);
    }
  }

  assertCurrent();
  if (__IS_CHROME__ || __IS_EDGE__) {
    const resource = await getResource(normalizedReferenceURL);
    assertCurrent();
    if (resource != null) {
      const content = await new Promise(resolve =>
        resource.getContent((fetchedContent, encoding) => {
          try {
            resolve(
              !fetchedContent
                ? null
                : encoding === 'base64'
                  ? decodeBase64Text(fetchedContent)
                  : fetchedContent,
            );
          } catch {
            resolve(null);
          }
        }),
      );
      assertCurrent();
      if (content !== null) return content;
    }
  }

  if (readPageFirst) throw pageReadError;
  const content = await new Promise((resolve, reject) =>
    fetchFromPage(url, resolve, reject),
  );
  assertCurrent();
  return content;
}

export default fetchFileWithCaching;
