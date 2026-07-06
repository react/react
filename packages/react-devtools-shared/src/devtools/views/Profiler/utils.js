/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {PROFILER_EXPORT_VERSION} from 'react-devtools-shared/src/constants';
import {backendToFrontendSerializedElementMapper} from 'react-devtools-shared/src/utils';

import type {ProfilingDataBackend} from 'react-devtools-shared/src/backend/types';
import type {
  ProfilingDataExport,
  ProfilingDataForRootExport,
  ProfilingDataForRootFrontend,
  ProfilingDataFrontend,
  SnapshotNode,
} from './types';
import type {
  TimelineData,
  TimelineDataExport,
} from 'react-devtools-timeline/src/types';

const commitGradient = [
  'var(--color-commit-gradient-0)',
  'var(--color-commit-gradient-1)',
  'var(--color-commit-gradient-2)',
  'var(--color-commit-gradient-3)',
  'var(--color-commit-gradient-4)',
  'var(--color-commit-gradient-5)',
  'var(--color-commit-gradient-6)',
  'var(--color-commit-gradient-7)',
  'var(--color-commit-gradient-8)',
  'var(--color-commit-gradient-9)',
];

// Combines info from the Store (frontend) and renderer interfaces (backend) into the format required by the Profiler UI.
// This format can then be quickly exported (and re-imported).
export function prepareProfilingDataFrontendFromBackendAndStore(
  dataBackends: Array<ProfilingDataBackend>,
  operationsByRootID: Map<number, Array<Array<number>>>,
  snapshotsByRootID: Map<number, Map<number, SnapshotNode>>,
): ProfilingDataFrontend {
  const dataForRoots: Map<number, ProfilingDataForRootFrontend> = new Map();

  const timelineDataArray = [];
  const userInputEvents = [];
  const performanceTrackSpans = [];
  let droppedPerformanceTrackSpans = 0;

  dataBackends.forEach(dataBackend => {
    if (dataBackend.userInputEvents != null) {
      userInputEvents.push(...dataBackend.userInputEvents);
    }
    if (dataBackend.performanceTrackSpans != null) {
      performanceTrackSpans.push(...dataBackend.performanceTrackSpans);
    }
    if (dataBackend.droppedPerformanceTrackSpans != null) {
      droppedPerformanceTrackSpans += dataBackend.droppedPerformanceTrackSpans;
    }
    const {timelineData} = dataBackend;
    if (timelineData != null) {
      const {
        batchUIDToMeasuresKeyValueArray,
        internalModuleSourceToRanges,
        laneToLabelKeyValueArray,
        laneToReactMeasureKeyValueArray,
        ...rest
      } = timelineData;

      timelineDataArray.push({
        ...rest,

        // Most of the data is safe to parse as-is,
        // but we need to convert the nested Arrays back to Maps.
        batchUIDToMeasuresMap: new Map(batchUIDToMeasuresKeyValueArray),
        internalModuleSourceToRanges: new Map(internalModuleSourceToRanges),
        laneToLabelMap: new Map(laneToLabelKeyValueArray),
        laneToReactMeasureMap: new Map(laneToReactMeasureKeyValueArray),
      });
    }

    dataBackend.dataForRoots.forEach(
      ({commitData, displayName, initialTreeBaseDurations, rootID}) => {
        const operations = operationsByRootID.get(rootID);
        if (operations == null) {
          throw Error(
            `Could not find profiling operations for root "${rootID}"`,
          );
        }

        const snapshots = snapshotsByRootID.get(rootID);
        if (snapshots == null) {
          throw Error(
            `Could not find profiling snapshots for root "${rootID}"`,
          );
        }

        // Do not filter empty commits from the profiler data!
        // Hiding "empty" commits might cause confusion too.
        // A commit *did happen* even if none of the components the Profiler is showing were involved.
        const convertedCommitData = commitData.map(
          (commitDataBackend, commitIndex) => ({
            changeDescriptions:
              commitDataBackend.changeDescriptions != null
                ? new Map(commitDataBackend.changeDescriptions)
                : null,
            duration: commitDataBackend.duration,
            effectDuration: commitDataBackend.effectDuration,
            fiberActualDurations: new Map(
              commitDataBackend.fiberActualDurations,
            ),
            fiberSelfDurations: new Map(commitDataBackend.fiberSelfDurations),
            passiveEffectDuration: commitDataBackend.passiveEffectDuration,
            priorityLevel: commitDataBackend.priorityLevel,
            timestamp: commitDataBackend.timestamp,
            updaters:
              commitDataBackend.updaters !== null
                ? commitDataBackend.updaters.map(
                    backendToFrontendSerializedElementMapper,
                  )
                : null,
          }),
        );

        dataForRoots.set(rootID, {
          commitData: convertedCommitData,
          displayName,
          initialTreeBaseDurations: new Map(initialTreeBaseDurations),
          operations,
          rootID,
          snapshots,
        });
      },
    );
  });

  userInputEvents.sort((a, b) => a.timestamp - b.timestamp);
  performanceTrackSpans.sort((a, b) => a.start - b.start);

  return {
    dataForRoots,
    imported: false,
    timelineData: timelineDataArray,
    userInputEvents,
    performanceTrackSpans,
    droppedPerformanceTrackSpans,
  };
}

