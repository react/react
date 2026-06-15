/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactConsumerType,
  ReactContext,
  ReactNodeList,
  ViewTransitionProps,
  ActivityProps,
  SuspenseProps,
  SuspenseListProps,
  SuspenseListRevealOrder,
  SuspenseListTailMode,
  TracingMarkerProps,
  CacheProps,
  ProfilerProps,
} from 'shared/ReactTypes';
import type {LazyComponent as LazyComponentType} from 'react/src/ReactLazy';
import type {Fiber, FiberRoot} from './ReactInternalTypes';
import type {TypeOfMode} from './ReactTypeOfMode';
import type {Lanes, Lane} from './ReactFiberLane';
import type {ActivityState} from './ReactFiberActivityComponent';
import type {
  SuspenseState,
  SuspenseListRenderState,
} from './ReactFiberSuspenseComponent';
import type {SuspenseContext} from './ReactFiberSuspenseContext';
import type {
  LegacyHiddenProps,
  OffscreenProps,
  OffscreenState,
  OffscreenQueue,
  OffscreenInstance,
} from './ReactFiberOffscreenComponent';
import type {
  Cache,
  CacheComponentState,
  SpawnedCachePool,
} from './ReactFiberCacheComponent';
import type {UpdateQueue} from './ReactFiberClassUpdateQueue';
import type {RootState} from './ReactFiberRoot';
import type {TracingMarkerInstance} from './ReactFiberTracingMarkerComponent';
import type {ViewTransitionState} from './ReactFiberViewTransitionComponent';

import {
  markComponentRenderStarted,
  markComponentRenderStopped,
  setIsStrictModeForDevtools,
} from './ReactFiberDevToolsHook';
import {
  FunctionComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
  HostPortal,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  IncompleteClassComponent,
  IncompleteFunctionComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
  Throw,
  ViewTransitionComponent,
  ActivityComponent,
} from './ReactWorkTags';
import {
  NoFlags,
  PerformedWork,
  Placement,
  PlacementDEV,
  Hydrating,
  Callback,
  ContentReset,
  DidCapture,
  Update,
  Ref,
  RefStatic,
  ChildDeletion,
  ForceUpdateForLegacySuspense,
  StaticMask,
  ShouldCapture,
  ForceClientRender,
  Passive,
  DidDefer,
  ViewTransitionNamedStatic,
  ViewTransitionNamedMount,
  LayoutStatic,
} from './ReactFiberFlags';
import {
  disableLegacyContext,
  disableLegacyContextForFunctionComponents,
  enableProfilerCommitHooks,
  enableProfilerTimer,
  enableScopeAPI,
  enableSchedulingProfiler,
  enableTransitionTracing,
  enableLegacyHidden,
  enableCPUSuspense,
  disableLegacyMode,
  enableViewTransition,
  enableFragmentRefs,
} from 'shared/ReactFeatureFlags';
import shallowEqual from 'shared/shallowEqual';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import ReactStrictModeWarnings from './ReactStrictModeWarnings';
import {
  REACT_LAZY_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  REACT_CONTEXT_TYPE,
} from 'shared/ReactSymbols';
import {setCurrentFiber} from './ReactCurrentFiber';
import {
  resolveFunctionForHotReloading,
  resolveForwardRefForHotReloading,
  resolveClassForHotReloading,
} from './ReactFiberHotReloading';

import {
  mountChildFibers,
  reconcileChildFibers,
  cloneChildFibers,
  validateSuspenseListChildren,
} from './ReactChildFiber';
import {
  processUpdateQueue,
  cloneUpdateQueue,
  initializeUpdateQueue,
  enqueueCapturedUpdate,
  suspendIfUpdateReadFromEntangledAsyncAction,
} from './ReactFiberClassUpdateQueue';
import {
  NoLane,
  NoLanes,
  OffscreenLane,
  DefaultLane,
  SomeRetryLane,
  includesSomeLane,
  includesOnlyRetries,
  laneToLanes,
  removeLanes,
  mergeLanes,
  getBumpedLaneForHydration,
  pickArbitraryLane,
} from './ReactFiberLane';
import {
  ConcurrentMode,
  NoMode,
  ProfileMode,
  StrictLegacyMode,
} from './ReactTypeOfMode';
import {
  shouldSetTextContent,
  isSuspenseInstancePending,
  isSuspenseInstanceFallback,
  getSuspenseInstanceFallbackErrorDetails,
  supportsHydration,
  supportsResources,
  supportsSingletons,
  isPrimaryRenderer,
  getResource,
  createHoistableInstance,
  HostTransitionContext,
} from './ReactFiberConfig';
import type {ActivityInstance, SuspenseInstance} from './ReactFiberConfig';
import {shouldError, shouldSuspend} from './ReactFiberReconciler';
import {
  pushHostContext,
  pushHostContainer,
  getRootHostContainer,
} from './ReactFiberHostContext';
import {
  suspenseStackCursor,
  pushSuspenseListContext,
  ForceSuspenseFallback,
  hasSuspenseListContext,
  setDefaultShallowSuspenseListContext,
  setShallowSuspenseListContext,
  pushPrimaryTreeSuspenseHandler,
  pushFallbackTreeSuspenseHandler,
  pushDehydratedActivitySuspenseHandler,
  pushOffscreenSuspenseHandler,
  reuseSuspenseHandlerOnStack,
  popSuspenseHandler,
} from './ReactFiberSuspenseContext';
import {
  pushHiddenContext,
  reuseHiddenContextOnStack,
} from './ReactFiberHiddenContext';
import {findFirstSuspended} from './ReactFiberSuspenseComponent';
import {
  pushProvider,
  propagateContextChange,
  lazilyPropagateParentContextChanges,
  propagateParentContextChangesToDeferredTree,
  checkIfContextChanged,
  readContext,
  prepareToReadContext,
  scheduleContextWorkOnParentPath,
} from './ReactFiberNewContext';
import {
  renderWithHooks,
  checkDidRenderIdHook,
  bailoutHooks,
  replaySuspendedComponentWithHooks,
  renderTransitionAwareHostComponentWithHooks,
} from './ReactFiberHooks';
import {stopProfilerTimerIfRunning} from './ReactProfilerTimer';
import {
  getMaskedContext,
  getUnmaskedContext,
  hasContextChanged as hasLegacyContextChanged,
  pushContextProvider as pushLegacyContextProvider,
  isContextProvider as isLegacyContextProvider,
  pushTopLevelContextObject,
  invalidateContextProvider,
} from './ReactFiberLegacyContext';
import {
  getIsHydrating,
  enterHydrationState,
  reenterHydrationStateFromDehydratedActivityInstance,
  reenterHydrationStateFromDehydratedSuspenseInstance,
  resetHydrationState,
  claimHydratableSingleton,
  tryToClaimNextHydratableInstance,
  tryToClaimNextHydratableTextInstance,
  claimNextHydratableActivityInstance,
  claimNextHydratableSuspenseInstance,
  warnIfHydrating,
  queueHydrationError,
} from './ReactFiberHydrationContext';
import {
  constructClassInstance,
  mountClassInstance,
  resumeMountClassInstance,
  updateClassInstance,
  resolveClassComponentProps,
} from './ReactFiberClassComponent';
import {
  createFiberFromTypeAndProps,
  createFiberFromFragment,
  createFiberFromOffscreen,
  createWorkInProgress,
  isSimpleFunctionComponent,
  isFunctionClassComponent,
} from './ReactFiber';
import {
  scheduleUpdateOnFiber,
  renderDidSuspendDelayIfPossible,
  markSkippedUpdateLanes,
  markRenderDerivedCause,
  getWorkInProgressRoot,
  peekDeferredLane,
} from './ReactFiberWorkLoop';
import {enqueueConcurrentRenderForLane} from './ReactFiberConcurrentUpdates';
import {pushCacheProvider, CacheContext} from './ReactFiberCacheComponent';
import {
  createCapturedValueFromError,
  createCapturedValueAtFiber,
} from './ReactCapturedValue';
import {OffscreenVisible} from './ReactFiberOffscreenComponent';
import {
  createClassErrorUpdate,
  initializeClassErrorUpdate,
} from './ReactFiberThrow';
import {
  getForksAtLevel,
  isForkedChild,
  pushTreeId,
  pushMaterializedTreeId,
} from './ReactFiberTreeContext';
import {
  requestCacheFromPool,
  pushRootTransition,
  getSuspendedCache,
  pushTransition,
  getOffscreenDeferredCache,
  getPendingTransitions,
} from './ReactFiberTransition';
import {
  getMarkerInstances,
  pushMarkerInstance,
  pushRootMarkerInstance,
  TransitionTracingMarker,
} from './ReactFiberTracingMarkerComponent';
import {callComponentInDEV, callRenderInDEV} from './ReactFiberCallUserSpace';
import {resolveLazy} from './ReactFiberThenable';

// A special exception that's used to unwind the stack when an update flows
// into a dehydrated boundary.
export const SelectiveHydrationException: mixed = new Error(
  "This is not a real error. It's an implementation detail of React's " +
    "selective hydration feature. If this leaks into userspace, it's a bug in " +
    'React. Please file an issue.',
);

let didReceiveUpdate: boolean = false;

let didWarnAboutBadClass;
let didWarnAboutContextTypeOnFunctionComponent;
let didWarnAboutContextTypes;
let didWarnAboutGetDerivedStateOnFunctionComponent;
export let didWarnAboutReassigningProps: boolean;
let didWarnAboutRevealOrder;
let didWarnAboutTailOptions;
let didWarnAboutClassNameOnViewTransition;

if (__DEV__) {
  didWarnAboutBadClass = {} as {[string]: boolean};
  didWarnAboutContextTypeOnFunctionComponent = {} as {[string]: boolean};
  didWarnAboutContextTypes = {} as {[string]: boolean};
  didWarnAboutGetDerivedStateOnFunctionComponent = {} as {[string]: boolean};
  didWarnAboutReassigningProps = false;
  didWarnAboutRevealOrder = {} as {[string]: boolean};
  didWarnAboutTailOptions = {} as {[string]: boolean};
  didWarnAboutClassNameOnViewTransition = {} as {[string]: boolean};
}

export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes,
) {
  if (current === null) {
    // If this is a fresh new component that hasn't been rendered yet, we
    // won't update its child set by applying minimal side-effects. Instead,
    // we will add them all to the child before it gets rendered. That means
    // we can optimize this reconciliation pass by not tracking side-effects.
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
  } else {
    // If the current child is the same as the work in progress, it means that
    // we haven't yet started any work on these children. Therefore, we use
    // the clone algorithm to create a copy of all the current children.

    // If we had any progressed work already, that is invalid at this point so
    // let's throw it out.
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes,
    );
  }
}

function forceUnmountCurrentAndReconcile(
  current: Fiber,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes,
) {
  // This function is fork of reconcileChildren. It's used in cases where we
  // want to reconcile without matching against the existing set. This has the
  // effect of all current children being unmounted; even if the type and key
  // are the same, the old child is unmounted and a new child is created.
  //
  // To do this, we're going to go through the reconcile algorithm twice. In
  // the first pass, we schedule a deletion for all the current children by
  // passing null.
  workInProgress.child = reconcileChildFibers(
    workInProgress,
    current.child,
    null,
    renderLanes,
  );
  // In the second pass, we mount the new children. The trick here is that we
  // pass null in place of where we usually pass the current child set. This has
  // the effect of remounting all children regardless of whether their
  // identities match.
  workInProgress.child = reconcileChildFibers(
    workInProgress,
    null,
    nextChildren,
    renderLanes,
  );
}

function updateForwardRef(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  // TODO: current can be non-null here even if the component
  // hasn't yet mounted. This happens after the first render suspends.
  // We'll need to figure out if this is fine or can cause issues.
  const render = Component.render;
  const ref = workInProgress.ref;

  let propsWithoutRef;
  if ('ref' in nextProps) {
    // `ref` is just a prop now, but `forwardRef` expects it to not appear in
    // the props object. This used to happen in the JSX runtime, but now we do
    // it here.
    propsWithoutRef = {} as {[string]: any};
    for (const key in nextProps) {
      // Since `ref` should only appear in props via the JSX transform, we can
      // assume that this is a plain object. So we don't need a
      // hasOwnProperty check.
      if (key !== 'ref') {
        propsWithoutRef[key] = nextProps[key];
      }
    }
  } else {
    propsWithoutRef = nextProps;
  }

  // The rest is a fork of updateFunctionComponent
  prepareToReadContext(workInProgress, renderLanes);
  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }

  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    render,
    propsWithoutRef,
    ref,
    renderLanes,
  );
  const hasId = checkDidRenderIdHook();

  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  if (current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderLanes);
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  if (getIsHydrating() && hasId) {
    pushMaterializedTreeId(workInProgress);
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateMemoComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
): null | Fiber {
  if (current === null) {
    const type = Component.type;
    if (isSimpleFunctionComponent(type) && Component.compare === null) {
      let resolvedType = type;
      if (__DEV__) {
        resolvedType = resolveFunctionForHotReloading(type);
      }
      // If this is a plain function component without default props,
      // and with only the default shallow comparison, we upgrade it
      // to a SimpleMemoComponent to allow fast path updates.
      workInProgress.tag = SimpleMemoComponent;
      workInProgress.type = resolvedType;
      if (__DEV__) {
        validateFunctionComponentInDev(workInProgress, type);
      }
      return updateSimpleMemoComponent(
        current,
        workInProgress,
        resolvedType,
        nextProps,
        renderLanes,
      );
    }
    const child = createFiberFromTypeAndProps(
      Component.type,
      null,
      nextProps,
      workInProgress,
      workInProgress.mode,
      renderLanes,
    );
    child.ref = workInProgress.ref;
    child.return = workInProgress;
    workInProgress.child = child;
    return child;
  }
  const currentChild = current.child as any as Fiber; // This is always exactly one child
  const hasScheduledUpdateOrContext = checkScheduledUpdateOrContext(
    current,
    renderLanes,
  );
  if (!hasScheduledUpdateOrContext) {
    // This will be the props with resolved defaultProps,
    // unlike current.memoizedProps which will be the unresolved ones.
    const prevProps = currentChild.memoizedProps;
    // Default to shallow comparison
    let compare = Component.compare;
    compare = compare !== null ? compare : shallowEqual;
    if (compare(prevProps, nextProps) && current.ref === workInProgress.ref) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }
  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  const newChild = createWorkInProgress(currentChild, nextProps);
  newChild.ref = workInProgress.ref;
  newChild.return = workInProgress;
  workInProgress.child = newChild;
  return newChild;
}

function updateSimpleMemoComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
): null | Fiber {
  // TODO: current can be non-null here even if the component
  // hasn't yet mounted. This happens when the inner render suspends.
  // We'll need to figure out if this is fine or can cause issues.
  if (current !== null) {
    const prevProps = current.memoizedProps;
    if (
      shallowEqual(prevProps, nextProps) &&
      current.ref === workInProgress.ref &&
      // Prevent bailout if the implementation changed due to hot reload.
      (__DEV__ ? workInProgress.type === current.type : true)
    ) {
      didReceiveUpdate = false;

      // The props are shallowly equal. Reuse the previous props object, like we
      // would during a normal fiber bailout.
      //
      // We don't have strong guarantees that the props object is referentially
      // equal during updates where we can't bail out anyway — like if the props
      // are shallowly equal, but there's a local state or context update in the
      // same batch.
      //
      // However, as a principle, we should aim to make the behavior consistent
      // across different ways of memoizing a component. For example, React.memo
      // has a different internal Fiber layout if you pass a normal function
      // component (SimpleMemoComponent) versus if you pass a different type
      // like forwardRef (MemoComponent). But this is an implementation detail.
      // Wrapping a component in forwardRef (or React.lazy, etc) shouldn't
      // affect whether the props object is reused during a bailout.
      workInProgress.pendingProps = nextProps = prevProps;

      if (!checkScheduledUpdateOrContext(current, renderLanes)) {
        // The pending lanes were cleared at the beginning of beginWork. We're
        // about to bail out, but there might be other lanes that weren't
        // included in the current render. Usually, the priority level of the
        // remaining updates is accumulated during the evaluation of the
        // component (i.e. when processing the update queue). But since since
        // we're bailing out early *without* evaluating the component, we need
        // to account for it here, too. Reset to the value of the current fiber.
        // NOTE: This only applies to SimpleMemoComponent, not MemoComponent,
        // because a MemoComponent fiber does not have hooks or an update queue;
        // rather, it wraps around an inner component, which may or may not
        // contains hooks.
        // TODO: Move the reset at in beginWork out of the common path so that
        // this is no longer necessary.
        workInProgress.lanes = current.lanes;
        return bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes,
        );
      } else if ((current.flags & ForceUpdateForLegacySuspense) !== NoFlags) {
        // This is a special case that only exists for legacy mode.
        // See https://github.com/facebook/react/pull/19216.
        didReceiveUpdate = true;
      }
    }
  }
  return updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes,
  );
}

function updateOffscreenComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
  nextProps: OffscreenProps,
) {
  const nextChildren = nextProps.children;

  const prevState: OffscreenState | null =
    current !== null ? current.memoizedState : null;

  if (current === null && workInProgress.stateNode === null) {
    // We previously reset the work-in-progress.
    // We need to create a new Offscreen instance.
    const primaryChildInstance: OffscreenInstance = {
      _visibility: OffscreenVisible,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null,
    };
    workInProgress.stateNode = primaryChildInstance;
  }

  if (
    nextProps.mode === 'hidden' ||
    (enableLegacyHidden && nextProps.mode === 'unstable-defer-without-hiding')
  ) {
    // Rendering a hidden tree.

    const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags;
    if (didSuspend) {
      // Something suspended inside a hidden tree

      // Include the base lanes from the last render
      const nextBaseLanes =
        prevState !== null
          ? mergeLanes(prevState.baseLanes, renderLanes)
          : renderLanes;

      let remainingChildLanes;
      if (current !== null) {
        // Reset to the current children
        let currentChild = (workInProgress.child = current.child);

        // The current render suspended, but there may be other lanes with
        // pending work. We can't read `childLanes` from the current Offscreen
        // fiber because we reset it when it was deferred; however, we can read
        // the pending lanes from the child fibers.
        let currentChildLanes: Lanes = NoLanes;
        while (currentChild !== null) {
          currentChildLanes = mergeLanes(
            mergeLanes(currentChildLanes, currentChild.lanes),
            currentChild.childLanes,
          );
          currentChild = currentChild.sibling;
        }
        const lanesWeJustAttempted = nextBaseLanes;
        remainingChildLanes = removeLanes(
          currentChildLanes,
          lanesWeJustAttempted,
        );
      } else {
        remainingChildLanes = NoLanes;
        workInProgress.child = null;
      }

      return deferHiddenOffscreenComponent(
        current,
        workInProgress,
        nextBaseLanes,
        renderLanes,
        remainingChildLanes,
      );
    }

    if (
      !disableLegacyMode &&
      (workInProgress.mode & ConcurrentMode) === NoMode
    ) {
      // In legacy sync mode, don't defer the subtree. Render it now.
      // TODO: Consider how Offscreen should work with transitions in the future
      const nextState: OffscreenState = {
        baseLanes: NoLanes,
        cachePool: null,
      };
      workInProgress.memoizedState = nextState;
      // push the cache pool even though we're going to bail out
      // because otherwise there'd be a context mismatch
      if (current !== null) {
        pushTransition(workInProgress, null, null);
      }
      reuseHiddenContextOnStack(workInProgress);
      pushOffscreenSuspenseHandler(workInProgress);
    } else if (!includesSomeLane(renderLanes, OffscreenLane as Lane)) {
      // We're hidden, and we're not rendering at Offscreen. We will bail out
      // and resume this tree later.

      // Schedule this fiber to re-render at Offscreen priority

      const remainingChildLanes = (workInProgress.lanes =
        laneToLanes(OffscreenLane));

      // Include the base lanes from the last render
      const nextBaseLanes =
        prevState !== null
          ? mergeLanes(prevState.baseLanes, renderLanes)
          : renderLanes;

      return deferHiddenOffscreenComponent(
        current,
        workInProgress,
        nextBaseLanes,
        renderLanes,
        remainingChildLanes,
      );
    } else {
      // This is the second render. The surrounding visible content has already
      // committed. Now we resume rendering the hidden tree.

      // Rendering at offscreen, so we can clear the base lanes.
      const nextState: OffscreenState = {
        baseLanes: NoLanes,
        cachePool: null,
      };
      workInProgress.memoizedState = nextState;
      if (current !== null) {
        // If the render that spawned this one accessed the cache pool, resume
        // using the same cache. Unless the parent changed, since that means
        // there was a refresh.
        const prevCachePool = prevState !== null ? prevState.cachePool : null;
        // TODO: Consider if and how Offscreen pre-rendering should
        // be attributed to the transition that spawned it
        pushTransition(workInProgress, prevCachePool, null);
      }

      // Push the lanes that were skipped when we bailed out.
      if (prevState !== null) {
        pushHiddenContext(workInProgress, prevState);
      } else {
        reuseHiddenContextOnStack(workInProgress);
      }
      pushOffscreenSuspenseHandler(workInProgress);
    }
  } else {
    // Rendering a visible tree.
    if (prevState !== null) {
      // We're going from hidden -> visible.
      let prevCachePool = null;
      // If the render that spawned this one accessed the cache pool, resume
      // using the same cache. Unless the parent changed, since that means
      // there was a refresh.
      prevCachePool = prevState.cachePool;

      let transitions = null;
      if (enableTransitionTracing) {
        // We have now gone from hidden to visible, so any transitions should
        // be added to the stack to get added to any Offscreen/suspense children
        const instance: OffscreenInstance | null = workInProgress.stateNode;
        if (instance !== null && instance._transitions != null) {
          transitions = Array.from(instance._transitions);
        }
      }

      pushTransition(workInProgress, prevCachePool, transitions);

      // Push the lanes that were skipped when we bailed out.
      pushHiddenContext(workInProgress, prevState);
      reuseSuspenseHandlerOnStack(workInProgress);

      // Since we're not hidden anymore, reset the state
      workInProgress.memoizedState = null;
    } else {
      // We weren't previously hidden, and we still aren't, so there's nothing
      // special to do. Need to push to the stack regardless, though, to avoid
      // a push/pop misalignment.

      // If the render that spawned this one accessed the cache pool, resume
      // using the same cache. Unless the parent changed, since that means
      // there was a refresh.
      if (current !== null) {
        pushTransition(workInProgress, null, null);
      }

      // We're about to bail out, but we need to push this to the stack anyway
      // to avoid a push/pop misalignment.
      reuseHiddenContextOnStack(workInProgress);
      reuseSuspenseHandlerOnStack(workInProgress);
    }
  }

  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function bailoutOffscreenComponent(
  current: Fiber | null,
  workInProgress: Fiber,
): Fiber | null {
  if (
    (current === null || current.tag !== OffscreenComponent) &&
    workInProgress.stateNode === null
  ) {
    const primaryChildInstance: OffscreenInstance = {
      _visibility: OffscreenVisible,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null,
    };
    workInProgress.stateNode = primaryChildInstance;
  }

  return workInProgress.sibling;
}

function deferHiddenOffscreenComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  nextBaseLanes: Lanes,
  renderLanes: Lanes,
  remainingChildLanes: Lanes,
) {
  const nextState: OffscreenState = {
    baseLanes: nextBaseLanes,
    // Save the cache pool so we can resume later.
    cachePool: getOffscreenDeferredCache(),
  };
  workInProgress.memoizedState = nextState;
  // push the cache pool even though we're going to bail out
  // because otherwise there'd be a context mismatch
  if (current !== null) {
    pushTransition(workInProgress, null, null);
  }

  // We're about to bail out, but we need to push this to the stack anyway
  // to avoid a push/pop misalignment.
  reuseHiddenContextOnStack(workInProgress);

  pushOffscreenSuspenseHandler(workInProgress);

  if (current !== null) {
    // Since this tree will resume rendering in a separate render, we need
    // to propagate parent contexts now so we don't lose track of which
    // ones changed.
    propagateParentContextChangesToDeferredTree(
      current,
      workInProgress,
      renderLanes,
    );
  }

  // We override the remaining child lanes to be the subset that we computed
  // on the outside. We need to do this after propagating the context
  // because propagateParentContextChangesToDeferredTree may schedule
  // work which bubbles all the way up to the root and updates our child lanes.
  // We want to dismiss that since we're not going to work on it yet.
  workInProgress.childLanes = remainingChildLanes;

  return null;
}

function updateLegacyHiddenComponent(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextProps: LegacyHiddenProps = workInProgress.pendingProps;
  // Note: These happen to have identical begin phases, for now. We shouldn't hold
  // ourselves to this constraint, though. If the behavior diverges, we should
  // fork the function.
  // This just works today because it has the same Props.
  return updateOffscreenComponent(
    current,
    workInProgress,
    renderLanes,
    nextProps,
  );
}

function mountActivityChildren(
  workInProgress: Fiber,
  nextProps: ActivityProps,
  renderLanes: Lanes,
) {
  if (__DEV__) {
    const hiddenProp = (nextProps as any).hidden;
    if (hiddenProp !== undefined) {
      console.error(
        '<Activity> doesn\'t accept a hidden prop. Use mode="hidden" instead.\n' +
          '- <Activity %s>\n' +
          '+ <Activity %s>',
        hiddenProp === true
          ? 'hidden'
          : hiddenProp === false
            ? 'hidden={false}'
            : 'hidden={...}',
        hiddenProp ? 'mode="hidden"' : 'mode="visible"',
      );
    }
  }
  const nextChildren = nextProps.children;
  const nextMode = nextProps.mode;
  const mode = workInProgress.mode;
  const offscreenChildProps: OffscreenProps = {
    mode: nextMode,
    children: nextChildren,
  };
  const primaryChildFragment = mountWorkInProgressOffscreenFiber(
    offscreenChildProps,
    mode,
    renderLanes,
  );
  primaryChildFragment.ref = workInProgress.ref;
  workInProgress.child = primaryChildFragment;
  primaryChildFragment.return = workInProgress;
  return primaryChildFragment;
}

function retryActivityComponentWithoutHydrating(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // Falling back to client rendering. Because this has performance
  // implications, it's considered a recoverable error, even though the user
  // likely won't observe anything wrong with the UI.

  // This will add the old fiber to the deletion list
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);

  // We're now not suspended nor dehydrated.
  const nextProps: ActivityProps = workInProgress.pendingProps;
  const primaryChildFragment = mountActivityChildren(
    workInProgress,
    nextProps,
    renderLanes,
  );
  // Needs a placement effect because the parent (the Activity boundary) already
  // mounted but this is a new fiber.
  primaryChildFragment.flags |= Placement;

  // If we're not going to hydrate we can't leave it dehydrated if something
  // suspends. In that case we want that to bubble to the nearest parent boundary
  // so we need to pop our own handler that we just pushed.
  popSuspenseHandler(workInProgress);

  workInProgress.memoizedState = null;

  return primaryChildFragment;
}

function mountDehydratedActivityComponent(
  workInProgress: Fiber,
  activityInstance: ActivityInstance,
  renderLanes: Lanes,
): null | Fiber {
  // During the first pass, we'll bail out and not drill into the children.
  // Instead, we'll leave the content in place and try to hydrate it later.
  // We'll continue hydrating the rest at offscreen priority since we'll already
  // be showing the right content coming from the server, it is no rush.
  workInProgress.lanes = laneToLanes(OffscreenLane);
  return null;
}

function updateDehydratedActivityComponent(
  current: Fiber,
  workInProgress: Fiber,
  didSuspend: boolean,
  nextProps: ActivityProps,
  activityInstance: ActivityInstance,
  activityState: ActivityState,
  renderLanes: Lanes,
): null | Fiber {
  // We'll handle suspending since if something suspends we can just leave
  // it dehydrated. We push early and then pop if we enter non-dehydrated attempts.
  pushDehydratedActivitySuspenseHandler(workInProgress);
  if (!didSuspend) {
    // This is the first render pass. Attempt to hydrate.

    // We should never be hydrating at this point because it is the first pass,
    // but after we've already committed once.
    warnIfHydrating();

    if (includesSomeLane(renderLanes, OffscreenLane as Lane)) {
      // If we're rendering Offscreen and we're entering the activity then it's possible
      // that the only reason we rendered was because this boundary left work. Provide
      // it as a cause if another one doesn't already exist.
      markRenderDerivedCause(workInProgress);
    }

    if (
      // TODO: Factoring is a little weird, since we check this right below, too.
      !didReceiveUpdate
    ) {
      // We need to check if any children have context before we decide to bail
      // out, so propagate the changes now.
      lazilyPropagateParentContextChanges(current, workInProgress, renderLanes);
    }

    // We use lanes to indicate that a child might depend on context, so if
    // any context has changed, we need to treat is as if the input might have changed.
    const hasContextChanged = includesSomeLane(renderLanes, current.childLanes);
    if (didReceiveUpdate || hasContextChanged) {
      // This boundary has changed since the first render. This means that we are now unable to
      // hydrate it. We might still be able to hydrate it using a higher priority lane.
      const root = getWorkInProgressRoot();
      if (root !== null) {
        const attemptHydrationAtLane = getBumpedLaneForHydration(
          root,
          renderLanes,
        );
        if (
          attemptHydrationAtLane !== NoLane &&
          attemptHydrationAtLane !== activityState.retryLane
        ) {
          // Intentionally mutating since this render will get interrupted. This
          // is one of the very rare times where we mutate the current tree
          // during the render phase.
          activityState.retryLane = attemptHydrationAtLane;
          enqueueConcurrentRenderForLane(current, attemptHydrationAtLane);
          scheduleUpdateOnFiber(root, current, attemptHydrationAtLane);

          // Throw a special object that signals to the work loop that it should
          // interrupt the current render.
          //
          // Because we're inside a React-only execution stack, we don't
          // strictly need to throw here — we could instead modify some internal
          // work loop state. But using an exception means we don't need to
          // check for this case on every iteration of the work loop. So doing
          // it this way moves the check out of the fast path.
          throw SelectiveHydrationException;
        } else {
          // We have already tried to ping at a higher priority than we're rendering with
          // so if we got here, we must have failed to hydrate at those levels. We must
          // now give up. Instead, we're going to delete the whole subtree and instead inject
          // a new real Activity boundary to take its place. This might suspend for a while
          // and if it does we might still have an opportunity to hydrate before this pass
          // commits.
        }
      }

      // If we did not selectively hydrate, we'll continue rendering without
      // hydrating. Mark this tree as suspended to prevent it from committing
      // outside a transition.
      //
      // This path should only happen if the hydration lane already suspended.
      renderDidSuspendDelayIfPossible();
      return retryActivityComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
      );
    } else {
      // This is the first attempt.

      reenterHydrationStateFromDehydratedActivityInstance(
        workInProgress,
        activityInstance,
        activityState.treeContext,
      );

      const primaryChildFragment = mountActivityChildren(
        workInProgress,
        nextProps,
        renderLanes,
      );
      // Mark the children as hydrating. This is a fast path to know whether this
      // tree is part of a hydrating tree. This is used to determine if a child
      // node has fully mounted yet, and for scheduling event replaying.
      // Conceptually this is similar to Placement in that a new subtree is
      // inserted into the React tree here. It just happens to not need DOM
      // mutations because it already exists.
      // We should still treat it as a newly inserted Fiber to double invoke Strict Effects.
      primaryChildFragment.flags |= Hydrating | PlacementDEV;
      return primaryChildFragment;
    }
  } else {
    // This is the second render pass. We already attempted to hydrated, but
    // something either suspended or errored.

    if (workInProgress.flags & ForceClientRender) {
      // Something errored during hydration. Try again without hydrating.
      // The error should've already been logged in throwException.
      workInProgress.flags &= ~ForceClientRender;
      return retryActivityComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
      );
    } else if (
      (workInProgress.memoizedState as null | ActivityState) !== null
    ) {
      // Something suspended and we should still be in dehydrated mode.
      // Leave the existing child in place.

      workInProgress.child = current.child;
      // The dehydrated completion pass expects this flag to be there
      // but the normal offscreen pass doesn't.
      workInProgress.flags |= DidCapture;
      return null;
    } else {
      // We called retryActivityComponentWithoutHydrating and tried client rendering
      // but now we suspended again. We should never arrive here because we should
      // not have pushed a suspense handler during that second pass and it should
      // instead have suspended above.
      throw new Error(
        'Client rendering an Activity suspended it again. This is a bug in React.',
      );
    }
  }
}

