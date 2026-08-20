
## Input

```javascript
import {ValidateMemoization} from 'shared-runtime';

// Achieving Forget's level of memoization precision in this example isn't possible with useMemo
// without significantly altering the code, so disable the non-Forget evaluation of this fixture.
// @disableNonForgetInSprout
function Component({a, b, c}) {
  const x = [];
  let y;
  if (a) {
    y = [b];
  }
  x.push(c);

  // this scope should not merge with the above scope because y does not invalidate
  // on changes to `c`
  const z = [y];

  // return [x, z];
  return (
    <>
      <ValidateMemoization inputs={[a, b, c]} output={x} />
      <ValidateMemoization inputs={[a, b]} output={z} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: false, b: null, c: 0}],
  sequentialRenders: [
    {a: false, b: null, c: 0},
    {a: false, b: null, c: 1},
    {a: true, b: 0, c: 1},
    {a: true, b: 1, c: 1},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { ValidateMemoization } from "shared-runtime";

// Achieving Forget's level of memoization precision in this example isn't possible with useMemo
// without significantly altering the code, so disable the non-Forget evaluation of this fixture.
// @disableNonForgetInSprout
function Component(t0) {
  const $ = _c(25);
  const { a, b, c } = t0;
  let x;
  let y;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    x = [];
    if (a) {
      let t1;
      if ($[5] !== b) {
        t1 = [b];
        $[5] = b;
        $[6] = t1;
      } else {
        t1 = $[6];
      }
      y = t1;
    }

    x.push(c);
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = x;
    $[4] = y;
  } else {
    x = $[3];
    y = $[4];
  }
  let t1;
  if ($[7] !== y) {
    t1 = [y];
    $[7] = y;
    $[8] = t1;
  } else {
    t1 = $[8];
  }
  const z = t1;
  let t2;
  if ($[9] !== a || $[10] !== b || $[11] !== c) {
    t2 = [a, b, c];
    $[9] = a;
    $[10] = b;
    $[11] = c;
    $[12] = t2;
  } else {
    t2 = $[12];
  }
  let t3;
  if ($[13] !== t2 || $[14] !== x) {
    t3 = <ValidateMemoization inputs={t2} output={x} />;
    $[13] = t2;
    $[14] = x;
    $[15] = t3;
  } else {
    t3 = $[15];
  }
  let t4;
  if ($[16] !== a || $[17] !== b) {
    t4 = [a, b];
    $[16] = a;
    $[17] = b;
    $[18] = t4;
  } else {
    t4 = $[18];
  }
  let t5;
  if ($[19] !== t4 || $[20] !== z) {
    t5 = <ValidateMemoization inputs={t4} output={z} />;
    $[19] = t4;
    $[20] = z;
    $[21] = t5;
  } else {
    t5 = $[21];
  }
  let t6;
  if ($[22] !== t3 || $[23] !== t5) {
    t6 = (
      <>
        {t3}
        {t5}
      </>
    );
    $[22] = t3;
    $[23] = t5;
    $[24] = t6;
  } else {
    t6 = $[24];
  }
  return t6;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: false, b: null, c: 0 }],
  sequentialRenders: [
    { a: false, b: null, c: 0 },
    { a: false, b: null, c: 1 },
    { a: true, b: 0, c: 1 },
    { a: true, b: 1, c: 1 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[false,null,0],"output":[0]}</div><div>{"inputs":[false,null],"output":[null]}</div>
<div>{"inputs":[false,null,1],"output":[1]}</div><div>{"inputs":[false,null],"output":[null]}</div>
<div>{"inputs":[true,0,1],"output":[1]}</div><div>{"inputs":[true,0],"output":[[0]]}</div>
<div>{"inputs":[true,1,1],"output":[1]}</div><div>{"inputs":[true,1],"output":[[1]]}</div>