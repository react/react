/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  importFromChromeTimeline,
  Flamechart as SpeedscopeFlamechart,
} from '@elg/speedscope';
import type {TimelineEvent} from '@elg/speedscope';
import type {
  ErrorStackFrame,
  BatchUID,
  Flamechart,
  Milliseconds,
  NativeEvent,
  NetworkMeasure,
  Phase,
  ReactLane,
  ReactComponentMeasure,
  ReactComponentMeasureType,
  ReactMeasure,
  ReactMeasureType,
  TimelineData,
  SchedulingEvent,
  SuspenseEvent,
  Snapshot,
} from '../types';
import {
  REACT_TOTAL_NUM_LANES,
  SCHEDULING_PROFILER_VERSION,
  SNAPSHOT_MAX_HEIGHT,
} from '../constants';
import InvalidProfileError from './InvalidProfileError';
import {getBatchRange} from '../utils/getBatchRange';
import ErrorStackParser from 'error-stack-parser';

type MeasureStackElement = {
  type: ReactMeasureType,
  depth: number,
  measure: ReactMeasure,
  startTime: Milliseconds,
  stopTime?: Milliseconds,
};

type ProcessorState = {
  asyncProcessingPromises: Promise<any>[],
  batchUID: BatchUID,
  currentReactComponentMeasure: ReactComponentMeasure | null,
  internalModuleCurrentStackFrame: ErrorStackFrame | null,
  internalModuleStackStringSet: Set<string>,
  measureStack: MeasureStackElement[],
  nativeEventStack: NativeEvent[],
  nextRenderShouldGenerateNewBatchID: boolean,
  potentialLongEvents: Array<[NativeEvent, BatchUID]>,
  potentialLongNestedUpdate: SchedulingEvent | null,
  potentialLongNestedUpdates: Array<[SchedulingEvent, BatchUID]>,
  potentialSuspenseEventsOutsideOfTransition: Array<
    [SuspenseEvent, ReactLane[]],
  >,
  requestIdToNetworkMeasureMap: Map<string, NetworkMeasure>,
  uidCounter: BatchUID,
  unresolvedSuspenseEvents: Map<string, SuspenseEvent>,
};

const NATIVE_EVENT_DURATION_THRESHOLD = 20;
const NESTED_UPDATE_DURATION_THRESHOLD = 20;

const WARNING_STRINGS = {
  LONG_EVENT_HANDLER:
    'An event handler scheduled a big update with React. Consider using the Transition API to defer some of this work.',
  NESTED_UPDATE:
    'A big nested update was scheduled during layout. ' +
    'Nested updates require React to re-render synchronously before the browser can paint. ' +
    'Consider delaying this update by moving it to a passive effect (useEffect).',
  SUSPEND_DURING_UPDATE:
    'A component suspended during an update which caused a fallback to be shown. ' +
    "Consider using the Transition API to avoid hiding components after they've been mounted.",
};

// Exported for tests
export function getLanesFromTransportDecimalBitmask(
  laneBitmaskString: string,
): ReactLane[] {
  const laneBitmask = parseInt(laneBitmaskString, 10);

  // As negative numbers are stored in two's complement format, our bitmask
  // checks will be thrown off by them.
  if (laneBitmask < 0) {
    return [];
  }

  const lanes = [];
  let powersOfTwo = 0;
  while (powersOfTwo <= REACT_TOTAL_NUM_LANES) {
    if ((1 << powersOfTwo) & laneBitmask) {
      lanes.push(powersOfTwo);
    }
    powersOfTwo++;
  }
  return lanes;
}

function updateLaneToLabelMap(
  profilerData: TimelineData,
  laneLabelTuplesString: string,
): void {
  // These marks appear multiple times in the data;
  // We only need to extact them once.
  if (profilerData.laneToLabelMap.size === 0) {
    const laneLabelTuples = laneLabelTuplesString.split(',');
    for (let laneIndex = 0; laneIndex < laneLabelTuples.length; laneIndex++) {
      // The numeric lane value (e.g. 64) isn't important.
      // The profiler parses and stores the lane's position within the bitmap,
      // (e.g. lane 1 is index 0, lane 16 is index 4).
      profilerData.laneToLabelMap.set(laneIndex, laneLabelTuples[laneIndex]);
    }
  }
}

let profilerVersion = null;

function getLastType(stack: ProcessorState['measureStack']) {
  if (stack.length > 0) {
    const {type} = stack[stack.length - 1];
    return type;
  }
  return null;
}

function getDepth(stack: ProcessorState['measureStack']) {
  if (stack.length > 0) {
    const {depth, type} = stack[stack.length - 1];
    return type === 'render-idle' ? depth : depth + 1;
  }
  return 0;
}

