/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {
  ReactComponentInfo,
  ReactAsyncInfo,
  ReactIOInfo,
  ReactFunctionLocation,
} from 'shared/ReactTypes';
import type {Rect} from '../../types';

// Kinds
export const FIBER_INSTANCE = 0;
export const VIRTUAL_INSTANCE = 1;
export const FILTERED_FIBER_INSTANCE = 2;

// This type represents a stateful instance of a Client Component i.e. a Fiber pair.
// These instances also let us track stateful DevTools meta data like id and warnings.
export type FiberInstance = {
  kind: 0,
  id: number,
  parent: null | DevToolsInstance,
  firstChild: null | DevToolsInstance,
  nextSibling: null | DevToolsInstance,
  source: null | string | Error | ReactFunctionLocation, // source location of this component function, or owned child stack
  logCount: number, // total number of errors/warnings last seen
  treeBaseDuration: number, // the profiled time of the last render of this subtree
  suspendedBy: null | Array<ReactAsyncInfo>, // things that suspended in the children position of this component
  suspenseNode: null | SuspenseNode,
  data: Fiber, // one of a Fiber pair
};

export type FilteredFiberInstance = {
  kind: 2,
  // We exclude id from the type to get errors if we try to access it.
  // However it is still in the object to preserve hidden class.
  // id: number,
  parent: null | DevToolsInstance,
  firstChild: null | DevToolsInstance,
  nextSibling: null | DevToolsInstance,
  source: null | string | Error | ReactFunctionLocation, // always null here.
  logCount: number, // total number of errors/warnings last seen
  treeBaseDuration: number, // the profiled time of the last render of this subtree
  suspendedBy: null | Array<ReactAsyncInfo>, // only used at the root
  suspenseNode: null | SuspenseNode,
  data: Fiber, // one of a Fiber pair
};

// This type represents a stateful instance of a Server Component or a Component
// that gets optimized away - e.g. call-through without creating a Fiber.
// It's basically a virtual Fiber. This is not a semantic concept in React.
// It only exists as a virtual concept to let the same Element in the DevTools
// persist. To be selectable separately from all ReactComponentInfo and overtime.
export type VirtualInstance = {
  kind: 1,
  id: number,
  parent: null | DevToolsInstance,
  firstChild: null | DevToolsInstance,
  nextSibling: null | DevToolsInstance,
  source: null | string | Error | ReactFunctionLocation, // source location of this server component, or owned child stack
  logCount: number, // total number of errors/warnings last seen
  treeBaseDuration: number, // the profiled time of the last render of this subtree
  suspendedBy: null | Array<ReactAsyncInfo>, // things that blocked the server component's child from rendering
  suspenseNode: null,
  // The latest info for this instance. This can be updated over time and the
  // same info can appear in more than once ServerComponentInstance.
  data: ReactComponentInfo,
};

export type DevToolsInstance =
  | FiberInstance
  | VirtualInstance
  | FilteredFiberInstance;

export type SuspenseNode = {
  // The Instance can be a Suspense boundary, a SuspenseList Row, or HostRoot.
  // It can also be disconnected from the main tree if it's a Filtered Instance.
  instance: FiberInstance | FilteredFiberInstance,
  parent: null | SuspenseNode,
  firstChild: null | SuspenseNode,
  nextSibling: null | SuspenseNode,
  rects: null | Array<Rect>, // The bounding rects of content children.
  suspendedBy: Map<ReactIOInfo, Set<DevToolsInstance>>, // Tracks which data we're suspended by and the children that suspend it.
  environments: Map<string, number>, // Tracks the Flight environment names that suspended this. I.e. if the server blocked this.
  endTime: number, // Track a short cut to the maximum end time value within the suspendedBy set.
  // Track whether any of the items in suspendedBy are unique this this Suspense boundaries or if they're all
  // also in the parent sets. This determine whether this could contribute in the loading sequence.
  hasUniqueSuspenders: boolean,
  // Track whether anything suspended in this boundary that we can't track either because it was using throw
  // a promise, an older version of React or because we're inspecting prod.
  hasUnknownSuspenders: boolean,
};
