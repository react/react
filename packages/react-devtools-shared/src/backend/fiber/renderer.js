/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Thenable,
  ReactComponentInfo,
  ReactDebugInfo,
  ReactAsyncInfo,
  ReactIOInfo,
  ReactStackTrace,
  ReactCallSite,
  Wakeable,
} from 'shared/ReactTypes';

import type {HooksTree} from 'react-debug-tools/src/ReactDebugHooks';

import {
  ComponentFilterDisplayName,
  ComponentFilterElementType,
  ComponentFilterHOC,
  ComponentFilterLocation,
  ComponentFilterEnvironmentName,
  ComponentFilterActivitySlice,
  ElementTypeClass,
  ElementTypeContext,
  ElementTypeFunction,
  ElementTypeForwardRef,
  ElementTypeHostComponent,
  ElementTypeMemo,
  ElementTypeOtherOrUnknown,
  ElementTypeProfiler,
  ElementTypeRoot,
  ElementTypeSuspense,
  ElementTypeSuspenseList,
  ElementTypeTracingMarker,
  ElementTypeViewTransition,
  ElementTypeActivity,
  ElementTypeVirtual,
  StrictMode,
  ActivityHiddenMode,
  ActivityVisibleMode,
} from 'react-devtools-shared/src/frontend/types';
import {
  deletePathInObject,
  getInObject,
  getUID,
  renamePathInObject,
  setInObject,
  utfEncodeString,
} from 'react-devtools-shared/src/utils';
import {
  formatConsoleArgumentsToSingleString,
  formatDurationToMicrosecondsGranularity,
  gte,
  serializeToString,
} from 'react-devtools-shared/src/backend/utils';
import {
  extractLocationFromComponentStack,
  extractLocationFromOwnerStack,
  parseStackTrace,
} from 'react-devtools-shared/src/backend/utils/parseStackTrace';
import {
  cleanForBridge,
  copyWithDelete,
  copyWithRename,
  copyWithSet,
  getEffectDurations,
} from '../utils';
import {
  __DEBUG__,
  PROFILING_FLAG_BASIC_SUPPORT,
  PROFILING_FLAG_TIMELINE_SUPPORT,
  PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT,
  TREE_OPERATION_ADD,
  TREE_OPERATION_REMOVE,
  TREE_OPERATION_REORDER_CHILDREN,
  TREE_OPERATION_SET_SUBTREE_MODE,
  TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS,
  TREE_OPERATION_UPDATE_TREE_BASE_DURATION,
  TREE_OPERATION_APPLIED_ACTIVITY_SLICE_CHANGE,
  SUSPENSE_TREE_OPERATION_ADD,
  SUSPENSE_TREE_OPERATION_REMOVE,
  SUSPENSE_TREE_OPERATION_REORDER_CHILDREN,
  SUSPENSE_TREE_OPERATION_RESIZE,
  SUSPENSE_TREE_OPERATION_SUSPENDERS,
  UNKNOWN_SUSPENDERS_NONE,
  UNKNOWN_SUSPENDERS_REASON_PRODUCTION,
  UNKNOWN_SUSPENDERS_REASON_OLD_VERSION,
  UNKNOWN_SUSPENDERS_REASON_THROWN_PROMISE,
} from '../../constants';
import {inspectHooksOfFiber} from 'react-debug-tools';
import {
  CONCURRENT_MODE_NUMBER,
  CONCURRENT_MODE_SYMBOL_STRING,
  DEPRECATED_ASYNC_MODE_SYMBOL_STRING,
  PROVIDER_NUMBER,
  PROVIDER_SYMBOL_STRING,
  CONTEXT_NUMBER,
  CONTEXT_SYMBOL_STRING,
  CONSUMER_SYMBOL_STRING,
  STRICT_MODE_NUMBER,
  STRICT_MODE_SYMBOL_STRING,
  PROFILER_NUMBER,
  PROFILER_SYMBOL_STRING,
  LAZY_SYMBOL_STRING,
  REACT_OPTIMISTIC_KEY,
} from '../shared/ReactSymbols';
import {enableStyleXFeatures} from 'react-devtools-feature-flags';

import {componentInfoToComponentLogsMap} from '../shared/DevToolsServerComponentLogs';

import {getIODescription} from 'shared/ReactIODescription';

import {
  getPublicInstance,
  getNativeTag,
  getCurrentTime,
} from 'react-devtools-shared/src/backend/DevToolsNativeHost';
import {
  isError,
  rootSupportsProfiling,
  isErrorBoundary,
  getSecondaryEnvironmentName,
  areEqualRects,
} from './shared/DevToolsFiberInspection';
import {
  didFiberRender,
  getContextChanged,
  getChangedHooksIndices,
  getChangedKeys,
} from './shared/DevToolsFiberChangeDetection';
import {getInternalReactConstants} from './shared/DevToolsFiberInternalReactConstants';
import {
  ioExistsInSuspenseAncestor,
  getAwaitInSuspendedByFromIO,
  getVirtualEndTime,
} from './shared/DevToolsFiberSuspense';

import {
  getStackByFiberInDevAndProd,
  getOwnerStackByFiberInDev,
  supportsOwnerStacks,
  supportsConsoleTasks,
} from './DevToolsFiberComponentStack';

import {getStyleXData} from '../StyleX/utils';
import {createProfilingHooks} from '../profilingHooks';

import type {GetTimelineData, ToggleProfilingStatus} from '../profilingHooks';
import type {Fiber, FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {
  ChangeDescription,
  CommitDataBackend,
  DevToolsHook,
  InspectedElement,
  InspectedElementPayload,
  InstanceAndStyle,
  HostInstance,
  PathFrame,
  PathMatch,
  ProfilingDataBackend,
  ProfilingDataForRootBackend,
  ReactRenderer,
  Rect,
  RendererInterface,
  SerializedElement,
  SerializedAsyncInfo,
  ProfilingSettings,
} from '../types';
import type {
  ComponentFilter,
  ActivitySliceFilter,
  ElementType,
  Plugins,
} from 'react-devtools-shared/src/frontend/types';
import type {ReactFunctionLocation} from 'shared/ReactTypes';
import type {
  FiberInstance,
  FilteredFiberInstance,
  VirtualInstance,
  DevToolsInstance,
  SuspenseNode,
} from './shared/DevToolsFiberTypes';
import {
  FIBER_INSTANCE,
  VIRTUAL_INSTANCE,
  FILTERED_FIBER_INSTANCE,
} from './shared/DevToolsFiberTypes';
import {getDispatcherRef} from '../shared/DevToolsReactDispatcher';
import {getSourceLocationByFiber} from './DevToolsFiberComponentStack';
import {formatOwnerStack} from '../shared/DevToolsOwnerStack';

function createFiberInstance(fiber: Fiber): FiberInstance {
  return {
    kind: FIBER_INSTANCE,
    id: getUID(),
    parent: null,
    firstChild: null,
    nextSibling: null,
    source: null,
    logCount: 0,
    treeBaseDuration: 0,
    suspendedBy: null,
    suspenseNode: null,
    data: fiber,
  };
}

// This is used to represent a filtered Fiber but still lets us find its host instance.
function createFilteredFiberInstance(fiber: Fiber): FilteredFiberInstance {
  return {
    kind: FILTERED_FIBER_INSTANCE,
    id: 0,
    parent: null,
    firstChild: null,
    nextSibling: null,
    source: null,
    logCount: 0,
    treeBaseDuration: 0,
    suspendedBy: null,
    suspenseNode: null,
    data: fiber,
  } as any;
}

function createVirtualInstance(
  debugEntry: ReactComponentInfo,
): VirtualInstance {
  return {
    kind: VIRTUAL_INSTANCE,
    id: getUID(),
    parent: null,
    firstChild: null,
    nextSibling: null,
    source: null,
    logCount: 0,
    treeBaseDuration: 0,
    suspendedBy: null,
    suspenseNode: null,
    data: debugEntry,
  };
}

// Update flags need to be propagated up until the caller that put the corresponding
// node on the stack.
// If you push a new node, you need to handle ShouldResetChildren when you pop it.
// If you push a new Suspense node, you need to handle ShouldResetSuspenseChildren when you pop it.
type UpdateFlags = number;
const NoUpdate = /*                          */ 0b000;
const ShouldResetChildren = /*               */ 0b001;
const ShouldResetSuspenseChildren = /*       */ 0b010;
const ShouldResetParentSuspenseChildren = /* */ 0b100;

function createSuspenseNode(
  instance: FiberInstance | FilteredFiberInstance,
): SuspenseNode {
  return (instance.suspenseNode = {
    instance: instance,
    parent: null,
    firstChild: null,
    nextSibling: null,
    rects: null,
    suspendedBy: new Map(),
    environments: new Map(),
    endTime: 0,
    hasUniqueSuspenders: false,
    hasUnknownSuspenders: false,
  });
}

// All environment names we've seen so far. This lets us create a list of filters to apply.
// This should ideally include env of filtered Components too so that you can add those as
// filters at the same time as removing some other filter.
const knownEnvironmentNames: Set<string> = new Set();

// Map of FiberRoot to their root FiberInstance.
const rootToFiberInstanceMap: Map<FiberRoot, FiberInstance> = new Map();

// Map of id to FiberInstance or VirtualInstance.
// This Map is used to e.g. get the display name for a Fiber or schedule an update,
// operations that should be the same whether the current and work-in-progress Fiber is used.
const idToDevToolsInstanceMap: Map<
  FiberInstance['id'] | VirtualInstance['id'],
  FiberInstance | VirtualInstance,
> = new Map();

let focusedActivityID: null | FiberInstance['id'] = null;
let focusedActivity: null | Fiber = null;

const idToSuspenseNodeMap: Map<FiberInstance['id'], SuspenseNode> = new Map();

// Map of canonical HostInstances to the nearest parent DevToolsInstance.
const publicInstanceToDevToolsInstanceMap: Map<HostInstance, DevToolsInstance> =
  new Map();
// Map of resource DOM nodes to all the nearest DevToolsInstances that depend on it.
const hostResourceToDevToolsInstanceMap: Map<
  HostInstance,
  Set<DevToolsInstance>,
> = new Map();

function aquireHostInstance(
  nearestInstance: DevToolsInstance,
  hostInstance: HostInstance,
): void {
  const publicInstance = getPublicInstance(hostInstance);
  publicInstanceToDevToolsInstanceMap.set(publicInstance, nearestInstance);
}

function releaseHostInstance(
  nearestInstance: DevToolsInstance,
  hostInstance: HostInstance,
): void {
  const publicInstance = getPublicInstance(hostInstance);
  if (
    publicInstanceToDevToolsInstanceMap.get(publicInstance) === nearestInstance
  ) {
    publicInstanceToDevToolsInstanceMap.delete(publicInstance);
  }
}

function aquireHostResource(
  nearestInstance: DevToolsInstance,
  resource: ?{instance?: HostInstance},
): void {
  const hostInstance = resource && resource.instance;
  if (hostInstance) {
    const publicInstance = getPublicInstance(hostInstance);
    let resourceInstances =
      hostResourceToDevToolsInstanceMap.get(publicInstance);
    if (resourceInstances === undefined) {
      resourceInstances = new Set();
      hostResourceToDevToolsInstanceMap.set(publicInstance, resourceInstances);
      // Store the first match in the main map for quick access when selecting DOM node.
      publicInstanceToDevToolsInstanceMap.set(publicInstance, nearestInstance);
    }
    resourceInstances.add(nearestInstance);
  }
}

function releaseHostResource(
  nearestInstance: DevToolsInstance,
  resource: ?{instance?: HostInstance},
): void {
  const hostInstance = resource && resource.instance;
  if (hostInstance) {
    const publicInstance = getPublicInstance(hostInstance);
    const resourceInstances =
      hostResourceToDevToolsInstanceMap.get(publicInstance);
    if (resourceInstances !== undefined) {
      resourceInstances.delete(nearestInstance);
      if (resourceInstances.size === 0) {
        hostResourceToDevToolsInstanceMap.delete(publicInstance);
        publicInstanceToDevToolsInstanceMap.delete(publicInstance);
      } else if (
        publicInstanceToDevToolsInstanceMap.get(publicInstance) ===
        nearestInstance
      ) {
        // This was the first one. Store the next first one in the main map for easy access.
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const firstInstance of resourceInstances) {
          publicInstanceToDevToolsInstanceMap.set(
            publicInstance,
            firstInstance,
          );
          break;
        }
      }
    }
  }
}

