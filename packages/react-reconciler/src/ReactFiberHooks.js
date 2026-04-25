/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactContext,
  StartTransitionOptions,
  Usable,
  Thenable,
  RejectedThenable,
  Awaited,
} from 'shared/ReactTypes';
import type {
  Fiber,
  FiberRoot,
  Dispatcher,
  HookType,
  MemoCache,
} from './ReactInternalTypes';
import type {Lanes, Lane} from './ReactFiberLane';
import type {HookFlags} from './ReactHookEffectTags';
import type {Flags} from './ReactFiberFlags';
import type {TransitionStatus} from './ReactFiberConfig';
import type {ScheduledGesture} from './ReactFiberGestureScheduler';

import {
  HostTransitionContext,
  NotPendingTransition as NoPendingHostTransition,
  setCurrentUpdatePriority,
  getCurrentUpdatePriority,
} from './ReactFiberConfig';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import {
  enableSchedulingProfiler,
  enableTransitionTracing,
  enableLegacyCache,
  disableLegacyMode,
  enableNoCloningMemoCache,
  enableViewTransition,
  enableGestureTransition,
} from 'shared/ReactFeatureFlags';
import {
  REACT_CONTEXT_TYPE,
  REACT_MEMO_CACHE_SENTINEL,
} from 'shared/ReactSymbols';

import {
  NoMode,
  ConcurrentMode,
  StrictEffectsMode,
  StrictLegacyMode,
} from './ReactTypeOfMode';
import {
  NoLane,
  SyncLane,
  OffscreenLane,
  DeferredLane,
  NoLanes,
  isSubsetOfLanes,
  includesBlockingLane,
  includesOnlyNonUrgentLanes,
  mergeLanes,
  removeLanes,
  intersectLanes,
  isTransitionLane,
  markRootEntangled,
  includesSomeLane,
  isGestureRender,
  GestureLane,
  UpdateLanes,
} from './ReactFiberLane';
import {
  ContinuousEventPriority,
  higherEventPriority,
} from './ReactEventPriorities';
import {readContext, checkIfContextChanged} from './ReactFiberNewContext';
import {HostRoot, CacheComponent, HostComponent} from './ReactWorkTags';
import {
  LayoutStatic as LayoutStaticEffect,
  Passive as PassiveEffect,
  PassiveStatic as PassiveStaticEffect,
  StaticMask as StaticMaskEffect,
  Update as UpdateEffect,
  StoreConsistency,
  MountLayoutDev as MountLayoutDevEffect,
  MountPassiveDev as MountPassiveDevEffect,
  FormReset,
} from './ReactFiberFlags';
import {
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Passive as HookPassive,
  Insertion as HookInsertion,
} from './ReactHookEffectTags';
import {
  getWorkInProgressRoot,
  getWorkInProgressRootRenderLanes,
  scheduleUpdateOnFiber,
  requestUpdateLane,
  requestDeferredLane,
  markSkippedUpdateLanes,
  isInvalidExecutionContextForEventFunction,
} from './ReactFiberWorkLoop';

import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import is from 'shared/objectIs';
import isArray from 'shared/isArray';
import {
  markWorkInProgressReceivedUpdate,
  checkIfWorkInProgressReceivedUpdate,
} from './ReactFiberBeginWork';
import {
  getIsHydrating,
  tryToClaimNextHydratableFormMarkerInstance,
} from './ReactFiberHydrationContext';
import {
  markStateUpdateScheduled,
  setIsStrictModeForDevtools,
} from './ReactFiberDevToolsHook';
import {
  startUpdateTimerByLane,
  startHostActionTimer,
} from './ReactProfilerTimer';
import {createCache} from './ReactFiberCacheComponent';
import {
  createUpdate as createLegacyQueueUpdate,
  enqueueUpdate as enqueueLegacyQueueUpdate,
  entangleTransitions as entangleLegacyQueueTransitions,
} from './ReactFiberClassUpdateQueue';
import {
  enqueueConcurrentHookUpdate,
  enqueueConcurrentHookUpdateAndEagerlyBailout,
  enqueueConcurrentRenderForLane,
} from './ReactFiberConcurrentUpdates';
import {getTreeId} from './ReactFiberTreeContext';
import {now} from './Scheduler';
import {
  trackUsedThenable,
  checkIfUseWrappedInTryCatch,
  createThenableState,
  SuspenseException,
  SuspenseActionException,
} from './ReactFiberThenable';
import type {ThenableState} from './ReactFiberThenable';
import type {Transition} from 'react/src/ReactStartTransition';
import {
  peekEntangledActionLane,
  peekEntangledActionThenable,
  chainThenableValue,
} from './ReactFiberAsyncAction';
import {requestTransitionLane} from './ReactFiberRootScheduler';
import {isCurrentTreeHidden} from './ReactFiberHiddenContext';
import {requestCurrentTransition} from './ReactFiberTransition';

import {callComponentInDEV} from './ReactFiberCallUserSpace';

import {scheduleGesture} from './ReactFiberGestureScheduler';

export type Update<S, A> = {
  lane: Lane,
  revertLane: Lane,
  action: A,
  hasEagerState: boolean,
  eagerState: S | null,
  next: Update<S, A>,
  gesture: null | ScheduledGesture, // enableGestureTransition
};

export type UpdateQueue<S, A> = {
  pending: Update<S, A> | null,
  lanes: Lanes,
  dispatch: (A => mixed) | null,
  lastRenderedReducer: ((S, A) => S) | null,
  lastRenderedState: S | null,
};

let didWarnAboutMismatchedHooksForComponent;
let didWarnUncachedGetSnapshot: void | true;
let didWarnAboutUseWrappedInTryCatch;
let didWarnAboutAsyncClientComponent;
let didWarnAboutUseFormState;
if (__DEV__) {
  didWarnAboutMismatchedHooksForComponent = new Set<string | null>();
  didWarnAboutUseWrappedInTryCatch = new Set<string | null>();
  didWarnAboutAsyncClientComponent = new Set<string | null>();
  didWarnAboutUseFormState = new Set<string | null>();
}

export type Hook = {
  memoizedState: any,
  baseState: any,
  baseQueue: Update<any, any> | null,
  queue: any,
  next: Hook | null,
};

// The effect "instance" is a shared object that remains the same for the entire
// lifetime of an effect. In Rust terms, a RefCell. We use it to store the
// "destroy" function that is returned from an effect, because that is stateful.
// The field is `undefined` if the effect is unmounted, or if the effect ran
// but is not stateful. We don't explicitly track whether the effect is mounted
// or unmounted because that can be inferred by the hiddenness of the fiber in
// the tree, i.e. whether there is a hidden Offscreen fiber above it.
//
// It's unfortunate that this is stored on a separate object, because it adds
// more memory per effect instance, but it's conceptually sound. I think there's
// likely a better data structure we could use for effects; perhaps just one
// array of effect instances per fiber. But I think this is OK for now despite
// the additional memory and we can follow up with performance
// optimizations later.
type EffectInstance = {
  destroy: void | (() => void),
};

export type Effect = {
  tag: HookFlags,
  inst: EffectInstance,
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
  next: Effect,
};

type StoreInstance<T> = {
  value: T,
  getSnapshot: () => T,
};

type StoreConsistencyCheck<T> = {
  value: T,
  getSnapshot: () => T,
};

type EventFunctionPayload<Args, Return, F: (...Array<Args>) => Return> = {
  ref: {
    eventFn: F,
    impl: F,
  },
  nextImpl: F,
};

export type FunctionComponentUpdateQueue = {
  lastEffect: Effect | null,
  events: Array<EventFunctionPayload<any, any, any>> | null,
  stores: Array<StoreConsistencyCheck<any>> | null,
  memoCache: MemoCache | null,
};

type BasicStateAction<S> = (S => S) | S;

type Dispatch<A> = A => void;

// These are set right before calling the component.
let renderLanes: Lanes = NoLanes;
// The work-in-progress fiber. I've named it differently to distinguish it from
// the work-in-progress hook.
let currentlyRenderingFiber: Fiber = (null: any);

// Hooks are stored as a linked list on the fiber's memoizedState field. The
// current hook list is the list that belongs to the current fiber. The
// work-in-progress hook list is a new list that will be added to the
// work-in-progress fiber.
let currentHook: Hook | null = null;
let workInProgressHook: Hook | null = null;

// Whether an update was scheduled at any point during the render phase. This
// does not get reset if we do another render pass; only when we're completely
// finished evaluating this component. This is an optimization so we know
// whether we need to clear render phase updates after a throw.
let didScheduleRenderPhaseUpdate: boolean = false;
// Where an update was scheduled only during the current render pass. This
// gets reset after each attempt.
// TODO: Maybe there's some way to consolidate this with
// `didScheduleRenderPhaseUpdate`. Or with `numberOfReRenders`.
let didScheduleRenderPhaseUpdateDuringThisPass: boolean = false;
let shouldDoubleInvokeUserFnsInHooksDEV: boolean = false;
// Counts the number of useId hooks in this component.
let localIdCounter: number = 0;
// Counts number of `use`-d thenables
let thenableIndexCounter: number = 0;
let thenableState: ThenableState | null = null;

// Used for ids that are generated completely client-side (i.e. not during
// hydration). This counter is global, so client ids are not stable across
// render attempts.
let globalClientIdCounter: number = 0;

const RE_RENDER_LIMIT = 25;

// In DEV, this is the name of the currently executing primitive hook
let currentHookNameInDev: ?HookType = null;

// In DEV, this list ensures that hooks are called in the same order between renders.
// The list stores the order of hooks used during the initial render (mount).
// Subsequent renders (updates) reference this list.
let hookTypesDev: Array<HookType> | null = null;
let hookTypesUpdateIndexDev: number = -1;

// In DEV, this tracks whether currently rendering component needs to ignore
// the dependencies for Hooks that need them (e.g. useEffect or useMemo).
// When true, such Hooks will always be "remounted". Only used during hot reload.
let ignorePreviousDependencies: boolean = false;

function mountHookTypesDev(): void {
  if (__DEV__) {
    const hookName = ((currentHookNameInDev: any): HookType);

    if (hookTypesDev === null) {
      hookTypesDev = [hookName];
    } else {
      hookTypesDev.push(hookName);
    }
  }
}

function updateHookTypesDev(): void {
  if (__DEV__) {
    const hookName = ((currentHookNameInDev: any): HookType);

    if (hookTypesDev !== null) {
      hookTypesUpdateIndexDev++;
      if (hookTypesDev[hookTypesUpdateIndexDev] !== hookName) {
        warnOnHookMismatchInDev(hookName);
      }
    }
  }
}

function checkDepsAreArrayDev(deps: mixed): void {
  if (__DEV__) {
    if (deps !== undefined && deps !== null && !isArray(deps)) {
      // Verify deps, but only on mount to avoid extra checks.
      // It's unlikely their type would change as usually you define them inline.
      console.error(
        '%s received a final argument that is not an array (instead, received `%s`). When ' +
          'specified, the final argument must be an array.',
        currentHookNameInDev,
        typeof deps,
      );
    }
  }
}

function warnOnHookMismatchInDev(currentHookName: HookType): void {
  if (__DEV__) {
    const componentName = getComponentNameFromFiber(currentlyRenderingFiber);
    if (!didWarnAboutMismatchedHooksForComponent.has(componentName)) {
      didWarnAboutMismatchedHooksForComponent.add(componentName);

      if (hookTypesDev !== null) {
        let table = '';

        const secondColumnStart = 30;

        for (let i = 0; i <= ((hookTypesUpdateIndexDev: any): number); i++) {
          const oldHookName = hookTypesDev[i];
          const newHookName =
            i === ((hookTypesUpdateIndexDev: any): number)
              ? currentHookName
              : oldHookName;

          let row = `${i + 1}. ${oldHookName}`;

          // Extra space so second column lines up
          // lol @ IE not supporting String#repeat
          while (row.length < secondColumnStart) {
            row += ' ';
          }

          row += newHookName + '\n';

          table += row;
        }

        console.error(
          'React has detected a change in the order of Hooks called by %s. ' +
            'This will lead to bugs and errors if not fixed. ' +
            'For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks\n\n' +
            '   Previous render            Next render\n' +
            '   ------------------------------------------------------\n' +
            '%s' +
            '   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n',
          componentName,
          table,
        );
      }
    }
  }
}

function warnOnUseFormStateInDev(): void {
  if (__DEV__) {
    const componentName = getComponentNameFromFiber(currentlyRenderingFiber);
    if (!didWarnAboutUseFormState.has(componentName)) {
      didWarnAboutUseFormState.add(componentName);

      console.error(
        'ReactDOM.useFormState has been renamed to React.useActionState. ' +
          'Please update %s to use React.useActionState.',
        componentName,
      );
    }
  }
}

function warnIfAsyncClientComponent(Component: Function) {
  if (__DEV__) {
    // This dev-only check only works for detecting native async functions,
    // not transpiled ones. There's also a prod check that we use to prevent
    // async client components from crashing the app; the prod one works even
    // for transpiled async functions. Neither mechanism is completely
    // bulletproof but together they cover the most common cases.
    const isAsyncFunction =
      // $FlowIgnore[method-unbinding]
      Object.prototype.toString.call(Component) === '[object AsyncFunction]' ||
      // $FlowIgnore[method-unbinding]
      Object.prototype.toString.call(Component) ===
        '[object AsyncGeneratorFunction]';
    if (isAsyncFunction) {
      // Encountered an async Client Component. This is not yet supported.
      const componentName = getComponentNameFromFiber(currentlyRenderingFiber);
      if (!didWarnAboutAsyncClientComponent.has(componentName)) {
        didWarnAboutAsyncClientComponent.add(componentName);
        console.error(
          '%s is an async Client Component. ' +
            'Only Server Components can be async at the moment. This error is often caused by accidentally ' +
            "adding `'use client'` to a module that was originally written " +
            'for the server.',
          componentName === null
            ? 'An unknown Component'
            : `<${componentName}>`,
        );
      }
    }
  }
}

function throwInvalidHookError() {
  throw new Error(
    'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
      ' one of the following reasons:\n' +
      '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
      '2. You might be breaking the Rules of Hooks\n' +
      '3. You might have more than one copy of React in the same app\n' +
      'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
  );
}

