
## Input

```javascript
/**
 * Forked from array-map-simple.js
 *
 * Whether lambdas are named or passed inline shouldn't affect whether we expect
 * it to be called.
 */
function useFoo({arr1, arr2}) {
  const cb1 = e => arr1[0].value + e.value;
  const x = arr1.map(cb1);
  const cb2 = e => arr2[0].value + e.value;
  const y = arr1.map(cb2);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{arr1: [], arr2: []}],
  sequentialRenders: [
    {arr1: [], arr2: []},
    {arr1: [], arr2: null},
    {arr1: [{value: 1}, {value: 2}], arr2: [{value: -1}]},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Forked from array-map-simple.js
 *
 * Whether lambdas are named or passed inline shouldn't affect whether we expect
 * it to be called.
 */
function useFoo(t0) {
  const $ = _c(13);
  const { arr1, arr2 } = t0;
  let t1;
  if ($[0] !== arr1[0]) {
    t1 = (e) => arr1[0].value + e.value;
    $[0] = arr1[0];
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const cb1 = t1;
  let t2;
  if ($[2] !== arr1 || $[3] !== cb1) {
    t2 = arr1.map(cb1);
    $[2] = arr1;
    $[3] = cb1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  const x = t2;
  let t3;
  if ($[5] !== arr2) {
    t3 = (e_0) => arr2[0].value + e_0.value;
    $[5] = arr2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  const cb2 = t3;
  let t4;
  if ($[7] !== arr1 || $[8] !== cb2) {
    t4 = arr1.map(cb2);
    $[7] = arr1;
    $[8] = cb2;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  const y = t4;
  let t5;
  if ($[10] !== x || $[11] !== y) {
    t5 = [x, y];
    $[10] = x;
    $[11] = y;
    $[12] = t5;
  } else {
    t5 = $[12];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ arr1: [], arr2: [] }],
  sequentialRenders: [
    { arr1: [], arr2: [] },
    { arr1: [], arr2: null },
    { arr1: [{ value: 1 }, { value: 2 }], arr2: [{ value: -1 }] },
  ],
};

```
      
### Eval output
(kind: ok) [[],[]]
[[],[]]
[[2,3],[0,1]]