/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {type SourceLocation} from 'babel-plugin-react-compiler';
import {type Range} from 'vscode-languageserver';

export function babelLocationToRange(loc: SourceLocation): Range | null {
  if (typeof loc === 'symbol') {
    return null;
  }
  return {
    start: {line: loc.start.line - 1, character: loc.start.column},
    end: {line: loc.end.line - 1, character: loc.end.column},
  };
}

/**
 * Refine range to only the first character.
 */
export function getRangeFirstCharacter(range: Range): Range {
  return {
    start: range.start,
    end: range.start,
  };
}
