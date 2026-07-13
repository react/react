/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {Fiber, FiberRoot} from './ReactInternalTypes';
import type {Lanes} from './ReactFiberLane';
import type {ActivityState} from './ReactFiberActivityComponent';
import type {
  SuspenseState,
  SuspenseListRenderState,
} from './ReactFiberSuspenseComponent';
import type {Cache} from './ReactFiberCacheComponent';
import type {TracingMarkerInstance} from './ReactFiberTracingMarkerComponent';

import {
  ClassComponent,
  HostRoot,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostPortal,
  ContextProvider,
  ActivityComponent,
  SuspenseComponent,
  SuspenseListComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
} from './ReactWorkTags';
import {DidCapture, NoFlags, ShouldCapture, Update} from './ReactFiberFlags';
import {NoMode, ProfileMode} from './ReactTypeOfMode';
import {
  enableProfilerTimer,
  enableTransitionTracing,
} from 'shared/ReactFeatureFlags';

import {popHostContainer, popHostContext} from './ReactFiberHostContext';
import {
  popSuspenseListContext,
  popSuspenseHandler,
} from './ReactFiberSuspenseContext';
import {popHiddenContext} from './ReactFiberHiddenContext';
import {resetHydrationState} from './ReactFiberHydrationContext';
import {
  isContextProvider as isLegacyContextProvider,
  popContext as popLegacyContext,
  popTopLevelContextObject as popTopLevelLegacyContextObject,
} from './ReactFiberLegacyContext';
import {popProvider} from './ReactFiberNewContext';
import {popCacheProvider} from './ReactFiberCacheComponent';
import {transferActualDuration} from './ReactProfilerTimer';
import {popTreeContext} from './ReactFiberTreeContext';
import {popRootTransition, popTransition} from './ReactFiberTransition';
import {
  popMarkerInstance,
  popRootMarkerInstance,
} from './ReactFiberTracingMarkerComponent';

function unwindWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.
  popTreeContext(workInProgress);
  switch (workInProgress.tag) {
    case ClassComponent: {
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        popLegacyContext(workInProgress);
      }
      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        return workInProgress;
      }
      return null;
    }
    case HostRoot: {
      const root: FiberRoot = workInProgress.stateNode;
      const cache: Cache = workInProgress.memoizedState.cache;
      popCacheProvider(workInProgress, cache);

      if (enableTransitionTracing) {
        popRootMarkerInstance(workInProgress);
      }

      popRootTransition(workInProgress, root, renderLanes);
      popHostContainer(workInProgress);
      popTopLevelLegacyContextObject(workInProgress);
      const flags = workInProgress.flags;
      if (
        (flags & ShouldCapture) !== NoFlags &&
        (flags & DidCapture) === NoFlags
      ) {
        // There was an error during render that wasn't captured by a suspense
        // boundary. Do a second pass on the root to unmount the children.
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        return workInProgress;
      }
      // We unwound to the root without completing it. Exit.
      return null;
    }
    case HostHoistable:
    case HostSingleton:
    case HostComponent: {
      // TODO: popHydrationState
      popHostContext(workInProgress);
      return null;
    }
    case ActivityComponent: {
      const activityState: null | ActivityState = workInProgress.memoizedState;
      if (activityState !== null) {
        popSuspenseHandler(workInProgress);

        if (workInProgress.alternate === null) {
          throw new Error(
            'Threw in newly mounted dehydrated component. This is likely a bug in ' +
              'React. Please file an issue.',
          );
        }

        resetHydrationState();
      }

      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        // Captured a suspense effect. Re-render the boundary.
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        return workInProgress;
      }
      return null;
    }
    case SuspenseComponent: {
      popSuspenseHandler(workInProgress);
      const suspenseState: null | SuspenseState = workInProgress.memoizedState;
      if (suspenseState !== null && suspenseState.dehydrated !== null) {
        if (workInProgress.alternate === null) {
          throw new Error(
            'Threw in newly mounted dehydrated component. This is likely a bug in ' +
              'React. Please file an issue.',
          );
        }

        resetHydrationState();
      }

      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        // Captured a suspense effect. Re-render the boundary.
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        return workInProgress;
      }
      return null;
    }
    case SuspenseListComponent: {
      popSuspenseListContext(workInProgress);
      // SuspenseList doesn't normally catch anything. It should've been
      // caught by a nested boundary. If not, it should bubble through.
      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        // If we caught something on the SuspenseList itself it's because
        // we want to ignore something. Re-enter the cycle and handle it
        // in the complete phase.
        const renderState: null | SuspenseListRenderState =
          workInProgress.memoizedState;
        if (renderState !== null) {
          // Cut off any remaining tail work and don't commit the rendering one.
          // This assumes that we have already confirmed that none of these are
          // already mounted.
          renderState.rendering = null;
          renderState.tail = null;
        }
        // Schedule the commit phase to attach retry listeners.
        workInProgress.flags |= Update;
        return workInProgress;
      }
      return null;
    }
    case HostPortal:
      popHostContainer(workInProgress);
      return null;
    case ContextProvider:
      const context: ReactContext<any> = workInProgress.type;
      popProvider(context, workInProgress);
      return null;
    case OffscreenComponent:
    case LegacyHiddenComponent: {
      popSuspenseHandler(workInProgress);
      popHiddenContext(workInProgress);
      popTransition(workInProgress, current);
      const flags = workInProgress.flags;
      if (flags & ShouldCapture) {
        workInProgress.flags = (flags & ~ShouldCapture) | DidCapture;
        // Captured a suspense effect. Re-render the boundary.
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        return workInProgress;
      }
      return null;
    }
    case CacheComponent:
      const cache: Cache = workInProgress.memoizedState.cache;
      popCacheProvider(workInProgress, cache);
      return null;
    case TracingMarkerComponent:
      if (enableTransitionTracing) {
        if (workInProgress.stateNode !== null) {
          popMarkerInstance(workInProgress);
        }
      }
      return null;
    default:
      return null;
  }
}

