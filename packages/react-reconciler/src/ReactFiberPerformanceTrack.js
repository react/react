/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable react-internal/no-production-logging */

import type {Fiber} from './ReactInternalTypes';

import type {Lanes} from './ReactFiberLane';

import type {CapturedValue} from './ReactCapturedValue';

import {SuspenseComponent} from './ReactWorkTags';

import getComponentNameFromFiber from './getComponentNameFromFiber';

import {
  getGroupNameOfHighestPriorityLane,
  includesOnlyHydrationLanes,
  includesOnlyOffscreenLanes,
  includesOnlyHydrationOrOffscreenLanes,
  includesSomeLane,
} from './ReactFiberLane';

import {
  addValueToProperties,
  addObjectToProperties,
  addObjectDiffToProperties,
} from 'shared/ReactPerformanceTrackProperties';

import {
  enableProfilerTimer,
  enableGestureTransition,
  enablePerformanceIssueReporting,
} from 'shared/ReactFeatureFlags';

const supportsUserTiming =
  enableProfilerTimer &&
  typeof console !== 'undefined' &&
  typeof console.timeStamp === 'function' &&
  (!__DEV__ ||
    // In DEV we also rely on performance.measure
    (typeof performance !== 'undefined' &&
      // $FlowFixMe[method-unbinding]
      typeof performance.measure === 'function'));

const COMPONENTS_TRACK = 'Components ⚛';
const LANES_TRACK_GROUP = 'Scheduler ⚛';

let currentTrack: string = 'Blocking'; // Lane

export function setCurrentTrackFromLanes(lanes: Lanes): void {
  currentTrack = getGroupNameOfHighestPriorityLane(lanes);
}

export function markAllLanesInOrder() {
  if (supportsUserTiming) {
    // Ensure we create all tracks in priority order. Currently performance.mark() are in
    // first insertion order but performance.measure() are in the reverse order. We can
    // always add the 0 time slot even if it's in the past. That's still considered for
    // ordering.
    console.timeStamp(
      'Blocking Track',
      0.003,
      0.003,
      'Blocking',
      LANES_TRACK_GROUP,
      'primary-light',
    );
    if (enableGestureTransition) {
      console.timeStamp(
        'Gesture Track',
        0.003,
        0.003,
        'Gesture',
        LANES_TRACK_GROUP,
        'primary-light',
      );
    }
    console.timeStamp(
      'Transition Track',
      0.003,
      0.003,
      'Transition',
      LANES_TRACK_GROUP,
      'primary-light',
    );
    console.timeStamp(
      'Suspense Track',
      0.003,
      0.003,
      'Suspense',
      LANES_TRACK_GROUP,
      'primary-light',
    );
    console.timeStamp(
      'Idle Track',
      0.003,
      0.003,
      'Idle',
      LANES_TRACK_GROUP,
      'primary-light',
    );
  }
}

function logComponentTrigger(
  fiber: Fiber,
  startTime: number,
  endTime: number,
  trigger: string,
) {
  if (supportsUserTiming) {
    reusableComponentOptions.start = startTime;
    reusableComponentOptions.end = endTime;
    reusableComponentDevToolDetails.color = 'warning';
    reusableComponentDevToolDetails.tooltipText = trigger;
    reusableComponentDevToolDetails.properties = null;
    const debugTask = fiber._debugTask;
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        performance.measure.bind(
          performance,
          trigger,
          reusableComponentOptions,
        ),
      );
    } else {
      performance.measure(trigger, reusableComponentOptions);
    }
    performance.clearMeasures(trigger);
  }
}

export function logComponentMount(
  fiber: Fiber,
  startTime: number,
  endTime: number,
): void {
  logComponentTrigger(fiber, startTime, endTime, 'Mount');
}

export function logComponentUnmount(
  fiber: Fiber,
  startTime: number,
  endTime: number,
): void {
  logComponentTrigger(fiber, startTime, endTime, 'Unmount');
}

export function logComponentReappeared(
  fiber: Fiber,
  startTime: number,
  endTime: number,
): void {
  logComponentTrigger(fiber, startTime, endTime, 'Reconnect');
}

export function logComponentDisappeared(
  fiber: Fiber,
  startTime: number,
  endTime: number,
): void {
  logComponentTrigger(fiber, startTime, endTime, 'Disconnect');
}

let alreadyWarnedForDeepEquality = false;

