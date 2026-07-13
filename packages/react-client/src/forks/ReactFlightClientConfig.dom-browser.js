/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {default as rendererVersion} from 'shared/ReactVersion';
export const rendererPackageName = 'react-server-dom-webpack';

export * from 'react-client/src/ReactFlightClientStreamConfigWeb';
export * from 'react-client/src/ReactClientConsoleConfigBrowser';
export * from 'react-client/src/ReactClientDebugConfigBrowser';
export * from 'react-server-dom-webpack/src/client/ReactFlightClientConfigBundlerWebpack';
export * from 'react-server-dom-webpack/src/client/ReactFlightClientConfigBundlerWebpackBrowser';
export * from 'react-server-dom-webpack/src/client/ReactFlightClientConfigTargetWebpackBrowser';
export * from 'react-dom-bindings/src/shared/ReactFlightClientConfigDOM';
export const usedWithSSR = false;
