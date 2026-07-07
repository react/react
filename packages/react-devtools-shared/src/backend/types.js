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
 * This file contains types that are conceptually related to React internals and
 * DevTools backends, but can be passed to frontend via the bridge.
 * Be mindful of backwards compatibility when making changes.
 */

import type {
  ReactContext,
  Wakeable,
  ReactComponentInfo,
} from 'shared/ReactTypes';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {
  ComponentFilter,
  ElementType,
  Plugins,
} from 'react-devtools-shared/src/frontend/types';
import type {
  ResolveNativeStyle,
  SetupNativeStyleEditor,
} from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';
import type {InitBackend} from 'react-devtools-shared/src/backend';
import type {TimelineDataExport} from 'react-devtools-timeline/src/types';
import type {BackendBridge} from 'react-devtools-shared/src/bridge';
import type {ReactFunctionLocation, ReactStackTrace} from 'shared/ReactTypes';
import type Agent from './agent';
import type {UnknownSuspendersReason} from '../constants';

type BundleType =
  | 0 // PROD
  | 1; // DEV

export type WorkTag = number;
export type WorkFlags = number;
export type ExpirationTime = number;

export type WorkTagMap = {
  CacheComponent: WorkTag,
  ClassComponent: WorkTag,
  ContextConsumer: WorkTag,
  ContextProvider: WorkTag,
  CoroutineComponent: WorkTag,
  CoroutineHandlerPhase: WorkTag,
  DehydratedSuspenseComponent: WorkTag,
  ForwardRef: WorkTag,
  Fragment: WorkTag,
  FunctionComponent: WorkTag,
  HostComponent: WorkTag,
  HostPortal: WorkTag,
  HostRoot: WorkTag,
  HostHoistable: WorkTag,
  HostSingleton: WorkTag,
  HostText: WorkTag,
  IncompleteClassComponent: WorkTag,
  IncompleteFunctionComponent: WorkTag,
  IndeterminateComponent: WorkTag,
  LazyComponent: WorkTag,
  LegacyHiddenComponent: WorkTag,
  MemoComponent: WorkTag,
  Mode: WorkTag,
  OffscreenComponent: WorkTag,
  Profiler: WorkTag,
  ScopeComponent: WorkTag,
  SimpleMemoComponent: WorkTag,
  SuspenseComponent: WorkTag,
  SuspenseListComponent: WorkTag,
  TracingMarkerComponent: WorkTag,
  YieldComponent: WorkTag,
  Throw: WorkTag,
  ViewTransitionComponent: WorkTag,
  ActivityComponent: WorkTag,
};

export type HostInstance = Object;
export type RendererID = number;

type Dispatcher = any;
export type LegacyDispatcherRef = {current: null | Dispatcher};
type SharedInternalsSubset = {
  H: null | Dispatcher,
  ...
};
export type CurrentDispatcherRef = SharedInternalsSubset;

export type GetDisplayNameForElementID = (id: number) => string | null;

export type GetElementIDForHostInstance = (
  component: HostInstance,
) => number | null;
export type FindHostInstancesForElementID = (
  id: number,
) => null | $ReadOnlyArray<HostInstance>;

export type Rect = {
  x: number,
  y: number,
  width: number,
  height: number,
  ...
};
export type FindLastKnownRectsForID = (
  id: number,
) => null | $ReadOnlyArray<Rect>;
export type ReactProviderType<T> = {
  $$typeof: symbol | number,
  _context: ReactContext<T>,
  ...
};

export type Lane = number;
export type Lanes = number;

