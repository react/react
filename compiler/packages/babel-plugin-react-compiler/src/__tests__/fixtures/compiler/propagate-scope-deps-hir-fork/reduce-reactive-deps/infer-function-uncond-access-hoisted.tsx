// @enablePropagateDepsInHIR

import {Stringify} from 'shared-runtime';

function useFoo({a}) {
  return <Stringify fn={() => a.b.c} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [{a: null}, {a: {b: {c: 4}}}],
};
