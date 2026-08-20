// props.b + 1 is an non-allocating expression, which means Forget can
// emit it trivially and repeatedly (e.g. no need to memoize props.b + 1
// separately from props.b)
// Correctness:

import {identity, mutate, setProperty} from 'shared-runtime';

//   y depends on either props.b or props.b + 1
function PrimitiveAsDepNested(props) {
  let x = {};
  mutate(x);
  let y = identity(props.b + 1);
  setProperty(x, props.a);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: PrimitiveAsDepNested,
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
