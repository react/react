/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// In xplat, these flags are controlled by GKs. Because most GKs have some
// population running in either mode, we should run our tests that way, too,
//
// Use __VARIANT__ to simulate a GK. The tests will be run twice: once
// with the __VARIANT__ set to `true`, and once set to `false`.
//
// TODO: __VARIANT__ isn't supported for React Native flags yet. You can set the
// flag here but it won't be set to `true` in any of our test runs. Need to
// add a test configuration for React Native.

export const alwaysThrottleRetries = __VARIANT__;
export const enableObjectFiber = __VARIANT__;
export const passChildrenWhenCloningPersistedNodes = __VARIANT__;
export const enableFragmentRefs = __VARIANT__;
export const enableFragmentRefsScrollIntoView = __VARIANT__;
export const enableFragmentRefsInstanceHandles = __VARIANT__;
export const enableEffectEventMutationPhase = __VARIANT__;
export const enableFragmentRefsTextNodes = __VARIANT__;
export const enableViewTransitionForPersistenceMode = __VARIANT__;
