
## Input

```javascript
function useFoo({arr1, arr2}) {
  const cb = e => arr2[0].value + e.value;
  const y = [];
  for (let i = 0; i < arr1.length; i++) {
    y.push(cb(arr1[i]));
  }
  return y;
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
function useFoo(t0) {
  const $ = _c(5);
  const { arr1, arr2 } = t0;
  let t1;
  if ($[0] !== arr2[0].value) {
    t1 = (e) => arr2[0].value + e.value;
    $[0] = arr2[0].value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const cb = t1;
  let y;
  if ($[2] !== arr1 || $[3] !== cb) {
    y = [];
    for (let i = 0; i < arr1.length; i++) {
      y.push(cb(arr1[i]));
    }
    $[2] = arr1;
    $[3] = cb;
    $[4] = y;
  } else {
    y = $[4];
  }

  return y;
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
      