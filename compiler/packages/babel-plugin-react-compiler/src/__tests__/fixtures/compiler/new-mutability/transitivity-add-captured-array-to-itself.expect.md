
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
  const o: any = useMemo(() => ({a}), [a]);
  const x: Array<any> = useMemo(() => [o], [o, b]);
  const y = typedCapture(x);
  const z = typedCapture(y);
  x.push(z);
  x.push(b);

  return (
    <>
      <ValidateMemoization inputs={[a]} output={o} />;
      <ValidateMemoization inputs={[a, b]} output={x} />;
    </>
  );
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
  const $ = _c(19);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = { a };
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const o = t1;
  let x;
  if ($[2] !== b || $[3] !== o) {
    x = [o];
    const y = typedCapture(x);
    const z = typedCapture(y);
    x.push(z);
    x.push(b);
    $[2] = b;
    $[3] = o;
    $[4] = x;
  } else {
    x = $[4];
  }
  let t2;
  if ($[5] !== a) {
    t2 = [a];
    $[5] = a;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  let t3;
  if ($[7] !== o || $[8] !== t2) {
    t3 = <ValidateMemoization inputs={t2} output={o} />;
    $[7] = o;
    $[8] = t2;
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  let t4;
  if ($[10] !== a || $[11] !== b) {
    t4 = [a, b];
    $[10] = a;
    $[11] = b;
    $[12] = t4;
  } else {
    t4 = $[12];
  }
  let t5;
  if ($[13] !== t4 || $[14] !== x) {
    t5 = <ValidateMemoization inputs={t4} output={x} />;
    $[13] = t4;
    $[14] = x;
    $[15] = t5;
  } else {
    t5 = $[15];
  }
  let t6;
  if ($[16] !== t3 || $[17] !== t5) {
    t6 = (
      <>
        {t3};{t5};
      </>
    );
    $[16] = t3;
    $[17] = t5;
    $[18] = t6;
  } else {
    t6 = $[18];
  }
  return t6;
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
(kind: ok) <div>{"inputs":[0],"output":{"a":0}}</div>;<div>{"inputs":[0,0],"output":[{"a":0},[["[[ cyclic ref *2 ]]"]],0]}</div>;
<div>{"inputs":[0],"output":{"a":0}}</div>;<div>{"inputs":[0,1],"output":[{"a":0},[["[[ cyclic ref *2 ]]"]],1]}</div>;
<div>{"inputs":[1],"output":{"a":1}}</div>;<div>{"inputs":[1,1],"output":[{"a":1},[["[[ cyclic ref *2 ]]"]],1]}</div>;
<div>{"inputs":[0],"output":{"a":0}}</div>;<div>{"inputs":[0,0],"output":[{"a":0},[["[[ cyclic ref *2 ]]"]],0]}</div>;