/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Renderers that don't support mutation
// can re-export everything from this module.

function shim(...args: any): any {
  throw new Error(
    'The current renderer does not support Singletons. ' +
      'This error is likely caused by a bug in React. ' +
      'Please file an issue.',
  );
}

// Resources (when unsupported)
export const supportsSingletons = false;
export const resolveSingletonInstance = shim;
export const acquireSingletonInstance = shim;
export const releaseSingletonInstance = shim;
export const isHostSingletonType = shim;
export const isSingletonScope = shim;
