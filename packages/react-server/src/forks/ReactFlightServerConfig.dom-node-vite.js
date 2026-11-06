/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {AsyncLocalStorage} from 'async_hooks';

import type {Request} from 'react-server/src/ReactFlightServer';
import type {ReactComponentInfo} from 'shared/ReactTypes';

export * from 'react-server-dom-vite/src/server/ReactFlightServerConfigViteBundler';
export * from 'react-dom-bindings/src/server/ReactFlightServerConfigDOM';

export const supportsRequestStorage = true;
export const requestStorage: AsyncLocalStorage<Request | void> =
  new AsyncLocalStorage();

export const supportsComponentStorage = __DEV__;
export const componentStorage: AsyncLocalStorage<ReactComponentInfo | void> =
  supportsComponentStorage ? new AsyncLocalStorage() : (null: any);

export {createHook as createAsyncHook, executionAsyncId} from 'async_hooks';

export * from '../ReactFlightServerConfigDebugNode';

export * from '../ReactFlightStackConfigV8';
