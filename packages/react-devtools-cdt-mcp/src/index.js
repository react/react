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
register();

export * from './DevToolsCdtMcp';