function areHookInputsEqual(
  nextDeps: Array<mixed>,
  prevDeps: Array<mixed> | null,
): boolean {
  if (__DEV__) {
    if (ignorePreviousDependencies) {
      // Only true when this component is being hot reloaded.
      return false;
    }
  }

  if (prevDeps === null) {
    if (__DEV__) {
      console.error(
        '%s received a final argument during this render, but not during ' +
          'the previous render. Even though the final argument is optional, ' +
          'its type cannot change between renders.',
        currentHookNameInDev,
      );
    }
    return false;
  }

  if (__DEV__) {
    // Don't bother comparing lengths in prod because these arrays should be
    // passed inline.
    if (nextDeps.length !== prevDeps.length) {
      console.error(
        'The final argument passed to %s changed size between renders. The ' +
          'order and size of this array must remain constant.\n\n' +
          'Previous: %s\n' +
          'Incoming: %s',
        currentHookNameInDev,
        `[${prevDeps.join(', ')}]`,
        `[${nextDeps.join(', ')}]`,
      );
    }
  }
  // $FlowFixMe[incompatible-use] found when upgrading Flow
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

export function renderWithHooks<Props, SecondArg>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  if (__DEV__) {
    hookTypesDev =
      current !== null
        ? ((current._debugHookTypes: any): Array<HookType>)
        : null;
    hookTypesUpdateIndexDev = -1;
    // Used for hot reloading:
    ignorePreviousDependencies =
      current !== null && current.type !== workInProgress.type;

    warnIfAsyncClientComponent(Component);
  }

  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  // The following should have already been reset
  // currentHook = null;
  // workInProgressHook = null;

  // didScheduleRenderPhaseUpdate = false;
  // localIdCounter = 0;
  // thenableIndexCounter = 0;
  // thenableState = null;

  // TODO Warn if no hooks are used at all during mount, then some are used during update.
  // Currently we will identify the update render as a mount because memoizedState === null.
  // This is tricky because it's valid for certain types of components (e.g. React.lazy)

  // Using memoizedState to differentiate between mount/update only works if at least one stateful hook is used.
  // Non-stateful hooks (e.g. context) don't get added to memoizedState,
  // so memoizedState would be null during updates and mounts.
  if (__DEV__) {
    if (current !== null && current.memoizedState !== null) {
      ReactSharedInternals.H = HooksDispatcherOnUpdateInDEV;
    } else if (hookTypesDev !== null) {
      // This dispatcher handles an edge case where a component is updating,
      // but no stateful hooks have been used.
      // We want to match the production code behavior (which will use HooksDispatcherOnMount),
      // but with the extra DEV validation to ensure hooks ordering hasn't changed.
      // This dispatcher does that.
      ReactSharedInternals.H = HooksDispatcherOnMountWithHookTypesInDEV;
    } else {
      ReactSharedInternals.H = HooksDispatcherOnMountInDEV;
    }
  } else {
    ReactSharedInternals.H =
      current === null || current.memoizedState === null
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;
  }

  // In Strict Mode, during development, user functions are double invoked to
  // help detect side effects. The logic for how this is implemented for in
  // hook components is a bit complex so let's break it down.
  //
  // We will invoke the entire component function twice. However, during the
  // second invocation of the component, the hook state from the first
  // invocation will be reused. That means things like `useMemo` functions won't
  // run again, because the deps will match and the memoized result will
  // be reused.
  //
  // We want memoized functions to run twice, too, so account for this, user
  // functions are double invoked during the *first* invocation of the component
  // function, and are *not* double invoked during the second incovation:
  //
  // - First execution of component function: user functions are double invoked
  // - Second execution of component function (in Strict Mode, during
  //   development): user functions are not double invoked.
  //
  // This is intentional for a few reasons; most importantly, it's because of
  // how `use` works when something suspends: it reuses the promise that was
  // passed during the first attempt. This is itself a form of memoization.
  // We need to be able to memoize the reactive inputs to the `use` call using
  // a hook (i.e. `useMemo`), which means, the reactive inputs to `use` must
  // come from the same component invocation as the output.
  //
  // There are plenty of tests to ensure this behavior is correct.
  const shouldDoubleRenderDEV =
    __DEV__ && (workInProgress.mode & StrictLegacyMode) !== NoMode;

  shouldDoubleInvokeUserFnsInHooksDEV = shouldDoubleRenderDEV;
  let children = __DEV__
    ? callComponentInDEV(Component, props, secondArg)
    : Component(props, secondArg);
  shouldDoubleInvokeUserFnsInHooksDEV = false;

  // Check if there was a render phase update
  if (didScheduleRenderPhaseUpdateDuringThisPass) {
    // Keep rendering until the component stabilizes (there are no more render
    // phase updates).
    children = renderWithHooksAgain(
      workInProgress,
      Component,
      props,
      secondArg,
    );
  }

  if (shouldDoubleRenderDEV) {
    // In development, components are invoked twice to help detect side effects.
    setIsStrictModeForDevtools(true);
    try {
      children = renderWithHooksAgain(
        workInProgress,
        Component,
        props,
        secondArg,
      );
    } finally {
      setIsStrictModeForDevtools(false);
    }
  }

  finishRenderingHooks(current, workInProgress, Component);

  return children;
}

function finishRenderingHooks<Props, SecondArg>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
): void {
  if (__DEV__) {
    workInProgress._debugHookTypes = hookTypesDev;
    // Stash the thenable state for use by DevTools.
    if (workInProgress.dependencies === null) {
      if (thenableState !== null) {
        workInProgress.dependencies = {
          lanes: NoLanes,
          firstContext: null,
          _debugThenableState: thenableState,
        };
      }
    } else {
      workInProgress.dependencies._debugThenableState = thenableState;
    }
  }

  // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrance.
  ReactSharedInternals.H = ContextOnlyDispatcher;

  // This check uses currentHook so that it works the same in DEV and prod bundles.
  // hookTypesDev could catch more cases (e.g. context) but only in DEV bundles.
  const didRenderTooFewHooks =
    currentHook !== null && currentHook.next !== null;

  renderLanes = NoLanes;
  currentlyRenderingFiber = (null: any);

  currentHook = null;
  workInProgressHook = null;

  if (__DEV__) {
    currentHookNameInDev = null;
    hookTypesDev = null;
    hookTypesUpdateIndexDev = -1;

    // Confirm that a static flag was not added or removed since the last
    // render. If this fires, it suggests that we incorrectly reset the static
    // flags in some other part of the codebase. This has happened before, for
    // example, in the SuspenseList implementation.
    if (
      current !== null &&
      (current.flags & StaticMaskEffect) !==
        (workInProgress.flags & StaticMaskEffect) &&
      // Disable this warning in legacy mode, because legacy Suspense is weird
      // and creates false positives. To make this work in legacy mode, we'd
      // need to mark fibers that commit in an incomplete state, somehow. For
      // now I'll disable the warning that most of the bugs that would trigger
      // it are either exclusive to concurrent mode or exist in both.
      (disableLegacyMode || (current.mode & ConcurrentMode) !== NoMode)
    ) {
      console.error(
        'Internal React error: Expected static flag was missing. Please ' +
          'notify the React team.',
      );
    }
  }

  didScheduleRenderPhaseUpdate = false;
  // This is reset by checkDidRenderIdHook
  // localIdCounter = 0;

  thenableIndexCounter = 0;
  thenableState = null;

  if (didRenderTooFewHooks) {
    throw new Error(
      'Rendered fewer hooks than expected. This may be caused by an accidental ' +
        'early return statement.',
    );
  }

  if (current !== null) {
    if (!checkIfWorkInProgressReceivedUpdate()) {
      // If there were no changes to props or state, we need to check if there
      // was a context change. We didn't already do this because there's no
      // 1:1 correspondence between dependencies and hooks. Although, because
      // there almost always is in the common case (`readContext` is an
      // internal API), we could compare in there. OTOH, we only hit this case
      // if everything else bails out, so on the whole it might be better to
      // keep the comparison out of the common path.
      const currentDependencies = current.dependencies;
      if (
        currentDependencies !== null &&
        checkIfContextChanged(currentDependencies)
      ) {
        markWorkInProgressReceivedUpdate();
      }
    }
  }

  if (__DEV__) {
    if (checkIfUseWrappedInTryCatch()) {
      const componentName =
        getComponentNameFromFiber(workInProgress) || 'Unknown';
      if (
        !didWarnAboutUseWrappedInTryCatch.has(componentName) &&
        // This warning also fires if you suspend with `use` inside an
        // async component. Since we warn for that above, we'll silence this
        // second warning by checking here.
        !didWarnAboutAsyncClientComponent.has(componentName)
      ) {
        didWarnAboutUseWrappedInTryCatch.add(componentName);
        console.error(
          '`use` was called from inside a try/catch block. This is not allowed ' +
            'and can lead to unexpected behavior. To handle errors triggered ' +
            'by `use`, wrap your component in a error boundary.',
        );
      }
    }
  }
}

export function replaySuspendedComponentWithHooks<Props, SecondArg>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
): any {
  // This function is used to replay a component that previously suspended,
  // after its data resolves.
  //
  // It's a simplified version of renderWithHooks, but it doesn't need to do
  // most of the set up work because they weren't reset when we suspended; they
  // only get reset when the component either completes (finishRenderingHooks)
  // or unwinds (resetHooksOnUnwind).
  if (__DEV__) {
    hookTypesUpdateIndexDev = -1;
    // Used for hot reloading:
    ignorePreviousDependencies =
      current !== null && current.type !== workInProgress.type;
  }
  // renderWithHooks only resets the updateQueue but does not clear it, since
  // it needs to work for both this case (suspense replay) as well as for double
  // renders in dev and setState-in-render. However, for the suspense replay case
  // we need to reset the updateQueue to correctly handle unmount effects, so we
  // clear the queue here
  workInProgress.updateQueue = null;
  const children = renderWithHooksAgain(
    workInProgress,
    Component,
    props,
    secondArg,
  );
  finishRenderingHooks(current, workInProgress, Component);
  return children;
}

function renderWithHooksAgain<Props, SecondArg>(
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
): any {
  // This is used to perform another render pass. It's used when setState is
  // called during render, and for double invoking components in Strict Mode
  // during development.
  //
  // The state from the previous pass is reused whenever possible. So, state
  // updates that were already processed are not processed again, and memoized
  // functions (`useMemo`) are not invoked again.
  //
  // Keep rendering in a loop for as long as render phase updates continue to
  // be scheduled. Use a counter to prevent infinite loops.

  currentlyRenderingFiber = workInProgress;

  let numberOfReRenders: number = 0;
  let children;
  do {
    if (didScheduleRenderPhaseUpdateDuringThisPass) {
      // It's possible that a use() value depended on a state that was updated in
      // this rerender, so we need to watch for different thenables this time.
      thenableState = null;
    }
    thenableIndexCounter = 0;
    didScheduleRenderPhaseUpdateDuringThisPass = false;

    if (numberOfReRenders >= RE_RENDER_LIMIT) {
      throw new Error(
        'Too many re-renders. React limits the number of renders to prevent ' +
          'an infinite loop.',
      );
    }

    numberOfReRenders += 1;
    if (__DEV__) {
      // Even when hot reloading, allow dependencies to stabilize
      // after first render to prevent infinite render phase updates.
      ignorePreviousDependencies = false;
    }

    // Start over from the beginning of the list
    currentHook = null;
    workInProgressHook = null;

    if (workInProgress.updateQueue != null) {
      resetFunctionComponentUpdateQueue((workInProgress.updateQueue: any));
    }

    if (__DEV__) {
      // Also validate hook order for cascading updates.
      hookTypesUpdateIndexDev = -1;
    }

    ReactSharedInternals.H = __DEV__
      ? HooksDispatcherOnRerenderInDEV
      : HooksDispatcherOnRerender;

    children = __DEV__
      ? callComponentInDEV(Component, props, secondArg)
      : Component(props, secondArg);
  } while (didScheduleRenderPhaseUpdateDuringThisPass);
  return children;
}

export function renderTransitionAwareHostComponentWithHooks(
  current: Fiber | null,
  workInProgress: Fiber,
  lanes: Lanes,
): TransitionStatus {
  return renderWithHooks(
    current,
    workInProgress,
    TransitionAwareHostComponent,
    null,
    null,
    lanes,
  );
}

export function TransitionAwareHostComponent(): TransitionStatus {
  const dispatcher: any = ReactSharedInternals.H;
  const [maybeThenable] = dispatcher.useState();
  let nextState;
  if (typeof maybeThenable.then === 'function') {
    const thenable: Thenable<TransitionStatus> = (maybeThenable: any);
    nextState = useThenable(thenable);
  } else {
    const status: TransitionStatus = maybeThenable;
    nextState = status;
  }

  // The "reset state" is an object. If it changes, that means something
  // requested that we reset the form.
  const [nextResetState] = dispatcher.useState();
  const prevResetState =
    currentHook !== null ? currentHook.memoizedState : null;
  if (prevResetState !== nextResetState) {
    // Schedule a form reset
    currentlyRenderingFiber.flags |= FormReset;
  }

  return nextState;
}

export function checkDidRenderIdHook(): boolean {
  // This should be called immediately after every renderWithHooks call.
  // Conceptually, it's part of the return value of renderWithHooks; it's only a
  // separate function to avoid using an array tuple.
  const didRenderIdHook = localIdCounter !== 0;
  localIdCounter = 0;
  return didRenderIdHook;
}

export function bailoutHooks(
  current: Fiber,
  workInProgress: Fiber,
  lanes: Lanes,
): void {
  workInProgress.updateQueue = current.updateQueue;
  // TODO: Don't need to reset the flags here, because they're reset in the
  // complete phase (bubbleProperties).
  if (__DEV__ && (workInProgress.mode & StrictEffectsMode) !== NoMode) {
    workInProgress.flags &= ~(
      MountPassiveDevEffect |
      MountLayoutDevEffect |
      PassiveEffect |
      UpdateEffect
    );
  } else {
    workInProgress.flags &= ~(PassiveEffect | UpdateEffect);
  }
  current.lanes = removeLanes(current.lanes, lanes);
}

export function resetHooksAfterThrow(): void {
  // This is called immediaetly after a throw. It shouldn't reset the entire
  // module state, because the work loop might decide to replay the component
  // again without rewinding.
  //
  // It should only reset things like the current dispatcher, to prevent hooks
  // from being called outside of a component.
  currentlyRenderingFiber = (null: any);

  // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrance.
  ReactSharedInternals.H = ContextOnlyDispatcher;
}