export type ReactRenderer = {
  version: string,
  rendererPackageName: string,
  bundleType: BundleType,
  // 16.0+ - To be removed in future versions.
  findFiberByHostInstance?: (hostInstance: HostInstance) => Fiber | null,
  // 16.9+
  overrideHookState?: ?(
    fiber: Object,
    id: number,
    path: Array<string | number>,
    value: any,
  ) => void,
  // 17+
  overrideHookStateDeletePath?: ?(
    fiber: Object,
    id: number,
    path: Array<string | number>,
  ) => void,
  // 17+
  overrideHookStateRenamePath?: ?(
    fiber: Object,
    id: number,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ) => void,
  // 16.7+
  overrideProps?: ?(
    fiber: Object,
    path: Array<string | number>,
    value: any,
  ) => void,
  // 17+
  overridePropsDeletePath?: ?(
    fiber: Object,
    path: Array<string | number>,
  ) => void,
  // 17+
  overridePropsRenamePath?: ?(
    fiber: Object,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ) => void,
  // 16.9+
  scheduleUpdate?: ?(fiber: Object) => void,
  // 19.2+
  scheduleRetry?: ?(fiber: Object) => void,
  setSuspenseHandler?: ?(shouldSuspend: (fiber: Object) => boolean) => void,
  // Only injected by React v16.8+ in order to support hooks inspection.
  currentDispatcherRef?: LegacyDispatcherRef | CurrentDispatcherRef,
  // Only injected by React v16.9+ in DEV mode.
  // Enables DevTools to append owners-only component stack to error messages.
  getCurrentFiber?: (() => Fiber | null) | null,
  // Only injected by React Flight Clients in DEV mode.
  // Enables DevTools to append owners-only component stack to error messages from Server Components.
  getCurrentComponentInfo?: () => ReactComponentInfo | null,
  // 17.0.2+
  reconcilerVersion?: string,
  // Uniquely identifies React DOM v15.
  ComponentTree?: any,
  // Present for React DOM v12 (possibly earlier) through v15.
  Mount?: any,
  // Only injected by React v17.0.3+ in DEV mode
  setErrorHandler?: ?(shouldError: (fiber: Object) => ?boolean) => void,
  // Intentionally opaque type to avoid coupling DevTools to different Fast Refresh versions.
  scheduleRefresh?: Function,
  // 18.0+
  injectProfilingHooks?: (profilingHooks: DevToolsProfilingHooks) => void,
  getLaneLabelMap?: () => Map<Lane, string> | null,
  ...
};

export type ChangeDescription = {
  context: Array<string> | boolean | null,
  didHooksChange: boolean,
  isFirstMount: boolean,
  props: Array<string> | null,
  state: Array<string> | null,
  hooks?: Array<number> | null,
};

export type CommitDataBackend = {
  // Tuple of fiber ID and change description
  changeDescriptions: Array<[number, ChangeDescription]> | null,
  duration: number,
  // Only available in certain (newer) React builds,
  effectDuration: number | null,
  // Tuple of fiber ID and actual duration
  fiberActualDurations: Array<[number, number]>,
  // Tuple of fiber ID and computed "self" duration
  fiberSelfDurations: Array<[number, number]>,
  // Only available in certain (newer) React builds,
  passiveEffectDuration: number | null,
  priorityLevel: string | null,
  timestamp: number,
  updaters: Array<SerializedElement> | null,
};

export type ProfilingDataForRootBackend = {
  commitData: Array<CommitDataBackend>,
  displayName: string,
  // Tuple of Fiber ID and base duration
  initialTreeBaseDurations: Array<[number, number]>,
  rootID: number,
};

// Profiling data collected by the renderer interface.
// This information will be passed to the frontend and combined with info it collects.
export type ProfilingDataBackend = {
  dataForRoots: Array<ProfilingDataForRootBackend>,
  rendererID: number,
  timelineData: TimelineDataExport | null,
};

export type PathFrame = {
  key: string | null,
  index: number,
  displayName: string | null,
};

export type PathMatch = {
  id: number,
  isFullMatch: boolean,
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
  type: ElementType,
};

export type OwnersList = {
  id: number,
  owners: Array<SerializedElement> | null,
};

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
  canToggleError: boolean,
  isErrored: boolean,

  // Is this Suspense, and can its value be overridden now?
  canToggleSuspense: boolean,
  // If this Element is suspended. Currently only set on Suspense boundaries.
  isSuspended: boolean | null,

  // Does the component have legacy context attached to it.
  hasLegacyContext: boolean,

  // Inspectable properties.
  context: Object | null, // DehydratedData or {[string]: mixed}
  hooks: Object | null, // DehydratedData or {[string]: mixed}
  props: Object | null, // DehydratedData or {[string]: mixed}
  state: Object | null, // DehydratedData or {[string]: mixed}
  key: number | string | null,
  errors: Array<[string, number]>,
  warnings: Array<[string, number]>,

  // Things that suspended this Instances
  suspendedBy: Object, // DehydratedData or Array<SerializedAsyncInfo>
  suspendedByRange: null | [number, number],
  unknownSuspenders: UnknownSuspendersReason,

  // List of owners
  owners: Array<SerializedElement> | null,

  // Environment name that this component executed in or null for the client
  env: string | null,

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

export const InspectElementErrorType = 'error';
export const InspectElementFullDataType = 'full-data';
export const InspectElementNoChangeType = 'no-change';
export const InspectElementNotFoundType = 'not-found';

