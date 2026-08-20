// @enablePropagateDepsInHIR

import {Stringify} from 'shared-runtime';

function useFoo({a}) {
  const fn = () => {
    return () => ({
      value: a.b.c,
    });
  };
  return <Stringify fn={fn} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [{a: null}, {a: {b: {c: 4}}}],
};
