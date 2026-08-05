/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {Request} from 'react-server/src/ReactFizzServer';

export * from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

export * from 'react-client/src/ReactClientConsoleConfigBrowser';

// This renderer is pulled from the outside through renderNextChunk. Promises
// can ping tasks, but the outer caller decides when to process them.
export const isWorkLoopExternallyDriven = true;

export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;
