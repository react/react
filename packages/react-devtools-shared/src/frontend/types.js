/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * WARNING:
 * This file contains types that are designed for React DevTools UI and how it interacts with the backend.
 * They might be used in different versions of DevTools backends.
 * Be mindful of backwards compatibility when making changes.
 */

import type {
  Dehydrated,
  Unserializable,
} from 'react-devtools-shared/src/hydration';
import type {ReactFunctionLocation, ReactStackTrace} from 'shared/ReactTypes';
import type {UnknownSuspendersReason} from '../constants';

export type BrowserTheme = 'dark' | 'light';

export type Wall = {
  // `listen` returns the "unlisten" function.
  listen: (fn: Function) => Function,
  send: (event: string, payload: any, transferable?: Array<any>) => void,
};

// WARNING
// The values below are referenced by ComponentFilters (which are saved via localStorage).
// Do not change them or it will break previously saved user customizations.
// If new element types are added, use new numbers rather than re-ordering existing ones.
//
// Changing these types is also a backwards breaking change for the standalone shell,
// since the frontend and backend must share the same values-
// and the backend is embedded in certain environments (like React Native).
export const ElementTypeClass = 1;
export const ElementTypeContext = 2;
export const ElementTypeFunction = 5;
export const ElementTypeForwardRef = 6;
export const ElementTypeHostComponent = 7;
export const ElementTypeMemo = 8;
export const ElementTypeOtherOrUnknown = 9;
export const ElementTypeProfiler = 10;
export const ElementTypeRoot = 11;
export const ElementTypeSuspense = 12;
export const ElementTypeSuspenseList = 13;
export const ElementTypeTracingMarker = 14;
export const ElementTypeVirtual = 15;
export const ElementTypeViewTransition = 16;
export const ElementTypeActivity = 17;

// Different types of elements displayed in the Elements tree.
// These types may be used to visually distinguish types,
// or to enable/disable certain functionality.
export type ElementType =
  | 1
  | 2
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17;

// WARNING
// The values below are referenced by ComponentFilters (which are saved via localStorage).
// Do not change them or it will break previously saved user customizations.
// If new filter types are added, use new numbers rather than re-ordering existing ones.
export const ComponentFilterElementType = 1;
export const ComponentFilterDisplayName = 2;
export const ComponentFilterLocation = 3;
export const ComponentFilterHOC = 4;
export const ComponentFilterEnvironmentName = 5;
export const ComponentFilterActivitySlice = 6;

export type ComponentFilterType = 1 | 2 | 3 | 4 | 5 | 6;

// Hide all elements of types in this Set.
// We hide host components only by default.
export type ElementTypeComponentFilter = {
  isEnabled: boolean,
  type: 1,
  value: ElementType,
};

// Hide all elements with displayNames or paths matching one or more of the RegExps in this Set.
// Path filters are only used when elements include debug source location.
export type RegExpComponentFilter = {
  isEnabled: boolean,
  isValid: boolean,
  type: 2 | 3,
  value: string,
};

export type BooleanComponentFilter = {
  isEnabled: boolean,
  isValid: boolean,
  type: 4,
};

export type EnvironmentNameComponentFilter = {
  isEnabled: boolean,
  isValid: boolean,
  type: 5,
  value: string,
};

export type ActivitySliceFilter = {
  type: 6,
  activityID: Element['id'],
  rendererID: number,
  isValid: boolean,
  isEnabled: boolean,
};

export type ComponentFilter =
  | BooleanComponentFilter
  | ElementTypeComponentFilter
  | RegExpComponentFilter
  | EnvironmentNameComponentFilter
  | ActivitySliceFilter;

export type HookName = string | null;
// Map of hook source ("<filename>:<line-number>:<column-number>") to name.
// Hook source is used instead of the hook itself because the latter is not stable between element inspections.
// We use a Map rather than an Array because of nested hooks and traversal ordering.
export type HookSourceLocationKey = string;
export type HookNames = Map<HookSourceLocationKey, HookName>;

export type LRUCache<K, V> = {
  del: (key: K) => void,
  get: (key: K) => V,
  has: (key: K) => boolean,
  reset: () => void,
  set: (key: K, value: V) => void,
};

export type StyleXPlugin = {
  sources: Array<string>,
  resolvedStyles: Object,
};

export type Plugins = {
  stylex: StyleXPlugin | null,
};

export const StrictMode = 1;
export const ActivityHiddenMode = 2;
export const ActivityVisibleMode = 3;

