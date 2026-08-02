/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Lane,
  Lanes,
  DevToolsProfilingHooks,
  WorkTagMap,
  CurrentDispatcherRef,
} from 'react-devtools-shared/src/backend/types';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {Wakeable} from 'shared/ReactTypes';
import type {
  BatchUID,
  InternalModuleSourceToRanges,
  LaneToLabelMap,
  ReactComponentMeasure,
  ReactLane,
  ReactMeasure,
  ReactMeasureType,
  ReactScheduleStateUpdateEvent,
  SchedulingEvent,
  SuspenseEvent,
  TimelineData,
} from 'react-devtools-timeline/src/types';

import isArray from 'shared/isArray';
import {
  REACT_TOTAL_NUM_LANES,
  SCHEDULING_PROFILER_VERSION,
} from 'react-devtools-timeline/src/constants';
import {describeFiber} from './fiber/DevToolsFiberComponentStack';

// Add padding to the start/stop time of the profile.
// This makes the UI nicer to use.
const TIME_OFFSET = 10;

let performanceTarget: Performance | null = null;

// If performance exists and supports the subset of the User Timing API that we require.
let supportsUserTiming =
  typeof performance !== 'undefined' &&
  // $FlowFixMe[method-unbinding]
  typeof performance.mark === 'function' &&
  // $FlowFixMe[method-unbinding]
  typeof performance.clearMarks === 'function';

let supportsUserTimingV3 = false;
if (supportsUserTiming) {
  const CHECK_V3_MARK = '__v3';
  const markOptions: {
    detail?: mixed,
    startTime?: number,
  } = {};
  Object.defineProperty(markOptions, 'startTime', {
    get: function () {
      supportsUserTimingV3 = true;
      return 0;
    },
    set: function () {},
  });

  try {
    performance.mark(CHECK_V3_MARK, markOptions);
  } catch (error) {
    // Ignore
  } finally {
    performance.clearMarks(CHECK_V3_MARK);
  }
}

if (supportsUserTimingV3) {
  performanceTarget = performance;
}

// Some environments (e.g. React Native / Hermes) don't support the performance API yet.
const getCurrentTime =
  // $FlowFixMe[method-unbinding]
  typeof performance === 'object' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

// Mocking the Performance Object (and User Timing APIs) for testing is fragile.
// This API allows tests to directly override the User Timing APIs.
export function setPerformanceMock_ONLY_FOR_TESTING(
  performanceMock: Performance | null,
) {
  performanceTarget = performanceMock;
  supportsUserTiming = performanceMock !== null;
  supportsUserTimingV3 = performanceMock !== null;
}

export type GetTimelineData = () => TimelineData | null;
export type ToggleProfilingStatus = (
  value: boolean,
  recordTimeline?: boolean,
) => void;

type Response = {
  getTimelineData: GetTimelineData,
  profilingHooks: DevToolsProfilingHooks,
  toggleProfilingStatus: ToggleProfilingStatus,
};

