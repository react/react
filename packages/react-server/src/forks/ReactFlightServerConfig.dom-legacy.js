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

export * from '../ReactFlightServerConfigBundlerCustom';

export * from '../ReactFlightServerConfigDebugNoop';

export * from '../ReactFlightStackConfigV8';
export * from '../ReactServerConsoleConfigServer';

export type Hints = any;
export type HintCode = any;
// eslint-disable-next-line no-unused-vars
export type HintModel<T: any> = any;

export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;

export const supportsComponentStorage = false;
export const componentStorage: AsyncLocalStorage<ReactComponentInfo | void> =
  null as any;

export function createHints(): any {
  return null;
}

export type FormatContext = null;

export function createRootFormatContext(): FormatContext {
  return null;
}

export function getChildFormatContext(
  parentContext: FormatContext,
  type: string,
  props: Object,
): FormatContext {
  return parentContext;
}
