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

export function loadChunk(filename: string): Promise<mixed> {
  return __turbopack_load_by_url__(filename);
}

// We cache ReactIOInfo across requests so that inner refreshes can dedupe with outer.
const chunkIOInfoCache: Map<string, ReactIOInfo> = __DEV__
  ? new Map()
  : (null as any);

export function addChunkDebugInfo(
  target: ReactDebugInfo,
  filename: string,
): void {
  if (!__DEV__) {
    return;
  }
  let ioInfo = chunkIOInfoCache.get(filename);
  if (ioInfo === undefined) {
    let href;
    try {
      // $FlowFixMe[incompatible-type]
      href = new URL(filename, document.baseURI).href;
    } catch (_) {
      href = filename;
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
          byteSize = (resourceEntry.transferSize as any) || 0;
        }
      }
    }
    const value = Promise.resolve(href);
    // $FlowFixMe[prop-missing]
    value.status = 'fulfilled';
    // Is there some more useful representation for the chunk?
    // $FlowFixMe[prop-missing]
    value.value = href;
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
    ioInfo = {
      name: 'script',
      start: start,
      end: end,
      value: value,
      debugStack: fakeStack,
    } as ReactIOInfo;
    if (byteSize > 0) {
      // $FlowFixMe[cannot-write]
      ioInfo.byteSize = byteSize;
    }
    chunkIOInfoCache.set(filename, ioInfo);
  }
  // We could dedupe the async info too but conceptually each request is its own await.
  const asyncInfo: ReactAsyncInfo = {
    awaited: ioInfo,
  };
  target.push(asyncInfo);
}
