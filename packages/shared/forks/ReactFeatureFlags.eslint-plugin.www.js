/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// This fork provides www-specific feature flag values for
// eslint-plugin-react-hooks without pulling in the full
// ReactFeatureFlags.www.js fork. The full fork imports dynamic flags
// via require('ReactFeatureFlags'), which is a www Haste module that
// doesn't exist in Node.js environments where the ESLint plugin runs.
//
// Only eprh_* flags are needed by the ESLint plugin.

export const eprh_enableUseKeyedStateCompilerLint: boolean = true;
export const eprh_enableVerboseNoSetStateInEffectCompilerLint: boolean = true;
export const eprh_enableExhaustiveEffectDependenciesCompilerLint:
  | 'off'
  | 'all'
  | 'extra-only'
  | 'missing-only' = 'extra-only';
