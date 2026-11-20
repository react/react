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

// The key used for HostInstances tracked by the DevTools backend maps
// (e.g. publicInstanceToDevToolsInstanceMap).
//
// In React Native's Fabric renderer, a host instance is a `{node, canonical}`
// wrapper whose `canonical.publicInstance` is created lazily. Keying by the
// public instance (or by the wrapper) is unstable: an acquire that runs before
// the public instance exists keys by the wrapper, while a later release keys
// by the public instance, so the release misses and the unmounted instance is
// retained. `canonical` is stable across lazy public instance creation (and
// across persistent-mode wrapper clones), so Fabric instances are keyed by it.
// Public instances handed back in (e.g. from native inspect APIs) are
// normalized through their internal handle to the same key. Paper and DOM
// keying behavior is unchanged.
export function getHostInstanceKey(instance: HostInstance): HostInstance {
  if (typeof instance === 'object' && instance !== null) {
    // React Native. Modern. Fabric.
    if (typeof instance.canonical === 'object' && instance.canonical !== null) {
      return instance.canonical;
    }
    // A lazily created Fabric public instance: normalize back to canonical.
    const internalHandle = instance.__internalInstanceHandle;
    if (
      typeof internalHandle === 'object' &&
      internalHandle !== null &&
      typeof internalHandle.stateNode === 'object' &&
      internalHandle.stateNode !== null &&
      typeof internalHandle.stateNode.canonical === 'object' &&
      internalHandle.stateNode.canonical !== null
    ) {
      return internalHandle.stateNode.canonical;
    }
  }
  return getPublicInstance(instance);
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