function markWorkStarted(
  type: ReactMeasureType,
  startTime: Milliseconds,
  lanes: ReactLane[],
  currentProfilerData: TimelineData,
  state: ProcessorState,
) {
  const {batchUID, measureStack} = state;
  const depth = getDepth(measureStack);

  const measure: ReactMeasure = {
    type,
    batchUID,
    depth,
    lanes,
    timestamp: startTime,
    duration: 0,
  };

  state.measureStack.push({depth, measure, startTime, type});

  // This array is pre-initialized when the batchUID is generated.
  const measures = currentProfilerData.batchUIDToMeasuresMap.get(batchUID);
  if (measures != null) {
    measures.push(measure);
  } else {
    currentProfilerData.batchUIDToMeasuresMap.set(state.batchUID, [measure]);
  }

  // This array is pre-initialized before processing starts.
  lanes.forEach(lane => {
    (
      currentProfilerData.laneToReactMeasureMap.get(
        lane,
      ) as any as Array<ReactMeasure>
    ).push(measure);
  });
}

function markWorkCompleted(
  type: ReactMeasureType,
  stopTime: Milliseconds,
  currentProfilerData: TimelineData,
  stack: ProcessorState['measureStack'],
) {
  if (stack.length === 0) {
    console.error(
      'Unexpected type "%s" completed at %sms while stack is empty.',
      type,
      stopTime,
    );
    // Ignore work "completion" user timing mark that doesn't complete anything
    return;
  }

  const last = stack[stack.length - 1];
  if (last.type !== type) {
    console.error(
      'Unexpected type "%s" completed at %sms before "%s" completed.',
      type,
      stopTime,
      last.type,
    );
  }

  // $FlowFixMe[incompatible-use]
  const {measure, startTime} = stack.pop();
  if (!measure) {
    console.error('Could not find matching measure for type "%s".', type);
  }

  // $FlowFixMe[cannot-write] This property should not be writable outside of this function.
  measure.duration = stopTime - startTime;
}

function throwIfIncomplete(
  type: ReactMeasureType,
  stack: ProcessorState['measureStack'],
) {
  const lastIndex = stack.length - 1;
  if (lastIndex >= 0) {
    const last = stack[lastIndex];
    if (last.stopTime === undefined && last.type === type) {
      throw new InvalidProfileError(
        `Unexpected type "${type}" started before "${last.type}" completed.`,
      );
    }
  }
}

function processEventDispatch(
  event: TimelineEvent,
  timestamp: Milliseconds,
  profilerData: TimelineData,
  state: ProcessorState,
) {
  const data = event.args.data;
  const type = data.type;

  if (type.startsWith('react-')) {
    const stackTrace = data.stackTrace;
    if (stackTrace) {
      const topFrame = stackTrace[stackTrace.length - 1];
      if (topFrame.url.includes('/react-dom.')) {
        // Filter out fake React events dispatched by invokeGuardedCallbackDev.
        return;
      }
    }
  }

  // Reduce noise from events like DOMActivate, load/unload, etc. which are usually not relevant
  if (
    type === 'blur' ||
    type === 'click' ||
    type === 'input' ||
    type.startsWith('focus') ||
    type.startsWith('key') ||
    type.startsWith('mouse') ||
    type.startsWith('pointer')
  ) {
    const duration = event.dur / 1000;

    let depth = 0;

    while (state.nativeEventStack.length > 0) {
      const prevNativeEvent =
        state.nativeEventStack[state.nativeEventStack.length - 1];
      const prevStopTime = prevNativeEvent.timestamp + prevNativeEvent.duration;

      if (timestamp < prevStopTime) {
        depth = prevNativeEvent.depth + 1;
        break;
      } else {
        state.nativeEventStack.pop();
      }
    }

    const nativeEvent = {
      depth,
      duration,
      timestamp,
      type,
      warning: null,
    };

    // $FlowFixMe[incompatible-type]
    profilerData.nativeEvents.push(nativeEvent);

    // Keep track of curent event in case future ones overlap.
    // We separate them into different vertical lanes in this case.
    // $FlowFixMe[incompatible-type]
    state.nativeEventStack.push(nativeEvent);
  }
}

function processResourceFinish(
  event: TimelineEvent,
  timestamp: Milliseconds,
  profilerData: TimelineData,
  state: ProcessorState,
) {
  const requestId = event.args.data.requestId;
  const networkMeasure = state.requestIdToNetworkMeasureMap.get(requestId);
  if (networkMeasure != null) {
    networkMeasure.finishTimestamp = timestamp;
    if (networkMeasure.firstReceivedDataTimestamp === 0) {
      networkMeasure.firstReceivedDataTimestamp = timestamp;
    }
    if (networkMeasure.lastReceivedDataTimestamp === 0) {
      networkMeasure.lastReceivedDataTimestamp = timestamp;
    }

    // Clean up now that the resource is done.
    state.requestIdToNetworkMeasureMap.delete(event.args.data.requestId);
  }
}

