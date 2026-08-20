// @flow @enableTransitivelyFreezeFunctionExpressions:false @enableNewMutationAliasingModel
import {setPropertyByKey, Stringify} from 'shared-runtime';

/**
 * Variation of bug in `bug-aliased-capture-aliased-mutate`.
 * Fixed in the new inference model.
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 *   (kind: ok)
 *   <div>{"cb":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>
 *   <div>{"cb":{"kind":"Function","result":3},"shouldInvokeFns":true}</div>
 * Forget:
 *   (kind: ok)
 *   <div>{"cb":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>
 *   <div>{"cb":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>
 */

function useFoo({a}: {a: number, b: number}) {
  const arr = [];
  const obj = {value: a};

  setPropertyByKey(obj, 'arr', arr);
  const obj_alias = obj;
  const cb = () => obj_alias.arr.length;
  for (let i = 0; i < a; i++) {
    arr.push(i);
  }
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2}],
  sequentialRenders: [{a: 2}, {a: 3}],
};
