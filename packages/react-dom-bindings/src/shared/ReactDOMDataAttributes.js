/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {DataAttributes} from 'react-dom/src/shared/ReactDOMTypes';

import hasOwnProperty from 'shared/hasOwnProperty';
import isAttributeNameSafe from './isAttributeNameSafe';
import {
  getValueDescriptorExpectingObjectForWarning,
  getValueDescriptorExpectingEnumForWarning,
} from './ReactDOMResourceValidation';

// Validates a `dataAttributes` option and calls `callback` with each valid
// `data-*` name and value, in `DEV` issues warnings for invalid ones.
export function forEachDataAttribute(
  dataAttributes: DataAttributes,
  apiName: string,
  urlLabel: string,
  url: string,
  callback: (name: string, value: string) => void,
): void {
  if (typeof dataAttributes !== 'object') {
    if (__DEV__) {
      console.error(
        '%s: Expected the `dataAttributes` option to be an object mapping `data-*` attribute names to string values but encountered %s instead. This was passed for `%s` "%s".',
        apiName,
        getValueDescriptorExpectingObjectForWarning(dataAttributes),
        urlLabel,
        url,
      );
    }
    return;
  }
  for (const name in dataAttributes) {
    if (!hasOwnProperty.call(dataAttributes, name)) {
      continue;
    }
    const value = dataAttributes[name];
    // A bare "data-" is not a valid data attribute name.
    if (name.length <= 5 || !name.startsWith('data-')) {
      if (__DEV__) {
        console.error(
          '%s: Expected the keys of the `dataAttributes` option to be `data-*` attribute names but encountered "%s" instead for `%s` "%s". This attribute will be omitted.',
          apiName,
          name,
          urlLabel,
          url,
        );
      }
      continue;
    }
    if (!isAttributeNameSafe(name)) {
      // isAttributeNameSafe warns in DEV.
      continue;
    }
    if (typeof value !== 'string') {
      if (__DEV__) {
        console.error(
          '%s: Expected the `dataAttributes` option to map "%s" to a string but encountered %s instead for `%s` "%s". This attribute will be omitted.',
          apiName,
          name,
          getValueDescriptorExpectingEnumForWarning(value),
          urlLabel,
          url,
        );
      }
      continue;
    }
    callback(name, value);
  }
}
