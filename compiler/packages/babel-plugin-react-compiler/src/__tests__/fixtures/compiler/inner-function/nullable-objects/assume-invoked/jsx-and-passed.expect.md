
## Input

```javascript
import {createHookWrapper} from 'shared-runtime';

function useFoo({arr1}) {
  const cb1 = e => arr1[0].value + e.value;
  const x = arr1.map(cb1);
  return [x, cb1];
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useFoo),
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
import { createHookWrapper } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(8);
  const { arr1 } = t0;
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
  if ($[5] !== cb1 || $[6] !== x) {
    t3 = [x, cb1];
    $[5] = cb1;
    $[6] = x;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useFoo),
  params: [{ arr1: [], arr2: [] }],
  sequentialRenders: [
    { arr1: [], arr2: [] },
    { arr1: [], arr2: null },
    { arr1: [{ value: 1 }, { value: 2 }], arr2: [{ value: -1 }] },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"result":[[],"[[ function params=1 ]]"],"shouldInvokeFns":true}</div>
<div>{"result":[[],"[[ function params=1 ]]"],"shouldInvokeFns":true}</div>
<div>{"result":[[2,3],"[[ function params=1 ]]"],"shouldInvokeFns":true}</div>