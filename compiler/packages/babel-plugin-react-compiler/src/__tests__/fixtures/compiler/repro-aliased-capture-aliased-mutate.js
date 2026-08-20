// @flow @enableTransitivelyFreezeFunctionExpressions:false @enableNewMutationAliasingModel
import {arrayPush, setPropertyByKey, Stringify} from 'shared-runtime';

/**
 * Repro of a bug fixed in the new aliasing model.
 *
 * 1. `InferMutableRanges` derives the mutable range of identifiers and their
 *     aliases from `LoadLocal`, `PropertyLoad`, etc
 *   - After this pass, y's mutable range only extends to `arrayPush(x, y)`
 *   - We avoid assigning mutable ranges to loads after y's mutable range, as
 *     these are working with an immutable value. As a result, `LoadLocal y` and
 *     `PropertyLoad y` do not get mutable ranges
 * 2. `InferReactiveScopeVariables` extends mutable ranges and creates scopes,
 *    as according to the 'co-mutation' of different values
 *   - Here, we infer that
 *     - `arrayPush(y, x)` might alias `x` and `y` to each other
 *     - `setPropertyKey(x, ...)` may mutate both `x` and `y`
 *   - This pass correctly extends the mutable range of `y`
 *   - Since we didn't run `InferMutableRange` logic again, the LoadLocal /
 *     PropertyLoads still don't have a mutable range
 *
 * Note that the this bug is an edge case. Compiler output is only invalid for:
 *  - function expressions with
 *    `enableTransitivelyFreezeFunctionExpressions:false`
 *  - functions that throw and get retried without clearing the memocache
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 *   (kind: ok)
 *   <div>{"cb":{"kind":"Function","result":10},"shouldInvokeFns":true}</div>
 *   <div>{"cb":{"kind":"Function","result":11},"shouldInvokeFns":true}</div>
 * Forget:
 *   (kind: ok)
 *   <div>{"cb":{"kind":"Function","result":10},"shouldInvokeFns":true}</div>
 *   <div>{"cb":{"kind":"Function","result":10},"shouldInvokeFns":true}</div>
 */
function useFoo({a, b}: {a: number, b: number}) {
  const x = [];
  const y = {value: a};

  arrayPush(x, y); // x and y co-mutate
  const y_alias = y;
  const cb = () => y_alias.value;
  setPropertyByKey(x[0], 'value', b); // might overwrite y.value
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2, b: 10}],
  sequentialRenders: [
    {a: 2, b: 10},
    {a: 2, b: 11},
  ],
};
