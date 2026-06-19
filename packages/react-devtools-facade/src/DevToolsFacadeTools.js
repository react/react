/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Facade} from './DevToolsFacade';
import type {
  TreeNode,
  NodeInfo,
  ComponentSource,
  OwnersStack,
  OwnerEntry,
  FindComponentsResult,
  ToolError,
} from './DevToolsFacadeTreeTools';
import type {
  StartProfilingResult,
  StopProfilingResult,
  TraceOverviewRow,
  CommitReport,
} from './DevToolsFacadeProfilerTools';

import {createTreeTools} from './DevToolsFacadeTreeTools';
import {createProfilerTools} from './DevToolsFacadeProfilerTools';

export type {
  TreeNode,
  NodeInfo,
  HookNode,
  ComponentSource,
  SourceLocation,
  OwnersStack,
  OwnerEntry,
  FindComponentsResult,
  ToolError,
} from './DevToolsFacadeTreeTools';
export type {
  CommitComponent,
  TraceOverviewRow,
  CommitReport,
  StartProfilingResult,
  StopProfilingResult,
} from './DevToolsFacadeProfilerTools';

// The set of tools assembled from a Facade. Each tool returns a plain
// JavaScript value (see the types in ./DevToolsFacadeTreeTools and
// ./DevToolsFacadeProfilerTools); serialization is the integrator's responsibility.
// Integrators decide whether to expose these on globals or call them directly.
export type Tools = {
  getComponentTree: (
    depth?: number,
    rootUid?: string,
  ) => Array<TreeNode> | ToolError,
  getComponentByUid: (uid: string) => NodeInfo | ToolError,
  findComponents: (
    name: string,
    rootUid?: string,
    page?: number,
    pageSize?: number,
  ) => FindComponentsResult | ToolError,
  getComponentSource: (uid: string) => ComponentSource | ToolError,
  getOwnersStack: (uid: string) => OwnersStack | ToolError,
  getOwnersBranch: (uid: string) => Array<OwnerEntry> | ToolError,
  startProfiling: (traceName?: string) => StartProfilingResult | ToolError,
  stopProfiling: () => StopProfilingResult | ToolError,
  getTraceOverview: (traceName: string) => Array<TraceOverviewRow> | ToolError,
  getCommitReport: (
    traceName: string,
    commitIndex: number,
  ) => CommitReport | ToolError,
};

/**
 * Assemble the set of tools from a Facade. The tools read the facade's tracked
 * runtime state (fiber roots, per-renderer internals, profiling state) lazily
 * on each call and never touch globals, so the integrator fully owns both the
 * facade and the returned tools. Profiler tools share the tree tools' getUid
 * so component labels are consistent across all tools.
 *
 * @param facade - A Facade returned by installFacade().
 */
export function createTools(facade: Facade): Tools {
  const tree = createTreeTools(facade.fiberRoots, facade.rendererInternals);
  const profiler = createProfilerTools(
    facade.rendererInternals,
    facade.profilingState,
    tree.getUid,
  );

  return {
    getComponentTree: tree.getComponentTree,
    getComponentByUid: tree.getComponentByUid,
    findComponents: tree.findComponents,
    getComponentSource: tree.getComponentSource,
    getOwnersStack: tree.getOwnersStack,
    getOwnersBranch: tree.getOwnersBranch,
    startProfiling: profiler.startProfiling,
    stopProfiling: profiler.stopProfiling,
    getTraceOverview: profiler.getTraceOverview,
    getCommitReport: profiler.getCommitReport,
  };
}