export function pushDeepEquality(): boolean {
  if (__DEV__) {
    // If this is true then we don't reset it to false because we're tracking if any
    // parent already warned about having deep equality props in this subtree.
    return alreadyWarnedForDeepEquality;
  }
  return false;
}

export function popDeepEquality(prev: boolean): void {
  if (__DEV__) {
    alreadyWarnedForDeepEquality = prev;
  }
}

const reusableComponentDevToolDetails = {
  color: 'primary',
  properties: null as null | Array<[string, string]>,
  tooltipText: '',
  track: COMPONENTS_TRACK,
};

const reusableComponentOptions: PerformanceMeasureOptions = {
  start: -0,
  end: -0,
  detail: {
    devtools: reusableComponentDevToolDetails,
  },
};

const reusableChangedPropsEntry = ['Changed Props', ''];

const reusableCascadingUpdateIssue = {
  name: 'React: Cascading Update',
  severity: 'warning',
  description:
    'A cascading update is an update that is triggered during an ongoing render. This can lead to performance issues.',
  learnMoreUrl:
    'https://react.dev/reference/dev-tools/react-performance-tracks#cascading-updates',
};

const DEEP_EQUALITY_WARNING =
  'This component received deeply equal props. It might benefit from useMemo or the React Compiler in its owner.';

const reusableDeeplyEqualPropsEntry = ['Changed Props', DEEP_EQUALITY_WARNING];

export function logComponentRender(
  fiber: Fiber,
  startTime: number,
  endTime: number,
  wasHydrated: boolean,
  committedLanes: Lanes,
): void {
  const name = getComponentNameFromFiber(fiber);
  if (name === null) {
    // Skip
    return;
  }
  if (supportsUserTiming) {
    const alternate = fiber.alternate;
    let selfTime: number = fiber.actualDuration as any;
    if (alternate === null || alternate.child !== fiber.child) {
      for (let child = fiber.child; child !== null; child = child.sibling) {
        selfTime -= child.actualDuration as any;
      }
    }
    const color =
      selfTime < 0.5
        ? wasHydrated
          ? 'tertiary-light'
          : 'primary-light'
        : selfTime < 10
          ? wasHydrated
            ? 'tertiary'
            : 'primary'
          : selfTime < 100
            ? wasHydrated
              ? 'tertiary-dark'
              : 'primary-dark'
            : 'error';

    if (!__DEV__) {
      console.timeStamp(
        name,
        startTime,
        endTime,
        COMPONENTS_TRACK,
        undefined,
        color,
      );
    } else {
      const props = fiber.memoizedProps;
      const debugTask = fiber._debugTask;

      if (
        props !== null &&
        alternate !== null &&
        alternate.memoizedProps !== props
      ) {
        // If this is an update, we'll diff the props and emit which ones changed.
        const properties: Array<[string, string]> = [reusableChangedPropsEntry];
        const isDeeplyEqual = addObjectDiffToProperties(
          alternate.memoizedProps,
          props,
          properties,
          0,
        );
        if (properties.length > 1) {
          if (
            isDeeplyEqual &&
            !alreadyWarnedForDeepEquality &&
            !includesSomeLane(alternate.lanes, committedLanes) &&
            (fiber.actualDuration as any) > 100
          ) {
            alreadyWarnedForDeepEquality = true;
            // This is the first component in a subtree which rerendered with deeply equal props
            // and didn't have its own work scheduled and took a non-trivial amount of time.
            // We highlight this for further inspection.
            // Note that we only consider this case if properties.length > 1 which it will only
            // be if we have emitted any diffs. We'd only emit diffs if there were any nested
            // equal objects. Therefore, we don't warn for simple shallow equality.
            properties[0] = reusableDeeplyEqualPropsEntry;
            reusableComponentDevToolDetails.color = 'warning';
            reusableComponentDevToolDetails.tooltipText = DEEP_EQUALITY_WARNING;
          } else {
            reusableComponentDevToolDetails.color = color;
            reusableComponentDevToolDetails.tooltipText = name;
          }
          reusableComponentDevToolDetails.properties = properties;
          reusableComponentOptions.start = startTime;
          reusableComponentOptions.end = endTime;

          const measureName = '\u200b' + name;
          if (debugTask != null) {
            debugTask.run(
              // $FlowFixMe[method-unbinding]
              performance.measure.bind(
                performance,
                measureName,
                reusableComponentOptions,
              ),
            );
          } else {
            performance.measure(measureName, reusableComponentOptions);
          }
          performance.clearMeasures(measureName);
        } else {
          if (debugTask != null) {
            debugTask.run(
              // $FlowFixMe[method-unbinding]
              console.timeStamp.bind(
                console,
                name,
                startTime,
                endTime,
                COMPONENTS_TRACK,
                undefined,
                color,
              ),
            );
          } else {
            console.timeStamp(
              name,
              startTime,
              endTime,
              COMPONENTS_TRACK,
              undefined,
              color,
            );
          }
        }
      } else {
        if (debugTask != null) {
          debugTask.run(
            // $FlowFixMe[method-unbinding]
            console.timeStamp.bind(
              console,
              name,
              startTime,
              endTime,
              COMPONENTS_TRACK,
              undefined,
              color,
            ),
          );
        } else {
          console.timeStamp(
            name,
            startTime,
            endTime,
            COMPONENTS_TRACK,
            undefined,
            color,
          );
        }
      }
    }
  }
}