function processResourceReceivedData(
  event: TimelineEvent,
  timestamp: Milliseconds,
  profilerData: TimelineData,
  state: ProcessorState,
) {
  const requestId = event.args.data.requestId;
  const networkMeasure = state.requestIdToNetworkMeasureMap.get(requestId);
  if (networkMeasure != null) {
    if (networkMeasure.firstReceivedDataTimestamp === 0) {
      networkMeasure.firstReceivedDataTimestamp = timestamp;
    }
    networkMeasure.lastReceivedDataTimestamp = timestamp;
    networkMeasure.finishTimestamp = timestamp;
  }
}

function processResourceReceiveResponse(
  event: TimelineEvent,
  timestamp: Milliseconds,
  profilerData: TimelineData,
  state: ProcessorState,
) {
  const requestId = event.args.data.requestId;
  const networkMeasure = state.requestIdToNetworkMeasureMap.get(requestId);
  if (networkMeasure != null) {
    networkMeasure.receiveResponseTimestamp = timestamp;
  }
}

function processScreenshot(
  event: TimelineEvent,
  timestamp: Milliseconds,
  profilerData: TimelineData,
  state: ProcessorState,
) {
  const encodedSnapshot = event.args.snapshot; // Base 64 encoded

  const snapshot: Snapshot = {
    height: 0,
    image: null,
    imageSource: `data:image/png;base64,${encodedSnapshot}`,
    timestamp,
    width: 0,
  };

  // Delay processing until we've extracted snapshot dimensions.
  let resolveFn = null as any as Function;
  state.asyncProcessingPromises.push(
    new Promise(resolve => {
      resolveFn = resolve;
    }),
  );

  // Parse the Base64 image data to determine native size.
  // This will be used later to scale for display within the thumbnail strip.
  fetch(snapshot.imageSource)
    .then(response => response.blob())
    .then(blob => {
      // $FlowFixMe[cannot-resolve-name] createImageBitmap
      createImageBitmap(blob).then(bitmap => {
        snapshot.height = bitmap.height;
        snapshot.width = bitmap.width;

        resolveFn();
      });
    });

  profilerData.snapshots.push(snapshot);
}

function processResourceSendRequest(
  event: TimelineEvent,
  timestamp: Milliseconds,
  profilerData: TimelineData,
  state: ProcessorState,
) {
  const data = event.args.data;
  const requestId = data.requestId;

  const availableDepths = new Array<boolean>(
    state.requestIdToNetworkMeasureMap.size + 1,
  ).fill(true);
  state.requestIdToNetworkMeasureMap.forEach(({depth}) => {
    availableDepths[depth] = false;
  });

  let depth = 0;
  for (let i = 0; i < availableDepths.length; i++) {
    if (availableDepths[i]) {
      depth = i;
      break;
    }
  }

  const networkMeasure: NetworkMeasure = {
    depth,
    finishTimestamp: 0,
    firstReceivedDataTimestamp: 0,
    lastReceivedDataTimestamp: 0,
    requestId,
    requestMethod: data.requestMethod,
    priority: data.priority,
    sendRequestTimestamp: timestamp,
    receiveResponseTimestamp: 0,
    url: data.url,
  };

  state.requestIdToNetworkMeasureMap.set(requestId, networkMeasure);

  profilerData.networkMeasures.push(networkMeasure);
  networkMeasure.sendRequestTimestamp = timestamp;
}

