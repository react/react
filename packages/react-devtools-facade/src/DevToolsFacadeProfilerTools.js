/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {didFiberRender} from 'react-devtools-shared/src/backend/fiber/shared/DevToolsFiberChangeDetection';

import type {Fiber, FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {RendererInternals, ProfilingState} from './DevToolsFacade';
import type {ToolError} from './DevToolsFacadeTreeTools';

import {getTypeTag} from './DevToolsFacadeTreeTools';

// Per-component render timing within a single commit. Durations are null when
// the build does not collect profiler timing.
export type CommitComponent = {
  uid: string,
  name: string,
  type: string,
  actualDuration: number | null,
  selfDuration: number | null,
};

// One row of a trace overview — a per-commit timing summary.
export type TraceOverviewRow = {
  commit: number,
  committedAt: number,
  renderDuration: number | null,
  layoutDuration: number | null,
  passiveDuration: number | null,
  componentsChanged: number,
};

// A detailed report for a single commit.
export type CommitReport = {
  committedAt: number,
  priority: string,
  renderDuration: number | null,
  layoutDuration: number | null,
  passiveDuration: number | null,
  components: Array<CommitComponent>,
};

export type StartProfilingResult = {status: 'started', traceName: string};
export type StopProfilingResult = {
  status: 'stopped',
  traceName: string,
  commits: number,
};

export type ProfilerTools = {
  startProfiling: (traceName?: string) => StartProfilingResult | ToolError,
  stopProfiling: () => StopProfilingResult | ToolError,
  getTraceOverview: (traceName: string) => Array<TraceOverviewRow> | ToolError,
  getCommitReport: (
    traceName: string,
    commitIndex: number,
  ) => CommitReport | ToolError,
};

// Internal per-commit record (durations captured at commit time).
type CommitRecord = {
  timestamp: number,
  priority: string,
  renderDuration: number | null,
  layoutDuration: number | null,
  passiveDuration: number | null,
  durations: Array<CommitComponent>,
};

type TraceData = {
  startTime: number,
  commits: Array<CommitRecord>,
};

function priorityToString(
  internals: RendererInternals,
  schedulerPriority: number | void,
): string {
  const {
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    IdlePriority,
  } = internals.ReactPriorityLevels;
  switch (schedulerPriority) {
    case ImmediatePriority:
      return 'Sync';
    case UserBlockingPriority:
      return 'UserBlocking';
    case NormalPriority:
      return 'Normal';
    case IdlePriority:
      return 'Idle';
    default:
      return 'Normal';
  }
}

/**
 * Build the profiler tools from a renderer-internals map, the shared profiling
 * state, and the tree tools' getUid (so component uids are consistent with
 * getComponentTree/getComponentByUid). The hook installed by installFacade
 * invokes profilingState.onCommit/onPostCommit while a session is active.
 */
export function createProfilerTools(
  rendererInternals: Map<number, RendererInternals>,
  profilingState: ProfilingState,
  getUid: (fiber: Fiber) => string,
): ProfilerTools {
  // Walk the fiber tree collecting timing for fibers that actually rendered.
  // Matches the same didFiberRender check and display-name filtering as the
  // DevTools Profiler — only fibers with a non-null display name are recorded,
  // which filters out internal types (HostRoot, Fragment, Mode, HostText, etc.).
  function collectDurations(
    internals: RendererInternals,
    fiber: Fiber,
    durations: Array<CommitComponent>,
  ): void {
    const {ReactTypeOfWork, getDisplayNameForFiber} = internals;
    const displayName = getDisplayNameForFiber(fiber);
    if (displayName != null) {
      const prevFiber = fiber.alternate;
      if (
        prevFiber == null ||
        didFiberRender(ReactTypeOfWork, prevFiber, fiber)
      ) {
        const actual =
          fiber.actualDuration != null ? fiber.actualDuration : null;
        let self: number | null = actual;
        if (actual != null) {
          let selfDuration: number = actual;
          let child = fiber.child;
          while (child !== null) {
            selfDuration -= child.actualDuration || 0;
            child = child.sibling;
          }
          self = selfDuration;
        }
        durations.push({
          uid: getUid(fiber),
          name: displayName,
          type: getTypeTag(ReactTypeOfWork, fiber.tag),
          actualDuration: actual,
          selfDuration: self,
        });
      }
    }
    // Recurse into children regardless of whether this node rendered.
    let child = fiber.child;
    while (child !== null) {
      collectDurations(internals, child, durations);
      child = child.sibling;
    }
  }

  // Commits awaiting their passive-effect pass, keyed by root so that a late
  // onPostCommit attributes passiveDuration to the right commit even when
  // multiple roots commit before their passive passes run.
  const pendingPassive: Map<FiberRoot, CommitRecord> = new Map();

  /**
   * Start a named profiling session that captures per-commit render timing.
   * While active, every React commit records timing for components that
   * rendered. Errors if a session is already active.
   *
   * @param traceName - Optional trace name (auto-generated if omitted).
   */
  function startProfiling(
    traceName?: string,
  ): StartProfilingResult | ToolError {
    if (profilingState.isActive) {
      return {
        error:
          'Already profiling trace "' +
          (profilingState.currentTraceName || '') +
          '"',
      };
    }
    const resolvedTraceName = traceName || 'trace-' + Date.now();
    const trace: TraceData = {startTime: Date.now(), commits: []};
    profilingState.traces.set(resolvedTraceName, trace);
    profilingState.isActive = true;
    profilingState.currentTraceName = resolvedTraceName;

    profilingState.onCommit = function onCommit(
      rendererID: number,
      root: FiberRoot,
      schedulerPriority: number | void,
    ) {
      const internals = rendererInternals.get(rendererID);
      if (internals == null) {
        console.error(
          'react-devtools-facade: Missing internals for renderer %s, commit not recorded.',
          rendererID,
        );
        return;
      }
      const durations: Array<CommitComponent> = [];
      collectDurations(internals, root.current, durations);
      const rootFiber = root.current;
      const record: CommitRecord = {
        timestamp: Date.now(),
        priority: priorityToString(internals, schedulerPriority),
        renderDuration:
          rootFiber.actualDuration != null ? rootFiber.actualDuration : null,
        layoutDuration:
          root.effectDuration != null ? root.effectDuration : null,
        passiveDuration: null,
        durations,
      };
      trace.commits.push(record);
      pendingPassive.set(root, record);
    };

    profilingState.onPostCommit = function onPostCommit(root: FiberRoot) {
      const record = pendingPassive.get(root);
      if (record != null) {
        record.passiveDuration =
          root.passiveEffectDuration != null
            ? root.passiveEffectDuration
            : null;
        pendingPassive.delete(root);
      }
    };

    return {status: 'started', traceName: resolvedTraceName};
  }

  /**
   * Stop the active profiling session. Errors if no session is active.
   */
  function stopProfiling(): StopProfilingResult | ToolError {
    if (!profilingState.isActive) {
      return {error: 'Not currently profiling'};
    }
    const traceName = profilingState.currentTraceName;
    if (traceName == null) {
      return {error: 'No active trace'};
    }
    const trace = profilingState.traces.get(traceName);
    const commitCount = trace ? trace.commits.length : 0;
    profilingState.isActive = false;
    profilingState.currentTraceName = null;
    profilingState.onCommit = null;
    profilingState.onPostCommit = null;
    pendingPassive.clear();
    return {status: 'stopped', traceName, commits: commitCount};
  }

  function getTrace(traceName: string): TraceData | null {
    return profilingState.traces.get(traceName) || null;
  }

  /**
   * Return an overview of a trace — one row per commit with a timing breakdown
   * (render, layout effects, passive effects) and the number of components that
   * changed.
   *
   * @param traceName - The name of the trace to query.
   */
  function getTraceOverview(
    traceName: string,
  ): Array<TraceOverviewRow> | ToolError {
    const trace = getTrace(traceName);
    if (trace == null) {
      return {error: 'Unknown trace "' + traceName + '"'};
    }
    const rows: Array<TraceOverviewRow> = [];
    for (let i = 0; i < trace.commits.length; i++) {
      const commit = trace.commits[i];
      rows.push({
        commit: i,
        committedAt: commit.timestamp - trace.startTime,
        renderDuration: commit.renderDuration,
        layoutDuration: commit.layoutDuration,
        passiveDuration: commit.passiveDuration,
        componentsChanged: commit.durations.length,
      });
    }
    return rows;
  }

  /**
   * Return a detailed report for a single commit — timing metadata
   * (committedAt, priority, duration breakdown) and per-component render
   * durations sorted by actualDuration descending.
   *
   * @param traceName - The name of the trace.
   * @param commitIndex - Zero-based index of the commit within the trace.
   */
  function getCommitReport(
    traceName: string,
    commitIndex: number,
  ): CommitReport | ToolError {
    const trace = getTrace(traceName);
    if (trace == null) {
      return {error: 'Unknown trace "' + traceName + '"'};
    }
    if (commitIndex < 0 || commitIndex >= trace.commits.length) {
      return {error: 'Commit index out of range'};
    }
    const commit = trace.commits[commitIndex];
    const components = commit.durations
      .slice()
      .sort((a, b) => (b.actualDuration || 0) - (a.actualDuration || 0));
    return {
      committedAt: commit.timestamp - trace.startTime,
      priority: commit.priority,
      renderDuration: commit.renderDuration,
      layoutDuration: commit.layoutDuration,
      passiveDuration: commit.passiveDuration,
      components,
    };
  }

  return {
    startProfiling,
    stopProfiling,
    getTraceOverview,
    getCommitReport,
  };
}
