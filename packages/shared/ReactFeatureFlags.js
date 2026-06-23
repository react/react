/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// -----------------------------------------------------------------------------
// Land or remove (zero effort)
//
// Flags that can likely be deleted or landed without consequences
// -----------------------------------------------------------------------------

// None

// -----------------------------------------------------------------------------
// Killswitch
//
// Flags that exist solely to turn off a change in case it causes a regression
// when it rolls out to prod. We should remove these as soon as possible.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Land or remove (moderate effort)
//
// Flags that can be probably deleted or landed, but might require extra effort
// like migrating internal callers or performance testing.
// -----------------------------------------------------------------------------

// Need to remove didTimeout argument from Scheduler before landing
export const disableSchedulerTimeoutInWorkLoop: boolean = false;

// -----------------------------------------------------------------------------
// Slated for removal in the future (significant effort)
//
// These are experiments that didn't work out, and never shipped, but we can't
// delete from the codebase until we migrate internal callers.
// -----------------------------------------------------------------------------

// Add a callback property to suspense to notify which promises are currently
// in the update queue. This allows reporting and tracing of what is causing
// the user to see a loading state.
//
// Also allows hydration callbacks to fire when a dehydrated boundary gets
// hydrated or deleted.
//
// This will eventually be replaced by the Transition Tracing proposal.
export const enableSuspenseCallback: boolean = false;

// Experimental Scope support.
export const enableScopeAPI: boolean = false;

// Experimental Create Event Handle API.
export const enableCreateEventHandleAPI: boolean = false;

// Support legacy Primer support on internal FB www
export const enableLegacyFBSupport: boolean = false;

// -----------------------------------------------------------------------------
// Ongoing experiments
//
// These are features that we're either actively exploring or are reasonably
// likely to include in an upcoming release.
// -----------------------------------------------------------------------------

// Yield to the browser event loop and not just the scheduler event loop before passive effects.
// Fix gated tests that fail with this flag enabled before turning it back on.
export const enableYieldingBeforePassive: boolean = false;

// Experiment to intentionally yield less to block high framerate animations.
export const enableThrottledScheduling: boolean = false;

export const enableLegacyCache = __EXPERIMENTAL__;

export const enableAsyncIterableChildren = __EXPERIMENTAL__;

export const enableTaint = __EXPERIMENTAL__;

export const enableViewTransition: boolean = true;

export const enableViewTransitionForPersistenceMode: boolean = false;

export const enableGestureTransition = __EXPERIMENTAL__;

export const enableScrollEndPolyfill = __EXPERIMENTAL__;

export const enableSuspenseyImages: boolean = false;

export const enableFizzBlockingRender = __EXPERIMENTAL__; // rel="expect"

export const enableSrcObject = __EXPERIMENTAL__;

export const enableHydrationChangeEvent = __EXPERIMENTAL__;

export const enableDefaultTransitionIndicator = __EXPERIMENTAL__;

export const enableOptimisticKey = __EXPERIMENTAL__;

/**
 * Switches Fiber creation to a simple object instead of a constructor.
 */
export const enableObjectFiber: boolean = false;

export const enableTransitionTracing: boolean = false;

// FB-only usage. The new API has different semantics.
export const enableLegacyHidden: boolean = false;

// Enables unstable_avoidThisFallback feature in Fiber
export const enableSuspenseAvoidThisFallback: boolean = false;

export const enableCPUSuspense = __EXPERIMENTAL__;

// Test this at Meta before enabling.
export const enableNoCloningMemoCache: boolean = false;

// Test in www before enabling in open source.
// Enables DOM-server to stream its instruction set as data-attributes
// (handled with an MutationObserver) instead of inline-scripts
export const enableFizzExternalRuntime = __EXPERIMENTAL__;

export const alwaysThrottleRetries: boolean = true;

// Gate whether useEffectEvent uses the mutation phase (true) or before-mutation
// phase (false) for updating event function references.
export const enableEffectEventMutationPhase: boolean = false;

export const passChildrenWhenCloningPersistedNodes: boolean = false;

export const enableEagerAlternateStateNodeCleanup: boolean = true;

/**
 * Enables an expiration time for retry lanes to avoid starvation.
 */
export const enableRetryLaneExpiration: boolean = false;
export const retryLaneExpirationMs = 5000;
export const syncLaneExpirationMs = 250;
export const transitionLaneExpirationMs = 5000;

/**
 * Enables a new error detection for infinite render loops from updates caused
 * by setState or similar outside of the component owning the state.
 */
