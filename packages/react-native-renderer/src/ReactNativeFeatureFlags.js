/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// These globals are set by React Native (e.g. in setUpDOM.js, setUpTimers.js)
// and provide access to RN's feature flags. We use global functions because we
// don't have another mechanism to pass feature flags from RN to React in OSS.
// Values are lazily evaluated and cached on first access.

let _enableNativeEventTargetEventDispatching: boolean | null = null;
export function enableNativeEventTargetEventDispatching(): boolean {
  if (_enableNativeEventTargetEventDispatching == null) {
    _enableNativeEventTargetEventDispatching =
      typeof RN$isNativeEventTargetEventDispatchingEnabled === 'function' &&
      RN$isNativeEventTargetEventDispatchingEnabled();
  }
  return _enableNativeEventTargetEventDispatching;
}