export function logComponentErrored(
  fiber: Fiber,
  startTime: number,
  endTime: number,
  errors: Array<CapturedValue<mixed>>,
): void {
  if (supportsUserTiming) {
    const name = getComponentNameFromFiber(fiber);
    if (name === null) {
      // Skip
      return;
    }
    if (__DEV__) {
      let debugTask: ?ConsoleTask = null;
      const properties: Array<[string, string]> = [];
      for (let i = 0; i < errors.length; i++) {
        const capturedValue = errors[i];
        if (debugTask == null && capturedValue.source !== null) {
          // If the captured value has a source Fiber, use its debugTask for
          // the stack instead of the error boundary's stack. So you can find
          // which component errored since we don't show the errored render tree.
          // TODO: Ideally we should instead, store the failed fibers and log the
          // whole subtree including the component that errored.
          debugTask = capturedValue.source._debugTask;
        }
        const error = capturedValue.value;
        const message =
          typeof error === 'object' &&
          error !== null &&
          typeof error.message === 'string'
            ? // eslint-disable-next-line react-internal/safe-string-coercion
              String(error.message)
            : // eslint-disable-next-line react-internal/safe-string-coercion
              String(error);
        properties.push(['Error', message]);
      }
      if (fiber.key !== null) {
        addValueToProperties('key', fiber.key, properties, 0, '');
      }
      if (fiber.memoizedProps !== null) {
        addObjectToProperties(fiber.memoizedProps, properties, 0, '');
      }
      if (debugTask == null) {
        // If the captured values don't have a debug task, fallback to the
        // error boundary itself.
        debugTask = fiber._debugTask;
      }
      const options: PerformanceMeasureOptions = {
        start: startTime,
        end: endTime,
        detail: {
          devtools: {
            color: 'error',
            track: COMPONENTS_TRACK,
            tooltipText:
              fiber.tag === SuspenseComponent
                ? 'Hydration failed'
                : 'Error boundary caught an error',
            properties,
          },
        },
      };

      const measureName = '\u200b' + name;
      if (__DEV__ && debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          performance.measure.bind(performance, measureName, options),
        );
      } else {
        performance.measure(measureName, options);
      }
      performance.clearMeasures(measureName);
    } else {
      console.timeStamp(
        name,
        startTime,
        endTime,
        COMPONENTS_TRACK,
        undefined,
        'error',
      );
    }
  }
}

function logComponentEffectErrored(
  fiber: Fiber,
  startTime: number,
  endTime: number,
  errors: Array<CapturedValue<mixed>>,
): void {
  if (supportsUserTiming) {
    const name = getComponentNameFromFiber(fiber);
    if (name === null) {
      // Skip
      return;
    }
    if (__DEV__) {
      const properties: Array<[string, string]> = [];
      for (let i = 0; i < errors.length; i++) {
        const capturedValue = errors[i];
        const error = capturedValue.value;
        const message =
          typeof error === 'object' &&
          error !== null &&
          typeof error.message === 'string'
            ? // eslint-disable-next-line react-internal/safe-string-coercion
              String(error.message)
            : // eslint-disable-next-line react-internal/safe-string-coercion
              String(error);
        properties.push(['Error', message]);
      }
      if (fiber.key !== null) {
        addValueToProperties('key', fiber.key, properties, 0, '');
      }
      if (fiber.memoizedProps !== null) {
        addObjectToProperties(fiber.memoizedProps, properties, 0, '');
      }
      const options = {
        start: startTime,
        end: endTime,
        detail: {
          devtools: {
            color: 'error',
            track: COMPONENTS_TRACK,
            tooltipText: 'A lifecycle or effect errored',
            properties,
          },
        },
      };
      const debugTask = fiber._debugTask;
      const measureName = '\u200b' + name;
      if (debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          performance.measure.bind(performance, measureName, options),
        );
      } else {
        // $FlowFixMe[incompatible-type]
        performance.measure(measureName, options);
      }
      performance.clearMeasures(measureName);
    } else {
      console.timeStamp(
        name,
        startTime,
        endTime,
        COMPONENTS_TRACK,
        undefined,
        'error',
      );
    }
  }
}

