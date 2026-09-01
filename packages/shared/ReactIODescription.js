/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export function getIODescription(value: mixed): string {
  if (!__DEV__) {
    return '';
  }
  try {
    switch (typeof value) {
      case 'function':
        return value.name || '';
      case 'object':
        // Test the object for a bunch of common property names that are useful identifiers.
        // While we only have the return value here, it should ideally be a name that
        // describes the arguments requested.
        if (value === null) {
          return '';
        } else if (value instanceof Error) {
          // eslint-disable-next-line react-internal/safe-string-coercion
          return String(value.message);
        } else if (typeof value.url === 'string') {
          return value.url;
        } else if (typeof value.href === 'string') {
          return value.href;
        } else if (typeof value.src === 'string') {
          return value.src;
        } else if (typeof value.currentSrc === 'string') {
          return value.currentSrc;
        } else if (typeof value.command === 'string') {
          return value.command;
        } else if (
          typeof value.request === 'object' &&
          value.request !== null &&
          typeof value.request.url === 'string'
        ) {
          return value.request.url;
        } else if (
          typeof value.response === 'object' &&
          value.response !== null &&
          typeof value.response.url === 'string'
        ) {
          return value.response.url;
        } else if (
          typeof value.id === 'string' ||
          typeof value.id === 'number' ||
          typeof value.id === 'bigint'
        ) {
          // eslint-disable-next-line react-internal/safe-string-coercion
          return String(value.id);
        } else if (typeof value.name === 'string') {
          return value.name;
        } else {
          const str = value.toString();
          if (
            str.startsWith('[object ') ||
            str.length < 5 ||
            str.length > 500
          ) {
            // This is probably not a useful description.
            return '';
          }
          return str;
        }
      case 'string':
        if (value.length < 5 || value.length > 500) {
          return '';
        }
        return value;
      case 'number':
      case 'bigint':
        // eslint-disable-next-line react-internal/safe-string-coercion
        return String(value);
      default:
        // Not useful descriptors.
        return '';
    }
  } catch (x) {
    return '';
  }
}