export function createProfilingHooks({
  getDisplayNameForFiber,
  getIsProfiling,
  getLaneLabelMap,
  workTagMap,
  currentDispatcherRef,
  reactVersion,
}: {
  getDisplayNameForFiber: (fiber: Fiber) => string | null,
  getIsProfiling: () => boolean,
  getLaneLabelMap?: () => Map<Lane, string> | null,
  currentDispatcherRef?: CurrentDispatcherRef,
  workTagMap: WorkTagMap,
  reactVersion: string,
}): Response {
  let currentBatchUID: BatchUID = 0;
  let currentReactComponentMeasure: ReactComponentMeasure | null = null;
  let currentReactMeasuresStack: Array<ReactMeasure> = [];
  let currentTimelineData: TimelineData | null = null;
  let currentFiberStacks: Map<SchedulingEvent, Array<Fiber>> = new Map();
  let isProfiling: boolean = false;
  let nextRenderShouldStartNewBatch: boolean = false;

  function getRelativeTime() {
    const currentTime = getCurrentTime();

    if (currentTimelineData) {
      if (currentTimelineData.startTime === 0) {
        currentTimelineData.startTime = currentTime - TIME_OFFSET;
      }

      return currentTime - currentTimelineData.startTime;
    }

    return 0;
  }

  function getInternalModuleRanges() {
    /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
    if (
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' &&
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.getInternalModuleRanges ===
        'function'
    ) {
      // Ask the DevTools hook for module ranges that may have been reported by the current renderer(s).
      // Don't do this eagerly like the laneToLabelMap,
      // because some modules might not yet have registered their boundaries when the renderer is injected.
      const ranges = __REACT_DEVTOOLS_GLOBAL_HOOK__.getInternalModuleRanges();

      // This check would not be required,
      // except that it's possible for things to override __REACT_DEVTOOLS_GLOBAL_HOOK__.
      if (isArray(ranges)) {
        return ranges;
      }
    }

    return null;
  }

  function getTimelineData(): TimelineData | null {
    return currentTimelineData;
  }

  function laneToLanesArray(lanes: Lane) {
    const lanesArray = [];

    let lane = 1;
    for (let index = 0; index < REACT_TOTAL_NUM_LANES; index++) {
      if (lane & lanes) {
        lanesArray.push(lane);
      }
      lane *= 2;
    }

    return lanesArray;
  }

  const laneToLabelMap: LaneToLabelMap | null =
    typeof getLaneLabelMap === 'function' ? getLaneLabelMap() : null;

  function markMetadata() {
    markAndClear(`--react-version-${reactVersion}`);
    markAndClear(`--profiler-version-${SCHEDULING_PROFILER_VERSION}`);

    const ranges = getInternalModuleRanges();
    if (ranges) {
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        if (isArray(range) && range.length === 2) {
          const [startStackFrame, stopStackFrame] = ranges[i];

          markAndClear(`--react-internal-module-start-${startStackFrame}`);
          markAndClear(`--react-internal-module-stop-${stopStackFrame}`);
        }
      }
    }

    if (laneToLabelMap != null) {
      const labels = Array.from(laneToLabelMap.values()).join(',');
      markAndClear(`--react-lane-labels-${labels}`);
    }
  }

  function markAndClear(markName: string) {
    // This method won't be called unless these functions are defined, so we can skip the extra typeof check.
    (performanceTarget as any as Performance).mark(markName);
    (performanceTarget as any as Performance).clearMarks(markName);
  }

  function recordReactMeasureStarted(
    type: ReactMeasureType,
    lanes: Lanes,
  ): void {
    // Decide what depth thi work should be rendered at, based on what's on the top of the stack.
    // It's okay to render over top of "idle" work but everything else should be on its own row.
    let depth = 0;
    if (currentReactMeasuresStack.length > 0) {
      const top =
        currentReactMeasuresStack[currentReactMeasuresStack.length - 1];
      depth = top.type === 'render-idle' ? top.depth : top.depth + 1;
    }

    const lanesArray = laneToLanesArray(lanes);

    const reactMeasure: ReactMeasure = {
      type,
      batchUID: currentBatchUID,
      depth,
      lanes: lanesArray,
      timestamp: getRelativeTime(),
      duration: 0,
    };

    currentReactMeasuresStack.push(reactMeasure);

    if (currentTimelineData) {
      const {batchUIDToMeasuresMap, laneToReactMeasureMap} =
        currentTimelineData;

      let reactMeasures = batchUIDToMeasuresMap.get(currentBatchUID);
      if (reactMeasures != null) {
        reactMeasures.push(reactMeasure);
      } else {
        batchUIDToMeasuresMap.set(currentBatchUID, [reactMeasure]);
      }

      lanesArray.forEach(lane => {
        reactMeasures = laneToReactMeasureMap.get(lane);
        if (reactMeasures) {
          reactMeasures.push(reactMeasure);
        }
      });
    }
  }

  function recordReactMeasureCompleted(type: ReactMeasureType): void {
    const currentTime = getRelativeTime();

    if (currentReactMeasuresStack.length === 0) {
      console.error(
        'Unexpected type "%s" completed at %sms while currentReactMeasuresStack is empty.',
        type,
        currentTime,
      );
      // Ignore work "completion" user timing mark that doesn't complete anything
      return;
    }

    const top = currentReactMeasuresStack.pop();
    // $FlowFixMe[incompatible-type]
    // $FlowFixMe[incompatible-use]
    if (top.type !== type) {
      console.error(
        'Unexpected type "%s" completed at %sms before "%s" completed.',
        type,
        currentTime,
        // $FlowFixMe[incompatible-use]
        top.type,
      );
    }

    // $FlowFixMe[cannot-write] This property should not be writable outside of this function.
    // $FlowFixMe[incompatible-use]
    top.duration = currentTime - top.timestamp;

    if (currentTimelineData) {
      currentTimelineData.duration = getRelativeTime() + TIME_OFFSET;
    }
  }

  function markCommitStarted(lanes: Lanes): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureStarted('commit', lanes);

    // TODO (timeline) Re-think this approach to "batching"; I don't think it works for Suspense or pre-rendering.
    // This issue applies to the User Timing data also.
    nextRenderShouldStartNewBatch = true;

    if (supportsUserTimingV3) {
      markAndClear(`--commit-start-${lanes}`);

      // Some metadata only needs to be logged once per session,
      // but if profiling information is being recorded via the Performance tab,
      // DevTools has no way of knowing when the recording starts.
      // Because of that, we log this type of data periodically (once per commit).
      markMetadata();
    }
  }

  function markCommitStopped(): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureCompleted('commit');
    recordReactMeasureCompleted('render-idle');
    if (supportsUserTimingV3) {
      markAndClear('--commit-stop');
    }
  }

  function markComponentRenderStarted(fiber: Fiber): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    currentReactComponentMeasure = {
      componentName,
      duration: 0,
      timestamp: getRelativeTime(),
      type: 'render',
      warning: null,
    };

    if (supportsUserTimingV3) {
      markAndClear(`--component-render-start-${componentName}`);
    }
  }

  function markComponentRenderStopped(): void {
    if (!isProfiling) {
      return;
    }

    if (currentReactComponentMeasure) {
      if (currentTimelineData) {
        currentTimelineData.componentMeasures.push(
          currentReactComponentMeasure,
        );
      }

      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentReactComponentMeasure.duration =
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        getRelativeTime() - currentReactComponentMeasure.timestamp;
      currentReactComponentMeasure = null;
    }

    if (supportsUserTimingV3) {
      markAndClear('--component-render-stop');
    }
  }

  function markComponentLayoutEffectMountStarted(fiber: Fiber): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    currentReactComponentMeasure = {
      componentName,
      duration: 0,
      timestamp: getRelativeTime(),
      type: 'layout-effect-mount',
      warning: null,
    };

    if (supportsUserTimingV3) {
      markAndClear(`--component-layout-effect-mount-start-${componentName}`);
    }
  }

  function markComponentLayoutEffectMountStopped(): void {
    if (!isProfiling) {
      return;
    }

    if (currentReactComponentMeasure) {
      if (currentTimelineData) {
        currentTimelineData.componentMeasures.push(
          currentReactComponentMeasure,
        );
      }

      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentReactComponentMeasure.duration =
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        getRelativeTime() - currentReactComponentMeasure.timestamp;
      currentReactComponentMeasure = null;
    }

    if (supportsUserTimingV3) {
      markAndClear('--component-layout-effect-mount-stop');
    }
  }

  function markComponentLayoutEffectUnmountStarted(fiber: Fiber): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    currentReactComponentMeasure = {
      componentName,
      duration: 0,
      timestamp: getRelativeTime(),
      type: 'layout-effect-unmount',
      warning: null,
    };

    if (supportsUserTimingV3) {
      markAndClear(`--component-layout-effect-unmount-start-${componentName}`);
    }
  }

  function markComponentLayoutEffectUnmountStopped(): void {
    if (!isProfiling) {
      return;
    }

    if (currentReactComponentMeasure) {
      if (currentTimelineData) {
        currentTimelineData.componentMeasures.push(
          currentReactComponentMeasure,
        );
      }

      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentReactComponentMeasure.duration =
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        getRelativeTime() - currentReactComponentMeasure.timestamp;
      currentReactComponentMeasure = null;
    }

    if (supportsUserTimingV3) {
      markAndClear('--component-layout-effect-unmount-stop');
    }
  }

  function markComponentPassiveEffectMountStarted(fiber: Fiber): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    currentReactComponentMeasure = {
      componentName,
      duration: 0,
      timestamp: getRelativeTime(),
      type: 'passive-effect-mount',
      warning: null,
    };

    if (supportsUserTimingV3) {
      markAndClear(`--component-passive-effect-mount-start-${componentName}`);
    }
  }

  function markComponentPassiveEffectMountStopped(): void {
    if (!isProfiling) {
      return;
    }

    if (currentReactComponentMeasure) {
      if (currentTimelineData) {
        currentTimelineData.componentMeasures.push(
          currentReactComponentMeasure,
        );
      }

      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentReactComponentMeasure.duration =
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        getRelativeTime() - currentReactComponentMeasure.timestamp;
      currentReactComponentMeasure = null;
    }

    if (supportsUserTimingV3) {
      markAndClear('--component-passive-effect-mount-stop');
    }
  }

  function markComponentPassiveEffectUnmountStarted(fiber: Fiber): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    currentReactComponentMeasure = {
      componentName,
      duration: 0,
      timestamp: getRelativeTime(),
      type: 'passive-effect-unmount',
      warning: null,
    };

    if (supportsUserTimingV3) {
      markAndClear(`--component-passive-effect-unmount-start-${componentName}`);
    }
  }

  function markComponentPassiveEffectUnmountStopped(): void {
    if (!isProfiling) {
      return;
    }

    if (currentReactComponentMeasure) {
      if (currentTimelineData) {
        currentTimelineData.componentMeasures.push(
          currentReactComponentMeasure,
        );
      }

      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentReactComponentMeasure.duration =
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        getRelativeTime() - currentReactComponentMeasure.timestamp;
      currentReactComponentMeasure = null;
    }

    if (supportsUserTimingV3) {
      markAndClear('--component-passive-effect-unmount-stop');
    }
  }

  function markComponentErrored(
    fiber: Fiber,
    thrownValue: mixed,
    lanes: Lanes,
  ): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';
    const phase = fiber.alternate === null ? 'mount' : 'update';

    let message = '';
    if (
      thrownValue !== null &&
      typeof thrownValue === 'object' &&
      typeof thrownValue.message === 'string'
    ) {
      message = thrownValue.message;
    } else if (typeof thrownValue === 'string') {
      message = thrownValue;
    }

    // TODO (timeline) Record and cache component stack
    if (currentTimelineData) {
      currentTimelineData.thrownErrors.push({
        componentName,
        message,
        phase,
        timestamp: getRelativeTime(),
        type: 'thrown-error',
      });
    }

    if (supportsUserTimingV3) {
      markAndClear(`--error-${componentName}-${phase}-${message}`);
    }
  }

  const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;

  // $FlowFixMe[incompatible-type]: Flow cannot handle polymorphic WeakMaps
  const wakeableIDs: WeakMap<Wakeable, number> = new PossiblyWeakMap();
  let wakeableID: number = 0;
  function getWakeableID(wakeable: Wakeable): number {
    if (!wakeableIDs.has(wakeable)) {
      wakeableIDs.set(wakeable, wakeableID++);
    }
    return wakeableIDs.get(wakeable) as any as number;
  }

  function markComponentSuspended(
    fiber: Fiber,
    wakeable: Wakeable,
    lanes: Lanes,
  ): void {
    if (!isProfiling) {
      return;
    }

    const eventType = wakeableIDs.has(wakeable) ? 'resuspend' : 'suspend';
    const id = getWakeableID(wakeable);
    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';
    const phase = fiber.alternate === null ? 'mount' : 'update';

    // Following the non-standard fn.displayName convention,
    // frameworks like Relay may also annotate Promises with a displayName,
    // describing what operation/data the thrown Promise is related to.
    // When this is available we should pass it along to the Timeline.
    const displayName = (wakeable as any).displayName || '';

    let suspenseEvent: SuspenseEvent | null = null;
    // TODO (timeline) Record and cache component stack
    suspenseEvent = {
      componentName,
      depth: 0,
      duration: 0,
      id: `${id}`,
      phase,
      promiseName: displayName,
      resolution: 'unresolved',
      timestamp: getRelativeTime(),
      type: 'suspense',
      warning: null,
    };

    if (currentTimelineData) {
      currentTimelineData.suspenseEvents.push(suspenseEvent);
    }

    if (supportsUserTimingV3) {
      markAndClear(
        `--suspense-${eventType}-${id}-${componentName}-${phase}-${lanes}-${displayName}`,
      );

      wakeable.then(
        () => {
          if (suspenseEvent) {
            suspenseEvent.duration =
              getRelativeTime() - suspenseEvent.timestamp;
            suspenseEvent.resolution = 'resolved';
          }

          if (supportsUserTimingV3) {
            markAndClear(`--suspense-resolved-${id}-${componentName}`);
          }
        },
        () => {
          if (suspenseEvent) {
            suspenseEvent.duration =
              getRelativeTime() - suspenseEvent.timestamp;
            suspenseEvent.resolution = 'rejected';
          }

          if (supportsUserTimingV3) {
            markAndClear(`--suspense-rejected-${id}-${componentName}`);
          }
        },
      );
    }
  }

  function markLayoutEffectsStarted(lanes: Lanes): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureStarted('layout-effects', lanes);
    if (supportsUserTimingV3) {
      markAndClear(`--layout-effects-start-${lanes}`);
    }
  }

  function markLayoutEffectsStopped(): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureCompleted('layout-effects');
    if (supportsUserTimingV3) {
      markAndClear('--layout-effects-stop');
    }
  }

  function markPassiveEffectsStarted(lanes: Lanes): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureStarted('passive-effects', lanes);
    if (supportsUserTimingV3) {
      markAndClear(`--passive-effects-start-${lanes}`);
    }
  }

  function markPassiveEffectsStopped(): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureCompleted('passive-effects');
    if (supportsUserTimingV3) {
      markAndClear('--passive-effects-stop');
    }
  }

  function markRenderStarted(lanes: Lanes): void {
    if (!isProfiling) {
      return;
    }

    if (nextRenderShouldStartNewBatch) {
      nextRenderShouldStartNewBatch = false;
      currentBatchUID++;
    }

    // If this is a new batch of work, wrap an "idle" measure around it.
    // Log it before the "render" measure to preserve the stack ordering.
    if (
      currentReactMeasuresStack.length === 0 ||
      currentReactMeasuresStack[currentReactMeasuresStack.length - 1].type !==
        'render-idle'
    ) {
      recordReactMeasureStarted('render-idle', lanes);
    }

    recordReactMeasureStarted('render', lanes);
    if (supportsUserTimingV3) {
      markAndClear(`--render-start-${lanes}`);
    }
  }

  function markRenderYielded(): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureCompleted('render');
    if (supportsUserTimingV3) {
      markAndClear('--render-yield');
    }
  }

  function markRenderStopped(): void {
    if (!isProfiling) {
      return;
    }

    recordReactMeasureCompleted('render');
    if (supportsUserTimingV3) {
      markAndClear('--render-stop');
    }
  }

  function markRenderScheduled(lane: Lane): void {
    if (!isProfiling) {
      return;
    }

    if (currentTimelineData) {
      currentTimelineData.schedulingEvents.push({
        lanes: laneToLanesArray(lane),
        timestamp: getRelativeTime(),
        type: 'schedule-render',
        warning: null,
      });
    }

    if (supportsUserTimingV3) {
      markAndClear(`--schedule-render-${lane}`);
    }
  }

  function markForceUpdateScheduled(fiber: Fiber, lane: Lane): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    if (currentTimelineData) {
      currentTimelineData.schedulingEvents.push({
        componentName,
        lanes: laneToLanesArray(lane),
        timestamp: getRelativeTime(),
        type: 'schedule-force-update',
        warning: null,
      });
    }

    if (supportsUserTimingV3) {
      markAndClear(`--schedule-forced-update-${lane}-${componentName}`);
    }
  }

  function getParentFibers(fiber: Fiber): Array<Fiber> {
    const parents = [];
    let parent: null | Fiber = fiber;
    while (parent !== null) {
      parents.push(parent);
      parent = parent.return;
    }
    return parents;
  }

  function markStateUpdateScheduled(fiber: Fiber, lane: Lane): void {
    if (!isProfiling) {
      return;
    }

    const componentName = getDisplayNameForFiber(fiber) || 'Unknown';

    // TODO (timeline) Record and cache component stack
    if (currentTimelineData) {
      const event: ReactScheduleStateUpdateEvent = {
        componentName,
        // Store the parent fibers so we can post process
        // them after we finish profiling
        lanes: laneToLanesArray(lane),
        timestamp: getRelativeTime(),
        type: 'schedule-state-update',
        warning: null,
      };
      currentFiberStacks.set(event, getParentFibers(fiber));
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      currentTimelineData.schedulingEvents.push(event);
    }

    if (supportsUserTimingV3) {
      markAndClear(`--schedule-state-update-${lane}-${componentName}`);
    }
  }

  function toggleProfilingStatus(
    value: boolean,
    recordTimeline: boolean = false,
  ) {
    if (isProfiling !== value) {
      isProfiling = value;

      if (isProfiling) {
        const internalModuleSourceToRanges: InternalModuleSourceToRanges =
          new Map();

        if (supportsUserTimingV3) {
          const ranges = getInternalModuleRanges();
          if (ranges) {
            for (let i = 0; i < ranges.length; i++) {
              const range = ranges[i];
              if (isArray(range) && range.length === 2) {
                const [startStackFrame, stopStackFrame] = ranges[i];

                markAndClear(
                  `--react-internal-module-start-${startStackFrame}`,
                );
                markAndClear(`--react-internal-module-stop-${stopStackFrame}`);
              }
            }
          }
        }

        const laneToReactMeasureMap = new Map<ReactLane, ReactMeasure[]>();
        let lane = 1;
        for (let index = 0; index < REACT_TOTAL_NUM_LANES; index++) {
          laneToReactMeasureMap.set(lane, []);
          lane *= 2;
        }

        currentBatchUID = 0;
        currentReactComponentMeasure = null;
        currentReactMeasuresStack = [];
        currentFiberStacks = new Map();
        if (recordTimeline) {
          currentTimelineData = {
            // Session wide metadata; only collected once.
            internalModuleSourceToRanges,
            laneToLabelMap: laneToLabelMap || new Map(),
            reactVersion,

            // Data logged by React during profiling session.
            componentMeasures: [],
            schedulingEvents: [],
            suspenseEvents: [],
            thrownErrors: [],

            // Data inferred based on what React logs.
            batchUIDToMeasuresMap: new Map(),
            duration: 0,
            laneToReactMeasureMap,
            startTime: 0,

            // Data only available in Chrome profiles.
            flamechart: [],
            nativeEvents: [],
            networkMeasures: [],
            otherUserTimingMarks: [],
            snapshots: [],
            snapshotHeight: 0,
          };
        }
        nextRenderShouldStartNewBatch = true;
      } else {
        // This is __EXPENSIVE__.
        // We could end up with hundreds of state updated, and for each one of them
        // would try to create a component stack with possibly hundreds of Fibers.
        // Creating a cache of component stacks won't help, generating a single stack is already expensive enough.
        // We should find a way to lazily generate component stacks on demand, when user inspects a specific event.
        // If we succeed with moving React DevTools Timeline Profiler to Performance panel, then Timeline Profiler would probably be removed.
        // Now that owner stacks are adopted, revisit this again and cache component stacks per Fiber,
        // but only return them when needed, sending hundreds of component stacks is beyond the Bridge's bandwidth.

        // Postprocess Profile data
        if (currentTimelineData !== null) {
          currentTimelineData.schedulingEvents.forEach(event => {
            if (event.type === 'schedule-state-update') {
              // TODO(luna): We can optimize this by creating a map of
              // fiber to component stack instead of generating the stack
              // for every fiber every time
              const fiberStack = currentFiberStacks.get(event);
              if (fiberStack && currentDispatcherRef != null) {
                event.componentStack = fiberStack.reduce((trace, fiber) => {
                  return (
                    trace +
                    describeFiber(workTagMap, fiber, currentDispatcherRef)
                  );
                }, '');
              }
            }
          });
        }

        // Clear the current fiber stacks so we don't hold onto the fibers
        // in memory after profiling finishes
        currentFiberStacks.clear();
      }
    }
  }

  return {
    getTimelineData,
    profilingHooks: {
      markCommitStarted,
      markCommitStopped,
      markComponentRenderStarted,
      markComponentRenderStopped,
      markComponentPassiveEffectMountStarted,
      markComponentPassiveEffectMountStopped,
      markComponentPassiveEffectUnmountStarted,
      markComponentPassiveEffectUnmountStopped,
      markComponentLayoutEffectMountStarted,
      markComponentLayoutEffectMountStopped,
      markComponentLayoutEffectUnmountStarted,
      markComponentLayoutEffectUnmountStopped,
      markComponentErrored,
      markComponentSuspended,
      markLayoutEffectsStarted,
      markLayoutEffectsStopped,
      markPassiveEffectsStarted,
      markPassiveEffectsStopped,
      markRenderStarted,
      markRenderYielded,
      markRenderStopped,
      markRenderScheduled,
      markForceUpdateScheduled,
      markStateUpdateScheduled,
    },
    toggleProfilingStatus,
  };
}
