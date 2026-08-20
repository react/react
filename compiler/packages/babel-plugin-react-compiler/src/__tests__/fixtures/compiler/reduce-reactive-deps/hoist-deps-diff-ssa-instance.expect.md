
## Input

```javascript
import {makeObject_Primitives, setPropertyByKey} from 'shared-runtime';

function useFoo({value, cond}) {
  let x: any = makeObject_Primitives();
  if (cond) {
    setPropertyByKey(x, 'a', null);
  } else {
    setPropertyByKey(x, 'a', {b: 2});
  }

  /**
   * y should take a dependency on `x`, not `x.a.b` here
   */
  const y = [];
  if (!cond) {
    y.push(x.a.b);
  }

  x = makeObject_Primitives();
  setPropertyByKey(x, 'a', {b: value});

  return [y, x.a.b];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{value: 3, cond: true}],
  sequentialRenders: [
    {value: 3, cond: true},
    {value: 3, cond: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeObject_Primitives, setPropertyByKey } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(10);
  const { value, cond } = t0;
  let x;
  if ($[0] !== cond) {
    x = makeObject_Primitives();
    if (cond) {
      setPropertyByKey(x, "a", null);
    } else {
      setPropertyByKey(x, "a", { b: 2 });
    }
    $[0] = cond;
    $[1] = x;
  } else {
    x = $[1];
  }
  let y;
  if ($[2] !== cond || $[3] !== x) {
    y = [];
    if (!cond) {
      y.push(x.a.b);
    }
    $[2] = cond;
    $[3] = x;
    $[4] = y;
  } else {
    y = $[4];
  }
  if ($[5] !== value) {
    x = makeObject_Primitives();
    setPropertyByKey(x, "a", { b: value });
    $[5] = value;
    $[6] = x;
  } else {
    x = $[6];
  }
  let t1;
  if ($[7] !== x.a.b || $[8] !== y) {
    t1 = [y, x.a.b];
    $[7] = x.a.b;
    $[8] = y;
    $[9] = t1;
  } else {
    t1 = $[9];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ value: 3, cond: true }],
  sequentialRenders: [
    { value: 3, cond: true },
    { value: 3, cond: false },
  ],
};

```
      
### Eval output
(kind: ok) [[],3]
[[2],3]