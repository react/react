/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {toNormalUrl} from 'jsc-safe-url';

// This function is based on describeComponentFrame() in packages/shared/ReactComponentStackFrame
export default function formatLocationForDisplay(
  sourceURL: string,
  line: number,
  column: number,
): string {
  // Metro can return JSC-safe URLs, which have `//&` as a delimiter
  // https://www.npmjs.com/package/jsc-safe-url
  const sanitizedSourceURL = sourceURL.includes('//&')
    ? toNormalUrl(sourceURL)
    : sourceURL;

  // Note: this RegExp doesn't work well with URLs from Metro,
  // which provides bundle URL with query parameters prefixed with /&
  const BEFORE_SLASH_RE = /^(.*)[\\\/]/;

  let nameOnly = sanitizedSourceURL.replace(BEFORE_SLASH_RE, '');

  // In DEV, include code for a common special case:
  // prefer "folder/index.js" instead of just "index.js".
  if (/^index\./.test(nameOnly)) {
    const match = sanitizedSourceURL.match(BEFORE_SLASH_RE);
    if (match) {
      const pathBeforeSlash = match[1];
      if (pathBeforeSlash) {
        const folderName = pathBeforeSlash.replace(BEFORE_SLASH_RE, '');
        nameOnly = folderName + '/' + nameOnly;
      }
    }
  }

  if (line === 0) {
    return nameOnly;
  }

  return `${nameOnly}:${line}`;
}