function updateActivityComponent(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextProps: ActivityProps = workInProgress.pendingProps;

  // Check if the first pass suspended.
  const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags;
  workInProgress.flags &= ~DidCapture;

  if (current === null) {
    // Initial mount

    // Special path for hydration
    // If we're currently hydrating, try to hydrate this boundary.
    // Hidden Activity boundaries are not emitted on the server.
    if (getIsHydrating()) {
      if (nextProps.mode === 'hidden') {
        // SSR doesn't render hidden Activity so it shouldn't hydrate,
        // even at offscreen lane. Defer to a client rendered offscreen lane.
        const primaryChildFragment = mountActivityChildren(
          workInProgress,
          nextProps,
          renderLanes,
        );
        workInProgress.lanes = laneToLanes(OffscreenLane);
        return bailoutOffscreenComponent(null, primaryChildFragment);
      } else {
        // We must push the suspense handler context *before* attempting to
        // hydrate, to avoid a mismatch in case it errors.
        pushDehydratedActivitySuspenseHandler(workInProgress);
        const dehydrated: ActivityInstance =
          claimNextHydratableActivityInstance(workInProgress);
        return mountDehydratedActivityComponent(
          workInProgress,
          dehydrated,
          renderLanes,
        );
      }
    }

    return mountActivityChildren(workInProgress, nextProps, renderLanes);
  } else {
    // This is an update.

    // Special path for hydration
    const prevState: null | ActivityState = current.memoizedState;

    if (prevState !== null) {
      const dehydrated = prevState.dehydrated;
      return updateDehydratedActivityComponent(
        current,
        workInProgress,
        didSuspend,
        nextProps,
        dehydrated,
        prevState,
        renderLanes,
      );
    }

    const currentChild: Fiber = current.child as any;

    const nextChildren = nextProps.children;
    const nextMode = nextProps.mode;
    const offscreenChildProps: OffscreenProps = {
      mode: nextMode,
      children: nextChildren,
    };

    if (
      includesSomeLane(renderLanes, OffscreenLane as Lane) &&
      includesSomeLane(renderLanes, current.lanes)
    ) {
      // If we're rendering Offscreen and we're entering the activity then it's possible
      // that the only reason we rendered was because this boundary left work. Provide
      // it as a cause if another one doesn't already exist.
      markRenderDerivedCause(workInProgress);
    }

    const primaryChildFragment = updateWorkInProgressOffscreenFiber(
      currentChild,
      offscreenChildProps,
    );

    primaryChildFragment.ref = workInProgress.ref;
    workInProgress.child = primaryChildFragment;
    primaryChildFragment.return = workInProgress;
    return primaryChildFragment;
  }
}

function updateCacheComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  prepareToReadContext(workInProgress, renderLanes);
  const parentCache = readContext(CacheContext);

  if (current === null) {
    // Initial mount. Request a fresh cache from the pool.
    const freshCache = requestCacheFromPool(renderLanes);
    const initialState: CacheComponentState = {
      parent: parentCache,
      cache: freshCache,
    };
    workInProgress.memoizedState = initialState;
    initializeUpdateQueue(workInProgress);
    pushCacheProvider(workInProgress, freshCache);
  } else {
    // Check for updates
    if (includesSomeLane(current.lanes, renderLanes)) {
      cloneUpdateQueue(current, workInProgress);
      processUpdateQueue(workInProgress, null, null, renderLanes);
      suspendIfUpdateReadFromEntangledAsyncAction();
    }
    const prevState: CacheComponentState = current.memoizedState;
    const nextState: CacheComponentState = workInProgress.memoizedState;

    // Compare the new parent cache to the previous to see detect there was
    // a refresh.
    if (prevState.parent !== parentCache) {
      // Refresh in parent. Update the parent.
      const derivedState: CacheComponentState = {
        parent: parentCache,
        cache: parentCache,
      };

      // Copied from getDerivedStateFromProps implementation. Once the update
      // queue is empty, persist the derived state onto the base state.
      workInProgress.memoizedState = derivedState;
      if (workInProgress.lanes === NoLanes) {
        const updateQueue: UpdateQueue<any> = workInProgress.updateQueue as any;
        workInProgress.memoizedState = updateQueue.baseState = derivedState;
      }

      pushCacheProvider(workInProgress, parentCache);
      // No need to propagate a context change because the refreshed parent
      // already did.
    } else {
      // The parent didn't refresh. Now check if this cache did.
      const nextCache = nextState.cache;
      pushCacheProvider(workInProgress, nextCache);
      if (nextCache !== prevState.cache) {
        // This cache refreshed. Propagate a context change.
        propagateContextChange(workInProgress, CacheContext, renderLanes);
      }
    }
  }

  const nextProps: CacheProps = workInProgress.pendingProps;

  const nextChildren = nextProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

// This should only be called if the name changes
function updateTracingMarkerComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  if (!enableTransitionTracing) {
    return null;
  }

  const nextProps: TracingMarkerProps = workInProgress.pendingProps;

  // TODO: (luna) Only update the tracing marker if it's newly rendered or it's name changed.
  // A tracing marker is only associated with the transitions that rendered
  // or updated it, so we can create a new set of transitions each time
  if (current === null) {
    const currentTransitions = getPendingTransitions();
    if (currentTransitions !== null) {
      const markerInstance: TracingMarkerInstance = {
        tag: TransitionTracingMarker,
        transitions: new Set(currentTransitions),
        pendingBoundaries: null,
        name: nextProps.name,
        aborts: null,
      };
      workInProgress.stateNode = markerInstance;

      // We call the marker complete callback when all child suspense boundaries resolve.
      // We do this in the commit phase on Offscreen. If the marker has no child suspense
      // boundaries, we need to schedule a passive effect to make sure we call the marker
      // complete callback.
      workInProgress.flags |= Passive;
    }
  } else {
    if (__DEV__) {
      if (current.memoizedProps.name !== nextProps.name) {
        console.error(
          'Changing the name of a tracing marker after mount is not supported. ' +
            'To remount the tracing marker, pass it a new key.',
        );
      }
    }
  }

  const instance: TracingMarkerInstance | null = workInProgress.stateNode;
  if (instance !== null) {
    pushMarkerInstance(workInProgress, instance);
  }
  const nextChildren = nextProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateFragment(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextChildren = workInProgress.pendingProps;
  if (enableFragmentRefs) {
    markRef(current, workInProgress);
  }
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateMode(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateProfiler(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  if (enableProfilerTimer) {
    workInProgress.flags |= Update;

    if (enableProfilerCommitHooks) {
      // Schedule a passive effect for this Profiler to call onPostCommit hooks.
      // This effect should be scheduled even if there is no onPostCommit callback for this Profiler,
      // because the effect is also where times bubble to parent Profilers.
      workInProgress.flags |= Passive;
      // Reset effect durations for the next eventual effect phase.
      // These are reset during render to allow the DevTools commit hook a chance to read them,
      const stateNode = workInProgress.stateNode;
      stateNode.effectDuration = -0;
      stateNode.passiveEffectDuration = -0;
    }
  }
  const nextProps: ProfilerProps = workInProgress.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function markRef(current: Fiber | null, workInProgress: Fiber) {
  // TODO: Check props.ref instead of fiber.ref when enableRefAsProp is on.
  const ref = workInProgress.ref;
  if (ref === null) {
    if (current !== null && current.ref !== null) {
      // Schedule a Ref effect
      workInProgress.flags |= Ref | RefStatic;
    }
  } else {
    if (typeof ref !== 'function' && typeof ref !== 'object') {
      throw new Error(
        'Expected ref to be a function, an object returned by React.createRef(), or undefined/null.',
      );
    }
    if (current === null || current.ref !== ref) {
      // Schedule a Ref effect
      workInProgress.flags |= Ref | RefStatic;
    }
  }
}

function mountIncompleteFunctionComponent(
  _current: null | Fiber,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  resetSuspendedCurrentOnMountInLegacyMode(_current, workInProgress);

  workInProgress.tag = FunctionComponent;

  return updateFunctionComponent(
    null,
    workInProgress,
    Component,
    nextProps,
    renderLanes,
  );
}

function updateFunctionComponent(
  current: null | Fiber,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  if (__DEV__) {
    if (
      Component.prototype &&
      typeof Component.prototype.render === 'function'
    ) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutBadClass[componentName]) {
        console.error(
          "The <%s /> component appears to have a render method, but doesn't extend React.Component. " +
            'This is likely to cause errors. Change %s to extend React.Component instead.',
          componentName,
          componentName,
        );
        didWarnAboutBadClass[componentName] = true;
      }
    }

    if (workInProgress.mode & StrictLegacyMode) {
      ReactStrictModeWarnings.recordLegacyContextWarning(workInProgress, null);
    }

    if (current === null) {
      // Some validations were previously done in mountIndeterminateComponent however and are now run
      // in updateFuntionComponent but only on mount
      validateFunctionComponentInDev(workInProgress, workInProgress.type);

      if (Component.contextTypes) {
        const componentName = getComponentNameFromType(Component) || 'Unknown';

        if (!didWarnAboutContextTypes[componentName]) {
          didWarnAboutContextTypes[componentName] = true;
          if (disableLegacyContext) {
            console.error(
              '%s uses the legacy contextTypes API which was removed in React 19. ' +
                'Use React.createContext() with React.useContext() instead. ' +
                '(https://react.dev/link/legacy-context)',
              componentName,
            );
          } else {
            console.error(
              '%s uses the legacy contextTypes API which will be removed soon. ' +
                'Use React.createContext() with React.useContext() instead. ' +
                '(https://react.dev/link/legacy-context)',
              componentName,
            );
          }
        }
      }
    }
  }

  let context;
  if (!disableLegacyContext && !disableLegacyContextForFunctionComponents) {
    const unmaskedContext = getUnmaskedContext(workInProgress, Component, true);
    context = getMaskedContext(workInProgress, unmaskedContext);
  }

  let nextChildren;
  let hasId;
  prepareToReadContext(workInProgress, renderLanes);
  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }
  if (__DEV__) {
    nextChildren = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes,
    );
    hasId = checkDidRenderIdHook();
  } else {
    nextChildren = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes,
    );
    hasId = checkDidRenderIdHook();
  }
  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  if (current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderLanes);
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  if (getIsHydrating() && hasId) {
    pushMaterializedTreeId(workInProgress);
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

export function replayFunctionComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  nextProps: any,
  Component: any,
  secondArg: any,
  renderLanes: Lanes,
): Fiber | null {
  // This function is used to replay a component that previously suspended,
  // after its data resolves. It's a simplified version of
  // updateFunctionComponent that reuses the hooks from the previous attempt.

  prepareToReadContext(workInProgress, renderLanes);
  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }
  const nextChildren = replaySuspendedComponentWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    secondArg,
  );
  const hasId = checkDidRenderIdHook();
  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  if (current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderLanes);
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  if (getIsHydrating() && hasId) {
    pushMaterializedTreeId(workInProgress);
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateClassComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  if (__DEV__) {
    // This is used by DevTools to force a boundary to error.
    switch (shouldError(workInProgress)) {
      case false: {
        // We previously simulated an error on this boundary
        // so the instance must have been constructed in a previous
        // commit.
        const instance = workInProgress.stateNode;
        const ctor = workInProgress.type;
        // TODO This way of resetting the error boundary state is a hack.
        // Is there a better way to do this?
        const tempInstance = new ctor(
          workInProgress.memoizedProps,
          instance.context,
        );
        const state = tempInstance.state;
        instance.updater.enqueueSetState(instance, state, null);
        break;
      }
      case true: {
        workInProgress.flags |= DidCapture;
        workInProgress.flags |= ShouldCapture;
        // eslint-disable-next-line react-internal/prod-error-codes
        const error = new Error('Simulated error coming from DevTools');
        const lane = pickArbitraryLane(renderLanes);
        workInProgress.lanes = mergeLanes(workInProgress.lanes, lane);
        // Schedule the error boundary to re-render using updated state
        const root: FiberRoot | null = getWorkInProgressRoot();
        if (root === null) {
          throw new Error(
            'Expected a work-in-progress root. This is a bug in React. Please file an issue.',
          );
        }
        const update = createClassErrorUpdate(lane);
        initializeClassErrorUpdate(
          update,
          root,
          workInProgress,
          createCapturedValueAtFiber(error, workInProgress),
        );
        enqueueCapturedUpdate(workInProgress, update);
        break;
      }
    }
  }

  // Push context providers early to prevent context stack mismatches.
  // During mounting we don't know the child context yet as the instance doesn't exist.
  // We will invalidate the child context in finishClassComponent() right after rendering.
  let hasContext;
  if (isLegacyContextProvider(Component)) {
    hasContext = true;
    pushLegacyContextProvider(workInProgress);
  } else {
    hasContext = false;
  }
  prepareToReadContext(workInProgress, renderLanes);

  const instance = workInProgress.stateNode;
  let shouldUpdate;
  if (instance === null) {
    resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress);

    // In the initial pass we might need to construct the instance.
    constructClassInstance(workInProgress, Component, nextProps);
    mountClassInstance(workInProgress, Component, nextProps, renderLanes);
    shouldUpdate = true;
  } else if (current === null) {
    // In a resume, we'll already have an instance we can reuse.
    shouldUpdate = resumeMountClassInstance(
      workInProgress,
      Component,
      nextProps,
      renderLanes,
    );
  } else {
    shouldUpdate = updateClassInstance(
      current,
      workInProgress,
      Component,
      nextProps,
      renderLanes,
    );
  }
  const nextUnitOfWork = finishClassComponent(
    current,
    workInProgress,
    Component,
    shouldUpdate,
    hasContext,
    renderLanes,
  );
  if (__DEV__) {
    const inst = workInProgress.stateNode;
    if (shouldUpdate && inst.props !== nextProps) {
      if (!didWarnAboutReassigningProps) {
        console.error(
          'It looks like %s is reassigning its own `this.props` while rendering. ' +
            'This is not supported and can lead to confusing bugs.',
          getComponentNameFromFiber(workInProgress) || 'a component',
        );
      }
      didWarnAboutReassigningProps = true;
    }
  }
  return nextUnitOfWork;
}

function finishClassComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  shouldUpdate: boolean,
  hasContext: boolean,
  renderLanes: Lanes,
) {
  // Refs should update even if shouldComponentUpdate returns false
  markRef(current, workInProgress);

  const didCaptureError = (workInProgress.flags & DidCapture) !== NoFlags;

  if (!shouldUpdate && !didCaptureError) {
    // Context providers should defer to sCU for rendering
    if (hasContext) {
      invalidateContextProvider(workInProgress, Component, false);
    }

    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  const instance = workInProgress.stateNode;

  // Rerender
  if (__DEV__) {
    setCurrentFiber(workInProgress);
  }
  let nextChildren;
  if (
    didCaptureError &&
    typeof Component.getDerivedStateFromError !== 'function'
  ) {
    // If we captured an error, but getDerivedStateFromError is not defined,
    // unmount all the children. componentDidCatch will schedule an update to
    // re-render a fallback. This is temporary until we migrate everyone to
    // the new API.
    // TODO: Warn in a future release.
    nextChildren = null;

    if (enableProfilerTimer) {
      stopProfilerTimerIfRunning(workInProgress);
    }
  } else {
    if (enableSchedulingProfiler) {
      markComponentRenderStarted(workInProgress);
    }
    if (__DEV__) {
      nextChildren = callRenderInDEV(instance);
      if (workInProgress.mode & StrictLegacyMode) {
        setIsStrictModeForDevtools(true);
        try {
          callRenderInDEV(instance);
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
    } else {
      nextChildren = instance.render();
    }
    if (enableSchedulingProfiler) {
      markComponentRenderStopped();
    }
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  if (current !== null && didCaptureError) {
    // If we're recovering from an error, reconcile without reusing any of
    // the existing children. Conceptually, the normal children and the children
    // that are shown on error are two different sets, so we shouldn't reuse
    // normal children even if their identities match.
    forceUnmountCurrentAndReconcile(
      current,
      workInProgress,
      nextChildren,
      renderLanes,
    );
  } else {
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  }

  // Memoize state using the values we just used to render.
  // TODO: Restructure so we never read values from the instance.
  workInProgress.memoizedState = instance.state;

  // The context might have changed so we need to recalculate it.
  if (hasContext) {
    invalidateContextProvider(workInProgress, Component, true);
  }

  return workInProgress.child;
}

function pushHostRootContext(workInProgress: Fiber) {
  const root = workInProgress.stateNode as FiberRoot;
  if (root.pendingContext) {
    pushTopLevelContextObject(
      workInProgress,
      root.pendingContext,
      root.pendingContext !== root.context,
    );
  } else if (root.context) {
    // Should always be set
    pushTopLevelContextObject(workInProgress, root.context, false);
  }
  pushHostContainer(workInProgress, root.containerInfo);
}

function updateHostRoot(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  pushHostRootContext(workInProgress);

  if (current === null) {
    throw new Error('Should have a current fiber. This is a bug in React.');
  }

  const nextProps = workInProgress.pendingProps;
  const prevState: RootState = workInProgress.memoizedState;
  const prevChildren = prevState.element;
  cloneUpdateQueue(current, workInProgress);
  processUpdateQueue(workInProgress, nextProps, null, renderLanes);

  const nextState: RootState = workInProgress.memoizedState;
  const root: FiberRoot = workInProgress.stateNode;
  pushRootTransition(workInProgress, root, renderLanes);

  if (enableTransitionTracing) {
    pushRootMarkerInstance(workInProgress);
  }

  const nextCache: Cache = nextState.cache;
  pushCacheProvider(workInProgress, nextCache);
  if (nextCache !== prevState.cache) {
    // The root cache refreshed.
    propagateContextChange(workInProgress, CacheContext, renderLanes);
  }

  // This would ideally go inside processUpdateQueue, but because it suspends,
  // it needs to happen after the `pushCacheProvider` call above to avoid a
  // context stack mismatch. A bit unfortunate.
  suspendIfUpdateReadFromEntangledAsyncAction();

  // Caution: React DevTools currently depends on this property
  // being called "element".
  const nextChildren = nextState.element;
  // $FlowFixMe[constant-condition]
  if (supportsHydration && prevState.isDehydrated) {
    // This is a hydration root whose shell has not yet hydrated. We should
    // attempt to hydrate.

    // Flip isDehydrated to false to indicate that when this render
    // finishes, the root will no longer be dehydrated.
    const overrideState: RootState = {
      element: nextChildren,
      isDehydrated: false,
      cache: nextState.cache,
    };
    const updateQueue: UpdateQueue<RootState> =
      workInProgress.updateQueue as any;
    // `baseState` can always be the last state because the root doesn't
    // have reducer functions so it doesn't need rebasing.
    updateQueue.baseState = overrideState;
    workInProgress.memoizedState = overrideState;

    if (workInProgress.flags & ForceClientRender) {
      // Something errored during a previous attempt to hydrate the shell, so we
      // forced a client render. We should have a recoverable error already scheduled.
      return mountHostRootWithoutHydrating(
        current,
        workInProgress,
        nextChildren,
        renderLanes,
      );
    } else if (nextChildren !== prevChildren) {
      const recoverableError = createCapturedValueAtFiber<mixed>(
        new Error(
          'This root received an early update, before anything was able ' +
            'hydrate. Switched the entire root to client rendering.',
        ),
        workInProgress,
      );
      queueHydrationError(recoverableError);
      return mountHostRootWithoutHydrating(
        current,
        workInProgress,
        nextChildren,
        renderLanes,
      );
    } else {
      // The outermost shell has not hydrated yet. Start hydrating.
      enterHydrationState(workInProgress);

      const child = mountChildFibers(
        workInProgress,
        null,
        nextChildren,
        renderLanes,
      );
      workInProgress.child = child;

      let node = child;
      while (node) {
        // Mark each child as hydrating. This is a fast path to know whether this
        // tree is part of a hydrating tree. This is used to determine if a child
        // node has fully mounted yet, and for scheduling event replaying.
        // Conceptually this is similar to Placement in that a new subtree is
        // inserted into the React tree here. It just happens to not need DOM
        // mutations because it already exists.
        // We should still treat it as a newly inserted Fiber to double invoke Strict Effects.
        node.flags = (node.flags & ~Placement) | Hydrating | PlacementDEV;
        node = node.sibling;
      }
    }
  } else {
    // Root is not dehydrated. Either this is a client-only root, or it
    // already hydrated.
    resetHydrationState();
    if (nextChildren === prevChildren) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  }
  return workInProgress.child;
}

function mountHostRootWithoutHydrating(
  current: Fiber,
  workInProgress: Fiber,
  nextChildren: ReactNodeList,
  renderLanes: Lanes,
) {
  // Revert to client rendering.
  resetHydrationState();

  workInProgress.flags |= ForceClientRender;

  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  if (current === null) {
    tryToClaimNextHydratableInstance(workInProgress);
  }

  pushHostContext(workInProgress);

  const type = workInProgress.type;
  const nextProps = workInProgress.pendingProps;
  const prevProps = current !== null ? current.memoizedProps : null;

  let nextChildren = nextProps.children;
  const isDirectTextChild = shouldSetTextContent(type, nextProps);

  if (isDirectTextChild) {
    // We special case a direct text child of a host node. This is a common
    // case. We won't handle it as a reified child. We will instead handle
    // this in the host environment that also has access to this prop. That
    // avoids allocating another HostText fiber and traversing it.
    nextChildren = null;
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    // If we're switching from a direct text child to a normal child, or to
    // empty, we need to schedule the text content to be reset.
    workInProgress.flags |= ContentReset;
  }

  const memoizedState = workInProgress.memoizedState;
  if (memoizedState !== null) {
    // This fiber has been upgraded to a stateful component. The only way
    // happens currently is for form actions. We use hooks to track the
    // pending and error state of the form.
    //
    // Once a fiber is upgraded to be stateful, it remains stateful for the
    // rest of its lifetime.
    const newState = renderTransitionAwareHostComponentWithHooks(
      current,
      workInProgress,
      renderLanes,
    );

    // If the transition state changed, propagate the change to all the
    // descendents. We use Context as an implementation detail for this.
    //
    // We need to update it here because
    // pushHostContext gets called before we process the state hook, to avoid
    // a state mismatch in the event that something suspends.
    //
    // NOTE: This assumes that there cannot be nested transition providers,
    // because the only renderer that implements this feature is React DOM,
    // and forms cannot be nested. If we did support nested providers, then
    // we would need to push a context value even for host fibers that
    // haven't been upgraded yet.
    // $FlowFixMe[constant-condition]
    if (isPrimaryRenderer) {
      HostTransitionContext._currentValue = newState;
    } else {
      HostTransitionContext._currentValue2 = newState;
    }
  }

  markRef(current, workInProgress);
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostHoistable(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  markRef(current, workInProgress);

  if (current === null) {
    const resource = getResource(
      workInProgress.type,
      null,
      workInProgress.pendingProps,
      null,
    );
    if (resource) {
      workInProgress.memoizedState = resource;
    } else {
      if (!getIsHydrating()) {
        // This is not a Resource Hoistable and we aren't hydrating so we construct the instance.
        workInProgress.stateNode = createHoistableInstance(
          workInProgress.type,
          workInProgress.pendingProps,
          getRootHostContainer(),
          workInProgress,
        );
      }
    }
  } else {
    // Get Resource may or may not return a resource. either way we stash the result
    // on memoized state.
    workInProgress.memoizedState = getResource(
      workInProgress.type,
      current.memoizedProps,
      workInProgress.pendingProps,
      current.memoizedState,
    );
  }

  // Resources never have reconciler managed children. It is possible for
  // the host implementation of getResource to consider children in the
  // resource construction but they will otherwise be discarded. In practice
  // this precludes all but the simplest children and Host specific warnings
  // should be implemented to warn when children are passsed when otherwise not
  // expected
  return null;
}

function updateHostSingleton(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  pushHostContext(workInProgress);

  if (current === null) {
    claimHydratableSingleton(workInProgress);
  }

  const nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  markRef(current, workInProgress);
  if (current === null) {
    // We mark Singletons with a static flag to more efficiently manage their
    // ownership of the singleton host instance when in offscreen trees including Suspense
    workInProgress.flags |= LayoutStatic;
  }
  return workInProgress.child;
}

function updateHostText(current: null | Fiber, workInProgress: Fiber) {
  if (current === null) {
    tryToClaimNextHydratableTextInstance(workInProgress);
  }
  // Nothing to do here. This is terminal. We'll do the completion step
  // immediately after.
  return null;
}

function mountLazyComponent(
  _current: null | Fiber,
  workInProgress: Fiber,
  elementType: any,
  renderLanes: Lanes,
) {
  resetSuspendedCurrentOnMountInLegacyMode(_current, workInProgress);

  const props = workInProgress.pendingProps;
  const lazyComponent: LazyComponentType<any, any> = elementType;
  let Component = resolveLazy(lazyComponent);
  // Store the unwrapped component in the type.
  workInProgress.type = Component;

  if (typeof Component === 'function') {
    if (isFunctionClassComponent(Component)) {
      const resolvedProps = resolveClassComponentProps(Component, props);
      workInProgress.tag = ClassComponent;
      if (__DEV__) {
        workInProgress.type = Component =
          resolveClassForHotReloading(Component);
      }
      return updateClassComponent(
        null,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    } else {
      workInProgress.tag = FunctionComponent;
      if (__DEV__) {
        validateFunctionComponentInDev(workInProgress, Component);
        workInProgress.type = Component =
          resolveFunctionForHotReloading(Component);
      }
      return updateFunctionComponent(
        null,
        workInProgress,
        Component,
        props,
        renderLanes,
      );
    }
    // $FlowFixMe[invalid-compare]
  } else if (Component !== undefined && Component !== null) {
    const $$typeof = Component.$$typeof;
    // $FlowFixMe[invalid-compare]
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      workInProgress.tag = ForwardRef;
      if (__DEV__) {
        workInProgress.type = Component =
          resolveForwardRefForHotReloading(Component);
      }
      return updateForwardRef(
        null,
        workInProgress,
        Component,
        props,
        renderLanes,
      );
      // $FlowFixMe[invalid-compare]
    } else if ($$typeof === REACT_MEMO_TYPE) {
      workInProgress.tag = MemoComponent;
      return updateMemoComponent(
        null,
        workInProgress,
        Component,
        props,
        renderLanes,
      );
      // $FlowFixMe[invalid-compare]
    } else if ($$typeof === REACT_CONTEXT_TYPE) {
      workInProgress.tag = ContextProvider;
      workInProgress.type = Component;
      return updateContextProvider(null, workInProgress, renderLanes);
    }
  }

  let hint = '';
  if (__DEV__) {
    if (
      // $FlowFixMe[invalid-compare]
      Component !== null &&
      typeof Component === 'object' &&
      // $FlowFixMe[invalid-compare]
      Component.$$typeof === REACT_LAZY_TYPE
    ) {
      hint = ' Did you wrap a component in React.lazy() more than once?';
    }
  }

  const loggedComponent = getComponentNameFromType(Component) || Component;

  // This message intentionally doesn't mention ForwardRef or MemoComponent
  // because the fact that it's a separate type of work is an
  // implementation detail.
  throw new Error(
    `Element type is invalid. Received a promise that resolves to: ${loggedComponent}. ` +
      `Lazy element type must resolve to a class or function.${hint}`,
  );
}

function mountIncompleteClassComponent(
  _current: null | Fiber,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: Lanes,
) {
  resetSuspendedCurrentOnMountInLegacyMode(_current, workInProgress);

  // Promote the fiber to a class and try rendering again.
  workInProgress.tag = ClassComponent;

  // The rest of this function is a fork of `updateClassComponent`

  // Push context providers early to prevent context stack mismatches.
  // During mounting we don't know the child context yet as the instance doesn't exist.
  // We will invalidate the child context in finishClassComponent() right after rendering.
  let hasContext;
  if (isLegacyContextProvider(Component)) {
    hasContext = true;
    pushLegacyContextProvider(workInProgress);
  } else {
    hasContext = false;
  }
  prepareToReadContext(workInProgress, renderLanes);

  constructClassInstance(workInProgress, Component, nextProps);
  mountClassInstance(workInProgress, Component, nextProps, renderLanes);

  return finishClassComponent(
    null,
    workInProgress,
    Component,
    true,
    hasContext,
    renderLanes,
  );
}

function validateFunctionComponentInDev(workInProgress: Fiber, Component: any) {
  if (__DEV__) {
    if (Component && Component.childContextTypes) {
      console.error(
        'childContextTypes cannot be defined on a function component.\n' +
          '  %s.childContextTypes = ...',
        Component.displayName || Component.name || 'Component',
      );
    }

    if (typeof Component.getDerivedStateFromProps === 'function') {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutGetDerivedStateOnFunctionComponent[componentName]) {
        console.error(
          '%s: Function components do not support getDerivedStateFromProps.',
          componentName,
        );
        didWarnAboutGetDerivedStateOnFunctionComponent[componentName] = true;
      }
    }

    if (
      typeof Component.contextType === 'object' &&
      Component.contextType !== null
    ) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutContextTypeOnFunctionComponent[componentName]) {
        console.error(
          '%s: Function components do not support contextType.',
          componentName,
        );
        didWarnAboutContextTypeOnFunctionComponent[componentName] = true;
      }
    }
  }
}

const SUSPENDED_MARKER: SuspenseState = {
  dehydrated: null,
  treeContext: null,
  retryLane: NoLane,
  hydrationErrors: null,
};

function mountSuspenseOffscreenState(renderLanes: Lanes): OffscreenState {
  return {
    baseLanes: renderLanes,
    cachePool: getSuspendedCache(),
  };
}

function updateSuspenseOffscreenState(
  prevOffscreenState: OffscreenState,
  renderLanes: Lanes,
): OffscreenState {
  let cachePool: SpawnedCachePool | null = null;
  const prevCachePool: SpawnedCachePool | null = prevOffscreenState.cachePool;
  if (prevCachePool !== null) {
    // $FlowFixMe[constant-condition]
    const parentCache = isPrimaryRenderer
      ? CacheContext._currentValue
      : CacheContext._currentValue2;
    if (prevCachePool.parent !== parentCache) {
      // Detected a refresh in the parent. This overrides any previously
      // suspended cache.
      cachePool = {
        parent: parentCache,
        pool: parentCache,
      };
    } else {
      // We can reuse the cache from last time. The only thing that would have
      // overridden it is a parent refresh, which we checked for above.
      cachePool = prevCachePool;
    }
  } else {
    // If there's no previous cache pool, grab the current one.
    cachePool = getSuspendedCache();
  }
  return {
    baseLanes: mergeLanes(prevOffscreenState.baseLanes, renderLanes),
    cachePool,
  };
}

// TODO: Probably should inline this back
function shouldRemainOnFallback(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // If we're already showing a fallback, there are cases where we need to
  // remain on that fallback regardless of whether the content has resolved.
  // For example, SuspenseList coordinates when nested content appears.
  // TODO: For compatibility with offscreen prerendering, this should also check
  // whether the current fiber (if it exists) was visible in the previous tree.
  if (current !== null) {
    const suspenseState: SuspenseState = current.memoizedState;
    // $FlowFixMe[invalid-compare]
    if (suspenseState === null) {
      // Currently showing content. Don't hide it, even if ForceSuspenseFallback
      // is true. More precise name might be "ForceRemainSuspenseFallback".
      // Note: This is a factoring smell. Can't remain on a fallback if there's
      // no fallback to remain on.
      return false;
    }
  }

  // Not currently showing content. Consult the Suspense context.
  const suspenseContext: SuspenseContext = suspenseStackCursor.current;
  return hasSuspenseListContext(
    suspenseContext,
    ForceSuspenseFallback as SuspenseContext,
  );
}

function getRemainingWorkInPrimaryTree(
  current: Fiber | null,
  primaryTreeDidDefer: boolean,
  renderLanes: Lanes,
) {
  let remainingLanes =
    current !== null ? removeLanes(current.childLanes, renderLanes) : NoLanes;
  if (primaryTreeDidDefer) {
    // A useDeferredValue hook spawned a deferred task inside the primary tree.
    // Ensure that we retry this component at the deferred priority.
    // TODO: We could make this a per-subtree value instead of a global one.
    // Would need to track it on the context stack somehow, similar to what
    // we'd have to do for resumable contexts.
    remainingLanes = mergeLanes(remainingLanes, peekDeferredLane());
  }
  return remainingLanes;
}

function updateSuspenseComponent(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextProps: SuspenseProps = workInProgress.pendingProps;

  // This is used by DevTools to force a boundary to suspend.
  if (__DEV__) {
    if (shouldSuspend(workInProgress)) {
      workInProgress.flags |= DidCapture;
    }
  }

  let showFallback = false;
  const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags;
  if (
    didSuspend ||
    shouldRemainOnFallback(current, workInProgress, renderLanes)
  ) {
    // Something in this boundary's subtree already suspended. Switch to
    // rendering the fallback children.
    showFallback = true;
    workInProgress.flags &= ~DidCapture;
  }

  // Check if the primary children spawned a deferred task (useDeferredValue)
  // during the first pass.
  const didPrimaryChildrenDefer = (workInProgress.flags & DidDefer) !== NoFlags;
  workInProgress.flags &= ~DidDefer;

  // OK, the next part is confusing. We're about to reconcile the Suspense
  // boundary's children. This involves some custom reconciliation logic. Two
  // main reasons this is so complicated.
  //
  // First, Legacy Mode has different semantics for backwards compatibility. The
  // primary tree will commit in an inconsistent state, so when we do the
  // second pass to render the fallback, we do some exceedingly, uh, clever
  // hacks to make that not totally break. Like transferring effects and
  // deletions from hidden tree. In Concurrent Mode, it's much simpler,
  // because we bailout on the primary tree completely and leave it in its old
  // state, no effects. Same as what we do for Offscreen (except that
  // Offscreen doesn't have the first render pass).
  //
  // Second is hydration. During hydration, the Suspense fiber has a slightly
  // different layout, where the child points to a dehydrated fragment, which
  // contains the DOM rendered by the server.
  //
  // Third, even if you set all that aside, Suspense is like error boundaries in
  // that we first we try to render one tree, and if that fails, we render again
  // and switch to a different tree. Like a try/catch block. So we have to track
  // which branch we're currently rendering. Ideally we would model this using
  // a stack.
  if (current === null) {
    // Initial mount

    // Special path for hydration
    // If we're currently hydrating, try to hydrate this boundary.
    if (getIsHydrating()) {
      // We must push the suspense handler context *before* attempting to
      // hydrate, to avoid a mismatch in case it errors.
      if (showFallback) {
        pushPrimaryTreeSuspenseHandler(workInProgress);
      } else {
        pushFallbackTreeSuspenseHandler(workInProgress);
      }
      // This throws if we fail to hydrate.
      const dehydrated: SuspenseInstance =
        claimNextHydratableSuspenseInstance(workInProgress);
      return mountDehydratedSuspenseComponent(
        workInProgress,
        dehydrated,
        renderLanes,
      );
    }

    const nextPrimaryChildren = nextProps.children;
    const nextFallbackChildren = nextProps.fallback;

    if (showFallback) {
      pushFallbackTreeSuspenseHandler(workInProgress);

      mountSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
        renderLanes,
      );
      const primaryChildFragment: Fiber = workInProgress.child as any;
      primaryChildFragment.memoizedState =
        mountSuspenseOffscreenState(renderLanes);
      primaryChildFragment.childLanes = getRemainingWorkInPrimaryTree(
        current,
        didPrimaryChildrenDefer,
        renderLanes,
      );
      workInProgress.memoizedState = SUSPENDED_MARKER;
      if (enableTransitionTracing) {
        const currentTransitions = getPendingTransitions();
        if (currentTransitions !== null) {
          const parentMarkerInstances = getMarkerInstances();
          const offscreenQueue: OffscreenQueue | null =
            primaryChildFragment.updateQueue as any;
          if (offscreenQueue === null) {
            const newOffscreenQueue: OffscreenQueue = {
              transitions: currentTransitions,
              markerInstances: parentMarkerInstances,
              retryQueue: null,
            };
            primaryChildFragment.updateQueue = newOffscreenQueue;
          } else {
            offscreenQueue.transitions = currentTransitions;
            offscreenQueue.markerInstances = parentMarkerInstances;
          }
        }
      }

      return bailoutOffscreenComponent(null, primaryChildFragment);
    } else if (enableCPUSuspense && nextProps.defer === true) {
      // This is a CPU-bound tree. Skip this tree and show a placeholder to
      // unblock the surrounding content. Then immediately retry after the
      // initial commit.
      pushFallbackTreeSuspenseHandler(workInProgress);
      mountSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
        renderLanes,
      );
      const primaryChildFragment: Fiber = workInProgress.child as any;
      primaryChildFragment.memoizedState =
        mountSuspenseOffscreenState(renderLanes);
      primaryChildFragment.childLanes = getRemainingWorkInPrimaryTree(
        current,
        didPrimaryChildrenDefer,
        renderLanes,
      );
      workInProgress.memoizedState = SUSPENDED_MARKER;

      // TODO: Transition Tracing is not yet implemented for CPU Suspense.

      // Since nothing actually suspended, there will nothing to ping this to
      // get it started back up to attempt the next item. While in terms of
      // priority this work has the same priority as this current render, it's
      // not part of the same transition once the transition has committed. If
      // it's sync, we still want to yield so that it can be painted.
      // Conceptually, this is really the same as pinging. We can use any
      // RetryLane even if it's the one currently rendering since we're leaving
      // it behind on this node.
      workInProgress.lanes = SomeRetryLane;
      return bailoutOffscreenComponent(null, primaryChildFragment);
    } else {
      pushPrimaryTreeSuspenseHandler(workInProgress);
      return mountSuspensePrimaryChildren(
        workInProgress,
        nextPrimaryChildren,
        renderLanes,
      );
    }
  } else {
    // This is an update.

    // Special path for hydration
    const prevState: null | SuspenseState = current.memoizedState;
    if (prevState !== null) {
      const dehydrated = prevState.dehydrated;
      if (dehydrated !== null) {
        return updateDehydratedSuspenseComponent(
          current,
          workInProgress,
          didSuspend,
          didPrimaryChildrenDefer,
          nextProps,
          dehydrated,
          prevState,
          renderLanes,
        );
      }
    }

    if (showFallback) {
      pushFallbackTreeSuspenseHandler(workInProgress);

      const nextFallbackChildren = nextProps.fallback;
      const nextPrimaryChildren = nextProps.children;
      updateSuspenseFallbackChildren(
        current,
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
        renderLanes,
      );
      const primaryChildFragment: Fiber = workInProgress.child as any;
      const prevOffscreenState: OffscreenState | null = (current.child as any)
        .memoizedState;
      primaryChildFragment.memoizedState =
        prevOffscreenState === null
          ? mountSuspenseOffscreenState(renderLanes)
          : updateSuspenseOffscreenState(prevOffscreenState, renderLanes);
      if (enableTransitionTracing) {
        const currentTransitions = getPendingTransitions();
        if (currentTransitions !== null) {
          const parentMarkerInstances = getMarkerInstances();
          const offscreenQueue: OffscreenQueue | null =
            primaryChildFragment.updateQueue as any;
          const currentOffscreenQueue: OffscreenQueue | null =
            current.updateQueue as any;
          if (offscreenQueue === null) {
            const newOffscreenQueue: OffscreenQueue = {
              transitions: currentTransitions,
              markerInstances: parentMarkerInstances,
              retryQueue: null,
            };
            primaryChildFragment.updateQueue = newOffscreenQueue;
          } else if (offscreenQueue === currentOffscreenQueue) {
            // If the work-in-progress queue is the same object as current, we
            // can't modify it without cloning it first.
            const newOffscreenQueue: OffscreenQueue = {
              transitions: currentTransitions,
              markerInstances: parentMarkerInstances,
              retryQueue:
                currentOffscreenQueue !== null
                  ? currentOffscreenQueue.retryQueue
                  : null,
            };
            primaryChildFragment.updateQueue = newOffscreenQueue;
          } else {
            offscreenQueue.transitions = currentTransitions;
            offscreenQueue.markerInstances = parentMarkerInstances;
          }
        }
      }
      primaryChildFragment.childLanes = getRemainingWorkInPrimaryTree(
        current,
        didPrimaryChildrenDefer,
        renderLanes,
      );
      workInProgress.memoizedState = SUSPENDED_MARKER;
      return bailoutOffscreenComponent(current.child, primaryChildFragment);
    } else {
      if (
        prevState !== null &&
        includesOnlyRetries(renderLanes) &&
        includesSomeLane(renderLanes, current.lanes)
      ) {
        // If we're rendering Retry lanes and we're entering the primary content then it's possible
        // that the only reason we rendered was because we left this boundary to be warmed up but
        // nothing else scheduled an update. If so, use it as the cause of the render.
        markRenderDerivedCause(workInProgress);
      }

      pushPrimaryTreeSuspenseHandler(workInProgress);

      const nextPrimaryChildren = nextProps.children;
      const primaryChildFragment = updateSuspensePrimaryChildren(
        current,
        workInProgress,
        nextPrimaryChildren,
        renderLanes,
      );
      workInProgress.memoizedState = null;
      return primaryChildFragment;
    }
  }
}