export function resetHooksOnUnwind(workInProgress: Fiber): void {
  if (didScheduleRenderPhaseUpdate) {
    // There were render phase updates. These are only valid for this render
    // phase, which we are now aborting. Remove the updates from the queues so
    // they do not persist to the next render. Do not remove updates from hooks
    // that weren't processed.
    //
    // Only reset the updates from the queue if it has a clone. If it does
    // not have a clone, that means it wasn't processed, and the updates were
    // scheduled before we entered the render phase.
    let hook: Hook | null = workInProgress.memoizedState;
    while (hook !== null) {
      const queue = hook.queue;
      if (queue !== null) {
        queue.pending = null;
      }
      hook = hook.next;
    }
    didScheduleRenderPhaseUpdate = false;
  }

  renderLanes = NoLanes;
  currentlyRenderingFiber = (null: any);

  currentHook = null;
  workInProgressHook = null;

  if (__DEV__) {
    hookTypesDev = null;
    hookTypesUpdateIndexDev = -1;

    currentHookNameInDev = null;
  }

  didScheduleRenderPhaseUpdateDuringThisPass = false;
  localIdCounter = 0;
  thenableIndexCounter = 0;
  thenableState = null;
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,

    baseState: null,
    baseQueue: null,
    queue: null,

    next: null,
  };

  if (workInProgressHook === null) {
    // This is the first hook in the list
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the list
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

function updateWorkInProgressHook(): Hook {
  // This function is used both for updates and for re-renders triggered by a
  // render phase update. It assumes there is either a current hook we can
  // clone, or a work-in-progress hook from a previous render pass that we can
  // use as a base.
  let nextCurrentHook: null | Hook;
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  let nextWorkInProgressHook: null | Hook;
  if (workInProgressHook === null) {
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) {
    // There's already a work-in-progress. Reuse it.
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
  } else {
    // Clone from the current hook.

    if (nextCurrentHook === null) {
      const currentFiber = currentlyRenderingFiber.alternate;
      if (currentFiber === null) {
        // This is the initial render. This branch is reached when the component
        // suspends, resumes, then renders an additional hook.
        // Should never be reached because we should switch to the mount dispatcher first.
        throw new Error(
          'Update hook called on initial render. This is likely a bug in React. Please file an issue.',
        );
      } else {
        // This is an update. We should always have a current hook.
        throw new Error('Rendered more hooks than during the previous render.');
      }
    }

    currentHook = nextCurrentHook;

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,

      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,

      next: null,
    };

    if (workInProgressHook === null) {
      // This is the first hook in the list.
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      // Append to the end of the list.
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook;
}

function createFunctionComponentUpdateQueue(): FunctionComponentUpdateQueue {
  return {
    lastEffect: null,
    events: null,
    stores: null,
    memoCache: null,
  };
}

function resetFunctionComponentUpdateQueue(
  updateQueue: FunctionComponentUpdateQueue,
): void {
  updateQueue.lastEffect = null;
  updateQueue.events = null;
  updateQueue.stores = null;
  if (updateQueue.memoCache != null) {
    // NOTE: this function intentionally does not reset memoCache data. We reuse updateQueue for the memo
    // cache to avoid increasing the size of fibers that don't need a cache, but we don't want to reset
    // the cache when other properties are reset.
    updateQueue.memoCache.index = 0;
  }
}

function useThenable<T>(thenable: Thenable<T>): T {
  // Track the position of the thenable within this fiber.
  const index = thenableIndexCounter;
  thenableIndexCounter += 1;
  if (thenableState === null) {
    thenableState = createThenableState();
  }
  const result = trackUsedThenable(thenableState, thenable, index);

  // When something suspends with `use`, we replay the component with the
  // "re-render" dispatcher instead of the "mount" or "update" dispatcher.
  //
  // But if there are additional hooks that occur after the `use` invocation
  // that suspended, they wouldn't have been processed during the previous
  // attempt. So after we invoke `use` again, we may need to switch from the
  // "re-render" dispatcher back to the "mount" or "update" dispatcher. That's
  // what the following logic accounts for.
  //
  // TODO: Theoretically this logic only needs to go into the rerender
  // dispatcher. Could optimize, but probably not be worth it.

  // This is the same logic as in updateWorkInProgressHook.
  const workInProgressFiber = currentlyRenderingFiber;
  const nextWorkInProgressHook =
    workInProgressHook === null
      ? // We're at the beginning of the list, so read from the first hook from
        // the fiber.
        workInProgressFiber.memoizedState
      : workInProgressHook.next;

  if (nextWorkInProgressHook !== null) {
    // There are still hooks remaining from the previous attempt.
  } else {
    // There are no remaining hooks from the previous attempt. We're no longer
    // in "re-render" mode. Switch to the normal mount or update dispatcher.
    //
    // This is the same as the logic in renderWithHooks, except we don't bother
    // to track the hook types debug information in this case (sufficient to
    // only do that when nothing suspends).
    const currentFiber = workInProgressFiber.alternate;
    if (__DEV__) {
      if (currentFiber !== null && currentFiber.memoizedState !== null) {
        ReactSharedInternals.H = HooksDispatcherOnUpdateInDEV;
      } else {
        ReactSharedInternals.H = HooksDispatcherOnMountInDEV;
      }
    } else {
      ReactSharedInternals.H =
        currentFiber === null || currentFiber.memoizedState === null
          ? HooksDispatcherOnMount
          : HooksDispatcherOnUpdate;
    }
  }
  return result;
}

function use<T>(usable: Usable<T>): T {
  if (usable !== null && typeof usable === 'object') {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      // This is a thenable.
      const thenable: Thenable<T> = (usable: any);
      return useThenable(thenable);
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      const context: ReactContext<T> = (usable: any);
      return readContext(context);
    }
  }

  // eslint-disable-next-line react-internal/safe-string-coercion
  throw new Error('An unsupported type was passed to use(): ' + String(usable));
}

function useMemoCache(size: number): Array<mixed> {
  let memoCache = null;
  // Fast-path, load memo cache from wip fiber if already prepared
  let updateQueue: FunctionComponentUpdateQueue | null =
    (currentlyRenderingFiber.updateQueue: any);
  if (updateQueue !== null) {
    memoCache = updateQueue.memoCache;
  }
  // Otherwise clone from the current fiber
  if (memoCache == null) {
    const current: Fiber | null = currentlyRenderingFiber.alternate;
    if (current !== null) {
      const currentUpdateQueue: FunctionComponentUpdateQueue | null =
        (current.updateQueue: any);
      if (currentUpdateQueue !== null) {
        const currentMemoCache: ?MemoCache = currentUpdateQueue.memoCache;
        if (currentMemoCache != null) {
          memoCache = {
            // When enableNoCloningMemoCache is enabled, instead of treating the
            // cache as copy-on-write, like we do with fibers, we share the same
            // cache instance across all render attempts, even if the component
            // is interrupted before it commits.
            //
            // If an update is interrupted, either because it suspended or
            // because of another update, we can reuse the memoized computations
            // from the previous attempt. We can do this because the React
            // Compiler performs atomic writes to the memo cache, i.e. it will
            // not record the inputs to a memoization without also recording its
            // output.
            //
            // This gives us a form of "resuming" within components and hooks.
            //
            // This only works when updating a component that already mounted.
            // It has no impact during initial render, because the memo cache is
            // stored on the fiber, and since we have not implemented resuming
            // for fibers, it's always a fresh memo cache, anyway.
            //
            // However, this alone is pretty useful — it happens whenever you
            // update the UI with fresh data after a mutation/action, which is
            // extremely common in a Suspense-driven (e.g. RSC or Relay) app.
            data: enableNoCloningMemoCache
              ? currentMemoCache.data
              : // Clone the memo cache before each render (copy-on-write)
                currentMemoCache.data.map(array => array.slice()),
            index: 0 as number,
          };
        }
      }
    }
  }
  // Finally fall back to allocating a fresh instance of the cache
  if (memoCache == null) {
    memoCache = {
      data: [],
      index: 0 as number,
    };
  }
  if (updateQueue === null) {
    updateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = updateQueue;
  }
  updateQueue.memoCache = memoCache;

  let data = memoCache.data[memoCache.index];
  if (data === undefined || (__DEV__ && ignorePreviousDependencies)) {
    data = memoCache.data[memoCache.index] = new Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    }
  } else if (data.length !== size) {
    // TODO: consider warning or throwing here
    if (__DEV__) {
      console.error(
        'Expected a constant size argument for each invocation of useMemoCache. ' +
          'The previous cache was allocated with size %s but size %s was requested.',
        data.length,
        size,
      );
    }
  }
  memoCache.index++;
  return data;
}

function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
  return typeof action === 'function' ? action(state) : action;
}

function mountReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const hook = mountWorkInProgressHook();
  let initialState;
  if (init !== undefined) {
    initialState = init(initialArg);
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(true);
      try {
        init(initialArg);
      } finally {
        setIsStrictModeForDevtools(false);
      }
    }
  } else {
    initialState = ((initialArg: any): S);
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue: UpdateQueue<S, A> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: (initialState: any),
  };
  hook.queue = queue;
  const dispatch: Dispatch<A> = (queue.dispatch = (dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any));
  return [hook.memoizedState, dispatch];
}

function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook();
  return updateReducerImpl(hook, ((currentHook: any): Hook), reducer);
}

function updateReducerImpl<S, A>(
  hook: Hook,
  current: Hook,
  reducer: (S, A) => S,
): [S, Dispatch<A>] {
  const queue = hook.queue;

  if (queue === null) {
    throw new Error(
      'Should have a queue. You are likely calling Hooks conditionally, ' +
        'which is not allowed. (https://react.dev/link/invalid-hook-call)',
    );
  }

  queue.lastRenderedReducer = reducer;

  // The last rebase update that is NOT part of the base state.
  let baseQueue = hook.baseQueue;

  // The last pending update that hasn't been processed yet.
  const pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    // We have new updates that haven't been processed yet.
    // We'll add them to the base queue.
    if (baseQueue !== null) {
      // Merge the pending queue and the base queue.
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    if (__DEV__) {
      if (current.baseQueue !== baseQueue) {
        // Internal invariant that should never happen, but feasibly could in
        // the future if we implement resuming, or some form of that.
        console.error(
          'Internal error: Expected work-in-progress queue to be a clone. ' +
            'This is a bug in React.',
        );
      }
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }

  const baseState = hook.baseState;
  if (baseQueue === null) {
    // If there are no pending updates, then the memoized state should be the
    // same as the base state. Currently these only diverge in the case of
    // useOptimistic, because useOptimistic accepts a new baseState on
    // every render.
    hook.memoizedState = baseState;
    // We don't need to call markWorkInProgressReceivedUpdate because
    // baseState is derived from other reactive values.
  } else {
    // We have a queue to process.
    const first = baseQueue.next;
    let newState = baseState;

    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast: Update<S, A> | null = null;
    let update = first;
    let didReadFromEntangledAsyncAction = false;
    do {
      // An extra OffscreenLane bit is added to updates that were made to
      // a hidden tree, so that we can distinguish them from updates that were
      // already there when the tree was hidden.
      const updateLane = removeLanes(update.lane, OffscreenLane);
      const isHiddenUpdate = updateLane !== update.lane;

      // Check if this update was made while the tree was hidden. If so, then
      // it's not a "base" update and we should disregard the extra base lanes
      // that were added to renderLanes when we entered the Offscreen tree.
      let shouldSkipUpdate = isHiddenUpdate
        ? !isSubsetOfLanes(getWorkInProgressRootRenderLanes(), updateLane)
        : !isSubsetOfLanes(renderLanes, updateLane);

      if (enableGestureTransition && updateLane === GestureLane) {
        // This is a gesture optimistic update. It should only be considered as part of the
        // rendered state while rendering the gesture lane and if the rendering the associated
        // ScheduledGesture.
        const scheduledGesture = update.gesture;
        if (scheduledGesture !== null) {
          if (scheduledGesture.count === 0 && !scheduledGesture.committing) {
            // This gesture has already been cancelled. We can clean up this update.
            update = update.next;
            continue;
          } else if (!isGestureRender(renderLanes)) {
            shouldSkipUpdate = true;
          } else {
            const root: FiberRoot | null = getWorkInProgressRoot();
            if (root === null) {
              throw new Error(
                'Expected a work-in-progress root. This is a bug in React. Please file an issue.',
              );
            }
            // We assume that the currently rendering gesture is the one first in the queue.
            shouldSkipUpdate = root.pendingGestures !== scheduledGesture;
          }
        }
      }

      if (shouldSkipUpdate) {
        // Priority is insufficient. Skip this update. If this is the first
        // skipped update, the previous update/state is the new base
        // update/state.
        const clone: Update<S, A> = {
          lane: updateLane,
          revertLane: update.revertLane,
          gesture: update.gesture,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: (null: any),
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        // Update the remaining priority in the queue.
        // TODO: Don't need to accumulate this. Instead, we can remove
        // renderLanes from the original lanes.
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane,
        );
        markSkippedUpdateLanes(updateLane);
      } else {
        // This update does have sufficient priority.

        // Check if this is an optimistic update.
        const revertLane = update.revertLane;
        if (revertLane === NoLane) {
          // This is not an optimistic update, and we're going to apply it now.
          // But, if there were earlier updates that were skipped, we need to
          // leave this update in the queue so it can be rebased later.
          if (newBaseQueueLast !== null) {
            const clone: Update<S, A> = {
              // This update is going to be committed so we never want uncommit
              // it. Using NoLane works because 0 is a subset of all bitmasks, so
              // this will never be skipped by the check above.
              lane: NoLane,
              revertLane: NoLane,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: (null: any),
            };
            newBaseQueueLast = newBaseQueueLast.next = clone;
          }

          // Check if this update is part of a pending async action. If so,
          // we'll need to suspend until the action has finished, so that it's
          // batched together with future updates in the same action.
          if (updateLane === peekEntangledActionLane()) {
            didReadFromEntangledAsyncAction = true;
          }
        } else {
          // This is an optimistic update. If the "revert" priority is
          // sufficient, don't apply the update. Otherwise, apply the update,
          // but leave it in the queue so it can be either reverted or
          // rebased in a subsequent render.
          if (isSubsetOfLanes(renderLanes, revertLane)) {
            // The transition that this optimistic update is associated with
            // has finished. Pretend the update doesn't exist by skipping
            // over it.
            update = update.next;

            // Check if this update is part of a pending async action. If so,
            // we'll need to suspend until the action has finished, so that it's
            // batched together with future updates in the same action.
            if (revertLane === peekEntangledActionLane()) {
              didReadFromEntangledAsyncAction = true;
            }
            continue;
          } else {
            const clone: Update<S, A> = {
              // Once we commit an optimistic update, we shouldn't uncommit it
              // until the transition it is associated with has finished
              // (represented by revertLane). Using NoLane here works because 0
              // is a subset of all bitmasks, so this will never be skipped by
              // the check above.
              lane: NoLane,
              // Reuse the same revertLane so we know when the transition
              // has finished.
              revertLane: update.revertLane,
              gesture: null, // If it commits, it's no longer a gesture update.
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: (null: any),
            };
            if (newBaseQueueLast === null) {
              newBaseQueueFirst = newBaseQueueLast = clone;
              newBaseState = newState;
            } else {
              newBaseQueueLast = newBaseQueueLast.next = clone;
            }
            // Update the remaining priority in the queue.
            // TODO: Don't need to accumulate this. Instead, we can remove
            // renderLanes from the original lanes.
            currentlyRenderingFiber.lanes = mergeLanes(
              currentlyRenderingFiber.lanes,
              revertLane,
            );
            markSkippedUpdateLanes(revertLane);
          }
        }

        // Process this update.
        const action = update.action;
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          reducer(newState, action);
        }
        if (update.hasEagerState) {
          // If this update is a state update (not a reducer) and was processed eagerly,
          // we can use the eagerly computed state
          newState = ((update.eagerState: any): S);
        } else {
          newState = reducer(newState, action);
        }
      }
      update = update.next;
    } while (update !== null && update !== first);

    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = (newBaseQueueFirst: any);
    }

    // Mark that the fiber performed work, but only if the new state is
    // different from the current state.
    if (!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();

      // Check if this update is part of a pending async action. If so, we'll
      // need to suspend until the action has finished, so that it's batched
      // together with future updates in the same action.
      // TODO: Once we support hooks inside useMemo (or an equivalent
      // memoization boundary like Forget), hoist this logic so that it only
      // suspends if the memo boundary produces a new value.
      if (didReadFromEntangledAsyncAction) {
        const entangledActionThenable = peekEntangledActionThenable();
        if (entangledActionThenable !== null) {
          // TODO: Instead of the throwing the thenable directly, throw a
          // special object like `use` does so we can detect if it's captured
          // by userspace.
          throw entangledActionThenable;
        }
      }
    }

    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;

    queue.lastRenderedState = newState;
  }

  if (baseQueue === null) {
    // `queue.lanes` is used for entangling transitions. We can set it back to
    // zero once the queue is empty.
    queue.lanes = NoLanes;
  }

  const dispatch: Dispatch<A> = (queue.dispatch: any);
  return [hook.memoizedState, dispatch];
}

function rerenderReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;

  if (queue === null) {
    throw new Error(
      'Should have a queue. You are likely calling Hooks conditionally, ' +
        'which is not allowed. (https://react.dev/link/invalid-hook-call)',
    );
  }

  queue.lastRenderedReducer = reducer;

  // This is a re-render. Apply the new render phase updates to the previous
  // work-in-progress hook.
  const dispatch: Dispatch<A> = (queue.dispatch: any);
  const lastRenderPhaseUpdate = queue.pending;
  let newState = hook.memoizedState;
  if (lastRenderPhaseUpdate !== null) {
    // The queue doesn't persist past this render pass.
    queue.pending = null;

    const firstRenderPhaseUpdate = lastRenderPhaseUpdate.next;
    let update = firstRenderPhaseUpdate;
    do {
      // Process this render phase update. We don't have to check the
      // priority because it will always be the same as the current
      // render's.
      const action = update.action;
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== firstRenderPhaseUpdate);

    // Mark that the fiber performed work, but only if the new state is
    // different from the current state.
    if (!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = newState;
    // Don't persist the state accumulated from the render phase updates to
    // the base state unless the queue is empty.
    // TODO: Not sure if this is the desired semantics, but it's what we
    // do for gDSFP. I can't remember why.
    if (hook.baseQueue === null) {
      hook.baseState = newState;
    }

    queue.lastRenderedState = newState;
  }
  return [newState, dispatch];
}

function mountSyncExternalStore<T>(
  subscribe: (() => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  const fiber = currentlyRenderingFiber;
  const hook = mountWorkInProgressHook();

  let nextSnapshot;
  const isHydrating = getIsHydrating();
  if (isHydrating) {
    if (getServerSnapshot === undefined) {
      throw new Error(
        'Missing getServerSnapshot, which is required for ' +
          'server-rendered content. Will revert to client rendering.',
      );
    }
    nextSnapshot = getServerSnapshot();
    if (__DEV__) {
      if (!didWarnUncachedGetSnapshot) {
        if (nextSnapshot !== getServerSnapshot()) {
          console.error(
            'The result of getServerSnapshot should be cached to avoid an infinite loop',
          );
          didWarnUncachedGetSnapshot = true;
        }
      }
    }
  } else {
    nextSnapshot = getSnapshot();
    if (__DEV__) {
      if (!didWarnUncachedGetSnapshot) {
        const cachedSnapshot = getSnapshot();
        if (!is(nextSnapshot, cachedSnapshot)) {
          console.error(
            'The result of getSnapshot should be cached to avoid an infinite loop',
          );
          didWarnUncachedGetSnapshot = true;
        }
      }
    }
    // Unless we're rendering a blocking lane, schedule a consistency check.
    // Right before committing, we will walk the tree and check if any of the
    // stores were mutated.
    //
    // We won't do this if we're hydrating server-rendered content, because if
    // the content is stale, it's already visible anyway. Instead we'll patch
    // it up in a passive effect.
    const root: FiberRoot | null = getWorkInProgressRoot();

    if (root === null) {
      throw new Error(
        'Expected a work-in-progress root. This is a bug in React. Please file an issue.',
      );
    }

    const rootRenderLanes = getWorkInProgressRootRenderLanes();
    if (!includesBlockingLane(rootRenderLanes)) {
      pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
    }
  }

  // Read the current snapshot from the store on every render. This breaks the
  // normal rules of React, and only works because store updates are
  // always synchronous.
  hook.memoizedState = nextSnapshot;
  const inst: StoreInstance<T> = {
    value: nextSnapshot,
    getSnapshot,
  };
  hook.queue = inst;

  // Schedule an effect to subscribe to the store.
  mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]);

  // Schedule an effect to update the mutable instance fields. We will update
  // this whenever subscribe, getSnapshot, or value changes. Because there's no
  // clean-up function, and we track the deps correctly, we can call pushEffect
  // directly, without storing any additional state. For the same reason, we
  // don't need to set a static flag, either.
  fiber.flags |= PassiveEffect;
  pushSimpleEffect(
    HookHasEffect | HookPassive,
    createEffectInstance(),
    updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
    null,
  );

  return nextSnapshot;
}

function updateSyncExternalStore<T>(
  subscribe: (() => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  const fiber = currentlyRenderingFiber;
  const hook = updateWorkInProgressHook();
  // Read the current snapshot from the store on every render. This breaks the
  // normal rules of React, and only works because store updates are
  // always synchronous.
  let nextSnapshot;
  const isHydrating = getIsHydrating();
  if (isHydrating) {
    // Needed for strict mode double render
    if (getServerSnapshot === undefined) {
      throw new Error(
        'Missing getServerSnapshot, which is required for ' +
          'server-rendered content. Will revert to client rendering.',
      );
    }
    nextSnapshot = getServerSnapshot();
  } else {
    nextSnapshot = getSnapshot();
    if (__DEV__) {
      if (!didWarnUncachedGetSnapshot) {
        const cachedSnapshot = getSnapshot();
        if (!is(nextSnapshot, cachedSnapshot)) {
          console.error(
            'The result of getSnapshot should be cached to avoid an infinite loop',
          );
          didWarnUncachedGetSnapshot = true;
        }
      }
    }
  }
  const prevSnapshot = (currentHook || hook).memoizedState;
  const snapshotChanged = !is(prevSnapshot, nextSnapshot);
  if (snapshotChanged) {
    hook.memoizedState = nextSnapshot;
    markWorkInProgressReceivedUpdate();
  }
  const inst = hook.queue;

  updateEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
    subscribe,
  ]);

  // Whenever getSnapshot or subscribe changes, we need to check in the
  // commit phase if there was an interleaved mutation. In concurrent mode
  // this can happen all the time, but even in synchronous mode, an earlier
  // effect may have mutated the store.
  if (
    inst.getSnapshot !== getSnapshot ||
    snapshotChanged ||
    // Check if the subscribe function changed. We can save some memory by
    // checking whether we scheduled a subscription effect above.
    (workInProgressHook !== null &&
      workInProgressHook.memoizedState.tag & HookHasEffect)
  ) {
    fiber.flags |= PassiveEffect;
    pushSimpleEffect(
      HookHasEffect | HookPassive,
      createEffectInstance(),
      updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
      null,
    );

    // Unless we're rendering a blocking lane, schedule a consistency check.
    // Right before committing, we will walk the tree and check if any of the
    // stores were mutated.
    const root: FiberRoot | null = getWorkInProgressRoot();

    if (root === null) {
      throw new Error(
        'Expected a work-in-progress root. This is a bug in React. Please file an issue.',
      );
    }

    if (!isHydrating && !includesBlockingLane(renderLanes)) {
      pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
    }
  }

  return nextSnapshot;
}

function pushStoreConsistencyCheck<T>(
  fiber: Fiber,
  getSnapshot: () => T,
  renderedSnapshot: T,
): void {
  fiber.flags |= StoreConsistency;
  const check: StoreConsistencyCheck<T> = {
    getSnapshot,
    value: renderedSnapshot,
  };
  let componentUpdateQueue: null | FunctionComponentUpdateQueue =
    (currentlyRenderingFiber.updateQueue: any);
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
    componentUpdateQueue.stores = [check];
  } else {
    const stores = componentUpdateQueue.stores;
    if (stores === null) {
      componentUpdateQueue.stores = [check];
    } else {
      stores.push(check);
    }
  }
}

function updateStoreInstance<T>(
  fiber: Fiber,
  inst: StoreInstance<T>,
  nextSnapshot: T,
  getSnapshot: () => T,
): void {
  // These are updated in the passive phase
  inst.value = nextSnapshot;
  inst.getSnapshot = getSnapshot;

  // Something may have been mutated in between render and commit. This could
  // have been in an event that fired before the passive effects, or it could
  // have been in a layout effect. In that case, we would have used the old
  // snapsho and getSnapshot values to bail out. We need to check one more time.
  if (checkIfSnapshotChanged(inst)) {
    // Force a re-render.
    // We intentionally don't log update times and stacks here because this
    // was not an external trigger but rather an internal one.
    forceStoreRerender(fiber);
  }
}

function subscribeToStore<T>(
  fiber: Fiber,
  inst: StoreInstance<T>,
  subscribe: (() => void) => () => void,
): any {
  // Track whether this subscription has been torn down to prevent
  // stale closure issues where handleStoreChange fires after the
  // component has unmounted but before the unsubscribe cleanup runs.
  let isSubscribed = true;
  const handleStoreChange = () => {
    if (!isSubscribed) {
      return;
    }
    // The store changed. Check if the snapshot changed since the last time we
    // read from the store.
    if (checkIfSnapshotChanged(inst)) {
      // Force a re-render.
      startUpdateTimerByLane(SyncLane, 'updateSyncExternalStore()', fiber);
      forceStoreRerender(fiber);
    }
  };
  // Subscribe to the store and return a clean-up function.
  const unsubscribe = subscribe(handleStoreChange);
  return () => {
    isSubscribed = false;
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
}

function checkIfSnapshotChanged<T>(inst: StoreInstance<T>): boolean {
  const latestGetSnapshot = inst.getSnapshot;
  const prevValue = inst.value;
  try {
    const nextValue = latestGetSnapshot();
    return !is(prevValue, nextValue);
  } catch (error) {
    return true;
  }
}

function forceStoreRerender(fiber: Fiber) {
  const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, fiber, SyncLane);
  }
}

function mountStateImpl<S>(initialState: (() => S) | S): Hook {
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    const initialStateInitializer = initialState;
    // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
    initialState = initialStateInitializer();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(true);
      try {
        // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
        initialStateInitializer();
      } finally {
        setIsStrictModeForDevtools(false);
      }
    }
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue: UpdateQueue<S, BasicStateAction<S>> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: (initialState: any),
  };
  hook.queue = queue;
  return hook;
}

function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  const hook = mountStateImpl(initialState);
  const queue = hook.queue;
  const dispatch: Dispatch<BasicStateAction<S>> = (dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ): any);
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}

function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, initialState);
}

function rerenderState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return rerenderReducer(basicStateReducer, initialState);
}

function mountOptimistic<S, A>(
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = passthrough;
  const queue: UpdateQueue<S, A> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    // Optimistic state does not use the eager update optimization.
    lastRenderedReducer: null,
    lastRenderedState: null,
  };
  hook.queue = queue;
  // This is different than the normal setState function.
  const dispatch: A => void = (dispatchOptimisticSetState.bind(
    null,
    currentlyRenderingFiber,
    true,
    queue,
  ): any);
  queue.dispatch = dispatch;
  return [passthrough, dispatch];
}

function updateOptimistic<S, A>(
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  const hook = updateWorkInProgressHook();
  return updateOptimisticImpl(
    hook,
    ((currentHook: any): Hook),
    passthrough,
    reducer,
  );
}

function updateOptimisticImpl<S, A>(
  hook: Hook,
  current: Hook | null,
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  // Optimistic updates are always rebased on top of the latest value passed in
  // as an argument. It's called a passthrough because if there are no pending
  // updates, it will be returned as-is.
  //
  // Reset the base state to the passthrough. Future updates will be applied
  // on top of this.
  hook.baseState = passthrough;

  // If a reducer is not provided, default to the same one used by useState.
  const resolvedReducer: (S, A) => S =
    typeof reducer === 'function' ? reducer : (basicStateReducer: any);

  return updateReducerImpl(hook, ((currentHook: any): Hook), resolvedReducer);
}

function rerenderOptimistic<S, A>(
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  // Unlike useState, useOptimistic doesn't support render phase updates.
  // Also unlike useState, we need to replay all pending updates again in case
  // the passthrough value changed.
  //
  // So instead of a forked re-render implementation that knows how to handle
  // render phase udpates, we can use the same implementation as during a
  // regular mount or update.
  const hook = updateWorkInProgressHook();

  if (currentHook !== null) {
    // This is an update. Process the update queue.
    return updateOptimisticImpl(
      hook,
      ((currentHook: any): Hook),
      passthrough,
      reducer,
    );
  }

  // This is a mount. No updates to process.

  // Reset the base state to the passthrough. Future updates will be applied
  // on top of this.
  hook.baseState = passthrough;
  const dispatch = hook.queue.dispatch;
  return [passthrough, dispatch];
}

// useActionState actions run sequentially, because each action receives the
// previous state as an argument. We store pending actions on a queue.
type ActionStateQueue<S, P> = {
  // This is the most recent state returned from an action. It's updated as
  // soon as the action finishes running.
  state: Awaited<S>,
  // A stable dispatch method, passed to the user.
  dispatch: Dispatch<P>,
  // This is the most recent action function that was rendered. It's updated
  // during the commit phase.
  // If it's null, it means the action queue errored and subsequent actions
  // should not run.
  action: ((Awaited<S>, P) => S) | null,
  // This is a circular linked list of pending action payloads. It incudes the
  // action that is currently running.
  pending: ActionStateQueueNode<S, P> | null,
};

type ActionStateQueueNode<S, P> = {
  payload: P,
  // This is the action implementation at the time it was dispatched.
  action: (Awaited<S>, P) => S,
  // This is never null because it's part of a circular linked list.
  next: ActionStateQueueNode<S, P>,

  // Whether or not the action was dispatched as part of a transition. We use
  // this to restore the transition context when the queued action is run. Once
  // we're able to track parallel async actions, this should be updated to
  // represent the specific transition instance the action is associated with.
  isTransition: boolean,

  // Implements the Thenable interface. We use it to suspend until the action
  // finishes.
  then: (listener: () => void) => void,
  status: 'pending' | 'rejected' | 'fulfilled',
  value: any,
  reason: any,
  listeners: Array<() => void>,
};

function dispatchActionState<S, P>(
  fiber: Fiber,
  actionQueue: ActionStateQueue<S, P>,
  setPendingState: boolean => void,
  setState: Dispatch<ActionStateQueueNode<S, P>>,
  payload: P,
): void {
  if (isRenderPhaseUpdate(fiber)) {
    throw new Error('Cannot update action state while rendering.');
  }

  const currentAction = actionQueue.action;
  if (currentAction === null) {
    // An earlier action errored. Subsequent actions should not run.
    return;
  }

  const actionNode: ActionStateQueueNode<S, P> = {
    payload,
    action: currentAction,
    next: (null: any), // circular

    isTransition: true,

    status: 'pending',
    value: null,
    reason: null,
    listeners: [],
    then(listener) {
      // We know the only thing that subscribes to these promises is `use` so
      // this implementation is simpler than a generic thenable. E.g. we don't
      // bother to check if the thenable is still pending because `use` already
      // does that.
      actionNode.listeners.push(listener);
    },
  };

  // Check if we're inside a transition. If so, we'll need to restore the
  // transition context when the action is run.
  const prevTransition = ReactSharedInternals.T;
  if (prevTransition !== null) {
    // Optimistically update the pending state, similar to useTransition.
    // This will be reverted automatically when all actions are finished.
    setPendingState(true);
    // `actionNode` is a thenable that resolves to the return value of
    // the action.
    setState(actionNode);
  } else {
    // This is not a transition.
    actionNode.isTransition = false;
    setState(actionNode);
  }

  const last = actionQueue.pending;
  if (last === null) {
    // There are no pending actions; this is the first one. We can run
    // it immediately.
    actionNode.next = actionQueue.pending = actionNode;
    runActionStateAction(actionQueue, actionNode);
  } else {
    // There's already an action running. Add to the queue.
    const first = last.next;
    actionNode.next = first;
    actionQueue.pending = last.next = actionNode;
  }
}

