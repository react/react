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

export * from 'react-server-dom-rspack/src/server/ReactFlightServerConfigRspackBundler';
export * from 'react-dom-bindings/src/server/ReactFlightServerConfigDOM';

// For now, we get this from the global scope, but this will likely move to a module.
export const supportsRequestStorage = typeof AsyncLocalStorage === 'function';
export const requestStorage: AsyncLocalStorage<Request | void> =
  supportsRequestStorage ? new AsyncLocalStorage() : (null: any);

export const supportsComponentStorage: boolean =
  __DEV__ && supportsRequestStorage;
export const componentStorage: AsyncLocalStorage<ReactComponentInfo | void> =
  supportsComponentStorage ? new AsyncLocalStorage() : (null: any);

export * from '../ReactFlightServerConfigDebugNoop';

export * from '../ReactFlightStackConfigV8';
export * from '../ReactServerConsoleConfigServer';