function processTimelineEvent(
  event: TimelineEvent,
  /** Finalized profiler data up to `event`. May be mutated. */
  currentProfilerData: TimelineData,
  /** Intermediate processor state. May be mutated. */
  state: ProcessorState,
) {
  const {cat, name, ts, ph} = event;

  const startTime = (ts - currentProfilerData.startTime) / 1000;

  switch (cat) {
    case 'disabled-by-default-devtools.screenshot':
      processScreenshot(event, startTime, currentProfilerData, state);
      break;
    case 'devtools.timeline':
      switch (name) {
        case 'EventDispatch':
          processEventDispatch(event, startTime, currentProfilerData, state);
          break;
        case 'ResourceFinish':
          processResourceFinish(event, startTime, currentProfilerData, state);
          break;
        case 'ResourceReceivedData':
          processResourceReceivedData(
            event,
            startTime,
            currentProfilerData,
            state,
          );
          break;
        case 'ResourceReceiveResponse':
          processResourceReceiveResponse(
            event,
            startTime,
            currentProfilerData,
            state,
          );
          break;
        case 'ResourceSendRequest':
          processResourceSendRequest(
            event,
            startTime,
            currentProfilerData,
            state,
          );
          break;
      }
      break;
    case 'blink.user_timing':
      if (name.startsWith('--react-version-')) {
        const [reactVersion] = name.slice(16).split('-');
        currentProfilerData.reactVersion = reactVersion;
      } else if (name.startsWith('--profiler-version-')) {
        const [versionString] = name.slice(19).split('-');
        profilerVersion = parseInt(versionString, 10);
        if (profilerVersion !== SCHEDULING_PROFILER_VERSION) {
          throw new InvalidProfileError(
            `This version of profiling data (${versionString}) is not supported by the current profiler.`,
          );
        }
      } else if (name.startsWith('--react-lane-labels-')) {
        const [laneLabelTuplesString] = name.slice(20).split('-');
        updateLaneToLabelMap(currentProfilerData, laneLabelTuplesString);
      } else if (name.startsWith('--component-')) {
        processReactComponentMeasure(
          name,
          startTime,
          currentProfilerData,
          state,
        );
      } else if (name.startsWith('--schedule-render-')) {
        const [laneBitmaskString] = name.slice(18).split('-');

        currentProfilerData.schedulingEvents.push({
          type: 'schedule-render',
          lanes: getLanesFromTransportDecimalBitmask(laneBitmaskString),
          timestamp: startTime,
          warning: null,
        });
      } else if (name.startsWith('--schedule-forced-update-')) {
        const [laneBitmaskString, componentName] = name.slice(25).split('-');

        const forceUpdateEvent: SchedulingEvent = {
          type: 'schedule-force-update',
          lanes: getLanesFromTransportDecimalBitmask(laneBitmaskString),
          componentName,
          timestamp: startTime,
          warning: null,
        };

        // If this is a nested update, make a note of it.
        // Once we're done processing events, we'll check to see if it was a long update and warn about it.
        if (state.measureStack.find(({type}) => type === 'commit')) {
          state.potentialLongNestedUpdate = forceUpdateEvent;
        }

        currentProfilerData.schedulingEvents.push(forceUpdateEvent);
      } else if (name.startsWith('--schedule-state-update-')) {
        const [laneBitmaskString, componentName] = name.slice(24).split('-');

        const stateUpdateEvent: SchedulingEvent = {
          type: 'schedule-state-update',
          lanes: getLanesFromTransportDecimalBitmask(laneBitmaskString),
          componentName,
          timestamp: startTime,
          warning: null,
        };

        // If this is a nested update, make a note of it.
        // Once we're done processing events, we'll check to see if it was a long update and warn about it.
        if (state.measureStack.find(({type}) => type === 'commit')) {
          state.potentialLongNestedUpdate = stateUpdateEvent;
        }

        currentProfilerData.schedulingEvents.push(stateUpdateEvent);
      } else if (name.startsWith('--error-')) {
        const [componentName, phase, message] = name.slice(8).split('-');

        currentProfilerData.thrownErrors.push({
          componentName,
          message,
          phase: phase as any as Phase,
          timestamp: startTime,
          type: 'thrown-error',
        });
      } else if (name.startsWith('--suspense-suspend-')) {
        const [id, componentName, phase, laneBitmaskString, promiseName] = name
          .slice(19)
          .split('-');
        const lanes = getLanesFromTransportDecimalBitmask(laneBitmaskString);

        const availableDepths = new Array<boolean>(
          state.unresolvedSuspenseEvents.size + 1,
        ).fill(true);
        state.unresolvedSuspenseEvents.forEach(({depth}) => {
          availableDepths[depth] = false;
        });

        let depth = 0;
        for (let i = 0; i < availableDepths.length; i++) {
          if (availableDepths[i]) {
            depth = i;
            break;
          }
        }

        // TODO (timeline) Maybe we should calculate depth in post,
        // so unresolved Suspense requests don't take up space.
        // We can't know if they'll be resolved or not at this point.
        // We'll just give them a default (fake) duration width.

        const suspenseEvent: SuspenseEvent = {
          componentName,
          depth,
          duration: null,
          id,
          phase: phase as any as Phase,
          promiseName: promiseName || null,
          resolution: 'unresolved',
          timestamp: startTime,
          type: 'suspense',
          warning: null,
        };

        if (phase === 'update') {
          // If a component suspended during an update, we should verify that it was during a transition.
          // We need the lane metadata to verify this though.
          // Since that data is only logged during commit, we may not have it yet.
          // Store these events for post-processing then.
          state.potentialSuspenseEventsOutsideOfTransition.push([
            suspenseEvent,
            lanes,
          ]);
        }

        currentProfilerData.suspenseEvents.push(suspenseEvent);
        state.unresolvedSuspenseEvents.set(id, suspenseEvent);
      } else if (name.startsWith('--suspense-resolved-')) {
        const [id] = name.slice(20).split('-');
        const suspenseEvent = state.unresolvedSuspenseEvents.get(id);
        if (suspenseEvent != null) {
          state.unresolvedSuspenseEvents.delete(id);

          suspenseEvent.duration = startTime - suspenseEvent.timestamp;
          suspenseEvent.resolution = 'resolved';
        }
      } else if (name.startsWith('--suspense-rejected-')) {
        const [id] = name.slice(20).split('-');
        const suspenseEvent = state.unresolvedSuspenseEvents.get(id);
        if (suspenseEvent != null) {
          state.unresolvedSuspenseEvents.delete(id);

          suspenseEvent.duration = startTime - suspenseEvent.timestamp;
          suspenseEvent.resolution = 'rejected';
        }
      } else if (name.startsWith('--render-start-')) {
        if (state.nextRenderShouldGenerateNewBatchID) {
          state.nextRenderShouldGenerateNewBatchID = false;
          state.batchUID = state.uidCounter++ as any as BatchUID;
        }

        // If this render is the result of a nested update, make a note of it.
        // Once we're done processing events, we'll check to see if it was a long update and warn about it.
        if (state.potentialLongNestedUpdate !== null) {
          state.potentialLongNestedUpdates.push([
            state.potentialLongNestedUpdate,
            state.batchUID,
          ]);
          state.potentialLongNestedUpdate = null;
        }

        const [laneBitmaskString] = name.slice(15).split('-');

        throwIfIncomplete('render', state.measureStack);
        if (getLastType(state.measureStack) !== 'render-idle') {
          markWorkStarted(
            'render-idle',
            startTime,
            getLanesFromTransportDecimalBitmask(laneBitmaskString),
            currentProfilerData,
            state,
          );
        }
        markWorkStarted(
          'render',
          startTime,
          getLanesFromTransportDecimalBitmask(laneBitmaskString),
          currentProfilerData,
          state,
        );

        for (let i = 0; i < state.nativeEventStack.length; i++) {
          const nativeEvent = state.nativeEventStack[i];
          const stopTime = nativeEvent.timestamp + nativeEvent.duration;

          // If React work was scheduled during an event handler, and the event had a long duration,
          // it might be because the React render was long and stretched the event.
          // It might also be that the React work was short and that something else stretched the event.
          // Make a note of this event for now and we'll examine the batch of React render work later.
          // (We can't know until we're done processing the React update anyway.)
          if (stopTime > startTime) {
            state.potentialLongEvents.push([nativeEvent, state.batchUID]);
          }
        }
      } else if (
        name.startsWith('--render-stop') ||
        name.startsWith('--render-yield')
      ) {
        markWorkCompleted(
          'render',
          startTime,
          currentProfilerData,
          state.measureStack,
        );
      } else if (name.startsWith('--commit-start-')) {
        state.nextRenderShouldGenerateNewBatchID = true;
        const [laneBitmaskString] = name.slice(15).split('-');

        markWorkStarted(
          'commit',
          startTime,
          getLanesFromTransportDecimalBitmask(laneBitmaskString),
          currentProfilerData,
          state,
        );
      } else if (name.startsWith('--commit-stop')) {
        markWorkCompleted(
          'commit',
          startTime,
          currentProfilerData,
          state.measureStack,
        );
        markWorkCompleted(
          'render-idle',
          startTime,
          currentProfilerData,
          state.measureStack,
        );
      } else if (name.startsWith('--layout-effects-start-')) {
        const [laneBitmaskString] = name.slice(23).split('-');

        markWorkStarted(
          'layout-effects',
          startTime,
          getLanesFromTransportDecimalBitmask(laneBitmaskString),
          currentProfilerData,
          state,
        );
      } else if (name.startsWith('--layout-effects-stop')) {
        markWorkCompleted(
          'layout-effects',
          startTime,
          currentProfilerData,
          state.measureStack,
        );
      } else if (name.startsWith('--passive-effects-start-')) {
        const [laneBitmaskString] = name.slice(24).split('-');

        markWorkStarted(
          'passive-effects',
          startTime,
          getLanesFromTransportDecimalBitmask(laneBitmaskString),
          currentProfilerData,
          state,
        );
      } else if (name.startsWith('--passive-effects-stop')) {
        markWorkCompleted(
          'passive-effects',
          startTime,
          currentProfilerData,
          state.measureStack,
        );
      } else if (name.startsWith('--react-internal-module-start-')) {
        const stackFrameStart = name.slice(30);

        if (!state.internalModuleStackStringSet.has(stackFrameStart)) {
          state.internalModuleStackStringSet.add(stackFrameStart);

          const parsedStackFrameStart = parseStackFrame(stackFrameStart);

          state.internalModuleCurrentStackFrame = parsedStackFrameStart;
        }
      } else if (name.startsWith('--react-internal-module-stop-')) {
        const stackFrameStop = name.slice(29);

        if (!state.internalModuleStackStringSet.has(stackFrameStop)) {
          state.internalModuleStackStringSet.add(stackFrameStop);

          const parsedStackFrameStop = parseStackFrame(stackFrameStop);

          if (
            parsedStackFrameStop !== null &&
            state.internalModuleCurrentStackFrame !== null
          ) {
            const parsedStackFrameStart = state.internalModuleCurrentStackFrame;

            state.internalModuleCurrentStackFrame = null;

            const range = [parsedStackFrameStart, parsedStackFrameStop];
            const ranges = currentProfilerData.internalModuleSourceToRanges.get(
              parsedStackFrameStart.fileName,
            );
            if (ranges == null) {
              currentProfilerData.internalModuleSourceToRanges.set(
                parsedStackFrameStart.fileName,
                [range],
              );
            } else {
              ranges.push(range);
            }
          }
        }
      } else if (ph === 'R' || ph === 'n') {
        // User Timing mark
        currentProfilerData.otherUserTimingMarks.push({
          name,
          timestamp: startTime,
        });
      } else if (ph === 'b') {
        // TODO: Begin user timing measure
      } else if (ph === 'e') {
        // TODO: End user timing measure
      } else if (ph === 'i' || ph === 'I') {
        // Instant events.
        // Note that the capital "I" is a deprecated value that exists in Chrome Canary traces.
      } else {
        throw new InvalidProfileError(
          `Unrecognized event ${JSON.stringify(
            event,
          )}! This is likely a bug in this profiler tool.`,
        );
      }
      break;
  }
}