function mountSuspensePrimaryChildren(
  workInProgress: Fiber,
  primaryChildren: $FlowFixMe,
  renderLanes: Lanes,
) {
  const mode = workInProgress.mode;
  const primaryChildProps: OffscreenProps = {
    mode: 'visible',
    children: primaryChildren,
  };
  const primaryChildFragment = mountWorkInProgressOffscreenFiber(
    primaryChildProps,
    mode,
    renderLanes,
  );
  primaryChildFragment.return = workInProgress;
  workInProgress.child = primaryChildFragment;
  return primaryChildFragment;
}

function mountSuspenseFallbackChildren(
  workInProgress: Fiber,
  primaryChildren: $FlowFixMe,
  fallbackChildren: $FlowFixMe,
  renderLanes: Lanes,
) {
  const mode = workInProgress.mode;
  const progressedPrimaryFragment: Fiber | null = workInProgress.child;

  const primaryChildProps: OffscreenProps = {
    mode: 'hidden',
    children: primaryChildren,
  };

  let primaryChildFragment;
  let fallbackChildFragment;
  if (
    !disableLegacyMode &&
    (mode & ConcurrentMode) === NoMode &&
    progressedPrimaryFragment !== null
  ) {
    // In legacy mode, we commit the primary tree as if it successfully
    // completed, even though it's in an inconsistent state.
    primaryChildFragment = progressedPrimaryFragment;
    primaryChildFragment.childLanes = NoLanes;
    primaryChildFragment.pendingProps = primaryChildProps;

    if (enableProfilerTimer && workInProgress.mode & ProfileMode) {
      // Reset the durations from the first pass so they aren't included in the
      // final amounts. This seems counterintuitive, since we're intentionally
      // not measuring part of the render phase, but this makes it match what we
      // do in Concurrent Mode.
      primaryChildFragment.actualDuration = -0;
      primaryChildFragment.actualStartTime = -1.1;
      primaryChildFragment.selfBaseDuration = -0;
      primaryChildFragment.treeBaseDuration = -0;
    }

    fallbackChildFragment = createFiberFromFragment(
      fallbackChildren,
      mode,
      renderLanes,
      null,
    );
  } else {
    primaryChildFragment = mountWorkInProgressOffscreenFiber(
      primaryChildProps,
      mode,
      NoLanes,
    );
    fallbackChildFragment = createFiberFromFragment(
      fallbackChildren,
      mode,
      renderLanes,
      null,
    );
  }

  primaryChildFragment.return = workInProgress;
  fallbackChildFragment.return = workInProgress;
  primaryChildFragment.sibling = fallbackChildFragment;
  workInProgress.child = primaryChildFragment;
  return fallbackChildFragment;
}

function mountWorkInProgressOffscreenFiber(
  offscreenProps: OffscreenProps,
  mode: TypeOfMode,
  renderLanes: Lanes,
) {
  // The props argument to `createFiberFromOffscreen` is `any` typed, so we use
  // this wrapper function to constrain it.
  return createFiberFromOffscreen(offscreenProps, mode, NoLanes, null);
}

function updateWorkInProgressOffscreenFiber(
  current: Fiber,
  offscreenProps: OffscreenProps,
) {
  // The props argument to `createWorkInProgress` is `any` typed, so we use this
  // wrapper function to constrain it.
  return createWorkInProgress(current, offscreenProps);
}

function updateSuspensePrimaryChildren(
  current: Fiber,
  workInProgress: Fiber,
  primaryChildren: $FlowFixMe,
  renderLanes: Lanes,
) {
  const currentPrimaryChildFragment: Fiber = current.child as any;
  const currentFallbackChildFragment: Fiber | null =
    currentPrimaryChildFragment.sibling;

  const primaryChildFragment = updateWorkInProgressOffscreenFiber(
    currentPrimaryChildFragment,
    {
      mode: 'visible',
      children: primaryChildren,
    },
  );
  if (!disableLegacyMode && (workInProgress.mode & ConcurrentMode) === NoMode) {
    primaryChildFragment.lanes = renderLanes;
  }
  primaryChildFragment.return = workInProgress;
  primaryChildFragment.sibling = null;
  if (currentFallbackChildFragment !== null) {
    // Delete the fallback child fragment
    const deletions = workInProgress.deletions;
    if (deletions === null) {
      workInProgress.deletions = [currentFallbackChildFragment];
      workInProgress.flags |= ChildDeletion;
    } else {
      deletions.push(currentFallbackChildFragment);
    }
  }

  workInProgress.child = primaryChildFragment;
  return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
  current: Fiber,
  workInProgress: Fiber,
  primaryChildren: $FlowFixMe,
  fallbackChildren: $FlowFixMe,
  renderLanes: Lanes,
) {
  const mode = workInProgress.mode;
  const currentPrimaryChildFragment: Fiber = current.child as any;
  const currentFallbackChildFragment: Fiber | null =
    currentPrimaryChildFragment.sibling;

  const primaryChildProps: OffscreenProps = {
    mode: 'hidden',
    children: primaryChildren,
  };

  let primaryChildFragment;
  if (
    // In legacy mode, we commit the primary tree as if it successfully
    // completed, even though it's in an inconsistent state.
    !disableLegacyMode &&
    (mode & ConcurrentMode) === NoMode &&
    // Make sure we're on the second pass, i.e. the primary child fragment was
    // already cloned. In legacy mode, the only case where this isn't true is
    // when DevTools forces us to display a fallback; we skip the first render
    // pass entirely and go straight to rendering the fallback. (In Concurrent
    // Mode, SuspenseList can also trigger this scenario, but this is a legacy-
    // only codepath.)
    workInProgress.child !== currentPrimaryChildFragment
  ) {
    const progressedPrimaryFragment: Fiber = workInProgress.child as any;
    primaryChildFragment = progressedPrimaryFragment;
    primaryChildFragment.childLanes = NoLanes;
    primaryChildFragment.pendingProps = primaryChildProps;

    if (enableProfilerTimer && workInProgress.mode & ProfileMode) {
      // Reset the durations from the first pass so they aren't included in the
      // final amounts. This seems counterintuitive, since we're intentionally
      // not measuring part of the render phase, but this makes it match what we
      // do in Concurrent Mode.
      primaryChildFragment.actualDuration = -0;
      primaryChildFragment.actualStartTime = -1.1;
      primaryChildFragment.selfBaseDuration =
        currentPrimaryChildFragment.selfBaseDuration;
      primaryChildFragment.treeBaseDuration =
        currentPrimaryChildFragment.treeBaseDuration;
    }

    // The fallback fiber was added as a deletion during the first pass.
    // However, since we're going to remain on the fallback, we no longer want
    // to delete it.
    workInProgress.deletions = null;
  } else {
    primaryChildFragment = updateWorkInProgressOffscreenFiber(
      currentPrimaryChildFragment,
      primaryChildProps,
    );
    // Since we're reusing a current tree, we need to reuse the flags, too.
    // (We don't do this in legacy mode, because in legacy mode we don't re-use
    // the current tree; see previous branch.)
    primaryChildFragment.subtreeFlags =
      currentPrimaryChildFragment.subtreeFlags & StaticMask;
  }
  let fallbackChildFragment;
  if (currentFallbackChildFragment !== null) {
    fallbackChildFragment = createWorkInProgress(
      currentFallbackChildFragment,
      fallbackChildren,
    );
  } else {
    fallbackChildFragment = createFiberFromFragment(
      fallbackChildren,
      mode,
      renderLanes,
      null,
    );
    // Needs a placement effect because the parent (the Suspense boundary) already
    // mounted but this is a new fiber.
    fallbackChildFragment.flags |= Placement;
  }

  fallbackChildFragment.return = workInProgress;
  primaryChildFragment.return = workInProgress;
  primaryChildFragment.sibling = fallbackChildFragment;
  workInProgress.child = primaryChildFragment;

  return bailoutOffscreenComponent(null, primaryChildFragment);
}

