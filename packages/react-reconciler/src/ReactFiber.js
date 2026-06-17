/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {
  ReactFragment,
  ReactPortal,
  ReactScope,
  ViewTransitionProps,
  ActivityProps,
  ReactKey,
} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {RootTag} from './ReactRootTags';
import type {WorkTag} from './ReactWorkTags';
import type {TypeOfMode} from './ReactTypeOfMode';
import type {Lanes} from './ReactFiberLane';
import type {ActivityInstance, SuspenseInstance} from './ReactFiberConfig';
import type {
  LegacyHiddenProps,
  OffscreenProps,
} from './ReactFiberOffscreenComponent';
import type {ViewTransitionState} from './ReactFiberViewTransitionComponent';
import type {TracingMarkerInstance} from './ReactFiberTracingMarkerComponent';

import {
  supportsResources,
  supportsSingletons,
  isHostHoistableType,
  isHostSingletonType,
} from './ReactFiberConfig';
import {
  enableProfilerTimer,
  enableScopeAPI,
  enableLegacyHidden,
  enableTransitionTracing,
  disableLegacyMode,
  enableObjectFiber,
  enableViewTransition,
  enableSuspenseyImages,
  enableOptimisticKey,
} from 'shared/ReactFeatureFlags';
import {NoFlags, Placement, StaticMask} from './ReactFiberFlags';
import {ConcurrentRoot} from './ReactRootTags';
import {
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  HostHoistable,
  HostSingleton,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  DehydratedFragment,
  FunctionComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  TracingMarkerComponent,
  Throw,
  ViewTransitionComponent,
  ActivityComponent,
} from './ReactWorkTags';
import {getComponentNameFromOwner} from 'react-reconciler/src/getComponentNameFromFiber';
import {isDevToolsPresent} from './ReactFiberDevToolsHook';
import {
  resolveClassForHotReloading,
  resolveFunctionForHotReloading,
  resolveForwardRefForHotReloading,
} from './ReactFiberHotReloading';
import {NoLanes} from './ReactFiberLane';
import {
  NoMode,
  ConcurrentMode,
  ProfileMode,
  StrictLegacyMode,
  StrictEffectsMode,
  SuspenseyImagesMode,
} from './ReactTypeOfMode';
import {
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_CONSUMER_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SCOPE_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_TRACING_MARKER_TYPE,
  REACT_ELEMENT_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
  REACT_ACTIVITY_TYPE,
} from 'shared/ReactSymbols';
import {TransitionTracingMarker} from './ReactFiberTracingMarkerComponent';
import {getHostContext} from './ReactFiberHostContext';
import type {ReactComponentInfo} from '../../shared/ReactTypes';
import isArray from 'shared/isArray';
import getComponentNameFromType from 'shared/getComponentNameFromType';

export type {Fiber};

let hasBadMapPolyfill;

if (__DEV__) {
  hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    // eslint-disable-next-line no-new
    new Map([[nonExtensibleObject, null]]);
    // eslint-disable-next-line no-new
    new Set([nonExtensibleObject]);
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}

function FiberNode(
  this: $FlowFixMe,
  tag: WorkTag,
  pendingProps: mixed,
  key: ReactKey,
  mode: TypeOfMode,
) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;
  this.refCleanup = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;

  this.mode = mode;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  this.alternate = null;

  if (enableProfilerTimer) {
    // Note: The following is done to avoid a v8 performance cliff.
    //
    // Initializing the fields below to smis and later updating them with
    // double values will cause Fibers to end up having separate shapes.
    // This behavior/bug has something to do with Object.preventExtension().
    // Fortunately this only impacts DEV builds.
    // Unfortunately it makes React unusably slow for some applications.
    // To work around this, initialize the fields below with doubles.
    //
    // Learn more about this here:
    // https://github.com/facebook/react/issues/14365
    // https://bugs.chromium.org/p/v8/issues/detail?id=8538

    this.actualDuration = -0;
    this.actualStartTime = -1.1;
    this.selfBaseDuration = -0;
    this.treeBaseDuration = -0;
  }

  if (__DEV__) {
    // This isn't directly used but is handy for debugging internals:
    this._debugInfo = null;
    this._debugOwner = null;
    this._debugStack = null;
    this._debugTask = null;
    this._debugNeedsRemount = false;
    this._debugHookTypes = null;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(this);
    }
  }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
