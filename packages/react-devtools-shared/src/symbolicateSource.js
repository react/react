/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SourceMapConsumerType} from 'react-devtools-shared/src/hooks/SourceMapConsumer';
import SourceMapConsumer from 'react-devtools-shared/src/hooks/SourceMapConsumer';
import createSourceMapTaskQueue, {
  EMPTY_SOURCE_PARSING_STATUS,
} from './sourceMapTaskQueue';
import type {SourceParsingStatus} from './sourceMapTaskQueue';
export {default as createSourceMapTaskQueue} from './sourceMapTaskQueue';

import type {ReactFunctionLocation} from 'shared/ReactTypes';
import type {FetchFileWithCaching} from 'react-devtools-shared/src/devtools/views/Components/FetchFileWithCachingContext';

let symbolicationCaches: WeakMap<
  FetchFileWithCaching,
  Map<string, Promise<SourceMappedLocation | null>>,
> = new WeakMap();
type FileSourceMap = {
  consumer: SourceMapConsumerType | null,
  workerKey: string | null,
  sourceMapURL: string,
};
type FileCacheEntry = {
  promise: Promise<FileSourceMap | null>,
  pending: boolean,
};
let fileCaches: WeakMap<
  FetchFileWithCaching,
  Map<string, FileCacheEntry>,
> = new WeakMap();
const MAX_CACHED_FILES = 50;
const MAX_CACHED_LOCATIONS = 500;
const completedSymbolications = new WeakSet();
const MAX_PENDING_SOURCE_TASKS = 32;
const WORKER_TIMEOUT_MS = 10000;
let epoch = 0;
const cacheListeners = new Set();
export function subscribeSourceCacheVersion(listener: () => void): () => void {
  cacheListeners.add(listener);
  return () => {
    cacheListeners.delete(listener);
  };
}
export function getSourceCacheVersion(): number {
  return epoch;
}
let nextWorkerKey = 0;
let workerFactory = null;
let worker = null;
const workerCalls = new Set();
let selections = new WeakMap();
const selectionIDs = new WeakMap();
const queues = new Set();
const parsingStatusListeners = new Set();
let parsingStatusTimer = null;

// Only the small status indicator subscribes. Batch changes from long stacks,
// without adding a repaint to each raw frame or polling the Worker.
function notifyParsingStatus() {
  if (parsingStatusListeners.size === 0 || parsingStatusTimer !== null) return;
  parsingStatusTimer = setTimeout(() => {
    parsingStatusTimer = null;
    parsingStatusListeners.forEach(listener => listener());
  }, 16);
}
export function subscribeSourceParsingStatus(listener: () => void): () => void {
  parsingStatusListeners.add(listener);
  return () => {
    parsingStatusListeners.delete(listener);
    if (parsingStatusListeners.size === 0) {
      clearTimeout(parsingStatusTimer);
      parsingStatusTimer = null;
    }
  };
}
export function getSourceParsingStatus(
  fetchFile: FetchFileWithCaching | null,
  inspectedElementID: number | null,
): SourceParsingStatus {
  const selection = fetchFile === null ? null : selections.get(fetchFile);
  return selection != null && selection.id === inspectedElementID
    ? selection.queue.getStatus()
    : EMPTY_SOURCE_PARSING_STATUS;
}

// Configured only by the browser extension. Other frontends keep their existing
// resolver until they supply a worker factory; extensions never fall back to a
// synchronous parse after a worker error.
export function setSourceMapWorkerFactory(factory: any): void {
  clearSourceCaches();
  workerFactory = factory;
}

function resetWorker() {
  const previous = worker;
  worker = null;
  previous?.terminate();
  workerCalls.forEach(call => call.fail());
  workerCalls.clear();
  fileCaches = new WeakMap();
}

function callWorker(method: string, args: Array<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    let timeout;
    const call = {
      method,
      fail(error: any = new Error('Source map worker unavailable')) {
        clearTimeout(timeout);
        workerCalls.delete(call);
        reject(error);
      },
    };
    try {
      if (worker === null) {
        worker = workerFactory();
        const createdWorker = worker;
        const onError = () => {
          if (worker === createdWorker) resetWorker();
        };
        worker.addEventListener('error', onError);
        worker.addEventListener('messageerror', onError);
      }
      const currentWorker = worker;
      workerCalls.add(call);
      timeout = setTimeout(() => {
        if (worker === currentWorker) resetWorker();
        else call.fail();
      }, WORKER_TIMEOUT_MS);
      currentWorker[method](...args).then(
        result => {
          clearTimeout(timeout);
          if (workerCalls.delete(call)) resolve(result);
        },
        error => {
          // A position error is an RPC rejection, not a crashed worker.
          if (method === 'resolveSource') call.fail(error);
          else if (worker === currentWorker) resetWorker();
          else call.fail();
        },
      );
    } catch {
      call.fail();
      resetWorker();
    }
  });
}