function retrySuspenseComponentWithoutHydrating(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // Falling back to client rendering. Because this has performance
  // implications, it's considered a recoverable error, even though the user
  // likely won't observe anything wrong with the UI.

  // This will add the old fiber to the deletion list
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);

  // We're now not suspended nor dehydrated.
  const nextProps = workInProgress.pendingProps;
  const primaryChildren = nextProps.children;
  const primaryChildFragment = mountSuspensePrimaryChildren(
    workInProgress,
    primaryChildren,
    renderLanes,
  );
  // Needs a placement effect because the parent (the Suspense boundary) already
  // mounted but this is a new fiber.
  primaryChildFragment.flags |= Placement;
  workInProgress.memoizedState = null;

  return primaryChildFragment;
}

function mountSuspenseFallbackAfterRetryWithoutHydrating(
  current: Fiber,
  workInProgress: Fiber,
  primaryChildren: $FlowFixMe,
  fallbackChildren: $FlowFixMe,
  renderLanes: Lanes,
) {
  const fiberMode = workInProgress.mode;
  const primaryChildProps: OffscreenProps = {
    mode: 'visible',
    children: primaryChildren,
  };
  const primaryChildFragment = mountWorkInProgressOffscreenFiber(
    primaryChildProps,
    fiberMode,
    NoLanes,
  );
  const fallbackChildFragment = createFiberFromFragment(
    fallbackChildren,
    fiberMode,
    renderLanes,
    null,
  );
  // Needs a placement effect because the parent (the Suspense
  // boundary) already mounted but this is a new fiber.
  fallbackChildFragment.flags |= Placement;

  primaryChildFragment.return = workInProgress;
  fallbackChildFragment.return = workInProgress;
  primaryChildFragment.sibling = fallbackChildFragment;
  workInProgress.child = primaryChildFragment;

  if (disableLegacyMode || (workInProgress.mode & ConcurrentMode) !== NoMode) {
    // We will have dropped the effect list which contains the
    // deletion. We need to reconcile to delete the current child.
    reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  }

  return fallbackChildFragment;
}

function mountDehydratedSuspenseComponent(
  workInProgress: Fiber,
  suspenseInstance: SuspenseInstance,
  renderLanes: Lanes,
): null | Fiber {
  // During the first pass, we'll bail out and not drill into the children.
  // Instead, we'll leave the content in place and try to hydrate it later.
  if (isSuspenseInstanceFallback(suspenseInstance)) {
    // This is a client-only boundary. Since we won't get any content from the server
    // for this, we need to schedule that at a higher priority based on when it would
    // have timed out. In theory we could render it in this pass but it would have the
    // wrong priority associated with it and will prevent hydration of parent path.
    // Instead, we'll leave work left on it to render it in a separate commit.
    // Schedule a normal pri update to render this content.
    workInProgress.lanes = laneToLanes(DefaultLane);
  } else {
    // We'll continue hydrating the rest at offscreen priority since we'll already
    // be showing the right content coming from the server, it is no rush.
    workInProgress.lanes = laneToLanes(OffscreenLane);
  }
  return null;
}

function updateDehydratedSuspenseComponent(
  current: Fiber,
  workInProgress: Fiber,
  didSuspend: boolean,
  didPrimaryChildrenDefer: boolean,
  nextProps: SuspenseProps,
  suspenseInstance: SuspenseInstance,
  suspenseState: SuspenseState,
  renderLanes: Lanes,
): null | Fiber {
  if (!didSuspend) {
    // This is the first render pass. Attempt to hydrate.
    pushPrimaryTreeSuspenseHandler(workInProgress);

    // We should never be hydrating at this point because it is the first pass,
    // but after we've already committed once.
    warnIfHydrating();

    if (includesSomeLane(renderLanes, OffscreenLane as Lane)) {
      // If we're rendering Offscreen and we're entering the activity then it's possible
      // that the only reason we rendered was because this boundary left work. Provide
      // it as a cause if another one doesn't already exist.
      markRenderDerivedCause(workInProgress);
    }

    if (isSuspenseInstanceFallback(suspenseInstance)) {
      // This boundary is in a permanent fallback state. In this case, we'll never
      // get an update and we'll never be able to hydrate the final content. Let's just try the
      // client side render instead.
      let digest: ?string;
      let message;
      let stack = null;
      let componentStack = null;
      if (__DEV__) {
        ({digest, message, stack, componentStack} =
          getSuspenseInstanceFallbackErrorDetails(suspenseInstance));
      } else {
        ({digest} = getSuspenseInstanceFallbackErrorDetails(suspenseInstance));
      }

      let error: Error;
      if (__DEV__ && message) {
        // eslint-disable-next-line react-internal/prod-error-codes
        error = new Error(message);
      } else {
        error = new Error(
          'The server could not finish this Suspense boundary, likely ' +
            'due to an error during server rendering. ' +
            'Switched to client rendering.',
        );
      }
      // Replace the stack with the server stack
      error.stack = (__DEV__ && stack) || '';
      (error as any).digest = digest;
      const capturedValue = createCapturedValueFromError(
        error,
        componentStack === undefined ? null : componentStack,
      );
      queueHydrationError(capturedValue);
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
      );
    }

    if (
      // TODO: Factoring is a little weird, since we check this right below, too.
      !didReceiveUpdate
    ) {
      // We need to check if any children have context before we decide to bail
      // out, so propagate the changes now.
      lazilyPropagateParentContextChanges(current, workInProgress, renderLanes);
    }

    // We use lanes to indicate that a child might depend on context, so if
    // any context has changed, we need to treat is as if the input might have changed.
    const hasContextChanged = includesSomeLane(renderLanes, current.childLanes);
    if (didReceiveUpdate || hasContextChanged) {
      // This boundary has changed since the first render. This means that we are now unable to
      // hydrate it. We might still be able to hydrate it using a higher priority lane.
      const root = getWorkInProgressRoot();
      if (root !== null) {
        const attemptHydrationAtLane = getBumpedLaneForHydration(
          root,
          renderLanes,
        );
        if (
          attemptHydrationAtLane !== NoLane &&
          attemptHydrationAtLane !== suspenseState.retryLane
        ) {
          // Intentionally mutating since this render will get interrupted. This
          // is one of the very rare times where we mutate the current tree
          // during the render phase.
          suspenseState.retryLane = attemptHydrationAtLane;
          enqueueConcurrentRenderForLane(current, attemptHydrationAtLane);
          scheduleUpdateOnFiber(root, current, attemptHydrationAtLane);

          // Throw a special object that signals to the work loop that it should
          // interrupt the current render.
          //
          // Because we're inside a React-only execution stack, we don't
          // strictly need to throw here — we could instead modify some internal
          // work loop state. But using an exception means we don't need to
          // check for this case on every iteration of the work loop. So doing
          // it this way moves the check out of the fast path.
          throw SelectiveHydrationException;
        } else {
          // We have already tried to ping at a higher priority than we're rendering with
          // so if we got here, we must have failed to hydrate at those levels. We must
          // now give up. Instead, we're going to delete the whole subtree and instead inject
          // a new real Suspense boundary to take its place, which may render content
          // or fallback. This might suspend for a while and if it does we might still have
          // an opportunity to hydrate before this pass commits.
        }
      }

      // If we did not selectively hydrate, we'll continue rendering without
      // hydrating. Mark this tree as suspended to prevent it from committing
      // outside a transition.
      //
      // This path should only happen if the hydration lane already suspended.
      if (isSuspenseInstancePending(suspenseInstance)) {
        // This is a dehydrated suspense instance. We don't need to suspend
        // because we're already showing a fallback.
        // TODO: The Fizz runtime might still stream in completed HTML, out-of-
        // band. Should we fix this? There's a version of this bug that happens
        // during client rendering, too. Needs more consideration.
      } else {
        renderDidSuspendDelayIfPossible();
      }
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
      );
    } else if (isSuspenseInstancePending(suspenseInstance)) {
      // This component is still pending more data from the server, so we can't hydrate its
      // content. We treat it as if this component suspended itself. It might seem as if
      // we could just try to render it client-side instead. However, this will perform a
      // lot of unnecessary work and is unlikely to complete since it often will suspend
      // on missing data anyway. Additionally, the server might be able to render more
      // than we can on the client yet. In that case we'd end up with more fallback states
      // on the client than if we just leave it alone. If the server times out or errors
      // these should update this boundary to the permanent Fallback state instead.
      // Mark it as having captured (i.e. suspended).
      // Also Mark it as requiring retry.
      workInProgress.flags |= DidCapture | Callback;
      // Leave the child in place. I.e. the dehydrated fragment.
      workInProgress.child = current.child;
      return null;
    } else {
      // This is the first attempt.
      reenterHydrationStateFromDehydratedSuspenseInstance(
        workInProgress,
        suspenseInstance,
        suspenseState.treeContext,
      );
      const primaryChildren = nextProps.children;
      const primaryChildFragment = mountSuspensePrimaryChildren(
        workInProgress,
        primaryChildren,
        renderLanes,
      );
      // Mark the children as hydrating. This is a fast path to know whether this
      // tree is part of a hydrating tree. This is used to determine if a child
      // node has fully mounted yet, and for scheduling event replaying.
      // Conceptually this is similar to Placement in that a new subtree is
      // inserted into the React tree here. It just happens to not need DOM
      // mutations because it already exists.
      // We should still treat it as a newly inserted Fiber to double invoke Strict Effects.
      primaryChildFragment.flags |= Hydrating | PlacementDEV;
      return primaryChildFragment;
    }
  } else {
    // This is the second render pass. We already attempted to hydrated, but
    // something either suspended or errored.

    if (workInProgress.flags & ForceClientRender) {
      // Something errored during hydration. Try again without hydrating.
      // The error should've already been logged in throwException.
      pushPrimaryTreeSuspenseHandler(workInProgress);
      workInProgress.flags &= ~ForceClientRender;
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes,
      );
    } else if (
      (workInProgress.memoizedState as null | SuspenseState) !== null
    ) {
      // Something suspended and we should still be in dehydrated mode.
      // Leave the existing child in place.

      // Push to avoid a mismatch
      pushFallbackTreeSuspenseHandler(workInProgress);

      workInProgress.child = current.child;
      // The dehydrated completion pass expects this flag to be there
      // but the normal suspense pass doesn't.
      workInProgress.flags |= DidCapture;
      return null;
    } else {
      // Suspended but we should no longer be in dehydrated mode.
      // Therefore we now have to render the fallback.
      pushFallbackTreeSuspenseHandler(workInProgress);

      const nextPrimaryChildren = nextProps.children;
      const nextFallbackChildren = nextProps.fallback;
      mountSuspenseFallbackAfterRetryWithoutHydrating(
        current,
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren,
        renderLanes,
      );
      const primaryChildFragment: Fiber = workInProgress.child as any;
      primaryChildFragment.memoizedState =
        mountSuspenseOffscreenState(renderLanes);
      primaryChildFragment.childLanes = getRemainingWorkInPrimaryTree(
        current,
        didPrimaryChildrenDefer,
        renderLanes,
      );
      workInProgress.memoizedState = SUSPENDED_MARKER;
      return bailoutOffscreenComponent(null, primaryChildFragment);
    }
  }
}

function scheduleSuspenseWorkOnFiber(
  fiber: Fiber,
  renderLanes: Lanes,
  propagationRoot: Fiber,
) {
  fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
  }
  scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
}

