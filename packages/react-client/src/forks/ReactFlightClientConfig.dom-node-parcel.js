/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export {default as rendererVersion} from 'shared/ReactVersion';
export const rendererPackageName = 'react-server-dom-parcel';

export * from 'react-client/src/ReactFlightClientStreamConfigNode';
export * from 'react-client/src/ReactClientConsoleConfigServer';
export * from 'react-client/src/ReactClientDebugConfigNode';
export * from 'react-server-dom-parcel/src/client/ReactFlightClientConfigBundlerParcel';
export * from 'react-server-dom-parcel/src/client/ReactFlightClientConfigTargetParcelServer';
export * from 'react-dom-bindings/src/shared/ReactFlightClientConfigDOM';
export const usedWithSSR = true;
