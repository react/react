
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {
  mutate,
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from 'shared-runtime';

function Component({a, b, c}: {a: number; b: number; c: number}) {
  const x = useMemo(() => [{value: a}], [a, b, c]);
  if (b === 0) {
    // This object should only depend on c, it cannot be affected by the later mutation
    x.push({value: c});
  } else {
    // This mutation shouldn't affect the object in the consequent
    mutate(x);
  }

  return (
    <>
      <ValidateMemoization inputs={[a, b, c]} output={x} />;
      {/* TODO: should only depend on c */}
      <ValidateMemoization inputs={[a, b, c]} output={x[0]} />;
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0, c: 0}],
  sequentialRenders: [
    {a: 0, b: 0, c: 0},
    {a: 0, b: 1, c: 0},
    {a: 1, b: 1, c: 0},
    {a: 1, b: 1, c: 1},
    {a: 1, b: 1, c: 0},
    {a: 1, b: 0, c: 0},
    {a: 0, b: 0, c: 0},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";
import {
  mutate,
  typedCapture,
  typedCreateFrom,
  typedMutate,
  ValidateMemoization,
} from "shared-runtime";

function Component(t0) {
  const $ = _c(21);
  const { a, b, c } = t0;
  let x;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    x = [{ value: a }];
    if (b === 0) {
      x.push({ value: c });
    } else {
      mutate(x);
    }
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = x;
  } else {
    x = $[3];
  }
  let t1;
  if ($[4] !== a || $[5] !== b || $[6] !== c) {
    t1 = [a, b, c];
    $[4] = a;
    $[5] = b;
    $[6] = c;
    $[7] = t1;
  } else {
    t1 = $[7];
  }
  let t2;
  if ($[8] !== t1 || $[9] !== x) {
    t2 = <ValidateMemoization inputs={t1} output={x} />;
    $[8] = t1;
    $[9] = x;
    $[10] = t2;
  } else {
    t2 = $[10];
  }
  let t3;
  if ($[11] !== a || $[12] !== b || $[13] !== c) {
    t3 = [a, b, c];
    $[11] = a;
    $[12] = b;
    $[13] = c;
    $[14] = t3;
  } else {
    t3 = $[14];
  }
  let t4;
  if ($[15] !== t3 || $[16] !== x[0]) {
    t4 = <ValidateMemoization inputs={t3} output={x[0]} />;
    $[15] = t3;
    $[16] = x[0];
    $[17] = t4;
  } else {
    t4 = $[17];
  }
  let t5;
  if ($[18] !== t2 || $[19] !== t4) {
    t5 = (
      <>
        {t2};{t4};
      </>
    );
    $[18] = t2;
    $[19] = t4;
    $[20] = t5;
  } else {
    t5 = $[20];
  }
  return t5;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 0, c: 0 }],
  sequentialRenders: [
    { a: 0, b: 0, c: 0 },
    { a: 0, b: 1, c: 0 },
    { a: 1, b: 1, c: 0 },
    { a: 1, b: 1, c: 1 },
    { a: 1, b: 1, c: 0 },
    { a: 1, b: 0, c: 0 },
    { a: 0, b: 0, c: 0 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[0,0,0],"output":[{"value":0},{"value":0}]}</div>;<div>{"inputs":[0,0,0],"output":{"value":0}}</div>;
<div>{"inputs":[0,1,0],"output":[{"value":0},"joe"]}</div>;<div>{"inputs":[0,1,0],"output":{"value":0}}</div>;
<div>{"inputs":[1,1,0],"output":[{"value":1},"joe"]}</div>;<div>{"inputs":[1,1,0],"output":{"value":1}}</div>;
<div>{"inputs":[1,1,1],"output":[{"value":1},"joe"]}</div>;<div>{"inputs":[1,1,1],"output":{"value":1}}</div>;
<div>{"inputs":[1,1,0],"output":[{"value":1},"joe"]}</div>;<div>{"inputs":[1,1,0],"output":{"value":1}}</div>;
<div>{"inputs":[1,0,0],"output":[{"value":1},{"value":0}]}</div>;<div>{"inputs":[1,0,0],"output":{"value":1}}</div>;
<div>{"inputs":[0,0,0],"output":[{"value":0},{"value":0}]}</div>;<div>{"inputs":[0,0,0],"output":{"value":0}}</div>;