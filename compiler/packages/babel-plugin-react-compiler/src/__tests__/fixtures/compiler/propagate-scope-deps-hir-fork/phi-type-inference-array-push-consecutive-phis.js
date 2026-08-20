// @enablePropagateDepsInHIR
import {makeArray} from 'shared-runtime';

function Component(props) {
  const x = {};
  let y;
  if (props.cond) {
    if (props.cond2) {
      y = [props.value];
    } else {
      y = [props.value2];
    }
  } else {
    y = [];
  }
  // This should be inferred as `<store> y` s.t. `x` can still
  // be independently memoized. *But* this also must properly
  // extend the mutable range of the array literals in the
  // if/else branches
  y.push(x);

  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, cond2: true, value: 42}],
  sequentialRenders: [
    {cond: true, cond2: true, value: 3.14},
    {cond: true, cond2: true, value: 42},
    {cond: true, cond2: true, value: 3.14},
    {cond: true, cond2: false, value2: 3.14},
    {cond: true, cond2: false, value2: 42},
    {cond: true, cond2: false, value2: 3.14},
    {cond: false},
    {cond: false},
  ],
};
