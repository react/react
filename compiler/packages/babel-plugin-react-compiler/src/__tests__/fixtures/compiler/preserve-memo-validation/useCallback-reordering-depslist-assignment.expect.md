
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

// We currently produce invalid output (incorrect scoping for `y` declaration)
function useFoo(arr1, arr2) {
  const x = [arr1];

  let y;
  const getVal = useCallback(() => {
    return {y};
  }, [((y = x.concat(arr2)), y)]);

  return <Stringify getVal={getVal} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    [1, 2],
    [3, 4],
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useCallback } from "react";
import { Stringify } from "shared-runtime";

// We currently produce invalid output (incorrect scoping for `y` declaration)
function useFoo(arr1, arr2) {
  const $ = _c(7);
  let t0;
  if ($[0] !== arr1) {
    t0 = [arr1];
    $[0] = arr1;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== arr2 || $[3] !== x) {
    let y;
    t1 = () => ({ y });
    (y = x.concat(arr2)), y;
    $[2] = arr2;
    $[3] = x;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const getVal = t1;
  let t2;
  if ($[5] !== getVal) {
    t2 = <Stringify getVal={getVal} shouldInvokeFns={true} />;
    $[5] = getVal;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    [1, 2],
    [3, 4],
  ],
};

```
      
### Eval output
(kind: ok) <div>{"getVal":{"kind":"Function","result":{"y":[[1,2],3,4]}},"shouldInvokeFns":true}</div>