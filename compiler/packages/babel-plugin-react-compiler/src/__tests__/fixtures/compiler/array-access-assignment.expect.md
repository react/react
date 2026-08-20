
## Input

```javascript
function Component({a, b, c}) {
  const x = [a];
  const y = [null, b];
  const z = [[], [], [c]];
  x[0] = y[1];
  z[0][0] = x[0];
  return [x, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 20, c: 300}],
  sequentialRenders: [
    {a: 2, b: 20, c: 300},
    {a: 3, b: 20, c: 300},
    {a: 3, b: 21, c: 300},
    {a: 3, b: 22, c: 300},
    {a: 3, b: 22, c: 301},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(6);
  const { a, b, c } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    const x = [a];
    let t2;
    if ($[4] !== b) {
      t2 = [null, b];
      $[4] = b;
      $[5] = t2;
    } else {
      t2 = $[5];
    }
    const y = t2;
    const z = [[], [], [c]];
    x[0] = y[1];
    z[0][0] = x[0];
    t1 = [x, z];
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 1, b: 20, c: 300 }],
  sequentialRenders: [
    { a: 2, b: 20, c: 300 },
    { a: 3, b: 20, c: 300 },
    { a: 3, b: 21, c: 300 },
    { a: 3, b: 22, c: 300 },
    { a: 3, b: 22, c: 301 },
  ],
};

```
      
### Eval output
(kind: ok) [[20],[[20],[],[300]]]
[[20],[[20],[],[300]]]
[[21],[[21],[],[300]]]
[[22],[[22],[],[300]]]
[[22],[[22],[],[301]]]