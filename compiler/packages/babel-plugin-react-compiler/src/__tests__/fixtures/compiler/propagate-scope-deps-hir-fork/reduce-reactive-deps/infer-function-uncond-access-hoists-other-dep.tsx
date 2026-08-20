// @enablePropagateDepsInHIR

import {identity, makeArray, Stringify, useIdentity} from 'shared-runtime';

function Foo({a, cond}) {
  // Assume fn will be uncond evaluated, so we can safely evaluate {a.<any>,
  // a.b.<any}
  const fn = () => [a, a.b.c];
  useIdentity(null);
  const x = makeArray();
  if (cond) {
    x.push(identity(a.b.c));
  }
  return <Stringify fn={fn} x={x} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{a: null, cond: true}],
  sequentialRenders: [
    {a: null, cond: true},
    {a: {b: {c: 4}}, cond: true},
    {a: {b: {c: 4}}, cond: true},
  ],
};
