
## Input

```javascript
/**
 * Test that we're not hoisting property reads from lambdas that are created to
 * pass to opaque functions, which often have maybe-invoke semantics.
 *
 * In this example, we shouldn't hoist `arr[0].value` out of the lambda.
 * ```js
 * e => arr[0].value + e.value  <-- created to pass to map
 * arr.map(<cb>)                <-- argument only invoked if array is non-empty
 * ```
 */
function useFoo({arr1, arr2}) {
  const x = arr1.map(e => arr1[0].value + e.value);
  const y = arr1.map(e => arr2[0].value + e.value);
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
 * Test that we're not hoisting property reads from lambdas that are created to
 * pass to opaque functions, which often have maybe-invoke semantics.
 *
 * In this example, we shouldn't hoist `arr[0].value` out of the lambda.
 * ```js
 * e => arr[0].value + e.value  <-- created to pass to map
 * arr.map(<cb>)                <-- argument only invoked if array is non-empty
 * ```
 */
function useFoo(t0) {
  const $ = _c(12);
  const { arr1, arr2 } = t0;
  let t1;
  if ($[0] !== arr1) {
    let t2;
    if ($[2] !== arr1[0]) {
      t2 = (e) => arr1[0].value + e.value;
      $[2] = arr1[0];
      $[3] = t2;
    } else {
      t2 = $[3];
    }
    t1 = arr1.map(t2);
    $[0] = arr1;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let t2;
  if ($[4] !== arr1 || $[5] !== arr2) {
    let t3;
    if ($[7] !== arr2) {
      t3 = (e_0) => arr2[0].value + e_0.value;
      $[7] = arr2;
      $[8] = t3;
    } else {
      t3 = $[8];
    }
    t2 = arr1.map(t3);
    $[4] = arr1;
    $[5] = arr2;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  const y = t2;
  let t3;
  if ($[9] !== x || $[10] !== y) {
    t3 = [x, y];
    $[9] = x;
    $[10] = y;
    $[11] = t3;
  } else {
    t3 = $[11];
  }
  return t3;
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