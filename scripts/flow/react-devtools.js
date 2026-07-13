/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable no-unused-vars */

declare const __EXTENSION__: boolean;
declare const __TEST__: boolean;

declare const __IS_FIREFOX__: boolean;
declare const __IS_CHROME__: boolean;
declare const __IS_EDGE__: boolean;
declare const __IS_NATIVE__: boolean;

interface ExtensionAction {
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/setIcon} */
  setIcon(details: {
    tabId: number,
    path?: string | {[iconSize: string]: string},
  }): void;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/setPopup} */
  setPopup(details: {tabId: number, popup: string}): void;
}

interface ExtensionDevtools {
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow} */
  inspectedWindow: $FlowFixMe;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/network} */
  network: $FlowFixMe;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/panels} */
  panels: $FlowFixMe;
}

interface ExtensionEvent<Listener: Function> {
  addListener(callback: Listener): void;
  removeListener(callback: Listener): void;
}

/** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab} */
// TODO: Only covers used properties. Extend as needed.
interface ExtensionTab {
  id?: number;
}

/** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender} */
// TODO: Only covers used properties. Extend as needed.
interface ExtensionRuntimeSender {
  tab?: ExtensionTab;
}

/** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port} */
// TODO: Only covers used properties. Extend as needed.
interface ExtensionRuntimePort {
  disconnect(): void;
  name: string;
  onMessage: ExtensionEvent<(message: any, port: ExtensionRuntimePort) => void>;
  onDisconnect: ExtensionEvent<(port: ExtensionRuntimePort) => void>;
  postMessage(message: mixed, transferable?: Array<mixed>): void;
  sender?: ExtensionRuntimeSender;
}

interface ExtensionMessageSender {
  id?: string;
  url?: string;
  tab?: {
    id: number,
    url: string,
  };
}

interface ExtensionRuntime {
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/connect} */
  connect(connectInfo?: {
    name?: string,
    includeTlsChannelId?: boolean,
  }): ExtensionRuntimePort;
  connect(
    extensionId: string,
    connectInfo?: {name?: string, includeTlsChannelId?: boolean},
  ): ExtensionRuntimePort;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getURL} */
  getURL(path: string): string;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage} */
  onMessage: ExtensionEvent<
    (
      message: any,
      sender: ExtensionMessageSender,
      sendResponse: (response: any) => void,
    ) => any,
  >;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onConnect} */
  onConnect: ExtensionEvent<(port: ExtensionRuntimePort) => void>;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage} */
  sendMessage(
    message: any,
    options?: {includeTlsChannelId?: boolean},
  ): Promise<any>;
  sendMessage(
    extensionId: string,
    message: any,
    // We're making this required so that we don't accidentally call the wrong overload.
    options: {includeTlsChannelId?: boolean},
  ): Promise<any>;
}

interface ExtensionTabs {
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onActivated} */
  onActivated: ExtensionEvent<
    (activeInfo: {
      previousTabId: number,
      tabId: number,
      windowId: number,
    }) => void,
  >;
}

interface ExtensionAPI {
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action} */
  action: ExtensionAction;
  devtools: ExtensionDevtools;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions} */
  permissions: $FlowFixMe;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime} */
  runtime: ExtensionRuntime;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting} */
  scripting: $FlowFixMe;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage} */
  storage: $FlowFixMe;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs} */
  tabs: ExtensionTabs;
}

declare const chrome: ExtensionAPI;