function runActionStateAction<S, P>(
  actionQueue: ActionStateQueue<S, P>,
  node: ActionStateQueueNode<S, P>,
) {
  // `node.action` represents the action function at the time it was dispatched.
  // If this action was queued, it might be stale, i.e. it's not necessarily the
  // most current implementation of the action, stored on `actionQueue`. This is
  // intentional. The conceptual model for queued actions is that they are
  // queued in a remote worker; the dispatch happens immediately, only the
  // execution is delayed.
  const action = node.action;
  const payload = node.payload;
  const prevState = actionQueue.state;

  if (node.isTransition) {
    // The original dispatch was part of a transition. We restore its
    // transition context here.

    // This is a fork of startTransition
    const prevTransition = ReactSharedInternals.T;
    const currentTransition: Transition = ({}: any);
    if (enableViewTransition) {
      currentTransition.types =
        prevTransition !== null
          ? // If we're a nested transition, we should use the same set as the parent
            // since we're conceptually always joined into the same entangled transition.
            // In practice, this only matters if we add transition types in the inner
            // without setting state. In that case, the inner transition can finish
            // without waiting for the outer.
            prevTransition.types
          : null;
    }
    if (enableGestureTransition) {
      currentTransition.gesture = null;
    }
    if (enableTransitionTracing) {
      currentTransition.name = null;
      currentTransition.startTime = -1;
    }
    if (__DEV__) {
      currentTransition._updatedFibers = new Set();
    }
    ReactSharedInternals.T = currentTransition;
    try {
      const returnValue = action(prevState, payload);
      const onStartTransitionFinish = ReactSharedInternals.S;
      if (onStartTransitionFinish !== null) {
        onStartTransitionFinish(currentTransition, returnValue);
      }
      handleActionReturnValue(actionQueue, node, returnValue);
    } catch (error) {
      onActionError(actionQueue, node, error);
    } finally {
      if (prevTransition !== null && currentTransition.types !== null) {
        // If we created a new types set in the inner transition, we transfer it to the parent
        // since they should share the same set. They're conceptually entangled.
        if (__DEV__) {
          if (
            prevTransition.types !== null &&
            prevTransition.types !== currentTransition.types
          ) {
            // Just assert that assumption holds that we're not overriding anything.
            console.error(
              'We expected inner Transitions to have transferred the outer types set and ' +
                'that you cannot add to the outer Transition while inside the inner.' +
                'This is a bug in React.',
            );
          }
        }
        prevTransition.types = currentTransition.types;
      }
      ReactSharedInternals.T = prevTransition;

      if (__DEV__) {
        if (prevTransition === null && currentTransition._updatedFibers) {
          const updatedFibersCount = currentTransition._updatedFibers.size;
          currentTransition._updatedFibers.clear();
          if (updatedFibersCount > 10) {
            console.warn(
              'Detected a large number of updates inside startTransition. ' +
                'If this is due to a subscription please re-write it to use React provided hooks. ' +
                'Otherwise concurrent mode guarantees are off the table.',
            );
          }
        }
      }
    }
  } else {
    // The original dispatch was not part of a transition.
    try {
      const returnValue = action(prevState, payload);
      handleActionReturnValue(actionQueue, node, returnValue);
    } catch (error) {
      onActionError(actionQueue, node, error);
    }
  }
}

function handleActionReturnValue<S, P>(
  actionQueue: ActionStateQueue<S, P>,
  node: ActionStateQueueNode<S, P>,
  returnValue: mixed,
) {
  if (
    returnValue !== null &&
    typeof returnValue === 'object' &&
    // $FlowFixMe[method-unbinding]
    typeof returnValue.then === 'function'
  ) {
    const thenable = ((returnValue: any): Thenable<Awaited<S>>);
    if (__DEV__) {
      // Keep track of the number of async transitions still running so we can warn.
      ReactSharedInternals.asyncTransitions++;
      thenable.then(releaseAsyncTransition, releaseAsyncTransition);
    }
    // Attach a listener to read the return state of the action. As soon as
    // this resolves, we can run the next action in the sequence.
    thenable.then(
      (nextState: Awaited<S>) => {
        onActionSuccess(actionQueue, node, nextState);
      },
      (error: mixed) => onActionError(actionQueue, node, error),
    );

    if (__DEV__) {
      if (!node.isTransition) {
        console.error(
          'An async function with useActionState was called outside of a transition. ' +
            'This is likely not what you intended (for example, isPending will not update ' +
            'correctly). Either call the returned function inside startTransition, or pass it ' +
            'to an `action` or `formAction` prop.',
        );
      }
    }
  } else {
    const nextState = ((returnValue: any): Awaited<S>);
    onActionSuccess(actionQueue, node, nextState);
  }
}

function onActionSuccess<S, P>(
  actionQueue: ActionStateQueue<S, P>,
  actionNode: ActionStateQueueNode<S, P>,
  nextState: Awaited<S>,
) {
  // The action finished running.
  actionNode.status = 'fulfilled';
  actionNode.value = nextState;
  notifyActionListeners(actionNode);

  actionQueue.state = nextState;

  // Pop the action from the queue and run the next pending action, if there
  // are any.
  const last = actionQueue.pending;
  if (last !== null) {
    const first = last.next;
    if (first === last) {
      // This was the last action in the queue.
      actionQueue.pending = null;
    } else {
      // Remove the first node from the circular queue.
      const next = first.next;
      last.next = next;

      // Run the next action.
      runActionStateAction(actionQueue, next);
    }
  }
}

function onActionError<S, P>(
  actionQueue: ActionStateQueue<S, P>,
  actionNode: ActionStateQueueNode<S, P>,
  error: mixed,
) {
  // Mark all the following actions as rejected.
  const last = actionQueue.pending;
  actionQueue.pending = null;
  if (last !== null) {
    const first = last.next;
    do {
      actionNode.status = 'rejected';
      actionNode.reason = error;
      notifyActionListeners(actionNode);
      actionNode = actionNode.next;
    } while (actionNode !== first);
  }

  // Prevent subsequent actions from being dispatched.
  actionQueue.action = null;
}

function notifyActionListeners<S, P>(actionNode: ActionStateQueueNode<S, P>) {
  // Notify React that the action has finished.
  const listeners = actionNode.listeners;
  for (let i = 0; i < listeners.length; i++) {
    // This is always a React internal listener, so we don't need to worry
    // about it throwing.
    const listener = listeners[i];
    listener();
  }
}

function actionStateReducer<S>(oldState: S, newState: S): S {
  return newState;
}

function mountActionState<S, P>(
  action: (Awaited<S>, P) => S,
  initialStateProp: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  let initialState: Awaited<S> = initialStateProp;
  if (getIsHydrating()) {
    const root: FiberRoot = (getWorkInProgressRoot(): any);
    const ssrFormState = root.formState;
    // If a formState option was passed to the root, there are form state
    // markers that we need to hydrate. These indicate whether the form state
    // matches this hook instance.
    if (ssrFormState !== null) {
      const isMatching = tryToClaimNextHydratableFormMarkerInstance(
        currentlyRenderingFiber,
      );
      if (isMatching) {
        initialState = ssrFormState[0];
      }
    }
  }

  // State hook. The state is stored in a thenable which is then unwrapped by
  // the `use` algorithm during render.
  const stateHook = mountWorkInProgressHook();
  stateHook.memoizedState = stateHook.baseState = initialState;
  // TODO: Typing this "correctly" results in recursion limit errors
  // const stateQueue: UpdateQueue<S | Awaited<S>, S | Awaited<S>> = {
  const stateQueue = {
    pending: null,
    lanes: NoLanes,
    dispatch: (null: any),
    lastRenderedReducer: actionStateReducer,
    lastRenderedState: initialState,
  };
  stateHook.queue = stateQueue;
  const setState: Dispatch<S | Awaited<S>> = (dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    ((stateQueue: any): UpdateQueue<S | Awaited<S>, S | Awaited<S>>),
  ): any);
  stateQueue.dispatch = setState;

  // Pending state. This is used to store the pending state of the action.
  // Tracked optimistically, like a transition pending state.
  const pendingStateHook = mountStateImpl((false: Thenable<boolean> | boolean));
  const setPendingState: boolean => void = (dispatchOptimisticSetState.bind(
    null,
    currentlyRenderingFiber,
    false,
    ((pendingStateHook.queue: any): UpdateQueue<
      S | Awaited<S>,
      S | Awaited<S>,
    >),
  ): any);

  // Action queue hook. This is used to queue pending actions. The queue is
  // shared between all instances of the hook. Similar to a regular state queue,
  // but different because the actions are run sequentially, and they run in
  // an event instead of during render.
  const actionQueueHook = mountWorkInProgressHook();
  const actionQueue: ActionStateQueue<S, P> = {
    state: initialState,
    dispatch: (null: any), // circular
    action,
    pending: null,
  };
  actionQueueHook.queue = actionQueue;
  const dispatch = (dispatchActionState: any).bind(
    null,
    currentlyRenderingFiber,
    actionQueue,
    setPendingState,
    setState,
  );
  actionQueue.dispatch = dispatch;

  // Stash the action function on the memoized state of the hook. We'll use this
  // to detect when the action function changes so we can update it in
  // an effect.
  actionQueueHook.memoizedState = action;

  return [initialState, dispatch, false];
}

function updateActionState<S, P>(
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  const stateHook = updateWorkInProgressHook();
  const currentStateHook = ((currentHook: any): Hook);
  return updateActionStateImpl(
    stateHook,
    currentStateHook,
    action,
    initialState,
    permalink,
  );
}

function updateActionStateImpl<S, P>(
  stateHook: Hook,
  currentStateHook: Hook,
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  const [actionResult] = updateReducerImpl<S | Thenable<S>, S | Thenable<S>>(
    stateHook,
    currentStateHook,
    actionStateReducer,
  );

  const [isPending] = updateState(false);

  // This will suspend until the action finishes.
  let state: Awaited<S>;
  if (
    typeof actionResult === 'object' &&
    actionResult !== null &&
    // $FlowFixMe[method-unbinding]
    typeof actionResult.then === 'function'
  ) {
    try {
      state = useThenable(((actionResult: any): Thenable<Awaited<S>>));
    } catch (x) {
      if (x === SuspenseException) {
        // If we Suspend here, mark this separately so that we can track this
        // as an Action in Profiling tools.
        throw SuspenseActionException;
      } else {
        throw x;
      }
    }
  } else {
    state = (actionResult: any);
  }

  const actionQueueHook = updateWorkInProgressHook();
  const actionQueue = actionQueueHook.queue;
  const dispatch = actionQueue.dispatch;

  // Check if a new action was passed. If so, update it in an effect.
  const prevAction = actionQueueHook.memoizedState;
  if (action !== prevAction) {
    currentlyRenderingFiber.flags |= PassiveEffect;
    pushSimpleEffect(
      HookHasEffect | HookPassive,
      createEffectInstance(),
      actionStateActionEffect.bind(null, actionQueue, action),
      null,
    );
  }

  return [state, dispatch, isPending];
}

function actionStateActionEffect<S, P>(
  actionQueue: ActionStateQueue<S, P>,
  action: (Awaited<S>, P) => S,
): void {
  actionQueue.action = action;
}

function rerenderActionState<S, P>(
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  // Unlike useState, useActionState doesn't support render phase updates.
  // Also unlike useState, we need to replay all pending updates again in case
  // the passthrough value changed.
  //
  // So instead of a forked re-render implementation that knows how to handle
  // render phase udpates, we can use the same implementation as during a
  // regular mount or update.
  const stateHook = updateWorkInProgressHook();
  const currentStateHook = currentHook;

  if (currentStateHook !== null) {
    // This is an update. Process the update queue.
    return updateActionStateImpl(
      stateHook,
      currentStateHook,
      action,
      initialState,
      permalink,
    );
  }

  updateWorkInProgressHook(); // State

  // This is a mount. No updates to process.
  const state: Awaited<S> = stateHook.memoizedState;

  const actionQueueHook = updateWorkInProgressHook();
  const actionQueue = actionQueueHook.queue;
  const dispatch = actionQueue.dispatch;

  // This may have changed during the rerender.
  actionQueueHook.memoizedState = action;

  // For mount, pending is always false.
  return [state, dispatch, false];
}

function pushSimpleEffect(
  tag: HookFlags,
  inst: EffectInstance,
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): Effect {
  const effect: Effect = {
    tag,
    create,
    deps,
    inst,
    // Circular
    next: (null: any),
  };
  return pushEffectImpl(effect);
}

function pushEffectImpl(effect: Effect): Effect {
  let componentUpdateQueue: null | FunctionComponentUpdateQueue =
    (currentlyRenderingFiber.updateQueue: any);
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
  }
  const lastEffect = componentUpdateQueue.lastEffect;
  if (lastEffect === null) {
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const firstEffect = lastEffect.next;
    lastEffect.next = effect;
    effect.next = firstEffect;
    componentUpdateQueue.lastEffect = effect;
  }
  return effect;
}

function createEffectInstance(): EffectInstance {
  return {destroy: undefined};
}

function mountRef<T>(initialValue: T): {current: T} {
  const hook = mountWorkInProgressHook();
  const ref = {current: initialValue};
  hook.memoizedState = ref;
  return ref;
}

function updateRef<T>(initialValue: T): {current: T} {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function mountEffectImpl(
  fiberFlags: Flags,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    createEffectInstance(),
    create,
    nextDeps,
  );
}

function updateEffectImpl(
  fiberFlags: Flags,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const effect: Effect = hook.memoizedState;
  const inst = effect.inst;

  // currentHook is null on initial mount when rerendering after a render phase
  // state update or for strict mode.
  if (currentHook !== null) {
    if (nextDeps !== null) {
      const prevEffect: Effect = currentHook.memoizedState;
      const prevDeps = prevEffect.deps;
      // $FlowFixMe[incompatible-call] (@poteto)
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushSimpleEffect(
          hookFlags,
          inst,
          create,
          nextDeps,
        );
        return;
      }
    }
  }

  currentlyRenderingFiber.flags |= fiberFlags;

  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    inst,
    create,
    nextDeps,
  );
}

function mountEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  if (
    __DEV__ &&
    (currentlyRenderingFiber.mode & StrictEffectsMode) !== NoMode
  ) {
    mountEffectImpl(
      MountPassiveDevEffect | PassiveEffect | PassiveStaticEffect,
      HookPassive,
      create,
      deps,
    );
  } else {
    mountEffectImpl(
      PassiveEffect | PassiveStaticEffect,
      HookPassive,
      create,
      deps,
    );
  }
}

function updateEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function useEffectEventImpl<Args, Return, F: (...Array<Args>) => Return>(
  payload: EventFunctionPayload<Args, Return, F>,
) {
  currentlyRenderingFiber.flags |= UpdateEffect;
  let componentUpdateQueue: null | FunctionComponentUpdateQueue =
    (currentlyRenderingFiber.updateQueue: any);
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
    componentUpdateQueue.events = [payload];
  } else {
    const events = componentUpdateQueue.events;
    if (events === null) {
      componentUpdateQueue.events = [payload];
    } else {
      events.push(payload);
    }
  }
}

