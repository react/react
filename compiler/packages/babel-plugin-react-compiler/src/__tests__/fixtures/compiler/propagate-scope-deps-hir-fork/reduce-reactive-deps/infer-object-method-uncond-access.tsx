// @enablePropagateDepsInHIR

import {identity, Stringify} from 'shared-runtime';

function useFoo({a}) {
  const x = {
    fn() {
      return identity(a.b.c);
    },
  };
  return <Stringify x={x} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [{a: null}, {a: {b: {c: 4}}}],
};
