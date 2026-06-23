/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {default as rendererVersion} from 'shared/ReactVersion';
export const rendererPackageName = 'react-flight-server-fb';

export * from 'react-client/src/ReactFlightClientStreamConfigWeb';
export * from 'react-client/src/ReactClientConsoleConfigServer';
export * from 'react-client/src/ReactClientDebugConfigNode';
export * from 'react-flight-server-fb/src/client/ReactFlightClientConfigBundlerFB';
export * from 'react-flight-server-fb/src/client/ReactFlightClientConfigTargetFBBrowser';
export * from 'react-flight-server-fb/src/client/ReactFlightClientConfigDOMFB';
export const usedWithSSR = false;
