/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

function isLikelyStaticResource(initiatorType: string) {
  switch (initiatorType) {
    case 'css':
    case 'script':
    case 'font':
    case 'img':
    case 'image':
    case 'input':
    case 'link':
      return true;
    default:
      return false;
  }
}

export default function estimateBandwidth(): number {
  // Estimate the current bandwidth for downloading static resources given resources already
  // loaded.
  // $FlowFixMe[method-unbinding]
  if (typeof performance.getEntriesByType === 'function') {
    let count = 0;
    let bits = 0;
    const resourceEntries = performance.getEntriesByType('resource');
    for (let i = 0; i < resourceEntries.length; i++) {
      const entry = resourceEntries[i];
      // $FlowFixMe[prop-missing]
      const transferSize: number = entry.transferSize;
      // $FlowFixMe[prop-missing]
      const initiatorType: string = entry.initiatorType;
      const duration = entry.duration;
      if (
        !transferSize ||
        !duration ||
        !isLikelyStaticResource(initiatorType)
      ) {
        // Skip cached, cross-orgin entries and resources likely to be dynamically generated.
        continue;
      }
      // Find any overlapping entries that were transferring at the same time since the total
      // bps at the time will include those bytes.
      let overlappingBytes = 0;
      // $FlowFixMe[prop-missing]
      const parentEndTime: number = entry.responseEnd;
      let j;
      for (j = i + 1; j < resourceEntries.length; j++) {
        const overlapEntry = resourceEntries[j];
        const overlapStartTime = overlapEntry.startTime;
        if (overlapStartTime > parentEndTime) {
          break;
        }
        // $FlowFixMe[prop-missing]
        const overlapTransferSize: number = overlapEntry.transferSize;
        // $FlowFixMe[prop-missing]
        const overlapInitiatorType: string = overlapEntry.initiatorType;
        if (
          !overlapTransferSize ||
          !isLikelyStaticResource(overlapInitiatorType)
        ) {
          // Skip cached, cross-orgin entries and resources likely to be dynamically generated.
          continue;
        }
        // $FlowFixMe[prop-missing]
        const overlapEndTime: number = overlapEntry.responseEnd;
        const overlapFactor =
          overlapEndTime < parentEndTime
            ? 1
            : (parentEndTime - overlapStartTime) /
              (overlapEndTime - overlapStartTime);
        overlappingBytes += overlapTransferSize * overlapFactor;
      }
      // Skip past any entries we already considered overlapping. Otherwise we'd have to go
      // back to consider previous entries when we then handled them.
      i = j - 1;

      const bps =
        ((transferSize + overlappingBytes) * 8) / (entry.duration / 1000);
      bits += bps;
      count++;
      if (count > 10) {
        // We have enough to get an average.
        break;
      }
    }
    if (count > 0) {
      return bits / count / 1e6;
    }
  }

  // Fallback to the navigator.connection estimate if available
  // $FlowFixMe[prop-missing]
  if (navigator.connection) {
    // $FlowFixMe[incompatible-use]
    const downlink: ?number = navigator.connection.downlink;
    if (typeof downlink === 'number') {
      return downlink;
    }
  }

  // Otherwise, use a default of 5mbps to compute heuristics.
  // This can happen commonly in Safari if all static resources and images are loaded
  // cross-orgin.
  return 5;
}