export function logComponentEffect(
  fiber: Fiber,
  startTime: number,
  endTime: number,
  selfTime: number,
  errors: null | Array<CapturedValue<mixed>>,
): void {
  if (errors !== null) {
    logComponentEffectErrored(fiber, startTime, endTime, errors);
    return;
  }
  const name = getComponentNameFromFiber(fiber);
  if (name === null) {
    // Skip
    return;
  }
  if (supportsUserTiming) {
    const color =
      selfTime < 1
        ? 'secondary-light'
        : selfTime < 100
          ? 'secondary'
          : selfTime < 500
            ? 'secondary-dark'
            : 'error';
    const debugTask = fiber._debugTask;
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          name,
          startTime,
          endTime,
          COMPONENTS_TRACK,
          undefined,
          color,
        ),
      );
    } else {
      console.timeStamp(
        name,
        startTime,
        endTime,
        COMPONENTS_TRACK,
        undefined,
        color,
      );
    }
  }
}

export function logYieldTime(startTime: number, endTime: number): void {
  if (supportsUserTiming) {
    const yieldDuration = endTime - startTime;
    if (yieldDuration < 3) {
      // Skip sub-millisecond yields. This happens all the time and is not interesting.
      return;
    }
    // Being blocked on CPU is potentially bad so we color it by how long it took.
    const color =
      yieldDuration < 5
        ? 'primary-light'
        : yieldDuration < 10
          ? 'primary'
          : yieldDuration < 100
            ? 'primary-dark'
            : 'error';
    // This get logged in the components track if we don't commit which leaves them
    // hanging by themselves without context. It's a useful indicator for why something
    // might be starving this render though.
    // TODO: Considering adding these to a queue and only logging them if we commit.
    console.timeStamp(
      'Blocked',
      startTime,
      endTime,
      COMPONENTS_TRACK,
      undefined,
      color,
    );
  }
}

export function logSuspendedYieldTime(
  startTime: number,
  endTime: number,
  suspendedFiber: Fiber,
): void {
  if (supportsUserTiming) {
    const debugTask = suspendedFiber._debugTask;
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Suspended',
          startTime,
          endTime,
          COMPONENTS_TRACK,
          undefined,
          'primary-light',
        ),
      );
    } else {
      console.timeStamp(
        'Suspended',
        startTime,
        endTime,
        COMPONENTS_TRACK,
        undefined,
        'primary-light',
      );
    }
  }
}

export function logActionYieldTime(
  startTime: number,
  endTime: number,
  suspendedFiber: Fiber,
): void {
  if (supportsUserTiming) {
    const debugTask = suspendedFiber._debugTask;
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Action',
          startTime,
          endTime,
          COMPONENTS_TRACK,
          undefined,
          'primary-light',
        ),
      );
    } else {
      console.timeStamp(
        'Action',
        startTime,
        endTime,
        COMPONENTS_TRACK,
        undefined,
        'primary-light',
      );
    }
  }
}

