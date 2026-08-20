
## Input

```javascript
import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({a, b}) {
  const x = useMemo(() => {
    return [a];
  }, [a]);
  const y = useMemo(() => {
    const items = [b];
    for (const i of x) {
      items.push(i);
    }
    return items;
  }, [x, b]);
  return (
    <>
      <ValidateMemoization inputs={[a]} output={x} />
      <ValidateMemoization inputs={[x, b]} output={y} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 0, b: 1},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(19);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = [a];
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let items;
  if ($[2] !== b || $[3] !== x) {
    items = [b];
    for (const i of x) {
      items.push(i);
    }
    $[2] = b;
    $[3] = x;
    $[4] = items;
  } else {
    items = $[4];
  }
  const y = items;
  let t2;
  if ($[5] !== a) {
    t2 = [a];
    $[5] = a;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  let t3;
  if ($[7] !== t2 || $[8] !== x) {
    t3 = <ValidateMemoization inputs={t2} output={x} />;
    $[7] = t2;
    $[8] = x;
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  let t4;
  if ($[10] !== b || $[11] !== x) {
    t4 = [x, b];
    $[10] = b;
    $[11] = x;
    $[12] = t4;
  } else {
    t4 = $[12];
  }
  let t5;
  if ($[13] !== t4 || $[14] !== y) {
    t5 = <ValidateMemoization inputs={t4} output={y} />;
    $[13] = t4;
    $[14] = y;
    $[15] = t5;
  } else {
    t5 = $[15];
  }
  let t6;
  if ($[16] !== t3 || $[17] !== t5) {
    t6 = (
      <>
        {t3}
        {t5}
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
    { a: 1, b: 0 },
    { a: 1, b: 1 },
    { a: 0, b: 1 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[1],"output":[1]}</div><div>{"inputs":[[1],0],"output":[0,1]}</div>
<div>{"inputs":[1],"output":[1]}</div><div>{"inputs":[[1],1],"output":[1,1]}</div>
<div>{"inputs":[0],"output":[0]}</div><div>{"inputs":[[0],1],"output":[1,0]}</div>