function getSelection(fetchFileWithCaching: FetchFileWithCaching) {
  let selection = selections.get(fetchFileWithCaching);
  if (selection === undefined) {
    selection = {
      id: selectionIDs.get(fetchFileWithCaching) ?? null,
      queue: createSourceMapTaskQueue(
        MAX_PENDING_SOURCE_TASKS,
        notifyParsingStatus,
      ),
    };
    selections.set(fetchFileWithCaching, selection);
    queues.add(selection.queue);
  }
  return selection;
}

export function beginSourceSelection(
  fetchFileWithCaching: FetchFileWithCaching,
  id: number | null,
): void {
  const selection = getSelection(fetchFileWithCaching);
  if (selection.id === id) return;
  selection.id = id;
  selectionIDs.set(fetchFileWithCaching, id);
  selection.queue.cancel();
  const locations = symbolicationCaches.get(fetchFileWithCaching);
  locations?.forEach((promise, key) => {
    if (!completedSymbolications.has(promise)) locations.delete(key);
  });
  const cache = fileCaches.get(fetchFileWithCaching);
  cache?.forEach((entry, url) => {
    if (entry.pending) cache.delete(url);
  });
  // A synchronous parse running in a worker cannot be preempted by another RPC.
  // Terminate it so the current component is never stuck behind an obsolete map.
  // Indexed maps decode sections lazily during position lookup too. Preserve
  // idle workers, but preempt every outstanding RPC from an obsolete selection.
  if (workerCalls.size > 0) resetWorker();
}

// Called by extension navigation, source edits and script reload events.
export function clearSourceCaches(): void {
  epoch++;
  queues.forEach(queue => queue.cancel());
  queues.clear();
  selections = new WeakMap();
  symbolicationCaches = new WeakMap();
  resetWorker();
  cacheListeners.forEach(listener => listener());
}

export type SourceMappedLocation = {
  location: ReactFunctionLocation,
  ignored: boolean, // Whether the file for this location was ignore listed
};

export function symbolicateSourceWithCache(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceURL: string,
  line: number, // 1-based
  column: number, // 1-based
  priority: boolean = false,
): Promise<SourceMappedLocation | null> {
  let symbolicationCache = symbolicationCaches.get(fetchFileWithCaching);
  if (symbolicationCache === undefined) {
    symbolicationCache = new Map();
    symbolicationCaches.set(fetchFileWithCaching, symbolicationCache);
  }
  const key = `${sourceURL}:${line}:${column}`;
  const cachedPromise = symbolicationCache.get(key);
  if (cachedPromise != null) {
    if (
      !priority ||
      completedSymbolications.has(cachedPromise) ||
      getSelection(fetchFileWithCaching).queue.promote(cachedPromise)
    ) {
      symbolicationCache.delete(key);
      symbolicationCache.set(key, cachedPromise);
      return cachedPromise;
    }
    // A dropped or cancelled task may still be cached before its microtask
    // cleanup. A selected source gets a fresh priority slot immediately.
    symbolicationCache.delete(key);
  }

  const requestEpoch = epoch;
  const promise = getSelection(fetchFileWithCaching).queue.enqueue(
    isCurrent =>
      symbolicateSource(
        fetchFileWithCaching,
        sourceURL,
        line,
        column,
        () => isCurrent() && requestEpoch === epoch,
      ),
    priority,
  );
  symbolicationCache.set(key, promise);
  if (symbolicationCache.size > MAX_CACHED_LOCATIONS)
    symbolicationCache.delete(symbolicationCache.keys().next().value);
  const currentCache = symbolicationCache;
  promise.then(result => {
    if (result !== null) completedSymbolications.add(promise);
    // Overflow, cancellation and failed maps must be retryable on a later visit.
    if (result === null && currentCache.get(key) === promise)
      currentCache.delete(key);
  });
  return promise;
}

// A successfully read script without a map is stable until source invalidation.
const NO_SOURCE_MAP: FileSourceMap = {
  consumer: null,
  workerKey: null,
  sourceMapURL: '',
};

const SOURCE_MAP_ANNOTATION_PREFIX = 'sourceMappingURL=';
function getFileSourceMap(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceURL: string,
  isCurrent: () => boolean,
): Promise<FileSourceMap | null> {
  let cache = fileCaches.get(fetchFileWithCaching);
  if (cache === undefined) {
    cache = new Map();
    fileCaches.set(fetchFileWithCaching, cache);
  }
  const existing = cache.get(sourceURL);
  if (existing !== undefined) {
    cache.delete(sourceURL);
    cache.set(sourceURL, existing);
    return existing.promise;
  }
  const request = loadFileSourceMap(
    fetchFileWithCaching,
    sourceURL,
    isCurrent,
  ).catch(() => null);
  const entry = {promise: request, pending: true};
  cache.set(sourceURL, entry);
  if (cache.size > MAX_CACHED_FILES) cache.delete(cache.keys().next().value);
  const currentCache = cache;
  request.then(result => {
    // Failed loads can become available later, e.g. after a lazy script loads.
    entry.pending = false;
    if (result === null && currentCache.get(sourceURL) === entry)
      currentCache.delete(sourceURL);
  });
  return request;
}

