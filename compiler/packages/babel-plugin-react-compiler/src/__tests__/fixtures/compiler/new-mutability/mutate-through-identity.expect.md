
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {identity, ValidateMemoization} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => ({a}), [a, b]);
  const x2 = identity(x);
  x2.b = b;

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
import { identity, ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(9);
  const { a, b } = t0;
  let x;
  if ($[0] !== a || $[1] !== b) {
    x = { a };
    const x2 = identity(x);
    x2.b = b;
    $[0] = a;
    $[1] = b;
    $[2] = x;
  } else {
    x = $[2];
  }
  let t1;
  if ($[3] !== a || $[4] !== b) {
    t1 = [a, b];
    $[3] = a;
    $[4] = b;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  let t2;
  if ($[6] !== t1 || $[7] !== x) {
    t2 = <ValidateMemoization inputs={t1} output={x} />;
    $[6] = t1;
    $[7] = x;
    $[8] = t2;
  } else {
    t2 = $[8];
  }
  return t2;
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
(kind: ok) <div>{"inputs":[0,0],"output":{"a":0,"b":0}}</div>
<div>{"inputs":[0,1],"output":{"a":0,"b":1}}</div>
<div>{"inputs":[1,1],"output":{"a":1,"b":1}}</div>
<div>{"inputs":[0,0],"output":{"a":0,"b":0}}</div>