function mountEvent<Args, Return, F: (...Array<Args>) => Return>(
  callback: F,
): F {
  const hook = mountWorkInProgressHook();
  const ref = {impl: callback};
  hook.memoizedState = ref;
  // $FlowIgnore[incompatible-return]
  return function eventFn() {
    if (isInvalidExecutionContextForEventFunction()) {
      throw new Error(
        "A function wrapped in useEffectEvent can't be called during rendering.",
      );
    }
    return ref.impl.apply(undefined, arguments);
  };
}

function updateEvent<Args, Return, F: (...Array<Args>) => Return>(
  callback: F,
): F {
  const hook = updateWorkInProgressHook();
  const ref = hook.memoizedState;
  useEffectEventImpl({ref, nextImpl: callback});
  // $FlowIgnore[incompatible-return]
  return function eventFn() {
    if (isInvalidExecutionContextForEventFunction()) {
      throw new Error(
        "A function wrapped in useEffectEvent can't be called during rendering.",
      );
    }
    return ref.impl.apply(undefined, arguments);
  };
}

function mountInsertionEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  mountEffectImpl(UpdateEffect, HookInsertion, create, deps);
}

function updateInsertionEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return updateEffectImpl(UpdateEffect, HookInsertion, create, deps);
}

function mountLayoutEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  let fiberFlags: Flags = UpdateEffect | LayoutStaticEffect;
  if (
    __DEV__ &&
    (currentlyRenderingFiber.mode & StrictEffectsMode) !== NoMode
  ) {
    fiberFlags |= MountLayoutDevEffect;
  }
  return mountEffectImpl(fiberFlags, HookLayout, create, deps);
}

function updateLayoutEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function imperativeHandleEffect<T>(
  create: () => T,
  ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
): void | (() => void) {
  if (typeof ref === 'function') {
    const refCallback = ref;
    const inst = create();
    const refCleanup = refCallback(inst);
    return () => {
      if (typeof refCleanup === 'function') {
        // $FlowFixMe[incompatible-use] we need to assume no parameters
        refCleanup();
      } else {
        refCallback(null);
      }
    };
  } else if (ref !== null && ref !== undefined) {
    const refObject = ref;
    if (__DEV__) {
      if (!refObject.hasOwnProperty('current')) {
        console.error(
          'Expected useImperativeHandle() first argument to either be a ' +
            'ref callback or React.createRef() object. Instead received: %s.',
          'an object with keys {' + Object.keys(refObject).join(', ') + '}',
        );
      }
    }
    const inst = create();
    refObject.current = inst;
    return () => {
      refObject.current = null;
    };
  }
}

function mountImperativeHandle<T>(
  ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
  create: () => T,
  deps: Array<mixed> | void | null,
): void {
  if (__DEV__) {
    if (typeof create !== 'function') {
      console.error(
        'Expected useImperativeHandle() second argument to be a function ' +
          'that creates a handle. Instead received: %s.',
        create !== null ? typeof create : 'null',
      );
    }
  }

  // TODO: If deps are provided, should we skip comparing the ref itself?
  const effectDeps =
    deps !== null && deps !== undefined ? deps.concat([ref]) : null;

  let fiberFlags: Flags = UpdateEffect | LayoutStaticEffect;
  if (
    __DEV__ &&
    (currentlyRenderingFiber.mode & StrictEffectsMode) !== NoMode
  ) {
    fiberFlags |= MountLayoutDevEffect;
  }
  mountEffectImpl(
    fiberFlags,
    HookLayout,
    imperativeHandleEffect.bind(null, create, ref),
    effectDeps,
  );
}

function updateImperativeHandle<T>(
  ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
  create: () => T,
  deps: Array<mixed> | void | null,
): void {
  if (__DEV__) {
    if (typeof create !== 'function') {
      console.error(
        'Expected useImperativeHandle() second argument to be a function ' +
          'that creates a handle. Instead received: %s.',
        create !== null ? typeof create : 'null',
      );
    }
  }

  // TODO: If deps are provided, should we skip comparing the ref itself?
  const effectDeps =
    deps !== null && deps !== undefined ? deps.concat([ref]) : null;

  updateEffectImpl(
    UpdateEffect,
    HookLayout,
    imperativeHandleEffect.bind(null, create, ref),
    effectDeps,
  );
}

function mountDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
  // This hook is normally a no-op.
  // The react-debug-hooks package injects its own implementation
  // so that e.g. DevTools can display custom hook values.
}

const updateDebugValue = mountDebugValue;

function mountCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function updateCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (nextDeps !== null) {
    const prevDeps: Array<mixed> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function mountMemo<T>(
  nextCreate: () => T,
  deps: Array<mixed> | void | null,
): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    setIsStrictModeForDevtools(true);
    try {
      nextCreate();
    } finally {
      setIsStrictModeForDevtools(false);
    }
  }
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo<T>(
  nextCreate: () => T,
  deps: Array<mixed> | void | null,
): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  // Assume these are defined. If they're not, areHookInputsEqual will warn.
  if (nextDeps !== null) {
    const prevDeps: Array<mixed> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  const nextValue = nextCreate();
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    setIsStrictModeForDevtools(true);
    try {
      nextCreate();
    } finally {
      setIsStrictModeForDevtools(false);
    }
  }
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function mountDeferredValue<T>(value: T, initialValue?: T): T {
  const hook = mountWorkInProgressHook();
  return mountDeferredValueImpl(hook, value, initialValue);
}

function updateDeferredValue<T>(value: T, initialValue?: T): T {
  const hook = updateWorkInProgressHook();
  const resolvedCurrentHook: Hook = (currentHook: any);
  const prevValue: T = resolvedCurrentHook.memoizedState;
  return updateDeferredValueImpl(hook, prevValue, value, initialValue);
}

function rerenderDeferredValue<T>(value: T, initialValue?: T): T {
  const hook = updateWorkInProgressHook();
  if (currentHook === null) {
    // This is a rerender during a mount.
    return mountDeferredValueImpl(hook, value, initialValue);
  } else {
    // This is a rerender during an update.
    const prevValue: T = currentHook.memoizedState;
    return updateDeferredValueImpl(hook, prevValue, value, initialValue);
  }
}

function isRenderingDeferredWork(): boolean {
  if (!includesSomeLane(renderLanes, DeferredLane)) {
    // None of the render lanes are deferred lanes.
    return false;
  }
  // At least one of the render lanes are deferred lanes. However, if the
  // current render is also batched together with an update, then we can't
  // say that the render is wholly the result of deferred work. We can check
  // this by checking if the root render lanes contain any "update" lanes, i.e.
  // lanes that are only assigned to updates, like setState.
  const rootRenderLanes = getWorkInProgressRootRenderLanes();
  return !includesSomeLane(rootRenderLanes, UpdateLanes);
}

function mountDeferredValueImpl<T>(hook: Hook, value: T, initialValue?: T): T {
  if (
    // When `initialValue` is provided, we defer the initial render even if the
    // current render is not synchronous.
    initialValue !== undefined &&
    // However, to avoid waterfalls, we do not defer if this render
    // was itself spawned by an earlier useDeferredValue. Check if DeferredLane
    // is part of the render lanes.
    !isRenderingDeferredWork()
  ) {
    // Render with the initial value
    hook.memoizedState = initialValue;

    // Schedule a deferred render to switch to the final value.
    const deferredLane = requestDeferredLane();
    currentlyRenderingFiber.lanes = mergeLanes(
      currentlyRenderingFiber.lanes,
      deferredLane,
    );
    markSkippedUpdateLanes(deferredLane);

    return initialValue;
  } else {
    hook.memoizedState = value;
    return value;
  }
}

function updateDeferredValueImpl<T>(
  hook: Hook,
  prevValue: T,
  value: T,
  initialValue?: T,
): T {
  if (is(value, prevValue)) {
    // The incoming value is referentially identical to the currently rendered
    // value, so we can bail out quickly.
    return value;
  } else {
    // Received a new value that's different from the current value.

    // Check if we're inside a hidden tree
    if (isCurrentTreeHidden()) {
      // Revealing a prerendered tree is considered the same as mounting new
      // one, so we reuse the "mount" path in this case.
      const resultValue = mountDeferredValueImpl(hook, value, initialValue);
      // Unlike during an actual mount, we need to mark this as an update if
      // the value changed.
      if (!is(resultValue, prevValue)) {
        markWorkInProgressReceivedUpdate();
      }
      return resultValue;
    }

    const shouldDeferValue =
      !includesOnlyNonUrgentLanes(renderLanes) && !isRenderingDeferredWork();
    if (shouldDeferValue) {
      // This is an urgent update. Since the value has changed, keep using the
      // previous value and spawn a deferred render to update it later.

      // Schedule a deferred render
      const deferredLane = requestDeferredLane();
      currentlyRenderingFiber.lanes = mergeLanes(
        currentlyRenderingFiber.lanes,
        deferredLane,
      );
      markSkippedUpdateLanes(deferredLane);

      // Reuse the previous value. We do not need to mark this as an update,
      // because we did not render a new value.
      return prevValue;
    } else {
      // This is not an urgent update, so we can use the latest value regardless
      // of what it is. No need to defer it.

      // Mark this as an update to prevent the fiber from bailing out.
      markWorkInProgressReceivedUpdate();
      hook.memoizedState = value;
      return value;
    }
  }
}

function releaseAsyncTransition() {
  if (__DEV__) {
    ReactSharedInternals.asyncTransitions--;
  }
}

function startTransition<S>(
  fiber: Fiber,
  queue: UpdateQueue<S | Thenable<S>, BasicStateAction<S | Thenable<S>>>,
  pendingState: S,
  finishedState: S,
  callback: () => mixed,
  options?: StartTransitionOptions,
): void {
  const previousPriority = getCurrentUpdatePriority();
  setCurrentUpdatePriority(
    higherEventPriority(previousPriority, ContinuousEventPriority),
  );

  const prevTransition = ReactSharedInternals.T;
  const currentTransition: Transition = ({}: any);
  if (enableViewTransition) {
    currentTransition.types =
      prevTransition !== null
        ? // If we're a nested transition, we should use the same set as the parent
          // since we're conceptually always joined into the same entangled transition.
          // In practice, this only matters if we add transition types in the inner
          // without setting state. In that case, the inner transition can finish
          // without waiting for the outer.
          prevTransition.types
        : null;
  }
  if (enableGestureTransition) {
    currentTransition.gesture = null;
  }
  if (enableTransitionTracing) {
    currentTransition.name =
      options !== undefined && options.name !== undefined ? options.name : null;
    currentTransition.startTime = now();
  }
  if (__DEV__) {
    currentTransition._updatedFibers = new Set();
  }

  // We don't really need to use an optimistic update here, because we
  // schedule a second "revert" update below (which we use to suspend the
  // transition until the async action scope has finished). But we'll use an
  // optimistic update anyway to make it less likely the behavior accidentally
  // diverges; for example, both an optimistic update and this one should
  // share the same lane.
  ReactSharedInternals.T = currentTransition;
  dispatchOptimisticSetState(fiber, false, queue, pendingState);

  try {
    const returnValue = callback();
    const onStartTransitionFinish = ReactSharedInternals.S;
    if (onStartTransitionFinish !== null) {
      onStartTransitionFinish(currentTransition, returnValue);
    }

    // Check if we're inside an async action scope. If so, we'll entangle
    // this new action with the existing scope.
    //
    // If we're not already inside an async action scope, and this action is
    // async, then we'll create a new async scope.
    //
    // In the async case, the resulting render will suspend until the async
    // action scope has finished.
    if (
      returnValue !== null &&
      typeof returnValue === 'object' &&
      typeof returnValue.then === 'function'
    ) {
      const thenable = ((returnValue: any): Thenable<mixed>);
      if (__DEV__) {
        // Keep track of the number of async transitions still running so we can warn.
        ReactSharedInternals.asyncTransitions++;
        thenable.then(releaseAsyncTransition, releaseAsyncTransition);
      }
      // Create a thenable that resolves to `finishedState` once the async
      // action has completed.
      const thenableForFinishedState = chainThenableValue(
        thenable,
        finishedState,
      );
      dispatchSetStateInternal(
        fiber,
        queue,
        (thenableForFinishedState: any),
        requestUpdateLane(fiber),
      );
    } else {
      dispatchSetStateInternal(
        fiber,
        queue,
        finishedState,
        requestUpdateLane(fiber),
      );
    }
  } catch (error) {
    // This is a trick to get the `useTransition` hook to rethrow the error.
    // When it unwraps the thenable with the `use` algorithm, the error
    // will be thrown.
    const rejectedThenable: RejectedThenable<S> = {
      then() {},
      status: 'rejected',
      reason: error,
    };
    dispatchSetStateInternal(
      fiber,
      queue,
      rejectedThenable,
      requestUpdateLane(fiber),
    );
  } finally {
    setCurrentUpdatePriority(previousPriority);

    if (prevTransition !== null && currentTransition.types !== null) {
      // If we created a new types set in the inner transition, we transfer it to the parent
      // since they should share the same set. They're conceptually entangled.
      if (__DEV__) {
        if (
          prevTransition.types !== null &&
          prevTransition.types !== currentTransition.types
        ) {
          // Just assert that assumption holds that we're not overriding anything.
          console.error(
            'We expected inner Transitions to have transferred the outer types set and ' +
              'that you cannot add to the outer Transition while inside the inner.' +
              'This is a bug in React.',
          );
        }
      }
      prevTransition.types = currentTransition.types;
    }
    ReactSharedInternals.T = prevTransition;

    if (__DEV__) {
      if (prevTransition === null && currentTransition._updatedFibers) {
        const updatedFibersCount = currentTransition._updatedFibers.size;
        currentTransition._updatedFibers.clear();
        if (updatedFibersCount > 10) {
          console.warn(
            'Detected a large number of updates inside startTransition. ' +
              'If this is due to a subscription please re-write it to use React provided hooks. ' +
              'Otherwise concurrent mode guarantees are off the table.',
          );
        }
      }
    }
  }
}

const noop = () => {};

export function startHostTransition<F>(
  formFiber: Fiber,
  pendingState: TransitionStatus,
  action: (F => mixed) | null,
  formData: F,
): void {
  if (formFiber.tag !== HostComponent) {
    throw new Error(
      'Expected the form instance to be a HostComponent. This ' +
        'is a bug in React.',
    );
  }

  const stateHook = ensureFormComponentIsStateful(formFiber);

  const queue: UpdateQueue<
    Thenable<TransitionStatus> | TransitionStatus,
    BasicStateAction<Thenable<TransitionStatus> | TransitionStatus>,
  > = stateHook.queue;

  startHostActionTimer(formFiber);

  startTransition(
    formFiber,
    queue,
    pendingState,
    NoPendingHostTransition,
    // TODO: `startTransition` both sets the pending state and dispatches
    // the action, if one is provided. Consider refactoring these two
    // concerns to avoid the extra lambda.

    action === null
      ? // No action was provided, but we still call `startTransition` to
        // set the pending form status.
        noop
      : () => {
          // Automatically reset the form when the action completes.
          requestFormReset(formFiber);
          return action(formData);
        },
  );
}

