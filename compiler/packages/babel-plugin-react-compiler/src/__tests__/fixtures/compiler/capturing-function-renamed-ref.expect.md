
## Input

```javascript
import {mutate} from 'shared-runtime';

function useHook({a, b}) {
  let z = {a};
  {
    let z = {b};
    (function () {
      mutate(z);
    })();
  }
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
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

function useHook(t0) {
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
  const z = t1;

  const z_0 = { b };

  mutate(z_0);

  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
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
(kind: ok) {"a":2}
{"a":2}
{"a":2}
{"a":3}