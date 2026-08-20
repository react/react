
## Input

```javascript
// x.a.b was accessed unconditionally within the mutable range of x.
// As a result, we cannot infer anything about whether `x` or `x.a`
// may be null. This means that it's not safe to hoist reads from x
// (e.g. take `x.a` or `x.a.b` as a dependency).

import {identity, makeObject_Primitives, setProperty} from 'shared-runtime';

function Component({cond, other}) {
  const x = makeObject_Primitives();
  setProperty(x, {b: 3, other}, 'a');
  identity(x.a.b);
  if (!cond) {
    x.a = null;
  }

  const y = [identity(cond) && x.a.b];
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false}],
  sequentialRenders: [
    {cond: false},
    {cond: false},
    {cond: false, other: 8},
    {cond: true},
    {cond: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // x.a.b was accessed unconditionally within the mutable range of x.
// As a result, we cannot infer anything about whether `x` or `x.a`
// may be null. This means that it's not safe to hoist reads from x
// (e.g. take `x.a` or `x.a.b` as a dependency).

import { identity, makeObject_Primitives, setProperty } from "shared-runtime";

function Component(t0) {
  const $ = _c(8);
  const { cond, other } = t0;
  let x;
  if ($[0] !== cond || $[1] !== other) {
    x = makeObject_Primitives();
    setProperty(x, { b: 3, other }, "a");
    identity(x.a.b);
    if (!cond) {
      x.a = null;
    }
    $[0] = cond;
    $[1] = other;
    $[2] = x;
  } else {
    x = $[2];
  }
  let t1;
  if ($[3] !== cond || $[4] !== x) {
    t1 = identity(cond) && x.a.b;
    $[3] = cond;
    $[4] = x;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  let t2;
  if ($[6] !== t1) {
    t2 = [t1];
    $[6] = t1;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  const y = t2;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false }],
  sequentialRenders: [
    { cond: false },
    { cond: false },
    { cond: false, other: 8 },
    { cond: true },
    { cond: true },
  ],
};

```
      
### Eval output
(kind: ok) [false]
[false]
[false]
[null]
[null]