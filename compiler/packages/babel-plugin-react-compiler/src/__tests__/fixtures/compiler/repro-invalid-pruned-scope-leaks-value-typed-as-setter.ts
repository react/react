import invariant from 'invariant';
import {useState} from 'react';
import {makeObject_Primitives, mutate} from 'shared-runtime';

const USE_STATE = false;

/**
 * Like repro-invalid-pruned-scope-leaks-value, but `f` has the type of a state
 * setter, because the ternary takes the type of its first branch. `f` is the
 * closure, which is recreated on every render, so `thing` must depend on it.
 */
function MyApp({count}) {
  const z = makeObject_Primitives();
  const [, setState] = useState(0);
  const f = USE_STATE
    ? setState
    : v => {
        z.v = v;
      };
  mutate(z);
  const thing = [count, f];
  if (thing[1] !== f) {
    invariant(false, 'oh no!');
  }
  return thing;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [{count: 2}],
  sequentialRenders: [{count: 2}, {count: 2}, {count: 3}],
};
