/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Custom implementation of FlightClientConfigDOM.
// Resource hint dispatching is a no-op since we handle resource loading
// through our own runtime.

import type {
  HintCode,
  HintModel,
} from 'react-dom-bindings/src/server/ReactFlightServerConfigDOM';

export function dispatchHint<Code: HintCode>(
  code: Code,
  model: HintModel<Code>,
): void {}

export function preinitModuleForSSR(
  href: string,
  nonce: ?string,
  crossOrigin: ?string,
) {}

export function preinitScriptForSSR(
  href: string,
  nonce: ?string,
  crossOrigin: ?string,
) {}
