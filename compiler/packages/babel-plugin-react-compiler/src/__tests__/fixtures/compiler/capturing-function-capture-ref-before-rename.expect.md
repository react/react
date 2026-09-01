
## Input

```javascript
import {mutate} from 'shared-runtime';

function Component({a, b}) {
  let z = {a};
  (function () {
    mutate(z);
  })();
  let y = z;

  {
    // z is shadowed & renamed but the lambda is unaffected.
    let z = {b};
    y = {y, z};
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 2, b: 4},
    {a: 3, b: 4},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";

function Component(t0) {
  const $ = _c(7);
  const { a, b } = t0;
  let z;
  if ($[0] !== a) {
    z = { a };

    mutate(z);
    $[0] = a;
    $[1] = z;
  } else {
    z = $[1];
  }

  let y = z;
  let t1;
  if ($[2] !== b) {
    t1 = { b };
    $[2] = b;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const z_0 = t1;
  let t2;
  if ($[4] !== y || $[5] !== z_0) {
    t2 = { y, z: z_0 };
    $[4] = y;
    $[5] = z_0;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  y = t2;

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 2, b: 3 }],
  sequentialRenders: [
    { a: 2, b: 3 },
    { a: 2, b: 3 },
    { a: 2, b: 4 },
    { a: 3, b: 4 },
  ],
};

```
      
### Eval output
(kind: ok) {"y":{"a":2,"wat0":"joe"},"z":{"b":3}}
{"y":{"a":2,"wat0":"joe"},"z":{"b":3}}
{"y":{"a":2,"wat0":"joe"},"z":{"b":4}}
{"y":{"a":3,"wat0":"joe"},"z":{"b":4}}