export type InspectElementError = {
  id: number,
  responseID: number,
  type: 'error',
  errorType: 'user' | 'unknown-hook' | 'uncaught',
  message: string,
  stack?: string,
};

export type InspectElementFullData = {
  id: number,
  responseID: number,
  type: 'full-data',
  value: InspectedElement,
};

export type InspectElementHydratedPath = {
  id: number,
  responseID: number,
  type: 'hydrated-path',
  path: Array<string | number>,
  value: any,
};

export type InspectElementNoChange = {
  id: number,
  responseID: number,
  type: 'no-change',
};

export type InspectElementNotFound = {
  id: number,
  responseID: number,
  type: 'not-found',
};

export type InspectedElementPayload =
  | InspectElementError
  | InspectElementFullData
  | InspectElementHydratedPath
  | InspectElementNoChange
  | InspectElementNotFound;

export type InstanceAndStyle = {
  instance: Object | null,
  style: Object | null,
};

type Type = 'props' | 'hooks' | 'state' | 'context';

export type OnErrorOrWarning = (
  type: 'error' | 'warn',
  args: Array<any>,
) => void;
export type GetComponentStack = (
  topFrame: Error,
) => null | {enableOwnerStacks: boolean, componentStack: string};

export type RendererInterface = {
  cleanup: () => void,
  clearErrorsAndWarnings: () => void,
  clearErrorsForElementID: (id: number) => void,
  clearWarningsForElementID: (id: number) => void,
  deletePath: (
    type: Type,
    id: number,
    hookID: ?number,
    path: Array<string | number>,
  ) => void,
  findHostInstancesForElementID: FindHostInstancesForElementID,
  findLastKnownRectsForID: FindLastKnownRectsForID,
  flushInitialOperations: () => void,
  getBestMatchForTrackedPath: () => PathMatch | null,
  getComponentStack?: GetComponentStack,
  getNearestMountedDOMNode: (component: Element) => Element | null,
  getElementIDForHostInstance: GetElementIDForHostInstance,
  getSuspenseNodeIDForHostInstance: GetElementIDForHostInstance,
  getDisplayNameForElementID: GetDisplayNameForElementID,
  getInstanceAndStyle(id: number): InstanceAndStyle,
  getProfilingData(): ProfilingDataBackend,
  getOwnersList: (id: number) => Array<SerializedElement> | null,
  getPathForElement: (id: number) => Array<PathFrame> | null,
  getSerializedElementValueByPath: (
    id: number,
    path: Array<string | number>,
  ) => ?string,
  handleCommitFiberRoot: (fiber: Object, commitPriority?: number) => void,
  handleCommitFiberUnmount: (fiber: Object) => void,
  handlePostCommitFiberRoot: (fiber: Object) => void,
  hasElementWithId: (id: number) => boolean,
  inspectElement: (
    requestID: number,
    id: number,
    inspectedPaths: Object,
    forceFullData: boolean,
  ) => InspectedElementPayload,
  logElementToConsole: (id: number) => void,
  onErrorOrWarning?: OnErrorOrWarning,
  overrideError: (id: number, forceError: boolean) => void,
  overrideSuspense: (id: number, forceFallback: boolean) => void,
  overrideSuspenseMilestone: (suspendedSet: Array<number>) => void,
  overrideValueAtPath: (
    type: Type,
    id: number,
    hook: ?number,
    path: Array<string | number>,
    value: any,
  ) => void,
  getElementAttributeByPath: (
    id: number,
    path: Array<string | number>,
  ) => mixed,
  getElementSourceFunctionById: (id: number) => null | Function,
  renamePath: (
    type: Type,
    id: number,
    hookID: ?number,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ) => void,
  renderer: ReactRenderer | null,
  setTraceUpdatesEnabled: (enabled: boolean) => void,
  setTrackedPath: (path: Array<PathFrame> | null) => void,
  startProfiling: (
    recordChangeDescriptions: boolean,
    recordTimeline: boolean,
  ) => void,
  stopProfiling: () => void,
  storeAsGlobal: (
    id: number,
    path: Array<string | number>,
    count: number,
  ) => void,
  supportsTogglingSuspense: boolean,
  updateComponentFilters: (componentFilters: Array<ComponentFilter>) => void,
  getEnvironmentNames: () => Array<string>,

  // Timeline profiler interface

  ...
};

export type Handler = (data: any) => void;