function ensureFormComponentIsStateful(formFiber: Fiber) {
  const existingStateHook: Hook | null = formFiber.memoizedState;
  if (existingStateHook !== null) {
    // This fiber was already upgraded to be stateful.
    return existingStateHook;
  }

  // Upgrade this host component fiber to be stateful. We're going to pretend
  // it was stateful all along so we can reuse most of the implementation
  // for function components and useTransition.
  //
  // Create the state hook used by TransitionAwareHostComponent. This is
  // essentially an inlined version of mountState.
  const newQueue: UpdateQueue<
    Thenable<TransitionStatus> | TransitionStatus,
    BasicStateAction<Thenable<TransitionStatus> | TransitionStatus>,
  > = {
    pending: null,
    lanes: NoLanes,
    // We're going to cheat and intentionally not create a bound dispatch
    // method, because we can call it directly in startTransition.
    dispatch: (null: any),
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: NoPendingHostTransition,
  };

  const stateHook: Hook = {
    memoizedState: NoPendingHostTransition,
    baseState: NoPendingHostTransition,
    baseQueue: null,
    queue: newQueue,
    next: null,
  };

  // We use another state hook to track whether the form needs to be reset.
  // The state is an empty object. To trigger a reset, we update the state
  // to a new object. Then during rendering, we detect that the state has
  // changed and schedule a commit effect.
  const initialResetState = {};
  const newResetStateQueue: UpdateQueue<Object, Object> = {
    pending: null,
    lanes: NoLanes,
    // We're going to cheat and intentionally not create a bound dispatch
    // method, because we can call it directly in startTransition.
    dispatch: (null: any),
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialResetState,
  };
  const resetStateHook: Hook = {
    memoizedState: initialResetState,
    baseState: initialResetState,
    baseQueue: null,
    queue: newResetStateQueue,
    next: null,
  };
  stateHook.next = resetStateHook;

  // Add the hook list to both fiber alternates. The idea is that the fiber
  // had this hook all along.
  formFiber.memoizedState = stateHook;
  const alternate = formFiber.alternate;
  if (alternate !== null) {
    alternate.memoizedState = stateHook;
  }

  return stateHook;
}

export function requestFormReset(formFiber: Fiber) {
  const transition = requestCurrentTransition();

  if (transition === null) {
    if (__DEV__) {
      // An optimistic update occurred, but startTransition is not on the stack.
      // The form reset will be scheduled at default (sync) priority, which
      // is probably not what the user intended. Most likely because the
      // requestFormReset call happened after an `await`.
      // TODO: Theoretically, requestFormReset is still useful even for
      // non-transition updates because it allows you to update defaultValue
      // synchronously and then wait to reset until after the update commits.
      // I've chosen to warn anyway because it's more likely the `await` mistake
      // described above. But arguably we shouldn't.
      console.error(
        'requestFormReset was called outside a transition or action. To ' +
          'fix, move to an action, or wrap with startTransition.',
      );
    }
  } else if (enableGestureTransition && transition.gesture) {
    throw new Error(
      'Cannot requestFormReset() inside a startGestureTransition. ' +
        'There should be no side-effects associated with starting a ' +
        'Gesture until its Action is invoked. Move side-effects to the ' +
        'Action instead.',
    );
  }

  let stateHook: Hook = ensureFormComponentIsStateful(formFiber);
  const newResetState = {};
  if (stateHook.next === null) {
    // Hack alert. If formFiber is the workInProgress Fiber then
    // we might get a broken intermediate state. Try the alternate
    // instead.
    // TODO: We should really stash the Queue somewhere stateful
    // just like how setState binds the Queue.
    stateHook = (formFiber.alternate: any).memoizedState;
  }
  const resetStateHook: Hook = (stateHook.next: any);
  const resetStateQueue = resetStateHook.queue;
  dispatchSetStateInternal(
    formFiber,
    resetStateQueue,
    newResetState,
    requestUpdateLane(formFiber),
  );
}

function mountTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  const stateHook = mountStateImpl((false: Thenable<boolean> | boolean));
  // The `start` method never changes.
  const start = startTransition.bind(
    null,
    currentlyRenderingFiber,
    stateHook.queue,
    true,
    false,
  );
  const hook = mountWorkInProgressHook();
  hook.memoizedState = start;
  return [false, start];
}

function updateTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  const [booleanOrThenable] = updateState(false);
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  const isPending =
    typeof booleanOrThenable === 'boolean'
      ? booleanOrThenable
      : // This will suspend until the async action scope has finished.
        useThenable(booleanOrThenable);
  return [isPending, start];
}

function rerenderTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  const [booleanOrThenable] = rerenderState(false);
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  const isPending =
    typeof booleanOrThenable === 'boolean'
      ? booleanOrThenable
      : // This will suspend until the async action scope has finished.
        useThenable(booleanOrThenable);
  return [isPending, start];
}

function useHostTransitionStatus(): TransitionStatus {
  return readContext(HostTransitionContext);
}

function mountId(): string {
  const hook = mountWorkInProgressHook();

  const root = ((getWorkInProgressRoot(): any): FiberRoot);
  // TODO: In Fizz, id generation is specific to each server config. Maybe we
  // should do this in Fiber, too? Deferring this decision for now because
  // there's no other place to store the prefix except for an internal field on
  // the public createRoot object, which the fiber tree does not currently have
  // a reference to.
  const identifierPrefix = root.identifierPrefix;

  let id;
  if (getIsHydrating()) {
    const treeId = getTreeId();

    // Use a captial R prefix for server-generated ids.
    id = '_' + identifierPrefix + 'R_' + treeId;

    // Unless this is the first id at this level, append a number at the end
    // that represents the position of this useId hook among all the useId
    // hooks for this fiber.
    const localId = localIdCounter++;
    if (localId > 0) {
      id += 'H' + localId.toString(32);
    }

    id += '_';
  } else {
    // Use a lowercase r prefix for client-generated ids.
    const globalClientId = globalClientIdCounter++;
    id = '_' + identifierPrefix + 'r_' + globalClientId.toString(32) + '_';
  }

  hook.memoizedState = id;
  return id;
}

function updateId(): string {
  const hook = updateWorkInProgressHook();
  const id: string = hook.memoizedState;
  return id;
}

function mountRefresh(): any {
  const hook = mountWorkInProgressHook();
  const refresh = (hook.memoizedState = refreshCache.bind(
    null,
    currentlyRenderingFiber,
  ));
  return refresh;
}

function updateRefresh(): any {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function refreshCache<T>(fiber: Fiber, seedKey: ?() => T, seedValue: T): void {
  // TODO: Does Cache work in legacy mode? Should decide and write a test.
  // TODO: Consider warning if the refresh is at discrete priority, or if we
  // otherwise suspect that it wasn't batched properly.
  let provider = fiber.return;
  while (provider !== null) {
    switch (provider.tag) {
      case CacheComponent:
      case HostRoot: {
        // Schedule an update on the cache boundary to trigger a refresh.
        const lane = requestUpdateLane(provider);
        const refreshUpdate = createLegacyQueueUpdate(lane);
        const root = enqueueLegacyQueueUpdate(provider, refreshUpdate, lane);
        if (root !== null) {
          startUpdateTimerByLane(lane, 'refresh()', fiber);
          scheduleUpdateOnFiber(root, provider, lane);
          entangleLegacyQueueTransitions(root, provider, lane);
        }

        // TODO: If a refresh never commits, the new cache created here must be
        // released. A simple case is start refreshing a cache boundary, but then
        // unmount that boundary before the refresh completes.
        const seededCache = createCache();
        if (seedKey !== null && seedKey !== undefined && root !== null) {
          if (enableLegacyCache) {
            // Seed the cache with the value passed by the caller. This could be
            // from a server mutation, or it could be a streaming response.
            seededCache.data.set(seedKey, seedValue);
          } else {
            if (__DEV__) {
              console.error(
                'The seed argument is not enabled outside experimental channels.',
              );
            }
          }
        }

        const payload = {
          cache: seededCache,
        };
        refreshUpdate.payload = payload;
        return;
      }
    }
    provider = provider.return;
  }
  // TODO: Warn if unmounted?
}

function dispatchReducerAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  if (__DEV__) {
    // using a reference to `arguments` bails out of GCC optimizations which affect function arity
    const args = arguments;
    if (typeof args[3] === 'function') {
      console.error(
        "State updates from the useState() and useReducer() Hooks don't support the " +
          'second callback argument. To execute a side effect after ' +
          'rendering, declare it in the component body with useEffect().',
      );
    }
  }

  const lane = requestUpdateLane(fiber);

  const update: Update<S, A> = {
    lane,
    revertLane: NoLane,
    gesture: null,
    action,
    hasEagerState: false,
    eagerState: null,
    next: (null: any),
  };

  if (isRenderPhaseUpdate(fiber)) {
    enqueueRenderPhaseUpdate(queue, update);
  } else {
    const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
    if (root !== null) {
      startUpdateTimerByLane(lane, 'dispatch()', fiber);
      scheduleUpdateOnFiber(root, fiber, lane);
      entangleTransitionUpdate(root, queue, lane);
    }
  }

  markUpdateInDevTools(fiber, lane, action);
}

function dispatchSetState<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  if (__DEV__) {
    // using a reference to `arguments` bails out of GCC optimizations which affect function arity
    const args = arguments;
    if (typeof args[3] === 'function') {
      console.error(
        "State updates from the useState() and useReducer() Hooks don't support the " +
          'second callback argument. To execute a side effect after ' +
          'rendering, declare it in the component body with useEffect().',
      );
    }
  }

  const lane = requestUpdateLane(fiber);
  const didScheduleUpdate = dispatchSetStateInternal(
    fiber,
    queue,
    action,
    lane,
  );
  if (didScheduleUpdate) {
    startUpdateTimerByLane(lane, 'setState()', fiber);
  }
  markUpdateInDevTools(fiber, lane, action);
}

function dispatchSetStateInternal<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
  lane: Lane,
): boolean {
  const update: Update<S, A> = {
    lane,
    revertLane: NoLane,
    gesture: null,
    action,
    hasEagerState: false,
    eagerState: null,
    next: (null: any),
  };

  if (isRenderPhaseUpdate(fiber)) {
    enqueueRenderPhaseUpdate(queue, update);
  } else {
    const alternate = fiber.alternate;
    if (
      fiber.lanes === NoLanes &&
      (alternate === null || alternate.lanes === NoLanes)
    ) {
      // The queue is currently empty, which means we can eagerly compute the
      // next state before entering the render phase. If the new state is the
      // same as the current state, we may be able to bail out entirely.
      const lastRenderedReducer = queue.lastRenderedReducer;
      if (lastRenderedReducer !== null) {
        let prevDispatcher = null;
        if (__DEV__) {
          prevDispatcher = ReactSharedInternals.H;
          ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        }
        try {
          const currentState: S = (queue.lastRenderedState: any);
          const eagerState = lastRenderedReducer(currentState, action);
          // Stash the eagerly computed state, and the reducer used to compute
          // it, on the update object. If the reducer hasn't changed by the
          // time we enter the render phase, then the eager state can be used
          // without calling the reducer again.
          update.hasEagerState = true;
          update.eagerState = eagerState;
          if (is(eagerState, currentState)) {
            // Fast path. We can bail out without scheduling React to re-render.
            // It's still possible that we'll need to rebase this update later,
            // if the component re-renders for a different reason and by that
            // time the reducer has changed.
            // TODO: Do we still need to entangle transitions in this case?
            enqueueConcurrentHookUpdateAndEagerlyBailout(fiber, queue, update);
            return false;
          }
        } catch (error) {
          // Suppress the error. It will throw again in the render phase.
        } finally {
          if (__DEV__) {
            ReactSharedInternals.H = prevDispatcher;
          }
        }
      }
    }

    const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
    if (root !== null) {
      scheduleUpdateOnFiber(root, fiber, lane);
      entangleTransitionUpdate(root, queue, lane);
      return true;
    }
  }
  return false;
}

function dispatchOptimisticSetState<S, A>(
  fiber: Fiber,
  throwIfDuringRender: boolean,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  const transition = requestCurrentTransition();

  if (__DEV__) {
    if (transition === null) {
      // An optimistic update occurred, but startTransition is not on the stack.
      // There are two likely scenarios.

      // One possibility is that the optimistic update is triggered by a regular
      // event handler (e.g. `onSubmit`) instead of an action. This is a mistake
      // and we will warn.

      // The other possibility is the optimistic update is inside an async
      // action, but after an `await`. In this case, we can make it "just work"
      // by associating the optimistic update with the pending async action.

      // Technically it's possible that the optimistic update is unrelated to
      // the pending action, but we don't have a way of knowing this for sure
      // because browsers currently do not provide a way to track async scope.
      // (The AsyncContext proposal, if it lands, will solve this in the
      // future.) However, this is no different than the problem of unrelated
      // transitions being grouped together — it's not wrong per se, but it's
      // not ideal.

      // Once AsyncContext starts landing in browsers, we will provide better
      // warnings in development for these cases.
      if (peekEntangledActionLane() !== NoLane) {
        // There is a pending async action. Don't warn.
      } else {
        // There's no pending async action. The most likely cause is that we're
        // inside a regular event handler (e.g. onSubmit) instead of an action.
        console.error(
          'An optimistic state update occurred outside a transition or ' +
            'action. To fix, move the update to an action, or wrap ' +
            'with startTransition.',
        );
      }
    }
  }

  // For regular Transitions an optimistic update commits synchronously.
  // For gesture Transitions an optimistic update commits on the GestureLane.
  const lane =
    enableGestureTransition && transition !== null && transition.gesture
      ? GestureLane
      : SyncLane;
  const update: Update<S, A> = {
    lane: lane,
    // After committing, the optimistic update is "reverted" using the same
    // lane as the transition it's associated with.
    revertLane: requestTransitionLane(transition),
    gesture: null,
    action,
    hasEagerState: false,
    eagerState: null,
    next: (null: any),
  };

  if (isRenderPhaseUpdate(fiber)) {
    // When calling startTransition during render, this warns instead of
    // throwing because throwing would be a breaking change. setOptimisticState
    // is a new API so it's OK to throw.
    if (throwIfDuringRender) {
      throw new Error('Cannot update optimistic state while rendering.');
    } else {
      // startTransition was called during render. We don't need to do anything
      // besides warn here because the render phase update would be overidden by
      // the second update, anyway. We can remove this branch and make it throw
      // in a future release.
      if (__DEV__) {
        console.error('Cannot call startTransition while rendering.');
      }
    }
  } else {
    const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
    if (root !== null) {
      // NOTE: The optimistic update implementation assumes that the transition
      // will never be attempted before the optimistic update. This currently
      // holds because the optimistic update is always synchronous. If we ever
      // change that, we'll need to account for this.
      startUpdateTimerByLane(lane, 'setOptimistic()', fiber);
      scheduleUpdateOnFiber(root, fiber, lane);
      // Optimistic updates are always synchronous, so we don't need to call
      // entangleTransitionUpdate here.
      if (enableGestureTransition && transition !== null) {
        const provider = transition.gesture;
        if (provider !== null) {
          // If this was a gesture, ensure we have a scheduled gesture and that
          // we associate this update with this specific gesture instance.
          const gesture = (update.gesture = scheduleGesture(root, provider));
          // Ensure the gesture always uses the same revert lane. This can happen for
          // two startGestureTransition calls to the same provider in different events.
          if (gesture.revertLane === NoLane) {
            gesture.revertLane = update.revertLane;
          } else {
            update.revertLane = gesture.revertLane;
          }
        }
      }
    }
  }

  markUpdateInDevTools(fiber, lane, action);
}

