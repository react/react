/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export opaque type CrossOriginString: string = string;

export function getCrossOriginString(input: ?string): ?CrossOriginString {
  if (typeof input === 'string') {
    return input === 'use-credentials' ? input : '';
  }
  return undefined;
}

export function getCrossOriginStringAs(
  as: ?string,
  input: ?string,
): ?CrossOriginString {
  if (as === 'font') {
    return '';
  }
  if (typeof input === 'string') {
    return input === 'use-credentials' ? input : '';
  }
  return undefined;
}
