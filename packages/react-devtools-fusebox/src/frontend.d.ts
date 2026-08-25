/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type MessagePayload =
  | null
  | string
  | number
  | boolean
  | {[key: string]: MessagePayload}
  | MessagePayload[];
export type Message = {event: string; payload?: MessagePayload};

export type WallListener = (message: unknown) => void;
export type Wall = {
  listen: (fn: WallListener) => () => void;
  send: (event: string, payload?: MessagePayload) => void;
};

export type Bridge = {
  addListener(event: string, listener: (params: unknown) => unknown): void;
  removeListener(event: string, listener: Function): void;
  shutdown: () => void;
};
export type Store = Object;
export type BrowserTheme = 'dark' | 'light';
export type Config = {
  supportsReloadAndProfile?: boolean;
};

export function createBridge(wall: Wall): Bridge;
export function createStore(bridge: Bridge, config?: Config): Store;

export type ReactFunctionLocation = [
  string, // function name
  string, // file name TODO: model nested eval locations as nested arrays
  number, // enclosing line number
  number, // enclosing column number
];
export type ReactCallSite = [
  string, // function name
  string, // file name TODO: model nested eval locations as nested arrays
  number, // line number
  number, // column number
  number, // enclosing line number
  number, // enclosing column number
  boolean, // async resume
];
export type ViewElementSource = (
  source: ReactFunctionLocation | ReactCallSite,
  symbolicatedSource: ReactFunctionLocation | ReactCallSite | null,
) => void;
export type ViewAttributeSource = (
  id: number,
  path: Array<string | number>,
) => void;
export type CanViewElementSource = (
  source: ReactFunctionLocation | ReactCallSite,
  symbolicatedSource: ReactFunctionLocation | ReactCallSite | null,
) => boolean;
export type FetchFileWithCaching = (url: string) => Promise<string>;

export type InitializationOptions = {
  bridge: Bridge;
  store: Store;
  theme?: BrowserTheme;
  viewAttributeSourceFunction?: ViewAttributeSource;
  viewElementSourceFunction?: ViewElementSource;
  canViewElementSourceFunction?: CanViewElementSource;
  fetchFileWithCaching?: FetchFileWithCaching;
};

export function initializeComponents(
  node: Element | Document,
  options: InitializationOptions,
): void;
export function initializeProfiler(
  node: Element | Document,
  options: InitializationOptions,
): void;
