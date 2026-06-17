/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as FeatureFlagsType from 'shared/ReactFeatureFlags';
import typeof * as ExportsType from './ReactFeatureFlags.test-renderer';

export const alwaysThrottleRetries = false;
export const disableClientCache = true;
export const disableCommentsAsDOMContainers = true;
export const disableInputAttributeSyncing = false;
export const disableLegacyContext = false;
export const disableLegacyContextForFunctionComponents = false;
export const disableLegacyMode = false;
export const disableSchedulerTimeoutInWorkLoop = false;
export const disableTextareaChildren = false;
export const enableAsyncDebugInfo = true;
export const enableAsyncIterableChildren = false;
export const enableCPUSuspense = true;
export const enableCreateEventHandleAPI = false;
export const enableMoveBefore = false;
export const enableFizzExternalRuntime = true;
export const enableInfiniteRenderLoopDetection = false;
export const enableLegacyCache = false;
export const enableLegacyFBSupport = false;
export const enableLegacyHidden = false;
export const enableNoCloningMemoCache = false;
export const enableObjectFiber = false;
export const enableProfilerCommitHooks = __PROFILE__;
export const enableProfilerNestedUpdatePhase = __PROFILE__;
export const enableProfilerTimer = __PROFILE__;
export const enableReactTestRendererWarning = false;
export const enableRetryLaneExpiration = false;
export const enableSchedulingProfiler = __PROFILE__;
export const enableComponentPerformanceTrack = false;
export const enablePerformanceIssueReporting = false;
export const enableScopeAPI = false;
export const enableEagerAlternateStateNodeCleanup = true;
export const enableEffectEventMutationPhase = false;
export const enableSuspenseAvoidThisFallback = false;
export const enableSuspenseCallback = false;
export const enableTaint = true;
export const enableTransitionTracing = false;
export const enableTrustedTypesIntegration = true;
export const enableUpdaterTracking = false;
export const passChildrenWhenCloningPersistedNodes = false;
export const retryLaneExpirationMs = 5000;
export const syncLaneExpirationMs = 250;
export const transitionLaneExpirationMs = 5000;
export const enableYieldingBeforePassive = false;
export const enableThrottledScheduling = false;
export const enableViewTransition = true;
export const enableViewTransitionForPersistenceMode = false;
export const enableGestureTransition = false;
export const enableScrollEndPolyfill = true;
export const enableSuspenseyImages = false;
export const enableFizzBlockingRender = true;
export const enableSrcObject = false;
export const enableHydrationChangeEvent = false;
export const enableDefaultTransitionIndicator = true;
export const enableFragmentRefs = false;
export const enableFragmentRefsScrollIntoView = false;
export const enableFragmentRefsInstanceHandles = false;
export const enableFragmentRefsTextNodes = false;
export const ownerStackLimit = 1e4;
export const enableOptimisticKey = false;
export const enableParallelTransitions = false;

export const eprh_enableUseKeyedStateCompilerLint: boolean = false;
export const eprh_enableVerboseNoSetStateInEffectCompilerLint: boolean = false;
export const eprh_enableExhaustiveEffectDependenciesCompilerLint:
  | 'off'
  | 'all'
  | 'extra-only'
  | 'missing-only' = 'off';

// Flow magic to verify the exports of this file match the original version.
null as any as ExportsType as FeatureFlagsType as ExportsType;
