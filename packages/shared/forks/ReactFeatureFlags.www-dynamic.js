/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// In www, these flags are controlled by GKs. Because most GKs have some
// population running in either mode, we should run our tests that way, too,
//
// Use __VARIANT__ to simulate a GK. The tests will be run twice: once
// with the __VARIANT__ set to `true`, and once set to `false`.

export const alwaysThrottleRetries: boolean = __VARIANT__;
export const disableLegacyContextForFunctionComponents: boolean = __VARIANT__;
export const disableSchedulerTimeoutInWorkLoop: boolean = __VARIANT__;
export const enableNoCloningMemoCache: boolean = __VARIANT__;
export const enableObjectFiber: boolean = __VARIANT__;
export const enableRetryLaneExpiration: boolean = __VARIANT__;
export const enableTransitionTracing: boolean = __VARIANT__;
export const retryLaneExpirationMs = 5000;
export const syncLaneExpirationMs = 250;
export const transitionLaneExpirationMs = 5000;

export const enableSchedulingProfiler: boolean = __VARIANT__;

export const enableInfiniteRenderLoopDetection: boolean = __VARIANT__;
export const enableInfiniteRenderLoopDetectionForceThrow: boolean = __VARIANT__;

export const enableFastAddPropertiesInDiffing: boolean = __VARIANT__;
export const enableSuspenseyImages: boolean = __VARIANT__;
export const enableViewTransition: boolean = __VARIANT__;
export const enableScrollEndPolyfill: boolean = __VARIANT__;
export const enableFragmentRefs: boolean = __VARIANT__;
export const enableFragmentRefsScrollIntoView: boolean = __VARIANT__;
export const enableFragmentRefsTextNodes: boolean = __VARIANT__;
export const enableInternalInstanceMap: boolean = __VARIANT__;
export const enableParallelTransitions: boolean = __VARIANT__;
export const enableYieldingBeforePassive: boolean = __VARIANT__;

export const enableEffectEventMutationPhase: boolean = __VARIANT__;

// TODO: These flags are hard-coded to the default values used in open source.
// Update the tests so that they pass in either mode, then set these
// to __VARIANT__.
// You probably *don't* want to add more hardcoded ones.
// Instead, try to add them above with the __VARIANT__ value.
