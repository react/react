
## Input

```javascript
import {useMemo} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component({a, b, c}) {
  const set = new WeakSet();
  const setAlias = set.add(a);
  setAlias.add(c);

  const hasB = set.has(b);

  return (
    <>
      <ValidateMemoization
        inputs={[a, c]}
        output={set}
        onlyCheckCompiled={true}
      />
      <ValidateMemoization
        inputs={[a, c]}
        output={setAlias}
        onlyCheckCompiled={true}
      />
      <ValidateMemoization
        inputs={[b]}
        output={[hasB]}
        onlyCheckCompiled={true}
      />
    </>
  );
}

const v1 = {value: 1};
const v2 = {value: 2};
const v3 = {value: 3};
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: v1, b: v1, c: v1}],
  sequentialRenders: [
    {a: v1, b: v1, c: v1},
    {a: v2, b: v1, c: v1},
    {a: v1, b: v1, c: v1},
    {a: v1, b: v2, c: v1},
    {a: v1, b: v1, c: v1},
    {a: v3, b: v3, c: v1},
    {a: v3, b: v3, c: v1},
    {a: v1, b: v1, c: v1},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { ValidateMemoization } from "shared-runtime";

function Component(t0) {
  const $ = _c(27);
  const { a, b, c } = t0;
  let set;
  let setAlias;
  if ($[0] !== a || $[1] !== c) {
    set = new WeakSet();
    setAlias = set.add(a);
    setAlias.add(c);
    $[0] = a;
    $[1] = c;
    $[2] = set;
    $[3] = setAlias;
  } else {
    set = $[2];
    setAlias = $[3];
  }

  const hasB = set.has(b);
  let t1;
  if ($[4] !== a || $[5] !== c) {
    t1 = [a, c];
    $[4] = a;
    $[5] = c;
    $[6] = t1;
  } else {
    t1 = $[6];
  }
  let t2;
  if ($[7] !== set || $[8] !== t1) {
    t2 = (
      <ValidateMemoization inputs={t1} output={set} onlyCheckCompiled={true} />
    );
    $[7] = set;
    $[8] = t1;
    $[9] = t2;
  } else {
    t2 = $[9];
  }
  let t3;
  if ($[10] !== a || $[11] !== c) {
    t3 = [a, c];
    $[10] = a;
    $[11] = c;
    $[12] = t3;
  } else {
    t3 = $[12];
  }
  let t4;
  if ($[13] !== setAlias || $[14] !== t3) {
    t4 = (
      <ValidateMemoization
        inputs={t3}
        output={setAlias}
        onlyCheckCompiled={true}
      />
    );
    $[13] = setAlias;
    $[14] = t3;
    $[15] = t4;
  } else {
    t4 = $[15];
  }
  let t5;
  if ($[16] !== b) {
    t5 = [b];
    $[16] = b;
    $[17] = t5;
  } else {
    t5 = $[17];
  }
  let t6;
  if ($[18] !== hasB) {
    t6 = [hasB];
    $[18] = hasB;
    $[19] = t6;
  } else {
    t6 = $[19];
  }
  let t7;
  if ($[20] !== t5 || $[21] !== t6) {
    t7 = (
      <ValidateMemoization inputs={t5} output={t6} onlyCheckCompiled={true} />
    );
    $[20] = t5;
    $[21] = t6;
    $[22] = t7;
  } else {
    t7 = $[22];
  }
  let t8;
  if ($[23] !== t2 || $[24] !== t4 || $[25] !== t7) {
    t8 = (
      <>
        {t2}
        {t4}
        {t7}
      </>
    );
    $[23] = t2;
    $[24] = t4;
    $[25] = t7;
    $[26] = t8;
  } else {
    t8 = $[26];
  }
  return t8;
}

const v1 = { value: 1 };
const v2 = { value: 2 };
const v3 = { value: 3 };
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: v1, b: v1, c: v1 }],
  sequentialRenders: [
    { a: v1, b: v1, c: v1 },
    { a: v2, b: v1, c: v1 },
    { a: v1, b: v1, c: v1 },
    { a: v1, b: v2, c: v1 },
    { a: v1, b: v1, c: v1 },
    { a: v3, b: v3, c: v1 },
    { a: v3, b: v3, c: v1 },
    { a: v1, b: v1, c: v1 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1}],"output":[true]}</div>
<div>{"inputs":[{"value":2},{"value":1}],"output":{}}</div><div>{"inputs":[{"value":2},{"value":1}],"output":{}}</div><div>{"inputs":[{"value":1}],"output":[true]}</div>
<div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1}],"output":[true]}</div>
<div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":2}],"output":[false]}</div>
<div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1}],"output":[true]}</div>
<div>{"inputs":[{"value":3},{"value":1}],"output":{}}</div><div>{"inputs":[{"value":3},{"value":1}],"output":{}}</div><div>{"inputs":[{"value":3}],"output":[true]}</div>
<div>{"inputs":[{"value":3},{"value":1}],"output":{}}</div><div>{"inputs":[{"value":3},{"value":1}],"output":{}}</div><div>{"inputs":[{"value":3}],"output":[true]}</div>
<div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1},"[[ cyclic ref *2 ]]"],"output":{}}</div><div>{"inputs":[{"value":1}],"output":[true]}</div>