export function logBlockingStart(
  updateTime: number,
  eventTime: number,
  eventType: null | string,
  eventIsRepeat: boolean,
  isSpawnedUpdate: boolean,
  isPingedUpdate: boolean,
  renderStartTime: number,
  lanes: Lanes,
  debugTask: null | ConsoleTask, // DEV-only
  updateMethodName: null | string,
  updateComponentName: null | string,
): void {
  if (supportsUserTiming) {
    currentTrack = 'Blocking';
    // Clamp start times
    if (updateTime > 0) {
      if (updateTime > renderStartTime) {
        updateTime = renderStartTime;
      }
    } else {
      updateTime = renderStartTime;
    }
    if (eventTime > 0) {
      if (eventTime > updateTime) {
        eventTime = updateTime;
      }
    } else {
      eventTime = updateTime;
    }
    // If a blocking update was spawned within render or an effect, that's considered a cascading render.
    // If you have a second blocking update within the same event, that suggests multiple flushSync or
    // setState in a microtask which is also considered a cascade.
    if (eventType !== null && updateTime > eventTime) {
      // Log the time from the event timeStamp until we called setState.
      const color = eventIsRepeat ? 'secondary-light' : 'warning';
      if (__DEV__ && debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          console.timeStamp.bind(
            console,
            eventIsRepeat ? 'Consecutive' : 'Event: ' + eventType,
            eventTime,
            updateTime,
            currentTrack,
            LANES_TRACK_GROUP,
            color,
          ),
        );
      } else {
        console.timeStamp(
          eventIsRepeat ? 'Consecutive' : 'Event: ' + eventType,
          eventTime,
          updateTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        );
      }
    }
    if (renderStartTime > updateTime) {
      // Log the time from when we called setState until we started rendering.
      const color = isSpawnedUpdate
        ? 'error'
        : includesOnlyHydrationOrOffscreenLanes(lanes)
          ? 'tertiary-light'
          : 'primary-light';
      const label = isPingedUpdate
        ? 'Promise Resolved'
        : isSpawnedUpdate
          ? 'Cascading Update'
          : renderStartTime - updateTime > 5
            ? 'Update Blocked'
            : 'Update';

      if (__DEV__) {
        const properties = [];
        if (updateComponentName != null) {
          properties.push(['Component name', updateComponentName]);
        }
        if (updateMethodName != null) {
          properties.push(['Method name', updateMethodName]);
        }
        const measureOptions = {
          start: updateTime,
          end: renderStartTime,
          detail: {
            devtools: {
              properties,
              track: currentTrack,
              trackGroup: LANES_TRACK_GROUP,
              color,
            },
          },
        };
        if (enablePerformanceIssueReporting && isSpawnedUpdate) {
          // $FlowFixMe[prop-missing] - detail is untyped
          measureOptions.detail.devtools.performanceIssue =
            reusableCascadingUpdateIssue;
        }

        if (debugTask) {
          debugTask.run(
            // $FlowFixMe[method-unbinding]
            performance.measure.bind(performance, label, measureOptions),
          );
        } else {
          // $FlowFixMe[incompatible-type]
          performance.measure(label, measureOptions);
        }
        performance.clearMeasures(label);
      } else {
        console.timeStamp(
          label,
          updateTime,
          renderStartTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        );
      }
    }
  }
}

export function logGestureStart(
  updateTime: number,
  eventTime: number,
  eventType: null | string,
  eventIsRepeat: boolean,
  isPingedUpdate: boolean,
  renderStartTime: number,
  debugTask: null | ConsoleTask, // DEV-only
  updateMethodName: null | string,
  updateComponentName: null | string,
): void {
  if (supportsUserTiming) {
    currentTrack = 'Gesture';
    // Clamp start times
    if (updateTime > 0) {
      if (updateTime > renderStartTime) {
        updateTime = renderStartTime;
      }
    } else {
      updateTime = renderStartTime;
    }
    if (eventTime > 0) {
      if (eventTime > updateTime) {
        eventTime = updateTime;
      }
    } else {
      eventTime = updateTime;
    }

    if (updateTime > eventTime && eventType !== null) {
      // Log the time from the event timeStamp until we started a gesture.
      const color = eventIsRepeat ? 'secondary-light' : 'warning';
      if (__DEV__ && debugTask) {
        debugTask.run(
          console.timeStamp.bind(
            console,
            eventIsRepeat ? 'Consecutive' : 'Event: ' + eventType,
            eventTime,
            updateTime,
            currentTrack,
            LANES_TRACK_GROUP,
            color,
          ),
        );
      } else {
        console.timeStamp(
          eventIsRepeat ? 'Consecutive' : 'Event: ' + eventType,
          eventTime,
          updateTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        );
      }
    }
    if (renderStartTime > updateTime) {
      // Log the time from when we called setState until we started rendering.
      const label = isPingedUpdate
        ? 'Promise Resolved'
        : renderStartTime - updateTime > 5
          ? 'Gesture Blocked'
          : 'Gesture';
      if (__DEV__) {
        const properties = [];
        if (updateComponentName != null) {
          properties.push(['Component name', updateComponentName]);
        }
        if (updateMethodName != null) {
          properties.push(['Method name', updateMethodName]);
        }
        const measureOptions = {
          start: updateTime,
          end: renderStartTime,
          detail: {
            devtools: {
              properties,
              track: currentTrack,
              trackGroup: LANES_TRACK_GROUP,
              color: 'primary-light',
            },
          },
        };

        if (debugTask) {
          debugTask.run(
            // $FlowFixMe[method-unbinding]
            performance.measure.bind(performance, label, measureOptions),
          );
        } else {
          // $FlowFixMe[incompatible-type]
          performance.measure(label, measureOptions);
        }
        performance.clearMeasures(label);
      } else {
        console.timeStamp(
          label,
          updateTime,
          renderStartTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'primary-light',
        );
      }
    }
  }
}