async function loadFileSourceMap(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceURL: string,
  isCurrent: () => boolean,
): Promise<FileSourceMap | null> {
  const resource =
    workerFactory !== null && sourceURL.startsWith('data:')
      ? sourceURL
      : await fetchFileWithCaching(sourceURL);
  if (!isCurrent() || resource == null) return null;
  if (workerFactory !== null) {
    const workerKey = String(++nextWorkerKey);
    const prepared = await callWorker('prepareSourceMap', [
      workerKey,
      sourceURL,
      resource,
    ]);
    if (!isCurrent()) return null;
    if (prepared === null) return NO_SOURCE_MAP;
    const {sourceMapURL} = prepared;
    if (sourceMapURL.startsWith('data:')) {
      if (!prepared.loaded) return null;
    } else {
      const mapText = await fetchFileWithCaching(sourceMapURL);
      if (!isCurrent() || mapText == null) return null;
      const loaded = await callWorker('loadSourceMap', [workerKey, mapText]);
      if (!isCurrent() || !loaded) return null;
    }
    return {consumer: null, workerKey, sourceMapURL};
  }
  const resourceLines = resource.split(/[\r\n]+/);
  for (let i = resourceLines.length - 1; i >= 0; i--) {
    const resourceLine = resourceLines[i];
    if (!resourceLine) continue;
    if (!resourceLine.startsWith('//#')) break;
    const index = resourceLine.indexOf(SOURCE_MAP_ANNOTATION_PREFIX);
    if (index < 0) continue;
    const sourceMapAt = resourceLine.slice(
      index + SOURCE_MAP_ANNOTATION_PREFIX.length,
    );
    let sourceMapURL;
    try {
      sourceMapURL = new URL(sourceMapAt, sourceURL).toString();
    } catch {
      try {
        sourceMapURL = new URL(sourceMapAt).toString();
      } catch {
        return null;
      }
    }
    const sourceMap = await fetchFileWithCaching(sourceMapURL);
    if (sourceMap == null) return null;
    return {
      consumer: SourceMapConsumer(JSON.parse(sourceMap)),
      workerKey: null,
      sourceMapURL,
    };
  }
  return NO_SOURCE_MAP;
}

export async function symbolicateSource(
  fetchFileWithCaching: FetchFileWithCaching,
  sourceURL: string,
  lineNumber: number,
  columnNumber: number,
  isCurrent: () => boolean = () => true,
): Promise<SourceMappedLocation | null> {
  if (!isCurrent() || !sourceURL || sourceURL.startsWith('<anonymous'))
    return null;
  try {
    const metadata = await getFileSourceMap(
      fetchFileWithCaching,
      sourceURL,
      isCurrent,
    );
    if (!isCurrent() || metadata === null) return null;
    const original =
      metadata.workerKey !== null
        ? await callWorker('resolveSource', [
            metadata.workerKey,
            lineNumber,
            columnNumber,
          ])
        : metadata.consumer?.originalPositionFor({lineNumber, columnNumber});
    if (!isCurrent() || original == null) return null;
    const {
      sourceURL: possiblyURL,
      line,
      column: columnZeroBased,
      ignored,
    } = original;
    if (possiblyURL === null) return null;
    const column = columnZeroBased + 1;
    const functionName = '';
    try {
      void new URL(possiblyURL);
      return {location: [functionName, possiblyURL, line, column], ignored};
    } catch {
      if (
        possiblyURL.startsWith('/') ||
        possiblyURL.slice(1).startsWith(':\\\\')
      ) {
        return {location: [functionName, possiblyURL, line, column], ignored};
      }
      // Relative sources in inline maps are relative to the generated script.
      const baseURL = metadata.sourceMapURL.startsWith('data:')
        ? sourceURL
        : metadata.sourceMapURL;
      return {
        location: [
          functionName,
          new URL(possiblyURL, baseURL).toString(),
          line,
          column,
        ],
        ignored,
      };
    }
  } catch (error) {
    // The Worker LRU can evict a map independently of the UI metadata cache.
    // Retry only this file on a later visit; keep all other decoded maps warm.
    if (error?.message === 'Source map was evicted')
      fileCaches.get(fetchFileWithCaching)?.delete(sourceURL);
    return null;
  }
}
