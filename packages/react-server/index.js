/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as FizzAPI from './src/ReactFizzServer';
import typeof * as HostConfig from './src/ReactFizzConfig';

export * from './src/ReactFizzServer';

// At build time, this module is wrapped as a factory function ($$$reconciler).
// Consumers pass a host config object and get back the Fizz server API.
declare export default (hostConfig: HostConfig) => FizzAPI;