export function logTransitionStart(
  startTime: number,
  updateTime: number,
  eventTime: number,
  eventType: null | string,
  eventIsRepeat: boolean,
  isPingedUpdate: boolean,
  renderStartTime: number,
  debugTask: null | ConsoleTask, // DEV-only
  updateMethodName: null | string,
  updateComponentName: null | string,
): void {
  if (supportsUserTiming) {
    currentTrack = 'Transition';
    // Clamp start times
    if (updateTime > 0) {
      if (updateTime > renderStartTime) {
        updateTime = renderStartTime;
      }
    } else {
      updateTime = renderStartTime;
    }
    if (startTime > 0) {
      if (startTime > updateTime) {
        startTime = updateTime;
      }
    } else {
      startTime = updateTime;
    }
    if (eventTime > 0) {
      if (eventTime > startTime) {
        eventTime = startTime;
      }
    } else {
      eventTime = startTime;
    }

    if (startTime > eventTime && eventType !== null) {
      // Log the time from the event timeStamp until we started a transition.
      const color = eventIsRepeat ? 'secondary-light' : 'warning';
      if (__DEV__ && debugTask) {
        debugTask.run(
          console.timeStamp.bind(
            console,
            eventIsRepeat ? 'Consecutive' : 'Event: ' + eventType,
            eventTime,
            startTime,
            currentTrack,
            LANES_TRACK_GROUP,
            color,
          ),
        );
      } else {
        console.timeStamp(
          eventIsRepeat ? 'Consecutive' : 'Event: ' + eventType,
          eventTime,
          startTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        );
      }
    }
    if (updateTime > startTime) {
      // Log the time from when we started an async transition until we called setState or started rendering.
      // TODO: Ideally this would use the debugTask of the startTransition call perhaps.
      if (__DEV__ && debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          console.timeStamp.bind(
            console,
            'Action',
            startTime,
            updateTime,
            currentTrack,
            LANES_TRACK_GROUP,
            'primary-dark',
          ),
        );
      } else {
        console.timeStamp(
          'Action',
          startTime,
          updateTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'primary-dark',
        );
      }
    }
    if (renderStartTime > updateTime) {
      // Log the time from when we called setState until we started rendering.
      const label = isPingedUpdate
        ? 'Promise Resolved'
        : renderStartTime - updateTime > 5
          ? 'Update Blocked'
          : 'Update';
      if (__DEV__) {
        const properties = [];
        if (updateComponentName != null) {
          properties.push(['Component name', updateComponentName]);
        }
        if (updateMethodName != null) {
          properties.push(['Method name', updateMethodName]);
        }
        const measureOptions = {
          start: updateTime,
          end: renderStartTime,
          detail: {
            devtools: {
              properties,
              track: currentTrack,
              trackGroup: LANES_TRACK_GROUP,
              color: 'primary-light',
            },
          },
        };

        if (debugTask) {
          debugTask.run(
            // $FlowFixMe[method-unbinding]
            performance.measure.bind(performance, label, measureOptions),
          );
        } else {
          // $FlowFixMe[incompatible-type]
          performance.measure(label, measureOptions);
        }
        performance.clearMeasures(label);
      } else {
        console.timeStamp(
          label,
          updateTime,
          renderStartTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'primary-light',
        );
      }
    }
  }
}

export function logRenderPhase(
  startTime: number,
  endTime: number,
  lanes: Lanes,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    const color = includesOnlyHydrationOrOffscreenLanes(lanes)
      ? 'tertiary-dark'
      : 'primary-dark';
    const label = includesOnlyOffscreenLanes(lanes)
      ? 'Prepared'
      : includesOnlyHydrationLanes(lanes)
        ? 'Hydrated'
        : 'Render';
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          label,
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        ),
      );
    } else {
      console.timeStamp(
        label,
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        color,
      );
    }
  }
}

