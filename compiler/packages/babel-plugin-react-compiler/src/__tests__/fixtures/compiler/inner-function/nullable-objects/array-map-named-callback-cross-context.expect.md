
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * Forked from array-map-simple.js
 *
 * Named lambdas (e.g. cb1) may be defined in the top scope of a function and
 * used in a different lambda (getArrMap1).
 *
 * Here, we should try to determine if cb1 is actually called. In this case:
 * - getArrMap1 is assumed to be called as it's passed to JSX
 * - cb1 is not assumed to be called since it's only used as a call operand
 */
function useFoo({arr1, arr2}) {
  const cb1 = e => arr1[0].value + e.value;
  const getArrMap1 = () => arr1.map(cb1);
  const cb2 = e => arr2[0].value + e.value;
  const getArrMap2 = () => arr1.map(cb2);
  return (
    <Stringify
      getArrMap1={getArrMap1}
      getArrMap2={getArrMap2}
      shouldInvokeFns={true}
    />
  );
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
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

/**
 * Forked from array-map-simple.js
 *
 * Named lambdas (e.g. cb1) may be defined in the top scope of a function and
 * used in a different lambda (getArrMap1).
 *
 * Here, we should try to determine if cb1 is actually called. In this case:
 * - getArrMap1 is assumed to be called as it's passed to JSX
 * - cb1 is not assumed to be called since it's only used as a call operand
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
    t2 = () => arr1.map(cb1);
    $[2] = arr1;
    $[3] = cb1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  const getArrMap1 = t2;
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
    t4 = () => arr1.map(cb2);
    $[7] = arr1;
    $[8] = cb2;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  const getArrMap2 = t4;
  let t5;
  if ($[10] !== getArrMap1 || $[11] !== getArrMap2) {
    t5 = (
      <Stringify
        getArrMap1={getArrMap1}
        getArrMap2={getArrMap2}
        shouldInvokeFns={true}
      />
    );
    $[10] = getArrMap1;
    $[11] = getArrMap2;
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
(kind: ok) <div>{"getArrMap1":{"kind":"Function","result":[]},"getArrMap2":{"kind":"Function","result":[]},"shouldInvokeFns":true}</div>
<div>{"getArrMap1":{"kind":"Function","result":[]},"getArrMap2":{"kind":"Function","result":[]},"shouldInvokeFns":true}</div>
<div>{"getArrMap1":{"kind":"Function","result":[2,3]},"getArrMap2":{"kind":"Function","result":[0,1]},"shouldInvokeFns":true}</div>