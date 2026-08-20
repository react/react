/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactFunctionLocation, ReactCallSite} from 'shared/ReactTypes';

export function checkConditions(
  editorURL: string,
  source: ReactFunctionLocation | ReactCallSite,
): {url: URL | null, shouldDisableButton: boolean} {
  try {
    const url = new URL(editorURL);

    const [, sourceURL, line, column] = source;
    let filePath;

    // Check if sourceURL is a correct URL, which has a protocol specified
    if (sourceURL.startsWith('file:///')) {
      filePath = new URL(sourceURL).pathname;
    } else if (sourceURL.includes('://')) {
      // $FlowFixMe[cannot-resolve-name]
      if (!__IS_INTERNAL_VERSION__) {
        // In this case, we can't really determine the path to a file, disable a button
        return {url: null, shouldDisableButton: true};
      } else {
        const endOfSourceMapURLPattern = '.js/';
        const endOfSourceMapURLIndex = sourceURL.lastIndexOf(
          endOfSourceMapURLPattern,
        );

        if (endOfSourceMapURLIndex === -1) {
          return {url: null, shouldDisableButton: true};
        } else {
          filePath = sourceURL.slice(
            endOfSourceMapURLIndex + endOfSourceMapURLPattern.length,
            sourceURL.length,
          );
        }
      }
    } else {
      filePath = sourceURL;
    }

    const lineNumberAsString = String(line);
    const columnNumberAsString = String(column);

    url.href = url.href
      .replace('{path}', filePath)
      .replace('{line}', lineNumberAsString)
      .replace('{column}', columnNumberAsString)
      .replace('%7Bpath%7D', filePath)
      .replace('%7Bline%7D', lineNumberAsString)
      .replace('%7Bcolumn%7D', columnNumberAsString);

    return {url, shouldDisableButton: false};
  } catch (e) {
    // User has provided incorrect editor url
    return {url: null, shouldDisableButton: true};
  }
}
