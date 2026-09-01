
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { makeArray } from "shared-runtime";

function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  let t1;
  if (
    $[1] !== props.cond ||
    $[2] !== props.cond2 ||
    $[3] !== props.value ||
    $[4] !== props.value2
  ) {
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
    y.push(x);
    t1 = [x, y];
    $[1] = props.cond;
    $[2] = props.cond2;
    $[3] = props.value;
    $[4] = props.value2;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true, cond2: true, value: 42 }],
  sequentialRenders: [
    { cond: true, cond2: true, value: 3.14 },
    { cond: true, cond2: true, value: 42 },
    { cond: true, cond2: true, value: 3.14 },
    { cond: true, cond2: false, value2: 3.14 },
    { cond: true, cond2: false, value2: 42 },
    { cond: true, cond2: false, value2: 3.14 },
    { cond: false },
    { cond: false },
  ],
};

```
      
### Eval output
(kind: ok) [{},[3.14,"[[ cyclic ref *1 ]]"]]
[{},[42,"[[ cyclic ref *1 ]]"]]
[{},[3.14,"[[ cyclic ref *1 ]]"]]
[{},[3.14,"[[ cyclic ref *1 ]]"]]
[{},[42,"[[ cyclic ref *1 ]]"]]
[{},[3.14,"[[ cyclic ref *1 ]]"]]
[{},["[[ cyclic ref *1 ]]"]]
[{},["[[ cyclic ref *1 ]]"]]