export function logInterruptedRenderPhase(
  startTime: number,
  endTime: number,
  lanes: Lanes,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    const color = includesOnlyHydrationOrOffscreenLanes(lanes)
      ? 'tertiary-dark'
      : 'primary-dark';
    const label = includesOnlyOffscreenLanes(lanes)
      ? 'Prewarm'
      : includesOnlyHydrationLanes(lanes)
        ? 'Interrupted Hydration'
        : 'Interrupted Render';
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          label,
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        ),
      );
    } else {
      console.timeStamp(
        label,
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        color,
      );
    }
  }
}

export function logSuspendedRenderPhase(
  startTime: number,
  endTime: number,
  lanes: Lanes,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    const color = includesOnlyHydrationOrOffscreenLanes(lanes)
      ? 'tertiary-dark'
      : 'primary-dark';
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Prewarm',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        ),
      );
    } else {
      console.timeStamp(
        'Prewarm',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        color,
      );
    }
  }
}

export function logSuspendedWithDelayPhase(
  startTime: number,
  endTime: number,
  lanes: Lanes,
  debugTask: null | ConsoleTask,
): void {
  // This means the render was suspended and cannot commit until it gets unblocked.
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    const color = includesOnlyHydrationOrOffscreenLanes(lanes)
      ? 'tertiary-dark'
      : 'primary-dark';
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Suspended',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          color,
        ),
      );
    } else {
      console.timeStamp(
        'Suspended',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        color,
      );
    }
  }
}

export function logRecoveredRenderPhase(
  startTime: number,
  endTime: number,
  lanes: Lanes,
  recoverableErrors: Array<CapturedValue<mixed>>,
  hydrationFailed: boolean,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__) {
      const properties: Array<[string, string]> = [];
      for (let i = 0; i < recoverableErrors.length; i++) {
        const capturedValue = recoverableErrors[i];
        const error = capturedValue.value;
        const message =
          typeof error === 'object' &&
          error !== null &&
          typeof error.message === 'string'
            ? // eslint-disable-next-line react-internal/safe-string-coercion
              String(error.message)
            : // eslint-disable-next-line react-internal/safe-string-coercion
              String(error);
        properties.push(['Recoverable Error', message]);
      }
      const options: PerformanceMeasureOptions = {
        start: startTime,
        end: endTime,
        detail: {
          devtools: {
            color: 'primary-dark',
            track: currentTrack,
            trackGroup: LANES_TRACK_GROUP,
            tooltipText: hydrationFailed
              ? 'Hydration Failed'
              : 'Recovered after Error',
            properties,
          },
        },
      };
      if (debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          performance.measure.bind(performance, 'Recovered', options),
        );
      } else {
        performance.measure('Recovered', options);
      }
      performance.clearMeasures('Recovered');
    } else {
      console.timeStamp(
        'Recovered',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'error',
      );
    }
  }
}

export function logErroredRenderPhase(
  startTime: number,
  endTime: number,
  lanes: Lanes,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Errored',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'error',
        ),
      );
    } else {
      console.timeStamp(
        'Errored',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'error',
      );
    }
  }
}

export function logInconsistentRender(
  startTime: number,
  endTime: number,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Teared Render',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'error',
        ),
      );
    } else {
      console.timeStamp(
        'Teared Render',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'error',
      );
    }
  }
}

export function logSuspendedCommitPhase(
  startTime: number,
  endTime: number,
  reason: string,
  debugTask: null | ConsoleTask,
): void {
  // This means the commit was suspended on CSS or images.
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    // TODO: Include the exact reason and URLs of what resources suspended.
    // TODO: This might also be Suspended while waiting on a View Transition.
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          reason,
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'secondary-light',
        ),
      );
    } else {
      console.timeStamp(
        reason,
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'secondary-light',
      );
    }
  }
}

export function logSuspendedViewTransitionPhase(
  startTime: number,
  endTime: number,
  reason: string,
  debugTask: null | ConsoleTask,
): void {
  // This means the commit was suspended on CSS or images.
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    // TODO: Include the exact reason and URLs of what resources suspended.
    // TODO: This might also be Suspended while waiting on a View Transition.
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          reason,
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'secondary-light',
        ),
      );
    } else {
      console.timeStamp(
        reason,
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'secondary-light',
      );
    }
  }
}

