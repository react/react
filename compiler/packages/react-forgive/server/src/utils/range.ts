/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from '@babel/types';
import {type Position} from 'vscode-languageserver/node';

export type Range = [Position, Position];

export function isPositionWithinRange(
  position: Position,
  [start, end]: Range,
): boolean {
  return position.line >= start.line && position.line <= end.line;
}

export function isRangeWithinRange(aRange: Range, bRange: Range): boolean {
  const startComparison = comparePositions(aRange[0], bRange[0]);
  const endComparison = comparePositions(aRange[1], bRange[1]);
  return startComparison >= 0 && endComparison <= 0;
}

function comparePositions(a: Position, b: Position): number {
  const lineComparison = a.line - b.line;
  if (lineComparison === 0) {
    return a.character - b.character;
  } else {
    return lineComparison;
  }
}

export function sourceLocationToRange(
  loc: t.SourceLocation,
): [Position, Position] {
  return [
    {line: loc.start.line - 1, character: loc.start.column},
    {line: loc.end.line - 1, character: loc.end.column},
  ];
}
