// @enablePropagateDepsInHIR

import {identity, makeArray, Stringify, useIdentity} from 'shared-runtime';

function Foo({a, cond}) {
  // Assume fn can be uncond evaluated, so we can safely evaluate a.b?.c.<any>
  const fn = () => [a, a.b?.c.d];
  useIdentity(null);
  const arr = makeArray();
  if (cond) {
    arr.push(identity(a.b?.c.e));
  }
  return <Stringify fn={fn} arr={arr} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{a: null, cond: true}],
  sequentialRenders: [
    {a: null, cond: true},
    {a: {b: {c: {d: 5}}}, cond: true},
    {a: {b: null}, cond: false},
  ],
};