function propagateSuspenseContextChange(
  workInProgress: Fiber,
  firstChild: null | Fiber,
  renderLanes: Lanes,
): void {
  // Mark any Suspense boundaries with fallbacks as having work to do.
  // If they were previously forced into fallbacks, they may now be able
  // to unblock.
  let node = firstChild;
  while (node !== null) {
    if (node.tag === SuspenseComponent) {
      const state: SuspenseState | null = node.memoizedState;
      if (state !== null) {
        scheduleSuspenseWorkOnFiber(node, renderLanes, workInProgress);
      }
    } else if (node.tag === SuspenseListComponent) {
      // If the tail is hidden there might not be an Suspense boundaries
      // to schedule work on. In this case we have to schedule it on the
      // list itself.
      // We don't have to traverse to the children of the list since
      // the list will propagate the change when it rerenders.
      scheduleSuspenseWorkOnFiber(node, renderLanes, workInProgress);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === workInProgress) {
      return;
    }
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    while (node.sibling === null) {
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function findLastContentRow(firstChild: null | Fiber): null | Fiber {
  // This is going to find the last row among these children that is already
  // showing content on the screen, as opposed to being in fallback state or
  // new. If a row has multiple Suspense boundaries, any of them being in the
  // fallback state, counts as the whole row being in a fallback state.
  // Note that the "rows" will be workInProgress, but any nested children
  // will still be current since we haven't rendered them yet. The mounted
  // order may not be the same as the new order. We use the new order.
  let row = firstChild;
  let lastContentRow: null | Fiber = null;
  while (row !== null) {
    const currentRow = row.alternate;
    // New rows can't be content rows.
    if (currentRow !== null && findFirstSuspended(currentRow) === null) {
      lastContentRow = row;
    }
    row = row.sibling;
  }
  return lastContentRow;
}

function validateRevealOrder(revealOrder: SuspenseListRevealOrder) {
  if (__DEV__) {
    const cacheKey = revealOrder == null ? 'null' : revealOrder;
    if (
      revealOrder != null &&
      revealOrder !== 'forwards' &&
      revealOrder !== 'backwards' &&
      revealOrder !== 'unstable_legacy-backwards' &&
      revealOrder !== 'together' &&
      revealOrder !== 'independent' &&
      !didWarnAboutRevealOrder[cacheKey]
    ) {
      didWarnAboutRevealOrder[cacheKey] = true;
      if (typeof revealOrder === 'string') {
        switch (revealOrder.toLowerCase()) {
          // $FlowFixMe[invalid-compare]
          case 'together':
          // $FlowFixMe[invalid-compare] -- falls through
          case 'forwards':
          // $FlowFixMe[invalid-compare] -- falls through
          case 'backwards':
          // $FlowFixMe[invalid-compare] -- falls through
          case 'independent': {
            console.error(
              '"%s" is not a valid value for revealOrder on <SuspenseList />. ' +
                'Use lowercase "%s" instead.',
              revealOrder,
              revealOrder.toLowerCase(),
            );
            break;
          }
          // $FlowFixMe[invalid-compare]
          case 'forward':
          // $FlowFixMe[invalid-compare] -- falls through
          case 'backward': {
            console.error(
              '"%s" is not a valid value for revealOrder on <SuspenseList />. ' +
                'React uses the -s suffix in the spelling. Use "%ss" instead.',
              revealOrder,
              revealOrder.toLowerCase(),
            );
            break;
          }
          default:
            console.error(
              '"%s" is not a supported revealOrder on <SuspenseList />. ' +
                'Did you mean "independent", "together", "forwards" or "backwards"?',
              revealOrder,
            );
            break;
        }
      } else {
        console.error(
          '%s is not a supported value for revealOrder on <SuspenseList />. ' +
            'Did you mean "independent", "together", "forwards" or "backwards"?',
          revealOrder,
        );
      }
    }
  }
}

function validateTailOptions(
  tailMode: SuspenseListTailMode,
  revealOrder: SuspenseListRevealOrder,
) {
  if (__DEV__) {
    const cacheKey = tailMode == null ? 'null' : tailMode;
    if (!didWarnAboutTailOptions[cacheKey]) {
      if (tailMode == null) {
        // The default tail is now "hidden".
      } else if (
        tailMode !== 'visible' &&
        tailMode !== 'collapsed' &&
        tailMode !== 'hidden'
      ) {
        didWarnAboutTailOptions[cacheKey] = true;
        console.error(
          '"%s" is not a supported value for tail on <SuspenseList />. ' +
            'Did you mean "visible", "collapsed" or "hidden"?',
          tailMode,
        );
      } else if (
        revealOrder != null &&
        revealOrder !== 'forwards' &&
        revealOrder !== 'backwards' &&
        revealOrder !== 'unstable_legacy-backwards'
      ) {
        didWarnAboutTailOptions[cacheKey] = true;
        console.error(
          '<SuspenseList tail="%s" /> is only valid if revealOrder is ' +
            '"forwards" (default) or "backwards". ' +
            'Did you mean to specify revealOrder="forwards"?',
          tailMode,
        );
      }
    }
  }
}

function initSuspenseListRenderState(
  workInProgress: Fiber,
  isBackwards: boolean,
  tail: null | Fiber,
  lastContentRow: null | Fiber,
  tailMode: SuspenseListTailMode,
  treeForkCount: number,
): void {
  const renderState: null | SuspenseListRenderState =
    workInProgress.memoizedState;
  if (renderState === null) {
    workInProgress.memoizedState = {
      isBackwards: isBackwards,
      rendering: null,
      renderingStartTime: 0,
      last: lastContentRow,
      tail: tail,
      tailMode: tailMode,
      treeForkCount: treeForkCount,
    } as SuspenseListRenderState;
  } else {
    // We can reuse the existing object from previous renders.
    renderState.isBackwards = isBackwards;
    renderState.rendering = null;
    renderState.renderingStartTime = 0;
    renderState.last = lastContentRow;
    renderState.tail = tail;
    renderState.tailMode = tailMode;
    renderState.treeForkCount = treeForkCount;
  }
}

function reverseChildren(fiber: Fiber): void {
  let row = fiber.child;
  fiber.child = null;
  while (row !== null) {
    const nextRow = row.sibling;
    row.sibling = fiber.child;
    fiber.child = row;
    row = nextRow;
  }
}

// This can end up rendering this component multiple passes.
// The first pass splits the children fibers into two sets. A head and tail.
// We first render the head. If anything is in fallback state, we do another
// pass through beginWork to rerender all children (including the tail) with
// the force suspend context. If the first render didn't have anything in
// in fallback state. Then we render each row in the tail one-by-one.
// That happens in the completeWork phase without going back to beginWork.
function updateSuspenseListComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextProps: SuspenseListProps = workInProgress.pendingProps;
  const revealOrder: SuspenseListRevealOrder = nextProps.revealOrder;
  const tailMode: SuspenseListTailMode = nextProps.tail;
  const newChildren = nextProps.children;

  let suspenseContext: SuspenseContext = suspenseStackCursor.current;

  if (workInProgress.flags & DidCapture) {
    // This is the second pass after having suspended in a row. Proceed directly
    // to the complete phase.
    pushSuspenseListContext(workInProgress, suspenseContext);
    return null;
  }

  const shouldForceFallback = hasSuspenseListContext(
    suspenseContext,
    ForceSuspenseFallback as SuspenseContext,
  );
  if (shouldForceFallback) {
    suspenseContext = setShallowSuspenseListContext(
      suspenseContext,
      ForceSuspenseFallback,
    );
    workInProgress.flags |= DidCapture;
  } else {
    suspenseContext = setDefaultShallowSuspenseListContext(suspenseContext);
  }
  pushSuspenseListContext(workInProgress, suspenseContext);

  validateRevealOrder(revealOrder);
  validateTailOptions(tailMode, revealOrder);
  validateSuspenseListChildren(newChildren, revealOrder);

  if (revealOrder === 'backwards' && current !== null) {
    // For backwards the current mounted set will be backwards. Reconciling against it
    // will lead to mismatches and reorders. We need to swap the original set first
    // and then restore it afterwards.
    reverseChildren(current);
    reconcileChildren(current, workInProgress, newChildren, renderLanes);
    reverseChildren(current);
  } else {
    reconcileChildren(current, workInProgress, newChildren, renderLanes);
  }
  // Read how many children forks this set pushed so we can push it every time we retry.
  const treeForkCount = getIsHydrating() ? getForksAtLevel(workInProgress) : 0;

  if (!shouldForceFallback) {
    const didSuspendBefore =
      current !== null && (current.flags & DidCapture) !== NoFlags;
    if (didSuspendBefore) {
      // If we previously forced a fallback, we need to schedule work
      // on any nested boundaries to let them know to try to render
      // again. This is the same as context updating.
      propagateSuspenseContextChange(
        workInProgress,
        workInProgress.child,
        renderLanes,
      );
    }
  }

  if (!disableLegacyMode && (workInProgress.mode & ConcurrentMode) === NoMode) {
    // In legacy mode, SuspenseList doesn't work so we just
    // use make it a noop by treating it as the default revealOrder.
    workInProgress.memoizedState = null;
  } else {
    switch (revealOrder) {
      case 'backwards': {
        // We're going to find the first row that has existing content.
        // We are also going to reverse the order of anything in the existing content
        // since we want to actually render them backwards from the reconciled set.
        // The tail is left in order, because it'll be added to the front as we
        // complete each item.
        const lastContentRow = findLastContentRow(workInProgress.child);
        let tail;
        if (lastContentRow === null) {
          // The whole list is part of the tail.
          tail = workInProgress.child;
          workInProgress.child = null;
        } else {
          // Disconnect the tail rows after the content row.
          // We're going to render them separately later in reverse order.
          tail = lastContentRow.sibling;
          lastContentRow.sibling = null;
          // We have to now reverse the main content so it renders backwards too.
          reverseChildren(workInProgress);
        }
        // TODO: If workInProgress.child is null, we can continue on the tail immediately.
        initSuspenseListRenderState(
          workInProgress,
          true, // isBackwards
          tail,
          null, // last
          tailMode,
          treeForkCount,
        );
        break;
      }
      case 'unstable_legacy-backwards': {
        // We're going to find the first row that has existing content.
        // At the same time we're going to reverse the list of everything
        // we pass in the meantime. That's going to be our tail in reverse
        // order.
        let tail = null;
        let row = workInProgress.child;
        workInProgress.child = null;
        while (row !== null) {
          const currentRow = row.alternate;
          // New rows can't be content rows.
          if (currentRow !== null && findFirstSuspended(currentRow) === null) {
            // This is the beginning of the main content.
            workInProgress.child = row;
            break;
          }
          const nextRow = row.sibling;
          row.sibling = tail;
          tail = row;
          row = nextRow;
        }
        // TODO: If workInProgress.child is null, we can continue on the tail immediately.
        initSuspenseListRenderState(
          workInProgress,
          true, // isBackwards
          tail,
          null, // last
          tailMode,
          treeForkCount,
        );
        break;
      }
      case 'together': {
        initSuspenseListRenderState(
          workInProgress,
          false, // isBackwards
          null, // tail
          null, // last
          undefined,
          treeForkCount,
        );
        break;
      }
      case 'independent': {
        // The "independent" reveal order is the same as not having
        // a boundary.
        workInProgress.memoizedState = null;
        break;
      }
      // The default is now forwards.
      case 'forwards':
      default: {
        const lastContentRow = findLastContentRow(workInProgress.child);
        let tail;
        if (lastContentRow === null) {
          // The whole list is part of the tail.
          // TODO: We could fast path by just rendering the tail now.
          tail = workInProgress.child;
          workInProgress.child = null;
        } else {
          // Disconnect the tail rows after the content row.
          // We're going to render them separately later.
          tail = lastContentRow.sibling;
          lastContentRow.sibling = null;
        }
        initSuspenseListRenderState(
          workInProgress,
          false, // isBackwards
          tail,
          lastContentRow,
          tailMode,
          treeForkCount,
        );
        break;
      }
    }
  }
  return workInProgress.child;
}

function updateViewTransition(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  if (workInProgress.stateNode === null) {
    // We previously reset the work-in-progress.
    // We need to create a new ViewTransitionState instance.
    const instance: ViewTransitionState = {
      autoName: null,
      paired: null,
      clones: null,
      ref: null,
    };
    workInProgress.stateNode = instance;
  }

  const pendingProps: ViewTransitionProps = workInProgress.pendingProps;
  if (pendingProps.name != null && pendingProps.name !== 'auto') {
    // Explicitly named boundary. We track it so that we can pair it up with another explicit
    // boundary if we get deleted.
    workInProgress.flags |=
      current === null
        ? ViewTransitionNamedMount | ViewTransitionNamedStatic
        : ViewTransitionNamedStatic;
  } else {
    // The server may have used useId to auto-assign a generated name for this boundary.
    // We push a materialization to ensure child ids line up with the server.
    if (getIsHydrating()) {
      pushMaterializedTreeId(workInProgress);
    }
  }
  if (__DEV__) {
    // $FlowFixMe[prop-missing]
    if (pendingProps.className !== undefined) {
      const example =
        typeof pendingProps.className === 'string'
          ? JSON.stringify(pendingProps.className)
          : '{...}';
      if (!didWarnAboutClassNameOnViewTransition[example]) {
        didWarnAboutClassNameOnViewTransition[example] = true;
        console.error(
          '<ViewTransition> doesn\'t accept a "className" prop. It has been renamed to "default".\n' +
            '-   <ViewTransition className=%s>\n' +
            '+   <ViewTransition default=%s>',
          example,
          example,
        );
      }
    }
  }
  if (current !== null && current.memoizedProps.name !== pendingProps.name) {
    // If the name changes, we schedule a ref effect to create a new ref instance.
    workInProgress.flags |= Ref | RefStatic;
  } else {
    markRef(current, workInProgress);
  }
  const nextChildren = pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updatePortalComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
  const nextChildren = workInProgress.pendingProps;
  if (current === null) {
    // Portals are special because we don't append the children during mount
    // but at commit. Therefore we need to track insertions which the normal
    // flow doesn't do during mount. This doesn't happen at the root because
    // the root always starts with a "current" with a null child.
    // TODO: Consider unifying this with how the root works.
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
  } else {
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  }
  return workInProgress.child;
}

let hasWarnedAboutUsingNoValuePropOnContextProvider = false;

function updateContextProvider(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const context: ReactContext<any> = workInProgress.type;
  const newProps = workInProgress.pendingProps;
  const newValue = newProps.value;

  if (__DEV__) {
    if (!('value' in newProps)) {
      if (!hasWarnedAboutUsingNoValuePropOnContextProvider) {
        hasWarnedAboutUsingNoValuePropOnContextProvider = true;
        console.error(
          'The `value` prop is required for the `<Context.Provider>`. Did you misspell it or forget to pass it?',
        );
      }
    }
  }

  pushProvider(workInProgress, context, newValue);

  const newChildren = newProps.children;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}

function updateContextConsumer(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const consumerType: ReactConsumerType<any> = workInProgress.type;
  const context: ReactContext<any> = consumerType._context;
  const newProps = workInProgress.pendingProps;
  const render = newProps.children;

  if (__DEV__) {
    if (typeof render !== 'function') {
      console.error(
        'A context consumer was rendered with multiple children, or a child ' +
          "that isn't a function. A context consumer expects a single child " +
          'that is a function. If you did pass a function, make sure there ' +
          'is no trailing or leading whitespace around it.',
      );
    }
  }

  prepareToReadContext(workInProgress, renderLanes);
  const newValue = readContext(context);
  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }
  let newChildren;
  if (__DEV__) {
    newChildren = callComponentInDEV(render, newValue, undefined);
  } else {
    newChildren = render(newValue);
  }
  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}

function updateScopeComponent(
  current: null | Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const nextProps = workInProgress.pendingProps;
  const nextChildren = nextProps.children;
  markRef(current, workInProgress);
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

export function markWorkInProgressReceivedUpdate() {
  didReceiveUpdate = true;
}

export function checkIfWorkInProgressReceivedUpdate(): boolean {
  return didReceiveUpdate;
}

function resetSuspendedCurrentOnMountInLegacyMode(
  current: null | Fiber,
  workInProgress: Fiber,
) {
  if (!disableLegacyMode && (workInProgress.mode & ConcurrentMode) === NoMode) {
    if (current !== null) {
      // A lazy component only mounts if it suspended inside a non-
      // concurrent tree, in an inconsistent state. We want to treat it like
      // a new mount, even though an empty version of it already committed.
      // Disconnect the alternate pointers.
      current.alternate = null;
      workInProgress.alternate = null;
      // Since this is conceptually a new fiber, schedule a Placement effect
      workInProgress.flags |= Placement;
    }
  }
}

function bailoutOnAlreadyFinishedWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  if (current !== null) {
    // Reuse previous dependencies
    workInProgress.dependencies = current.dependencies;
  }

  if (enableProfilerTimer) {
    // Don't update "base" render times for bailouts.
    stopProfilerTimerIfRunning(workInProgress);
  }

  markSkippedUpdateLanes(workInProgress.lanes);

  // Check if the children have any pending work.
  if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    // The children don't have any work either. We can skip them.
    // TODO: Once we add back resuming, we should check if the children are
    // a work-in-progress set. If so, we need to transfer their effects.

    if (current !== null) {
      // Before bailing out, check if there are any context changes in
      // the children.
      lazilyPropagateParentContextChanges(current, workInProgress, renderLanes);
      if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
        return null;
      }
    } else {
      return null;
    }
  }

  // This fiber doesn't have work, but its subtree does. Clone the child
  // fibers and continue.
  cloneChildFibers(current, workInProgress);
  return workInProgress.child;
}

function remountFiber(
  current: Fiber,
  oldWorkInProgress: Fiber,
  newWorkInProgress: Fiber,
): Fiber | null {
  if (__DEV__) {
    const returnFiber = oldWorkInProgress.return;
    if (returnFiber === null) {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error('Cannot swap the root fiber.');
    }

    // Disconnect from the old current.
    // It will get deleted.
    current.alternate = null;
    oldWorkInProgress.alternate = null;

    // Connect to the new tree.
    newWorkInProgress.index = oldWorkInProgress.index;
    newWorkInProgress.sibling = oldWorkInProgress.sibling;
    newWorkInProgress.return = oldWorkInProgress.return;
    newWorkInProgress.ref = oldWorkInProgress.ref;

    // $FlowFixMe[constant-condition]
    if (__DEV__) {
      newWorkInProgress._debugInfo = oldWorkInProgress._debugInfo;
    }

    // Replace the child/sibling pointers above it.
    if (oldWorkInProgress === returnFiber.child) {
      returnFiber.child = newWorkInProgress;
    } else {
      let prevSibling = returnFiber.child;
      if (prevSibling === null) {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error('Expected parent to have a child.');
      }
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      while (prevSibling.sibling !== oldWorkInProgress) {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        prevSibling = prevSibling.sibling;
        if (prevSibling === null) {
          // eslint-disable-next-line react-internal/prod-error-codes
          throw new Error('Expected to find the previous sibling.');
        }
      }
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      prevSibling.sibling = newWorkInProgress;
    }

    // Delete the old fiber and place the new one.
    // Since the old fiber is disconnected, we have to schedule it manually.
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [current];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(current);
    }

    newWorkInProgress.flags |= Placement | PlacementDEV;

    // Restart work from the new fiber.
    return newWorkInProgress;
  } else {
    throw new Error(
      'Did not expect this call in production. ' +
        'This is a bug in React. Please file an issue.',
    );
  }
}

