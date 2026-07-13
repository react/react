/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {default as rendererVersion} from 'shared/ReactVersion';
export const rendererPackageName = 'react-server-dom-unbundled';

export * from 'react-client/src/ReactFlightClientStreamConfigNode';
export * from 'react-client/src/ReactClientConsoleConfigServer';
export * from 'react-client/src/ReactClientDebugConfigNode';
export * from 'react-server-dom-unbundled/src/client/ReactFlightClientConfigBundlerNode';
export * from 'react-server-dom-unbundled/src/client/ReactFlightClientConfigTargetNodeServer';
export * from 'react-dom-bindings/src/shared/ReactFlightClientConfigDOM';
export const usedWithSSR = true;
