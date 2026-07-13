
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

function Foo({arr1, arr2, foo}) {
  const x = [arr1];

  let y = [];

  const getVal1 = useCallback(() => {
    return {x: 2};
  }, []);

  const getVal2 = useCallback(() => {
    return [y];
  }, [foo ? (y = x.concat(arr2)) : y]);

  return <Stringify val1={getVal1} val2={getVal2} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{arr1: [1, 2], arr2: [3, 4], foo: true}],
  sequentialRenders: [
    {arr1: [1, 2], arr2: [3, 4], foo: true},
    {arr1: [1, 2], arr2: [3, 4], foo: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useCallback } from "react";
import { Stringify } from "shared-runtime";

function Foo(t0) {
  const $ = _c(10);
  const { arr1, arr2, foo } = t0;
  let t1;
  if ($[0] !== arr1) {
    t1 = [arr1];
    $[0] = arr1;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let getVal1;
  let t2;
  if ($[2] !== arr2 || $[3] !== foo || $[4] !== x) {
    let y = [];
    getVal1 = _temp;
    t2 = () => [y];
    foo ? (y = x.concat(arr2)) : y;
    $[2] = arr2;
    $[3] = foo;
    $[4] = x;
    $[5] = getVal1;
    $[6] = t2;
  } else {
    getVal1 = $[5];
    t2 = $[6];
  }
  const getVal2 = t2;
  let t3;
  if ($[7] !== getVal1 || $[8] !== getVal2) {
    t3 = <Stringify val1={getVal1} val2={getVal2} shouldInvokeFns={true} />;
    $[7] = getVal1;
    $[8] = getVal2;
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  return t3;
}
function _temp() {
  return { x: 2 };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ arr1: [1, 2], arr2: [3, 4], foo: true }],
  sequentialRenders: [
    { arr1: [1, 2], arr2: [3, 4], foo: true },
    { arr1: [1, 2], arr2: [3, 4], foo: false },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"val1":{"kind":"Function","result":{"x":2}},"val2":{"kind":"Function","result":[[[1,2],3,4]]},"shouldInvokeFns":true}</div>
<div>{"val1":{"kind":"Function","result":{"x":2}},"val2":{"kind":"Function","result":[[]]},"shouldInvokeFns":true}</div>