// Each element on the frontend corresponds to an ElementID (e.g. a Fiber) on the backend.
// Some of its information (e.g. id, type, displayName) come from the backend.
// Other bits (e.g. weight and depth) are computed on the frontend for windowing and display purposes.
// Elements are updated on a push basis– meaning the backend pushes updates to the frontend when needed.
export type Element = {
  id: number,
  parentID: number,
  children: Array<number>,
  type: ElementType,
  displayName: string | null,
  key: number | string | null,
  nameProp: null | string,

  hocDisplayNames: null | Array<string>,

  // Should the elements children be visible in the tree?
  isCollapsed: boolean,

  // Owner (if available)
  ownerID: number,

  // How many levels deep within the tree is this element?
  // This determines how much indentation (left padding) should be used in the Elements tree.
  depth: number,

  // How many nodes (including itself) are below this Element within the tree.
  // This property is used to quickly determine the total number of Elements,
  // and the Element at any given index (for windowing purposes).
  weight: number,

  // This element is not in a StrictMode compliant subtree.
  // Only true for React versions supporting StrictMode.
  isStrictModeNonCompliant: boolean,

  // Whether this Activity element has mode="hidden".
  isActivityHidden: boolean,

  // Whether this element is inside a hidden Activity subtree.
  isInsideHiddenActivity: boolean,

  // If component is compiled with Forget, the backend will send its name as Forget(...)
  // Later, on the frontend side, we will strip HOC names and Forget prefix.
  compiledWithForget: boolean,
};

export type Rect = {
  x: number,
  y: number,
  width: number,
  height: number,
};

export type SuspenseTimelineStep = {
  /**
   * The first step is either a host root (initial paint) or Activity (Transition).
   * Subsequent steps are always Suspense nodes.
   */
  id: SuspenseNode['id'] | Element['id'], // TODO: Will become a group.
  environment: null | string,
  rendererID: number,
  endTime: number,
};

export type SuspenseNode = {
  id: Element['id'],
  parentID: SuspenseNode['id'] | 0,
  children: Array<SuspenseNode['id']>,
  name: string | null,
  rects: null | Array<Rect>,
  hasUniqueSuspenders: boolean,
  isSuspended: boolean,
  environments: Array<string>,
  endTime: number,
};

// Serialized version of ReactIOInfo
export type SerializedIOInfo = {
  name: string,
  description: string,
  start: number,
  end: number,
  byteSize: null | number,
  value: null | Promise<mixed>,
  env: null | string,
  owner: null | SerializedElement,
  stack: null | ReactStackTrace,
};

// Serialized version of ReactAsyncInfo
export type SerializedAsyncInfo = {
  awaited: SerializedIOInfo,
  env: null | string,
  owner: null | SerializedElement,
  stack: null | ReactStackTrace,
};

export type SerializedElement = {
  displayName: string | null,
  id: number,
  key: number | string | null,
  env: null | string,
  stack: null | ReactStackTrace,
  hocDisplayNames: Array<string> | null,
  compiledWithForget: boolean,
  type: ElementType,
};

export type OwnersList = {
  id: number,
  owners: Array<SerializedElement> | null,
};

export type InspectedElementResponseType =
  | 'error'
  | 'full-data'
  | 'hydrated-path'
  | 'no-change'
  | 'not-found';

export type InspectedElementPath = Array<string | number>;

export type InspectedElement = {
  id: number,

  // Does the current renderer support editable hooks and function props?
  canEditHooks: boolean,
  canEditFunctionProps: boolean,

  // Does the current renderer support advanced editing interface?
  canEditHooksAndDeletePaths: boolean,
  canEditHooksAndRenamePaths: boolean,
  canEditFunctionPropsDeletePaths: boolean,
  canEditFunctionPropsRenamePaths: boolean,

  // Is this Error, and can its value be overridden now?
  isErrored: boolean,
  canToggleError: boolean,

  // Is this Suspense, and can its value be overridden now?
  canToggleSuspense: boolean,
  // If this Element is suspended. Currently only set on Suspense boundaries.
  isSuspended: boolean | null,

  // Does the component have legacy context attached to it.
  hasLegacyContext: boolean,

  // Inspectable properties.
  context: Object | null,
  hooks: Object | null,
  props: Object | null,
  state: Object | null,
  key: number | string | null,
  errors: Array<[string, number]>,
  warnings: Array<[string, number]>,

  // Things that suspended this Instances
  suspendedBy: Object,
  // Minimum start time to maximum end time + a potential (not actual) throttle, within the nearest boundary.
  suspendedByRange: null | [number, number],
  unknownSuspenders: UnknownSuspendersReason,

  // List of owners
  owners: Array<SerializedElement> | null,

  // Environment name that this component executed in or null for the client
  env: string | null,

  // Location of component in source code.
  source: ReactFunctionLocation | null,

  // The location of the JSX creation.
  stack: ReactStackTrace | null,

  type: ElementType,

  // Meta information about the root this element belongs to.
  rootType: string | null,

  // Meta information about the renderer that created this element.
  rendererPackageName: string | null,
  rendererVersion: string | null,

  // UI plugins/visualizations for the inspected element.
  plugins: Plugins,

  // React Native only.
  nativeTag: number | null,
};

// TODO: Add profiling type

type Data =
  | string
  | Dehydrated
  | Unserializable
  | Array<Dehydrated>
  | Array<Unserializable>
  | {[string]: Data};

export type DehydratedData = {
  cleaned: Array<Array<string | number>>,
  data: Data,
  unserializable: Array<Array<string | number>>,
};