function createFiberImplClass(
  tag: WorkTag,
  pendingProps: mixed,
  key: ReactKey,
  mode: TypeOfMode,
): Fiber {
  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
}

function createFiberImplObject(
  tag: WorkTag,
  pendingProps: mixed,
  key: ReactKey,
  mode: TypeOfMode,
): Fiber {
  const fiber: Fiber = {
    // Instance
    // tag, key - defined at the bottom as dynamic properties
    elementType: null,
    type: null,
    stateNode: null,

    // Fiber
    return: null,
    child: null,
    sibling: null,
    index: 0,

    ref: null,
    refCleanup: null,

    // pendingProps - defined at the bottom as dynamic properties
    memoizedProps: null,
    updateQueue: null,
    memoizedState: null,
    dependencies: null,

    // Effects
    flags: NoFlags,
    subtreeFlags: NoFlags,
    deletions: null,

    lanes: NoLanes,
    childLanes: NoLanes,

    alternate: null,

    // dynamic properties at the end for more efficient hermes bytecode
    tag,
    key,
    pendingProps,
    mode,
  };

  if (enableProfilerTimer) {
    fiber.actualDuration = -0;
    fiber.actualStartTime = -1.1;
    fiber.selfBaseDuration = -0;
    fiber.treeBaseDuration = -0;
  }

  if (__DEV__) {
    // This isn't directly used but is handy for debugging internals:
    fiber._debugInfo = null;
    fiber._debugOwner = null;
    fiber._debugStack = null;
    fiber._debugTask = null;
    fiber._debugNeedsRemount = false;
    fiber._debugHookTypes = null;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(fiber);
    }
  }
  return fiber;
}

const createFiber = enableObjectFiber
  ? createFiberImplObject
  : createFiberImplClass;

function shouldConstruct(Component: Function) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

export function isSimpleFunctionComponent(type: any): boolean {
  return (
    typeof type === 'function' &&
    !shouldConstruct(type) &&
    type.defaultProps === undefined
  );
}

export function isFunctionClassComponent(
  type: (...args: Array<any>) => mixed,
): boolean {
  return shouldConstruct(type);
}

// This is used to create an alternate fiber to do work on.
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    if (__DEV__) {
      // DEV-only fields

      workInProgress._debugOwner = current._debugOwner;
      workInProgress._debugStack = current._debugStack;
      workInProgress._debugTask = current._debugTask;
      workInProgress._debugHookTypes = current._debugHookTypes;
    }

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.flags = NoFlags;

    // The effects are no longer valid.
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    if (enableOptimisticKey) {
      // For optimistic keys, the Fibers can have different keys if one is optimistic
      // and the other one is filled in.
      workInProgress.key = current.key;
    }

    if (enableProfilerTimer) {
      // We intentionally reset, rather than copy, actualDuration & actualStartTime.
      // This prevents time from endlessly accumulating in new commits.
      // This has the downside of resetting values for different priority renders,
      // But works for yielding (the common case) and should support resuming.
      workInProgress.actualDuration = -0;
      workInProgress.actualStartTime = -1.1;
    }
  }

  // Reset all effects except static ones.
  // Static effects are not specific to a render.
  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  const currentDependencies = current.dependencies;
  workInProgress.dependencies =
    currentDependencies === null
      ? null
      : __DEV__
        ? {
            lanes: currentDependencies.lanes,
            firstContext: currentDependencies.firstContext,
            _debugThenableState: currentDependencies._debugThenableState,
          }
        : {
            lanes: currentDependencies.lanes,
            firstContext: currentDependencies.firstContext,
          };

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.refCleanup = current.refCleanup;

  if (enableProfilerTimer) {
    workInProgress.selfBaseDuration = current.selfBaseDuration;
    workInProgress.treeBaseDuration = current.treeBaseDuration;
  }

  if (__DEV__) {
    workInProgress._debugInfo = current._debugInfo;
    workInProgress._debugNeedsRemount = current._debugNeedsRemount;
    switch (workInProgress.tag) {
      case FunctionComponent:
      case SimpleMemoComponent:
        workInProgress.type = resolveFunctionForHotReloading(current.type);
        break;
      case ClassComponent:
        workInProgress.type = resolveClassForHotReloading(current.type);
        break;
      case ForwardRef:
        workInProgress.type = resolveForwardRefForHotReloading(current.type);
        break;
      default:
        break;
    }
  }

  return workInProgress;
}

