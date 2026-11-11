/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {objectName} from 'shared/ReactSerializationErrors';

export type TemporalValue =
  | Temporal.Instant
  | Temporal.ZonedDateTime
  | Temporal.PlainDate
  | Temporal.PlainTime
  | Temporal.PlainDateTime
  | Temporal.PlainYearMonth
  | Temporal.PlainMonthDay
  | Temporal.Duration;

// Temporal objects are encoded as "$t", followed by a character that
// identifies the type, followed by the string that their toJSON method
// returns. We need to encode the type because it can't always be inferred from
// the string. E.g. a PlainYearMonth in a non-ISO calendar is formatted as a
// full date.

// Returns the prefix that the JSON representation of a Temporal object should
// be tagged with, or an empty string if the object isn't a Temporal object.
export function getTemporalPrefix(object: mixed): string {
  // We identify these by their brand instead of using instanceof so that it
  // works with objects from a polyfill that isn't installed on the global, and
  // with objects from other Realms.
  switch (objectName(object)) {
    case 'Temporal.Instant':
      return '$ti';
    case 'Temporal.ZonedDateTime':
      return '$tz';
    case 'Temporal.PlainDate':
      return '$td';
    case 'Temporal.PlainTime':
      return '$tt';
    case 'Temporal.PlainDateTime':
      return '$tl';
    case 'Temporal.PlainYearMonth':
      return '$ty';
    case 'Temporal.PlainMonthDay':
      return '$tm';
    case 'Temporal.Duration':
      return '$tp';
  }
  return '';
}

// JSON.stringify calls toJSON before the replacer function so by the time we
// see a Temporal object it has already been converted to a string. Since every
// string would otherwise need to be compared to its original value, this is a
// cheap way to rule out most of them. The JSON representation of all Temporal
// objects start with a digit, a sign or the "P" of a duration.
export function isPossiblyTemporalJSON(json: string): boolean {
  const charCode = json.charCodeAt(0);
  return (
    (charCode >= 48 && charCode <= 57) || // 0-9
    charCode === 43 || // +
    charCode === 45 || // -
    charCode === 80 // P
  );
}

export function parseTemporal(value: string): TemporalValue {
  if (typeof Temporal !== 'object') {
    throw new Error(
      'A Temporal object was received but Temporal is not available in this ' +
        'environment. Make sure that you load a polyfill that defines the ' +
        'global Temporal.',
    );
  }
  const json = value.slice(3);
  switch (value[2]) {
    case 'i':
      return Temporal.Instant.from(json);
    case 'z':
      // The string includes both the UTC offset and the time zone. If the time
      // zone database of this environment has different rules than the one
      // that encoded this, they can conflict which is an error by default.
      // We prefer the offset so that this always represents the same exact
      // time in both environments.
      return Temporal.ZonedDateTime.from(json, {offset: 'use'});
    case 'd':
      return Temporal.PlainDate.from(json);
    case 't':
      return Temporal.PlainTime.from(json);
    case 'l':
      return Temporal.PlainDateTime.from(json);
    case 'y':
      return Temporal.PlainYearMonth.from(json);
    case 'm':
      return Temporal.PlainMonthDay.from(json);
    case 'p':
      return Temporal.Duration.from(json);
  }
  throw new Error(
    'Received an unknown type of Temporal object. This is likely caused by a ' +
      'mismatch between the versions of React used to encode and decode it.',
  );
}
