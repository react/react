/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type ExtensionBridgeConnectionType =
  | 'react-devtools-extension-bridge-connection-ready'
  | 'react-devtools-extension-bridge-connection-disconnected';

export const EXTENSION_BRIDGE_CONNECTION_READY: ExtensionBridgeConnectionType =
  'react-devtools-extension-bridge-connection-ready';
export const EXTENSION_BRIDGE_CONNECTION_DISCONNECTED: ExtensionBridgeConnectionType =
  'react-devtools-extension-bridge-connection-disconnected';

export function getExtensionBridgeConnectionType(
  message: mixed,
): ExtensionBridgeConnectionType | null {
  if (
    message === null ||
    typeof message !== 'object' ||
    !('source' in message) ||
    message.source !== 'react-devtools-background' ||
    !('payload' in message)
  ) {
    return null;
  }

  const payload = message.payload;
  if (payload === null || typeof payload !== 'object' || !('type' in payload)) {
    return null;
  }

  const type = payload.type;
  if (type === EXTENSION_BRIDGE_CONNECTION_READY) {
    return EXTENSION_BRIDGE_CONNECTION_READY;
  }
  if (type === EXTENSION_BRIDGE_CONNECTION_DISCONNECTED) {
    return EXTENSION_BRIDGE_CONNECTION_DISCONNECTED;
  }
  return null;
}
