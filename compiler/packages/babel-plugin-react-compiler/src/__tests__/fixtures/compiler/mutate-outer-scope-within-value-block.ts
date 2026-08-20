import {CONST_TRUE, identity, shallowCopy} from 'shared-runtime';

function mutate(_: unknown) {}

/**
 * There are three values with their own scopes in this fixture.
 * - arr, whose mutable range extends to the `mutate(...)` call
 * - cond, which has a mutable range of exactly 1 (e.g. created but not
 *   mutated)
 * - { val: CONST_TRUE }, which is also not mutated after creation. However,
 *   its scope range becomes extended to the value block.
 *
 * After AlignScopesToBlockScopes, our scopes look roughly like this
 * ```js
 *  [1] arr = shallowCopy()            ⌝@0
 *  [2] cond = identity()        <- @1 |
 *  [3] $0 = Ternary test=cond     ⌝@2 |
 *  [4]        {val : CONST_TRUE}  |   |
 *  [5]        mutate(arr)         |   |
 *  [6] return $0                  ⌟   ⌟
 * ```
 *
 * Observe that instruction 5 mutates scope 0, which means that scopes 0 and 2
 * should be merged.
 */
function useFoo({input}) {
  const arr = shallowCopy(input);

  const cond = identity(false);
  return cond ? {val: CONST_TRUE} : mutate(arr);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: 3}],
};
