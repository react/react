// @validatePreserveExistingMemoizationGuarantees:true
import {useMemo} from 'react';
import {arrayPush} from 'shared-runtime';

/**
 * Repro showing differences between mutable ranges and scope ranges.
 *
 * For useMemo dependency `x`:
 * - mutable range ends after the `arrayPush(x, b)` instruction
 * - scope range is extended due to MergeOverlappingScopes
 *
 * Since manual memo deps are guaranteed to be named (guaranteeing valid
 * codegen), it's correct to take a dependency on a dep *before* the end
 * of its scope (but after its mutable range ends).
 */

function useFoo(a, b) {
  const x = [];
  const y = [];
  arrayPush(x, b);
  const result = useMemo(() => {
    return [Math.max(x[1], a)];
  }, [a, x]);
  arrayPush(y, 3);
  return {result, y};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1, 2],
};