// Used to reuse a Fiber for a second pass.
export function resetWorkInProgress(
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber {
  // This resets the Fiber to what createFiber or createWorkInProgress would
  // have set the values to before during the first pass. Ideally this wouldn't
  // be necessary but unfortunately many code paths reads from the workInProgress
  // when they should be reading from current and writing to workInProgress.

  // We assume pendingProps, index, key, ref, return are still untouched to
  // avoid doing another reconciliation.

  // Reset the effect flags but keep any Placement tags, since that's something
  // that child fiber is setting, not the reconciliation.
  workInProgress.flags &= StaticMask | Placement;

  // The effects are no longer valid.

  const current = workInProgress.alternate;
  if (current === null) {
    // Reset to createFiber's initial values.
    workInProgress.childLanes = NoLanes;
    workInProgress.lanes = renderLanes;

    workInProgress.child = null;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.memoizedProps = null;
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;

    workInProgress.dependencies = null;

    workInProgress.stateNode = null;

    if (enableProfilerTimer) {
      // Note: We don't reset the actualTime counts. It's useful to accumulate
      // actual time across multiple render passes.
      workInProgress.selfBaseDuration = 0;
      workInProgress.treeBaseDuration = 0;
    }
  } else {
    // Reset to the cloned values that createWorkInProgress would've.
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.child = current.child;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;
    // Needed because Blocks store data on type.
    // TODO: Blocks don't exist anymore. Do we still need this?
    workInProgress.type = current.type;

    if (enableOptimisticKey) {
      // For optimistic keys, the Fibers can have different keys if one is optimistic
      // and the other one is filled in.
      workInProgress.key = current.key;
    }

    // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.
    const currentDependencies = current.dependencies;
    workInProgress.dependencies =
      currentDependencies === null
        ? null
        : __DEV__
          ? {
              lanes: currentDependencies.lanes,
              firstContext: currentDependencies.firstContext,
              _debugThenableState: currentDependencies._debugThenableState,
            }
          : {
              lanes: currentDependencies.lanes,
              firstContext: currentDependencies.firstContext,
            };

    if (enableProfilerTimer) {
      // Note: We don't reset the actualTime counts. It's useful to accumulate
      // actual time across multiple render passes.
      workInProgress.selfBaseDuration = current.selfBaseDuration;
      workInProgress.treeBaseDuration = current.treeBaseDuration;
    }
  }

  return workInProgress;
}

export function createHostRootFiber(
  tag: RootTag,
  isStrictMode: boolean,
): Fiber {
  let mode: number;
  if (disableLegacyMode || tag === ConcurrentRoot) {
    mode = ConcurrentMode;
    if (isStrictMode === true) {
      mode |= StrictLegacyMode | StrictEffectsMode;
    }
  } else {
    mode = NoMode;
  }

  if (__DEV__ || (enableProfilerTimer && isDevToolsPresent)) {
    // dev: Enable profiling instrumentation by default.
    // profile: enabled if DevTools is present or subtree is wrapped in <Profiler>.
    // production: disabled.
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}

// TODO: Get rid of this helper. Only createFiberFromElement should exist.
export function createFiberFromTypeAndProps(
  type: any, // React$ElementType
  key: ReactKey,
  pendingProps: any,
  owner: null | ReactComponentInfo | Fiber,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let fiberTag: WorkTag = FunctionComponent;
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  let resolvedType = type;
  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
      if (__DEV__) {
        resolvedType = resolveClassForHotReloading(resolvedType);
      }
    } else {
      if (__DEV__) {
        resolvedType = resolveFunctionForHotReloading(resolvedType);
      }
    }
  } else if (typeof type === 'string') {
    // $FlowFixMe[constant-condition]
    if (supportsResources && supportsSingletons) {
      const hostContext = getHostContext();
      fiberTag = isHostHoistableType(type, pendingProps, hostContext)
        ? HostHoistable
        : isHostSingletonType(type)
          ? HostSingleton
          : HostComponent;
      // $FlowFixMe[constant-condition]
    } else if (supportsResources) {
      const hostContext = getHostContext();
      fiberTag = isHostHoistableType(type, pendingProps, hostContext)
        ? HostHoistable
        : HostComponent;
      // $FlowFixMe[constant-condition]
    } else if (supportsSingletons) {
      fiberTag = isHostSingletonType(type) ? HostSingleton : HostComponent;
    } else {
      fiberTag = HostComponent;
    }
  } else {
    getTag: switch (type) {
      // $FlowFixMe[invalid-compare]
      case REACT_ACTIVITY_TYPE:
        return createFiberFromActivity(pendingProps, mode, lanes, key);
      // $FlowFixMe[invalid-compare]
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      // $FlowFixMe[invalid-compare]
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode;
        mode |= StrictLegacyMode;
        if (disableLegacyMode || (mode & ConcurrentMode) !== NoMode) {
          // Strict effects should never run on legacy roots
          mode |= StrictEffectsMode;
        }
        break;
      // $FlowFixMe[invalid-compare]
      case REACT_PROFILER_TYPE:
        return createFiberFromProfiler(pendingProps, mode, lanes, key);
      // $FlowFixMe[invalid-compare]
      case REACT_SUSPENSE_TYPE:
        return createFiberFromSuspense(pendingProps, mode, lanes, key);
      // $FlowFixMe[invalid-compare]
      case REACT_SUSPENSE_LIST_TYPE:
        return createFiberFromSuspenseList(pendingProps, mode, lanes, key);
      // $FlowFixMe[invalid-compare]
      case REACT_LEGACY_HIDDEN_TYPE:
        if (enableLegacyHidden) {
          return createFiberFromLegacyHidden(pendingProps, mode, lanes, key);
        }
      // $FlowFixMe[invalid-compare] -- falls through
      case REACT_VIEW_TRANSITION_TYPE:
        if (enableViewTransition) {
          return createFiberFromViewTransition(pendingProps, mode, lanes, key);
        }
      // $FlowFixMe[invalid-compare] -- falls through
      case REACT_SCOPE_TYPE:
        if (enableScopeAPI) {
          return createFiberFromScope(type, pendingProps, mode, lanes, key);
        }
      // $FlowFixMe[invalid-compare] -- falls through
      case REACT_TRACING_MARKER_TYPE:
        if (enableTransitionTracing) {
          return createFiberFromTracingMarker(pendingProps, mode, lanes, key);
        }
      // Fall through
      default: {
        // $FlowFixMe[invalid-compare]
        if (typeof type === 'object' && type !== null) {
          switch (type.$$typeof) {
            // $FlowFixMe[invalid-compare]
            case REACT_CONTEXT_TYPE:
              fiberTag = ContextProvider;
              break getTag;
            // $FlowFixMe[invalid-compare]
            case REACT_CONSUMER_TYPE:
              fiberTag = ContextConsumer;
              break getTag;
            // Fall through
            // $FlowFixMe[invalid-compare]
            case REACT_FORWARD_REF_TYPE:
              fiberTag = ForwardRef;
              if (__DEV__) {
                resolvedType = resolveForwardRefForHotReloading(resolvedType);
              }
              break getTag;
            // $FlowFixMe[invalid-compare]
            case REACT_MEMO_TYPE:
              fiberTag = MemoComponent;
              break getTag;
            // $FlowFixMe[invalid-compare]
            case REACT_LAZY_TYPE:
              fiberTag = LazyComponent;
              resolvedType = null;
              break getTag;
          }
        }
        let info = '';
        let typeString;
        if (__DEV__) {
          if (
            type === undefined ||
            (typeof type === 'object' &&
              // $FlowFixMe[invalid-compare]
              type !== null &&
              Object.keys(type).length === 0)
          ) {
            info +=
              ' You likely forgot to export your component from the file ' +
              "it's defined in, or you might have mixed up default and named imports.";
          }

          // $FlowFixMe[invalid-compare]
          if (type === null) {
            typeString = 'null';
          } else if (isArray(type)) {
            typeString = 'array';
          } else if (
            type !== undefined &&
            // $FlowFixMe[invalid-compare]
            type.$$typeof === REACT_ELEMENT_TYPE
          ) {
            typeString = `<${
              getComponentNameFromType(type.type) || 'Unknown'
            } />`;
            info =
              ' Did you accidentally export a JSX literal instead of a component?';
          } else {
            typeString = typeof type;
          }

          const ownerName = owner ? getComponentNameFromOwner(owner) : null;
          if (ownerName) {
            info += '\n\nCheck the render method of `' + ownerName + '`.';
          }
        } else {
          // $FlowFixMe[invalid-compare]
          typeString = type === null ? 'null' : typeof type;
        }

        // The type is invalid but it's conceptually a child that errored and not the
        // current component itself so we create a virtual child that throws in its
        // begin phase. This is the same thing we do in ReactChildFiber if we throw
        // but we do it here so that we can assign the debug owner and stack from the
        // element itself. That way the error stack will point to the JSX callsite.
        fiberTag = Throw;
        pendingProps = new Error(
          'Element type is invalid: expected a string (for built-in ' +
            'components) or a class/function (for composite components) ' +
            `but got: ${typeString}.${info}`,
        );
        resolvedType = null;
      }
    }
  }

  const fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;

  if (__DEV__) {
    fiber._debugOwner = owner;
  }

  return fiber;
}

