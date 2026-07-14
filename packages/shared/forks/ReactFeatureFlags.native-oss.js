/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as FeatureFlagsType from 'shared/ReactFeatureFlags';
import typeof * as ExportsType from './ReactFeatureFlags.native-oss';

// TODO: Align these flags with canary and delete this file once RN ships from Canary.

// -----------------------------------------------------------------------------
// All flags
// -----------------------------------------------------------------------------
export const alwaysThrottleRetries: boolean = false;
export const disableClientCache: boolean = true;
export const disableCommentsAsDOMContainers: boolean = true;
export const disableInputAttributeSyncing: boolean = false;
export const disableLegacyContext: boolean = true;
export const disableLegacyContextForFunctionComponents: boolean = true;
export const disableLegacyMode: boolean = false;
export const disableSchedulerTimeoutInWorkLoop: boolean = false;
export const disableTextareaChildren: boolean = false;
export const enableAsyncDebugInfo: boolean = true;
export const enableAsyncIterableChildren: boolean = false;
export const enableCPUSuspense: boolean = false;
export const enableCreateEventHandleAPI: boolean = false;
export const enableMoveBefore: boolean = true;
export const enableFizzExternalRuntime: boolean = true;
export const enableInfiniteRenderLoopDetection: boolean = false;
export const enableInfiniteRenderLoopDetectionForceThrow: boolean = false;
export const enableLegacyCache: boolean = false;
export const enableLegacyFBSupport: boolean = false;
export const enableLegacyHidden: boolean = false;
export const enableNoCloningMemoCache: boolean = false;
export const enableObjectFiber: boolean = false;
export const enableReactTestRendererWarning: boolean = false;
export const enableRetryLaneExpiration: boolean = false;
export const enableComponentPerformanceTrack: boolean = true;
export const enablePerformanceIssueReporting: boolean = false;
export const enableSchedulingProfiler: boolean =
  !enableComponentPerformanceTrack && __PROFILE__;
export const enableScopeAPI: boolean = false;
export const enableSuspenseAvoidThisFallback: boolean = false;
export const enableSuspenseCallback: boolean = false;
export const enableTaint: boolean = true;
export const enableTransitionTracing: boolean = false;
export const enableTrustedTypesIntegration: boolean = true;
export const passChildrenWhenCloningPersistedNodes: boolean = false;
export const retryLaneExpirationMs = 5000;
export const syncLaneExpirationMs = 250;
export const transitionLaneExpirationMs = 5000;

export const enableYieldingBeforePassive: boolean = false;

export const enableThrottledScheduling: boolean = false;
export const enableViewTransition: boolean = true;
export const enableViewTransitionParentEnterExit: boolean = false;
export const enableViewTransitionForPersistenceMode: boolean = false;
export const enableGestureTransition: boolean = false;
export const enableScrollEndPolyfill: boolean = true;
export const enableSuspenseyImages: boolean = false;
export const enableFizzBlockingRender: boolean = true;
export const enableSrcObject: boolean = false;
export const enableHydrationChangeEvent: boolean = false;
export const enableDefaultTransitionIndicator: boolean = false;
export const ownerStackLimit = 1e4;

export const enableFragmentRefs: boolean = true;
export const enableFragmentRefsScrollIntoView: boolean = false;
export const enableFragmentRefsInstanceHandles: boolean = true;
export const enableFragmentRefsTextNodes: boolean = true;

export const enableInternalInstanceMap: boolean = false;

export const enableOptimisticKey: boolean = false;

// Profiling Only
export const enableProfilerTimer: boolean = __PROFILE__;
export const enableProfilerCommitHooks: boolean = __PROFILE__;
export const enableProfilerNestedUpdatePhase: boolean = __PROFILE__;
export const enableUpdaterTracking: boolean = __PROFILE__;
export const enableParallelTransitions: boolean = false;

export const eprh_enableUseKeyedStateCompilerLint: boolean = false;
export const eprh_enableVerboseNoSetStateInEffectCompilerLint: boolean = false;
export const eprh_enableExhaustiveEffectDependenciesCompilerLint:
  | 'off'
  | 'all'
  | 'extra-only'
  | 'missing-only' = 'off';

// Flow magic to verify the exports of this file match the original version.
null as any as ExportsType as FeatureFlagsType as ExportsType;