export function attach(
  hook: DevToolsHook,
  rendererID: number,
  renderer: ReactRenderer,
  global: Object,
  shouldStartProfilingNow: boolean,
  profilingSettings: ProfilingSettings,
  componentFiltersOrComponentFiltersPromise:
    | Array<ComponentFilter>
    | Promise<Array<ComponentFilter>>,
): RendererInterface {
  // Newer versions of the reconciler package also specific reconciler version.
  // If that version number is present, use it.
  // Third party renderer versions may not match the reconciler version,
  // and the latter is what's important in terms of tags and symbols.
  const version = renderer.reconcilerVersion || renderer.version;

  const {
    getDisplayNameForFiber,
    getTypeSymbol,
    ReactPriorityLevels,
    ReactTypeOfWork,
    StrictModeBits,
    SuspenseyImagesMode,
  } = getInternalReactConstants(version);
  const {
    ActivityComponent,
    ClassComponent,
    DehydratedSuspenseComponent,
    ForwardRef,
    Fragment,
    FunctionComponent,
    HostRoot,
    HostHoistable,
    HostSingleton,
    HostPortal,
    HostComponent,
    HostText,
    IncompleteClassComponent,
    IncompleteFunctionComponent,
    IndeterminateComponent,
    LegacyHiddenComponent,
    MemoComponent,
    OffscreenComponent,
    SimpleMemoComponent,
    SuspenseComponent,
    SuspenseListComponent,
    TracingMarkerComponent,
    Throw,
    ViewTransitionComponent,
  } = ReactTypeOfWork;
  const {
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    LowPriority,
    IdlePriority,
    NoPriority,
  } = ReactPriorityLevels;

  const {
    getLaneLabelMap,
    injectProfilingHooks,
    overrideHookState,
    overrideHookStateDeletePath,
    overrideHookStateRenamePath,
    overrideProps,
    overridePropsDeletePath,
    overridePropsRenamePath,
    scheduleRefresh,
    setErrorHandler,
    setSuspenseHandler,
    scheduleUpdate,
    scheduleRetry,
    getCurrentFiber,
  } = renderer;
  const supportsTogglingError =
    typeof setErrorHandler === 'function' &&
    typeof scheduleUpdate === 'function';
  const supportsTogglingSuspense =
    typeof setSuspenseHandler === 'function' &&
    typeof scheduleUpdate === 'function';
  const supportsPerformanceTracks = gte(version, '19.2.0');

  if (typeof scheduleRefresh === 'function') {
    // When Fast Refresh updates a component, the frontend may need to purge cached information.
    // For example, ASTs cached for the component (for named hooks) may no longer be valid.
    // Send a signal to the frontend to purge this cached information.
    // The "fastRefreshScheduled" dispatched is global (not Fiber or even Renderer specific).
    // This is less effecient since it means the front-end will need to purge the entire cache,
    // but this is probably an okay trade off in order to reduce coupling between the DevTools and Fast Refresh.
    renderer.scheduleRefresh = (...args) => {
      try {
        hook.emit('fastRefreshScheduled');
      } finally {
        return scheduleRefresh(...args);
      }
    };
  }

  let getTimelineData: null | GetTimelineData = null;
  let toggleProfilingStatus: null | ToggleProfilingStatus = null;
  if (typeof injectProfilingHooks === 'function') {
    const response = createProfilingHooks({
      getDisplayNameForFiber,
      getIsProfiling: () => isProfiling,
      getLaneLabelMap,
      currentDispatcherRef: getDispatcherRef(renderer),
      workTagMap: ReactTypeOfWork,
      reactVersion: version,
    });

    // Pass the Profiling hooks to the reconciler for it to call during render.
    injectProfilingHooks(response.profilingHooks);

    // Hang onto this toggle so we can notify the external methods of profiling status changes.
    getTimelineData = response.getTimelineData;
    toggleProfilingStatus = response.toggleProfilingStatus;
  }

  type ComponentLogs = {
    errors: Map<string, number>,
    errorsCount: number,
    warnings: Map<string, number>,
    warningsCount: number,
  };
  // Tracks Errors/Warnings logs added to a Fiber. They are added before the commit and get
  // picked up a FiberInstance. This keeps it around as long as the Fiber is alive which
  // lets the Fiber get reparented/remounted and still observe the previous errors/warnings.
  // Unless we explicitly clear the logs from a Fiber.
  const fiberToComponentLogsMap: WeakMap<Fiber, ComponentLogs> = new WeakMap();
  // Tracks whether we've performed a commit since the last log. This is used to know
  // whether we received any new logs between the commit and post commit phases. I.e.
  // if any passive effects called console.warn / console.error.
  let needsToFlushComponentLogs = false;

  function bruteForceFlushErrorsAndWarnings(root: FiberInstance) {
    // Refresh error/warning count for all mounted unfiltered Fibers.
    let hasChanges = false;
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const devtoolsInstance of idToDevToolsInstanceMap.values()) {
      if (devtoolsInstance.kind === FIBER_INSTANCE) {
        const fiber = devtoolsInstance.data;
        const componentLogsEntry = fiberToComponentLogsMap.get(fiber);
        const changed = recordConsoleLogs(devtoolsInstance, componentLogsEntry);
        if (changed) {
          hasChanges = true;
          updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
        }
      } else {
        // Virtual Instances cannot log in passive effects and so never appear here.
      }
    }
    if (hasChanges) {
      flushPendingEvents(root);
    }
  }

  function clearErrorsAndWarnings() {
    // Note, this only clears logs for Fibers that have instances. If they're filtered
    // and then mount, the logs are there. Ensuring we only clear what you've seen.
    // If we wanted to clear the whole set, we'd replace fiberToComponentLogsMap with a
    // new WeakMap. It's unclear whether we should clear componentInfoToComponentLogsMap
    // since it's shared by other renderers but presumably it would.

    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const devtoolsInstance of idToDevToolsInstanceMap.values()) {
      if (devtoolsInstance.kind === FIBER_INSTANCE) {
        const fiber = devtoolsInstance.data;
        fiberToComponentLogsMap.delete(fiber);
        if (fiber.alternate) {
          fiberToComponentLogsMap.delete(fiber.alternate);
        }
      } else {
        componentInfoToComponentLogsMap.delete(devtoolsInstance.data);
      }
      const changed = recordConsoleLogs(devtoolsInstance, undefined);
      if (changed) {
        updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
      }
    }
    flushPendingEvents(null);
  }

  function clearConsoleLogsHelper(instanceID: number, type: 'error' | 'warn') {
    const devtoolsInstance = idToDevToolsInstanceMap.get(instanceID);
    if (devtoolsInstance !== undefined) {
      let componentLogsEntry;
      if (devtoolsInstance.kind === FIBER_INSTANCE) {
        const fiber = devtoolsInstance.data;
        componentLogsEntry = fiberToComponentLogsMap.get(fiber);

        if (componentLogsEntry === undefined && fiber.alternate !== null) {
          componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
        }
      } else {
        const componentInfo = devtoolsInstance.data;
        componentLogsEntry = componentInfoToComponentLogsMap.get(componentInfo);
      }
      if (componentLogsEntry !== undefined) {
        if (type === 'error') {
          componentLogsEntry.errors.clear();
          componentLogsEntry.errorsCount = 0;
        } else {
          componentLogsEntry.warnings.clear();
          componentLogsEntry.warningsCount = 0;
        }
        const changed = recordConsoleLogs(devtoolsInstance, componentLogsEntry);
        if (changed) {
          flushPendingEvents(null);
          updateMostRecentlyInspectedElementIfNecessary(devtoolsInstance.id);
        }
      }
    }
  }

  function clearErrorsForElementID(instanceID: number) {
    clearConsoleLogsHelper(instanceID, 'error');
  }

  function clearWarningsForElementID(instanceID: number) {
    clearConsoleLogsHelper(instanceID, 'warn');
  }

  function updateMostRecentlyInspectedElementIfNecessary(
    fiberID: number,
  ): void {
    if (
      mostRecentlyInspectedElement !== null &&
      mostRecentlyInspectedElement.id === fiberID
    ) {
      hasElementUpdatedSinceLastInspected = true;
    }
  }

  function getComponentStack(
    topFrame: Error,
  ): null | {enableOwnerStacks: boolean, componentStack: string} {
    if (getCurrentFiber == null) {
      // Expected this to be part of the renderer. Ignore.
      return null;
    }
    const current = getCurrentFiber();
    if (current === null) {
      // Outside of our render scope.
      return null;
    }

    if (supportsConsoleTasks(current)) {
      // This will be handled natively by console.createTask. No need for
      // DevTools to add it.
      return null;
    }

    const dispatcherRef = getDispatcherRef(renderer);
    if (dispatcherRef === undefined) {
      return null;
    }

    const enableOwnerStacks = supportsOwnerStacks(current);
    let componentStack = '';
    if (enableOwnerStacks) {
      // Prefix the owner stack with the current stack. I.e. what called
      // console.error. While this will also be part of the native stack,
      // it is hidden and not presented alongside this argument so we print
      // them all together.
      const topStackFrames = formatOwnerStack(topFrame);
      if (topStackFrames) {
        componentStack += '\n' + topStackFrames;
      }
      componentStack += getOwnerStackByFiberInDev(
        ReactTypeOfWork,
        current,
        dispatcherRef,
      );
    } else {
      componentStack = getStackByFiberInDevAndProd(
        ReactTypeOfWork,
        current,
        dispatcherRef,
      );
    }
    return {enableOwnerStacks, componentStack};
  }

  // Called when an error or warning is logged during render, commit, or passive (including unmount functions).
  function onErrorOrWarning(
    type: 'error' | 'warn',
    args: $ReadOnlyArray<any>,
  ): void {
    if (getCurrentFiber == null) {
      // Expected this to be part of the renderer. Ignore.
      return;
    }
    const fiber = getCurrentFiber();
    if (fiber === null) {
      // Outside of our render scope.
      return;
    }
    if (type === 'error') {
      // if this is an error simulated by us to trigger error boundary, ignore
      if (
        forceErrorForFibers.get(fiber) === true ||
        (fiber.alternate !== null &&
          forceErrorForFibers.get(fiber.alternate) === true)
      ) {
        return;
      }
    }

    // We can't really use this message as a unique key, since we can't distinguish
    // different objects in this implementation. We have to delegate displaying of the objects
    // to the environment, the browser console, for example, so this is why this should be kept
    // as an array of arguments, instead of the plain string.
    // [Warning: %o, {...}] and [Warning: %o, {...}] will be considered as the same message,
    // even if objects are different
    const message = formatConsoleArgumentsToSingleString(...args);

    // Track the warning/error for later.
    let componentLogsEntry = fiberToComponentLogsMap.get(fiber);
    if (componentLogsEntry === undefined && fiber.alternate !== null) {
      componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
      if (componentLogsEntry !== undefined) {
        // Use the same set for both Fibers.
        fiberToComponentLogsMap.set(fiber, componentLogsEntry);
      }
    }
    if (componentLogsEntry === undefined) {
      componentLogsEntry = {
        errors: new Map(),
        errorsCount: 0 as number,
        warnings: new Map(),
        warningsCount: 0 as number,
      };
      fiberToComponentLogsMap.set(fiber, componentLogsEntry);
    }

    const messageMap =
      type === 'error'
        ? componentLogsEntry.errors
        : componentLogsEntry.warnings;
    const count = messageMap.get(message) || 0;
    messageMap.set(message, count + 1);
    if (type === 'error') {
      componentLogsEntry.errorsCount++;
    } else {
      componentLogsEntry.warningsCount++;
    }

    // The changes will be flushed later when we commit.

    // If the log happened in a passive effect, then this happens after we've
    // already committed the new tree so the change won't show up until we rerender
    // that component again. We need to visit a Component with passive effects in
    // handlePostCommitFiberRoot again to ensure that we flush the changes after passive.
    needsToFlushComponentLogs = true;
  }

  function debug(
    name: string,
    instance: DevToolsInstance,
    parentInstance: null | DevToolsInstance,
    extraString: string = '',
  ): void {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      const displayName =
        instance.kind === VIRTUAL_INSTANCE
          ? instance.data.name || 'null'
          : instance.data.tag +
            ':' +
            (getDisplayNameForFiber(instance.data) || 'null');

      const maybeID =
        instance.kind === FILTERED_FIBER_INSTANCE ? '<no id>' : instance.id;

      const parentDisplayName =
        parentInstance === null
          ? ''
          : parentInstance.kind === VIRTUAL_INSTANCE
            ? parentInstance.data.name || 'null'
            : parentInstance.data.tag +
              ':' +
              (getDisplayNameForFiber(parentInstance.data) || 'null');

      const maybeParentID =
        parentInstance === null ||
        parentInstance.kind === FILTERED_FIBER_INSTANCE
          ? '<no id>'
          : parentInstance.id;

      console.groupCollapsed(
        `[renderer] %c${name} %c${displayName} (${maybeID}) %c${
          parentInstance ? `${parentDisplayName} (${maybeParentID})` : ''
        } %c${extraString}`,
        'color: red; font-weight: bold;',
        'color: blue;',
        'color: purple;',
        'color: black;',
      );
      console.log(new Error().stack.split('\n').slice(1).join('\n'));
      console.groupEnd();
    }
  }

  // eslint-disable-next-line no-unused-vars
  function debugTree(instance: DevToolsInstance, indent: number = 0) {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      const name =
        (instance.kind !== VIRTUAL_INSTANCE
          ? getDisplayNameForFiber(instance.data)
          : instance.data.name) || '';
      console.log(
        '  '.repeat(indent) +
          '- ' +
          (instance.kind === FILTERED_FIBER_INSTANCE ? 0 : instance.id) +
          ' (' +
          name +
          ')',
        'parent',
        instance.parent === null
          ? ' '
          : instance.parent.kind === FILTERED_FIBER_INSTANCE
            ? 0
            : instance.parent.id,
        'next',
        instance.nextSibling === null ? ' ' : instance.nextSibling.id,
      );
      let child = instance.firstChild;
      while (child !== null) {
        debugTree(child, indent + 1);
        child = child.nextSibling;
      }
    }
  }

  // Configurable Components tree filters.
  const hideElementsWithDisplayNames: Set<RegExp> = new Set();
  const hideElementsWithPaths: Set<RegExp> = new Set();
  const hideElementsWithTypes: Set<ElementType> = new Set();
  const hideElementsWithEnvs: Set<string> = new Set();
  let isInFocusedActivity: boolean = true;

  // Highlight updates
  let traceUpdatesEnabled: boolean = false;
  const traceUpdatesForNodes: Set<HostInstance> = new Set();

  function applyComponentFilters(
    componentFilters: Array<ComponentFilter>,
    nextActivitySlice: null | Fiber,
  ) {
    hideElementsWithTypes.clear();
    hideElementsWithDisplayNames.clear();
    hideElementsWithPaths.clear();
    hideElementsWithEnvs.clear();
    const previousFocusedActivityID = focusedActivityID;
    focusedActivityID = null;
    focusedActivity = null;
    // Consider everything in the slice by default
    isInFocusedActivity = true;

    componentFilters.forEach(componentFilter => {
      if (!componentFilter.isEnabled) {
        return;
      }

      switch (componentFilter.type) {
        case ComponentFilterDisplayName:
          if (componentFilter.isValid && componentFilter.value !== '') {
            hideElementsWithDisplayNames.add(
              new RegExp(componentFilter.value, 'i'),
            );
          }
          break;
        case ComponentFilterElementType:
          hideElementsWithTypes.add(componentFilter.value);
          break;
        case ComponentFilterLocation:
          if (componentFilter.isValid && componentFilter.value !== '') {
            hideElementsWithPaths.add(new RegExp(componentFilter.value, 'i'));
          }
          break;
        case ComponentFilterHOC:
          hideElementsWithDisplayNames.add(new RegExp('\\('));
          break;
        case ComponentFilterEnvironmentName:
          hideElementsWithEnvs.add(componentFilter.value);
          break;
        case ComponentFilterActivitySlice:
          if (
            nextActivitySlice !== null &&
            nextActivitySlice.tag === ActivityComponent
          ) {
            focusedActivity = nextActivitySlice;
            isInFocusedActivity = false;
            if (componentFilter.rendererID !== rendererID) {
              // We filtered an Activity from another renderer.
              // We need to restore the instance ID since we won't be mounting it
              // in this renderer.
              focusedActivityID = previousFocusedActivityID;
            }
          } else {
            // We're not filtering by activity slice after all.
            // Don't mark the filter as disabled here.
            // Otherwise updateComponentFilters() will think no enabled filter was changed.
          }
          break;
        default:
          console.warn(
            `Invalid component filter type "${componentFilter.type}"`,
          );
          break;
      }
    });
  }

  if (Array.isArray(componentFiltersOrComponentFiltersPromise)) {
    applyComponentFilters(componentFiltersOrComponentFiltersPromise, null);
  } else {
    componentFiltersOrComponentFiltersPromise.then(componentFilters => {
      applyComponentFilters(componentFilters, null);
    });
  }

  // If necessary, we can revisit optimizing this operation.
  // For example, we could add a new recursive unmount tree operation.
  // The unmount operations are already significantly smaller than mount operations though.
  // This is something to keep in mind for later.
  function updateComponentFilters(componentFilters: Array<ComponentFilter>) {
    if (isProfiling) {
      // Re-mounting a tree while profiling is in progress might break a lot of assumptions.
      // If necessary, we could support this- but it doesn't seem like a necessary use case.
      // Supporting change of filters while profiling would require a refactor
      // to flush after each root instead of at the end.
      throw Error('Cannot modify filter preferences while profiling');
    }

    const previousForcedFallbacks =
      forceFallbackForFibers.size > 0 ? new Set(forceFallbackForFibers) : null;
    const previousForcedErrors =
      forceErrorForFibers.size > 0 ? new Map(forceErrorForFibers) : null;

    // The ID will be based on the old tree. We need to find the Fiber based on
    // that ID before we unmount everything. We set the activity slice ID once
    // we mount it again.
    let nextFocusedActivity: null | Fiber = null;
    let focusedActivityFilter: null | ActivitySliceFilter = null;
    for (let i = 0; i < componentFilters.length; i++) {
      const filter = componentFilters[i];
      if (filter.type === ComponentFilterActivitySlice && filter.isEnabled) {
        focusedActivityFilter = filter;
        const instance = idToDevToolsInstanceMap.get(filter.activityID);
        if (instance !== undefined && instance.kind === FIBER_INSTANCE) {
          nextFocusedActivity = instance.data;
        }
      }
    }

    // Recursively unmount all roots.
    hook.getFiberRoots(rendererID).forEach(root => {
      const rootInstance = rootToFiberInstanceMap.get(root);
      if (rootInstance === undefined) {
        throw new Error(
          'Expected the root instance to already exist when applying filters',
        );
      }
      currentRoot = rootInstance;
      unmountInstanceRecursively(rootInstance);
      rootToFiberInstanceMap.delete(root);
      currentRoot = null as any;
    });

    if (
      nextFocusedActivity !== focusedActivity &&
      (focusedActivityFilter === null ||
        focusedActivityFilter.rendererID === rendererID)
    ) {
      // When we find the applied instance during mount we will send the actual ID.
      // Otherwise 0 will indicate that we unfocused the activity slice.
      pushOperation(TREE_OPERATION_APPLIED_ACTIVITY_SLICE_CHANGE);
      pushOperation(0);
    }
    applyComponentFilters(componentFilters, nextFocusedActivity);

    // Reset pseudo counters so that new path selections will be persisted.
    rootDisplayNameCounter.clear();

    // We just cleared all the forced states. Schedule updates on the affected Fibers
    // so that we get their initial states again according to the new filters.
    if (typeof scheduleUpdate === 'function') {
      if (previousForcedFallbacks !== null) {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const fiber of previousForcedFallbacks) {
          if (typeof scheduleRetry === 'function') {
            scheduleRetry(fiber);
          } else {
            scheduleUpdate(fiber);
          }
        }
      }
      if (
        previousForcedErrors !== null &&
        typeof setErrorHandler === 'function'
      ) {
        // Unlike for Suspense, disabling the forced error state requires setting
        // the status to false first. `shouldErrorFiberAccordingToMap` will clear
        // the Fibers later.
        setErrorHandler(shouldErrorFiberAccordingToMap);
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const [fiber, shouldError] of previousForcedErrors) {
          forceErrorForFibers.set(fiber, false);
          if (shouldError) {
            if (typeof scheduleRetry === 'function') {
              scheduleRetry(fiber);
            } else {
              scheduleUpdate(fiber);
            }
          }
        }
      }
    }

    // Recursively re-mount all roots with new filter criteria applied.
    hook.getFiberRoots(rendererID).forEach(root => {
      const current = root.current;
      const newRoot = createFiberInstance(current);
      rootToFiberInstanceMap.set(root, newRoot);
      idToDevToolsInstanceMap.set(newRoot.id, newRoot);

      // Before the traversals, remember to start tracking
      // our path in case we have selection to restore.
      if (trackedPath !== null) {
        mightBeOnTrackedPath = true;
      }

      currentRoot = newRoot;
      setRootPseudoKey(currentRoot.id, root.current);
      mountFiberRecursively(root.current, false);
      currentRoot = null as any;
    });

    // We need to write back the new ID for the focused Fiber.
    // Otherwise subsequent filter applications will try to focus based on the old ID.
    // This is also relevant to filter across renderers.
    if (focusedActivityFilter !== null && focusedActivityID !== null) {
      focusedActivityFilter.activityID = focusedActivityID;
    }

    // We're not profiling so it's safe to flush without a specific root.
    flushPendingEvents(null);

    needsToFlushComponentLogs = false;
  }

  function getEnvironmentNames(): Array<string> {
    return Array.from(knownEnvironmentNames);
  }

  function isFiberHydrated(fiber: Fiber): boolean {
    if (OffscreenComponent === -1) {
      throw new Error('not implemented for legacy suspense');
    }
    switch (fiber.tag) {
      case HostRoot:
        const rootState = fiber.memoizedState;
        return !rootState.isDehydrated;
      case SuspenseComponent:
        const suspenseState = fiber.memoizedState;
        return suspenseState === null || suspenseState.dehydrated === null;
      default:
        throw new Error('not implemented for work tag ' + fiber.tag);
    }
  }

  function shouldFilterVirtual(
    data: ReactComponentInfo,
    secondaryEnv: null | string,
  ): boolean {
    if (!isInFocusedActivity) {
      return true;
    }

    // For purposes of filtering Server Components are always Function Components.
    // Environment will be used to filter Server vs Client.
    // Technically they can be forwardRef and memo too but those filters will go away
    // as those become just plain user space function components like any HoC.
    if (hideElementsWithTypes.has(ElementTypeFunction)) {
      return true;
    }

    if (hideElementsWithDisplayNames.size > 0) {
      const displayName = data.name;
      if (displayName != null) {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const displayNameRegExp of hideElementsWithDisplayNames) {
          if (displayNameRegExp.test(displayName)) {
            return true;
          }
        }
      }
    }

    if (
      (data.env == null || hideElementsWithEnvs.has(data.env)) &&
      (secondaryEnv === null || hideElementsWithEnvs.has(secondaryEnv))
    ) {
      // If a Component has two environments, you have to filter both for it not to appear.
      return true;
    }

    return false;
  }

  // NOTICE Keep in sync with get*ForFiber methods
  function shouldFilterFiber(fiber: Fiber): boolean {
    const {tag, type, key} = fiber;

    // It is never valid to filter the root element.
    if (tag !== HostRoot && !isInFocusedActivity) {
      return true;
    }

    switch (tag) {
      case DehydratedSuspenseComponent:
        // TODO: ideally we would show dehydrated Suspense immediately.
        // However, it has some special behavior (like disconnecting
        // an alternate and turning into real Suspense) which breaks DevTools.
        // For now, ignore it, and only show it once it gets hydrated.
        // https://github.com/bvaughn/react-devtools-experimental/issues/197
        return true;
      case HostPortal:
      case HostText:
      case LegacyHiddenComponent:
      case OffscreenComponent:
      case Throw:
        return true;
      case HostRoot:
        // It is never valid to filter the root element.
        return false;
      case Fragment:
        return key === null;
      default:
        const typeSymbol = getTypeSymbol(type);

        switch (typeSymbol) {
          case CONCURRENT_MODE_NUMBER:
          case CONCURRENT_MODE_SYMBOL_STRING:
          case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
          case STRICT_MODE_NUMBER:
          case STRICT_MODE_SYMBOL_STRING:
            return true;
          default:
            break;
        }
    }

    const elementType = getElementTypeForFiber(fiber);
    if (hideElementsWithTypes.has(elementType)) {
      return true;
    }

    if (hideElementsWithDisplayNames.size > 0) {
      const displayName = getDisplayNameForFiber(fiber);
      if (displayName != null) {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const displayNameRegExp of hideElementsWithDisplayNames) {
          if (displayNameRegExp.test(displayName)) {
            return true;
          }
        }
      }
    }

    if (hideElementsWithEnvs.has('Client')) {
      // If we're filtering out the Client environment we should filter out all
      // "Client Components". Technically that also includes the built-ins but
      // since that doesn't actually include any additional code loading it's
      // useful to not filter out the built-ins. Those can be filtered separately.
      // There's no other way to filter out just Function components on the Client.
      // Therefore, this only filters Class and Function components.
      switch (tag) {
        case ClassComponent:
        case IncompleteClassComponent:
        case IncompleteFunctionComponent:
        case FunctionComponent:
        case IndeterminateComponent:
        case ForwardRef:
        case MemoComponent:
        case SimpleMemoComponent:
          return true;
      }
    }

    /* DISABLED: https://github.com/facebook/react/pull/28417
    if (hideElementsWithPaths.size > 0) {
      const source = getSourceForFiber(fiber);

      if (source != null) {
        const {fileName} = source;
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const pathRegExp of hideElementsWithPaths) {
          if (pathRegExp.test(fileName)) {
            return true;
          }
        }
      }
    }
    */

    return false;
  }

  // NOTICE Keep in sync with shouldFilterFiber() and other get*ForFiber methods
  function getElementTypeForFiber(fiber: Fiber): ElementType {
    const {type, tag} = fiber;

    switch (tag) {
      case ActivityComponent:
        return ElementTypeActivity;
      case ClassComponent:
      case IncompleteClassComponent:
        return ElementTypeClass;
      case IncompleteFunctionComponent:
      case FunctionComponent:
      case IndeterminateComponent:
        return ElementTypeFunction;
      case ForwardRef:
        return ElementTypeForwardRef;
      case HostRoot:
        return ElementTypeRoot;
      case HostComponent:
      case HostHoistable:
      case HostSingleton:
        return ElementTypeHostComponent;
      case HostPortal:
      case HostText:
      case Fragment:
        return ElementTypeOtherOrUnknown;
      case MemoComponent:
      case SimpleMemoComponent:
        return ElementTypeMemo;
      case SuspenseComponent:
        return ElementTypeSuspense;
      case SuspenseListComponent:
        return ElementTypeSuspenseList;
      case TracingMarkerComponent:
        return ElementTypeTracingMarker;
      case ViewTransitionComponent:
        return ElementTypeViewTransition;
      default:
        const typeSymbol = getTypeSymbol(type);

        switch (typeSymbol) {
          case CONCURRENT_MODE_NUMBER:
          case CONCURRENT_MODE_SYMBOL_STRING:
          case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
            return ElementTypeOtherOrUnknown;
          case PROVIDER_NUMBER:
          case PROVIDER_SYMBOL_STRING:
            return ElementTypeContext;
          case CONTEXT_NUMBER:
          case CONTEXT_SYMBOL_STRING:
            return ElementTypeContext;
          case STRICT_MODE_NUMBER:
          case STRICT_MODE_SYMBOL_STRING:
            return ElementTypeOtherOrUnknown;
          case PROFILER_NUMBER:
          case PROFILER_SYMBOL_STRING:
            return ElementTypeProfiler;
          default:
            return ElementTypeOtherOrUnknown;
        }
    }
  }

  // When a mount or update is in progress, this value tracks the root that is being operated on.
  let currentRoot: FiberInstance = null as any;

  // Removes a Fiber (and its alternate) from the Maps used to track their id.
  // This method should always be called when a Fiber is unmounting.
  function untrackFiber(nearestInstance: DevToolsInstance, fiber: Fiber) {
    if (forceErrorForFibers.size > 0) {
      forceErrorForFibers.delete(fiber);
      if (fiber.alternate) {
        forceErrorForFibers.delete(fiber.alternate);
      }
      if (forceErrorForFibers.size === 0 && setErrorHandler != null) {
        setErrorHandler(shouldErrorFiberAlwaysNull);
      }
    }

    if (forceFallbackForFibers.size > 0) {
      forceFallbackForFibers.delete(fiber);
      if (fiber.alternate) {
        forceFallbackForFibers.delete(fiber.alternate);
      }
      if (forceFallbackForFibers.size === 0 && setSuspenseHandler != null) {
        setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
      }
    }

    // TODO: Consider using a WeakMap instead. The only thing where that doesn't work
    // is React Native Paper which tracks tags but that support is eventually going away
    // and can use the old findFiberByHostInstance strategy.

    if (fiber.tag === HostHoistable) {
      releaseHostResource(nearestInstance, fiber.memoizedState);
    } else if (
      fiber.tag === HostComponent ||
      fiber.tag === HostText ||
      fiber.tag === HostSingleton
    ) {
      releaseHostInstance(nearestInstance, fiber.stateNode);
    }

    // Recursively clean up any filtered Fibers below this one as well since
    // we won't recordUnmount on those.
    for (let child = fiber.child; child !== null; child = child.sibling) {
      if (shouldFilterFiber(child)) {
        untrackFiber(nearestInstance, child);
      }
    }
  }

  function getChangeDescription(
    prevFiber: Fiber | null,
    nextFiber: Fiber,
  ): ChangeDescription | null {
    switch (nextFiber.tag) {
      case ClassComponent:
        if (prevFiber === null) {
          return {
            context: null,
            didHooksChange: false,
            isFirstMount: true,
            props: null,
            state: null,
          };
        } else {
          const data: ChangeDescription = {
            context: getContextChanged(prevFiber, nextFiber),
            didHooksChange: false,
            isFirstMount: false,
            props: getChangedKeys(
              prevFiber.memoizedProps,
              nextFiber.memoizedProps,
            ),
            state: getChangedKeys(
              prevFiber.memoizedState,
              nextFiber.memoizedState,
            ),
          };
          return data;
        }
      case IncompleteFunctionComponent:
      case FunctionComponent:
      case IndeterminateComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
        if (prevFiber === null) {
          return {
            context: null,
            didHooksChange: false,
            isFirstMount: true,
            props: null,
            state: null,
          };
        } else {
          const prevHooks = inspectHooks(prevFiber);
          const nextHooks = inspectHooks(nextFiber);
          const indices = getChangedHooksIndices(prevHooks, nextHooks);
          const data: ChangeDescription = {
            context: getContextChanged(prevFiber, nextFiber),
            didHooksChange: indices !== null && indices.length > 0,
            isFirstMount: false,
            props: getChangedKeys(
              prevFiber.memoizedProps,
              nextFiber.memoizedProps,
            ),
            state: null,
            hooks: indices,
          };
          // Only traverse the hooks list once, depending on what info we're returning.
          return data;
        }
      default:
        return null;
    }
  }

  type OperationsArray = Array<number>;

  type StringTableEntry = {
    encodedString: Array<number>,
    id: number,
  };

  const pendingOperations: OperationsArray = [];
  const pendingRealUnmountedIDs: Array<FiberInstance['id']> = [];
  const pendingRealUnmountedSuspenseIDs: Array<FiberInstance['id']> = [];
  const pendingSuspenderChanges: Set<FiberInstance['id']> = new Set();
  let pendingOperationsQueue: Array<OperationsArray> | null = [];
  const pendingStringTable: Map<string, StringTableEntry> = new Map();
  let pendingStringTableLength: number = 0;

  function pushOperation(op: number): void {
    if (__DEV__) {
      if (!Number.isInteger(op)) {
        console.error(
          'pushOperation() was called but the value is not an integer.',
          op,
        );
      }
    }
    pendingOperations.push(op);
  }

  function shouldBailoutWithPendingOperations() {
    if (isProfiling) {
      if (
        currentCommitProfilingMetadata != null &&
        currentCommitProfilingMetadata.durations.length > 0
      ) {
        return false;
      }
    }

    return (
      pendingOperations.length === 0 &&
      pendingRealUnmountedIDs.length === 0 &&
      pendingRealUnmountedSuspenseIDs.length === 0 &&
      pendingSuspenderChanges.size === 0
    );
  }

  function flushOrQueueOperations(operations: OperationsArray): void {
    if (shouldBailoutWithPendingOperations()) {
      return;
    }

    if (pendingOperationsQueue !== null) {
      pendingOperationsQueue.push(operations);
    } else {
      hook.emit('operations', operations);
    }
  }

  function recordConsoleLogs(
    instance: FiberInstance | VirtualInstance,
    componentLogsEntry: void | ComponentLogs,
  ): boolean {
    if (componentLogsEntry === undefined) {
      if (instance.logCount === 0) {
        // Nothing has changed.
        return false;
      }
      // Reset to zero.
      instance.logCount = 0;
      pushOperation(TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS);
      pushOperation(instance.id);
      pushOperation(0);
      pushOperation(0);
      return true;
    } else {
      const totalCount =
        componentLogsEntry.errorsCount + componentLogsEntry.warningsCount;
      if (instance.logCount === totalCount) {
        // Nothing has changed.
        return false;
      }
      // Update counts.
      instance.logCount = totalCount;
      pushOperation(TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS);
      pushOperation(instance.id);
      pushOperation(componentLogsEntry.errorsCount);
      pushOperation(componentLogsEntry.warningsCount);
      return true;
    }
  }

  /**
   * Allowed to flush pending events without a specific root when:
   * - pending operations don't record tree mutations e.g. TREE_OPERATION_UPDATE_ERRORS_OR_WARNINGS
   * - not profiling (the commit tree builder requires the root of the mutations)
   */
  function flushPendingEvents(root: FiberInstance | null): void {
    if (shouldBailoutWithPendingOperations()) {
      // If we aren't profiling, we can just bail out here.
      // No use sending an empty update over the bridge.
      //
      // The Profiler stores metadata for each commit and reconstructs the app tree per commit using:
      // (1) an initial tree snapshot and
      // (2) the operations array for each commit
      // Because of this, it's important that the operations and metadata arrays align,
      // So it's important not to omit even empty operations while profiling is active.
      return;
    }

    const numUnmountIDs = pendingRealUnmountedIDs.length;
    const numUnmountSuspenseIDs = pendingRealUnmountedSuspenseIDs.length;
    const numSuspenderChanges = pendingSuspenderChanges.size;

    const operations = new Array<number>(
      // Identify which renderer this update is coming from.
      2 + // [rendererID, rootFiberID]
        // How big is the string table?
        1 + // [stringTableLength]
        // Then goes the actual string table.
        pendingStringTableLength +
        // All unmounts of Suspense boundaries are batched in a single message.
        // [TREE_OPERATION_REMOVE_SUSPENSE, removedSuspenseIDLength, ...ids]
        (numUnmountSuspenseIDs > 0 ? 2 + numUnmountSuspenseIDs : 0) +
        // All unmounts are batched in a single message.
        // [TREE_OPERATION_REMOVE, removedIDLength, ...ids]
        (numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) +
        // Regular operations
        pendingOperations.length +
        // All suspender changes are batched in a single message.
        // [SUSPENSE_TREE_OPERATION_SUSPENDERS, suspenderChangesLength, ...[id, hasUniqueSuspenders, endTime, isSuspended]]
        (numSuspenderChanges > 0 ? 2 + numSuspenderChanges * 4 : 0),
    );

    // Identify which renderer this update is coming from.
    // This enables roots to be mapped to renderers,
    // Which in turn enables fiber props, states, and hooks to be inspected.
    let i = 0;
    operations[i++] = rendererID;
    if (root === null) {
      operations[i++] = -1;
    } else {
      operations[i++] = root.id;
    }

    // Now fill in the string table.
    // [stringTableLength, str1Length, ...str1, str2Length, ...str2, ...]
    operations[i++] = pendingStringTableLength;
    pendingStringTable.forEach((entry, stringKey) => {
      const encodedString = entry.encodedString;

      // Don't use the string length.
      // It won't work for multibyte characters (like emoji).
      const length = encodedString.length;

      operations[i++] = length;
      for (let j = 0; j < length; j++) {
        operations[i + j] = encodedString[j];
      }

      i += length;
    });

    if (numUnmountSuspenseIDs > 0) {
      // All unmounts of Suspense boundaries are batched in a single message.
      operations[i++] = SUSPENSE_TREE_OPERATION_REMOVE;
      // The first number is how many unmounted IDs we're gonna send.
      operations[i++] = numUnmountSuspenseIDs;
      // Fill in the real unmounts in the reverse order.
      // They were inserted parents-first by React, but we want children-first.
      // So we traverse our array backwards.
      for (let j = 0; j < pendingRealUnmountedSuspenseIDs.length; j++) {
        operations[i++] = pendingRealUnmountedSuspenseIDs[j];
      }
    }

    if (numUnmountIDs > 0) {
      // All unmounts except roots are batched in a single message.
      operations[i++] = TREE_OPERATION_REMOVE;
      // The first number is how many unmounted IDs we're gonna send.
      operations[i++] = numUnmountIDs;
      // Fill in the real unmounts in the reverse order.
      // They were inserted parents-first by React, but we want children-first.
      // So we traverse our array backwards.
      for (let j = 0; j < pendingRealUnmountedIDs.length; j++) {
        operations[i++] = pendingRealUnmountedIDs[j];
      }
    }

    // Fill in pending operations.
    for (let j = 0; j < pendingOperations.length; j++) {
      operations[i + j] = pendingOperations[j];
    }
    i += pendingOperations.length;

    // Suspender changes might affect newly mounted nodes that we already recorded
    // in pending operations.
    if (numSuspenderChanges > 0) {
      operations[i++] = SUSPENSE_TREE_OPERATION_SUSPENDERS;
      operations[i++] = numSuspenderChanges;
      pendingSuspenderChanges.forEach(fiberIdWithChanges => {
        const suspense = idToSuspenseNodeMap.get(fiberIdWithChanges);
        if (suspense === undefined) {
          // Probably forgot to cleanup pendingSuspenderChanges when this node was removed.
          throw new Error(
            `Could not send suspender changes for "${fiberIdWithChanges}" since the Fiber no longer exists.`,
          );
        }
        operations[i++] = fiberIdWithChanges;
        operations[i++] = suspense.hasUniqueSuspenders ? 1 : 0;
        operations[i++] = Math.round(suspense.endTime * 1000);
        const instance = suspense.instance;
        const isSuspended =
          // TODO: Track if other SuspenseNode like SuspenseList rows are suspended.
          (instance.kind === FIBER_INSTANCE ||
            instance.kind === FILTERED_FIBER_INSTANCE) &&
          instance.data.tag === SuspenseComponent &&
          instance.data.memoizedState !== null;
        operations[i++] = isSuspended ? 1 : 0;
        operations[i++] = suspense.environments.size;
        suspense.environments.forEach((count, env) => {
          operations[i++] = getStringID(env);
        });
      });
    }

    // Let the frontend know about tree operations.
    flushOrQueueOperations(operations);

    // Reset all of the pending state now that we've told the frontend about it.
    pendingOperations.length = 0;
    pendingRealUnmountedIDs.length = 0;
    pendingRealUnmountedSuspenseIDs.length = 0;
    pendingSuspenderChanges.clear();
    pendingStringTable.clear();
    pendingStringTableLength = 0;
  }

  function measureHostInstance(instance: HostInstance): null | Array<Rect> {
    // Feature detect measurement capabilities of this environment.
    // TODO: Consider making this capability injected by the ReactRenderer.
    if (typeof instance !== 'object' || instance === null) {
      return null;
    }
    if (
      typeof instance.getClientRects === 'function' ||
      instance.nodeType === 3
    ) {
      // DOM
      const doc = instance.ownerDocument;
      if (instance === doc.documentElement) {
        // This is the document element. The size of this element is not actually
        // what determines the whole scrollable area of the screen. Because any
        // thing that overflows the document will also contribute to the scrollable.
        // This is unlike overflow: scroll which clips those.
        // Therefore, we use the scrollable size for this rect instead.
        return [
          {
            x: 0,
            y: 0,
            width: instance.scrollWidth,
            height: instance.scrollHeight,
          },
        ];
      }
      const result: Array<Rect> = [];
      const win = doc && doc.defaultView;
      const scrollX = win ? win.scrollX : 0;
      const scrollY = win ? win.scrollY : 0;
      let rects;
      if (instance.nodeType === 3) {
        // Text nodes cannot be measured directly but we can measure a Range.
        if (typeof doc.createRange !== 'function') {
          return null;
        }
        const range = doc.createRange();
        if (typeof range.getClientRects !== 'function') {
          return null;
        }
        range.selectNodeContents(instance);
        rects = range.getClientRects();
      } else {
        rects = instance.getClientRects();
      }
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        result.push({
          x: rect.x + scrollX,
          y: rect.y + scrollY,
          width: rect.width,
          height: rect.height,
        });
      }
      return result;
    }
    if (instance.canonical) {
      // Native
      const publicInstance = instance.canonical.publicInstance;
      if (!publicInstance) {
        // The publicInstance may not have been initialized yet if there was no ref on this node.
        // We can't initialize it from any existing Hook but we could fallback to this async form:
        // renderer.extraDevToolsConfig.getInspectorDataForInstance(instance).hierarchy[last].getInspectorData().measure(callback)
        return null;
      }
      if (typeof publicInstance.getBoundingClientRect === 'function') {
        // enableAccessToHostTreeInFabric / ReadOnlyElement
        return [publicInstance.getBoundingClientRect()];
      }
      if (typeof publicInstance.unstable_getBoundingClientRect === 'function') {
        // ReactFabricHostComponent
        return [publicInstance.unstable_getBoundingClientRect()];
      }
    }
    return null;
  }

  function measureInstance(instance: DevToolsInstance): null | Array<Rect> {
    // Synchronously return the client rects of the Host instances directly inside this Instance.
    const hostInstances = findAllCurrentHostInstances(instance);
    let result: null | Array<Rect> = null;
    for (let i = 0; i < hostInstances.length; i++) {
      const childResult = measureHostInstance(hostInstances[i]);
      if (childResult !== null) {
        if (result === null) {
          result = childResult;
        } else {
          result = result.concat(childResult);
        }
      }
    }
    return result;
  }

  function getStringID(string: string | null): number {
    if (string === null) {
      return 0;
    }
    const existingEntry = pendingStringTable.get(string);
    if (existingEntry !== undefined) {
      return existingEntry.id;
    }

    const id = pendingStringTable.size + 1;
    const encodedString = utfEncodeString(string);

    pendingStringTable.set(string, {
      encodedString,
      id,
    });

    // The string table total length needs to account both for the string length,
    // and for the array item that contains the length itself.
    //
    // Don't use string length for this table.
    // It won't work for multibyte characters (like emoji).
    pendingStringTableLength += encodedString.length + 1;

    return id;
  }

  let isInDisconnectedSubtree = false;

  function recordMount(
    fiber: Fiber,
    parentInstance: DevToolsInstance | null,
  ): FiberInstance {
    const isRoot = fiber.tag === HostRoot;
    let fiberInstance;
    if (isRoot) {
      const entry = rootToFiberInstanceMap.get(fiber.stateNode);
      if (entry === undefined) {
        throw new Error('The root should have been registered at this point');
      }
      fiberInstance = entry;
    } else {
      fiberInstance = createFiberInstance(fiber);
    }
    idToDevToolsInstanceMap.set(fiberInstance.id, fiberInstance);

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('recordMount()', fiberInstance, parentInstance);
    }

    recordReconnect(fiberInstance, parentInstance);
    return fiberInstance;
  }

  function recordReconnect(
    fiberInstance: FiberInstance,
    parentInstance: DevToolsInstance | null,
  ): void {
    if (isInDisconnectedSubtree) {
      // We're disconnected. We'll reconnect a hidden mount after the parent reappears.
      return;
    }
    const id = fiberInstance.id;
    const fiber = fiberInstance.data;

    const isProfilingSupported = fiber.hasOwnProperty('treeBaseDuration');

    const isRoot = fiber.tag === HostRoot;

    if (isRoot) {
      const hasOwnerMetadata = fiber.hasOwnProperty('_debugOwner');

      // Adding a new field here would require a bridge protocol version bump (a backwads breaking change).
      // Instead let's re-purpose a pre-existing field to carry more information.
      let profilingFlags = 0;
      if (isProfilingSupported) {
        profilingFlags = PROFILING_FLAG_BASIC_SUPPORT;
        if (typeof injectProfilingHooks === 'function') {
          profilingFlags |= PROFILING_FLAG_TIMELINE_SUPPORT;
        }
        if (supportsPerformanceTracks) {
          profilingFlags |= PROFILING_FLAG_PERFORMANCE_TRACKS_SUPPORT;
        }
      }

      // Set supportsStrictMode to false for production renderer builds
      const isProductionBuildOfRenderer = renderer.bundleType === 0;

      pushOperation(TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(ElementTypeRoot);
      pushOperation((fiber.mode & StrictModeBits) !== 0 ? 1 : 0);
      pushOperation(profilingFlags);
      pushOperation(
        !isProductionBuildOfRenderer && StrictModeBits !== 0 ? 1 : 0,
      );
      pushOperation(hasOwnerMetadata ? 1 : 0);

      if (isProfiling) {
        if (displayNamesByRootID !== null) {
          displayNamesByRootID.set(id, getDisplayNameForRoot(fiber));
        }
      }
    } else {
      const suspenseNode = fiberInstance.suspenseNode;
      if (suspenseNode !== null && fiber.memoizedState === null) {
        // We're reconnecting an unsuspended Suspense. Measure to see if anything changed.
        const prevRects = suspenseNode.rects;
        const nextRects = measureInstance(fiberInstance);
        if (!areEqualRects(prevRects, nextRects)) {
          suspenseNode.rects = nextRects;
          recordSuspenseResize(suspenseNode);
        }
      }

      const {key} = fiber;
      const displayName = getDisplayNameForFiber(fiber);
      const elementType = getElementTypeForFiber(fiber);

      // Finding the owner instance might require traversing the whole parent path which
      // doesn't have great big O notation. Ideally we'd lazily fetch the owner when we
      // need it but we have some synchronous operations in the front end like Alt+Left
      // which selects the owner immediately. Typically most owners are only a few parents
      // away so maybe it's not so bad.
      const debugOwner = getUnfilteredOwner(fiber);
      const ownerInstance = findNearestOwnerInstance(
        parentInstance,
        debugOwner,
      );
      if (
        ownerInstance !== null &&
        debugOwner === fiber._debugOwner &&
        fiber._debugStack != null &&
        ownerInstance.source === null
      ) {
        // The new Fiber is directly owned by the ownerInstance. Therefore somewhere on
        // the debugStack will be a stack frame inside the ownerInstance's source.
        ownerInstance.source = fiber._debugStack;
      }

      let unfilteredParent = parentInstance;
      while (
        unfilteredParent !== null &&
        unfilteredParent.kind === FILTERED_FIBER_INSTANCE
      ) {
        unfilteredParent = unfilteredParent.parent;
      }

      const ownerID = ownerInstance === null ? 0 : ownerInstance.id;
      const parentID = unfilteredParent === null ? 0 : unfilteredParent.id;

      const displayNameStringID = getStringID(displayName);

      // This check is a guard to handle a React element that has been modified
      // in such a way as to bypass the default stringification of the "key" property.
      const keyString =
        key === null
          ? null
          : key === REACT_OPTIMISTIC_KEY
            ? 'React.optimisticKey'
            : String(key);
      const keyStringID = getStringID(keyString);

      const nameProp =
        fiber.tag === SuspenseComponent
          ? fiber.memoizedProps.name
          : fiber.tag === ActivityComponent
            ? fiber.memoizedProps.name
            : null;
      const namePropString = nameProp == null ? null : String(nameProp);
      const namePropStringID = getStringID(namePropString);

      pushOperation(TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(elementType);
      pushOperation(parentID);
      pushOperation(ownerID);
      pushOperation(displayNameStringID);
      pushOperation(keyStringID);
      pushOperation(namePropStringID);

      // If this subtree has a new mode, let the frontend know.
      if ((fiber.mode & StrictModeBits) !== 0) {
        let parentFiber = null;
        let parentFiberInstance = parentInstance;
        while (parentFiberInstance !== null) {
          if (parentFiberInstance.kind === FIBER_INSTANCE) {
            parentFiber = parentFiberInstance.data;
            break;
          }
          parentFiberInstance = parentFiberInstance.parent;
        }
        if (parentFiber === null || (parentFiber.mode & StrictModeBits) === 0) {
          pushOperation(TREE_OPERATION_SET_SUBTREE_MODE);
          pushOperation(id);
          pushOperation(StrictMode);
        }
      }

      // If this is an Activity component, check if it's hidden.
      if (fiber.tag === ActivityComponent) {
        const offscreenChild = fiber.child;
        if (
          offscreenChild !== null &&
          offscreenChild.tag === OffscreenComponent &&
          offscreenChild.memoizedState !== null
        ) {
          pushOperation(TREE_OPERATION_SET_SUBTREE_MODE);
          pushOperation(id);
          pushOperation(ActivityHiddenMode);
        }
      }
    }

    let componentLogsEntry = fiberToComponentLogsMap.get(fiber);
    if (componentLogsEntry === undefined && fiber.alternate !== null) {
      componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
    }
    recordConsoleLogs(fiberInstance, componentLogsEntry);

    if (isProfilingSupported) {
      recordProfilingDurations(fiberInstance, null);
    }
  }

  function recordVirtualMount(
    instance: VirtualInstance,
    parentInstance: DevToolsInstance | null,
    secondaryEnv: null | string,
  ): void {
    const id = instance.id;

    idToDevToolsInstanceMap.set(id, instance);

    recordVirtualReconnect(instance, parentInstance, secondaryEnv);
  }

  function recordVirtualReconnect(
    instance: VirtualInstance,
    parentInstance: DevToolsInstance | null,
    secondaryEnv: null | string,
  ): void {
    if (isInDisconnectedSubtree) {
      // We're disconnected. We'll reconnect a hidden mount after the parent reappears.
      return;
    }
    const componentInfo = instance.data;

    const key =
      typeof componentInfo.key === 'string' ? componentInfo.key : null;
    const env = componentInfo.env;
    let displayName = componentInfo.name || '';
    if (typeof env === 'string') {
      // We model environment as an HoC name for now.
      if (secondaryEnv !== null) {
        displayName = secondaryEnv + '(' + displayName + ')';
      }
      displayName = env + '(' + displayName + ')';
    }
    const elementType = ElementTypeVirtual;

    // Finding the owner instance might require traversing the whole parent path which
    // doesn't have great big O notation. Ideally we'd lazily fetch the owner when we
    // need it but we have some synchronous operations in the front end like Alt+Left
    // which selects the owner immediately. Typically most owners are only a few parents
    // away so maybe it's not so bad.
    const debugOwner = getUnfilteredOwner(componentInfo);
    const ownerInstance = findNearestOwnerInstance(parentInstance, debugOwner);
    if (
      ownerInstance !== null &&
      debugOwner === componentInfo.owner &&
      componentInfo.debugStack != null &&
      ownerInstance.source === null
    ) {
      // The new Fiber is directly owned by the ownerInstance. Therefore somewhere on
      // the debugStack will be a stack frame inside the ownerInstance's source.
      ownerInstance.source = componentInfo.debugStack;
    }

    let unfilteredParent = parentInstance;
    while (
      unfilteredParent !== null &&
      unfilteredParent.kind === FILTERED_FIBER_INSTANCE
    ) {
      unfilteredParent = unfilteredParent.parent;
    }

    const ownerID = ownerInstance === null ? 0 : ownerInstance.id;
    const parentID = unfilteredParent === null ? 0 : unfilteredParent.id;

    const displayNameStringID = getStringID(displayName);

    // This check is a guard to handle a React element that has been modified
    // in such a way as to bypass the default stringification of the "key" property.
    const keyString = key === null ? null : String(key);
    const keyStringID = getStringID(keyString);
    const namePropStringID = getStringID(null);

    const id = instance.id;

    pushOperation(TREE_OPERATION_ADD);
    pushOperation(id);
    pushOperation(elementType);
    pushOperation(parentID);
    pushOperation(ownerID);
    pushOperation(displayNameStringID);
    pushOperation(keyStringID);
    pushOperation(namePropStringID);

    const componentLogsEntry =
      componentInfoToComponentLogsMap.get(componentInfo);
    recordConsoleLogs(instance, componentLogsEntry);
  }

  function recordSuspenseMount(
    suspenseInstance: SuspenseNode,
    parentSuspenseInstance: SuspenseNode | null,
  ): void {
    const fiberInstance = suspenseInstance.instance;
    if (fiberInstance.kind === FILTERED_FIBER_INSTANCE) {
      throw new Error('Cannot record a mount for a filtered Fiber instance.');
    }
    const fiberID = fiberInstance.id;

    let unfilteredParent = parentSuspenseInstance;
    while (
      unfilteredParent !== null &&
      unfilteredParent.instance.kind === FILTERED_FIBER_INSTANCE
    ) {
      unfilteredParent = unfilteredParent.parent;
    }
    const unfilteredParentInstance =
      unfilteredParent !== null ? unfilteredParent.instance : null;
    if (
      unfilteredParentInstance !== null &&
      unfilteredParentInstance.kind === FILTERED_FIBER_INSTANCE
    ) {
      throw new Error(
        'Should not have a filtered instance at this point. This is a bug.',
      );
    }
    const parentID =
      unfilteredParentInstance === null ? 0 : unfilteredParentInstance.id;

    const fiber = fiberInstance.data;
    const props = fiber.memoizedProps;
    // The frontend will guess a name based on heuristics (e.g. owner) if no explicit name is given.
    const name =
      fiber.tag !== SuspenseComponent || props === null
        ? null
        : props.name || null;
    const nameStringID = getStringID(name);

    const isSuspended =
      fiber.tag === SuspenseComponent && fiber.memoizedState !== null;

    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log('recordSuspenseMount()', suspenseInstance);
    }

    idToSuspenseNodeMap.set(fiberID, suspenseInstance);

    pushOperation(SUSPENSE_TREE_OPERATION_ADD);
    pushOperation(fiberID);
    pushOperation(parentID);
    pushOperation(nameStringID);
    pushOperation(isSuspended ? 1 : 0);

    const rects = suspenseInstance.rects;
    if (rects === null) {
      pushOperation(-1);
    } else {
      pushOperation(rects.length);
      for (let i = 0; i < rects.length; ++i) {
        const rect = rects[i];
        pushOperation(Math.round(rect.x * 1000));
        pushOperation(Math.round(rect.y * 1000));
        pushOperation(Math.round(rect.width * 1000));
        pushOperation(Math.round(rect.height * 1000));
      }
    }
  }

  function recordUnmount(fiberInstance: FiberInstance): void {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('recordUnmount()', fiberInstance, reconcilingParent);
    }

    recordDisconnect(fiberInstance);

    const suspenseNode = fiberInstance.suspenseNode;
    if (suspenseNode !== null) {
      recordSuspenseUnmount(suspenseNode);
    }

    idToDevToolsInstanceMap.delete(fiberInstance.id);

    untrackFiber(fiberInstance, fiberInstance.data);
  }

  function recordDisconnect(fiberInstance: FiberInstance): void {
    if (isInDisconnectedSubtree) {
      // Already disconnected.
      return;
    }

    if (trackedPathMatchInstance === fiberInstance) {
      // We're in the process of trying to restore previous selection.
      // If this fiber matched but is being hidden, there's no use trying.
      // Reset the state so we don't keep holding onto it.
      setTrackedPath(null);
    }

    const id = fiberInstance.id;
    pendingRealUnmountedIDs.push(id);
  }

  function recordSuspenseResize(suspenseNode: SuspenseNode): void {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log('recordSuspenseResize()', suspenseNode);
    }
    const fiberInstance = suspenseNode.instance;
    if (fiberInstance.kind !== FIBER_INSTANCE) {
      // TODO: Resizes of filtered Suspense nodes are currently dropped.
      return;
    }

    pushOperation(SUSPENSE_TREE_OPERATION_RESIZE);
    pushOperation(fiberInstance.id);
    const rects = suspenseNode.rects;
    if (rects === null) {
      pushOperation(-1);
    } else {
      pushOperation(rects.length);
      for (let i = 0; i < rects.length; ++i) {
        const rect = rects[i];
        pushOperation(Math.round(rect.x * 1000));
        pushOperation(Math.round(rect.y * 1000));
        pushOperation(Math.round(rect.width * 1000));
        pushOperation(Math.round(rect.height * 1000));
      }
    }
  }

  function recordSuspenseSuspenders(suspenseNode: SuspenseNode): void {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log('recordSuspenseSuspenders()', suspenseNode);
    }
    const fiberInstance = suspenseNode.instance;
    if (fiberInstance.kind !== FIBER_INSTANCE) {
      // TODO: Suspender updates of filtered Suspense nodes are currently dropped.
      return;
    }

    // TODO: Just enqueue the operations here instead of stashing by id.

    // Ensure each environment gets recorded in the string table since it is emitted
    // before we loop it over again later during flush.
    suspenseNode.environments.forEach((count, env) => {
      getStringID(env);
    });
    pendingSuspenderChanges.add(fiberInstance.id);
  }

  function recordSuspenseUnmount(suspenseInstance: SuspenseNode): void {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      console.log(
        'recordSuspenseUnmount()',
        suspenseInstance,
        reconcilingParentSuspenseNode,
      );
    }

    const devtoolsInstance = suspenseInstance.instance;
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      throw new Error("Can't unmount a filtered SuspenseNode. This is a bug.");
    }
    const fiberInstance = devtoolsInstance;
    const id = fiberInstance.id;

    // To maintain child-first ordering,
    // we'll push it into one of these queues,
    // and later arrange them in the correct order.
    pendingRealUnmountedSuspenseIDs.push(id);

    pendingSuspenderChanges.delete(id);
    idToSuspenseNodeMap.delete(id);
  }

  // Running state of the remaining children from the previous version of this parent that
  // we haven't yet added back. This should be reset anytime we change parent.
  // Any remaining ones at the end will be deleted.
  let remainingReconcilingChildren: null | DevToolsInstance = null;
  // The previously placed child.
  let previouslyReconciledSibling: null | DevToolsInstance = null;
  // To save on stack allocation and ensure that they are updated as a pair, we also store
  // the current parent here as well.
  let reconcilingParent: null | DevToolsInstance = null;

  let remainingReconcilingChildrenSuspenseNodes: null | SuspenseNode = null;
  // The previously placed child.
  let previouslyReconciledSiblingSuspenseNode: null | SuspenseNode = null;
  // To save on stack allocation and ensure that they are updated as a pair, we also store
  // the current parent here as well.
  let reconcilingParentSuspenseNode: null | SuspenseNode = null;

  function insertSuspendedBy(asyncInfo: ReactAsyncInfo): void {
    if (reconcilingParent === null || reconcilingParentSuspenseNode === null) {
      throw new Error(
        'It should not be possible to have suspended data outside the root. ' +
          'Even suspending at the first position is still a child of the root.',
      );
    }
    const parentSuspenseNode = reconcilingParentSuspenseNode;
    // Use the nearest unfiltered parent so that there's always some component that has
    // the entry on it even if you filter, or the root if all are filtered.
    let parentInstance = reconcilingParent;
    while (
      parentInstance.kind === FILTERED_FIBER_INSTANCE &&
      parentInstance.parent !== null &&
      // We can't move past the parent Suspense node.
      // The Suspense node holding async info must be a parent of the devtools instance (or the instance itself)
      parentInstance !== parentSuspenseNode.instance
    ) {
      parentInstance = parentInstance.parent;
    }
    if (parentInstance.kind === FIBER_INSTANCE) {
      const fiber = parentInstance.data;

      if (
        fiber.tag === SuspenseComponent &&
        parentInstance !== parentSuspenseNode.instance
      ) {
        // We're about to attach async info to a Suspense boundary we're not
        // actually considering the parent Suspense boundary for this async info.
        // We must have not found a suitable Fiber inside the fallback (e.g. due to filtering).
        // Use the parent of this instance instead since we treat async info
        // attached to a Suspense boundary as that async info triggering the
        // fallback of that boundary.
        const parent = parentInstance.parent;
        if (parent === null) {
          // This shouldn't happen. Any <Suspense> would have at least have the
          // host root as the parent which can't have a fallback.
          throw new Error(
            'Did not find a suitable instance for this async info. This is a bug in React.',
          );
        }
        parentInstance = parent;
      }
    }

    const suspenseNodeSuspendedBy = parentSuspenseNode.suspendedBy;
    const ioInfo = asyncInfo.awaited;
    let suspendedBySet = suspenseNodeSuspendedBy.get(ioInfo);
    if (suspendedBySet === undefined) {
      suspendedBySet = new Set();
      suspenseNodeSuspendedBy.set(ioInfo, suspendedBySet);
      // We've added a dependency. We must increment the ref count of the environment.
      const env = ioInfo.env;
      if (env != null) {
        const environmentCounts = parentSuspenseNode.environments;
        const count = environmentCounts.get(env);
        if (count === undefined || count === 0) {
          environmentCounts.set(env, 1);
          // We've discovered a new environment for this SuspenseNode. We'll to update the node.
          recordSuspenseSuspenders(parentSuspenseNode);
        } else {
          environmentCounts.set(env, count + 1);
        }
      }
    }
    // The child of the Suspense boundary that was suspended on this, or null if suspended at the root.
    // This is used to keep track of how many dependents are still alive and also to get information
    // like owner instances to link down into the tree.
    if (!suspendedBySet.has(parentInstance)) {
      suspendedBySet.add(parentInstance);
      const virtualEndTime = getVirtualEndTime(ioInfo);
      if (
        !parentSuspenseNode.hasUniqueSuspenders &&
        !ioExistsInSuspenseAncestor(parentSuspenseNode, ioInfo)
      ) {
        // This didn't exist in the parent before, so let's mark this boundary as having a unique suspender.
        parentSuspenseNode.hasUniqueSuspenders = true;
        if (parentSuspenseNode.endTime < virtualEndTime) {
          parentSuspenseNode.endTime = virtualEndTime;
        }
        recordSuspenseSuspenders(parentSuspenseNode);
      } else if (parentSuspenseNode.endTime < virtualEndTime) {
        parentSuspenseNode.endTime = virtualEndTime;
        recordSuspenseSuspenders(parentSuspenseNode);
      }
    }
    // We have observed at least one known reason this might have been suspended.
    parentSuspenseNode.hasUnknownSuspenders = false;
    // Suspending right below the root is not attributed to any particular component in UI
    // other than the SuspenseNode and the HostRoot's FiberInstance.
    const suspendedBy = parentInstance.suspendedBy;
    if (suspendedBy === null) {
      parentInstance.suspendedBy = [asyncInfo];
    } else if (suspendedBy.indexOf(asyncInfo) === -1) {
      suspendedBy.push(asyncInfo);
    }
  }

  function unblockSuspendedBy(
    parentSuspenseNode: SuspenseNode,
    ioInfo: ReactIOInfo,
  ): void {
    const firstChild = parentSuspenseNode.firstChild;
    if (firstChild === null) {
      return;
    }
    let node: SuspenseNode = firstChild;
    // $FlowFixMe[invalid-compare]
    while (node !== null) {
      if (node.suspendedBy.has(ioInfo)) {
        // We have found a child boundary that depended on the unblocked I/O.
        // It can now be marked as having unique suspenders. We can skip its children
        // since they'll still be blocked by this one.
        if (!node.hasUniqueSuspenders) {
          recordSuspenseSuspenders(node);
        }
        node.hasUniqueSuspenders = true;
        node.hasUnknownSuspenders = false;
      } else if (node.firstChild !== null) {
        node = node.firstChild;
        continue;
      }
      while (node.nextSibling === null) {
        if (node.parent === null || node.parent === parentSuspenseNode) {
          return;
        }
        node = node.parent;
      }
      node = node.nextSibling;
    }
  }

  function computeEndTime(suspenseNode: SuspenseNode) {
    let maxEndTime = 0;
    suspenseNode.suspendedBy.forEach((set, ioInfo) => {
      const virtualEndTime = getVirtualEndTime(ioInfo);
      if (virtualEndTime > maxEndTime) {
        maxEndTime = virtualEndTime;
      }
    });
    return maxEndTime;
  }

  function removePreviousSuspendedBy(
    instance: DevToolsInstance,
    previousSuspendedBy: null | Array<ReactAsyncInfo>,
    parentSuspenseNode: null | SuspenseNode,
  ): void {
    // Remove any async info if they were in the previous set but
    // is no longer in the new set.
    // If we just reconciled a SuspenseNode, we need to remove from that node instead of the parent.
    // This is different from inserting because inserting is done during reconiliation
    // whereas removal is done after we're done reconciling.
    const suspenseNode =
      instance.suspenseNode === null
        ? parentSuspenseNode
        : instance.suspenseNode;
    if (previousSuspendedBy !== null && suspenseNode !== null) {
      const nextSuspendedBy = instance.suspendedBy;
      let changedEnvironment = false;
      let mayHaveChangedEndTime = false;
      for (let i = 0; i < previousSuspendedBy.length; i++) {
        const asyncInfo = previousSuspendedBy[i];
        if (
          nextSuspendedBy === null ||
          (nextSuspendedBy.indexOf(asyncInfo) === -1 &&
            getAwaitInSuspendedByFromIO(nextSuspendedBy, asyncInfo.awaited) ===
              null)
        ) {
          // This IO entry is no longer blocking the current tree.
          // Let's remove it from the parent SuspenseNode.
          const ioInfo = asyncInfo.awaited;
          const suspendedBySet = suspenseNode.suspendedBy.get(ioInfo);

          if (suspenseNode.endTime === getVirtualEndTime(ioInfo)) {
            // This may be the only remaining entry at this end time. Recompute the end time.
            mayHaveChangedEndTime = true;
          }

          if (
            suspendedBySet === undefined ||
            !suspendedBySet.delete(instance)
          ) {
            // A boundary can await the same IO multiple times.
            // We still want to error if we're trying to remove IO that isn't present on
            // this boundary so we need to check if we've already removed it.
            // We're assuming previousSuspendedBy is a small array so this should be faster
            // than allocating and maintaining a Set.
            let alreadyRemovedIO = false;
            for (let j = 0; j < i; j++) {
              const removedIOInfo = previousSuspendedBy[j].awaited;
              if (removedIOInfo === ioInfo) {
                alreadyRemovedIO = true;
                break;
              }
            }
            if (!alreadyRemovedIO) {
              throw new Error(
                'We are cleaning up async info that was not on the parent Suspense boundary. ' +
                  'This is a bug in React.',
              );
            }
          }
          if (suspendedBySet !== undefined && suspendedBySet.size === 0) {
            suspenseNode.suspendedBy.delete(ioInfo);
            // Successfully removed all dependencies. We can decrement the ref count of the environment.
            const env = ioInfo.env;
            if (env != null) {
              const environmentCounts = suspenseNode.environments;
              const count = environmentCounts.get(env);
              if (count === undefined || count === 0) {
                throw new Error(
                  'We are removing an environment but it was not in the set. ' +
                    'This is a bug in React.',
                );
              }
              if (count === 1) {
                environmentCounts.delete(env);
                // Last one. We've now change the set of environments. We'll need to update the node.
                changedEnvironment = true;
              } else {
                environmentCounts.set(env, count - 1);
              }
            }

            if (
              suspenseNode.hasUniqueSuspenders &&
              !ioExistsInSuspenseAncestor(suspenseNode, ioInfo)
            ) {
              // This entry wasn't in any ancestor and is no longer in this suspense boundary.
              // This means that a child might now be the unique suspender for this IO.
              // Search the child boundaries to see if we can reveal any of them.
              unblockSuspendedBy(suspenseNode, ioInfo);
            }
          }
        }
      }
      const newEndTime = mayHaveChangedEndTime
        ? computeEndTime(suspenseNode)
        : suspenseNode.endTime;
      if (changedEnvironment || newEndTime !== suspenseNode.endTime) {
        suspenseNode.endTime = newEndTime;
        recordSuspenseSuspenders(suspenseNode);
      }
    }
  }

  function insertChild(instance: DevToolsInstance): void {
    const parentInstance = reconcilingParent;
    if (parentInstance === null) {
      // This instance is at the root.
      return;
    }
    // Place it in the parent.
    instance.parent = parentInstance;
    if (previouslyReconciledSibling === null) {
      previouslyReconciledSibling = instance;
      parentInstance.firstChild = instance;
    } else {
      previouslyReconciledSibling.nextSibling = instance;
      previouslyReconciledSibling = instance;
    }
    instance.nextSibling = null;
    // Insert any SuspenseNode into its parent Node.
    const suspenseNode = instance.suspenseNode;
    if (suspenseNode !== null) {
      const parentNode = reconcilingParentSuspenseNode;
      if (parentNode !== null) {
        suspenseNode.parent = parentNode;
        if (previouslyReconciledSiblingSuspenseNode === null) {
          previouslyReconciledSiblingSuspenseNode = suspenseNode;
          parentNode.firstChild = suspenseNode;
        } else {
          previouslyReconciledSiblingSuspenseNode.nextSibling = suspenseNode;
          previouslyReconciledSiblingSuspenseNode = suspenseNode;
        }
        suspenseNode.nextSibling = null;
      }
    }
  }

  function moveChild(
    instance: DevToolsInstance,
    previousSibling: null | DevToolsInstance,
  ): void {
    removeChild(instance, previousSibling);
    insertChild(instance);
  }

  function removeChild(
    instance: DevToolsInstance,
    previousSibling: null | DevToolsInstance,
  ): void {
    if (instance.parent === null) {
      if (remainingReconcilingChildren === instance) {
        throw new Error(
          'Remaining children should not have items with no parent',
        );
      } else if (instance.nextSibling !== null) {
        throw new Error('A deleted instance should not have next siblings');
      }
      // Already deleted.
      return;
    }
    const parentInstance = reconcilingParent;
    if (parentInstance === null) {
      throw new Error('Should not have a parent if we are at the root');
    }
    if (instance.parent !== parentInstance) {
      throw new Error(
        'Cannot remove a node from a different parent than is being reconciled.',
      );
    }
    // Remove an existing child from its current position, which we assume is in the
    // remainingReconcilingChildren set.
    if (previousSibling === null) {
      // We're first in the remaining set. Remove us.
      if (remainingReconcilingChildren !== instance) {
        throw new Error(
          'Expected a placed child to be moved from the remaining set.',
        );
      }
      remainingReconcilingChildren = instance.nextSibling;
    } else {
      previousSibling.nextSibling = instance.nextSibling;
    }
    instance.nextSibling = null;
    instance.parent = null;

    // Remove any SuspenseNode from its parent.
    const suspenseNode = instance.suspenseNode;
    if (suspenseNode !== null && suspenseNode.parent !== null) {
      const parentNode = reconcilingParentSuspenseNode;
      if (parentNode === null) {
        throw new Error('Should not have a parent if we are at the root');
      }
      if (suspenseNode.parent !== parentNode) {
        throw new Error(
          'Cannot remove a Suspense node from a different parent than is being reconciled.',
        );
      }
      let previousSuspenseSibling = remainingReconcilingChildrenSuspenseNodes;
      if (previousSuspenseSibling === suspenseNode) {
        // We're first in the remaining set. Remove us.
        remainingReconcilingChildrenSuspenseNodes = suspenseNode.nextSibling;
      } else {
        // Search for our previous sibling and remove us.
        while (previousSuspenseSibling !== null) {
          if (previousSuspenseSibling.nextSibling === suspenseNode) {
            previousSuspenseSibling.nextSibling = suspenseNode.nextSibling;
            break;
          }
          previousSuspenseSibling = previousSuspenseSibling.nextSibling;
        }
      }
      suspenseNode.nextSibling = null;
      suspenseNode.parent = null;
    }
  }

  function isHiddenOffscreen(fiber: Fiber): boolean {
    switch (fiber.tag) {
      case LegacyHiddenComponent:
      // fallthrough since all published implementations currently implement the same state as Offscreen.
      case OffscreenComponent:
        return fiber.memoizedState !== null;
      default:
        return false;
    }
  }

  // Returns true if this is a hidden OffscreenComponent that belongs to
  // an Activity boundary (as opposed to Suspense). Activity's children
  // should remain visible in the DevTools tree even when hidden.
  function isActivityHiddenOffscreen(fiber: Fiber): boolean {
    return (
      isHiddenOffscreen(fiber) &&
      fiber.return !== null &&
      fiber.return.tag === ActivityComponent
    );
  }

  /**
   * Offscreen of suspended Suspense
   */
  function isSuspendedOffscreen(fiber: Fiber): boolean {
    switch (fiber.tag) {
      case LegacyHiddenComponent:
      // fallthrough since all published implementations currently implement the same state as Offscreen.
      case OffscreenComponent:
        return (
          fiber.memoizedState !== null &&
          fiber.return !== null &&
          fiber.return.tag === SuspenseComponent
        );
      default:
        return false;
    }
  }

  function unmountRemainingChildren() {
    if (
      reconcilingParent !== null &&
      (reconcilingParent.kind === FIBER_INSTANCE ||
        reconcilingParent.kind === FILTERED_FIBER_INSTANCE) &&
      isSuspendedOffscreen(reconcilingParent.data) &&
      !isInDisconnectedSubtree
    ) {
      // This is a hidden offscreen, we need to execute this in the context of a disconnected subtree.
      isInDisconnectedSubtree = true;
      try {
        let child = remainingReconcilingChildren;
        while (child !== null) {
          unmountInstanceRecursively(child);
          child = remainingReconcilingChildren;
        }
      } finally {
        isInDisconnectedSubtree = false;
      }
    } else {
      let child = remainingReconcilingChildren;
      while (child !== null) {
        unmountInstanceRecursively(child);
        child = remainingReconcilingChildren;
      }
    }
  }

  function unmountSuspenseChildrenRecursively(
    contentInstance: DevToolsInstance,
    stashedSuspenseParent: null | SuspenseNode,
    stashedSuspensePrevious: null | SuspenseNode,
    stashedSuspenseRemaining: null | SuspenseNode,
  ): void {
    // First unmount only the Offscreen boundary. I.e. the main content.
    unmountInstanceRecursively(contentInstance);

    // Next, we'll pop back out of the SuspenseNode that we added above and now we'll
    // unmount the fallback, unmounting anything in the context of the parent SuspenseNode.
    // Since the fallback conceptually blocks the parent.
    reconcilingParentSuspenseNode = stashedSuspenseParent;
    previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
    remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
    unmountRemainingChildren();
  }

  function isChildOf(
    parentInstance: DevToolsInstance,
    childInstance: DevToolsInstance,
    grandParent: DevToolsInstance,
  ): boolean {
    let instance = childInstance.parent;
    while (instance !== null) {
      if (parentInstance === instance) {
        return true;
      }
      if (instance === parentInstance.parent || instance === grandParent) {
        // This was a sibling but not inside the FiberInstance. We can bail out.
        break;
      }
      instance = instance.parent;
    }
    return false;
  }

  function measureUnchangedSuspenseNodesRecursively(
    suspenseNode: SuspenseNode,
  ): void {
    if (isInDisconnectedSubtree) {
      // We don't update rects inside disconnected subtrees.
      return;
    }
    const instance = suspenseNode.instance;

    const isSuspendedSuspenseComponent =
      (instance.kind === FIBER_INSTANCE ||
        instance.kind === FILTERED_FIBER_INSTANCE) &&
      instance.data.tag === SuspenseComponent &&
      instance.data.memoizedState !== null;
    if (isSuspendedSuspenseComponent) {
      // This boundary itself was suspended and we don't measure those since that would measure
      // the fallback. We want to keep a ghost of the rectangle of the content not currently shown.
      return;
    }

    // While this boundary wasn't suspended and the bailed out root and wasn't in a disconnected subtree,
    // it's possible that this node was in one. So we need to check if we're offscreen.
    let parent = instance.parent;
    while (parent !== null) {
      if (
        (parent.kind === FIBER_INSTANCE ||
          parent.kind === FILTERED_FIBER_INSTANCE) &&
        isHiddenOffscreen(parent.data)
      ) {
        // We're inside a hidden offscreen Fiber. We're in a disconnected tree.
        return;
      }
      if (parent.suspenseNode !== null) {
        // Found our parent SuspenseNode. We can bail out now.
        break;
      }
      parent = parent.parent;
    }

    const nextRects = measureInstance(suspenseNode.instance);
    const prevRects = suspenseNode.rects;
    if (areEqualRects(prevRects, nextRects)) {
      return; // Unchanged
    }

    // We changed inside a visible tree.
    // Since this boundary changed, it's possible it also affected its children so lets
    // measure them as well.
    for (
      let child = suspenseNode.firstChild;
      child !== null;
      child = child.nextSibling
    ) {
      measureUnchangedSuspenseNodesRecursively(child);
    }
    suspenseNode.rects = nextRects;
    recordSuspenseResize(suspenseNode);
  }

  function consumeSuspenseNodesOfExistingInstance(
    instance: DevToolsInstance,
  ): void {
    // We need to also consume any unchanged Suspense boundaries.
    let suspenseNode = remainingReconcilingChildrenSuspenseNodes;
    if (suspenseNode === null) {
      return;
    }
    const parentSuspenseNode = reconcilingParentSuspenseNode;
    if (parentSuspenseNode === null) {
      throw new Error(
        'The should not be any remaining suspense node children if there is no parent.',
      );
    }
    let foundOne = false;
    let previousSkippedSibling = null;
    while (suspenseNode !== null) {
      // Check if this SuspenseNode was a child of the bailed out FiberInstance.
      if (
        isChildOf(instance, suspenseNode.instance, parentSuspenseNode.instance)
      ) {
        foundOne = true;
        // The suspenseNode was child of the bailed out Fiber.
        // First, remove it from the remaining children set.
        const nextRemainingSibling = suspenseNode.nextSibling;
        if (previousSkippedSibling === null) {
          remainingReconcilingChildrenSuspenseNodes = nextRemainingSibling;
        } else {
          previousSkippedSibling.nextSibling = nextRemainingSibling;
        }
        suspenseNode.nextSibling = null;
        // Then, re-insert it into the newly reconciled set.
        if (previouslyReconciledSiblingSuspenseNode === null) {
          parentSuspenseNode.firstChild = suspenseNode;
        } else {
          previouslyReconciledSiblingSuspenseNode.nextSibling = suspenseNode;
        }
        previouslyReconciledSiblingSuspenseNode = suspenseNode;
        // While React didn't rerender this node, it's possible that it was affected by
        // layout due to mutation of a parent or sibling. Check if it changed size.
        measureUnchangedSuspenseNodesRecursively(suspenseNode);
        // Continue
        suspenseNode = nextRemainingSibling;
      } else if (foundOne) {
        // If we found one and then hit a miss, we assume that we're passed the sequence because
        // they should've all been consecutive.
        break;
      } else {
        previousSkippedSibling = suspenseNode;
        suspenseNode = suspenseNode.nextSibling;
      }
    }
  }

  function mountVirtualInstanceRecursively(
    virtualInstance: VirtualInstance,
    firstChild: Fiber,
    lastChild: null | Fiber, // non-inclusive
    traceNearestHostComponentUpdate: boolean,
    virtualLevel: number, // the nth level of virtual instances
  ): void {
    // If we have the tree selection from previous reload, try to match this Instance.
    // Also remember whether to do the same for siblings.
    const mightSiblingsBeOnTrackedPath =
      updateVirtualTrackedPathStateBeforeMount(
        virtualInstance,
        reconcilingParent,
      );

    const stashedParent = reconcilingParent;
    const stashedPrevious = previouslyReconciledSibling;
    const stashedRemaining = remainingReconcilingChildren;
    // Push a new DevTools instance parent while reconciling this subtree.
    reconcilingParent = virtualInstance;
    previouslyReconciledSibling = null;
    remainingReconcilingChildren = null;
    try {
      mountVirtualChildrenRecursively(
        firstChild,
        lastChild,
        traceNearestHostComponentUpdate,
        virtualLevel + 1,
      );
      // Must be called after all children have been appended.
      recordVirtualProfilingDurations(virtualInstance);
    } finally {
      reconcilingParent = stashedParent;
      previouslyReconciledSibling = stashedPrevious;
      remainingReconcilingChildren = stashedRemaining;
      updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath);
    }
  }

  function recordVirtualUnmount(instance: VirtualInstance) {
    recordVirtualDisconnect(instance);
    idToDevToolsInstanceMap.delete(instance.id);
  }

  function recordVirtualDisconnect(instance: VirtualInstance) {
    if (isInDisconnectedSubtree) {
      return;
    }
    if (trackedPathMatchInstance === instance) {
      // We're in the process of trying to restore previous selection.
      // If this fiber matched but is being unmounted, there's no use trying.
      // Reset the state so we don't keep holding onto it.
      setTrackedPath(null);
    }

    const id = instance.id;
    pendingRealUnmountedIDs.push(id);
  }

  function trackDebugInfoFromLazyType(fiber: Fiber): void {
    // The debugInfo from a Lazy isn't propagated onto _debugInfo of the parent Fiber the way
    // it is when used in child position. So we need to pick it up explicitly.
    const type = fiber.elementType;
    const typeSymbol = getTypeSymbol(type); // The elementType might be have been a LazyComponent.
    if (typeSymbol === LAZY_SYMBOL_STRING) {
      const debugInfo: ?ReactDebugInfo = type._debugInfo;
      if (debugInfo) {
        for (let i = 0; i < debugInfo.length; i++) {
          const debugEntry = debugInfo[i];
          if (debugEntry.awaited) {
            const asyncInfo: ReactAsyncInfo = debugEntry as any;
            insertSuspendedBy(asyncInfo);
          }
        }
      }
    }
  }

  function trackDebugInfoFromUsedThenables(fiber: Fiber): void {
    // If a Fiber called use() in DEV mode then we may have collected _debugThenableState on
    // the dependencies. If so, then this will contain the thenables passed to use().
    // These won't have their debug info picked up by fiber._debugInfo since that just
    // contains things suspending the children. We have to collect use() separately.
    const dependencies = fiber.dependencies;
    if (dependencies == null) {
      return;
    }
    const thenableState = dependencies._debugThenableState;
    if (thenableState == null) {
      return;
    }
    // In DEV the thenableState is an inner object.
    const usedThenables: any = thenableState.thenables || thenableState;
    if (!Array.isArray(usedThenables)) {
      return;
    }
    for (let i = 0; i < usedThenables.length; i++) {
      const thenable: Thenable<mixed> = usedThenables[i];
      const debugInfo = thenable._debugInfo;
      if (debugInfo) {
        for (let j = 0; j < debugInfo.length; j++) {
          const debugEntry = debugInfo[j];
          if (debugEntry.awaited) {
            const asyncInfo: ReactAsyncInfo = debugEntry as any;
            insertSuspendedBy(asyncInfo);
          }
        }
      }
    }
  }

  const hostAsyncInfoCache: WeakMap<{...}, ReactAsyncInfo> = new WeakMap();

  function trackDebugInfoFromHostResource(
    devtoolsInstance: DevToolsInstance,
    fiber: Fiber,
  ): void {
    const resource: ?{
      type: 'stylesheet' | 'style' | 'script' | 'void',
      instance?: null | HostInstance,
      ...
    } = fiber.memoizedState;
    if (resource == null) {
      return;
    }

    // Use a cached entry based on the resource. This ensures that if we use the same
    // resource in multiple places, it gets deduped and inner boundaries don't consider it
    // as contributing to those boundaries.
    const existingEntry = hostAsyncInfoCache.get(resource);
    if (existingEntry !== undefined) {
      insertSuspendedBy(existingEntry);
      return;
    }

    const props: {
      href?: string,
      media?: string,
      ...
    } = fiber.memoizedProps;

    // Stylesheet resources may suspend. We need to track that.
    const mayResourceSuspendCommit =
      resource.type === 'stylesheet' &&
      // If it doesn't match the currently debugged media, then it doesn't count.
      (typeof props.media !== 'string' ||
        typeof matchMedia !== 'function' ||
        matchMedia(props.media));
    if (!mayResourceSuspendCommit) {
      return;
    }

    const instance = resource.instance;
    if (instance == null) {
      return;
    }

    // Unlike props.href, this href will be fully qualified which we need for comparison below.
    const href = instance.href;
    if (typeof href !== 'string') {
      return;
    }
    let start = -1;
    let end = -1;
    let byteSize = 0;
    // $FlowFixMe[method-unbinding]
    if (typeof performance.getEntriesByType === 'function') {
      // We may be able to collect the start and end time of this resource from Performance Observer.
      const resourceEntries = performance.getEntriesByType('resource');
      for (let i = 0; i < resourceEntries.length; i++) {
        const resourceEntry = resourceEntries[i];
        if (resourceEntry.name === href) {
          start = resourceEntry.startTime;
          end = start + resourceEntry.duration;
          // $FlowFixMe[prop-missing]
          byteSize = (resourceEntry.transferSize as any) || 0;
        }
      }
    }
    const value = instance.sheet;
    const promise = Promise.resolve(value);
    (promise as any).status = 'fulfilled';
    (promise as any).value = value;
    const ioInfo: ReactIOInfo = {
      name: 'stylesheet',
      start,
      end,
      value: promise,
      // $FlowFixMe[incompatible-type]: This field doesn't usually take a Fiber but we're only using inside this file.
      owner: fiber, // Allow linking to the <link> if it's not filtered.
    };
    if (byteSize > 0) {
      // $FlowFixMe[cannot-write]
      ioInfo.byteSize = byteSize;
    }
    const asyncInfo: ReactAsyncInfo = {
      awaited: ioInfo,
      // $FlowFixMe[incompatible-type]: This field doesn't usually take a Fiber but we're only using inside this file.
      owner: fiber._debugOwner == null ? null : fiber._debugOwner,
      debugStack: fiber._debugStack == null ? null : fiber._debugStack,
      debugTask: fiber._debugTask == null ? null : fiber._debugTask,
    };
    hostAsyncInfoCache.set(resource, asyncInfo);
    insertSuspendedBy(asyncInfo);
  }

  function trackDebugInfoFromHostComponent(
    devtoolsInstance: DevToolsInstance,
    fiber: Fiber,
  ): void {
    if (fiber.tag !== HostComponent) {
      return;
    }
    if ((fiber.mode & SuspenseyImagesMode) === 0) {
      // In any released version, Suspensey Images are only enabled inside a ViewTransition
      // subtree, which is enabled by the SuspenseyImagesMode.
      // TODO: If we ever enable the enableSuspenseyImages flag then it would be enabled for
      // all images and we'd need some other check for if the version of React has that enabled.
      return;
    }

    const type = fiber.type;
    const props: {
      src?: string,
      onLoad?: (event: any) => void,
      loading?: 'eager' | 'lazy',
      ...
    } = fiber.memoizedProps;

    const maySuspendCommit =
      type === 'img' &&
      props.src != null &&
      props.src !== '' &&
      props.onLoad == null &&
      props.loading !== 'lazy';

    // Note: We don't track "maySuspendCommitOnUpdate" separately because it doesn't matter if
    // it didn't suspend this particular update if it would've suspended if it mounted in this
    // state, since we're tracking the dependencies inside the current state.

    if (!maySuspendCommit) {
      return;
    }

    const instance = fiber.stateNode;
    if (instance == null) {
      // Should never happen.
      return;
    }

    // Unlike props.src, currentSrc will be fully qualified which we need for comparison below.
    // Unlike instance.src it will be resolved into the media queries currently matching which is
    // the state we're inspecting.
    const src = instance.currentSrc;
    if (typeof src !== 'string' || src === '') {
      return;
    }
    let start = -1;
    let end = -1;
    let byteSize = 0;
    let fileSize = 0;
    // $FlowFixMe[method-unbinding]
    if (typeof performance.getEntriesByType === 'function') {
      // We may be able to collect the start and end time of this resource from Performance Observer.
      const resourceEntries = performance.getEntriesByType('resource');
      for (let i = 0; i < resourceEntries.length; i++) {
        const resourceEntry = resourceEntries[i];
        if (resourceEntry.name === src) {
          start = resourceEntry.startTime;
          end = start + resourceEntry.duration;
          // $FlowFixMe[prop-missing]
          fileSize = (resourceEntry.decodedBodySize as any) || 0;
          // $FlowFixMe[prop-missing]
          byteSize = (resourceEntry.transferSize as any) || 0;
        }
      }
    }
    // A representation of the image data itself.
    // TODO: We could render a little preview in the front end from the resource API.
    const value: {
      currentSrc: string,
      naturalWidth?: number,
      naturalHeight?: number,
      fileSize?: number,
    } = {
      currentSrc: src,
    };
    if (instance.naturalWidth > 0 && instance.naturalHeight > 0) {
      // The intrinsic size of the file value itself, if it's loaded
      value.naturalWidth = instance.naturalWidth;
      value.naturalHeight = instance.naturalHeight;
    }
    if (fileSize > 0) {
      // Cross-origin images won't have a file size that we can access.
      value.fileSize = fileSize;
    }
    const promise = Promise.resolve(value);
    (promise as any).status = 'fulfilled';
    (promise as any).value = value;
    const ioInfo: ReactIOInfo = {
      name: 'img',
      start,
      end,
      value: promise,
      // $FlowFixMe[incompatible-type]: This field doesn't usually take a Fiber but we're only using inside this file.
      owner: fiber, // Allow linking to the <link> if it's not filtered.
    };
    if (byteSize > 0) {
      // $FlowFixMe[cannot-write]
      ioInfo.byteSize = byteSize;
    }
    const asyncInfo: ReactAsyncInfo = {
      awaited: ioInfo,
      // $FlowFixMe[incompatible-type]: This field doesn't usually take a Fiber but we're only using inside this file.
      owner: fiber._debugOwner == null ? null : fiber._debugOwner,
      debugStack: fiber._debugStack == null ? null : fiber._debugStack,
      debugTask: fiber._debugTask == null ? null : fiber._debugTask,
    };
    insertSuspendedBy(asyncInfo);
  }

  function trackThrownPromisesFromRetryCache(
    suspenseNode: SuspenseNode,
    retryCache: ?WeakSet<Wakeable>,
  ): void {
    if (retryCache != null) {
      // If a Suspense boundary ever committed in fallback state with a retryCache, that
      // suggests that something unique to that boundary was suspensey since otherwise
      // it wouldn't have thrown and so never created the retryCache.
      // Unfortunately if we don't have any DEV time debug info or debug thenables then
      // we have no meta data to show. However, we still mark this Suspense boundary as
      // participating in the loading sequence since apparently it can suspend.
      if (!suspenseNode.hasUniqueSuspenders) {
        recordSuspenseSuspenders(suspenseNode);
      }
      suspenseNode.hasUniqueSuspenders = true;
      // We have not seen any reason yet for why this suspense node might have been
      // suspended but it clearly has been at some point. If we later discover a reason
      // we'll clear this flag again.
      suspenseNode.hasUnknownSuspenders = true;
    }
  }

  function mountVirtualChildrenRecursively(
    firstChild: Fiber,
    lastChild: null | Fiber, // non-inclusive
    traceNearestHostComponentUpdate: boolean,
    virtualLevel: number, // the nth level of virtual instances
  ): void {
    // Iterate over siblings rather than recursing.
    // This reduces the chance of stack overflow for wide trees (e.g. lists with many items).
    let fiber: Fiber | null = firstChild;
    let previousVirtualInstance: null | VirtualInstance = null;
    let previousVirtualInstanceFirstFiber: Fiber = firstChild;
    while (fiber !== null && fiber !== lastChild) {
      let level = 0;
      if (fiber._debugInfo) {
        for (let i = 0; i < fiber._debugInfo.length; i++) {
          const debugEntry = fiber._debugInfo[i];
          if (debugEntry.awaited) {
            // Async Info
            const asyncInfo: ReactAsyncInfo = debugEntry as any;
            if (level === virtualLevel) {
              // Track any async info between the previous virtual instance up until to this
              // instance and add it to the parent. This can add the same set multiple times
              // so we assume insertSuspendedBy dedupes.
              insertSuspendedBy(asyncInfo);
            }
            continue;
          }
          if (typeof debugEntry.name !== 'string') {
            // Not a Component. Some other Debug Info.
            continue;
          }
          // Scan up until the next Component to see if this component changed environment.
          const componentInfo: ReactComponentInfo = debugEntry as any;
          const secondaryEnv = getSecondaryEnvironmentName(fiber._debugInfo, i);
          if (componentInfo.env != null) {
            knownEnvironmentNames.add(componentInfo.env);
          }
          if (secondaryEnv !== null) {
            knownEnvironmentNames.add(secondaryEnv);
          }
          if (shouldFilterVirtual(componentInfo, secondaryEnv)) {
            // Skip.
            continue;
          }
          if (level === virtualLevel) {
            if (
              previousVirtualInstance === null ||
              // Consecutive children with the same debug entry as a parent gets
              // treated as if they share the same virtual instance.
              previousVirtualInstance.data !== debugEntry
            ) {
              if (previousVirtualInstance !== null) {
                // Mount any previous children that should go into the previous parent.
                mountVirtualInstanceRecursively(
                  previousVirtualInstance,
                  previousVirtualInstanceFirstFiber,
                  fiber,
                  traceNearestHostComponentUpdate,
                  virtualLevel,
                );
              }
              previousVirtualInstance = createVirtualInstance(componentInfo);
              recordVirtualMount(
                previousVirtualInstance,
                reconcilingParent,
                secondaryEnv,
              );
              insertChild(previousVirtualInstance);
              previousVirtualInstanceFirstFiber = fiber;
            }
            level++;
            break;
          } else {
            level++;
          }
        }
      }
      if (level === virtualLevel) {
        if (previousVirtualInstance !== null) {
          // If we were working on a virtual instance and this is not a virtual
          // instance, then we end the sequence and mount any previous children
          // that should go into the previous virtual instance.
          mountVirtualInstanceRecursively(
            previousVirtualInstance,
            previousVirtualInstanceFirstFiber,
            fiber,
            traceNearestHostComponentUpdate,
            virtualLevel,
          );
          previousVirtualInstance = null;
        }
        // We've reached the end of the virtual levels, but not beyond,
        // and now continue with the regular fiber.
        mountFiberRecursively(fiber, traceNearestHostComponentUpdate);
      }
      fiber = fiber.sibling;
    }
    if (previousVirtualInstance !== null) {
      // Mount any previous children that should go into the previous parent.
      mountVirtualInstanceRecursively(
        previousVirtualInstance,
        previousVirtualInstanceFirstFiber,
        null,
        traceNearestHostComponentUpdate,
        virtualLevel,
      );
    }
  }

  function mountChildrenRecursively(
    firstChild: Fiber,
    traceNearestHostComponentUpdate: boolean,
  ): void {
    mountVirtualChildrenRecursively(
      firstChild,
      null,
      traceNearestHostComponentUpdate,
      0, // first level
    );
  }

  function mountSuspenseChildrenRecursively(
    contentFiber: Fiber,
    traceNearestHostComponentUpdate: boolean,
    stashedSuspenseParent: SuspenseNode | null,
    stashedSuspensePrevious: SuspenseNode | null,
    stashedSuspenseRemaining: SuspenseNode | null,
  ) {
    const fallbackFiber = contentFiber.sibling;

    // First update only the Offscreen boundary. I.e. the main content.
    mountVirtualChildrenRecursively(
      contentFiber,
      fallbackFiber,
      traceNearestHostComponentUpdate,
      0, // first level
    );

    // Next, we'll pop back out of the SuspenseNode that we added above and now we'll
    // reconcile the fallback, reconciling anything by inserting into the parent SuspenseNode.
    // Since the fallback conceptually blocks the parent.
    reconcilingParentSuspenseNode = stashedSuspenseParent;
    previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
    remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
    if (fallbackFiber !== null) {
      mountVirtualChildrenRecursively(
        fallbackFiber,
        null,
        traceNearestHostComponentUpdate,
        0, // first level
      );
    }
  }

  function mountFiberRecursively(
    fiber: Fiber,
    traceNearestHostComponentUpdate: boolean,
  ): void {
    const isFocusedActivityEntry =
      focusedActivity !== null &&
      (fiber === focusedActivity || fiber.alternate === focusedActivity);
    if (isFocusedActivityEntry) {
      isInFocusedActivity = true;
    }

    const shouldIncludeInTree = !shouldFilterFiber(fiber);
    let newInstance = null;
    let newSuspenseNode = null;
    if (shouldIncludeInTree) {
      newInstance = recordMount(fiber, reconcilingParent);
      if (isFocusedActivityEntry) {
        focusedActivityID = newInstance.id;
        pushOperation(TREE_OPERATION_APPLIED_ACTIVITY_SLICE_CHANGE);
        pushOperation(newInstance.id);
      }
      if (fiber.tag === SuspenseComponent || fiber.tag === HostRoot) {
        newSuspenseNode = createSuspenseNode(newInstance);
        // Measure this Suspense node. In general we shouldn't do this until we have
        // inserted the new children but since we know this is a FiberInstance we'll
        // just use the Fiber anyway.
        // Fallbacks get attributed to the parent so we only measure if we're
        // showing primary content.
        if (fiber.tag === SuspenseComponent) {
          if (OffscreenComponent === -1) {
            const isTimedOut = fiber.memoizedState !== null;
            if (!isTimedOut) {
              newSuspenseNode.rects = measureInstance(newInstance);
            }
          } else {
            const hydrated = isFiberHydrated(fiber);
            if (hydrated) {
              const contentFiber = fiber.child;
              if (contentFiber === null) {
                throw new Error(
                  'There should always be an Offscreen Fiber child in a hydrated Suspense boundary.',
                );
              }
            } else {
              // This Suspense Fiber is still dehydrated. It won't have any children
              // until hydration.
            }
            const isTimedOut = fiber.memoizedState !== null;
            if (!isTimedOut) {
              newSuspenseNode.rects = measureInstance(newInstance);
            }
          }
        } else {
          newSuspenseNode.rects = measureInstance(newInstance);
        }
        recordSuspenseMount(newSuspenseNode, reconcilingParentSuspenseNode);
      }
      insertChild(newInstance);
      // $FlowFixMe[constant-condition]
      if (__DEBUG__) {
        debug('mountFiberRecursively()', newInstance, reconcilingParent);
      }
    } else if (
      (reconcilingParent !== null &&
        reconcilingParent.kind === VIRTUAL_INSTANCE) ||
      fiber.tag === SuspenseComponent ||
      // Use to keep resuspended instances alive inside a SuspenseComponent.
      fiber.tag === OffscreenComponent ||
      fiber.tag === LegacyHiddenComponent
    ) {
      // If the parent is a Virtual Instance and we filtered this Fiber we include a
      // hidden node. We also include this if it's a Suspense boundary so we can track those
      // in the Suspense tree.
      if (
        reconcilingParent !== null &&
        reconcilingParent.kind === VIRTUAL_INSTANCE &&
        reconcilingParent.data === fiber._debugOwner &&
        fiber._debugStack != null &&
        reconcilingParent.source === null
      ) {
        // The new Fiber is directly owned by the parent. Therefore somewhere on the
        // debugStack will be a stack frame inside parent that we can use as its soruce.
        reconcilingParent.source = fiber._debugStack;
      }

      newInstance = createFilteredFiberInstance(fiber);
      if (fiber.tag === SuspenseComponent) {
        newSuspenseNode = createSuspenseNode(newInstance);
        // Measure this Suspense node. In general we shouldn't do this until we have
        // inserted the new children but since we know this is a FiberInstance we'll
        // just use the Fiber anyway.
        // Fallbacks get attributed to the parent so we only measure if we're
        // showing primary content.
        if (OffscreenComponent === -1) {
          const isTimedOut = fiber.memoizedState !== null;
          if (!isTimedOut) {
            newSuspenseNode.rects = measureInstance(newInstance);
          }
        } else {
          const hydrated = isFiberHydrated(fiber);
          if (hydrated) {
            const contentFiber = fiber.child;
            if (contentFiber === null) {
              throw new Error(
                'There should always be an Offscreen Fiber child in a hydrated Suspense boundary.',
              );
            }
          } else {
            // This Suspense Fiber is still dehydrated. It won't have any children
            // until hydration.
          }
          const suspenseState = fiber.memoizedState;
          const isTimedOut = suspenseState !== null;
          if (!isTimedOut) {
            newSuspenseNode.rects = measureInstance(newInstance);
          }
        }
      }
      insertChild(newInstance);
      // $FlowFixMe[constant-condition]
      if (__DEBUG__) {
        debug('mountFiberRecursively()', newInstance, reconcilingParent);
      }
    }

    // If we have the tree selection from previous reload, try to match this Fiber.
    // Also remember whether to do the same for siblings.
    const mightSiblingsBeOnTrackedPath = updateTrackedPathStateBeforeMount(
      fiber,
      newInstance,
    );

    const stashedParent = reconcilingParent;
    const stashedPrevious = previouslyReconciledSibling;
    const stashedRemaining = remainingReconcilingChildren;
    const stashedSuspenseParent = reconcilingParentSuspenseNode;
    const stashedSuspensePrevious = previouslyReconciledSiblingSuspenseNode;
    const stashedSuspenseRemaining = remainingReconcilingChildrenSuspenseNodes;
    const stashedIsInActivitySlice = isInFocusedActivity;
    if (newInstance !== null) {
      // Push a new DevTools instance parent while reconciling this subtree.
      reconcilingParent = newInstance;
      previouslyReconciledSibling = null;
      remainingReconcilingChildren = null;
    }
    let shouldPopSuspenseNode = false;
    if (newSuspenseNode !== null) {
      reconcilingParentSuspenseNode = newSuspenseNode;
      previouslyReconciledSiblingSuspenseNode = null;
      remainingReconcilingChildrenSuspenseNodes = null;
      shouldPopSuspenseNode = true;
    }
    if (
      !isFocusedActivityEntry &&
      focusedActivity !== null &&
      fiber.tag === ActivityComponent
    ) {
      // We're not filtering how Activity within the focused activity.
      // We cut of the bottom in the Frontend if we want to just show the
      // Activity slice instead of all Activity descendants.
      // The filtering in the backend only happens because filtering out
      // everything above the focused Activity is hard to implement in the frontend.
    }
    try {
      if (traceUpdatesEnabled) {
        if (traceNearestHostComponentUpdate) {
          const elementType = getElementTypeForFiber(fiber);
          // If an ancestor updated, we should mark the nearest host nodes for highlighting.
          if (elementType === ElementTypeHostComponent) {
            traceUpdatesForNodes.add(fiber.stateNode);
            traceNearestHostComponentUpdate = false;
          }
        }

        // We intentionally do not re-enable the traceNearestHostComponentUpdate flag in this branch,
        // because we don't want to highlight every host node inside of a newly mounted subtree.
      }

      trackDebugInfoFromLazyType(fiber);
      trackDebugInfoFromUsedThenables(fiber);

      if (fiber.tag === HostHoistable) {
        const nearestInstance = reconcilingParent;
        if (nearestInstance === null) {
          throw new Error('Did not expect a host hoistable to be the root');
        }
        aquireHostResource(nearestInstance, fiber.memoizedState);
        trackDebugInfoFromHostResource(nearestInstance, fiber);
      } else if (
        fiber.tag === HostComponent ||
        fiber.tag === HostText ||
        fiber.tag === HostSingleton
      ) {
        const nearestInstance = reconcilingParent;
        if (nearestInstance === null) {
          throw new Error('Did not expect a host hoistable to be the root');
        }
        aquireHostInstance(nearestInstance, fiber.stateNode);
        trackDebugInfoFromHostComponent(nearestInstance, fiber);
      }

      if (isSuspendedOffscreen(fiber)) {
        // If an Offscreen component is hidden, mount its children as disconnected.
        const stashedDisconnected = isInDisconnectedSubtree;
        isInDisconnectedSubtree = true;
        try {
          if (fiber.child !== null) {
            mountChildrenRecursively(fiber.child, false);
          }
        } finally {
          isInDisconnectedSubtree = stashedDisconnected;
        }
      } else if (isHiddenOffscreen(fiber)) {
        if (isActivityHiddenOffscreen(fiber)) {
          // Activity's hidden children should still be visible in DevTools.
          if (fiber.child !== null) {
            mountChildrenRecursively(
              fiber.child,
              traceNearestHostComponentUpdate,
            );
          }
        }
        // Otherwise, hidden Offscreen (e.g. non-Activity) is noisy.
        // Including it may show overlapping Suspense rects
      } else if (fiber.tag === SuspenseComponent && OffscreenComponent === -1) {
        // Legacy Suspense without the Offscreen wrapper. For the modern Suspense we just handle the
        // Offscreen wrapper itself specially.
        if (newSuspenseNode !== null) {
          trackThrownPromisesFromRetryCache(newSuspenseNode, fiber.stateNode);
        }
        const isTimedOut = fiber.memoizedState !== null;
        if (isTimedOut) {
          // Special case: if Suspense mounts in a timed-out state,
          // get the fallback child from the inner fragment and mount
          // it as if it was our own child. Updates handle this too.
          const primaryChildFragment = fiber.child;
          const fallbackChildFragment = primaryChildFragment
            ? primaryChildFragment.sibling
            : null;
          if (fallbackChildFragment) {
            const fallbackChild = fallbackChildFragment.child;
            if (fallbackChild !== null) {
              updateTrackedPathStateBeforeMount(fallbackChildFragment, null);
              mountChildrenRecursively(
                fallbackChild,
                traceNearestHostComponentUpdate,
              );
            }
          }
          // TODO: Track SuspenseNode in resuspended trees.
        } else {
          const primaryChild: Fiber | null = fiber.child;
          if (primaryChild !== null) {
            mountChildrenRecursively(
              primaryChild,
              traceNearestHostComponentUpdate,
            );
          }
        }
      } else if (
        fiber.tag === SuspenseComponent &&
        OffscreenComponent !== -1 &&
        newInstance !== null &&
        newSuspenseNode !== null
      ) {
        // Modern Suspense path
        const contentFiber = fiber.child;
        const hydrated = isFiberHydrated(fiber);
        if (hydrated) {
          if (contentFiber === null) {
            throw new Error(
              'There should always be an Offscreen Fiber child in a hydrated Suspense boundary.',
            );
          }

          trackThrownPromisesFromRetryCache(newSuspenseNode, fiber.stateNode);

          mountSuspenseChildrenRecursively(
            contentFiber,
            traceNearestHostComponentUpdate,
            stashedSuspenseParent,
            stashedSuspensePrevious,
            stashedSuspenseRemaining,
          );
          // mountSuspenseChildrenRecursively popped already
          shouldPopSuspenseNode = false;
        } else {
          // This Suspense Fiber is still dehydrated. It won't have any children
          // until hydration.
        }
      } else {
        if (fiber.child !== null) {
          mountChildrenRecursively(
            fiber.child,
            traceNearestHostComponentUpdate,
          );
        }
      }
    } finally {
      isInFocusedActivity = stashedIsInActivitySlice;
      if (newInstance !== null) {
        reconcilingParent = stashedParent;
        previouslyReconciledSibling = stashedPrevious;
        remainingReconcilingChildren = stashedRemaining;
      }
      if (shouldPopSuspenseNode) {
        reconcilingParentSuspenseNode = stashedSuspenseParent;
        previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
        remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
      }
    }

    // We're exiting this Fiber now, and entering its siblings.
    // If we have selection to restore, we might need to re-activate tracking.
    updateTrackedPathStateAfterMount(mightSiblingsBeOnTrackedPath);
  }

  // We use this to simulate unmounting for Suspense trees
  // when we switch from primary to fallback, or deleting a subtree.
  function unmountInstanceRecursively(instance: DevToolsInstance) {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      debug('unmountInstanceRecursively()', instance, reconcilingParent);
    }

    let shouldPopSuspenseNode = false;
    const stashedParent = reconcilingParent;
    const stashedPrevious = previouslyReconciledSibling;
    const stashedRemaining = remainingReconcilingChildren;
    const stashedSuspenseParent = reconcilingParentSuspenseNode;
    const stashedSuspensePrevious = previouslyReconciledSiblingSuspenseNode;
    const stashedSuspenseRemaining = remainingReconcilingChildrenSuspenseNodes;
    const stashedIsInActivitySlice = isInFocusedActivity;
    const previousSuspendedBy = instance.suspendedBy;
    // Push a new DevTools instance parent while reconciling this subtree.
    reconcilingParent = instance;
    previouslyReconciledSibling = null;
    // Move all the children of this instance to the remaining set.
    remainingReconcilingChildren = instance.firstChild;
    instance.firstChild = null;
    instance.suspendedBy = null;

    if (instance.suspenseNode !== null) {
      reconcilingParentSuspenseNode = instance.suspenseNode;
      previouslyReconciledSiblingSuspenseNode = null;
      remainingReconcilingChildrenSuspenseNodes =
        instance.suspenseNode.firstChild;

      shouldPopSuspenseNode = true;
    }

    if (focusedActivity !== null) {
      if (instance.id === focusedActivityID) {
        isInFocusedActivity = true;
      } else if (
        instance.kind === FIBER_INSTANCE &&
        // $FlowFixMe[invalid-compare]
        instance.data !== null &&
        instance.data.tag === ActivityComponent
      ) {
        // Filtering nested Activity components inside the focused activity
        // is done in the frontend.
      }
    }

    try {
      // Unmount the remaining set.
      if (
        (instance.kind === FIBER_INSTANCE ||
          instance.kind === FILTERED_FIBER_INSTANCE) &&
        instance.data.tag === SuspenseComponent &&
        OffscreenComponent !== -1
      ) {
        const fiber = instance.data;
        const contentFiberInstance = remainingReconcilingChildren;
        const hydrated = isFiberHydrated(fiber);
        if (hydrated) {
          if (contentFiberInstance === null) {
            throw new Error(
              'There should always be an Offscreen Fiber child in a hydrated Suspense boundary.',
            );
          }

          unmountSuspenseChildrenRecursively(
            contentFiberInstance,
            stashedSuspenseParent,
            stashedSuspensePrevious,
            stashedSuspenseRemaining,
          );
          // unmountSuspenseChildren already popped
          shouldPopSuspenseNode = false;
        } else {
          if (contentFiberInstance !== null) {
            throw new Error(
              'A dehydrated Suspense node should not have a content Fiber.',
            );
          }
        }
      } else {
        unmountRemainingChildren();
      }
      removePreviousSuspendedBy(
        instance,
        previousSuspendedBy,
        reconcilingParentSuspenseNode,
      );
    } finally {
      reconcilingParent = stashedParent;
      previouslyReconciledSibling = stashedPrevious;
      remainingReconcilingChildren = stashedRemaining;
      if (shouldPopSuspenseNode) {
        reconcilingParentSuspenseNode = stashedSuspenseParent;
        previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
        remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
      }
      isInFocusedActivity = stashedIsInActivitySlice;
    }
    if (instance.kind === FIBER_INSTANCE) {
      recordUnmount(instance);
    } else if (instance.kind === VIRTUAL_INSTANCE) {
      recordVirtualUnmount(instance);
    } else {
      untrackFiber(instance, instance.data);
    }
    removeChild(instance, null);
  }

  function recordProfilingDurations(
    fiberInstance: FiberInstance,
    prevFiber: null | Fiber,
  ) {
    const id = fiberInstance.id;
    const fiber = fiberInstance.data;
    const {actualDuration, treeBaseDuration} = fiber;

    fiberInstance.treeBaseDuration = treeBaseDuration || 0;

    if (isProfiling) {
      // It's important to update treeBaseDuration even if the current Fiber did not render,
      // because it's possible that one of its descendants did.
      if (
        prevFiber == null ||
        treeBaseDuration !== prevFiber.treeBaseDuration
      ) {
        // Tree base duration updates are included in the operations typed array.
        // So we have to convert them from milliseconds to microseconds so we can send them as ints.
        const convertedTreeBaseDuration = Math.floor(
          (treeBaseDuration || 0) * 1000,
        );
        pushOperation(TREE_OPERATION_UPDATE_TREE_BASE_DURATION);
        pushOperation(id);
        pushOperation(convertedTreeBaseDuration);
      }

      if (
        prevFiber == null ||
        (prevFiber !== fiber &&
          didFiberRender(ReactTypeOfWork, prevFiber, fiber))
      ) {
        if (actualDuration != null) {
          // The actual duration reported by React includes time spent working on children.
          // This is useful information, but it's also useful to be able to exclude child durations.
          // The frontend can't compute this, since the immediate children may have been filtered out.
          // So we need to do this on the backend.
          // Note that this calculated self duration is not the same thing as the base duration.
          // The two are calculated differently (tree duration does not accumulate).
          let selfDuration = actualDuration;
          let child = fiber.child;
          while (child !== null) {
            selfDuration -= child.actualDuration || 0;
            child = child.sibling;
          }

          // If profiling is active, store durations for elements that were rendered during the commit.
          // Note that we should do this for any fiber we performed work on, regardless of its actualDuration value.
          // In some cases actualDuration might be 0 for fibers we worked on (particularly if we're using Date.now)
          // In other cases (e.g. Memo) actualDuration might be greater than 0 even if we "bailed out".
          const metadata =
            currentCommitProfilingMetadata as any as CommitProfilingData;
          metadata.durations.push(id, actualDuration, selfDuration);
          metadata.maxActualDuration = Math.max(
            metadata.maxActualDuration,
            actualDuration,
          );

          if (recordChangeDescriptions) {
            const changeDescription = getChangeDescription(prevFiber, fiber);
            if (changeDescription !== null) {
              if (metadata.changeDescriptions !== null) {
                metadata.changeDescriptions.set(id, changeDescription);
              }
            }
          }
        }
      }

      // If this Fiber was in the set of memoizedUpdaters we need to record
      // it to be included in the description of the commit.
      const fiberRoot: FiberRoot = currentRoot.data.stateNode;
      const updaters = fiberRoot.memoizedUpdaters;
      if (
        updaters != null &&
        (updaters.has(fiber) ||
          // We check the alternate here because we're matching identity and
          // prevFiber might be same as fiber.
          (fiber.alternate !== null && updaters.has(fiber.alternate)))
      ) {
        const metadata =
          currentCommitProfilingMetadata as any as CommitProfilingData;
        if (metadata.updaters === null) {
          metadata.updaters = [];
        }
        metadata.updaters.push(instanceToSerializedElement(fiberInstance));
      }
    }
  }

  function recordVirtualProfilingDurations(virtualInstance: VirtualInstance) {
    const id = virtualInstance.id;

    let treeBaseDuration = 0;
    // Add up the base duration of the child instances. The virtual base duration
    // will be the same as children's duration since we don't take up any render
    // time in the virtual instance.
    for (
      let child = virtualInstance.firstChild;
      child !== null;
      child = child.nextSibling
    ) {
      treeBaseDuration += child.treeBaseDuration;
    }

    if (isProfiling) {
      const previousTreeBaseDuration = virtualInstance.treeBaseDuration;
      if (treeBaseDuration !== previousTreeBaseDuration) {
        // Tree base duration updates are included in the operations typed array.
        // So we have to convert them from milliseconds to microseconds so we can send them as ints.
        const convertedTreeBaseDuration = Math.floor(
          (treeBaseDuration || 0) * 1000,
        );
        pushOperation(TREE_OPERATION_UPDATE_TREE_BASE_DURATION);
        pushOperation(id);
        pushOperation(convertedTreeBaseDuration);
      }
    }

    virtualInstance.treeBaseDuration = treeBaseDuration;
  }

  function addUnfilteredChildrenIDs(
    parentInstance: DevToolsInstance,
    nextChildren: Array<number>,
  ): void {
    let child: null | DevToolsInstance = parentInstance.firstChild;
    while (child !== null) {
      if (child.kind === FILTERED_FIBER_INSTANCE) {
        const fiber = child.data;
        if (isHiddenOffscreen(fiber) && !isActivityHiddenOffscreen(fiber)) {
          // The children of this Offscreen are hidden so they don't get added.
          // Activity's hidden children are still shown in the tree.
        } else {
          addUnfilteredChildrenIDs(child, nextChildren);
        }
      } else {
        nextChildren.push(child.id);
      }
      child = child.nextSibling;
    }
  }

  function recordResetChildren(
    parentInstance: FiberInstance | VirtualInstance,
  ) {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      if (parentInstance.firstChild !== null) {
        debug(
          'recordResetChildren()',
          parentInstance.firstChild,
          parentInstance,
        );
      }
    }
    // The frontend only really cares about the displayName, key, and children.
    // The first two don't really change, so we are only concerned with the order of children here.
    // This is trickier than a simple comparison though, since certain types of fibers are filtered.
    const nextChildren: Array<number> = [];

    addUnfilteredChildrenIDs(parentInstance, nextChildren);

    const numChildren = nextChildren.length;
    if (numChildren < 2) {
      // No need to reorder.
      return;
    }
    pushOperation(TREE_OPERATION_REORDER_CHILDREN);
    pushOperation(parentInstance.id);
    pushOperation(numChildren);
    for (let i = 0; i < nextChildren.length; i++) {
      pushOperation(nextChildren[i]);
    }
  }

  function addUnfilteredSuspenseChildrenIDs(
    parentInstance: SuspenseNode,
    nextChildren: Array<number>,
  ): void {
    let child: null | SuspenseNode = parentInstance.firstChild;
    while (child !== null) {
      if (child.instance.kind === FILTERED_FIBER_INSTANCE) {
        addUnfilteredSuspenseChildrenIDs(child, nextChildren);
      } else {
        nextChildren.push(child.instance.id);
      }
      child = child.nextSibling;
    }
  }

  function recordResetSuspenseChildren(parentInstance: SuspenseNode) {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      if (parentInstance.firstChild !== null) {
        console.log(
          'recordResetSuspenseChildren()',
          parentInstance.firstChild,
          parentInstance,
        );
      }
    }
    // The frontend only really cares about the name, and children.
    // The first two don't really change, so we are only concerned with the order of children here.
    // This is trickier than a simple comparison though, since certain types of fibers are filtered.
    const nextChildren: Array<number> = [];

    addUnfilteredSuspenseChildrenIDs(parentInstance, nextChildren);

    const numChildren = nextChildren.length;
    if (numChildren < 2) {
      // No need to reorder.
      return;
    }
    pushOperation(SUSPENSE_TREE_OPERATION_REORDER_CHILDREN);
    // $FlowFixMe[incompatible-call] TODO: Allow filtering SuspenseNode
    // $FlowFixMe[incompatible-type]
    pushOperation(parentInstance.instance.id);
    pushOperation(numChildren);
    for (let i = 0; i < nextChildren.length; i++) {
      pushOperation(nextChildren[i]);
    }
  }

  function updateVirtualInstanceRecursively(
    virtualInstance: VirtualInstance,
    nextFirstChild: Fiber,
    nextLastChild: null | Fiber, // non-inclusive
    prevFirstChild: null | Fiber,
    traceNearestHostComponentUpdate: boolean,
    virtualLevel: number, // the nth level of virtual instances
  ): UpdateFlags {
    const stashedParent = reconcilingParent;
    const stashedPrevious = previouslyReconciledSibling;
    const stashedRemaining = remainingReconcilingChildren;
    const previousSuspendedBy = virtualInstance.suspendedBy;
    // Push a new DevTools instance parent while reconciling this subtree.
    reconcilingParent = virtualInstance;
    previouslyReconciledSibling = null;
    // Move all the children of this instance to the remaining set.
    // We'll move them back one by one, and anything that remains is deleted.
    remainingReconcilingChildren = virtualInstance.firstChild;
    virtualInstance.firstChild = null;
    virtualInstance.suspendedBy = null;
    try {
      let updateFlags = updateVirtualChildrenRecursively(
        nextFirstChild,
        nextLastChild,
        prevFirstChild,
        traceNearestHostComponentUpdate,
        virtualLevel + 1,
      );
      if ((updateFlags & ShouldResetChildren) !== NoUpdate) {
        if (!isInDisconnectedSubtree) {
          recordResetChildren(virtualInstance);
        }
        updateFlags &= ~ShouldResetChildren;
      }
      removePreviousSuspendedBy(
        virtualInstance,
        previousSuspendedBy,
        reconcilingParentSuspenseNode,
      );
      // Update the errors/warnings count. If this Instance has switched to a different
      // ReactComponentInfo instance, such as when refreshing Server Components, then
      // we replace all the previous logs with the ones associated with the new ones rather
      // than merging. Because deduping is expected to happen at the request level.
      const componentLogsEntry = componentInfoToComponentLogsMap.get(
        virtualInstance.data,
      );
      recordConsoleLogs(virtualInstance, componentLogsEntry);
      // Must be called after all children have been appended.
      recordVirtualProfilingDurations(virtualInstance);

      return updateFlags;
    } finally {
      unmountRemainingChildren();
      reconcilingParent = stashedParent;
      previouslyReconciledSibling = stashedPrevious;
      remainingReconcilingChildren = stashedRemaining;
    }
  }

  function updateVirtualChildrenRecursively(
    nextFirstChild: Fiber,
    nextLastChild: null | Fiber, // non-inclusive
    prevFirstChild: null | Fiber,
    traceNearestHostComponentUpdate: boolean,
    virtualLevel: number, // the nth level of virtual instances
  ): UpdateFlags {
    let updateFlags = NoUpdate;
    // If the first child is different, we need to traverse them.
    // Each next child will be either a new child (mount) or an alternate (update).
    let nextChild: null | Fiber = nextFirstChild;
    let prevChildAtSameIndex = prevFirstChild;
    let previousVirtualInstance: null | VirtualInstance = null;
    let previousVirtualInstanceWasMount: boolean = false;
    let previousVirtualInstanceNextFirstFiber: Fiber = nextFirstChild;
    let previousVirtualInstancePrevFirstFiber: null | Fiber = prevFirstChild;
    while (nextChild !== null && nextChild !== nextLastChild) {
      let level = 0;
      if (nextChild._debugInfo) {
        for (let i = 0; i < nextChild._debugInfo.length; i++) {
          const debugEntry = nextChild._debugInfo[i];
          if (debugEntry.awaited) {
            // Async Info
            const asyncInfo: ReactAsyncInfo = debugEntry as any;
            if (level === virtualLevel) {
              // Track any async info between the previous virtual instance up until to this
              // instance and add it to the parent. This can add the same set multiple times
              // so we assume insertSuspendedBy dedupes.
              insertSuspendedBy(asyncInfo);
            }
            continue;
          }
          if (typeof debugEntry.name !== 'string') {
            // Not a Component. Some other Debug Info.
            continue;
          }
          const componentInfo: ReactComponentInfo = debugEntry as any;
          const secondaryEnv = getSecondaryEnvironmentName(
            nextChild._debugInfo,
            i,
          );
          if (componentInfo.env != null) {
            knownEnvironmentNames.add(componentInfo.env);
          }
          if (secondaryEnv !== null) {
            knownEnvironmentNames.add(secondaryEnv);
          }
          if (shouldFilterVirtual(componentInfo, secondaryEnv)) {
            continue;
          }
          if (level === virtualLevel) {
            if (
              previousVirtualInstance === null ||
              // Consecutive children with the same debug entry as a parent gets
              // treated as if they share the same virtual instance.
              previousVirtualInstance.data !== componentInfo
            ) {
              if (previousVirtualInstance !== null) {
                // Mount any previous children that should go into the previous parent.
                if (previousVirtualInstanceWasMount) {
                  mountVirtualInstanceRecursively(
                    previousVirtualInstance,
                    previousVirtualInstanceNextFirstFiber,
                    nextChild,
                    traceNearestHostComponentUpdate,
                    virtualLevel,
                  );
                  updateFlags |=
                    ShouldResetChildren | ShouldResetSuspenseChildren;
                } else {
                  updateFlags |= updateVirtualInstanceRecursively(
                    previousVirtualInstance,
                    previousVirtualInstanceNextFirstFiber,
                    nextChild,
                    previousVirtualInstancePrevFirstFiber,
                    traceNearestHostComponentUpdate,
                    virtualLevel,
                  );
                }
              }
              let previousSiblingOfBestMatch = null;
              let bestMatch = remainingReconcilingChildren;
              if (
                componentInfo.key != null &&
                componentInfo.key !== REACT_OPTIMISTIC_KEY
              ) {
                // If there is a key try to find a matching key in the set.
                bestMatch = remainingReconcilingChildren;
                while (bestMatch !== null) {
                  if (
                    bestMatch.kind === VIRTUAL_INSTANCE &&
                    bestMatch.data.key === componentInfo.key
                  ) {
                    break;
                  }
                  previousSiblingOfBestMatch = bestMatch;
                  bestMatch = bestMatch.nextSibling;
                }
              }
              if (
                bestMatch !== null &&
                bestMatch.kind === VIRTUAL_INSTANCE &&
                bestMatch.data.name === componentInfo.name &&
                bestMatch.data.env === componentInfo.env &&
                bestMatch.data.key === componentInfo.key
              ) {
                // If the previous children had a virtual instance in the same slot
                // with the same name, then we claim it and reuse it for this update.
                // Update it with the latest entry.
                bestMatch.data = componentInfo;
                moveChild(bestMatch, previousSiblingOfBestMatch);
                previousVirtualInstance = bestMatch;
                previousVirtualInstanceWasMount = false;
              } else {
                // Otherwise we create a new instance.
                const newVirtualInstance = createVirtualInstance(componentInfo);
                recordVirtualMount(
                  newVirtualInstance,
                  reconcilingParent,
                  secondaryEnv,
                );
                insertChild(newVirtualInstance);
                previousVirtualInstance = newVirtualInstance;
                previousVirtualInstanceWasMount = true;
                updateFlags |= ShouldResetChildren;
              }
              // Existing children might be reparented into this new virtual instance.
              // TODO: This will cause the front end to error which needs to be fixed.
              previousVirtualInstanceNextFirstFiber = nextChild;
              previousVirtualInstancePrevFirstFiber = prevChildAtSameIndex;
            }
            level++;
            break;
          } else {
            level++;
          }
        }
      }
      if (level === virtualLevel) {
        if (previousVirtualInstance !== null) {
          // If we were working on a virtual instance and this is not a virtual
          // instance, then we end the sequence and update any previous children
          // that should go into the previous virtual instance.
          if (previousVirtualInstanceWasMount) {
            mountVirtualInstanceRecursively(
              previousVirtualInstance,
              previousVirtualInstanceNextFirstFiber,
              nextChild,
              traceNearestHostComponentUpdate,
              virtualLevel,
            );
            updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
          } else {
            updateFlags |= updateVirtualInstanceRecursively(
              previousVirtualInstance,
              previousVirtualInstanceNextFirstFiber,
              nextChild,
              previousVirtualInstancePrevFirstFiber,
              traceNearestHostComponentUpdate,
              virtualLevel,
            );
          }
          previousVirtualInstance = null;
        }

        // We've reached the end of the virtual levels, but not beyond,
        // and now continue with the regular fiber.

        // Do a fast pass over the remaining children to find the previous instance.
        // TODO: This doesn't have the best O(n) for a large set of children that are
        // reordered. Consider using a temporary map if it's not the very next one.
        let prevChild;
        if (prevChildAtSameIndex === nextChild) {
          // This set is unchanged. We're just going through it to place all the
          // children again.
          prevChild = nextChild;
        } else {
          // We don't actually need to rely on the alternate here. We could also
          // reconcile against stateNode, key or whatever. Doesn't have to be same
          // Fiber pair.
          prevChild = nextChild.alternate;
        }
        let previousSiblingOfExistingInstance = null;
        let existingInstance = null;
        if (prevChild !== null) {
          existingInstance = remainingReconcilingChildren;
          while (existingInstance !== null) {
            if (existingInstance.data === prevChild) {
              break;
            }
            previousSiblingOfExistingInstance = existingInstance;
            existingInstance = existingInstance.nextSibling;
          }
        }
        if (existingInstance !== null) {
          // Common case. Match in the same parent.
          const fiberInstance: FiberInstance | FilteredFiberInstance =
            existingInstance as any; // Only matches if it's a Fiber.

          // We keep track if the order of the children matches the previous order.
          // They are always different referentially, but if the instances line up
          // conceptually we'll want to know that.
          if (prevChild !== prevChildAtSameIndex) {
            updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
          }

          moveChild(fiberInstance, previousSiblingOfExistingInstance);

          // If a nested tree child order changed but it can't handle its own
          // child order invalidation (e.g. because it's filtered out like host nodes),
          // propagate the need to reset child order upwards to this Fiber.
          updateFlags |= updateFiberRecursively(
            fiberInstance,
            nextChild,
            prevChild as any,
            traceNearestHostComponentUpdate,
          );
        } else if (prevChild !== null && shouldFilterFiber(nextChild)) {
          // The filtered instance could've reordered.
          if (prevChild !== prevChildAtSameIndex) {
            updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
          }

          // If this Fiber should be filtered, we need to still update its children.
          // This relies on an alternate since we don't have an Instance with the previous
          // child on it. Ideally, the reconciliation wouldn't need previous Fibers that
          // are filtered from the tree.
          updateFlags |= updateFiberRecursively(
            null,
            nextChild,
            prevChild,
            traceNearestHostComponentUpdate,
          );
        } else {
          // It's possible for a FiberInstance to be reparented when virtual parents
          // get their sequence split or change structure with the same render result.
          // In this case we unmount the and remount the FiberInstances.
          // This might cause us to lose the selection but it's an edge case.

          // We let the previous instance remain in the "remaining queue" it is
          // in to be deleted at the end since it'll have no match.

          mountFiberRecursively(nextChild, traceNearestHostComponentUpdate);
          // Need to mark the parent set to remount the new instance.
          updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
        }
      }
      // Try the next child.
      nextChild = nextChild.sibling;
      // Advance the pointer in the previous list so that we can
      // keep comparing if they line up.
      if (
        (updateFlags & ShouldResetChildren) === NoUpdate &&
        prevChildAtSameIndex !== null
      ) {
        prevChildAtSameIndex = prevChildAtSameIndex.sibling;
      }
    }
    if (previousVirtualInstance !== null) {
      if (previousVirtualInstanceWasMount) {
        mountVirtualInstanceRecursively(
          previousVirtualInstance,
          previousVirtualInstanceNextFirstFiber,
          null,
          traceNearestHostComponentUpdate,
          virtualLevel,
        );
        updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
      } else {
        updateFlags |= updateVirtualInstanceRecursively(
          previousVirtualInstance,
          previousVirtualInstanceNextFirstFiber,
          null,
          previousVirtualInstancePrevFirstFiber,
          traceNearestHostComponentUpdate,
          virtualLevel,
        );
      }
    }
    // If we have no more children, but used to, they don't line up.
    if (prevChildAtSameIndex !== null) {
      updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
    }
    return updateFlags;
  }

  // Returns whether closest unfiltered fiber parent needs to reset its child list.
  function updateChildrenRecursively(
    nextFirstChild: null | Fiber,
    prevFirstChild: null | Fiber,
    traceNearestHostComponentUpdate: boolean,
  ): UpdateFlags {
    if (nextFirstChild === null) {
      return prevFirstChild !== null ? ShouldResetChildren : NoUpdate;
    }
    return updateVirtualChildrenRecursively(
      nextFirstChild,
      null,
      prevFirstChild,
      traceNearestHostComponentUpdate,
      0,
    );
  }

  function updateSuspenseChildrenRecursively(
    nextContentFiber: Fiber,
    prevContentFiber: Fiber,
    traceNearestHostComponentUpdate: boolean,
    stashedSuspenseParent: null | SuspenseNode,
    stashedSuspensePrevious: null | SuspenseNode,
    stashedSuspenseRemaining: null | SuspenseNode,
  ): UpdateFlags {
    let updateFlags = NoUpdate;
    const prevFallbackFiber = prevContentFiber.sibling;
    const nextFallbackFiber = nextContentFiber.sibling;

    // First update only the Offscreen boundary. I.e. the main content.
    updateFlags |= updateVirtualChildrenRecursively(
      nextContentFiber,
      nextFallbackFiber,
      prevContentFiber,
      traceNearestHostComponentUpdate,
      0,
    );

    // Next, we'll pop back out of the SuspenseNode that we added above and now we'll
    // reconcile the fallback, reconciling anything in the context of the parent SuspenseNode.
    // Since the fallback conceptually blocks the parent.
    reconcilingParentSuspenseNode = stashedSuspenseParent;
    previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
    remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
    if (prevFallbackFiber !== null || nextFallbackFiber !== null) {
      if (nextFallbackFiber === null) {
        unmountRemainingChildren();
      } else {
        updateFlags |= updateVirtualChildrenRecursively(
          nextFallbackFiber,
          null,
          prevFallbackFiber,
          traceNearestHostComponentUpdate,
          0,
        );

        if ((updateFlags & ShouldResetSuspenseChildren) !== NoUpdate) {
          updateFlags |= ShouldResetParentSuspenseChildren;
          updateFlags &= ~ShouldResetSuspenseChildren;
        }
      }
    }

    return updateFlags;
  }

  // Returns whether closest unfiltered fiber parent needs to reset its child list.
  function updateFiberRecursively(
    fiberInstance: null | FiberInstance | FilteredFiberInstance, // null if this should be filtered
    nextFiber: Fiber,
    prevFiber: Fiber,
    traceNearestHostComponentUpdate: boolean,
  ): UpdateFlags {
    // $FlowFixMe[constant-condition]
    if (__DEBUG__) {
      if (fiberInstance !== null) {
        debug('updateFiberRecursively()', fiberInstance, reconcilingParent);
      }
    }

    if (traceUpdatesEnabled) {
      const elementType = getElementTypeForFiber(nextFiber);
      if (traceNearestHostComponentUpdate) {
        // If an ancestor updated, we should mark the nearest host nodes for highlighting.
        if (elementType === ElementTypeHostComponent) {
          traceUpdatesForNodes.add(nextFiber.stateNode);
          traceNearestHostComponentUpdate = false;
        }
      } else {
        if (
          elementType === ElementTypeFunction ||
          elementType === ElementTypeClass ||
          elementType === ElementTypeContext ||
          elementType === ElementTypeMemo ||
          elementType === ElementTypeForwardRef
        ) {
          if (prevFiber !== nextFiber) {
            // Otherwise if this is a traced ancestor, flag for the nearest host descendant(s).
            traceNearestHostComponentUpdate = didFiberRender(
              ReactTypeOfWork,
              prevFiber,
              nextFiber,
            );
          }
        }
      }
    }

    const stashedParent = reconcilingParent;
    const stashedPrevious = previouslyReconciledSibling;
    const stashedRemaining = remainingReconcilingChildren;
    const stashedSuspenseParent = reconcilingParentSuspenseNode;
    const stashedSuspensePrevious = previouslyReconciledSiblingSuspenseNode;
    const stashedSuspenseRemaining = remainingReconcilingChildrenSuspenseNodes;
    const stashedIsInActivitySlice = isInFocusedActivity;
    let updateFlags = NoUpdate;
    let shouldMeasureSuspenseNode = false;
    let shouldPopSuspenseNode = false;
    let previousSuspendedBy = null;
    if (fiberInstance !== null) {
      previousSuspendedBy = fiberInstance.suspendedBy;
      // Update the Fiber so we that we always keep the current Fiber on the data.
      fiberInstance.data = nextFiber;
      if (prevFiber !== nextFiber) {
        if (
          mostRecentlyInspectedElement !== null &&
          (mostRecentlyInspectedElement.id === fiberInstance.id ||
            // If we're inspecting a Root, we inspect the Screen.
            // Invalidating any Root invalidates the Screen too.
            (mostRecentlyInspectedElement.type === ElementTypeRoot &&
              nextFiber.tag === HostRoot)) &&
          didFiberRender(ReactTypeOfWork, prevFiber, nextFiber)
        ) {
          // If this Fiber has updated, clear cached inspected data.
          // If it is inspected again, it may need to be re-run to obtain updated hooks values.
          hasElementUpdatedSinceLastInspected = true;
        }
      }
      // Push a new DevTools instance parent while reconciling this subtree.
      reconcilingParent = fiberInstance;
      previouslyReconciledSibling = null;
      // Move all the children of this instance to the remaining set.
      // We'll move them back one by one, and anything that remains is deleted.
      remainingReconcilingChildren = fiberInstance.firstChild;
      fiberInstance.firstChild = null;
      fiberInstance.suspendedBy = null;

      const suspenseNode = fiberInstance.suspenseNode;
      if (suspenseNode !== null) {
        reconcilingParentSuspenseNode = suspenseNode;
        previouslyReconciledSiblingSuspenseNode = null;
        remainingReconcilingChildrenSuspenseNodes = suspenseNode.firstChild;
        suspenseNode.firstChild = null;
        shouldMeasureSuspenseNode = true;
        shouldPopSuspenseNode = true;
      }

      if (focusedActivity !== null) {
        if (fiberInstance.id === focusedActivityID) {
          isInFocusedActivity = true;
        } else if (nextFiber.tag === ActivityComponent) {
          // Filtering nested Activity components inside the focused activity
          // is done in the frontend.
        }
      }
    }
    try {
      trackDebugInfoFromLazyType(nextFiber);
      trackDebugInfoFromUsedThenables(nextFiber);

      if (nextFiber.tag === HostHoistable) {
        const nearestInstance = reconcilingParent;
        if (nearestInstance === null) {
          throw new Error('Did not expect a host hoistable to be the root');
        }
        if (prevFiber.memoizedState !== nextFiber.memoizedState) {
          releaseHostResource(nearestInstance, prevFiber.memoizedState);
          aquireHostResource(nearestInstance, nextFiber.memoizedState);
        }
        trackDebugInfoFromHostResource(nearestInstance, nextFiber);
      } else if (
        nextFiber.tag === HostComponent ||
        nextFiber.tag === HostText ||
        nextFiber.tag === HostSingleton
      ) {
        const nearestInstance = reconcilingParent;
        if (nearestInstance === null) {
          throw new Error('Did not expect a host hoistable to be the root');
        }
        if (prevFiber.stateNode !== nextFiber.stateNode) {
          // In persistent mode, it's possible for the stateNode to update with
          // a new clone. In that case we need to release the old one and aquire
          // new one instead.
          releaseHostInstance(nearestInstance, prevFiber.stateNode);
          aquireHostInstance(nearestInstance, nextFiber.stateNode);
        }
        trackDebugInfoFromHostComponent(nearestInstance, nextFiber);
      }

      // The behavior of timed-out legacy Suspense trees is unique. Without the Offscreen wrapper.
      // Rather than unmount the timed out content (and possibly lose important state),
      // React re-parents this content within a hidden Fragment while the fallback is showing.
      // This behavior doesn't need to be observable in the DevTools though.
      // It might even result in a bad user experience for e.g. node selection in the Elements panel.
      // The easiest fix is to strip out the intermediate Fragment fibers,
      // so the Elements panel and Profiler don't need to special case them.
      const isLegacySuspense =
        nextFiber.tag === SuspenseComponent && OffscreenComponent === -1;
      // Suspense components only have a non-null memoizedState if they're timed-out.
      const prevDidTimeout =
        isLegacySuspense && prevFiber.memoizedState !== null;
      const nextDidTimeOut =
        isLegacySuspense && nextFiber.memoizedState !== null;

      const prevWasHidden = isHiddenOffscreen(prevFiber);
      const nextIsHidden = isHiddenOffscreen(nextFiber);
      const prevWasSuspended = isSuspendedOffscreen(prevFiber);
      const nextIsSuspended = isSuspendedOffscreen(nextFiber);

      if (isLegacySuspense) {
        if (fiberInstance !== null && fiberInstance.suspenseNode !== null) {
          const suspenseNode = fiberInstance.suspenseNode;
          if (
            (prevFiber.stateNode === null) !==
            (nextFiber.stateNode === null)
          ) {
            trackThrownPromisesFromRetryCache(
              suspenseNode,
              nextFiber.stateNode,
            );
          }
          if (
            (prevFiber.memoizedState === null) !==
            (nextFiber.memoizedState === null)
          ) {
            // Toggle suspended state.
            recordSuspenseSuspenders(suspenseNode);
          }
        }
      }
      // The logic below is inspired by the code paths in updateSuspenseComponent()
      // inside ReactFiberBeginWork in the React source code.
      if (prevDidTimeout && nextDidTimeOut) {
        // Fallback -> Fallback:
        // 1. Reconcile fallback set.
        const nextFiberChild = nextFiber.child;
        const nextFallbackChildSet = nextFiberChild
          ? nextFiberChild.sibling
          : null;
        // Note: We can't use nextFiber.child.sibling.alternate
        // because the set is special and alternate may not exist.
        const prevFiberChild = prevFiber.child;
        const prevFallbackChildSet = prevFiberChild
          ? prevFiberChild.sibling
          : null;

        if (prevFallbackChildSet == null && nextFallbackChildSet != null) {
          mountChildrenRecursively(
            nextFallbackChildSet,
            traceNearestHostComponentUpdate,
          );

          updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
        }

        const childrenUpdateFlags =
          nextFallbackChildSet != null && prevFallbackChildSet != null
            ? updateChildrenRecursively(
                nextFallbackChildSet,
                prevFallbackChildSet,
                traceNearestHostComponentUpdate,
              )
            : NoUpdate;
        updateFlags |= childrenUpdateFlags;
      } else if (prevDidTimeout && !nextDidTimeOut) {
        // Fallback -> Primary:
        // 1. Unmount fallback set
        // Note: don't emulate fallback unmount because React actually did it.
        // 2. Mount primary set
        const nextPrimaryChildSet = nextFiber.child;
        if (nextPrimaryChildSet !== null) {
          mountChildrenRecursively(
            nextPrimaryChildSet,
            traceNearestHostComponentUpdate,
          );
          updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
        }
      } else if (!prevDidTimeout && nextDidTimeOut) {
        // Primary -> Fallback:
        // 1. Hide primary set
        // We simply don't re-add the fallback children and let
        // unmountRemainingChildren() handle it.
        // 2. Mount fallback set
        const nextFiberChild = nextFiber.child;
        const nextFallbackChildSet = nextFiberChild
          ? nextFiberChild.sibling
          : null;
        if (nextFallbackChildSet != null) {
          mountChildrenRecursively(
            nextFallbackChildSet,
            traceNearestHostComponentUpdate,
          );
          updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
        }
      } else if (nextIsSuspended) {
        if (!prevWasSuspended) {
          // We're hiding the children. Disconnect them from the front end but keep state.
          if (fiberInstance !== null && !isInDisconnectedSubtree) {
            disconnectChildrenRecursively(remainingReconcilingChildren);
          }
        }
        // Update children inside the hidden tree if they committed with a new updates.
        const stashedDisconnected = isInDisconnectedSubtree;
        isInDisconnectedSubtree = true;
        try {
          updateFlags |= updateChildrenRecursively(
            nextFiber.child,
            prevFiber.child,
            false,
          );
        } finally {
          isInDisconnectedSubtree = stashedDisconnected;
        }
      } else if (prevWasSuspended && !nextIsSuspended) {
        // We're revealing the hidden children. We now need to update them to the latest state.
        // We do this while still in the disconnected state and then we reconnect the new ones.
        // This avoids reconnecting things that are about to be removed anyway.
        const stashedDisconnected = isInDisconnectedSubtree;
        isInDisconnectedSubtree = true;
        try {
          if (nextFiber.child !== null) {
            updateFlags |= updateChildrenRecursively(
              nextFiber.child,
              prevFiber.child,
              false,
            );
          }
          // Ensure we unmount any remaining children inside the isInDisconnectedSubtree flag
          // since they should not trigger real deletions.
          unmountRemainingChildren();
          remainingReconcilingChildren = null;
        } finally {
          isInDisconnectedSubtree = stashedDisconnected;
        }
        if (fiberInstance !== null && !isInDisconnectedSubtree) {
          reconnectChildrenRecursively(fiberInstance);
          // Children may have reordered while they were hidden.
          updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
        }
      } else if (nextIsHidden) {
        if (isActivityHiddenOffscreen(nextFiber)) {
          // Activity's hidden children stay visible in the DevTools tree.
          // Whether staying hidden or transitioning to hidden, update normally.
          updateFlags |= updateChildrenRecursively(
            nextFiber.child,
            prevFiber.child,
            traceNearestHostComponentUpdate,
          );
        } else if (prevWasHidden) {
          // still hidden. Nothing to do.
        } else {
          // We're hiding the children. Remove them from the Frontend
          unmountRemainingChildren();
        }
      } else if (prevWasHidden && !nextIsHidden) {
        if (
          nextFiber.return !== null &&
          nextFiber.return.tag === ActivityComponent
        ) {
          // Activity children were never unmounted, so just update normally.
          updateFlags |= updateChildrenRecursively(
            nextFiber.child,
            prevFiber.child,
            traceNearestHostComponentUpdate,
          );
        } else {
          // Since we don't mount hidden children and unmount children when hiding,
          // we need to enter the mount path when revealing.
          const nextChildSet = nextFiber.child;
          if (nextChildSet !== null) {
            mountChildrenRecursively(
              nextChildSet,
              traceNearestHostComponentUpdate,
            );
            updateFlags |= ShouldResetChildren | ShouldResetSuspenseChildren;
          }
        }
      } else if (
        nextFiber.tag === SuspenseComponent &&
        OffscreenComponent !== -1 &&
        fiberInstance !== null &&
        fiberInstance.suspenseNode !== null
      ) {
        // Modern Suspense path
        const suspenseNode = fiberInstance.suspenseNode;
        const prevContentFiber = prevFiber.child;
        const nextContentFiber = nextFiber.child;
        const previousHydrated = isFiberHydrated(prevFiber);
        const nextHydrated = isFiberHydrated(nextFiber);
        if (previousHydrated && nextHydrated) {
          if (nextContentFiber === null || prevContentFiber === null) {
            throw new Error(
              'There should always be an Offscreen Fiber child in a hydrated Suspense boundary.',
            );
          }

          if (
            (prevFiber.stateNode === null) !==
            (nextFiber.stateNode === null)
          ) {
            trackThrownPromisesFromRetryCache(
              suspenseNode,
              nextFiber.stateNode,
            );
          }

          if (
            (prevFiber.memoizedState === null) !==
            (nextFiber.memoizedState === null)
          ) {
            // Toggle suspended state.
            recordSuspenseSuspenders(suspenseNode);
          }

          shouldMeasureSuspenseNode = false;
          updateFlags |= updateSuspenseChildrenRecursively(
            nextContentFiber,
            prevContentFiber,
            traceNearestHostComponentUpdate,
            stashedSuspenseParent,
            stashedSuspensePrevious,
            stashedSuspenseRemaining,
          );
          // updateSuspenseChildrenRecursively popped already
          shouldPopSuspenseNode = false;
          if (nextFiber.memoizedState === null) {
            // Measure this Suspense node in case it changed. We don't update the rect while
            // we're inside a disconnected subtree nor if we are the Suspense boundary that
            // is suspended. This lets us keep the rectangle of the displayed content while
            // we're suspended to visualize the resulting state.
            shouldMeasureSuspenseNode = !isInDisconnectedSubtree;
          }
        } else if (!previousHydrated && nextHydrated) {
          if (nextContentFiber === null) {
            throw new Error(
              'There should always be an Offscreen Fiber child in a hydrated Suspense boundary.',
            );
          }

          trackThrownPromisesFromRetryCache(suspenseNode, nextFiber.stateNode);
          // Toggle suspended state.
          recordSuspenseSuspenders(suspenseNode);

          mountSuspenseChildrenRecursively(
            nextContentFiber,
            traceNearestHostComponentUpdate,
            stashedSuspenseParent,
            stashedSuspensePrevious,
            stashedSuspenseRemaining,
          );
          // mountSuspenseChildrenRecursively popped already
          shouldPopSuspenseNode = false;
        } else if (previousHydrated && !nextHydrated) {
          throw new Error(
            'Encountered a dehydrated Suspense boundary that was previously hydrated.',
          );
        } else {
          // This Suspense Fiber is still dehydrated. It won't have any children
          // until hydration.
        }
      } else {
        // Common case: Primary -> Primary.
        // This is the same code path as for non-Suspense fibers.
        if (nextFiber.child !== prevFiber.child) {
          updateFlags |= updateChildrenRecursively(
            nextFiber.child,
            prevFiber.child,
            traceNearestHostComponentUpdate,
          );
        } else {
          // Children are unchanged.
          if (fiberInstance !== null) {
            // All the remaining children will be children of this same fiber so we can just reuse them.
            // I.e. we just restore them by undoing what we did above.
            fiberInstance.firstChild = remainingReconcilingChildren;
            remainingReconcilingChildren = null;

            consumeSuspenseNodesOfExistingInstance(fiberInstance);

            if (traceUpdatesEnabled) {
              // If we're tracing updates and we've bailed out before reaching a host node,
              // we should fall back to recursively marking the nearest host descendants for highlight.
              if (traceNearestHostComponentUpdate) {
                const hostInstances =
                  findAllCurrentHostInstances(fiberInstance);
                hostInstances.forEach(hostInstance => {
                  traceUpdatesForNodes.add(hostInstance);
                });
              }
            }
          } else {
            const childrenUpdateFlags = updateChildrenRecursively(
              nextFiber.child,
              prevFiber.child,
              false,
            );
            // If this fiber is filtered there might be changes to this set elsewhere so we have
            // to visit each child to place it back in the set. We let the child bail out instead.
            if ((childrenUpdateFlags & ShouldResetChildren) !== NoUpdate) {
              throw new Error(
                'The children should not have changed if we pass in the same set.',
              );
            }
            updateFlags |= childrenUpdateFlags;
          }
        }
      }

      if (fiberInstance !== null) {
        // Detect Activity hidden/visible mode changes.
        if (
          prevFiber.tag === ActivityComponent &&
          nextFiber.tag === ActivityComponent &&
          fiberInstance.kind === FIBER_INSTANCE
        ) {
          const prevOffscreen = prevFiber.child;
          const nextOffscreen = nextFiber.child;
          if (prevOffscreen !== null && nextOffscreen !== null) {
            const prevHidden = isHiddenOffscreen(prevOffscreen);
            const nextHidden = isHiddenOffscreen(nextOffscreen);
            if (prevHidden !== nextHidden) {
              pushOperation(TREE_OPERATION_SET_SUBTREE_MODE);
              pushOperation(fiberInstance.id);
              pushOperation(
                nextHidden ? ActivityHiddenMode : ActivityVisibleMode,
              );
            }
          }
        }

        removePreviousSuspendedBy(
          fiberInstance,
          previousSuspendedBy,
          shouldPopSuspenseNode
            ? reconcilingParentSuspenseNode
            : stashedSuspenseParent,
        );

        if (fiberInstance.kind === FIBER_INSTANCE) {
          let componentLogsEntry = fiberToComponentLogsMap.get(
            fiberInstance.data,
          );
          if (
            componentLogsEntry === undefined &&
            fiberInstance.data.alternate
          ) {
            componentLogsEntry = fiberToComponentLogsMap.get(
              fiberInstance.data.alternate,
            );
          }
          recordConsoleLogs(fiberInstance, componentLogsEntry);

          if (!isInDisconnectedSubtree) {
            const isProfilingSupported =
              nextFiber.hasOwnProperty('treeBaseDuration');
            if (isProfilingSupported) {
              recordProfilingDurations(fiberInstance, prevFiber);
            }
          }
        }
      }

      if ((updateFlags & ShouldResetChildren) !== NoUpdate) {
        // We need to crawl the subtree for closest non-filtered Fibers
        // so that we can display them in a flat children set.
        if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
          if (!nextIsSuspended && !isInDisconnectedSubtree) {
            recordResetChildren(fiberInstance);
          }

          // We've handled the child order change for this Fiber.
          // Since it's included, there's no need to invalidate parent child order.
          updateFlags &= ~ShouldResetChildren;
        } else {
          // Let the closest unfiltered parent Fiber reset its child order instead.
        }
      } else {
      }

      if ((updateFlags & ShouldResetSuspenseChildren) !== NoUpdate) {
        if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
          const suspenseNode = fiberInstance.suspenseNode;
          if (suspenseNode !== null) {
            recordResetSuspenseChildren(suspenseNode);
            updateFlags &= ~ShouldResetSuspenseChildren;
          }
        } else {
          // Let the closest unfiltered parent Fiber reset its child order instead.
        }
      }
      if ((updateFlags & ShouldResetParentSuspenseChildren) !== NoUpdate) {
        if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
          const suspenseNode = fiberInstance.suspenseNode;
          if (suspenseNode !== null) {
            updateFlags &= ~ShouldResetParentSuspenseChildren;
            updateFlags |= ShouldResetSuspenseChildren;
          }
        } else {
          // Let the closest unfiltered parent Fiber reset its child order instead.
        }
      }

      return updateFlags;
    } finally {
      if (fiberInstance !== null) {
        unmountRemainingChildren();
        reconcilingParent = stashedParent;
        previouslyReconciledSibling = stashedPrevious;
        remainingReconcilingChildren = stashedRemaining;
        if (shouldMeasureSuspenseNode) {
          if (!isInDisconnectedSubtree) {
            // Measure this Suspense node in case it changed. We don't update the rect
            // while we're inside a disconnected subtree so that we keep the outline
            // as it was before we hid the parent.
            const suspenseNode = fiberInstance.suspenseNode;
            if (suspenseNode === null) {
              throw new Error(
                'Attempted to measure a Suspense node that does not exist.',
              );
            }
            const prevRects = suspenseNode.rects;
            const nextRects = measureInstance(fiberInstance);
            if (!areEqualRects(prevRects, nextRects)) {
              suspenseNode.rects = nextRects;
              recordSuspenseResize(suspenseNode);
            }
          }
        }
        if (shouldPopSuspenseNode) {
          reconcilingParentSuspenseNode = stashedSuspenseParent;
          previouslyReconciledSiblingSuspenseNode = stashedSuspensePrevious;
          remainingReconcilingChildrenSuspenseNodes = stashedSuspenseRemaining;
        }
        isInFocusedActivity = stashedIsInActivitySlice;
      }
    }
  }

  function disconnectChildrenRecursively(firstChild: null | DevToolsInstance) {
    for (let child = firstChild; child !== null; child = child.nextSibling) {
      if (
        (child.kind === FIBER_INSTANCE ||
          child.kind === FILTERED_FIBER_INSTANCE) &&
        isSuspendedOffscreen(child.data)
      ) {
        // This instance's children are already disconnected.
      } else {
        disconnectChildrenRecursively(child.firstChild);
      }
      if (child.kind === FIBER_INSTANCE) {
        recordDisconnect(child);
      } else if (child.kind === VIRTUAL_INSTANCE) {
        recordVirtualDisconnect(child);
      }
    }
  }

  function reconnectChildrenRecursively(parentInstance: DevToolsInstance) {
    for (
      let child = parentInstance.firstChild;
      child !== null;
      child = child.nextSibling
    ) {
      if (child.kind === FIBER_INSTANCE) {
        recordReconnect(child, parentInstance);
      } else if (child.kind === VIRTUAL_INSTANCE) {
        const secondaryEnv = null; // TODO: We don't have this data anywhere. We could just stash it somewhere.
        recordVirtualReconnect(child, parentInstance, secondaryEnv);
      }
      if (
        (child.kind === FIBER_INSTANCE ||
          child.kind === FILTERED_FIBER_INSTANCE) &&
        isHiddenOffscreen(child.data) &&
        !isActivityHiddenOffscreen(child.data)
      ) {
        // This instance's children should remain disconnected.
        // Activity's hidden children are still shown in the tree.
      } else {
        reconnectChildrenRecursively(child);
      }
    }
  }

  function cleanup() {
    isProfiling = false;
  }

  function flushInitialOperations() {
    const localPendingOperationsQueue = pendingOperationsQueue;

    pendingOperationsQueue = null;

    if (
      localPendingOperationsQueue !== null &&
      localPendingOperationsQueue.length > 0
    ) {
      // We may have already queued up some operations before the frontend connected
      // If so, let the frontend know about them.
      localPendingOperationsQueue.forEach(operations => {
        hook.emit('operations', operations);
      });
    } else {
      // Before the traversals, remember to start tracking
      // our path in case we have selection to restore.
      if (trackedPath !== null) {
        mightBeOnTrackedPath = true;
      }
      // If we have not been profiling, then we can just walk the tree and build up its current state as-is.
      hook.getFiberRoots(rendererID).forEach(root => {
        const current = root.current;
        const newRoot = createFiberInstance(current);
        rootToFiberInstanceMap.set(root, newRoot);
        idToDevToolsInstanceMap.set(newRoot.id, newRoot);
        currentRoot = newRoot;
        setRootPseudoKey(currentRoot.id, root.current);

        // Handle multi-renderer edge-case where only some v16 renderers support profiling.
        if (isProfiling && rootSupportsProfiling(root)) {
          // If profiling is active, store commit time and duration.
          // The frontend may request this information after profiling has stopped.
          currentCommitProfilingMetadata = {
            changeDescriptions: recordChangeDescriptions ? new Map() : null,
            durations: [],
            commitTime: getCurrentTime() - profilingStartTime,
            maxActualDuration: 0,
            priorityLevel: null,
            updaters: null,
            effectDuration: null,
            passiveEffectDuration: null,
          };
        }

        mountFiberRecursively(root.current, false);

        flushPendingEvents(currentRoot);

        currentRoot = null as any;
      });

      needsToFlushComponentLogs = false;
    }
  }

  function handleCommitFiberUnmount(fiber: any) {
    // This Hook is no longer used. After having shipped DevTools everywhere it is
    // safe to stop calling it from Fiber.
  }

  function handlePostCommitFiberRoot(root: FiberRoot) {
    if (isProfiling && rootSupportsProfiling(root)) {
      if (currentCommitProfilingMetadata !== null) {
        const {effectDuration, passiveEffectDuration} =
          getEffectDurations(root);
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        currentCommitProfilingMetadata.effectDuration = effectDuration;
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        currentCommitProfilingMetadata.passiveEffectDuration =
          passiveEffectDuration;
      }
    }

    if (needsToFlushComponentLogs) {
      const rootInstance = rootToFiberInstanceMap.get(root);
      if (rootInstance === undefined) {
        throw new Error(
          'Should have a root instance for a committed root. This is a bug in React DevTools.',
        );
      }
      // We received new logs after commit. I.e. in a passive effect. We need to
      // traverse the tree to find the affected ones. If we just moved the whole
      // tree traversal from handleCommitFiberRoot to handlePostCommitFiberRoot
      // this wouldn't be needed. For now we just brute force check all instances.
      // This is not that common of a case.
      bruteForceFlushErrorsAndWarnings(rootInstance);
    }
  }

  function handleCommitFiberRoot(
    root: FiberRoot,
    priorityLevel: void | number,
  ) {
    const nextFiber = root.current;

    let prevFiber: null | Fiber = null;
    let rootInstance = rootToFiberInstanceMap.get(root);
    if (!rootInstance) {
      rootInstance = createFiberInstance(nextFiber);
      rootToFiberInstanceMap.set(root, rootInstance);
      idToDevToolsInstanceMap.set(rootInstance.id, rootInstance);
    } else {
      prevFiber = rootInstance.data;
    }
    currentRoot = rootInstance;

    // Before the traversals, remember to start tracking
    // our path in case we have selection to restore.
    if (trackedPath !== null) {
      mightBeOnTrackedPath = true;
    }

    if (traceUpdatesEnabled) {
      traceUpdatesForNodes.clear();
    }

    // Handle multi-renderer edge-case where only some v16 renderers support profiling.
    const isProfilingSupported = rootSupportsProfiling(root);

    if (isProfiling && isProfilingSupported) {
      // If profiling is active, store commit time and duration.
      // The frontend may request this information after profiling has stopped.
      currentCommitProfilingMetadata = {
        changeDescriptions: recordChangeDescriptions ? new Map() : null,
        durations: [],
        commitTime: getCurrentTime() - profilingStartTime,
        maxActualDuration: 0,
        priorityLevel:
          priorityLevel == null ? null : formatPriorityLevel(priorityLevel),
        updaters: null,
        // Initialize to null; if new enough React version is running,
        // these values will be read during separate handlePostCommitFiberRoot() call.
        effectDuration: null,
        passiveEffectDuration: null,
      };
    }

    const nextIsMounted = nextFiber.child !== null;
    const prevWasMounted = prevFiber !== null && prevFiber.child !== null;
    if (!prevWasMounted && nextIsMounted) {
      // Mount a new root.
      setRootPseudoKey(currentRoot.id, nextFiber);
      mountFiberRecursively(nextFiber, false);
    } else if (prevWasMounted && nextIsMounted) {
      if (prevFiber === null) {
        throw new Error(
          'Expected a previous Fiber when updating an existing root.',
        );
      }
      // Update an existing root.
      updateFiberRecursively(rootInstance, nextFiber, prevFiber, false);
    } else if (prevWasMounted && !nextIsMounted) {
      // Unmount an existing root.
      unmountInstanceRecursively(rootInstance);
      removeRootPseudoKey(currentRoot.id);
      rootToFiberInstanceMap.delete(root);
    } else if (!prevWasMounted && !nextIsMounted) {
      // We don't need this root anymore.
      rootToFiberInstanceMap.delete(root);
    }

    if (isProfiling && isProfilingSupported) {
      if (!shouldBailoutWithPendingOperations()) {
        const commitProfilingMetadata = (
          rootToCommitProfilingMetadataMap as any as CommitProfilingMetadataMap
        ).get(currentRoot.id);

        if (commitProfilingMetadata != null) {
          commitProfilingMetadata.push(
            currentCommitProfilingMetadata as any as CommitProfilingData,
          );
        } else {
          (
            rootToCommitProfilingMetadataMap as any as CommitProfilingMetadataMap
          ).set(currentRoot.id, [
            currentCommitProfilingMetadata as any as CommitProfilingData,
          ]);
        }
      }
    }

    // We're done here.
    flushPendingEvents(currentRoot);

    needsToFlushComponentLogs = false;

    if (traceUpdatesEnabled) {
      hook.emit('traceUpdates', traceUpdatesForNodes);
    }

    currentRoot = null as any;
  }

  function getResourceInstance(fiber: Fiber): HostInstance | null {
    if (fiber.tag === HostHoistable) {
      const resource = fiber.memoizedState;
      // Feature Detect a DOM Specific Instance of a Resource
      if (
        typeof resource === 'object' &&
        resource !== null &&
        resource.instance != null
      ) {
        return resource.instance;
      }
    }
    return null;
  }

  function appendHostInstancesByDevToolsInstance(
    devtoolsInstance: DevToolsInstance,
    hostInstances: Array<HostInstance>,
  ) {
    if (devtoolsInstance.kind !== VIRTUAL_INSTANCE) {
      const fiber = devtoolsInstance.data;
      appendHostInstancesByFiber(fiber, hostInstances);
      return;
    }
    // Search the tree for the nearest child Fiber and add all its host instances.
    // TODO: If the true nearest Fiber is filtered, we might skip it and instead include all
    // the children below it. In the extreme case, searching the whole tree.
    for (
      let child = devtoolsInstance.firstChild;
      child !== null;
      child = child.nextSibling
    ) {
      appendHostInstancesByDevToolsInstance(child, hostInstances);
    }
  }

  function appendHostInstancesByFiber(
    fiber: Fiber,
    hostInstances: Array<HostInstance>,
  ): void {
    // Next we'll drill down this component to find all HostComponent/Text.
    let node: Fiber = fiber;
    while (true) {
      if (
        node.tag === HostComponent ||
        node.tag === HostText ||
        node.tag === HostSingleton ||
        node.tag === HostHoistable
      ) {
        const hostInstance = node.stateNode || getResourceInstance(node);
        if (hostInstance) {
          hostInstances.push(hostInstance);
        }
      } else if (node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === fiber) {
        return;
      }
      while (!node.sibling) {
        if (!node.return || node.return === fiber) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  function findAllCurrentHostInstances(
    devtoolsInstance: DevToolsInstance,
  ): $ReadOnlyArray<HostInstance> {
    const hostInstances: Array<HostInstance> = [];
    appendHostInstancesByDevToolsInstance(devtoolsInstance, hostInstances);
    return hostInstances;
  }

  function findHostInstancesForElementID(id: number) {
    try {
      const devtoolsInstance = idToDevToolsInstanceMap.get(id);
      if (devtoolsInstance === undefined) {
        console.warn(`Could not find DevToolsInstance with id "${id}"`);
        return null;
      }
      return findAllCurrentHostInstances(devtoolsInstance);
    } catch (err) {
      // The fiber might have unmounted by now.
      return null;
    }
  }

  function findLastKnownRectsForID(id: number): null | Array<Rect> {
    try {
      const devtoolsInstance = idToDevToolsInstanceMap.get(id);
      if (devtoolsInstance === undefined) {
        console.warn(`Could not find DevToolsInstance with id "${id}"`);
        return null;
      }
      if (devtoolsInstance.suspenseNode === null) {
        return null;
      }
      return devtoolsInstance.suspenseNode.rects;
    } catch (err) {
      // The fiber might have unmounted by now.
      return null;
    }
  }

  function getDisplayNameForElementID(id: number): null | string {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      return null;
    }
    if (devtoolsInstance.kind === FIBER_INSTANCE) {
      const fiber = devtoolsInstance.data;
      if (fiber.tag === HostRoot) {
        // The only reason you'd inspect a HostRoot is to show it as a SuspenseNode.
        return 'Initial Paint';
      }
      if (fiber.tag === SuspenseComponent || fiber.tag === ActivityComponent) {
        // For Suspense and Activity components, we can show a better name
        // by using the name prop or their owner.
        const props = fiber.memoizedProps;
        if (props.name != null) {
          return props.name;
        }
        const owner = getUnfilteredOwner(fiber);
        if (owner != null) {
          if (typeof owner.tag === 'number') {
            return getDisplayNameForFiber(owner as any);
          } else {
            return owner.name || '';
          }
        }
      }
      return getDisplayNameForFiber(fiber);
    } else {
      return devtoolsInstance.data.name || '';
    }
  }

  function getNearestSuspenseNode(instance: DevToolsInstance): SuspenseNode {
    while (instance.suspenseNode === null) {
      if (instance.parent === null) {
        throw new Error(
          'There should always be a SuspenseNode parent on a mounted instance.',
        );
      }
      instance = instance.parent;
    }
    return instance.suspenseNode;
  }

  function getNearestMountedDOMNode(publicInstance: Element): null | Element {
    let domNode: null | Element = publicInstance;
    while (domNode && !publicInstanceToDevToolsInstanceMap.has(domNode)) {
      // $FlowFixMe[incompatible-type]: In practice this is either null or Element.
      domNode = domNode.parentNode;
    }
    return domNode;
  }

  function getElementIDForHostInstance(
    publicInstance: HostInstance,
  ): number | null {
    const instance = publicInstanceToDevToolsInstanceMap.get(publicInstance);
    if (instance !== undefined) {
      if (instance.kind === FILTERED_FIBER_INSTANCE) {
        // A Filtered Fiber Instance will always have a Virtual Instance as a parent.
        return (instance.parent as any as VirtualInstance).id;
      }
      return instance.id;
    }
    return null;
  }

  function getSuspenseNodeIDForHostInstance(
    publicInstance: HostInstance,
  ): number | null {
    const instance = publicInstanceToDevToolsInstanceMap.get(publicInstance);
    if (instance !== undefined) {
      // Pick nearest unfiltered SuspenseNode instance.
      let suspenseInstance = instance;
      while (
        suspenseInstance.suspenseNode === null ||
        suspenseInstance.kind === FILTERED_FIBER_INSTANCE
      ) {
        if (suspenseInstance.parent === null) {
          // We shouldn't get here since we'll always have a suspenseNode at the root.
          return null;
        }
        suspenseInstance = suspenseInstance.parent;
      }
      return suspenseInstance.id;
    }
    return null;
  }

  function getElementAttributeByPath(
    id: number,
    path: Array<string | number>,
  ): mixed {
    if (isMostRecentlyInspectedElement(id)) {
      return getInObject(
        mostRecentlyInspectedElement as any as InspectedElement,
        path,
      );
    }
    return undefined;
  }

  function getElementSourceFunctionById(id: number): null | Function {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return null;
    }
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      // TODO: Handle VirtualInstance.
      return null;
    }
    const fiber = devtoolsInstance.data;

    const {elementType, tag, type} = fiber;

    switch (tag) {
      case ClassComponent:
      case IncompleteClassComponent:
      case IncompleteFunctionComponent:
      case IndeterminateComponent:
      case FunctionComponent:
        return type;
      case ForwardRef:
        return type.render;
      case MemoComponent:
      case SimpleMemoComponent:
        return elementType != null && elementType.type != null
          ? elementType.type
          : type;
      default:
        return null;
    }
  }

  function instanceToSerializedElement(
    instance: FiberInstance | VirtualInstance,
  ): SerializedElement {
    if (instance.kind === FIBER_INSTANCE) {
      const fiber = instance.data;
      return {
        displayName: getDisplayNameForFiber(fiber) || 'Anonymous',
        id: instance.id,
        key:
          fiber.key === REACT_OPTIMISTIC_KEY
            ? 'React.optimisticKey'
            : fiber.key,
        env: null,
        stack:
          fiber._debugOwner == null || fiber._debugStack == null
            ? null
            : parseStackTrace(fiber._debugStack, 1),
        type: getElementTypeForFiber(fiber),
      };
    } else {
      const componentInfo = instance.data;
      return {
        displayName: componentInfo.name || 'Anonymous',
        id: instance.id,
        key:
          componentInfo.key == null ||
          componentInfo.key === REACT_OPTIMISTIC_KEY
            ? 'React.optimisticKey'
            : componentInfo.key,
        env: componentInfo.env == null ? null : componentInfo.env,
        stack:
          componentInfo.owner == null || componentInfo.debugStack == null
            ? null
            : parseStackTrace(componentInfo.debugStack, 1),
        type: ElementTypeVirtual,
      };
    }
  }

  function getOwnersList(id: number): Array<SerializedElement> | null {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return null;
    }
    const self = instanceToSerializedElement(devtoolsInstance);
    const owners = getOwnersListFromInstance(devtoolsInstance);
    // This is particular API is prefixed with the current instance too for some reason.
    if (owners === null) {
      return [self];
    }
    owners.unshift(self);
    owners.reverse();
    return owners;
  }

  function getOwnersListFromInstance(
    instance: DevToolsInstance,
  ): Array<SerializedElement> | null {
    let owner = getUnfilteredOwner(instance.data);
    if (owner === null) {
      return null;
    }
    const owners: Array<SerializedElement> = [];
    let parentInstance: null | DevToolsInstance = instance.parent;
    while (parentInstance !== null && owner !== null) {
      const ownerInstance = findNearestOwnerInstance(parentInstance, owner);
      if (ownerInstance !== null) {
        owners.push(instanceToSerializedElement(ownerInstance));
        // Get the next owner and keep searching from the previous match.
        owner = getUnfilteredOwner(owner);
        parentInstance = ownerInstance.parent;
      } else {
        break;
      }
    }
    return owners;
  }

  function getUnfilteredOwner(
    owner: ReactComponentInfo | Fiber | null | void,
  ): ReactComponentInfo | Fiber | null {
    if (owner == null) {
      return null;
    }
    if (typeof owner.tag === 'number') {
      const ownerFiber: Fiber = owner as any; // Refined
      owner = ownerFiber._debugOwner;
    } else {
      const ownerInfo: ReactComponentInfo = owner as any; // Refined
      owner = ownerInfo.owner;
    }
    while (owner) {
      if (typeof owner.tag === 'number') {
        const ownerFiber: Fiber = owner as any; // Refined
        if (!shouldFilterFiber(ownerFiber)) {
          return ownerFiber;
        }
        owner = ownerFiber._debugOwner;
      } else {
        const ownerInfo: ReactComponentInfo = owner as any; // Refined
        if (!shouldFilterVirtual(ownerInfo, null)) {
          return ownerInfo;
        }
        owner = ownerInfo.owner;
      }
    }
    return null;
  }

  function findNearestOwnerInstance(
    parentInstance: null | DevToolsInstance,
    owner: void | null | ReactComponentInfo | Fiber,
  ): null | FiberInstance | VirtualInstance {
    if (owner == null) {
      return null;
    }
    // Search the parent path for any instance that matches this kind of owner.
    while (parentInstance !== null) {
      if (
        parentInstance.data === owner ||
        // Typically both owner and instance.data would refer to the current version of a Fiber
        // but it is possible for memoization to ignore the owner on the JSX. Then the new Fiber
        // isn't propagated down as the new owner. In that case we might match the alternate
        // instead. This is a bit hacky but the fastest check since type casting owner to a Fiber
        // needs a duck type check anyway.
        parentInstance.data === (owner as any).alternate
      ) {
        if (parentInstance.kind === FILTERED_FIBER_INSTANCE) {
          return null;
        }
        return parentInstance;
      }
      parentInstance = parentInstance.parent;
    }
    // It is technically possible to create an element and render it in a different parent
    // but this is a weird edge case and it is worth not having to scan the tree or keep
    // a register for every fiber/component info.
    return null;
  }

  function inspectHooks(fiber: Fiber): HooksTree {
    const originalConsoleMethods: {[string]: $FlowFixMe} = {};

    // Temporarily disable all console logging before re-running the hook.
    for (const method in console) {
      try {
        // $FlowFixMe[invalid-computed-prop]
        originalConsoleMethods[method] = console[method];
        // $FlowFixMe[prop-missing]
        console[method] = () => {};
      } catch (error) {}
    }

    try {
      return inspectHooksOfFiber(fiber, getDispatcherRef(renderer));
    } finally {
      // Restore original console functionality.
      for (const method in originalConsoleMethods) {
        try {
          // $FlowFixMe[prop-missing]
          console[method] = originalConsoleMethods[method];
        } catch (error) {}
      }
    }
  }

  function getSuspendedByOfSuspenseNode(
    suspenseNode: SuspenseNode,
    filterByChildInstance: null | DevToolsInstance, // only include suspended by instances in this subtree
  ): Array<SerializedAsyncInfo> {
    // Collect all ReactAsyncInfo that was suspending this SuspenseNode but
    // isn't also in any parent set.
    const result: Array<SerializedAsyncInfo> = [];
    if (!suspenseNode.hasUniqueSuspenders) {
      return result;
    }
    // Cache the inspection of Hooks in case we need it for multiple entries.
    // We don't need a full map here since it's likely that every ioInfo that's unique
    // to a specific instance will have those appear in order of when that instance was discovered.
    let hooksCacheKey: null | DevToolsInstance = null;
    let hooksCache: null | HooksTree = null;
    // Collect the stream entries with the highest byte offset and end time.
    const streamEntries: Map<
      Promise<mixed>,
      {
        asyncInfo: ReactAsyncInfo,
        instance: DevToolsInstance,
        hooks: null | HooksTree,
      },
    > = new Map();
    suspenseNode.suspendedBy.forEach((set, ioInfo) => {
      let parentNode = suspenseNode.parent;
      while (parentNode !== null) {
        if (parentNode.suspendedBy.has(ioInfo)) {
          return;
        }
        parentNode = parentNode.parent;
      }
      // We have the ioInfo but we need to find at least one corresponding await
      // to go along with it. We don't really need to show every child that awaits the same
      // thing so we just pick the first one that is still alive.
      if (set.size === 0) {
        return;
      }
      let firstInstance: null | DevToolsInstance = null;
      if (filterByChildInstance === null) {
        firstInstance = set.values().next().value as any;
      } else {
        // eslint-disable-next-line no-for-of-loops/no-for-of-loops
        for (const childInstance of set.values()) {
          if (firstInstance === null) {
            firstInstance = childInstance;
          }
          if (
            childInstance !== filterByChildInstance &&
            !isChildOf(
              filterByChildInstance,
              childInstance,
              suspenseNode.instance,
            )
          ) {
            // Something suspended on this outside the filtered instance. That means that
            // it is not unique to just this filtered instance so we skip including it.
            return;
          }
        }
      }
      if (firstInstance !== null && firstInstance.suspendedBy !== null) {
        const asyncInfo = getAwaitInSuspendedByFromIO(
          firstInstance.suspendedBy,
          ioInfo,
        );
        if (asyncInfo !== null) {
          let hooks: null | HooksTree = null;
          if (asyncInfo.stack == null && asyncInfo.owner == null) {
            if (hooksCacheKey === firstInstance) {
              hooks = hooksCache;
            } else if (firstInstance.kind !== VIRTUAL_INSTANCE) {
              const fiber = firstInstance.data;
              if (
                fiber.dependencies &&
                fiber.dependencies._debugThenableState
              ) {
                // This entry had no stack nor owner but this Fiber used Hooks so we might
                // be able to get the stack from the Hook.
                hooksCacheKey = firstInstance;
                hooksCache = hooks = inspectHooks(fiber);
              }
            }
          }
          const newIO = asyncInfo.awaited;
          if (
            (newIO.name === 'RSC stream' || newIO.name === 'rsc stream') &&
            newIO.value != null
          ) {
            const streamPromise = newIO.value;
            // Special case RSC stream entries to pick the last entry keyed by the stream.
            const existingEntry = streamEntries.get(streamPromise);
            if (existingEntry === undefined) {
              streamEntries.set(streamPromise, {
                asyncInfo,
                instance: firstInstance,
                hooks,
              });
            } else {
              const existingIO = existingEntry.asyncInfo.awaited;
              if (
                newIO !== existingIO &&
                ((newIO.byteSize !== undefined &&
                  existingIO.byteSize !== undefined &&
                  newIO.byteSize > existingIO.byteSize) ||
                  newIO.end > existingIO.end)
              ) {
                // The new entry is later in the stream that the old entry. Replace it.
                existingEntry.asyncInfo = asyncInfo;
                existingEntry.instance = firstInstance;
                existingEntry.hooks = hooks;
              }
            }
          } else {
            result.push(serializeAsyncInfo(asyncInfo, firstInstance, hooks));
          }
        }
      }
    });
    // Add any deduped stream entries.
    streamEntries.forEach(({asyncInfo, instance, hooks}) => {
      result.push(serializeAsyncInfo(asyncInfo, instance, hooks));
    });
    return result;
  }

  function getSuspendedByOfInstance(
    devtoolsInstance: DevToolsInstance,
    hooks: null | HooksTree,
  ): Array<SerializedAsyncInfo> {
    const suspendedBy = devtoolsInstance.suspendedBy;
    if (suspendedBy === null) {
      return [];
    }

    const foundIOEntries: Set<ReactIOInfo> = new Set();
    const streamEntries: Map<Promise<mixed>, ReactAsyncInfo> = new Map();
    const result: Array<SerializedAsyncInfo> = [];
    for (let i = 0; i < suspendedBy.length; i++) {
      const asyncInfo = suspendedBy[i];
      const ioInfo = asyncInfo.awaited;
      if (foundIOEntries.has(ioInfo)) {
        // We have already added this I/O entry to the result. We can dedupe it.
        // This can happen when an instance depends on the same data in mutliple places.
        continue;
      }
      foundIOEntries.add(ioInfo);
      if (
        (ioInfo.name === 'RSC stream' || ioInfo.name === 'rsc stream') &&
        ioInfo.value != null
      ) {
        const streamPromise = ioInfo.value;
        // Special case RSC stream entries to pick the last entry keyed by the stream.
        const existingEntry = streamEntries.get(streamPromise);
        if (existingEntry === undefined) {
          streamEntries.set(streamPromise, asyncInfo);
        } else {
          const existingIO = existingEntry.awaited;
          if (
            ioInfo !== existingIO &&
            ((ioInfo.byteSize !== undefined &&
              existingIO.byteSize !== undefined &&
              ioInfo.byteSize > existingIO.byteSize) ||
              ioInfo.end > existingIO.end)
          ) {
            // The new entry is later in the stream that the old entry. Replace it.
            streamEntries.set(streamPromise, asyncInfo);
          }
        }
      } else {
        result.push(serializeAsyncInfo(asyncInfo, devtoolsInstance, hooks));
      }
    }
    // Add any deduped stream entries.
    streamEntries.forEach(asyncInfo => {
      result.push(serializeAsyncInfo(asyncInfo, devtoolsInstance, hooks));
    });
    return result;
  }

  function getSuspendedByOfInstanceSubtree(
    devtoolsInstance: DevToolsInstance,
  ): Array<SerializedAsyncInfo> {
    // Get everything suspending below this instance down to the next Suspense node.
    // First find the parent Suspense boundary which will have accumulated everything
    let suspenseParentInstance = devtoolsInstance;
    while (suspenseParentInstance.suspenseNode === null) {
      if (suspenseParentInstance.parent === null) {
        // We don't expect to hit this. We should always find the root.
        return [];
      }
      suspenseParentInstance = suspenseParentInstance.parent;
    }
    const suspenseNode: SuspenseNode = suspenseParentInstance.suspenseNode;
    return getSuspendedByOfSuspenseNode(suspenseNode, devtoolsInstance);
  }

  const FALLBACK_THROTTLE_MS: number = 300;

  function getSuspendedByRange(
    suspenseNode: SuspenseNode,
  ): null | [number, number] {
    let min = Infinity;
    let max = -Infinity;
    suspenseNode.suspendedBy.forEach((_, ioInfo) => {
      if (ioInfo.end > max) {
        max = ioInfo.end;
      }
      if (ioInfo.start < min) {
        min = ioInfo.start;
      }
    });
    const parentSuspenseNode = suspenseNode.parent;
    if (parentSuspenseNode !== null) {
      let parentMax = -Infinity;
      parentSuspenseNode.suspendedBy.forEach((_, ioInfo) => {
        if (ioInfo.end > parentMax) {
          parentMax = ioInfo.end;
        }
      });
      // The parent max is theoretically the earlier the parent could've committed.
      // Therefore, the theoretical max that the child could be throttled is that plus 300ms.
      const throttleTime = parentMax + FALLBACK_THROTTLE_MS;
      if (throttleTime > max) {
        // If the theoretical throttle time is later than the earliest reveal then we extend
        // the max time to show that this is timespan could possibly get throttled.
        max = throttleTime;
      }

      // We use the end of the previous boundary as the start time for this boundary unless,
      // that's earlier than we'd need to expand to the full fallback throttle range. It
      // suggests that the parent was loaded earlier than this one.
      let startTime = max - FALLBACK_THROTTLE_MS;
      if (parentMax > startTime) {
        startTime = parentMax;
      }
      // If the first fetch of this boundary starts before that, then we use that as the start.
      if (startTime < min) {
        min = startTime;
      }
    }
    if (min < Infinity && max > -Infinity) {
      return [min, max];
    }
    return null;
  }

  function getAwaitStackFromHooks(
    hooks: HooksTree,
    asyncInfo: ReactAsyncInfo,
  ): null | ReactStackTrace {
    // TODO: We search through the hooks tree generated by inspectHooksOfFiber so that we can
    // use the information already extracted but ideally this search would be faster since we
    // could know which index to extract from the debug state.
    for (let i = 0; i < hooks.length; i++) {
      const node = hooks[i];
      const debugInfo = node.debugInfo;
      if (debugInfo != null && debugInfo.indexOf(asyncInfo) !== -1) {
        // Found a matching Hook. We'll now use its source location to construct a stack.
        const source = node.hookSource;
        if (
          source != null &&
          source.functionName !== null &&
          source.fileName !== null &&
          source.lineNumber !== null &&
          source.columnNumber !== null
        ) {
          // Unfortunately this is in a slightly different format. TODO: Unify HookNode with ReactCallSite.
          const callSite: ReactCallSite = [
            source.functionName,
            source.fileName,
            source.lineNumber,
            source.columnNumber,
            0,
            0,
            false,
          ];
          // As we return we'll add any custom hooks parent stacks to the array.
          return [callSite];
        } else {
          return [];
        }
      }
      // Otherwise, search the sub hooks of any custom hook.
      const matchedStack = getAwaitStackFromHooks(node.subHooks, asyncInfo);
      if (matchedStack !== null) {
        // Append this custom hook to the stack trace since it must have been called inside of it.
        const source = node.hookSource;
        if (
          source != null &&
          source.functionName !== null &&
          source.fileName !== null &&
          source.lineNumber !== null &&
          source.columnNumber !== null
        ) {
          // Unfortunately this is in a slightly different format. TODO: Unify HookNode with ReactCallSite.
          const callSite: ReactCallSite = [
            source.functionName,
            source.fileName,
            source.lineNumber,
            source.columnNumber,
            0,
            0,
            false,
          ];
          matchedStack.push(callSite);
        }
        return matchedStack;
      }
    }
    return null;
  }

  function serializeAsyncInfo(
    asyncInfo: ReactAsyncInfo,
    parentInstance: DevToolsInstance,
    hooks: null | HooksTree,
  ): SerializedAsyncInfo {
    const ioInfo = asyncInfo.awaited;
    const ioOwnerInstance = findNearestOwnerInstance(
      parentInstance,
      ioInfo.owner,
    );
    let awaitStack =
      asyncInfo.debugStack == null
        ? null
        : // While we have a ReactStackTrace on ioInfo.stack, that will point to the location on
          // the server. We need a location that points to the virtual source on the client which
          // we can then use to source map to the original location.
          parseStackTrace(asyncInfo.debugStack, 1);
    let awaitOwnerInstance: null | FiberInstance | VirtualInstance;
    if (
      asyncInfo.owner == null &&
      (awaitStack === null || awaitStack.length === 0)
    ) {
      // We had no owner nor stack for the await. This can happen if you render it as a child
      // or throw a Promise. Replace it with the parent as the await.
      awaitStack = null;
      awaitOwnerInstance =
        parentInstance.kind === FILTERED_FIBER_INSTANCE ? null : parentInstance;
      if (
        parentInstance.kind === FIBER_INSTANCE ||
        parentInstance.kind === FILTERED_FIBER_INSTANCE
      ) {
        const fiber = parentInstance.data;
        switch (fiber.tag) {
          case ClassComponent:
          case FunctionComponent:
          case IncompleteClassComponent:
          case IncompleteFunctionComponent:
          case IndeterminateComponent:
          case MemoComponent:
          case SimpleMemoComponent:
            // If we awaited in the child position of a component, then the best stack would be the
            // return callsite but we don't have that available so instead we skip. The callsite of
            // the JSX would be misleading in this case. The same thing happens with throw-a-Promise.
            if (hooks !== null) {
              // If this component used Hooks we might be able to instead infer the stack from the
              // use() callsite if this async info came from a hook. Let's search the tree to find it.
              awaitStack = getAwaitStackFromHooks(hooks, asyncInfo);
            }
            break;
          default:
            // If we awaited by passing a Promise to a built-in element, then the JSX callsite is a
            // good stack trace to use for the await.
            if (
              fiber._debugOwner != null &&
              fiber._debugStack != null &&
              typeof fiber._debugStack !== 'string'
            ) {
              awaitStack = parseStackTrace(fiber._debugStack, 1);
              awaitOwnerInstance = findNearestOwnerInstance(
                parentInstance,
                fiber._debugOwner,
              );
            }
        }
      }
    } else {
      awaitOwnerInstance = findNearestOwnerInstance(
        parentInstance,
        asyncInfo.owner,
      );
    }

    const value: any = ioInfo.value;
    let resolvedValue = undefined;
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof value.then === 'function'
    ) {
      switch (value.status) {
        case 'fulfilled':
          resolvedValue = value.value;
          break;
        case 'rejected':
          resolvedValue = value.reason;
          break;
      }
    }
    return {
      awaited: {
        name: ioInfo.name,
        description: getIODescription(resolvedValue),
        start: ioInfo.start,
        end: ioInfo.end,
        byteSize: ioInfo.byteSize == null ? null : ioInfo.byteSize,
        value: ioInfo.value == null ? null : ioInfo.value,
        env: ioInfo.env == null ? null : ioInfo.env,
        owner:
          ioOwnerInstance === null
            ? null
            : instanceToSerializedElement(ioOwnerInstance),
        stack:
          ioInfo.debugStack == null
            ? null
            : // While we have a ReactStackTrace on ioInfo.stack, that will point to the location on
              // the server. We need a location that points to the virtual source on the client which
              // we can then use to source map to the original location.
              parseStackTrace(ioInfo.debugStack, 1),
      },
      env: asyncInfo.env == null ? null : asyncInfo.env,
      owner:
        awaitOwnerInstance === null
          ? null
          : instanceToSerializedElement(awaitOwnerInstance),
      stack: awaitStack,
    };
  }

  // Fast path props lookup for React Native style editor.
  // Could use inspectElementRaw() but that would require shallow rendering hooks components,
  // and could also mess with memoization.
  function getInstanceAndStyle(id: number): InstanceAndStyle {
    let instance = null;
    let style = null;

    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return {instance, style};
    }
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      // TODO: Handle VirtualInstance.
      return {instance, style};
    }

    const fiber = devtoolsInstance.data;
    // $FlowFixMe[invalid-compare]
    if (fiber !== null) {
      instance = fiber.stateNode;

      if (fiber.memoizedProps !== null) {
        style = fiber.memoizedProps.style;
      }
    }

    return {instance, style};
  }

  function inspectElementRaw(id: number): InspectedElement | null {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return null;
    }
    if (devtoolsInstance.kind === VIRTUAL_INSTANCE) {
      return inspectVirtualInstanceRaw(devtoolsInstance);
    }
    if (devtoolsInstance.kind === FIBER_INSTANCE) {
      const isRoot = devtoolsInstance.parent === null;
      return isRoot
        ? inspectRootsRaw(devtoolsInstance.id)
        : inspectFiberInstanceRaw(devtoolsInstance);
    }
    devtoolsInstance as FilteredFiberInstance; // assert exhaustive
    throw new Error('Unsupported instance kind');
  }

  function inspectFiberInstanceRaw(
    fiberInstance: FiberInstance,
  ): InspectedElement | null {
    const fiber = fiberInstance.data;
    if (fiber == null) {
      return null;
    }

    const {
      stateNode,
      key,
      memoizedProps,
      memoizedState,
      dependencies,
      tag,
      type,
    } = fiber;

    const elementType = getElementTypeForFiber(fiber);

    const usesHooks =
      (tag === FunctionComponent ||
        tag === SimpleMemoComponent ||
        tag === ForwardRef) &&
      (!!memoizedState || !!dependencies);

    // TODO Show custom UI for Cache like we do for Suspense
    // For now, just hide state data entirely since it's not meant to be inspected.
    // Make sure delete, rename, and override of state handles all tags for which
    // we show state.
    const showState =
      tag === ClassComponent || tag === IncompleteClassComponent;

    const typeSymbol = getTypeSymbol(type);

    let canViewSource = false;
    let context = null;
    if (
      tag === ClassComponent ||
      tag === FunctionComponent ||
      tag === IncompleteClassComponent ||
      tag === IncompleteFunctionComponent ||
      tag === IndeterminateComponent ||
      tag === MemoComponent ||
      tag === ForwardRef ||
      tag === SimpleMemoComponent
    ) {
      canViewSource = true;
      if (stateNode && stateNode.context != null) {
        // Don't show an empty context object for class components that don't use the context API.
        const shouldHideContext =
          elementType === ElementTypeClass &&
          !(type.contextTypes || type.contextType);

        if (!shouldHideContext) {
          context = stateNode.context;
        }
      }
    } else if (
      // Detect pre-19 Context Consumers
      (typeSymbol === CONTEXT_NUMBER || typeSymbol === CONTEXT_SYMBOL_STRING) &&
      !(
        // In 19+, CONTEXT_SYMBOL_STRING means a Provider instead.
        // It will be handled in a different branch below.
        // Eventually, this entire branch can be removed.
        (type._context === undefined && type.Provider === type)
      )
    ) {
      // 16.3-16.5 read from "type" because the Consumer is the actual context object.
      // 16.6+ should read from "type._context" because Consumer can be different (in DEV).
      // NOTE Keep in sync with getDisplayNameForFiber()
      const consumerResolvedContext = type._context || type;

      // Global context value.
      context = consumerResolvedContext._currentValue || null;

      // Look for overridden value.
      let current = (fiber as any as Fiber).return;
      while (current !== null) {
        const currentType = current.type;
        const currentTypeSymbol = getTypeSymbol(currentType);
        if (
          currentTypeSymbol === PROVIDER_NUMBER ||
          currentTypeSymbol === PROVIDER_SYMBOL_STRING
        ) {
          // 16.3.0 exposed the context object as "context"
          // PR #12501 changed it to "_context" for 16.3.1+
          // NOTE Keep in sync with getDisplayNameForFiber()
          const providerResolvedContext =
            currentType._context || currentType.context;
          if (providerResolvedContext === consumerResolvedContext) {
            context = current.memoizedProps.value;
            break;
          }
        }

        current = current.return;
      }
    } else if (
      // Detect 19+ Context Consumers
      typeSymbol === CONSUMER_SYMBOL_STRING
    ) {
      // This branch is 19+ only, where Context.Provider === Context.
      // NOTE Keep in sync with getDisplayNameForFiber()
      const consumerResolvedContext = type._context;

      // Global context value.
      context = consumerResolvedContext._currentValue || null;

      // Look for overridden value.
      let current = (fiber as any as Fiber).return;
      while (current !== null) {
        const currentType = current.type;
        const currentTypeSymbol = getTypeSymbol(currentType);
        if (
          // In 19+, these are Context Providers
          currentTypeSymbol === CONTEXT_SYMBOL_STRING
        ) {
          const providerResolvedContext = currentType;
          if (providerResolvedContext === consumerResolvedContext) {
            context = current.memoizedProps.value;
            break;
          }
        }

        current = current.return;
      }
    }

    let hasLegacyContext = false;
    if (context !== null) {
      hasLegacyContext = !!type.contextTypes;

      // To simplify hydration and display logic for context, wrap in a value object.
      // Otherwise simple values (e.g. strings, booleans) become harder to handle.
      context = {value: context};
    }

    const owners: null | Array<SerializedElement> =
      getOwnersListFromInstance(fiberInstance);

    let hooks: null | HooksTree = null;
    if (usesHooks) {
      hooks = inspectHooks(fiber);
    }

    let rootType = null;
    let current = fiber;
    let hasErrorBoundary = false;
    let hasSuspenseBoundary = false;
    while (current.return !== null) {
      const temp = current;
      current = current.return;
      if (temp.tag === SuspenseComponent) {
        hasSuspenseBoundary = true;
      } else if (isErrorBoundary(ReactTypeOfWork, temp)) {
        hasErrorBoundary = true;
      }
    }
    const fiberRoot = current.stateNode;
    if (fiberRoot != null && fiberRoot._debugRootType !== null) {
      rootType = fiberRoot._debugRootType;
    }

    let isErrored = false;
    if (isErrorBoundary(ReactTypeOfWork, fiber)) {
      // if the current inspected element is an error boundary,
      // either that we want to use it to toggle off error state
      // or that we allow to force error state on it if it's within another
      // error boundary
      //
      // TODO: This flag is a leaked implementation detail. Once we start
      // releasing DevTools in lockstep with React, we should import a function
      // from the reconciler instead.
      const DidCapture = 0b000000000000000000010000000;
      isErrored =
        (fiber.flags & DidCapture) !== 0 ||
        forceErrorForFibers.get(fiber) === true ||
        (fiber.alternate !== null &&
          forceErrorForFibers.get(fiber.alternate) === true);
    }

    const plugins: Plugins = {
      stylex: null,
    };

    if (enableStyleXFeatures) {
      if (memoizedProps != null && memoizedProps.hasOwnProperty('xstyle')) {
        plugins.stylex = getStyleXData(memoizedProps.xstyle);
      }
    }

    let source = null;
    if (canViewSource) {
      source = getSourceForFiberInstance(fiberInstance);
    }

    let componentLogsEntry = fiberToComponentLogsMap.get(fiber);
    if (componentLogsEntry === undefined && fiber.alternate !== null) {
      componentLogsEntry = fiberToComponentLogsMap.get(fiber.alternate);
    }

    let nativeTag = null;
    if (elementType === ElementTypeHostComponent) {
      nativeTag = getNativeTag(fiber.stateNode);
    }

    let isSuspended: boolean | null = null;
    if (tag === SuspenseComponent) {
      isSuspended = memoizedState !== null;
    }

    const suspendedBy =
      fiberInstance.suspenseNode !== null
        ? // If this is a Suspense boundary, then we include everything in the subtree that might suspend
          // this boundary down to the next Suspense boundary.
          getSuspendedByOfSuspenseNode(fiberInstance.suspenseNode, null)
        : tag === ActivityComponent
          ? // For Activity components we show everything that suspends the subtree down to the next boundary
            // so that you can see what suspends a Transition at that level.
            getSuspendedByOfInstanceSubtree(fiberInstance)
          : // This set is an edge case where if you pass a promise to a Client Component into a children
            // position without a Server Component as the direct parent. E.g. <div>{promise}</div>
            // In this case, this becomes associated with the Client/Host Component where as normally
            // you'd expect these to be associated with the Server Component that awaited the data.
            // TODO: Prepend other suspense sources like css, images and use().
            getSuspendedByOfInstance(fiberInstance, hooks);
    const suspendedByRange = getSuspendedByRange(
      getNearestSuspenseNode(fiberInstance),
    );

    let unknownSuspenders = UNKNOWN_SUSPENDERS_NONE;
    if (
      fiberInstance.suspenseNode !== null &&
      fiberInstance.suspenseNode.hasUnknownSuspenders &&
      !isSuspended
    ) {
      // Something unknown threw to suspended this boundary. Let's figure out why that might be.
      if (renderer.bundleType === 0) {
        unknownSuspenders = UNKNOWN_SUSPENDERS_REASON_PRODUCTION;
      } else if (!('_debugInfo' in fiber)) {
        // TODO: We really should detect _debugThenable and the auto-instrumentation for lazy/thenables too.
        unknownSuspenders = UNKNOWN_SUSPENDERS_REASON_OLD_VERSION;
      } else {
        unknownSuspenders = UNKNOWN_SUSPENDERS_REASON_THROWN_PROMISE;
      }
    }

    return {
      id: fiberInstance.id,

      // Does the current renderer support editable hooks and function props?
      canEditHooks: typeof overrideHookState === 'function',
      canEditFunctionProps: typeof overrideProps === 'function',

      // Does the current renderer support advanced editing interface?
      canEditHooksAndDeletePaths:
        typeof overrideHookStateDeletePath === 'function',
      canEditHooksAndRenamePaths:
        typeof overrideHookStateRenamePath === 'function',
      canEditFunctionPropsDeletePaths:
        typeof overridePropsDeletePath === 'function',
      canEditFunctionPropsRenamePaths:
        typeof overridePropsRenamePath === 'function',

      canToggleError: supportsTogglingError && hasErrorBoundary,
      // Is this error boundary in error state.
      isErrored,

      canToggleSuspense:
        supportsTogglingSuspense &&
        hasSuspenseBoundary &&
        // If it's showing the real content, we can always flip fallback.
        (!isSuspended ||
          // If it's showing fallback because we previously forced it to,
          // allow toggling it back to remove the fallback override.
          forceFallbackForFibers.has(fiber) ||
          (fiber.alternate !== null &&
            forceFallbackForFibers.has(fiber.alternate))),
      isSuspended: isSuspended,

      source,

      stack:
        fiber._debugOwner == null || fiber._debugStack == null
          ? null
          : parseStackTrace(fiber._debugStack, 1),

      // Does the component have legacy context attached to it.
      hasLegacyContext,

      key:
        key != null
          ? key === REACT_OPTIMISTIC_KEY
            ? 'React.optimisticKey'
            : key
          : null,

      type: elementType,

      // Inspectable properties.
      // TODO Review sanitization approach for the below inspectable values.
      context,
      hooks,
      props: memoizedProps,
      state: showState ? memoizedState : null,
      errors:
        componentLogsEntry === undefined
          ? []
          : Array.from(componentLogsEntry.errors.entries()),
      warnings:
        componentLogsEntry === undefined
          ? []
          : Array.from(componentLogsEntry.warnings.entries()),

      suspendedBy: suspendedBy,
      suspendedByRange: suspendedByRange,
      unknownSuspenders: unknownSuspenders,

      // List of owners
      owners,

      env: null,

      rootType,
      rendererPackageName: renderer.rendererPackageName,
      rendererVersion: renderer.version,

      plugins,

      nativeTag,
    };
  }

  function inspectVirtualInstanceRaw(
    virtualInstance: VirtualInstance,
  ): InspectedElement | null {
    const source = getSourceForInstance(virtualInstance);

    const componentInfo = virtualInstance.data;
    const key =
      typeof componentInfo.key === 'string' ? componentInfo.key : null;
    const props = componentInfo.props == null ? null : componentInfo.props;
    const owners: null | Array<SerializedElement> =
      getOwnersListFromInstance(virtualInstance);

    let rootType = null;
    let hasErrorBoundary = false;
    let hasSuspenseBoundary = false;
    const nearestFiber = getNearestFiber(virtualInstance);
    if (nearestFiber !== null) {
      let current = nearestFiber;
      while (current.return !== null) {
        const temp = current;
        current = current.return;
        if (temp.tag === SuspenseComponent) {
          hasSuspenseBoundary = true;
        } else if (isErrorBoundary(ReactTypeOfWork, temp)) {
          hasErrorBoundary = true;
        }
      }
      const fiberRoot = current.stateNode;
      if (fiberRoot != null && fiberRoot._debugRootType !== null) {
        rootType = fiberRoot._debugRootType;
      }
    }

    const plugins: Plugins = {
      stylex: null,
    };

    const componentLogsEntry =
      componentInfoToComponentLogsMap.get(componentInfo);

    const isSuspended = null;
    // Things that Suspended this Server Component (use(), awaits and direct child promises)
    const suspendedBy = getSuspendedByOfInstance(virtualInstance, null);
    const suspendedByRange = getSuspendedByRange(
      getNearestSuspenseNode(virtualInstance),
    );

    return {
      id: virtualInstance.id,

      canEditHooks: false,
      canEditFunctionProps: false,

      canEditHooksAndDeletePaths: false,
      canEditHooksAndRenamePaths: false,
      canEditFunctionPropsDeletePaths: false,
      canEditFunctionPropsRenamePaths: false,

      canToggleError: supportsTogglingError && hasErrorBoundary,
      isErrored: false,

      canToggleSuspense: supportsTogglingSuspense && hasSuspenseBoundary,
      isSuspended: isSuspended,

      source,

      stack:
        componentInfo.owner == null || componentInfo.debugStack == null
          ? null
          : parseStackTrace(componentInfo.debugStack, 1),

      // Does the component have legacy context attached to it.
      hasLegacyContext: false,

      key: key,

      type: ElementTypeVirtual,

      // Inspectable properties.
      // TODO Review sanitization approach for the below inspectable values.
      context: null,
      hooks: null,
      props: props,
      state: null,
      errors:
        componentLogsEntry === undefined
          ? []
          : Array.from(componentLogsEntry.errors.entries()),
      warnings:
        componentLogsEntry === undefined
          ? []
          : Array.from(componentLogsEntry.warnings.entries()),

      suspendedBy: suspendedBy,
      suspendedByRange: suspendedByRange,
      unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,

      // List of owners
      owners,

      env: componentInfo.env == null ? null : componentInfo.env,

      rootType,
      rendererPackageName: renderer.rendererPackageName,
      rendererVersion: renderer.version,

      plugins,

      nativeTag: null,
    };
  }

  let mostRecentlyInspectedElement: InspectedElement | null = null;
  let hasElementUpdatedSinceLastInspected: boolean = false;
  let currentlyInspectedPaths: Object = {};

  function isMostRecentlyInspectedElement(id: number): boolean {
    if (mostRecentlyInspectedElement === null) {
      return false;
    }
    if (mostRecentlyInspectedElement.id === id) {
      return true;
    }

    if (mostRecentlyInspectedElement.type === ElementTypeRoot) {
      // we inspected the screen recently. If we're inspecting another root, we're
      // still inspecting the screen.
      const instance = idToDevToolsInstanceMap.get(id);
      return (
        instance !== undefined &&
        instance.kind === FIBER_INSTANCE &&
        instance.parent === null
      );
    }
    return false;
  }

  function isMostRecentlyInspectedElementCurrent(id: number): boolean {
    return (
      isMostRecentlyInspectedElement(id) && !hasElementUpdatedSinceLastInspected
    );
  }

  // Track the intersection of currently inspected paths,
  // so that we can send their data along if the element is re-rendered.
  function mergeInspectedPaths(path: Array<string | number>) {
    let current = currentlyInspectedPaths;
    path.forEach(key => {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    });
  }

  function createIsPathAllowed(
    key: string | null,
    secondaryCategory: 'suspendedBy' | 'hooks' | null,
  ) {
    // This function helps prevent previously-inspected paths from being dehydrated in updates.
    // This is important to avoid a bad user experience where expanded toggles collapse on update.
    return function isPathAllowed(path: Array<string | number>): boolean {
      switch (secondaryCategory) {
        case 'hooks':
          if (path.length === 1) {
            // Never dehydrate the "hooks" object at the top levels.
            return true;
          }

          if (
            path[path.length - 2] === 'hookSource' &&
            path[path.length - 1] === 'fileName'
          ) {
            // It's important to preserve the full file name (URL) for hook sources
            // in case the user has enabled the named hooks feature.
            // Otherwise the frontend may end up with a partial URL which it can't load.
            return true;
          }

          if (
            path[path.length - 1] === 'subHooks' ||
            path[path.length - 2] === 'subHooks'
          ) {
            // Dehydrating the 'subHooks' property makes the HooksTree UI a lot more complicated,
            // so it's easiest for now if we just don't break on this boundary.
            // We can always dehydrate a level deeper (in the value object).
            return true;
          }
          break;
        case 'suspendedBy':
          if (path.length < 5) {
            // Never dehydrate anything above suspendedBy[index].awaited.value
            // Those are part of the internal meta data. We only dehydrate inside the Promise.
            return true;
          }
          break;
        default:
          break;
      }

      let current =
        key === null ? currentlyInspectedPaths : currentlyInspectedPaths[key];
      if (!current) {
        return false;
      }
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
        if (!current) {
          return false;
        }
      }
      return true;
    };
  }

  function updateSelectedElement(inspectedElement: InspectedElement): void {
    const {hooks, id, props} = inspectedElement;

    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return;
    }
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      // TODO: Handle VirtualInstance.
      return;
    }

    const fiber = devtoolsInstance.data;
    const {elementType, stateNode, tag, type} = fiber;

    switch (tag) {
      case ClassComponent:
      case IncompleteClassComponent:
      case IndeterminateComponent:
        global.$r = stateNode;
        break;
      case IncompleteFunctionComponent:
      case FunctionComponent:
        global.$r = {
          hooks,
          props,
          type,
        };
        break;
      case ForwardRef:
        global.$r = {
          hooks,
          props,
          type: type.render,
        };
        break;
      case MemoComponent:
      case SimpleMemoComponent:
        global.$r = {
          hooks,
          props,
          type:
            elementType != null && elementType.type != null
              ? elementType.type
              : type,
        };
        break;
      default:
        global.$r = null;
        break;
    }
  }

  function storeAsGlobal(
    id: number,
    path: Array<string | number>,
    count: number,
  ): void {
    if (isMostRecentlyInspectedElement(id)) {
      const value = getInObject(
        mostRecentlyInspectedElement as any as InspectedElement,
        path,
      );
      const key = `$reactTemp${count}`;

      window[key] = value;

      console.log(key);
      console.log(value);
    }
  }

  function getSerializedElementValueByPath(
    id: number,
    path: Array<string | number>,
  ): ?string {
    if (isMostRecentlyInspectedElement(id)) {
      const valueToCopy = getInObject(
        mostRecentlyInspectedElement as any as InspectedElement,
        path,
      );

      return serializeToString(valueToCopy);
    }
  }

  function inspectElement(
    requestID: number,
    id: number,
    path: Array<string | number> | null,
    forceFullData: boolean,
  ): InspectedElementPayload {
    if (path !== null) {
      mergeInspectedPaths(path);
    }

    if (isMostRecentlyInspectedElement(id) && !forceFullData) {
      if (!hasElementUpdatedSinceLastInspected) {
        if (path !== null) {
          let secondaryCategory: 'suspendedBy' | 'hooks' | null = null;
          if (path[0] === 'hooks' || path[0] === 'suspendedBy') {
            secondaryCategory = path[0];
          }

          // If this element has not been updated since it was last inspected,
          // we can just return the subset of data in the newly-inspected path.
          return {
            id,
            responseID: requestID,
            type: 'hydrated-path',
            path,
            value: cleanForBridge(
              getInObject(
                mostRecentlyInspectedElement as any as InspectedElement,
                path,
              ),
              createIsPathAllowed(null, secondaryCategory),
              path,
            ),
          };
        } else {
          // If this element has not been updated since it was last inspected, we don't need to return it.
          // Instead we can just return the ID to indicate that it has not changed.
          return {
            id,
            responseID: requestID,
            type: 'no-change',
          };
        }
      }
    } else {
      currentlyInspectedPaths = {};
    }

    hasElementUpdatedSinceLastInspected = false;

    try {
      mostRecentlyInspectedElement = inspectElementRaw(id);
    } catch (error) {
      // the error name is synced with ReactDebugHooks
      if (error.name === 'ReactDebugToolsRenderError') {
        let message = 'Error rendering inspected element.';
        let stack;
        // Log error & cause for user to debug
        console.error(message + '\n\n', error);
        if (error.cause != null) {
          const componentName = getDisplayNameForElementID(id);
          console.error(
            'React DevTools encountered an error while trying to inspect hooks. ' +
              'This is most likely caused by an error in current inspected component' +
              (componentName != null ? `: "${componentName}".` : '.') +
              '\nThe error thrown in the component is: \n\n',
            error.cause,
          );
          if (error.cause instanceof Error) {
            message = error.cause.message || message;
            stack = error.cause.stack;
          }
        }

        return {
          type: 'error',
          errorType: 'user',
          id,
          responseID: requestID,
          message,
          stack,
        };
      }

      // the error name is synced with ReactDebugHooks
      if (error.name === 'ReactDebugToolsUnsupportedHookError') {
        return {
          type: 'error',
          errorType: 'unknown-hook',
          id,
          responseID: requestID,
          message:
            'Unsupported hook in the react-debug-tools package: ' +
            error.message,
        };
      }

      // Log Uncaught Error
      console.error('Error inspecting element.\n\n', error);

      return {
        type: 'error',
        errorType: 'uncaught',
        id,
        responseID: requestID,
        message: error.message,
        stack: error.stack,
      };
    }

    if (mostRecentlyInspectedElement === null) {
      return {
        id,
        responseID: requestID,
        type: 'not-found',
      };
    }
    const inspectedElement = mostRecentlyInspectedElement;

    // Any time an inspected element has an update,
    // we should update the selected $r value as wel.
    // Do this before dehydration (cleanForBridge).
    updateSelectedElement(inspectedElement);

    // Clone before cleaning so that we preserve the full data.
    // This will enable us to send patches without re-inspecting if hydrated paths are requested.
    // (Reducing how often we shallow-render is a better DX for function components that use hooks.)
    const cleanedInspectedElement = {...inspectedElement};
    // $FlowFixMe[prop-missing] found when upgrading Flow
    cleanedInspectedElement.context = cleanForBridge(
      inspectedElement.context,
      createIsPathAllowed('context', null),
    );
    // $FlowFixMe[prop-missing] found when upgrading Flow
    cleanedInspectedElement.hooks = cleanForBridge(
      inspectedElement.hooks,
      createIsPathAllowed('hooks', 'hooks'),
    );
    // $FlowFixMe[prop-missing] found when upgrading Flow
    cleanedInspectedElement.props = cleanForBridge(
      inspectedElement.props,
      createIsPathAllowed('props', null),
    );
    // $FlowFixMe[prop-missing] found when upgrading Flow
    cleanedInspectedElement.state = cleanForBridge(
      inspectedElement.state,
      createIsPathAllowed('state', null),
    );
    // $FlowFixMe[prop-missing] found when upgrading Flow
    cleanedInspectedElement.suspendedBy = cleanForBridge(
      inspectedElement.suspendedBy,
      createIsPathAllowed('suspendedBy', 'suspendedBy'),
    );

    return {
      id,
      responseID: requestID,
      type: 'full-data',
      // $FlowFixMe[prop-missing] found when upgrading Flow
      value: cleanedInspectedElement,
    };
  }

  function inspectRootsRaw(arbitraryRootID: number): InspectedElement | null {
    const roots = hook.getFiberRoots(rendererID);
    if (roots.size === 0) {
      return null;
    }

    const inspectedRoots: InspectedElement = {
      // invariants
      id: arbitraryRootID,
      type: ElementTypeRoot,
      // Properties we merge
      isErrored: false,
      errors: [],
      warnings: [],
      suspendedBy: [],
      suspendedByRange: null,
      // TODO: How to merge these?
      unknownSuspenders: UNKNOWN_SUSPENDERS_NONE,
      // Properties where merging doesn't make sense so we ignore them entirely in the UI
      rootType: null,
      plugins: {stylex: null},
      nativeTag: null,
      env: null,
      source: null,
      stack: null,
      rendererPackageName: null,
      rendererVersion: null,
      // These don't make sense for a Root. They're just bottom values.
      key: null,
      canEditFunctionProps: false,
      canEditHooks: false,
      canEditFunctionPropsDeletePaths: false,
      canEditFunctionPropsRenamePaths: false,
      canEditHooksAndDeletePaths: false,
      canEditHooksAndRenamePaths: false,
      canToggleError: false,
      canToggleSuspense: false,
      isSuspended: false,
      hasLegacyContext: false,
      context: null,
      hooks: null,
      props: null,
      state: null,
      owners: null,
    };

    let minSuspendedByRange = Infinity;
    let maxSuspendedByRange = -Infinity;
    roots.forEach(root => {
      const rootInstance = rootToFiberInstanceMap.get(root);
      if (rootInstance === undefined) {
        throw new Error(
          'Expected a root instance to exist for this Fiber root',
        );
      }
      const inspectedRoot = inspectFiberInstanceRaw(rootInstance);
      if (inspectedRoot === null) {
        return;
      }

      if (inspectedRoot.isErrored) {
        inspectedRoots.isErrored = true;
      }
      for (let i = 0; i < inspectedRoot.errors.length; i++) {
        inspectedRoots.errors.push(inspectedRoot.errors[i]);
      }
      for (let i = 0; i < inspectedRoot.warnings.length; i++) {
        inspectedRoots.warnings.push(inspectedRoot.warnings[i]);
      }
      for (let i = 0; i < inspectedRoot.suspendedBy.length; i++) {
        inspectedRoots.suspendedBy.push(inspectedRoot.suspendedBy[i]);
      }
      const suspendedByRange = inspectedRoot.suspendedByRange;
      if (suspendedByRange !== null) {
        if (suspendedByRange[0] < minSuspendedByRange) {
          minSuspendedByRange = suspendedByRange[0];
        }
        if (suspendedByRange[1] > maxSuspendedByRange) {
          maxSuspendedByRange = suspendedByRange[1];
        }
      }
    });

    if (minSuspendedByRange !== Infinity || maxSuspendedByRange !== -Infinity) {
      inspectedRoots.suspendedByRange = [
        minSuspendedByRange,
        maxSuspendedByRange,
      ];
    }

    return inspectedRoots;
  }

  function logElementToConsole(id: number) {
    const result = isMostRecentlyInspectedElementCurrent(id)
      ? mostRecentlyInspectedElement
      : inspectElementRaw(id);
    if (result === null) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return;
    }

    const displayName = getDisplayNameForElementID(id);

    const supportsGroup = typeof console.groupCollapsed === 'function';
    if (supportsGroup) {
      console.groupCollapsed(
        `[Click to expand] %c<${displayName || 'Component'} />`,
        // --dom-tag-name-color is the CSS variable Chrome styles HTML elements with in the console.
        'color: var(--dom-tag-name-color); font-weight: normal;',
      );
    }
    if (result.props !== null) {
      console.log('Props:', result.props);
    }
    if (result.state !== null) {
      console.log('State:', result.state);
    }
    if (result.hooks !== null) {
      console.log('Hooks:', result.hooks);
    }
    const hostInstances = findHostInstancesForElementID(id);
    if (hostInstances !== null) {
      console.log('Nodes:', hostInstances);
    }
    if (window.chrome || /firefox/i.test(navigator.userAgent)) {
      console.log(
        'Right-click any value to save it as a global variable for further inspection.',
      );
    }
    if (supportsGroup) {
      console.groupEnd();
    }
  }

  function deletePath(
    type: 'context' | 'hooks' | 'props' | 'state',
    id: number,
    hookID: ?number,
    path: Array<string | number>,
  ): void {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return;
    }
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      // TODO: Handle VirtualInstance.
      return;
    }
    const fiber = devtoolsInstance.data;
    // $FlowFixMe[invalid-compare]
    if (fiber !== null) {
      const instance = fiber.stateNode;

      switch (type) {
        case 'context':
          // To simplify hydration and display of primitive context values (e.g. number, string)
          // the inspectElement() method wraps context in a {value: ...} object.
          // We need to remove the first part of the path (the "value") before continuing.
          path = path.slice(1);

          switch (fiber.tag) {
            case ClassComponent:
              if (path.length === 0) {
                // Simple context value (noop)
              } else {
                deletePathInObject(instance.context, path);
              }
              instance.forceUpdate();
              break;
            case FunctionComponent:
              // Function components using legacy context are not editable
              // because there's no instance on which to create a cloned, mutated context.
              break;
          }
          break;
        case 'hooks':
          if (typeof overrideHookStateDeletePath === 'function') {
            overrideHookStateDeletePath(fiber, hookID as any as number, path);
          }
          break;
        case 'props':
          if (instance === null) {
            if (typeof overridePropsDeletePath === 'function') {
              overridePropsDeletePath(fiber, path);
            }
          } else {
            fiber.pendingProps = copyWithDelete(instance.props, path);
            instance.forceUpdate();
          }
          break;
        case 'state':
          switch (fiber.tag) {
            case ClassComponent:
            case IncompleteClassComponent:
              deletePathInObject(instance.state, path);
              instance.forceUpdate();
              break;
          }
          break;
      }
    }
  }

  function renamePath(
    type: 'context' | 'hooks' | 'props' | 'state',
    id: number,
    hookID: ?number,
    oldPath: Array<string | number>,
    newPath: Array<string | number>,
  ): void {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return;
    }
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      // TODO: Handle VirtualInstance.
      return;
    }
    const fiber = devtoolsInstance.data;
    // $FlowFixMe[invalid-compare]
    if (fiber !== null) {
      const instance = fiber.stateNode;

      switch (type) {
        case 'context':
          // To simplify hydration and display of primitive context values (e.g. number, string)
          // the inspectElement() method wraps context in a {value: ...} object.
          // We need to remove the first part of the path (the "value") before continuing.
          oldPath = oldPath.slice(1);
          newPath = newPath.slice(1);

          switch (fiber.tag) {
            case ClassComponent:
              if (oldPath.length === 0) {
                // Simple context value (noop)
              } else {
                renamePathInObject(instance.context, oldPath, newPath);
              }
              instance.forceUpdate();
              break;
            case FunctionComponent:
              // Function components using legacy context are not editable
              // because there's no instance on which to create a cloned, mutated context.
              break;
          }
          break;
        case 'hooks':
          if (typeof overrideHookStateRenamePath === 'function') {
            overrideHookStateRenamePath(
              fiber,
              hookID as any as number,
              oldPath,
              newPath,
            );
          }
          break;
        case 'props':
          switch (fiber.tag) {
            case ClassComponent:
              fiber.pendingProps = copyWithRename(
                instance.props,
                oldPath,
                newPath,
              );
              instance.forceUpdate();
              break;
            default:
              if (typeof overridePropsRenamePath === 'function') {
                overridePropsRenamePath(fiber, oldPath, newPath);
              }
              break;
          }
          break;
        case 'state':
          switch (fiber.tag) {
            case ClassComponent:
            case IncompleteClassComponent:
              renamePathInObject(instance.state, oldPath, newPath);
              instance.forceUpdate();
              break;
          }
          break;
      }
    }
  }

  function overrideValueAtPath(
    type: 'context' | 'hooks' | 'props' | 'state',
    id: number,
    hookID: ?number,
    path: Array<string | number>,
    value: any,
  ): void {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      console.warn(`Could not find DevToolsInstance with id "${id}"`);
      return;
    }
    if (devtoolsInstance.kind !== FIBER_INSTANCE) {
      // TODO: Handle VirtualInstance.
      return;
    }
    const fiber = devtoolsInstance.data;
    // $FlowFixMe[invalid-compare]
    if (fiber !== null) {
      const instance = fiber.stateNode;

      switch (type) {
        case 'context':
          // To simplify hydration and display of primitive context values (e.g. number, string)
          // the inspectElement() method wraps context in a {value: ...} object.
          // We need to remove the first part of the path (the "value") before continuing.
          path = path.slice(1);

          switch (fiber.tag) {
            case ClassComponent:
              if (path.length === 0) {
                // Simple context value
                instance.context = value;
              } else {
                setInObject(instance.context, path, value);
              }
              instance.forceUpdate();
              break;
            case FunctionComponent:
              // Function components using legacy context are not editable
              // because there's no instance on which to create a cloned, mutated context.
              break;
          }
          break;
        case 'hooks':
          if (typeof overrideHookState === 'function') {
            overrideHookState(fiber, hookID as any as number, path, value);
          }
          break;
        case 'props':
          switch (fiber.tag) {
            case ClassComponent:
              fiber.pendingProps = copyWithSet(instance.props, path, value);
              instance.forceUpdate();
              break;
            default:
              if (typeof overrideProps === 'function') {
                overrideProps(fiber, path, value);
              }
              break;
          }
          break;
        case 'state':
          switch (fiber.tag) {
            case ClassComponent:
            case IncompleteClassComponent:
              setInObject(instance.state, path, value);
              instance.forceUpdate();
              break;
          }
          break;
      }
    }
  }

  type CommitProfilingData = {
    changeDescriptions: Map<number, ChangeDescription> | null,
    commitTime: number,
    durations: Array<number>,
    effectDuration: number | null,
    maxActualDuration: number,
    passiveEffectDuration: number | null,
    priorityLevel: string | null,
    updaters: Array<SerializedElement> | null,
  };

  type CommitProfilingMetadataMap = Map<number, Array<CommitProfilingData>>;
  type DisplayNamesByRootID = Map<number, string>;

  let currentCommitProfilingMetadata: CommitProfilingData | null = null;
  let displayNamesByRootID: DisplayNamesByRootID | null = null;
  let initialTreeBaseDurationsMap: Map<number, Array<[number, number]>> | null =
    null;
  let isProfiling: boolean = false;
  let profilingStartTime: number = 0;
  let recordChangeDescriptions: boolean = false;
  let recordTimeline: boolean = false;
  let recordUserInputEvents: boolean = true;

  // User interactions observed while profiling (types and timings only —
  // never key values, input text, or target content). Recorded here rather
  // than in the timeline hooks so it works with any React build, including
  // ones without scheduling-profiler support. Timestamps share the commit
  // clock (ms offsets from profiling start).
  const USER_INPUT_EVENT_TYPES = [
    'click',
    'pointerdown',
    'keydown',
    'input',
    'submit',
    'scroll',
  ];
  // Coalesce high-frequency events (scroll, key repeat) per type.
  const USER_INPUT_EVENT_MIN_GAP_MS = 50;
  const USER_INPUT_EVENT_LIMIT = 500;
  let userInputEvents: Array<{type: string, timestamp: number}> = [];
  const lastUserInputEventTimeByType: Map<string, number> = new Map();

  function onUserInputEvent(event: Event) {
    if (!isProfiling || userInputEvents.length >= USER_INPUT_EVENT_LIMIT) {
      return;
    }
    const timestamp = getCurrentTime() - profilingStartTime;
    const lastTime = lastUserInputEventTimeByType.get(event.type);
    if (
      lastTime != null &&
      timestamp - lastTime < USER_INPUT_EVENT_MIN_GAP_MS
    ) {
      return;
    }
    lastUserInputEventTimeByType.set(event.type, timestamp);
    userInputEvents.push({type: event.type, timestamp});
  }

  function toggleUserInputEventListeners(enabled: boolean) {
    // Use the window the renderer serves (`global`), not this module's own
    // realm — with react-devtools-inline the backend can run in a different
    // window than the page being profiled.
    if (global == null || typeof global.addEventListener !== 'function') {
      return; // Non-DOM environments (e.g. React Native).
    }
    for (let i = 0; i < USER_INPUT_EVENT_TYPES.length; i++) {
      if (enabled) {
        global.addEventListener(USER_INPUT_EVENT_TYPES[i], onUserInputEvent, {
          capture: true,
          passive: true,
        });
      } else {
        global.removeEventListener(
          USER_INPUT_EVENT_TYPES[i],
          onUserInputEvent,
          {capture: true},
        );
      }
    }
  }
  let rootToCommitProfilingMetadataMap: CommitProfilingMetadataMap | null =
    null;

  function getProfilingData(): ProfilingDataBackend {
    const dataForRoots: Array<ProfilingDataForRootBackend> = [];

    if (rootToCommitProfilingMetadataMap === null) {
      throw Error(
        'getProfilingData() called before any profiling data was recorded',
      );
    }

    rootToCommitProfilingMetadataMap.forEach(
      (commitProfilingMetadata, rootID) => {
        const commitData: Array<CommitDataBackend> = [];

        const displayName =
          (displayNamesByRootID !== null && displayNamesByRootID.get(rootID)) ||
          'Unknown';

        const initialTreeBaseDurations: Array<[number, number]> =
          (initialTreeBaseDurationsMap !== null &&
            initialTreeBaseDurationsMap.get(rootID)) ||
          [];

        commitProfilingMetadata.forEach((commitProfilingData, commitIndex) => {
          const {
            changeDescriptions,
            durations,
            effectDuration,
            maxActualDuration,
            passiveEffectDuration,
            priorityLevel,
            commitTime,
            updaters,
          } = commitProfilingData;

          const fiberActualDurations: Array<[number, number]> = [];
          const fiberSelfDurations: Array<[number, number]> = [];
          for (let i = 0; i < durations.length; i += 3) {
            const fiberID = durations[i];
            fiberActualDurations.push([
              fiberID,
              formatDurationToMicrosecondsGranularity(durations[i + 1]),
            ]);
            fiberSelfDurations.push([
              fiberID,
              formatDurationToMicrosecondsGranularity(durations[i + 2]),
            ]);
          }

          commitData.push({
            changeDescriptions:
              changeDescriptions !== null
                ? Array.from(changeDescriptions.entries())
                : null,
            duration:
              formatDurationToMicrosecondsGranularity(maxActualDuration),
            effectDuration:
              effectDuration !== null
                ? formatDurationToMicrosecondsGranularity(effectDuration)
                : null,
            fiberActualDurations,
            fiberSelfDurations,
            passiveEffectDuration:
              passiveEffectDuration !== null
                ? formatDurationToMicrosecondsGranularity(passiveEffectDuration)
                : null,
            priorityLevel,
            timestamp: commitTime,
            updaters,
          });
        });

        dataForRoots.push({
          commitData,
          displayName,
          initialTreeBaseDurations,
          rootID,
        });
      },
    );

    let timelineData = null;
    if (typeof getTimelineData === 'function') {
      const currentTimelineData = getTimelineData();
      if (currentTimelineData) {
        const {
          batchUIDToMeasuresMap,
          internalModuleSourceToRanges,
          laneToLabelMap,
          laneToReactMeasureMap,
          ...rest
        } = currentTimelineData;

        timelineData = {
          ...rest,

          // Most of the data is safe to parse as-is,
          // but we need to convert the nested Arrays back to Maps.
          // Most of the data is safe to serialize as-is,
          // but we need to convert the Maps to nested Arrays.
          batchUIDToMeasuresKeyValueArray: Array.from(
            batchUIDToMeasuresMap.entries(),
          ),
          internalModuleSourceToRanges: Array.from(
            internalModuleSourceToRanges.entries(),
          ),
          laneToLabelKeyValueArray: Array.from(laneToLabelMap.entries()),
          laneToReactMeasureKeyValueArray: Array.from(
            laneToReactMeasureMap.entries(),
          ),
        };
      }
    }

    return {
      dataForRoots,
      rendererID,
      timelineData,
      userInputEvents: userInputEvents.slice(),
    };
  }

  function snapshotTreeBaseDurations(
    instance: DevToolsInstance,
    target: Array<[number, number]>,
  ) {
    // We don't need to convert milliseconds to microseconds in this case,
    // because the profiling summary is JSON serialized.
    if (instance.kind !== FILTERED_FIBER_INSTANCE) {
      target.push([instance.id, instance.treeBaseDuration]);
    }
    for (
      let child = instance.firstChild;
      child !== null;
      child = child.nextSibling
    ) {
      snapshotTreeBaseDurations(child, target);
    }
  }

  function startProfiling(
    shouldRecordChangeDescriptions: boolean,
    shouldRecordTimeline: boolean,
    shouldRecordUserInputEvents: boolean = true,
  ) {
    if (isProfiling) {
      return;
    }

    recordChangeDescriptions = shouldRecordChangeDescriptions;
    recordTimeline = shouldRecordTimeline;
    recordUserInputEvents = shouldRecordUserInputEvents;

    // Capture initial values as of the time profiling starts.
    // It's important we snapshot both the durations and the id-to-root map,
    // since either of these may change during the profiling session
    // (e.g. when a fiber is re-rendered or when a fiber gets removed).
    displayNamesByRootID = new Map();
    initialTreeBaseDurationsMap = new Map();

    hook.getFiberRoots(rendererID).forEach(root => {
      const rootInstance = rootToFiberInstanceMap.get(root);
      if (rootInstance === undefined) {
        throw new Error(
          'Expected the root instance to already exist when starting profiling',
        );
      }
      const rootID = rootInstance.id;
      (displayNamesByRootID as any as DisplayNamesByRootID).set(
        rootID,
        getDisplayNameForRoot(root.current),
      );
      const initialTreeBaseDurations: Array<[number, number]> = [];
      snapshotTreeBaseDurations(rootInstance, initialTreeBaseDurations);
      (initialTreeBaseDurationsMap as any).set(
        rootID,
        initialTreeBaseDurations,
      );
    });

    isProfiling = true;
    profilingStartTime = getCurrentTime();
    rootToCommitProfilingMetadataMap = new Map();

    if (recordUserInputEvents) {
      userInputEvents = [];
      lastUserInputEventTimeByType.clear();
      toggleUserInputEventListeners(true);
    }

    if (toggleProfilingStatus !== null) {
      toggleProfilingStatus(true, recordTimeline);
    }
  }

  function stopProfiling() {
    isProfiling = false;
    recordChangeDescriptions = false;
    toggleUserInputEventListeners(false);

    if (toggleProfilingStatus !== null) {
      toggleProfilingStatus(false, recordTimeline);
    }

    recordTimeline = false;
  }

  // Automatically start profiling so that we don't miss timing info from initial "mount".
  if (shouldStartProfilingNow) {
    startProfiling(
      profilingSettings.recordChangeDescriptions,
      profilingSettings.recordTimeline,
    );
  }

  function getNearestFiber(devtoolsInstance: DevToolsInstance): null | Fiber {
    if (devtoolsInstance.kind === VIRTUAL_INSTANCE) {
      let inst: DevToolsInstance = devtoolsInstance;
      while (inst.kind === VIRTUAL_INSTANCE) {
        // For virtual instances, we search deeper until we find a Fiber instance.
        // Then we search upwards from that Fiber. That's because Virtual Instances
        // will always have an Fiber child filtered or not. If we searched its parents
        // we might skip through a filtered Error Boundary before we hit a FiberInstance.
        if (inst.firstChild === null) {
          return null;
        }
        inst = inst.firstChild;
      }
      return inst.data.return;
    } else {
      return devtoolsInstance.data;
    }
  }

  // React will switch between these implementations depending on whether
  // we have any manually suspended/errored-out Fibers or not.
  function shouldErrorFiberAlwaysNull() {
    return null;
  }

  // Map of Fiber and its force error status: true (error), false (toggled off)
  const forceErrorForFibers = new Map<Fiber, boolean>();

  function shouldErrorFiberAccordingToMap(fiber: any): boolean | null {
    if (typeof setErrorHandler !== 'function') {
      throw new Error(
        'Expected overrideError() to not get called for earlier React versions.',
      );
    }

    let status = forceErrorForFibers.get(fiber);
    if (status === false) {
      // TRICKY overrideError adds entries to this Map,
      // so ideally it would be the method that clears them too,
      // but that would break the functionality of the feature,
      // since DevTools needs to tell React to act differently than it normally would
      // (don't just re-render the failed boundary, but reset its errored state too).
      // So we can only clear it after telling React to reset the state.
      // Technically this is premature and we should schedule it for later,
      // since the render could always fail without committing the updated error boundary,
      // but since this is a DEV-only feature, the simplicity is worth the trade off.
      forceErrorForFibers.delete(fiber);
      if (forceErrorForFibers.size === 0) {
        // Last override is gone. Switch React back to fast path.
        setErrorHandler(shouldErrorFiberAlwaysNull);
      }
      return false;
    }
    if (status === undefined && fiber.alternate !== null) {
      status = forceErrorForFibers.get(fiber.alternate);
      if (status === false) {
        forceErrorForFibers.delete(fiber.alternate);
        if (forceErrorForFibers.size === 0) {
          // Last override is gone. Switch React back to fast path.
          setErrorHandler(shouldErrorFiberAlwaysNull);
        }
      }
    }
    if (status === undefined) {
      return null;
    }
    return status;
  }

  function overrideError(id: number, forceError: boolean) {
    if (
      typeof setErrorHandler !== 'function' ||
      typeof scheduleUpdate !== 'function'
    ) {
      throw new Error(
        'Expected overrideError() to not get called for earlier React versions.',
      );
    }

    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      return;
    }
    const nearestFiber = getNearestFiber(devtoolsInstance);
    if (nearestFiber === null) {
      return;
    }
    let fiber = nearestFiber;
    while (!isErrorBoundary(ReactTypeOfWork, fiber)) {
      if (fiber.return === null) {
        return;
      }
      fiber = fiber.return;
    }
    forceErrorForFibers.set(fiber, forceError);
    if (fiber.alternate !== null) {
      // We only need one of the Fibers in the set.
      forceErrorForFibers.delete(fiber.alternate);
    }
    if (forceErrorForFibers.size === 1) {
      // First override is added. Switch React to slower path.
      setErrorHandler(shouldErrorFiberAccordingToMap);
    }
    if (!forceError && typeof scheduleRetry === 'function') {
      // If we're dismissing an error and the renderer supports it, use a Retry instead of Sync
      // This would allow View Transitions to proceed as if the error was dismissed using a Transition.
      scheduleRetry(fiber);
    } else {
      scheduleUpdate(fiber);
    }
  }

  function shouldSuspendFiberAlwaysFalse() {
    return false;
  }

  const forceFallbackForFibers = new Set<Fiber>();

  function shouldSuspendFiberAccordingToSet(fiber: Fiber): boolean {
    return (
      forceFallbackForFibers.has(fiber) ||
      (fiber.alternate !== null && forceFallbackForFibers.has(fiber.alternate))
    );
  }

  function overrideSuspense(id: number, forceFallback: boolean) {
    if (
      typeof setSuspenseHandler !== 'function' ||
      typeof scheduleUpdate !== 'function'
    ) {
      throw new Error(
        'Expected overrideSuspense() to not get called for earlier React versions.',
      );
    }
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      return;
    }
    const nearestFiber = getNearestFiber(devtoolsInstance);
    if (nearestFiber === null) {
      return;
    }
    let fiber = nearestFiber;
    while (fiber.tag !== SuspenseComponent) {
      if (fiber.return === null) {
        return;
      }
      fiber = fiber.return;
    }

    if (fiber.alternate !== null) {
      // We only need one of the Fibers in the set.
      forceFallbackForFibers.delete(fiber.alternate);
    }
    if (forceFallback) {
      forceFallbackForFibers.add(fiber);
      if (forceFallbackForFibers.size === 1) {
        // First override is added. Switch React to slower path.
        setSuspenseHandler(shouldSuspendFiberAccordingToSet);
      }
    } else {
      forceFallbackForFibers.delete(fiber);
      if (forceFallbackForFibers.size === 0) {
        // Last override is gone. Switch React back to fast path.
        setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
      }
    }
    if (!forceFallback && typeof scheduleRetry === 'function') {
      // If we're unsuspending and the renderer supports it, use a Retry instead of Sync
      // to allow for things like View Transitions to proceed the way they would for real.
      scheduleRetry(fiber);
    } else {
      scheduleUpdate(fiber);
    }
  }

  /**
   * Resets the all other roots of this renderer.
   * @param suspendedSet List of IDs of SuspenseComponent Fibers
   */
  function overrideSuspenseMilestone(suspendedSet: Array<FiberInstance['id']>) {
    if (
      typeof setSuspenseHandler !== 'function' ||
      typeof scheduleUpdate !== 'function'
    ) {
      throw new Error(
        'Expected overrideSuspenseMilestone() to not get called for earlier React versions.',
      );
    }

    const unsuspendedSet: Set<Fiber> = new Set(forceFallbackForFibers);

    let resuspended = false;
    for (let i = 0; i < suspendedSet.length; ++i) {
      const instance = idToDevToolsInstanceMap.get(suspendedSet[i]);
      if (instance === undefined) {
        console.warn(
          `Could not suspend ID '${suspendedSet[i]}' since the instance can't be found.`,
        );
        continue;
      }

      if (instance.kind === FIBER_INSTANCE) {
        const fiber = instance.data;
        if (
          forceFallbackForFibers.has(fiber) ||
          (fiber.alternate !== null &&
            forceFallbackForFibers.has(fiber.alternate))
        ) {
          // We're already forcing fallback for this fiber. Mark it as not unsuspended.
          unsuspendedSet.delete(fiber);
          if (fiber.alternate !== null) {
            unsuspendedSet.delete(fiber.alternate);
          }
        } else {
          forceFallbackForFibers.add(fiber);
          // We could find a minimal set that covers all the Fibers in this suspended set.
          // For now we rely on React's batching of updates.
          scheduleUpdate(fiber);
          resuspended = true;
        }
      } else {
        console.warn(`Cannot not suspend ID '${suspendedSet[i]}'.`);
      }
    }

    // Unsuspend any existing forced fallbacks if they're not in the new set.
    unsuspendedSet.forEach(fiber => {
      forceFallbackForFibers.delete(fiber);
      if (!resuspended && typeof scheduleRetry === 'function') {
        // If nothing new resuspended we don't need this to be sync. If we're only
        // unsuspending then we can schedule this as a Retry if the renderer supports it.
        // That way we can trigger animations.
        scheduleRetry(fiber);
      } else {
        scheduleUpdate(fiber);
      }
    });

    if (forceFallbackForFibers.size > 0) {
      // First override is added. Switch React to slower path.
      // TODO: Semantics for suspending a timeline are different. We want a suspended
      // timeline to act like a first reveal which is relevant for SuspenseList.
      // Resuspending would not affect rows in SuspenseList
      setSuspenseHandler(shouldSuspendFiberAccordingToSet);
    } else {
      setSuspenseHandler(shouldSuspendFiberAlwaysFalse);
    }
  }

  // Remember if we're trying to restore the selection after reload.
  // In that case, we'll do some extra checks for matching mounts.
  let trackedPath: Array<PathFrame> | null = null;
  let trackedPathMatchFiber: Fiber | null = null; // This is the deepest unfiltered match of a Fiber.
  let trackedPathMatchInstance: FiberInstance | VirtualInstance | null = null; // This is the deepest matched filtered Instance.
  let trackedPathMatchDepth = -1;
  let mightBeOnTrackedPath = false;

  function setTrackedPath(path: Array<PathFrame> | null) {
    if (path === null) {
      trackedPathMatchFiber = null;
      trackedPathMatchInstance = null;
      trackedPathMatchDepth = -1;
      mightBeOnTrackedPath = false;
    }
    trackedPath = path;
  }

  // We call this before traversing a new mount.
  // It remembers whether this Fiber is the next best match for tracked path.
  // The return value signals whether we should keep matching siblings or not.
  function updateTrackedPathStateBeforeMount(
    fiber: Fiber,
    fiberInstance: null | FiberInstance | FilteredFiberInstance,
  ): boolean {
    if (trackedPath === null || !mightBeOnTrackedPath) {
      // Fast path: there's nothing to track so do nothing and ignore siblings.
      return false;
    }
    const returnFiber = fiber.return;
    const returnAlternate = returnFiber !== null ? returnFiber.alternate : null;
    // By now we know there's some selection to restore, and this is a new Fiber.
    // Is this newly mounted Fiber a direct child of the current best match?
    // (This will also be true for new roots if we haven't matched anything yet.)
    if (
      trackedPathMatchFiber === returnFiber ||
      (trackedPathMatchFiber === returnAlternate && returnAlternate !== null)
    ) {
      // Is this the next Fiber we should select? Let's compare the frames.
      const actualFrame = getPathFrame(fiber);
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      const expectedFrame = trackedPath[trackedPathMatchDepth + 1];
      if (expectedFrame === undefined) {
        throw new Error('Expected to see a frame at the next depth.');
      }
      if (
        actualFrame.index === expectedFrame.index &&
        actualFrame.key === expectedFrame.key &&
        actualFrame.displayName === expectedFrame.displayName
      ) {
        // We have our next match.
        trackedPathMatchFiber = fiber;
        if (fiberInstance !== null && fiberInstance.kind === FIBER_INSTANCE) {
          trackedPathMatchInstance = fiberInstance;
        }
        trackedPathMatchDepth++;
        // Are we out of frames to match?
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        if (trackedPathMatchDepth === trackedPath.length - 1) {
          // There's nothing that can possibly match afterwards.
          // Don't check the children.
          mightBeOnTrackedPath = false;
        } else {
          // Check the children, as they might reveal the next match.
          mightBeOnTrackedPath = true;
        }
        // In either case, since we have a match, we don't need
        // to check the siblings. They'll never match.
        return false;
      }
    }
    if (trackedPathMatchFiber === null && fiberInstance === null) {
      // We're now looking for a Virtual Instance. It might be inside filtered Fibers
      // so we keep looking below.
      return true;
    }
    // This Fiber's parent is on the path, but this Fiber itself isn't.
    // There's no need to check its children--they won't be on the path either.
    mightBeOnTrackedPath = false;
    // However, one of its siblings may be on the path so keep searching.
    return true;
  }

  function updateVirtualTrackedPathStateBeforeMount(
    virtualInstance: VirtualInstance,
    parentInstance: null | DevToolsInstance,
  ): boolean {
    if (trackedPath === null || !mightBeOnTrackedPath) {
      // Fast path: there's nothing to track so do nothing and ignore siblings.
      return false;
    }
    // Check if we've matched our nearest unfiltered parent so far.
    if (trackedPathMatchInstance === parentInstance) {
      const actualFrame = getVirtualPathFrame(virtualInstance);
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      const expectedFrame = trackedPath[trackedPathMatchDepth + 1];
      if (expectedFrame === undefined) {
        throw new Error('Expected to see a frame at the next depth.');
      }
      if (
        actualFrame.index === expectedFrame.index &&
        actualFrame.key === expectedFrame.key &&
        actualFrame.displayName === expectedFrame.displayName
      ) {
        // We have our next match.
        trackedPathMatchFiber = null; // Don't bother looking in Fibers anymore. We're deeper now.
        trackedPathMatchInstance = virtualInstance;
        trackedPathMatchDepth++;
        // Are we out of frames to match?
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        if (trackedPathMatchDepth === trackedPath.length - 1) {
          // There's nothing that can possibly match afterwards.
          // Don't check the children.
          mightBeOnTrackedPath = false;
        } else {
          // Check the children, as they might reveal the next match.
          mightBeOnTrackedPath = true;
        }
        // In either case, since we have a match, we don't need
        // to check the siblings. They'll never match.
        return false;
      }
    }
    if (trackedPathMatchFiber !== null) {
      // We're still looking for a Fiber which might be underneath this instance.
      return true;
    }
    // This Instance's parent is on the path, but this Instance itself isn't.
    // There's no need to check its children--they won't be on the path either.
    mightBeOnTrackedPath = false;
    // However, one of its siblings may be on the path so keep searching.
    return true;
  }

  function updateTrackedPathStateAfterMount(
    mightSiblingsBeOnTrackedPath: boolean,
  ) {
    // updateTrackedPathStateBeforeMount() told us whether to match siblings.
    // Now that we're entering siblings, let's use that information.
    mightBeOnTrackedPath = mightSiblingsBeOnTrackedPath;
  }

  // Roots don't have a real persistent identity.
  // A root's "pseudo key" is "childDisplayName:indexWithThatName".
  // For example, "App:0" or, in case of similar roots, "Story:0", "Story:1", etc.
  // We will use this to try to disambiguate roots when restoring selection between reloads.
  const rootPseudoKeys: Map<number, string> = new Map();
  const rootDisplayNameCounter: Map<string, number> = new Map();

  function setRootPseudoKey(id: number, fiber: Fiber) {
    const name = getDisplayNameForRoot(fiber);
    const counter = rootDisplayNameCounter.get(name) || 0;
    rootDisplayNameCounter.set(name, counter + 1);
    const pseudoKey = `${name}:${counter}`;
    rootPseudoKeys.set(id, pseudoKey);
  }

  function removeRootPseudoKey(id: number) {
    const pseudoKey = rootPseudoKeys.get(id);
    if (pseudoKey === undefined) {
      throw new Error('Expected root pseudo key to be known.');
    }
    const name = pseudoKey.slice(0, pseudoKey.lastIndexOf(':'));
    const counter = rootDisplayNameCounter.get(name);
    if (counter === undefined) {
      throw new Error('Expected counter to be known.');
    }
    if (counter > 1) {
      rootDisplayNameCounter.set(name, counter - 1);
    } else {
      rootDisplayNameCounter.delete(name);
    }
    rootPseudoKeys.delete(id);
  }

  function getDisplayNameForRoot(fiber: Fiber): string {
    let preferredDisplayName = null;
    let fallbackDisplayName = null;
    let child = fiber.child;
    // Go at most three levels deep into direct children
    // while searching for a child that has a displayName.
    for (let i = 0; i < 3; i++) {
      if (child === null) {
        break;
      }
      const displayName = getDisplayNameForFiber(child);
      if (displayName !== null) {
        // Prefer display names that we get from user-defined components.
        // We want to avoid using e.g. 'Suspense' unless we find nothing else.
        if (typeof child.type === 'function') {
          // There's a few user-defined tags, but we'll prefer the ones
          // that are usually explicitly named (function or class components).
          preferredDisplayName = displayName;
        } else if (fallbackDisplayName === null) {
          fallbackDisplayName = displayName;
        }
      }
      if (preferredDisplayName !== null) {
        break;
      }
      child = child.child;
    }
    return preferredDisplayName || fallbackDisplayName || 'Anonymous';
  }

  function getPathFrame(fiber: Fiber): PathFrame {
    const {key} = fiber;
    let displayName = getDisplayNameForFiber(fiber);
    const index = fiber.index;
    switch (fiber.tag) {
      case HostRoot:
        // Roots don't have a real displayName, index, or key.
        // Instead, we'll use the pseudo key (childDisplayName:indexWithThatName).
        const rootInstance = rootToFiberInstanceMap.get(fiber.stateNode);
        if (rootInstance === undefined) {
          throw new Error(
            'Expected the root instance to exist when computing a path',
          );
        }
        const pseudoKey = rootPseudoKeys.get(rootInstance.id);
        if (pseudoKey === undefined) {
          throw new Error('Expected mounted root to have known pseudo key.');
        }
        displayName = pseudoKey;
        break;
      case HostComponent:
        displayName = fiber.type;
        break;
      default:
        break;
    }
    return {
      displayName,
      key: key === REACT_OPTIMISTIC_KEY ? null : key,
      index,
    };
  }

  function getVirtualPathFrame(virtualInstance: VirtualInstance): PathFrame {
    return {
      displayName: virtualInstance.data.name || '',
      key:
        virtualInstance.data.key == null ||
        virtualInstance.data.key === REACT_OPTIMISTIC_KEY
          ? null
          : virtualInstance.data.key,
      index: -1, // We use -1 to indicate that this is a virtual path frame.
    };
  }

  // Produces a serializable representation that does a best effort
  // of identifying a particular Fiber between page reloads.
  // The return path will contain Fibers that are "invisible" to the store
  // because their keys and indexes are important to restoring the selection.
  function getPathForElement(id: number): Array<PathFrame> | null {
    const devtoolsInstance = idToDevToolsInstanceMap.get(id);
    if (devtoolsInstance === undefined) {
      return null;
    }

    const keyPath = [];

    let inst: DevToolsInstance = devtoolsInstance;
    while (inst.kind === VIRTUAL_INSTANCE) {
      keyPath.push(getVirtualPathFrame(inst));
      if (inst.parent === null) {
        // This is a bug but non-essential. We should've found a root instance.
        return null;
      }
      inst = inst.parent;
    }

    let fiber: null | Fiber = inst.data;
    while (fiber !== null) {
      // $FlowFixMe[incompatible-call] found when upgrading Flow
      keyPath.push(getPathFrame(fiber));
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      fiber = fiber.return;
    }
    keyPath.reverse();
    return keyPath;
  }

  function getBestMatchForTrackedPath(): PathMatch | null {
    if (trackedPath === null) {
      // Nothing to match.
      return null;
    }
    if (trackedPathMatchInstance === null) {
      // We didn't find anything.
      return null;
    }
    return {
      id: trackedPathMatchInstance.id,
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      isFullMatch: trackedPathMatchDepth === trackedPath.length - 1,
    };
  }

  const formatPriorityLevel = (priorityLevel: ?number) => {
    if (priorityLevel == null) {
      return 'Unknown';
    }

    switch (priorityLevel) {
      case ImmediatePriority:
        return 'Immediate';
      case UserBlockingPriority:
        return 'User-Blocking';
      case NormalPriority:
        return 'Normal';
      case LowPriority:
        return 'Low';
      case IdlePriority:
        return 'Idle';
      case NoPriority:
      default:
        return 'Unknown';
    }
  };

  function setTraceUpdatesEnabled(isEnabled: boolean): void {
    traceUpdatesEnabled = isEnabled;
  }

  function hasElementWithId(id: number): boolean {
    return idToDevToolsInstanceMap.has(id);
  }

  function getSourceForFiberInstance(
    fiberInstance: FiberInstance,
  ): ReactFunctionLocation | null {
    // Favor the owner source if we have one.
    const ownerSource = getSourceForInstance(fiberInstance);
    if (ownerSource !== null) {
      return ownerSource;
    }

    // Otherwise fallback to the throwing trick.
    const dispatcherRef = getDispatcherRef(renderer);
    const stackFrame =
      dispatcherRef == null
        ? null
        : getSourceLocationByFiber(
            ReactTypeOfWork,
            fiberInstance.data,
            dispatcherRef,
          );
    if (stackFrame === null) {
      return null;
    }
    const source = extractLocationFromComponentStack(stackFrame);
    fiberInstance.source = source;
    return source;
  }

  function getSourceForInstance(
    instance: DevToolsInstance,
  ): ReactFunctionLocation | null {
    let unresolvedSource = instance.source;
    if (unresolvedSource === null) {
      // We don't have any source yet. We can try again later in case an owned child mounts later.
      // TODO: We won't have any information here if the child is filtered.
      return null;
    }

    if (instance.kind === VIRTUAL_INSTANCE) {
      // We might have found one on the virtual instance.
      const debugLocation = instance.data.debugLocation;
      if (debugLocation != null) {
        unresolvedSource = debugLocation;
      }
    }

    // If we have the debug stack (the creation stack of the JSX) for any owned child of this
    // component, then at the bottom of that stack will be a stack frame that is somewhere within
    // the component's function body. Typically it would be the callsite of the JSX unless there's
    // any intermediate utility functions. This won't point to the top of the component function
    // but it's at least somewhere within it.
    if (isError(unresolvedSource)) {
      return (instance.source = extractLocationFromOwnerStack(
        unresolvedSource as any,
      ));
    }
    if (typeof unresolvedSource === 'string') {
      const idx = unresolvedSource.lastIndexOf('\n');
      const lastLine =
        idx === -1 ? unresolvedSource : unresolvedSource.slice(idx + 1);
      return (instance.source = extractLocationFromComponentStack(lastLine));
    }

    // $FlowFixMe[incompatible-type]: refined.
    return unresolvedSource;
  }

  return {
    cleanup,
    clearErrorsAndWarnings,
    clearErrorsForElementID,
    clearWarningsForElementID,
    getSerializedElementValueByPath,
    deletePath,
    findHostInstancesForElementID,
    findLastKnownRectsForID,
    flushInitialOperations,
    getBestMatchForTrackedPath,
    getDisplayNameForElementID,
    getNearestMountedDOMNode,
    getElementIDForHostInstance,
    getSuspenseNodeIDForHostInstance,
    getInstanceAndStyle,
    getOwnersList,
    getPathForElement,
    getProfilingData,
    handleCommitFiberRoot,
    handleCommitFiberUnmount,
    handlePostCommitFiberRoot,
    hasElementWithId,
    inspectElement,
    logElementToConsole,
    getComponentStack,
    getElementAttributeByPath,
    getElementSourceFunctionById,
    onErrorOrWarning,
    overrideError,
    overrideSuspense,
    overrideSuspenseMilestone,
    overrideValueAtPath,
    renamePath,
    renderer,
    setTraceUpdatesEnabled,
    setTrackedPath,
    startProfiling,
    stopProfiling,
    storeAsGlobal,
    supportsTogglingSuspense,
    updateComponentFilters,
    getEnvironmentNames,
  };
}
