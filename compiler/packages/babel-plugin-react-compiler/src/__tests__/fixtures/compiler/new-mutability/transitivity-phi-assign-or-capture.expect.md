
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => [{a}], [a, b]);
  let z: any;
  if (b) {
    z = x;
  } else {
    z = typedCapture(x);
  }
  // could mutate x
  typedMutate(z, b);

  return <ValidateMemoization inputs={[a, b]} output={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 0, b: 1},
    {a: 1, b: 1},
    {a: 0, b: 0},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";
import {
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from "shared-runtime";

function Component(t0) {
  const $ = _c(11);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = { a };
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let x;
  if ($[2] !== b || $[3] !== t1) {
    x = [t1];
    let z;
    if (b) {
      z = x;
    } else {
      z = typedCapture(x);
    }

    typedMutate(z, b);
    $[2] = b;
    $[3] = t1;
    $[4] = x;
  } else {
    x = $[4];
  }
  let t2;
  if ($[5] !== a || $[6] !== b) {
    t2 = [a, b];
    $[5] = a;
    $[6] = b;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  let t3;
  if ($[8] !== t2 || $[9] !== x) {
    t3 = <ValidateMemoization inputs={t2} output={x} />;
    $[8] = t2;
    $[9] = x;
    $[10] = t3;
  } else {
    t3 = $[10];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 0 }],
  sequentialRenders: [
    { a: 0, b: 0 },
    { a: 0, b: 1 },
    { a: 1, b: 1 },
    { a: 0, b: 0 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[0,0],"output":[{"a":0}]}</div>
<div>{"inputs":[0,1],"output":[{"a":0}]}</div>
<div>{"inputs":[1,1],"output":[{"a":1}]}</div>
<div>{"inputs":[0,0],"output":[{"a":0}]}</div>