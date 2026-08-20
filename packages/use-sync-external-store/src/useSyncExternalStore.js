/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

'use strict';

// Intentionally not using named imports because Rollup uses dynamic
// dispatch for CommonJS interop named imports.
import * as React from 'react';

export const useSyncExternalStore = React.useSyncExternalStore;

if (__DEV__) {
  // Avoid transforming the `console.error` call as it would cause the built artifact
  // to access React internals, which exist under different paths depending on the
  // React version.
  console['error'](
    "The main 'use-sync-external-store' entry point is not supported; all it " +
      "does is re-export useSyncExternalStore from the 'react' package, so " +
      'it only works with React 18+.' +
      '\n\n' +
      'If you wish to support React 16 and 17, import from ' +
      "'use-sync-external-store/shim' instead. It will fall back to a shimmed " +
      'implementation when the native one is not available.' +
      '\n\n' +
      "If you only support React 18+, you can import directly from 'react'.",
  );
}