// Renderers use these APIs to report profiling data to DevTools at runtime.
// They get passed from the DevTools backend to the reconciler during injection.
export type DevToolsProfilingHooks = {
  // Scheduling methods:
  markRenderScheduled: (lane: Lane) => void,
  markStateUpdateScheduled: (fiber: Fiber, lane: Lane) => void,
  markForceUpdateScheduled: (fiber: Fiber, lane: Lane) => void,

  // Work loop level methods:
  markRenderStarted: (lanes: Lanes) => void,
  markRenderYielded: () => void,
  markRenderStopped: () => void,
  markCommitStarted: (lanes: Lanes) => void,
  markCommitStopped: () => void,
  markLayoutEffectsStarted: (lanes: Lanes) => void,
  markLayoutEffectsStopped: () => void,
  markPassiveEffectsStarted: (lanes: Lanes) => void,
  markPassiveEffectsStopped: () => void,

  // Fiber level methods:
  markComponentRenderStarted: (fiber: Fiber) => void,
  markComponentRenderStopped: () => void,
  markComponentErrored: (
    fiber: Fiber,
    thrownValue: mixed,
    lanes: Lanes,
  ) => void,
  markComponentSuspended: (
    fiber: Fiber,
    wakeable: Wakeable,
    lanes: Lanes,
  ) => void,
  markComponentLayoutEffectMountStarted: (fiber: Fiber) => void,
  markComponentLayoutEffectMountStopped: () => void,
  markComponentLayoutEffectUnmountStarted: (fiber: Fiber) => void,
  markComponentLayoutEffectUnmountStopped: () => void,
  markComponentPassiveEffectMountStarted: (fiber: Fiber) => void,
  markComponentPassiveEffectMountStopped: () => void,
  markComponentPassiveEffectUnmountStarted: (fiber: Fiber) => void,
  markComponentPassiveEffectUnmountStopped: () => void,
};

export type DevToolsBackend = {
  Agent: Class<Agent>,
  Bridge: Class<BackendBridge>,
  initBackend: InitBackend,
  setupNativeStyleEditor?: SetupNativeStyleEditor,
};

export type ProfilingSettings = {
  recordChangeDescriptions: boolean,
  recordTimeline: boolean,
};

export type DevToolsHook = {
  listeners: {[key: string]: Array<Handler>, ...},
  rendererInterfaces: Map<RendererID, RendererInterface>,
  renderers: Map<RendererID, ReactRenderer>,
  hasUnsupportedRendererAttached: boolean,
  backends: Map<string, DevToolsBackend>,

  emit: (event: string, data: any) => void,
  getFiberRoots: (rendererID: RendererID) => Set<Object>,
  inject: (renderer: ReactRenderer) => number | null,
  on: (event: string, handler: Handler) => void,
  off: (event: string, handler: Handler) => void,
  reactDevtoolsAgent?: ?Object,
  sub: (event: string, handler: Handler) => () => void,

  // Used by react-native-web and Flipper/Inspector
  resolveRNStyle?: ResolveNativeStyle,
  nativeStyleEditorValidAttributes?: $ReadOnlyArray<string>,

  // React uses these methods.
  checkDCE: (fn: Function) => void,
  onCommitFiberUnmount: (rendererID: RendererID, fiber: Object) => void,
  onCommitFiberRoot: (
    rendererID: RendererID,
    fiber: Object,
    // Added in v16.9 to support Profiler priority labels
    commitPriority?: number,
    // Added in v16.9 to support Fast Refresh
    didError?: boolean,
  ) => void,

  // Timeline internal module filtering
  getInternalModuleRanges: () => Array<[string, string]>,
  registerInternalModuleStart: (moduleStartError: Error) => void,
  registerInternalModuleStop: (moduleStopError: Error) => void,

  // Testing
  dangerous_setTargetConsoleForTesting?: (fakeConsole: Object) => void,

  settings?: $ReadOnly<DevToolsHookSettings>,
  ...
};

export type DevToolsHookSettings = {
  appendComponentStack: boolean,
  breakOnConsoleErrors: boolean,
  showInlineWarningsAndErrors: boolean,
  hideConsoleLogsInStrictMode: boolean,
  disableSecondConsoleLogDimmingInStrictMode: boolean,
};

export type DevToolsSettings = DevToolsHookSettings & {
  componentFilters: Array<ComponentFilter>,
};

export type ReactBuildType =
  | 'deadcode'
  | 'development'
  | 'outdated'
  | 'production'
  | 'unminified';