function assertNoOverlappingComponentMeasure(state: ProcessorState) {
  if (state.currentReactComponentMeasure !== null) {
    console.error(
      'Component measure started while another measure in progress:',
      state.currentReactComponentMeasure,
    );
  }
}

function assertCurrentComponentMeasureType(
  state: ProcessorState,
  type: ReactComponentMeasureType,
): void {
  if (state.currentReactComponentMeasure === null) {
    console.error(
      `Component measure type "${type}" stopped while no measure was in progress`,
    );
  } else if (state.currentReactComponentMeasure.type !== type) {
    console.error(
      `Component measure type "${type}" stopped while type ${state.currentReactComponentMeasure.type} in progress`,
    );
  }
}

function processReactComponentMeasure(
  name: string,
  startTime: Milliseconds,
  currentProfilerData: TimelineData,
  state: ProcessorState,
): void {
  if (name.startsWith('--component-render-start-')) {
    const [componentName] = name.slice(25).split('-');

    assertNoOverlappingComponentMeasure(state);

    state.currentReactComponentMeasure = {
      componentName,
      timestamp: startTime,
      duration: 0,
      type: 'render',
      warning: null,
    };
  } else if (name === '--component-render-stop') {
    assertCurrentComponentMeasureType(state, 'render');

    if (state.currentReactComponentMeasure !== null) {
      const componentMeasure = state.currentReactComponentMeasure;
      componentMeasure.duration = startTime - componentMeasure.timestamp;

      state.currentReactComponentMeasure = null;

      currentProfilerData.componentMeasures.push(componentMeasure);
    }
  } else if (name.startsWith('--component-layout-effect-mount-start-')) {
    const [componentName] = name.slice(38).split('-');

    assertNoOverlappingComponentMeasure(state);

    state.currentReactComponentMeasure = {
      componentName,
      timestamp: startTime,
      duration: 0,
      type: 'layout-effect-mount',
      warning: null,
    };
  } else if (name === '--component-layout-effect-mount-stop') {
    assertCurrentComponentMeasureType(state, 'layout-effect-mount');

    if (state.currentReactComponentMeasure !== null) {
      const componentMeasure = state.currentReactComponentMeasure;
      componentMeasure.duration = startTime - componentMeasure.timestamp;

      state.currentReactComponentMeasure = null;

      currentProfilerData.componentMeasures.push(componentMeasure);
    }
  } else if (name.startsWith('--component-layout-effect-unmount-start-')) {
    const [componentName] = name.slice(40).split('-');

    assertNoOverlappingComponentMeasure(state);

    state.currentReactComponentMeasure = {
      componentName,
      timestamp: startTime,
      duration: 0,
      type: 'layout-effect-unmount',
      warning: null,
    };
  } else if (name === '--component-layout-effect-unmount-stop') {
    assertCurrentComponentMeasureType(state, 'layout-effect-unmount');

    if (state.currentReactComponentMeasure !== null) {
      const componentMeasure = state.currentReactComponentMeasure;
      componentMeasure.duration = startTime - componentMeasure.timestamp;

      state.currentReactComponentMeasure = null;

      currentProfilerData.componentMeasures.push(componentMeasure);
    }
  } else if (name.startsWith('--component-passive-effect-mount-start-')) {
    const [componentName] = name.slice(39).split('-');

    assertNoOverlappingComponentMeasure(state);

    state.currentReactComponentMeasure = {
      componentName,
      timestamp: startTime,
      duration: 0,
      type: 'passive-effect-mount',
      warning: null,
    };
  } else if (name === '--component-passive-effect-mount-stop') {
    assertCurrentComponentMeasureType(state, 'passive-effect-mount');

    if (state.currentReactComponentMeasure !== null) {
      const componentMeasure = state.currentReactComponentMeasure;
      componentMeasure.duration = startTime - componentMeasure.timestamp;

      state.currentReactComponentMeasure = null;

      currentProfilerData.componentMeasures.push(componentMeasure);
    }
  } else if (name.startsWith('--component-passive-effect-unmount-start-')) {
    const [componentName] = name.slice(41).split('-');

    assertNoOverlappingComponentMeasure(state);

    state.currentReactComponentMeasure = {
      componentName,
      timestamp: startTime,
      duration: 0,
      type: 'passive-effect-unmount',
      warning: null,
    };
  } else if (name === '--component-passive-effect-unmount-stop') {
    assertCurrentComponentMeasureType(state, 'passive-effect-unmount');

    if (state.currentReactComponentMeasure !== null) {
      const componentMeasure = state.currentReactComponentMeasure;
      componentMeasure.duration = startTime - componentMeasure.timestamp;

      state.currentReactComponentMeasure = null;

      currentProfilerData.componentMeasures.push(componentMeasure);
    }
  }
}

