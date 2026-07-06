/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Captures React 19.2+ Performance Track entries (scheduler lane phases,
// component/effect spans) while profiling. React emits them via the
// extended console.timeStamp, which never enters the performance timeline —
// patching console.timeStamp is the sanctioned consumption path
// (facebook/react #32736). Older React never calls the extended signature,
// so the capture stays empty; callers treat the presence of spans as the
// capability check.

export type PerformanceTrackSpan = {
  name: string,
  // Milliseconds, same epoch as commit timestamps (offset from profiling
  // start).
  start: number,
  end: number,
  // 'Components ⚛' or a scheduler lane name (Blocking, Transition, ...).
  track: string,
  // 'Scheduler ⚛' for lane tracks, null for the components track.
  trackGroup: string | null,
  color: string | null,
};

export type PerformanceTrackCapture = {
  start: (consoleObject: Object) => void,
  stop: () => void,
  getSpans: () => Array<PerformanceTrackSpan>,
  getDroppedCount: () => number,
};

const COMPONENTS_TRACK = 'Components ⚛';
const SCHEDULER_TRACK_GROUP = 'Scheduler ⚛';

// Component spans are plentiful and largely duplicate commit-level data,
// so they are capped separately and dropped before scheduler spans.
const SCHEDULER_SPAN_LIMIT = 2000;
const COMPONENT_SPAN_LIMIT = 2500;

export function createPerformanceTrackCapture({
  getTimeOffset,
}: {
  // The epoch to rebase against (profilingStartTime; same clock as React's
  // span timestamps).
  getTimeOffset: () => number,
}): PerformanceTrackCapture {
  let spans: Array<PerformanceTrackSpan> = [];
  let schedulerSpanCount = 0;
  let componentSpanCount = 0;
  let droppedCount = 0;

  let patchedConsole: Object | null = null;
  let originalTimeStamp: Function | null = null;
  let wrappedTimeStamp: Function | null = null;
  let capturing = false;

  function record(
    label: mixed,
    startTime: mixed,
    endTime: mixed,
    track: mixed,
    trackGroup: mixed,
    color: mixed,
  ): void {
    // Only React's own tracks; the app's custom tracks and plain
    // console.timeStamp(label) marks pass through uncaptured.
    const isComponentsTrack = track === COMPONENTS_TRACK;
    const isSchedulerTrack = trackGroup === SCHEDULER_TRACK_GROUP;
    if (!isComponentsTrack && !isSchedulerTrack) {
      return;
    }
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      return;
    }
    if (isComponentsTrack) {
      if (componentSpanCount >= COMPONENT_SPAN_LIMIT) {
        droppedCount++;
        return;
      }
      componentSpanCount++;
    } else {
      if (schedulerSpanCount >= SCHEDULER_SPAN_LIMIT) {
        droppedCount++;
        return;
      }
      schedulerSpanCount++;
    }
    const offset = getTimeOffset();
    spans.push({
      name: typeof label === 'string' ? label : String(label),
      start: startTime - offset,
      end: endTime - offset,
      track: ((track: any): string),
      trackGroup: typeof trackGroup === 'string' ? trackGroup : null,
      color: typeof color === 'string' ? color : null,
    });
  }

  function start(consoleObject: Object): void {
    spans = [];
    schedulerSpanCount = 0;
    componentSpanCount = 0;
    droppedCount = 0;
    capturing = true;

    if (wrappedTimeStamp !== null) {
      // Already wrapped (start called twice without stop); just keep going
      // with the fresh buffers.
      return;
    }
    if (
      consoleObject == null ||
      typeof consoleObject.timeStamp !== 'function'
    ) {
      return; // Environment without console.timeStamp; capture stays empty.
    }
    const original = consoleObject.timeStamp;
    const wrapped = function timeStamp(
      label: mixed,
      startTime: mixed,
      endTime: mixed,
      track: mixed,
      trackGroup: mixed,
      color: mixed,
    ) {
      if (capturing) {
        try {
          record(label, startTime, endTime, track, trackGroup, color);
        } catch (error) {
          // Capture must never break the page's own logging.
        }
      }
      return original.apply(this, arguments);
    };

    patchedConsole = consoleObject;
    originalTimeStamp = original;
    wrappedTimeStamp = wrapped;
    consoleObject.timeStamp = wrapped;
  }

  function stop(): void {
    capturing = false;
    if (patchedConsole !== null && wrappedTimeStamp !== null) {
      // Only unpatch if we're still on top; if someone else wrapped our
      // wrapper, restoring would clobber their patch — leave the chain
      // intact (our wrapper is inert once capturing is false).
      if (patchedConsole.timeStamp === wrappedTimeStamp) {
        patchedConsole.timeStamp = originalTimeStamp;
        patchedConsole = null;
        originalTimeStamp = null;
        wrappedTimeStamp = null;
      }
    }
  }

  return {
    start,
    stop,
    getSpans: () => spans.slice(),
    getDroppedCount: () => droppedCount,
  };
}
