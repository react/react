/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {register} from './DevToolsCdtMcp';

// Side effect: install the facade (before React) and register the React tool
// group for chrome-devtools-mcp. Import this module before React.
if (
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function' &&
  typeof window.removeEventListener === 'function'
) {
  register();
} else {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(
    'react-devtools-cdt-mcp must be imported in a browser-like environment ' +
      'before React initializes. Use a client-only entry point, or the manual ' +
      'entry point for custom targets.',
  );
}

export * from './DevToolsCdtMcp';
