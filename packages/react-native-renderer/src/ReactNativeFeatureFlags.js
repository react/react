/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Modules provided by RN:
import {ReactNativeFeatureFlags} from 'react-native/react-private-interface';

// These accessors are provided by React Native and give us access to RN's
// feature flags. Both the object and each accessor on it are treated as
// optional so that removing a flag on the React Native side doesn't throw here.
// Values are lazily evaluated and cached on first access.

let _enableNativeEventTargetEventDispatching: boolean | null = null;
export function enableNativeEventTargetEventDispatching(): boolean {
  if (_enableNativeEventTargetEventDispatching == null) {
    const isEnabled =
      ReactNativeFeatureFlags != null
        ? ReactNativeFeatureFlags.enableNativeEventTargetEventDispatching
        : null;
    _enableNativeEventTargetEventDispatching =
      typeof isEnabled === 'function' && isEnabled();
  }
  return _enableNativeEventTargetEventDispatching;
}
