/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// A reference into another model is its id followed by the property names on
// the way to the value, joined with colons. A property name that itself
// contains a colon, or a percent sign, is percent-escaped so that it stays
// one segment of the path.

export function escapePathSegment(name: string): string {
  if (name.indexOf(':') === -1 && name.indexOf('%') === -1) {
    return name;
  }
  return name.replace(/%/g, '%25').replace(/:/g, '%3A');
}

export function unescapePathSegment(segment: string): string {
  if (segment.indexOf('%') === -1) {
    return segment;
  }
  return segment.replace(/%3A/g, ':').replace(/%25/g, '%');
}
