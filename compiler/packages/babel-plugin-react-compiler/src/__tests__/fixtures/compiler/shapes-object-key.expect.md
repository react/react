
## Input

```javascript
import {arrayPush} from 'shared-runtime';

function useFoo({a, b}) {
  const obj = {a};
  arrayPush(Object.keys(obj), b);
  return obj;
}
export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2, b: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { arrayPush } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(2);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = { a };
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const obj = t1;
  arrayPush(Object.keys(obj), b);
  return obj;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: 2, b: 3 }],
};

```
      
### Eval output
(kind: ok) {"a":2}