export function logCommitErrored(
  startTime: number,
  endTime: number,
  errors: Array<CapturedValue<mixed>>,
  passive: boolean,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__) {
      const properties: Array<[string, string]> = [];
      for (let i = 0; i < errors.length; i++) {
        const capturedValue = errors[i];
        const error = capturedValue.value;
        const message =
          typeof error === 'object' &&
          error !== null &&
          typeof error.message === 'string'
            ? // eslint-disable-next-line react-internal/safe-string-coercion
              String(error.message)
            : // eslint-disable-next-line react-internal/safe-string-coercion
              String(error);
        properties.push(['Error', message]);
      }
      const options: PerformanceMeasureOptions = {
        start: startTime,
        end: endTime,
        detail: {
          devtools: {
            color: 'error',
            track: currentTrack,
            trackGroup: LANES_TRACK_GROUP,
            tooltipText: passive
              ? 'Remaining Effects Errored'
              : 'Commit Errored',
            properties,
          },
        },
      };
      if (debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          performance.measure.bind(performance, 'Errored', options),
        );
      } else {
        performance.measure('Errored', options);
      }
      performance.clearMeasures('Errored');
    } else {
      console.timeStamp(
        'Errored',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'error',
      );
    }
  }
}

export function logCommitPhase(
  startTime: number,
  endTime: number,
  errors: null | Array<CapturedValue<mixed>>,
  abortedViewTransition: boolean,
  debugTask: null | ConsoleTask,
): void {
  if (errors !== null) {
    logCommitErrored(startTime, endTime, errors, false, debugTask);
    return;
  }
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          abortedViewTransition
            ? 'Commit Interrupted View Transition'
            : 'Commit',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          abortedViewTransition ? 'error' : 'secondary-dark',
        ),
      );
    } else {
      console.timeStamp(
        abortedViewTransition ? 'Commit Interrupted View Transition' : 'Commit',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        abortedViewTransition ? 'error' : 'secondary-dark',
      );
    }
  }
}

export function logPaintYieldPhase(
  startTime: number,
  endTime: number,
  delayedUntilPaint: boolean,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          delayedUntilPaint ? 'Waiting for Paint' : 'Waiting',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'secondary-light',
        ),
      );
    } else {
      console.timeStamp(
        delayedUntilPaint ? 'Waiting for Paint' : 'Waiting',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'secondary-light',
      );
    }
  }
}

export function logApplyGesturePhase(
  startTime: number,
  endTime: number,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Create Ghost Tree',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'secondary-dark',
        ),
      );
    } else {
      console.timeStamp(
        'Create Ghost Tree',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'secondary-dark',
      );
    }
  }
}

export function logStartViewTransitionYieldPhase(
  startTime: number,
  endTime: number,
  abortedViewTransition: boolean,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          abortedViewTransition
            ? 'Interrupted View Transition'
            : 'Starting Animation',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          abortedViewTransition ? 'error' : 'secondary-light',
        ),
      );
    } else {
      console.timeStamp(
        abortedViewTransition
          ? 'Interrupted View Transition'
          : 'Starting Animation',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        abortedViewTransition ? ' error' : 'secondary-light',
      );
    }
  }
}

export function logAnimatingPhase(
  startTime: number,
  endTime: number,
  debugTask: null | ConsoleTask,
): void {
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Animating',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'secondary-dark',
        ),
      );
    } else {
      console.timeStamp(
        'Animating',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'secondary-dark',
      );
    }
  }
}

export function logPassiveCommitPhase(
  startTime: number,
  endTime: number,
  errors: null | Array<CapturedValue<mixed>>,
  debugTask: null | ConsoleTask,
): void {
  if (errors !== null) {
    logCommitErrored(startTime, endTime, errors, true, debugTask);
    return;
  }
  if (supportsUserTiming) {
    if (endTime <= startTime) {
      return;
    }
    if (__DEV__ && debugTask) {
      debugTask.run(
        // $FlowFixMe[method-unbinding]
        console.timeStamp.bind(
          console,
          'Remaining Effects',
          startTime,
          endTime,
          currentTrack,
          LANES_TRACK_GROUP,
          'secondary-dark',
        ),
      );
    } else {
      console.timeStamp(
        'Remaining Effects',
        startTime,
        endTime,
        currentTrack,
        LANES_TRACK_GROUP,
        'secondary-dark',
      );
    }
  }
}
