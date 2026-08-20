// bar(props.b) is an allocating expression that produces a primitive, which means
// that Forget should memoize it.
// Correctness:

import {identity, mutate, setProperty} from 'shared-runtime';

//   - y depends on either bar(props.b) or bar(props.b) + 1
function AllocatingPrimitiveAsDepNested(props) {
  let x = {};
  mutate(x);
  let y = identity(identity(props.b) + 1);
  setProperty(x, props.a);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: AllocatingPrimitiveAsDepNested,
  params: [{a: 1, b: 2}],
  sequentialRenders: [
    // change b
    {a: 1, b: 3},
    // change b
    {a: 1, b: 4},
    // change a
    {a: 2, b: 4},
    // change a
    {a: 3, b: 4},
  ],
};