function isRenderPhaseUpdate(fiber: Fiber): boolean {
  const alternate = fiber.alternate;
  return (
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate === currentlyRenderingFiber)
  );
}

function enqueueRenderPhaseUpdate<S, A>(
  queue: UpdateQueue<S, A>,
  update: Update<S, A>,
): void {
  // This is a render phase update. Stash it in a lazily-created map of
  // queue -> linked list of updates. After this render pass, we'll restart
  // and apply the stashed updates on top of the work-in-progress hook.
  didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate =
    true;
  const pending = queue.pending;
  if (pending === null) {
    // This is the first update. Create a circular list.
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
}

// TODO: Move to ReactFiberConcurrentUpdates?
function entangleTransitionUpdate<S, A>(
  root: FiberRoot,
  queue: UpdateQueue<S, A>,
  lane: Lane,
): void {
  if (isTransitionLane(lane)) {
    let queueLanes = queue.lanes;

    // If any entangled lanes are no longer pending on the root, then they
    // must have finished. We can remove them from the shared queue, which
    // represents a superset of the actually pending lanes. In some cases we
    // may entangle more than we need to, but that's OK. In fact it's worse if
    // we *don't* entangle when we should.
    queueLanes = intersectLanes(queueLanes, root.pendingLanes);

    // Entangle the new transition lane with the other transition lanes.
    const newQueueLanes = mergeLanes(queueLanes, lane);
    queue.lanes = newQueueLanes;
    // Even if queue.lanes already include lane, we don't know for certain if
    // the lane finished since the last time we entangled it. So we need to
    // entangle it again, just to be sure.
    markRootEntangled(root, newQueueLanes);
  }
}

function markUpdateInDevTools<A>(fiber: Fiber, lane: Lane, action: A): void {
  if (enableSchedulingProfiler) {
    markStateUpdateScheduled(fiber, lane);
  }
}

export const ContextOnlyDispatcher: Dispatcher = {
  readContext,

  use,
  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useImperativeHandle: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
  useInsertionEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  useDebugValue: throwInvalidHookError,
  useDeferredValue: throwInvalidHookError,
  useTransition: throwInvalidHookError,
  useSyncExternalStore: throwInvalidHookError,
  useId: throwInvalidHookError,
  useHostTransitionStatus: throwInvalidHookError,
  useFormState: throwInvalidHookError,
  useActionState: throwInvalidHookError,
  useOptimistic: throwInvalidHookError,
  useMemoCache: throwInvalidHookError,
  useCacheRefresh: throwInvalidHookError,
  useEffectEvent: throwInvalidHookError,
};

const HooksDispatcherOnMount: Dispatcher = {
  readContext,

  use,
  useCallback: mountCallback,
  useContext: readContext,
  useEffect: mountEffect,
  useImperativeHandle: mountImperativeHandle,
  useLayoutEffect: mountLayoutEffect,
  useInsertionEffect: mountInsertionEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  useDebugValue: mountDebugValue,
  useDeferredValue: mountDeferredValue,
  useTransition: mountTransition,
  useSyncExternalStore: mountSyncExternalStore,
  useId: mountId,
  useHostTransitionStatus: useHostTransitionStatus,
  useFormState: mountActionState,
  useActionState: mountActionState,
  useOptimistic: mountOptimistic,
  useMemoCache,
  useCacheRefresh: mountRefresh,
  useEffectEvent: mountEvent,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  use,
  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useInsertionEffect: updateInsertionEffect,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  useDebugValue: updateDebugValue,
  useDeferredValue: updateDeferredValue,
  useTransition: updateTransition,
  useSyncExternalStore: updateSyncExternalStore,
  useId: updateId,
  useHostTransitionStatus: useHostTransitionStatus,
  useFormState: updateActionState,
  useActionState: updateActionState,
  useOptimistic: updateOptimistic,
  useMemoCache,
  useCacheRefresh: updateRefresh,
  useEffectEvent: updateEvent,
};

const HooksDispatcherOnRerender: Dispatcher = {
  readContext,

  use,
  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useInsertionEffect: updateInsertionEffect,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: rerenderReducer,
  useRef: updateRef,
  useState: rerenderState,
  useDebugValue: updateDebugValue,
  useDeferredValue: rerenderDeferredValue,
  useTransition: rerenderTransition,
  useSyncExternalStore: updateSyncExternalStore,
  useId: updateId,
  useHostTransitionStatus: useHostTransitionStatus,
  useFormState: rerenderActionState,
  useActionState: rerenderActionState,
  useOptimistic: rerenderOptimistic,
  useMemoCache,
  useCacheRefresh: updateRefresh,
  useEffectEvent: updateEvent,
};

let HooksDispatcherOnMountInDEV: Dispatcher | null = null;
let HooksDispatcherOnMountWithHookTypesInDEV: Dispatcher | null = null;
let HooksDispatcherOnUpdateInDEV: Dispatcher | null = null;
let HooksDispatcherOnRerenderInDEV: Dispatcher | null = null;
let InvalidNestedHooksDispatcherOnMountInDEV: Dispatcher | null = null;
let InvalidNestedHooksDispatcherOnUpdateInDEV: Dispatcher | null = null;
let InvalidNestedHooksDispatcherOnRerenderInDEV: Dispatcher | null = null;

if (__DEV__) {
  const warnInvalidContextAccess = () => {
    console.error(
      'Context can only be read while React is rendering. ' +
        'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
        'In function components, you can read it directly in the function body, but not ' +
        'inside Hooks like useReducer() or useMemo().',
    );
  };

  const warnInvalidHookAccess = () => {
    console.error(
      'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
        'You can only call Hooks at the top level of your React function. ' +
        'For more information, see ' +
        'https://react.dev/link/rules-of-hooks',
    );
  };

  HooksDispatcherOnMountInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      return readContext(context);
    },
    use,
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      mountHookTypesDev();
      checkDepsAreArrayDev(deps);
      return mountCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      mountHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      mountHookTypesDev();
      checkDepsAreArrayDev(deps);
      return mountEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      mountHookTypesDev();
      checkDepsAreArrayDev(deps);
      return mountImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      mountHookTypesDev();
      checkDepsAreArrayDev(deps);
      return mountInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      mountHookTypesDev();
      checkDepsAreArrayDev(deps);
      return mountLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      mountHookTypesDev();
      checkDepsAreArrayDev(deps);
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      mountHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      mountHookTypesDev();
      return mountRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      mountHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      mountHookTypesDev();
      return mountDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      mountHookTypesDev();
      return mountDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      mountHookTypesDev();
      return mountTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      mountHookTypesDev();
      return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      mountHookTypesDev();
      return mountId();
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      mountHookTypesDev();
      warnOnUseFormStateInDev();
      return mountActionState(action, initialState, permalink);
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      mountHookTypesDev();
      return mountActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      mountHookTypesDev();
      return mountOptimistic(passthrough, reducer);
    },
    useHostTransitionStatus,
    useMemoCache,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      mountHookTypesDev();
      return mountRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      mountHookTypesDev();
      return mountEvent(callback);
    },
  };

  HooksDispatcherOnMountWithHookTypesInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      return readContext(context);
    },
    use,
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      updateHookTypesDev();
      return mountCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      updateHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      updateHookTypesDev();
      return mountEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      updateHookTypesDev();
      return mountImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      updateHookTypesDev();
      return mountInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      updateHookTypesDev();
      return mountLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      updateHookTypesDev();
      return mountRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      updateHookTypesDev();
      return mountDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      updateHookTypesDev();
      return mountDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      updateHookTypesDev();
      return mountTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      updateHookTypesDev();
      return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      updateHookTypesDev();
      return mountId();
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      updateHookTypesDev();
      return mountActionState(action, initialState, permalink);
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      updateHookTypesDev();
      warnOnUseFormStateInDev();
      return mountActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      updateHookTypesDev();
      return mountOptimistic(passthrough, reducer);
    },
    useHostTransitionStatus,
    useMemoCache,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      updateHookTypesDev();
      return mountRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      updateHookTypesDev();
      return mountEvent(callback);
    },
  };

  HooksDispatcherOnUpdateInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      return readContext(context);
    },
    use,
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      updateHookTypesDev();
      return updateCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      updateHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      updateHookTypesDev();
      return updateEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      updateHookTypesDev();
      return updateImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      updateHookTypesDev();
      return updateInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      updateHookTypesDev();
      return updateLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      updateHookTypesDev();
      return updateRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      updateHookTypesDev();
      return updateDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      updateHookTypesDev();
      return updateDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      updateHookTypesDev();
      return updateTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      updateHookTypesDev();
      return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      updateHookTypesDev();
      return updateId();
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      updateHookTypesDev();
      warnOnUseFormStateInDev();
      return updateActionState(action, initialState, permalink);
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      updateHookTypesDev();
      return updateActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      updateHookTypesDev();
      return updateOptimistic(passthrough, reducer);
    },
    useHostTransitionStatus,
    useMemoCache,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      updateHookTypesDev();
      return updateRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      updateHookTypesDev();
      return updateEvent(callback);
    },
  };

  HooksDispatcherOnRerenderInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      return readContext(context);
    },
    use,
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      updateHookTypesDev();
      return updateCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      updateHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      updateHookTypesDev();
      return updateEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      updateHookTypesDev();
      return updateImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      updateHookTypesDev();
      return updateInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      updateHookTypesDev();
      return updateLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnRerenderInDEV;
      try {
        return updateMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnRerenderInDEV;
      try {
        return rerenderReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      updateHookTypesDev();
      return updateRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnRerenderInDEV;
      try {
        return rerenderState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      updateHookTypesDev();
      return updateDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      updateHookTypesDev();
      return rerenderDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      updateHookTypesDev();
      return rerenderTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      updateHookTypesDev();
      return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      updateHookTypesDev();
      return updateId();
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      updateHookTypesDev();
      warnOnUseFormStateInDev();
      return rerenderActionState(action, initialState, permalink);
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      updateHookTypesDev();
      return rerenderActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      updateHookTypesDev();
      return rerenderOptimistic(passthrough, reducer);
    },
    useHostTransitionStatus,
    useMemoCache,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      updateHookTypesDev();
      return updateRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      updateHookTypesDev();
      return updateEvent(callback);
    },
  };

  InvalidNestedHooksDispatcherOnMountInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      warnInvalidContextAccess();
      return readContext(context);
    },
    use<T>(usable: Usable<T>): T {
      warnInvalidHookAccess();
      return use(usable);
    },
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      warnInvalidHookAccess();
      mountHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      warnInvalidHookAccess();
      mountHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      warnInvalidHookAccess();
      mountHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
      try {
        return mountState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountId();
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountActionState(action, initialState, permalink);
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountOptimistic(passthrough, reducer);
    },
    useMemoCache(size: number): Array<any> {
      warnInvalidHookAccess();
      return useMemoCache(size);
    },
    useHostTransitionStatus,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      mountHookTypesDev();
      return mountRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      warnInvalidHookAccess();
      mountHookTypesDev();
      return mountEvent(callback);
    },
  };

  InvalidNestedHooksDispatcherOnUpdateInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      warnInvalidContextAccess();
      return readContext(context);
    },
    use<T>(usable: Usable<T>): T {
      warnInvalidHookAccess();
      return use(usable);
    },
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateId();
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateActionState(action, initialState, permalink);
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateOptimistic(passthrough, reducer);
    },
    useMemoCache(size: number): Array<any> {
      warnInvalidHookAccess();
      return useMemoCache(size);
    },
    useHostTransitionStatus,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      updateHookTypesDev();
      return updateRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateEvent(callback);
    },
  };

  InvalidNestedHooksDispatcherOnRerenderInDEV = {
    readContext<T>(context: ReactContext<T>): T {
      warnInvalidContextAccess();
      return readContext(context);
    },
    use<T>(usable: Usable<T>): T {
      warnInvalidHookAccess();
      return use(usable);
    },
    useCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useCallback';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateCallback(callback, deps);
    },
    useContext<T>(context: ReactContext<T>): T {
      currentHookNameInDev = 'useContext';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return readContext(context);
    },
    useEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateEffect(create, deps);
    },
    useImperativeHandle<T>(
      ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
      create: () => T,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useImperativeHandle';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateImperativeHandle(ref, create, deps);
    },
    useInsertionEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useInsertionEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateInsertionEffect(create, deps);
    },
    useLayoutEffect(
      create: () => (() => void) | void,
      deps: Array<mixed> | void | null,
    ): void {
      currentHookNameInDev = 'useLayoutEffect';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateLayoutEffect(create, deps);
    },
    useMemo<T>(create: () => T, deps: Array<mixed> | void | null): T {
      currentHookNameInDev = 'useMemo';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateMemo(create, deps);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useReducer<S, I, A>(
      reducer: (S, A) => S,
      initialArg: I,
      init?: I => S,
    ): [S, Dispatch<A>] {
      currentHookNameInDev = 'useReducer';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return rerenderReducer(reducer, initialArg, init);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useRef<T>(initialValue: T): {current: T} {
      currentHookNameInDev = 'useRef';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateRef(initialValue);
    },
    useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return rerenderState(initialState);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
    useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void {
      currentHookNameInDev = 'useDebugValue';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateDebugValue(value, formatterFn);
    },
    useDeferredValue<T>(value: T, initialValue?: T): T {
      currentHookNameInDev = 'useDeferredValue';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return rerenderDeferredValue(value, initialValue);
    },
    useTransition(): [boolean, (() => void) => void] {
      currentHookNameInDev = 'useTransition';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return rerenderTransition();
    },
    useSyncExternalStore<T>(
      subscribe: (() => void) => () => void,
      getSnapshot: () => T,
      getServerSnapshot?: () => T,
    ): T {
      currentHookNameInDev = 'useSyncExternalStore';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    },
    useId(): string {
      currentHookNameInDev = 'useId';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateId();
    },
    useFormState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useFormState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return rerenderActionState(action, initialState, permalink);
    },
    useActionState<S, P>(
      action: (Awaited<S>, P) => S,
      initialState: Awaited<S>,
      permalink?: string,
    ): [Awaited<S>, (P) => void, boolean] {
      currentHookNameInDev = 'useActionState';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return rerenderActionState(action, initialState, permalink);
    },
    useOptimistic<S, A>(
      passthrough: S,
      reducer: ?(S, A) => S,
    ): [S, (A) => void] {
      currentHookNameInDev = 'useOptimistic';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return rerenderOptimistic(passthrough, reducer);
    },
    useMemoCache(size: number): Array<any> {
      warnInvalidHookAccess();
      return useMemoCache(size);
    },
    useHostTransitionStatus,
    useCacheRefresh() {
      currentHookNameInDev = 'useCacheRefresh';
      updateHookTypesDev();
      return updateRefresh();
    },
    useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
      callback: F,
    ): F {
      currentHookNameInDev = 'useEffectEvent';
      warnInvalidHookAccess();
      updateHookTypesDev();
      return updateEvent(callback);
    },
  };
}
