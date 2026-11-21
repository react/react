/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const ATTRIBUTE_NAME_START_CHAR =
  ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
export const ATTRIBUTE_NAME_CHAR: string =
  ATTRIBUTE_NAME_START_CHAR + '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040';

const VALID_ATTRIBUTE_NAME_REGEX: RegExp = new RegExp(
  '^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$',
);

// Remembers whether each attribute name we've seen is safe, so the regex runs
// (and the DEV warning fires) at most once per name. A Map avoids the pitfalls
// of using a plain object as a dictionary, e.g. a "__proto__" key.
const attributeNameSafetyCache: Map<string, boolean> = new Map();

export default function isAttributeNameSafe(attributeName: string): boolean {
  const cached = attributeNameSafetyCache.get(attributeName);
  if (cached !== undefined) {
    return cached;
  }
  const isSafe = VALID_ATTRIBUTE_NAME_REGEX.test(attributeName);
  attributeNameSafetyCache.set(attributeName, isSafe);
  if (__DEV__) {
    if (!isSafe) {
      console.error('Invalid attribute name: `%s`', attributeName);
    }
  }
  return isSafe;
}
