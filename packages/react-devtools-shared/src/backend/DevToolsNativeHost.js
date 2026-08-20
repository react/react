/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {HostInstance} from './types';

// Some environments (e.g. React Native / Hermes) don't support the performance API yet.
export const getCurrentTime: () => number =
  // $FlowFixMe[method-unbinding]
  typeof performance === 'object' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

// Ideally, this should be injected from Reconciler config
export function getPublicInstance(instance: HostInstance): HostInstance {
  // Typically the PublicInstance and HostInstance is the same thing but not in Fabric.
  // So we need to detect this and use that as the public instance.

  // React Native. Modern. Fabric.
  if (typeof instance === 'object' && instance !== null) {
    if (typeof instance.canonical === 'object' && instance.canonical !== null) {
      if (
        typeof instance.canonical.publicInstance === 'object' &&
        instance.canonical.publicInstance !== null
      ) {
        return instance.canonical.publicInstance;
      }
    }

    // React Native. Legacy. Paper.
    if (typeof instance._nativeTag === 'number') {
      return instance._nativeTag;
    }
  }

  // React Web. Usually a DOM element.
  return instance;
}

export function getNativeTag(instance: HostInstance): number | null {
  if (typeof instance !== 'object' || instance === null) {
    return null;
  }

  // Modern. Fabric.
  if (
    instance.canonical != null &&
    typeof instance.canonical.nativeTag === 'number'
  ) {
    return instance.canonical.nativeTag;
  }

  // Legacy.  Paper.
  if (typeof instance._nativeTag === 'number') {
    return instance._nativeTag;
  }

  return null;
}
