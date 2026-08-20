/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

'use strict';

import {type ViewConfig} from './ReactNativeTypes';

// Event configs
export const customBubblingEventTypes = {};
export const customDirectEventTypes = {};

const viewConfigCallbacks = new Map();
const viewConfigs = new Map();

function processEventTypes(viewConfig: ViewConfig): void {
  const {bubblingEventTypes, directEventTypes} = viewConfig;

  if (__DEV__) {
    if (bubblingEventTypes != null && directEventTypes != null) {
      for (const topLevelType in directEventTypes) {
        if (bubblingEventTypes[topLevelType] != null) {
          throw new Error(
            `Event cannot be both direct and bubbling: ${topLevelType}`,
          );
        }
      }
    }
  }

  if (bubblingEventTypes != null) {
    for (const topLevelType in bubblingEventTypes) {
      if (customBubblingEventTypes[topLevelType] == null) {
        customBubblingEventTypes[topLevelType] =
          bubblingEventTypes[topLevelType];
      }
    }
  }

  if (directEventTypes != null) {
    for (const topLevelType in directEventTypes) {
      if (customDirectEventTypes[topLevelType] == null) {
        customDirectEventTypes[topLevelType] = directEventTypes[topLevelType];
      }
    }
  }
}

/**
 * Registers a native view/component by name.
 * A callback is provided to load the view config from UIManager.
 * The callback is deferred until the view is actually rendered.
 */
export function register(name: string, callback: () => ViewConfig): string {
  if (viewConfigCallbacks.has(name)) {
    throw new Error(`Tried to register two views with the same name ${name}`);
  }

  if (typeof callback !== 'function') {
    throw new Error(
      `View config getter callback for component \`${name}\` must be a function (received \`${
        callback === null ? 'null' : typeof callback
      }\`)`,
    );
  }

  viewConfigCallbacks.set(name, callback);
  return name;
}

/**
 * Retrieves a config for the specified view.
 * If this is the first time the view has been used,
 * This configuration will be lazy-loaded from UIManager.
 */
export function get(name: string): ViewConfig {
  let viewConfig;
  if (!viewConfigs.has(name)) {
    const callback = viewConfigCallbacks.get(name);
    if (typeof callback !== 'function') {
      throw new Error(
        `View config getter callback for component \`${name}\` must be a function (received \`${
          callback === null ? 'null' : typeof callback
        }\`).${
          typeof name[0] === 'string' && /[a-z]/.test(name[0])
            ? ' Make sure to start component names with a capital letter.'
            : ''
        }`,
      );
    }
    viewConfig = callback();
    processEventTypes(viewConfig);
    viewConfigs.set(name, viewConfig);

    // Clear the callback after the config is set so that
    // we don't mask any errors during registration.
    viewConfigCallbacks.set(name, null);
  } else {
    viewConfig = viewConfigs.get(name);
  }

  if (!viewConfig) {
    throw new Error(`View config not found for name ${name}`);
  }

  return viewConfig;
}
