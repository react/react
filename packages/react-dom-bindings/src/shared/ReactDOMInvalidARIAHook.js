/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ATTRIBUTE_NAME_CHAR} from './isAttributeNameSafe';
import validAriaProperties from './validAriaProperties';
import hasOwnProperty from 'shared/hasOwnProperty';

const warnedProperties = {};
const rARIA = new RegExp('^(aria)-[' + ATTRIBUTE_NAME_CHAR + ']*$');
const rARIACamel = new RegExp('^(aria)[A-Z][' + ATTRIBUTE_NAME_CHAR + ']*$');

function validateProperty(tagName, name) {
  if (__DEV__) {
    if (hasOwnProperty.call(warnedProperties, name) && warnedProperties[name]) {
      return true;
    }

    if (rARIACamel.test(name)) {
      const ariaName = 'aria-' + name.slice(4).toLowerCase();
      const correctName = validAriaProperties.hasOwnProperty(ariaName)
        ? ariaName
        : null;

      // If this is an aria-* attribute, but is not listed in the known DOM
      // DOM properties, then it is an invalid aria-* attribute.
      if (correctName == null) {
        console.error(
          'Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.',
          name,
        );
        warnedProperties[name] = true;
        return true;
      }
      // aria-* attributes should be lowercase; suggest the lowercase version.
      if (name !== correctName) {
        console.error(
          'Invalid ARIA attribute `%s`. Did you mean `%s`?',
          name,
          correctName,
        );
        warnedProperties[name] = true;
        return true;
      }
    }

    if (rARIA.test(name)) {
      const lowerCasedName = name.toLowerCase();
      const standardName = validAriaProperties.hasOwnProperty(lowerCasedName)
        ? lowerCasedName
        : null;

      // If this is an aria-* attribute, but is not listed in the known DOM
      // DOM properties, then it is an invalid aria-* attribute.
      if (standardName == null) {
        warnedProperties[name] = true;
        return false;
      }
      // aria-* attributes should be lowercase; suggest the lowercase version.
      if (name !== standardName) {
        console.error(
          'Unknown ARIA attribute `%s`. Did you mean `%s`?',
          name,
          standardName,
        );
        warnedProperties[name] = true;
        return true;
      }
    }
  }

  return true;
}

export function validateProperties(type, props) {
  if (__DEV__) {
    const invalidProps = [];

    for (const key in props) {
      const isValid = validateProperty(type, key);
      if (!isValid) {
        invalidProps.push(key);
      }
    }

    const unknownPropString = invalidProps
      .map(prop => '`' + prop + '`')
      .join(', ');

    if (invalidProps.length === 1) {
      console.error(
        'Invalid aria prop %s on <%s> tag. ' +
          'For details, see https://react.dev/link/invalid-aria-props',
        unknownPropString,
        type,
      );
    } else if (invalidProps.length > 1) {
      console.error(
        'Invalid aria props %s on <%s> tag. ' +
          'For details, see https://react.dev/link/invalid-aria-props',
        unknownPropString,
        type,
      );
    }
  }
}