export function createFiberFromElement(
  element: ReactElement,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let owner = null;
  if (__DEV__) {
    owner = element._owner;
  }
  const type = element.type;
  const key = element.key;
  const pendingProps = element.props;
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes,
  );
  if (__DEV__) {
    fiber._debugOwner = element._owner;
    fiber._debugStack = element._debugStack;
    fiber._debugTask = element._debugTask;
  }
  return fiber;
}

export function createFiberFromFragment(
  elements: ReactFragment,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(Fragment, elements, key, mode);
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromScope(
  scope: ReactScope,
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
) {
  const fiber = createFiber(ScopeComponent, pendingProps, key, mode);
  fiber.type = scope;
  fiber.elementType = scope;
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromProfiler(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  if (__DEV__) {
    if (typeof pendingProps.id !== 'string') {
      console.error(
        'Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.',
        typeof pendingProps.id,
      );
    }
  }

  const fiber = createFiber(Profiler, pendingProps, key, mode | ProfileMode);
  fiber.elementType = REACT_PROFILER_TYPE;
  fiber.lanes = lanes;

  if (enableProfilerTimer) {
    fiber.stateNode = {
      effectDuration: 0,
      passiveEffectDuration: 0,
    };
  }

  return fiber;
}

export function createFiberFromSuspense(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(SuspenseComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromSuspenseList(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(SuspenseListComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_LIST_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromOffscreen(
  pendingProps: OffscreenProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(OffscreenComponent, pendingProps, key, mode);
  fiber.lanes = lanes;
  return fiber;
}
export function createFiberFromActivity(
  pendingProps: ActivityProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(ActivityComponent, pendingProps, key, mode);
  fiber.elementType = REACT_ACTIVITY_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromViewTransition(
  pendingProps: ViewTransitionProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  if (!enableSuspenseyImages) {
    // Render a ViewTransition component opts into SuspenseyImages mode even
    // when the flag is off.
    mode |= SuspenseyImagesMode;
  }
  const fiber = createFiber(ViewTransitionComponent, pendingProps, key, mode);
  fiber.elementType = REACT_VIEW_TRANSITION_TYPE;
  fiber.lanes = lanes;
  const instance: ViewTransitionState = {
    autoName: null,
    paired: null,
    clones: null,
    ref: null,
  };
  fiber.stateNode = instance;
  return fiber;
}

export function createFiberFromLegacyHidden(
  pendingProps: LegacyHiddenProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(LegacyHiddenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_LEGACY_HIDDEN_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromTracingMarker(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: ReactKey,
): Fiber {
  const fiber = createFiber(TracingMarkerComponent, pendingProps, key, mode);
  fiber.elementType = REACT_TRACING_MARKER_TYPE;
  fiber.lanes = lanes;
  const tracingMarkerInstance: TracingMarkerInstance = {
    tag: TransitionTracingMarker,
    transitions: null,
    pendingBoundaries: null,
    aborts: null,
    name: pendingProps.name,
  };
  fiber.stateNode = tracingMarkerInstance;
  return fiber;
}

export function createFiberFromText(
  content: string,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromDehydratedFragment(
  dehydratedNode: SuspenseInstance | ActivityInstance,
): Fiber {
  const fiber = createFiber(DehydratedFragment, null, null, NoMode);
  fiber.stateNode = dehydratedNode;
  return fiber;
}

export function createFiberFromPortal(
  portal: ReactPortal,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const pendingProps = portal.children !== null ? portal.children : [];
  const fiber = createFiber(HostPortal, pendingProps, portal.key, mode);
  fiber.lanes = lanes;
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null, // Used by persistent updates
    implementation: portal.implementation,
  };
  return fiber;
}

export function createFiberFromThrow(
  error: mixed,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const fiber = createFiber(Throw, error, null, mode);
  fiber.lanes = lanes;
  return fiber;
}