// Converts a Profiling data export into the format required by the Store.
export function prepareProfilingDataFrontendFromExport(
  profilingDataExport: ProfilingDataExport,
): ProfilingDataFrontend {
  const {version} = profilingDataExport;

  if (version !== PROFILER_EXPORT_VERSION) {
    throw Error(
      `Unsupported profile export version "${version}". Supported version is "${PROFILER_EXPORT_VERSION}".`,
    );
  }

  const timelineData: Array<TimelineData> = profilingDataExport.timelineData
    ? profilingDataExport.timelineData.map(
        ({
          batchUIDToMeasuresKeyValueArray,
          componentMeasures,
          duration,
          flamechart,
          internalModuleSourceToRanges,
          laneToLabelKeyValueArray,
          laneToReactMeasureKeyValueArray,
          nativeEvents,
          networkMeasures,
          otherUserTimingMarks,
          reactVersion,
          schedulingEvents,
          snapshots,
          snapshotHeight,
          startTime,
          suspenseEvents,
          thrownErrors,
        }) => ({
          // Most of the data is safe to parse as-is,
          // but we need to convert the nested Arrays back to Maps.
          batchUIDToMeasuresMap: new Map(batchUIDToMeasuresKeyValueArray),
          componentMeasures,
          duration,
          flamechart,
          internalModuleSourceToRanges: new Map(internalModuleSourceToRanges),
          laneToLabelMap: new Map(laneToLabelKeyValueArray),
          laneToReactMeasureMap: new Map(laneToReactMeasureKeyValueArray),
          nativeEvents,
          networkMeasures,
          otherUserTimingMarks,
          reactVersion,
          schedulingEvents,
          snapshots,
          snapshotHeight,
          startTime,
          suspenseEvents,
          thrownErrors,
        }),
      )
    : [];

  const dataForRoots: Map<number, ProfilingDataForRootFrontend> = new Map();
  profilingDataExport.dataForRoots.forEach(
    ({
      commitData,
      displayName,
      initialTreeBaseDurations,
      operations,
      rootID,
      snapshots,
    }) => {
      dataForRoots.set(rootID, {
        commitData: commitData.map(
          ({
            changeDescriptions,
            duration,
            effectDuration,
            fiberActualDurations,
            fiberSelfDurations,
            passiveEffectDuration,
            priorityLevel,
            timestamp,
            updaters,
          }) => ({
            changeDescriptions:
              changeDescriptions != null ? new Map(changeDescriptions) : null,
            duration,
            effectDuration,
            fiberActualDurations: new Map(fiberActualDurations),
            fiberSelfDurations: new Map(fiberSelfDurations),
            passiveEffectDuration,
            priorityLevel,
            timestamp,
            updaters,
          }),
        ),
        displayName,
        initialTreeBaseDurations: new Map(initialTreeBaseDurations),
        operations,
        rootID,
        snapshots: new Map(snapshots),
      });
    },
  );

  return {
    dataForRoots,
    imported: true,
    timelineData,
    userInputEvents: profilingDataExport.userInputEvents || [],
    performanceTrackSpans: profilingDataExport.performanceTrackSpans || [],
    droppedPerformanceTrackSpans:
      profilingDataExport.droppedPerformanceTrackSpans || 0,
  };
}

