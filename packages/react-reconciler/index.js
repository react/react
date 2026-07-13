/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as ReconcilerAPI from './src/ReactFiberReconciler';
import typeof * as HostConfig from './src/ReactFiberConfig';

export * from './src/ReactFiberReconciler';

// At build time, this module is wrapped as a factory function ($$$reconciler).
// Consumers pass a host config object and get back the reconciler API.
declare export default (hostConfig: HostConfig) => ReconcilerAPI;
