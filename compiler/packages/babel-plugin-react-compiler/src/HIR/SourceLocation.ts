/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as t from '@babel/types';

export const GeneratedSource = Symbol();

/**
 * A source node's offsets are independent of its line/column location. Preserve
 * both through lowering rather than deriving offsets from loc.start/end.index.
 * Undefined offsets must remain absent in the generated AST.
 */
export type SourceLocation =
  | {
      readonly loc: t.SourceLocation;
      readonly start: t.Node['start'];
      readonly end: t.Node['end'];
    }
  | typeof GeneratedSource;

export function getSourceLocation(
  node: t.Node | null | undefined,
  fallback: SourceLocation = GeneratedSource,
): SourceLocation {
  if (node?.loc == null) {
    return fallback;
  }
  return {loc: node.loc, start: node.start, end: node.end};
}

/** Keep compiler metadata out of Babel AST locations and public diagnostics. */
export function getBabelLocation(
  source: SourceLocation | t.SourceLocation,
): t.SourceLocation | typeof GeneratedSource {
  if (typeof source === 'symbol') {
    return source;
  }
  return 'loc' in source ? source.loc : source;
}

/** Compare Babel locations for analyses that group uses at the same source site. */
export function areSourceLocationsEqual(
  left: SourceLocation,
  right: SourceLocation,
): boolean {
  return (
    left === right ||
    (left !== GeneratedSource &&
      right !== GeneratedSource &&
      left.loc === right.loc)
  );
}