// Converts a Store Profiling data into a format that can be safely (JSON) serialized for export.
export function prepareProfilingDataExport(
  profilingDataFrontend: ProfilingDataFrontend,
): ProfilingDataExport {
  const timelineData: Array<TimelineDataExport> =
    profilingDataFrontend.timelineData.map(
      ({
        batchUIDToMeasuresMap,
        componentMeasures,
        duration,
        flamechart,
        internalModuleSourceToRanges,
        laneToLabelMap,
        laneToReactMeasureMap,
        nativeEvents,
        networkMeasures,
        otherUserTimingMarks,
        reactVersion,
        schedulingEvents,
        snapshots,
        snapshotHeight,
        startTime,
        suspenseEvents,
        thrownErrors,
      }) => ({
        // Most of the data is safe to serialize as-is,
        // but we need to convert the Maps to nested Arrays.
        batchUIDToMeasuresKeyValueArray: Array.from(
          batchUIDToMeasuresMap.entries(),
        ),
        componentMeasures: componentMeasures,
        duration,
        flamechart,
        internalModuleSourceToRanges: Array.from(
          internalModuleSourceToRanges.entries(),
        ),
        laneToLabelKeyValueArray: Array.from(laneToLabelMap.entries()),
        laneToReactMeasureKeyValueArray: Array.from(
          laneToReactMeasureMap.entries(),
        ),
        nativeEvents,
        networkMeasures,
        otherUserTimingMarks,
        reactVersion,
        schedulingEvents,
        snapshots,
        snapshotHeight,
        startTime,
        suspenseEvents,
        thrownErrors,
      }),
    );

  const dataForRoots: Array<ProfilingDataForRootExport> = [];
  profilingDataFrontend.dataForRoots.forEach(
    ({
      commitData,
      displayName,
      initialTreeBaseDurations,
      operations,
      rootID,
      snapshots,
    }) => {
      dataForRoots.push({
        commitData: commitData.map(
          ({
            changeDescriptions,
            duration,
            effectDuration,
            fiberActualDurations,
            fiberSelfDurations,
            passiveEffectDuration,
            priorityLevel,
            timestamp,
            updaters,
          }) => ({
            changeDescriptions:
              changeDescriptions != null
                ? Array.from(changeDescriptions.entries())
                : null,
            duration,
            effectDuration,
            fiberActualDurations: Array.from(fiberActualDurations.entries()),
            fiberSelfDurations: Array.from(fiberSelfDurations.entries()),
            passiveEffectDuration,
            priorityLevel,
            timestamp,
            updaters,
          }),
        ),
        displayName,
        initialTreeBaseDurations: Array.from(
          initialTreeBaseDurations.entries(),
        ),
        operations,
        rootID,
        snapshots: Array.from(snapshots.entries()),
      });
    },
  );

  return {
    version: PROFILER_EXPORT_VERSION,
    dataForRoots,
    timelineData,
    userInputEvents: profilingDataFrontend.userInputEvents,
    performanceTrackSpans: profilingDataFrontend.performanceTrackSpans,
    droppedPerformanceTrackSpans:
      profilingDataFrontend.droppedPerformanceTrackSpans,
  };
}

export const getGradientColor = (value: number): string => {
  const maxIndex = commitGradient.length - 1;
  let index;
  if (Number.isNaN(value)) {
    index = 0;
  } else if (!Number.isFinite(value)) {
    index = maxIndex;
  } else {
    index = Math.max(0, Math.min(maxIndex, value)) * maxIndex;
  }
  return commitGradient[Math.round(index)];
};

export const formatDuration = (duration: number): number | string =>
  Math.round(duration * 10) / 10 || '<0.1';
export const formatPercentage = (percentage: number): number =>
  Math.round(percentage * 100);
export const formatTime = (timestamp: number): number =>
  Math.round(Math.round(timestamp) / 100) / 10;

export const scale =
  (
    minValue: number,
    maxValue: number,
    minRange: number,
    maxRange: number,
  ): ((value: number, fallbackValue: number) => number) =>
  (value: number, fallbackValue: number) =>
    maxValue - minValue === 0
      ? fallbackValue
      : ((value - minValue) / (maxValue - minValue)) * (maxRange - minRange);
