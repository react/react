/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

declare const __REACT_DEVTOOLS_GLOBAL_HOOK__: Object | void;

export function injectInternals(internals: Object): boolean {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
    // No DevTools
    return false;
  }
  const hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook.isDisabled) {
    // This isn't a real property on the hook, but it can be set to opt out
    // of DevTools integration and associated warnings and logs.
    // https://github.com/facebook/react/issues/3877
    return true;
  }
  if (!hook.supportsFlight) {
    // DevTools exists, even though it doesn't support Flight.
    return true;
  }
  try {
    hook.inject(internals);
  } catch (err) {
    // Catch all errors because it is unsafe to throw during initialization.
    if (__DEV__) {
      console.error('React instrumentation encountered an error: %o.', err);
    }
  }
  if (hook.checkDCE) {
    // This is the real DevTools.
    return true;
  } else {
    // This is likely a hook installed by Fast Refresh runtime.
    return false;
  }
}
