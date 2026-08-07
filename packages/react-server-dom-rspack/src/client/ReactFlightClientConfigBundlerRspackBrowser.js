/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactDebugInfo,
  ReactIOInfo,
  ReactAsyncInfo,
} from 'shared/ReactTypes';

const chunkMap: Map<string, string> = new Map();

/**
 * We patch the chunk filename function in Rspack to insert our own resolution
 * of chunks that come from Flight and may not be known to the Rspack runtime
 */
const rspackGetChunkFilename = __webpack_require__.u;
__webpack_require__.u = function (chunkId: string) {
  const flightChunk = chunkMap.get(chunkId);
  if (flightChunk !== undefined) {
    return flightChunk;
  }
  return rspackGetChunkFilename(chunkId);
};

export function loadChunk(chunkId: string, filename: string): Promise<mixed> {
  chunkMap.set(chunkId, filename);
  return __webpack_chunk_load__(chunkId);
}

// We cache ReactIOInfo across requests so that inner refreshes can dedupe with outer.
const chunkIOInfoCache: Map<string, ReactIOInfo> = __DEV__
  ? new Map()
  : (null: any);

export function addChunkDebugInfo(
  target: ReactDebugInfo,
  chunkId: string,
  filename: string,
): void {
  if (!__DEV__) {
    return;
  }
  let ioInfo = chunkIOInfoCache.get(chunkId);
  if (ioInfo === undefined) {
    const scriptFilename = __webpack_get_script_filename__(chunkId);
    let href;
    try {
      // $FlowFixMe
      href = new URL(scriptFilename, document.baseURI).href;
    } catch (_) {
      href = scriptFilename;
    }
    let start = -1;
    let end = -1;
    let byteSize = 0;
    // $FlowFixMe[method-unbinding]
    if (typeof performance.getEntriesByType === 'function') {
      // We may be able to collect the start and end time of this resource from Performance Observer.
      const resourceEntries = performance.getEntriesByType('resource');
      for (let i = 0; i < resourceEntries.length; i++) {
        const resourceEntry = resourceEntries[i];
        if (resourceEntry.name === href) {
          start = resourceEntry.startTime;
          end = start + resourceEntry.duration;
          // $FlowFixMe[prop-missing]
          byteSize = (resourceEntry.transferSize: any) || 0;
        }
      }
    }
    const value = Promise.resolve(href);
    // $FlowFixMe
    value.status = 'fulfilled';
    // $FlowFixMe
    value.value = {
      chunkId: chunkId,
      href: href,
      // Is there some more useful representation for the chunk?
    };
    // Create a fake stack frame that points to the beginning of the chunk. This is
    // probably not source mapped so will link to the compiled source rather than
    // any individual file that goes into the chunks.
    const fakeStack = new Error('react-stack-top-frame');
    if (fakeStack.stack.startsWith('Error: react-stack-top-frame')) {
      // Looks like V8
      fakeStack.stack =
        'Error: react-stack-top-frame\n' +
        // Add two frames since we always trim one off the top.
        '    at Client Component Bundle (' +
        href +
        ':1:1)\n' +
        '    at Client Component Bundle (' +
        href +
        ':1:1)';
    } else {
      // Looks like Firefox or Safari.
      // Add two frames since we always trim one off the top.
      fakeStack.stack =
        'Client Component Bundle@' +
        href +
        ':1:1\n' +
        'Client Component Bundle@' +
        href +
        ':1:1';
    }
    ioInfo = ({
      name: 'script',
      start: start,
      end: end,
      value: value,
      debugStack: fakeStack,
    }: ReactIOInfo);
    if (byteSize > 0) {
      // $FlowFixMe[cannot-write]
      ioInfo.byteSize = byteSize;
    }
    chunkIOInfoCache.set(chunkId, ioInfo);
  }
  // We could dedupe the async info too but conceptually each request is its own await.
  const asyncInfo: ReactAsyncInfo = {
    awaited: ioInfo,
  };
  target.push(asyncInfo);
}
