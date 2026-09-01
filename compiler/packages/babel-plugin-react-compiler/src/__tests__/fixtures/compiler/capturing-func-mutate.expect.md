
## Input

```javascript
import {mutate} from 'shared-runtime';

function Component({a, b}) {
  let z = {a};
  let y = {b: {b}};
  let x = function () {
    z.a = 2;
    mutate(y.b);
  };
  x();
  return [y, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 4, b: 3},
    {a: 4, b: 5},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";

function Component(t0) {
  const $ = _c(3);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b) {
    const z = { a };
    const y = { b: { b } };
    const x = function () {
      z.a = 2;
      mutate(y.b);
    };
    x();
    t1 = [y, z];
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 2, b: 3 }],
  sequentialRenders: [
    { a: 2, b: 3 },
    { a: 2, b: 3 },
    { a: 4, b: 3 },
    { a: 4, b: 5 },
  ],
};

```
      
### Eval output
(kind: ok) [{"b":{"b":3,"wat0":"joe"}},{"a":2}]
[{"b":{"b":3,"wat0":"joe"}},{"a":2}]
[{"b":{"b":3,"wat0":"joe"}},{"a":2}]
[{"b":{"b":5,"wat0":"joe"}},{"a":2}]