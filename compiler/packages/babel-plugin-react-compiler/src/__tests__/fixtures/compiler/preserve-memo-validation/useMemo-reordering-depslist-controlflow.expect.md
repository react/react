
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Foo({arr1, arr2, foo}) {
  const x = [arr1];

  let y = [];

  const val1 = useMemo(() => {
    return {x: 2};
  }, []);

  const val2 = useMemo(() => {
    return [y];
  }, [foo ? (y = x.concat(arr2)) : y]);

  return <Stringify val1={val1} val2={val2} />;
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
import { useMemo } from "react";
import { Stringify } from "shared-runtime";

function Foo(t0) {
  const $ = _c(9);
  const { arr1, arr2, foo } = t0;
  let t1;
  let val1;
  if ($[0] !== arr1 || $[1] !== arr2 || $[2] !== foo) {
    const x = [arr1];
    let y = [];
    let t2;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = { x: 2 };
      $[5] = t2;
    } else {
      t2 = $[5];
    }
    val1 = t2;

    foo ? (y = x.concat(arr2)) : y;
    t1 = (() => [y])();
    $[0] = arr1;
    $[1] = arr2;
    $[2] = foo;
    $[3] = t1;
    $[4] = val1;
  } else {
    t1 = $[3];
    val1 = $[4];
  }
  const val2 = t1;
  let t2;
  if ($[6] !== val1 || $[7] !== val2) {
    t2 = <Stringify val1={val1} val2={val2} />;
    $[6] = val1;
    $[7] = val2;
    $[8] = t2;
  } else {
    t2 = $[8];
  }
  return t2;
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
(kind: ok) <div>{"val1":{"x":2},"val2":[[[1,2],3,4]]}</div>
<div>{"val1":{"x":2},"val2":[[]]}</div>