function unwindInterruptedWork(
  current: Fiber | null,
  interruptedWork: Fiber,
  renderLanes: Lanes,
) {
  // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.
  popTreeContext(interruptedWork);
  switch (interruptedWork.tag) {
    case ClassComponent: {
      const childContextTypes = interruptedWork.type.childContextTypes;
      if (childContextTypes !== null && childContextTypes !== undefined) {
        popLegacyContext(interruptedWork);
      }
      break;
    }
    case HostRoot: {
      const root: FiberRoot = interruptedWork.stateNode;
      const cache: Cache = interruptedWork.memoizedState.cache;
      popCacheProvider(interruptedWork, cache);

      if (enableTransitionTracing) {
        popRootMarkerInstance(interruptedWork);
      }

      popRootTransition(interruptedWork, root, renderLanes);
      popHostContainer(interruptedWork);
      popTopLevelLegacyContextObject(interruptedWork);
      break;
    }
    case HostHoistable:
    case HostSingleton:
    case HostComponent: {
      popHostContext(interruptedWork);
      break;
    }
    case HostPortal:
      popHostContainer(interruptedWork);
      break;
    case ActivityComponent: {
      if (interruptedWork.memoizedState !== null) {
        popSuspenseHandler(interruptedWork);
      }
      break;
    }
    case SuspenseComponent:
      popSuspenseHandler(interruptedWork);
      break;
    case SuspenseListComponent:
      popSuspenseListContext(interruptedWork);
      break;
    case ContextProvider:
      const context: ReactContext<any> = interruptedWork.type;
      popProvider(context, interruptedWork);
      break;
    case OffscreenComponent:
    case LegacyHiddenComponent:
      popSuspenseHandler(interruptedWork);
      popHiddenContext(interruptedWork);
      popTransition(interruptedWork, current);
      break;
    case CacheComponent:
      const cache: Cache = interruptedWork.memoizedState.cache;
      popCacheProvider(interruptedWork, cache);
      break;
    case TracingMarkerComponent:
      if (enableTransitionTracing) {
        const instance: TracingMarkerInstance | null =
          interruptedWork.stateNode;
        if (instance !== null) {
          popMarkerInstance(interruptedWork);
        }
      }
      break;
    default:
      break;
  }
}

export {unwindWork, unwindInterruptedWork};