function checkScheduledUpdateOrContext(
  current: Fiber,
  renderLanes: Lanes,
): boolean {
  // Before performing an early bailout, we must check if there are pending
  // updates or context.
  const updateLanes = current.lanes;
  if (includesSomeLane(updateLanes, renderLanes)) {
    return true;
  }
  // No pending update, but because context is propagated lazily, we need
  // to check for a context change before we bail out.
  const dependencies = current.dependencies;
  if (dependencies !== null && checkIfContextChanged(dependencies)) {
    return true;
  }
  return false;
}

function attemptEarlyBailoutIfNoScheduledUpdate(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // This fiber does not have any pending work. Bailout without entering
  // the begin phase. There's still some bookkeeping we that needs to be done
  // in this optimized path, mostly pushing stuff onto the stack.
  switch (workInProgress.tag) {
    case HostRoot: {
      pushHostRootContext(workInProgress);
      const root: FiberRoot = workInProgress.stateNode;
      pushRootTransition(workInProgress, root, renderLanes);

      if (enableTransitionTracing) {
        pushRootMarkerInstance(workInProgress);
      }

      const cache: Cache = current.memoizedState.cache;
      pushCacheProvider(workInProgress, cache);
      resetHydrationState();
      break;
    }
    case HostSingleton:
    case HostComponent:
      pushHostContext(workInProgress);
      break;
    case ClassComponent: {
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        pushLegacyContextProvider(workInProgress);
      }
      break;
    }
    case HostPortal:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      break;
    case ContextProvider: {
      const newValue = workInProgress.memoizedProps.value;
      const context: ReactContext<any> = workInProgress.type;
      pushProvider(workInProgress, context, newValue);
      break;
    }
    case Profiler:
      if (enableProfilerTimer) {
        // Profiler should only call onRender when one of its descendants actually rendered.
        const hasChildWork = includesSomeLane(
          renderLanes,
          workInProgress.childLanes,
        );
        if (hasChildWork) {
          workInProgress.flags |= Update;
        }

        if (enableProfilerCommitHooks) {
          // Schedule a passive effect for this Profiler to call onPostCommit hooks.
          // This effect should be scheduled even if there is no onPostCommit callback for this Profiler,
          // because the effect is also where times bubble to parent Profilers.
          workInProgress.flags |= Passive;
          // Reset effect durations for the next eventual effect phase.
          // These are reset during render to allow the DevTools commit hook a chance to read them,
          const stateNode = workInProgress.stateNode;
          stateNode.effectDuration = -0;
          stateNode.passiveEffectDuration = -0;
        }
      }
      break;
    case ActivityComponent: {
      const state: ActivityState | null = workInProgress.memoizedState;
      if (state !== null) {
        // We're dehydrated so we're not going to render the children. This is just
        // to maintain push/pop symmetry.
        // We know that this component will suspend again because if it has
        // been unsuspended it has committed as a hydrated Activity component.
        // If it needs to be retried, it should have work scheduled on it.
        workInProgress.flags |= DidCapture;
        pushDehydratedActivitySuspenseHandler(workInProgress);
        return null;
      }
      break;
    }
    case SuspenseComponent: {
      const state: SuspenseState | null = workInProgress.memoizedState;
      if (state !== null) {
        if (state.dehydrated !== null) {
          // We're not going to render the children, so this is just to maintain
          // push/pop symmetry
          pushPrimaryTreeSuspenseHandler(workInProgress);
          // We know that this component will suspend again because if it has
          // been unsuspended it has committed as a resolved Suspense component.
          // If it needs to be retried, it should have work scheduled on it.
          workInProgress.flags |= DidCapture;
          // We should never render the children of a dehydrated boundary until we
          // upgrade it. We return null instead of bailoutOnAlreadyFinishedWork.
          return null;
        }

        // If this boundary is currently timed out, we need to decide
        // whether to retry the primary children, or to skip over it and
        // go straight to the fallback. Check the priority of the primary
        // child fragment.
        //
        // Propagate context changes first. If a parent context changed
        // and the primary children's consumer fibers were discarded
        // during initial mount suspension, normal propagation can't find
        // them. In that case we conservatively retry the boundary — the
        // re-mounted children will read the updated context value.
        const contextChanged = lazilyPropagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
        );
        const primaryChildFragment: Fiber = workInProgress.child as any;
        const primaryChildLanes = primaryChildFragment.childLanes;
        if (
          contextChanged ||
          includesSomeLane(renderLanes, primaryChildLanes)
        ) {
          // The primary children have pending work. Use the normal path
          // to attempt to render the primary children again.
          return updateSuspenseComponent(current, workInProgress, renderLanes);
        } else {
          // The primary child fragment does not have pending work marked
          // on it
          pushPrimaryTreeSuspenseHandler(workInProgress);
          // The primary children do not have pending work with sufficient
          // priority. Bailout.
          const child = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes,
          );
          if (child !== null) {
            // The fallback children have pending work. Skip over the
            // primary children and work on the fallback.
            return child.sibling;
          } else {
            // Note: We can return `null` here because we already checked
            // whether there were nested context consumers, via the call to
            // `bailoutOnAlreadyFinishedWork` above.
            return null;
          }
        }
      } else {
        pushPrimaryTreeSuspenseHandler(workInProgress);
      }
      break;
    }
    case SuspenseListComponent: {
      if (workInProgress.flags & DidCapture) {
        // Second pass caught.
        return updateSuspenseListComponent(
          current,
          workInProgress,
          renderLanes,
        );
      }
      const didSuspendBefore = (current.flags & DidCapture) !== NoFlags;

      let hasChildWork = includesSomeLane(
        renderLanes,
        workInProgress.childLanes,
      );

      if (!hasChildWork) {
        // Context changes may not have been propagated yet. We need to do
        // that now, before we can decide whether to bail out.
        // TODO: We use `childLanes` as a heuristic for whether there is
        // remaining work in a few places, including
        // `bailoutOnAlreadyFinishedWork` and
        // `updateDehydratedSuspenseComponent`. We should maybe extract this
        // into a dedicated function.
        lazilyPropagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
        );
        hasChildWork = includesSomeLane(renderLanes, workInProgress.childLanes);
      }

      if (didSuspendBefore) {
        if (hasChildWork) {
          // If something was in fallback state last time, and we have all the
          // same children then we're still in progressive loading state.
          // Something might get unblocked by state updates or retries in the
          // tree which will affect the tail. So we need to use the normal
          // path to compute the correct tail.
          return updateSuspenseListComponent(
            current,
            workInProgress,
            renderLanes,
          );
        }
        // If none of the children had any work, that means that none of
        // them got retried so they'll still be blocked in the same way
        // as before. We can fast bail out.
        workInProgress.flags |= DidCapture;
      }

      // If nothing suspended before and we're rendering the same children,
      // then the tail doesn't matter. Anything new that suspends will work
      // in the "together" mode, so we can continue from the state we had.
      const renderState = workInProgress.memoizedState;
      if (renderState !== null) {
        // Reset to the "together" mode in case we've started a different
        // update in the past but didn't complete it.
        renderState.rendering = null;
        renderState.tail = null;
        renderState.lastEffect = null;
      }
      pushSuspenseListContext(workInProgress, suspenseStackCursor.current);

      if (hasChildWork) {
        break;
      } else {
        // If none of the children had any work, that means that none of
        // them got retried so they'll still be blocked in the same way
        // as before. We can fast bail out.
        return null;
      }
    }
    case OffscreenComponent: {
      // Need to check if the tree still needs to be deferred. This is
      // almost identical to the logic used in the normal update path,
      // so we'll just enter that. The only difference is we'll bail out
      // at the next level instead of this one, because the child props
      // have not changed. Which is fine.
      // TODO: Probably should refactor `beginWork` to split the bailout
      // path from the normal path. I'm tempted to do a labeled break here
      // but I won't :)
      workInProgress.lanes = NoLanes;
      return updateOffscreenComponent(
        current,
        workInProgress,
        renderLanes,
        workInProgress.pendingProps,
      );
    }
    case CacheComponent: {
      const cache: Cache = current.memoizedState.cache;
      pushCacheProvider(workInProgress, cache);
      break;
    }
    case TracingMarkerComponent: {
      if (enableTransitionTracing) {
        const instance: TracingMarkerInstance | null = workInProgress.stateNode;
        if (instance !== null) {
          pushMarkerInstance(workInProgress, instance);
        }
        break;
      }
      // Fallthrough
    }
    case LegacyHiddenComponent: {
      if (enableLegacyHidden) {
        workInProgress.lanes = NoLanes;
        return updateLegacyHiddenComponent(
          current,
          workInProgress,
          renderLanes,
        );
      }
      // Fallthrough
    }
  }
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}

function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  if (__DEV__) {
    if (workInProgress._debugNeedsRemount && current !== null) {
      // This will restart the begin phase with a new fiber.
      const copiedFiber = createFiberFromTypeAndProps(
        workInProgress.type,
        workInProgress.key,
        workInProgress.pendingProps,
        workInProgress._debugOwner || null,
        workInProgress.mode,
        workInProgress.lanes,
      );
      copiedFiber._debugStack = workInProgress._debugStack;
      copiedFiber._debugTask = workInProgress._debugTask;
      return remountFiber(current, workInProgress, copiedFiber);
    }
  }

  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;

    if (
      oldProps !== newProps ||
      hasLegacyContextChanged() ||
      // Force a re-render if the implementation changed due to hot reload:
      (__DEV__ ? workInProgress.type !== current.type : false)
    ) {
      // If props or context changed, mark the fiber as having performed work.
      // This may be unset if the props are determined to be equal later (memo).
      didReceiveUpdate = true;
    } else {
      // Neither props nor legacy context changes. Check if there's a pending
      // update or context change.
      const hasScheduledUpdateOrContext = checkScheduledUpdateOrContext(
        current,
        renderLanes,
      );
      if (
        !hasScheduledUpdateOrContext &&
        // If this is the second pass of an error or suspense boundary, there
        // may not be work scheduled on `current`, so we check for this flag.
        (workInProgress.flags & DidCapture) === NoFlags
      ) {
        // No pending updates or context. Bail out now.
        didReceiveUpdate = false;
        return attemptEarlyBailoutIfNoScheduledUpdate(
          current,
          workInProgress,
          renderLanes,
        );
      }
      if ((current.flags & ForceUpdateForLegacySuspense) !== NoFlags) {
        // This is a special case that only exists for legacy mode.
        // See https://github.com/facebook/react/pull/19216.
        didReceiveUpdate = true;
      } else {
        // An update was scheduled on this fiber, but there are no new props
        // nor legacy context. Set this to false. If an update queue or context
        // consumer produces a changed value, it will set this to true. Otherwise,
        // the component will assume the children have not changed and bail out.
        didReceiveUpdate = false;
      }
    }
  } else {
    didReceiveUpdate = false;

    if (getIsHydrating() && isForkedChild(workInProgress)) {
      // Check if this child belongs to a list of muliple children in
      // its parent.
      //
      // In a true multi-threaded implementation, we would render children on
      // parallel threads. This would represent the beginning of a new render
      // thread for this subtree.
      //
      // We only use this for id generation during hydration, which is why the
      // logic is located in this special branch.
      const slotIndex = workInProgress.index;
      const numberOfForks = getForksAtLevel(workInProgress);
      pushTreeId(workInProgress, numberOfForks, slotIndex);
    }
  }

  // Before entering the begin phase, clear pending update priority.
  // TODO: This assumes that we're about to evaluate the component and process
  // the update queue. However, there's an exception: SimpleMemoComponent
  // sometimes bails out later in the begin phase. This indicates that we should
  // move this assignment out of the common path and into each branch.
  workInProgress.lanes = NoLanes;

  switch (workInProgress.tag) {
    case LazyComponent: {
      const elementType = workInProgress.elementType;
      return mountLazyComponent(
        current,
        workInProgress,
        elementType,
        renderLanes,
      );
    }
    case FunctionComponent: {
      const Component = workInProgress.type;
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        workInProgress.pendingProps,
        renderLanes,
      );
    }
    case ClassComponent: {
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps = resolveClassComponentProps(
        Component,
        unresolvedProps,
      );
      return updateClassComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostHoistable:
      // $FlowFixMe[constant-condition]
      if (supportsResources) {
        return updateHostHoistable(current, workInProgress, renderLanes);
      }
    // Fall through
    case HostSingleton:
      // $FlowFixMe[constant-condition]
      if (supportsSingletons) {
        return updateHostSingleton(current, workInProgress, renderLanes);
      }
    // Fall through
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, renderLanes);
    case HostPortal:
      return updatePortalComponent(current, workInProgress, renderLanes);
    case ForwardRef: {
      return updateForwardRef(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes,
      );
    }
    case Fragment:
      return updateFragment(current, workInProgress, renderLanes);
    case Mode:
      return updateMode(current, workInProgress, renderLanes);
    case Profiler:
      return updateProfiler(current, workInProgress, renderLanes);
    case ContextProvider:
      return updateContextProvider(current, workInProgress, renderLanes);
    case ContextConsumer:
      return updateContextConsumer(current, workInProgress, renderLanes);
    case MemoComponent: {
      return updateMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes,
      );
    }
    case SimpleMemoComponent: {
      return updateSimpleMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes,
      );
    }
    case IncompleteClassComponent: {
      if (disableLegacyMode) {
        break;
      }
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps = resolveClassComponentProps(
        Component,
        unresolvedProps,
      );
      return mountIncompleteClassComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    }
    case IncompleteFunctionComponent: {
      if (disableLegacyMode) {
        break;
      }
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps = resolveClassComponentProps(
        Component,
        unresolvedProps,
      );
      return mountIncompleteFunctionComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    }
    case SuspenseListComponent: {
      return updateSuspenseListComponent(current, workInProgress, renderLanes);
    }
    case ScopeComponent: {
      if (enableScopeAPI) {
        return updateScopeComponent(current, workInProgress, renderLanes);
      }
      break;
    }
    case ActivityComponent: {
      return updateActivityComponent(current, workInProgress, renderLanes);
    }
    case OffscreenComponent: {
      return updateOffscreenComponent(
        current,
        workInProgress,
        renderLanes,
        workInProgress.pendingProps,
      );
    }
    case LegacyHiddenComponent: {
      if (enableLegacyHidden) {
        return updateLegacyHiddenComponent(
          current,
          workInProgress,
          renderLanes,
        );
      }
      break;
    }
    case CacheComponent: {
      return updateCacheComponent(current, workInProgress, renderLanes);
    }
    case TracingMarkerComponent: {
      if (enableTransitionTracing) {
        return updateTracingMarkerComponent(
          current,
          workInProgress,
          renderLanes,
        );
      }
      break;
    }
    case ViewTransitionComponent: {
      if (enableViewTransition) {
        return updateViewTransition(current, workInProgress, renderLanes);
      }
      break;
    }
    case Throw: {
      // This represents a Component that threw in the reconciliation phase.
      // So we'll rethrow here. This might be a Thenable.
      throw workInProgress.pendingProps;
    }
  }

  throw new Error(
    `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
      'React. Please file an issue.',
  );
}

export {beginWork};