function preprocessFlamechart(rawData: TimelineEvent[]): Flamechart {
  let parsedData;
  try {
    parsedData = importFromChromeTimeline(rawData, 'react-devtools');
  } catch (error) {
    // Assume any Speedscope errors are caused by bad profiles
    const errorToRethrow = new InvalidProfileError(error.message);
    errorToRethrow.stack = error.stack;
    throw errorToRethrow;
  }

  const profile = parsedData.profiles[0]; // TODO: Choose the main CPU thread only

  const speedscopeFlamechart = new SpeedscopeFlamechart({
    // $FlowFixMe[method-unbinding]
    getTotalWeight: profile.getTotalWeight.bind(profile),
    // $FlowFixMe[method-unbinding]
    forEachCall: profile.forEachCall.bind(profile),
    // $FlowFixMe[method-unbinding]
    formatValue: profile.formatValue.bind(profile),
    getColorBucketForFrame: () => 0,
  });

  const flamechart: Flamechart = speedscopeFlamechart.getLayers().map(layer =>
    layer.map(
      ({
        start,
        end,
        node: {
          frame: {name, file, line, col},
        },
      }) => ({
        name,
        timestamp: start / 1000,
        duration: (end - start) / 1000,
        scriptUrl: file,
        locationLine: line,
        locationColumn: col,
      }),
    ),
  );

  return flamechart;
}

