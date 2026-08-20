// @enablePropagateDepsInHIR

import {shallowCopy, mutate, Stringify} from 'shared-runtime';

function useFoo({
  a,
  shouldReadA,
}: {
  a: {b: {c: number}; x: number};
  shouldReadA: boolean;
}) {
  const local = shallowCopy(a);
  mutate(local);
  return (
    <Stringify
      fn={() => {
        if (shouldReadA) return local.b.c;
        return null;
      }}
      shouldInvokeFns={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null, shouldReadA: true}],
  sequentialRenders: [
    {a: null, shouldReadA: true},
    {a: null, shouldReadA: false},
    {a: {b: {c: 4}}, shouldReadA: true},
  ],
};
