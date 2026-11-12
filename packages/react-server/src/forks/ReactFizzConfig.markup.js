/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {Request} from 'react-server/src/ReactFizzServer';

export * from 'react-markup/src/ReactFizzConfigMarkup.js';

export * from 'react-client/src/ReactClientConsoleConfigPlain';

export const isWorkLoopExternallyDriven = false;
export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;