function parseStackFrame(stackFrame: string): ErrorStackFrame | null {
  const error = new Error();
  error.stack = stackFrame;

  const frames = ErrorStackParser.parse(error);

  return frames.length === 1 ? frames[0] : null;
}

export default async function preprocessData(
  timeline: TimelineEvent[],
): Promise<TimelineData> {
  const flamechart = preprocessFlamechart(timeline);

  const laneToReactMeasureMap: Map<ReactLane, Array<ReactMeasure>> = new Map();
  for (let lane: ReactLane = 0; lane < REACT_TOTAL_NUM_LANES; lane++) {
    laneToReactMeasureMap.set(lane, []);
  }

  const profilerData: TimelineData = {
    batchUIDToMeasuresMap: new Map(),
    componentMeasures: [],
    duration: 0,
    flamechart,
    internalModuleSourceToRanges: new Map(),
    laneToLabelMap: new Map(),
    laneToReactMeasureMap,
    nativeEvents: [],
    networkMeasures: [],
    otherUserTimingMarks: [],
    reactVersion: null,
    schedulingEvents: [],
    snapshots: [],
    snapshotHeight: 0,
    startTime: 0,
    suspenseEvents: [],
    thrownErrors: [],
  };

  // Sort `timeline`. JSON Array Format trace events need not be ordered. See:
  // https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#heading=h.f2f0yd51wi15
  timeline = timeline.filter(Boolean).sort((a, b) => (a.ts > b.ts ? 1 : -1));

  // Events displayed in flamechart have timestamps relative to the profile
  // event's startTime. Source: https://github.com/v8/v8/blob/44bd8fd7/src/inspector/js_protocol.json#L1486
  //
  // We'll thus expect there to be a 'Profile' event; if there is not one, we
  // can deduce that there are no flame chart events. As we expect React
  // scheduling profiling user timing marks to be recorded together with browser
  // flame chart events, we can further deduce that the data is invalid and we
  // don't bother finding React events.
  const indexOfProfileEvent = timeline.findIndex(
    event => event.name === 'Profile',
  );
  if (indexOfProfileEvent === -1) {
    return profilerData;
  }

  // Use Profile event's `startTime` as the start time to align with flame chart.
  // TODO: Remove assumption that there'll only be 1 'Profile' event. If this
  // assumption does not hold, the chart may start at the wrong time.
  profilerData.startTime = timeline[indexOfProfileEvent].args.data.startTime;
  profilerData.duration =
    (timeline[timeline.length - 1].ts - profilerData.startTime) / 1000;

  const state: ProcessorState = {
    asyncProcessingPromises: [],
    batchUID: 0,
    currentReactComponentMeasure: null,
    internalModuleCurrentStackFrame: null,
    internalModuleStackStringSet: new Set(),
    measureStack: [],
    nativeEventStack: [],
    nextRenderShouldGenerateNewBatchID: true,
    potentialLongEvents: [],
    potentialLongNestedUpdate: null,
    potentialLongNestedUpdates: [],
    potentialSuspenseEventsOutsideOfTransition: [],
    requestIdToNetworkMeasureMap: new Map(),
    uidCounter: 0,
    unresolvedSuspenseEvents: new Map(),
  };

  timeline.forEach(event => processTimelineEvent(event, profilerData, state));

  if (profilerVersion === null) {
    if (
      profilerData.schedulingEvents.length === 0 &&
      profilerData.batchUIDToMeasuresMap.size === 0
    ) {
      // No profiler version could indicate data was logged using an older build of React,
      // before an explicitly profiler version was included in the logging data.
      // But it could also indicate that the website was either not using React, or using a production build.
      // The easiest way to check for this case is to see if the data contains any scheduled updates or render work.
      throw new InvalidProfileError(
        'No React marks were found in the provided profile.' +
          ' Please provide profiling data from an React application running in development or profiling mode.',
      );
    }

    throw new InvalidProfileError(
      `This version of profiling data is not supported by the current profiler.`,
    );
  }

  // Validate that all events and measures are complete
  const {measureStack} = state;
  if (measureStack.length > 0) {
    console.error('Incomplete events or measures', measureStack);
  }

  // Check for warnings.
  state.potentialLongEvents.forEach(([nativeEvent, batchUID]) => {
    // See how long the subsequent batch of React work was.
    // Ignore any work that was already started.
    const [startTime, stopTime] = getBatchRange(
      batchUID,
      profilerData,
      nativeEvent.timestamp,
    );
    if (stopTime - startTime > NATIVE_EVENT_DURATION_THRESHOLD) {
      nativeEvent.warning = WARNING_STRINGS.LONG_EVENT_HANDLER;
    }
  });
  state.potentialLongNestedUpdates.forEach(([schedulingEvent, batchUID]) => {
    // See how long the subsequent batch of React work was.
    const [startTime, stopTime] = getBatchRange(batchUID, profilerData);
    if (stopTime - startTime > NESTED_UPDATE_DURATION_THRESHOLD) {
      // Don't warn about transition updates scheduled during the commit phase.
      // e.g. useTransition, useDeferredValue
      // These are allowed to be long-running.
      if (
        !schedulingEvent.lanes.some(
          lane => profilerData.laneToLabelMap.get(lane) === 'Transition',
        )
      ) {
        // FIXME: This warning doesn't account for "nested updates" that are
        // spawned by useDeferredValue. Disabling temporarily until we figure
        // out the right way to handle this.
        // schedulingEvent.warning = WARNING_STRINGS.NESTED_UPDATE;
      }
    }
  });
  state.potentialSuspenseEventsOutsideOfTransition.forEach(
    ([suspenseEvent, lanes]) => {
      // HACK This is a bit gross but the numeric lane value might change between render versions.
      if (
        !lanes.some(
          lane => profilerData.laneToLabelMap.get(lane) === 'Transition',
        )
      ) {
        suspenseEvent.warning = WARNING_STRINGS.SUSPEND_DURING_UPDATE;
      }
    },
  );

  // Wait for any async processing to complete before returning.
  // Since processing is done in a worker, async work must complete before data is serialized and returned.
  await Promise.all(state.asyncProcessingPromises);

  // Now that all images have been loaded, let's figure out the display size we're going to use for our thumbnails:
  // both the ones rendered to the canvas and the ones shown on hover.
  if (profilerData.snapshots.length > 0) {
    // NOTE We assume a static window size here, which is not necessarily true but should be for most cases.
    // Regardless, Chrome also sets a single size/ratio and stick with it- so we'll do the same.
    const snapshot = profilerData.snapshots[0];

    profilerData.snapshotHeight = Math.min(
      snapshot.height,
      SNAPSHOT_MAX_HEIGHT,
    );
  }

  return profilerData;
}
