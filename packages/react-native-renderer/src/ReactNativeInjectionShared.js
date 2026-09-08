/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * Make sure essential globals are available and are patched correctly. Please don't remove this
 * line. Bundles created by react-packager `require` it before executing any application code. This
 * ensures it exists in the dependency graph and can be `require`d.
 * TODO: require this in packager, not in React #10932517
 */
// Module provided by RN:
import 'react-native/setup-env';

import ResponderEventPlugin from './legacy-events/ResponderEventPlugin';
import {
  injectEventPluginOrder,
  injectEventPluginsByName,
} from './legacy-events/EventPluginRegistry';

import ReactNativeBridgeEventPlugin from './ReactNativeBridgeEventPlugin';
import ReactNativeEventPluginOrder from './ReactNativeEventPluginOrder';

/**
 * Inject module for resolving DOM hierarchy and plugin ordering.
 */
injectEventPluginOrder(ReactNativeEventPluginOrder);

/**
 * Some important event plugins included by default (without having to require
 * them).
 */
injectEventPluginsByName({
  ResponderEventPlugin: ResponderEventPlugin,
  ReactNativeBridgeEventPlugin: ReactNativeBridgeEventPlugin,
});