export const enableInfiniteRenderLoopDetection: boolean = false;
/**
 * When `enableInfiniteRenderLoopDetection` is on, forces the detection
 * mechanism to throw instead of only warning in cases where it would
 * otherwise downgrade to a warning.
 */
export const enableInfiniteRenderLoopDetectionForceThrow: boolean = false;

export const enableFragmentRefs: boolean = true;
export const enableFragmentRefsScrollIntoView: boolean = true;
export const enableFragmentRefsInstanceHandles: boolean = true;
export const enableFragmentRefsTextNodes: boolean = true;

export const enableInternalInstanceMap: boolean = false;

// -----------------------------------------------------------------------------
// Ready for next major.
//
// Alias __NEXT_MAJOR__ to __EXPERIMENTAL__ for easier skimming.
// -----------------------------------------------------------------------------

// TODO: Anything that's set to `true` in this section should either be cleaned
// up (if it's on everywhere, including Meta and RN builds) or moved to a
// different section of this file.

// const __NEXT_MAJOR__ = __EXPERIMENTAL__;

/**
 * Removes legacy style context defined using static `contextTypes` and consumed with static `childContextTypes`.
 */
export const disableLegacyContext: boolean = true;
/**
 * Removes legacy style context just from function components.
 */
export const disableLegacyContextForFunctionComponents: boolean = true;

// Enable the moveBefore() alternative to insertBefore(). This preserves states of moves.
export const enableMoveBefore: boolean = false;

// Disabled caching behavior of `react/cache` in client runtimes.
export const disableClientCache: boolean = true;

// Warn on any usage of ReactTestRenderer
export const enableReactTestRendererWarning: boolean = true;

// Disables legacy mode
// This allows us to land breaking changes to remove legacy mode APIs in experimental builds
// before removing them in stable in the next Major
export const disableLegacyMode: boolean = true;

// -----------------------------------------------------------------------------
// Chopping Block
//
// Planned feature deprecations and breaking changes. Sorted roughly in order of
// when we plan to enable them.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// React DOM Chopping Block
//
// Similar to main Chopping Block but only flags related to React DOM. These are
// grouped because we will likely batch all of them into a single major release.
// -----------------------------------------------------------------------------

// Disable support for comment nodes as React DOM containers. Already disabled
// in open source, but www codebase still relies on it. Need to remove.
export const disableCommentsAsDOMContainers: boolean = true;

export const enableTrustedTypesIntegration: boolean = true;

// Prevent the value and checked attributes from syncing with their related
// DOM properties
export const disableInputAttributeSyncing: boolean = false;

// Disables children for <textarea> elements
export const disableTextareaChildren: boolean = false;

// Disables children for <textarea> elements
export const enableParallelTransitions: boolean = false;

// -----------------------------------------------------------------------------
// Debugging and DevTools
// -----------------------------------------------------------------------------

// Gather advanced timing metrics for Profiler subtrees.
export const enableProfilerTimer = __PROFILE__;

// Adds performance.measure() marks using Chrome extensions to allow formatted
// Component rendering tracks to show up in the Performance tab.
// This flag will be used for both Server Component and Client Component tracks.
// All calls should also be gated on enableProfilerTimer.
export const enableComponentPerformanceTrack: boolean = true;

// Enables annotating of React performance track events with `performanceIssue`
// metadata, to more prominently highlight performance issues to users
// (initially, an experimental feature in React Native).
export const enablePerformanceIssueReporting: boolean = false;

// Adds user timing marks for e.g. state updates, suspense, and work loop stuff,
// for an experimental timeline tool.
export const enableSchedulingProfiler: boolean =
  !enableComponentPerformanceTrack && __PROFILE__;

// Record durations for commit and passive effects phases.
export const enableProfilerCommitHooks = __PROFILE__;

// Phase param passed to onRender callback differentiates between an "update" and a "cascading-update".
export const enableProfilerNestedUpdatePhase = __PROFILE__;

export const enableAsyncDebugInfo: boolean = true;

// Track which Fiber(s) schedule render work.
export const enableUpdaterTracking = __PROFILE__;

export const ownerStackLimit = 1e4;

// -----------------------------------------------------------------------------
// eslint-plugin-react-hooks
// -----------------------------------------------------------------------------
export const eprh_enableUseKeyedStateCompilerLint: boolean = false;
export const eprh_enableVerboseNoSetStateInEffectCompilerLint: boolean = false;
export const eprh_enableExhaustiveEffectDependenciesCompilerLint:
  | 'off'
  | 'all'
  | 'extra-only'
  | 'missing-only' = 'off';
