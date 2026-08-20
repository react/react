// @enablePropagateDepsInHIR

import {shallowCopy, Stringify, mutate} from 'shared-runtime';

function useFoo({a}: {a: {b: {c: number}}}) {
  const local = shallowCopy(a);
  mutate(local);
  const fn = () => [() => local.b.c];
  return <Stringify fn={fn} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [{a: null}, {a: {b: {c: 4}}}],
};
