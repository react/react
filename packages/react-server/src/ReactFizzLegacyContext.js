/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {disableLegacyContext} from 'shared/ReactFeatureFlags';
import getComponentNameFromType from 'shared/getComponentNameFromType';

let warnedAboutMissingGetChildContext;

if (__DEV__) {
  warnedAboutMissingGetChildContext = {} as {[string]: boolean};
}

export const emptyContextObject: {} = {};
if (__DEV__) {
  Object.freeze(emptyContextObject);
}

export function getMaskedContext(type: any, unmaskedContext: Object): Object {
  if (disableLegacyContext) {
    return emptyContextObject;
  } else {
    const contextTypes = type.contextTypes;
    if (!contextTypes) {
      return emptyContextObject;
    }

    const context: {[string]: $FlowFixMe} = {};
    for (const key in contextTypes) {
      context[key] = unmaskedContext[key];
    }

    return context;
  }
}

export function processChildContext(
  instance: any,
  type: any,
  parentContext: Object,
  childContextTypes: Object,
): Object {
  if (disableLegacyContext) {
    return parentContext;
  } else {
    // TODO (bvaughn) Replace this behavior with an invariant() in the future.
    // It has only been added in Fiber to match the (unintentional) behavior in Stack.
    if (typeof instance.getChildContext !== 'function') {
      if (__DEV__) {
        const componentName = getComponentNameFromType(type) || 'Unknown';

        if (!warnedAboutMissingGetChildContext[componentName]) {
          warnedAboutMissingGetChildContext[componentName] = true;
          console.error(
            '%s.childContextTypes is specified but there is no getChildContext() method ' +
              'on the instance. You can either define getChildContext() on %s or remove ' +
              'childContextTypes from it.',
            componentName,
            componentName,
          );
        }
      }
      return parentContext;
    }

    const childContext = instance.getChildContext();
    for (const contextKey in childContext) {
      if (!(contextKey in childContextTypes)) {
        throw new Error(
          `${
            getComponentNameFromType(type) || 'Unknown'
          }.getChildContext(): key "${contextKey}" is not defined in childContextTypes.`,
        );
      }
    }
    return {...parentContext, ...childContext};
  }
}
