/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as FeatureFlagsType from 'shared/ReactFeatureFlags';
import typeof * as ExportsType from './ReactFeatureFlags.www';
import typeof * as DynamicFeatureFlags from './ReactFeatureFlags.www-dynamic';

// Re-export dynamic flags from the www version.
const dynamicFeatureFlags: DynamicFeatureFlags = require('ReactFeatureFlags');

export const {
  alwaysThrottleRetries,
  disableLegacyContextForFunctionComponents,
  disableSchedulerTimeoutInWorkLoop,
  enableEffectEventMutationPhase,
  enableInfiniteRenderLoopDetection,
  enableInfiniteRenderLoopDetectionForceThrow,
  enableNoCloningMemoCache,
  enableObjectFiber,
  enableRetryLaneExpiration,
  enableTransitionTracing,
  retryLaneExpirationMs,
  syncLaneExpirationMs,
  transitionLaneExpirationMs,
  enableSuspenseyImages,
  enableViewTransition,
  enableScrollEndPolyfill,
  enableFragmentRefs,
  enableFragmentRefsScrollIntoView,
  enableFragmentRefsTextNodes,
  enableInternalInstanceMap,
  enableParallelTransitions,
  enableViewTransitionParentEnterExit,
} = dynamicFeatureFlags;

// On WWW, __EXPERIMENTAL__ is used for a new modern build.
// It's not used anywhere in production yet.

export const enableProfilerTimer = __PROFILE__;
export const enableProfilerCommitHooks = __PROFILE__;
export const enableProfilerNestedUpdatePhase = __PROFILE__;
export const enableUpdaterTracking = __PROFILE__;
export const enableTrustedTypesIntegration: boolean = true;
export const enableSuspenseAvoidThisFallback: boolean = true;

export const enableAsyncDebugInfo: boolean = true;
export const enableCPUSuspense: boolean = true;
export const enableMoveBefore: boolean = false;
export const disableInputAttributeSyncing: boolean = false;
export const enableLegacyFBSupport: boolean = true;

export const enableYieldingBeforePassive: boolean = false;

export const enableThrottledScheduling: boolean = false;

export const enableComponentPerformanceTrack: boolean = true;

export const enablePerformanceIssueReporting: boolean = false;

// Logs additional User Timing API marks for use with an experimental profiling tool.
export const enableSchedulingProfiler: boolean =
  __PROFILE__ && dynamicFeatureFlags.enableSchedulingProfiler;

export const disableLegacyContext = __EXPERIMENTAL__;

export const enableLegacyCache: boolean = true;

export const enableAsyncIterableChildren: boolean = false;

export const enableTaint: boolean = false;

// TODO: www currently relies on this feature. It's disabled in open source.
// Need to remove it.
export const disableCommentsAsDOMContainers: boolean = false;

export const enableCreateEventHandleAPI: boolean = true;

export const enableScopeAPI: boolean = true;

export const enableSuspenseCallback: boolean = true;

export const enableLegacyHidden: boolean = true;

export const disableTextareaChildren = __EXPERIMENTAL__;

export const enableFizzExternalRuntime: boolean = true;

export const passChildrenWhenCloningPersistedNodes: boolean = false;

export const disableClientCache: boolean = true;

export const enableReactTestRendererWarning: boolean = false;

export const disableLegacyMode: boolean = true;

export const enableViewTransitionForPersistenceMode: boolean = false;

export const enableGestureTransition: boolean = false;

export const enableFizzBlockingRender: boolean = true;
export const enableSrcObject: boolean = false;
export const enableHydrationChangeEvent: boolean = false;
export const enableDefaultTransitionIndicator: boolean = true;

export const ownerStackLimit = 1e4;

export const enableFragmentRefsInstanceHandles: boolean = true;

export const enableOptimisticKey: boolean = false;

// These flags are only used by eslint-plugin-react-hooks, which has its own
// fork at ReactFeatureFlags.eslint-plugin.www.js with the www-specific values.
// Edit that file to change the www values for these flags.
export const eprh_enableUseKeyedStateCompilerLint: boolean = false;
export const eprh_enableVerboseNoSetStateInEffectCompilerLint: boolean = false;
export const eprh_enableExhaustiveEffectDependenciesCompilerLint:
  | 'off'
  | 'all'
  | 'extra-only'
  | 'missing-only' = 'off';

// Flow magic to verify the exports of this file match the original version.
null as any as ExportsType as FeatureFlagsType as ExportsType;
