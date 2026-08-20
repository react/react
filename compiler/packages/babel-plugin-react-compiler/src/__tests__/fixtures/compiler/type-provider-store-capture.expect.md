
## Input

```javascript
import {useMemo} from 'react';
import {typedArrayPush, ValidateMemoization} from 'shared-runtime';

export function Component({a, b}) {
  const item1 = useMemo(() => ({a}), [a]);
  const item2 = useMemo(() => ({b}), [b]);
  const items = useMemo(() => {
    const items = [];
    typedArrayPush(items, item1);
    typedArrayPush(items, item2);
    return items;
  }, [item1, item2]);

  return (
    <>
      <ValidateMemoization inputs={[a]} output={items[0]} />
      <ValidateMemoization inputs={[b]} output={items[1]} />
      <ValidateMemoization inputs={[a, b]} output={items} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 0, b: 0}],
  sequentialRenders: [
    {a: 0, b: 0},
    {a: 1, b: 0},
    {a: 1, b: 1},
    {a: 1, b: 2},
    {a: 2, b: 2},
    {a: 3, b: 2},
    {a: 0, b: 0},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { typedArrayPush, ValidateMemoization } from "shared-runtime";

export function Component(t0) {
  const $ = _c(27);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = { a };
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const item1 = t1;
  let t2;
  if ($[2] !== b) {
    t2 = { b };
    $[2] = b;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const item2 = t2;
  let items;
  if ($[4] !== item1 || $[5] !== item2) {
    items = [];
    typedArrayPush(items, item1);
    typedArrayPush(items, item2);
    $[4] = item1;
    $[5] = item2;
    $[6] = items;
  } else {
    items = $[6];
  }
  const items_0 = items;
  let t3;
  if ($[7] !== a) {
    t3 = [a];
    $[7] = a;
    $[8] = t3;
  } else {
    t3 = $[8];
  }
  let t4;
  if ($[9] !== items_0[0] || $[10] !== t3) {
    t4 = <ValidateMemoization inputs={t3} output={items_0[0]} />;
    $[9] = items_0[0];
    $[10] = t3;
    $[11] = t4;
  } else {
    t4 = $[11];
  }
  let t5;
  if ($[12] !== b) {
    t5 = [b];
    $[12] = b;
    $[13] = t5;
  } else {
    t5 = $[13];
  }
  let t6;
  if ($[14] !== items_0[1] || $[15] !== t5) {
    t6 = <ValidateMemoization inputs={t5} output={items_0[1]} />;
    $[14] = items_0[1];
    $[15] = t5;
    $[16] = t6;
  } else {
    t6 = $[16];
  }
  let t7;
  if ($[17] !== a || $[18] !== b) {
    t7 = [a, b];
    $[17] = a;
    $[18] = b;
    $[19] = t7;
  } else {
    t7 = $[19];
  }
  let t8;
  if ($[20] !== items_0 || $[21] !== t7) {
    t8 = <ValidateMemoization inputs={t7} output={items_0} />;
    $[20] = items_0;
    $[21] = t7;
    $[22] = t8;
  } else {
    t8 = $[22];
  }
  let t9;
  if ($[23] !== t4 || $[24] !== t6 || $[25] !== t8) {
    t9 = (
      <>
        {t4}
        {t6}
        {t8}
      </>
    );
    $[23] = t4;
    $[24] = t6;
    $[25] = t8;
    $[26] = t9;
  } else {
    t9 = $[26];
  }
  return t9;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 0, b: 0 }],
  sequentialRenders: [
    { a: 0, b: 0 },
    { a: 1, b: 0 },
    { a: 1, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 2 },
    { a: 3, b: 2 },
    { a: 0, b: 0 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[0],"output":{"a":0}}</div><div>{"inputs":[0],"output":{"b":0}}</div><div>{"inputs":[0,0],"output":[{"a":0},{"b":0}]}</div>
<div>{"inputs":[1],"output":{"a":1}}</div><div>{"inputs":[0],"output":{"b":0}}</div><div>{"inputs":[1,0],"output":[{"a":1},{"b":0}]}</div>
<div>{"inputs":[1],"output":{"a":1}}</div><div>{"inputs":[1],"output":{"b":1}}</div><div>{"inputs":[1,1],"output":[{"a":1},{"b":1}]}</div>
<div>{"inputs":[1],"output":{"a":1}}</div><div>{"inputs":[2],"output":{"b":2}}</div><div>{"inputs":[1,2],"output":[{"a":1},{"b":2}]}</div>
<div>{"inputs":[2],"output":{"a":2}}</div><div>{"inputs":[2],"output":{"b":2}}</div><div>{"inputs":[2,2],"output":[{"a":2},{"b":2}]}</div>
<div>{"inputs":[3],"output":{"a":3}}</div><div>{"inputs":[2],"output":{"b":2}}</div><div>{"inputs":[3,2],"output":[{"a":3},{"b":2}]}</div>
<div>{"inputs":[0],"output":{"a":0}}</div><div>{"inputs":[0],"output":{"b":0}}</div><div>{"inputs":[0,0],"output":[{"a":0},{"b":0}]}</div>