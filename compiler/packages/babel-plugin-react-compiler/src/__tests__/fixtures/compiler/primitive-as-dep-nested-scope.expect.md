
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // props.b + 1 is an non-allocating expression, which means Forget can
// emit it trivially and repeatedly (e.g. no need to memoize props.b + 1
// separately from props.b)
// Correctness:

import { identity, mutate, setProperty } from "shared-runtime";

//   y depends on either props.b or props.b + 1
function PrimitiveAsDepNested(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b) {
    const x = {};
    mutate(x);
    const t1 = props.b + 1;
    let t2;
    if ($[3] !== t1) {
      t2 = identity(t1);
      $[3] = t1;
      $[4] = t2;
    } else {
      t2 = $[4];
    }
    const y = t2;
    setProperty(x, props.a);
    t0 = [x, y];
    $[0] = props.a;
    $[1] = props.b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: PrimitiveAsDepNested,
  params: [{ a: 1, b: 2 }],
  sequentialRenders: [
    // change b
    { a: 1, b: 3 },
    // change b
    { a: 1, b: 4 },
    // change a
    { a: 2, b: 4 },
    // change a
    { a: 3, b: 4 },
  ],
};

```
      
### Eval output
(kind: ok) [{"wat0":"joe","wat1":1},4]
[{"wat0":"joe","wat1":1},5]
[{"wat0":"joe","wat1":2},5]
[{"wat0":"joe","wat1":3},5]