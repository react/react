/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Request} from 'react-server/src/ReactFlightServer';
import type {ReactComponentInfo} from 'shared/ReactTypes';

export * from 'react-flight-server-fb/src/server/ReactFlightServerConfigFBBundler';
export * from 'react-flight-server-fb/src/server/ReactFlightServerConfigDOMFB';

export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;

export const supportsComponentStorage = false;
export const componentStorage: AsyncLocalStorage<ReactComponentInfo | void> =
  null as any;

export * from '../ReactFlightServerConfigDebugNoop';

export * from '../ReactFlightStackConfigV8';
export * from '../ReactServerConsoleConfigBrowser';
