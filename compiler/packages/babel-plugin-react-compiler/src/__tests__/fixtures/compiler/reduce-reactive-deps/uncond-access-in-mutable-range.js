// x.a.b was accessed unconditionally within the mutable range of x.
// As a result, we cannot infer anything about whether `x` or `x.a`
// may be null. This means that it's not safe to hoist reads from x
// (e.g. take `x.a` or `x.a.b` as a dependency).

import {identity, makeObject_Primitives, setProperty} from 'shared-runtime';

function Component({cond, other}) {
  const x = makeObject_Primitives();
  setProperty(x, {b: 3, other}, 'a');
  identity(x.a.b);
  if (!cond) {
    x.a = null;
  }

  const y = [identity(cond) && x.a.b];
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false}],
  sequentialRenders: [
    {cond: false},
    {cond: false},
    {cond: false, other: 8},
    {cond: true},
    {cond: true},
  ],
};
