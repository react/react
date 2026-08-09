/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {checkFormFieldValueStringCoercion} from 'shared/CheckStringCoercion';

export opaque type ToStringValue =
  | boolean
  | number
  | bigint
  | Object
  | string
  | null
  | void;

// Flow does not allow string concatenation of most non-string types. To work
// around this limitation, we use an opaque type that can only be obtained by
// passing the value through getToStringValue first.
export function toString(value: ToStringValue): string {
  // The coercion safety check is performed in getToStringValue().
  // eslint-disable-next-line react-internal/safe-string-coercion
  return '' + (value as any);
}

export function getToStringValue(value: mixed): ToStringValue {
  switch (typeof value) {
    case 'bigint':
    case 'boolean':
    case 'number':
    case 'string':
    case 'undefined':
      return value;
    case 'object':
      if (__DEV__) {
        checkFormFieldValueStringCoercion(value);
      }
      return value;
    default:
      // function, symbol are assigned as empty strings
      return '';
  }
}
