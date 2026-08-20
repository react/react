
## Input

```javascript
import {addOne, shallowCopy} from 'shared-runtime';

function foo(a, b, c) {
  // Construct and freeze x
  const x = shallowCopy(a);
  <div>{x}</div>;

  // y should depend on `x` and `b`
  const y = x.foo(b);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{foo: addOne}, 3],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { addOne, shallowCopy } from "shared-runtime";

function foo(a, b, c) {
  const $ = _c(5);
  let t0;
  if ($[0] !== a) {
    t0 = shallowCopy(a);
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== b || $[3] !== x) {
    t1 = x.foo(b);
    $[2] = b;
    $[3] = x;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const y = t1;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{ foo: addOne }, 3],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 4